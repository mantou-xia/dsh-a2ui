/**
 * a2ui-renderer A2uiNodeView —— 'a2ui' keyed renderer。
 *
 * 渲染 surface 组件树（children id 引用解析）；交互组件（button/form/
 * input/select）经注入的 sendAction 以 `<ui_action>` 回传 agent。
 */

import { memo, useCallback, useMemo, useRef } from "react";
import type { ReactNode } from "react";
import type { PropsRuntime } from "@deepseek-ai/dsh-client-ui-slots";
import type { A2uiComponent, A2uiSurfaceSnapshot } from "@dsh-a2ui/a2ui-protocol";
import { createActionSender, type UiAction } from "../dispatch.ts";
import {
  CalloutView,
  CardView,
  ChartView,
  GridView,
  StatView,
  TableView,
} from "./static.tsx";
import {
  ButtonView,
  DataModelContext,
  FieldSetContext,
  FieldValuesContext,
  FormView,
  InputView,
  SelectView,
} from "./interactive.tsx";

/** 插件注入的渲染器依赖。 */
export interface A2uiNodeInjected {
  readonly sendAction: (action: UiAction) => void;
  /** 当前宿主配色（主题切换时刷新；CSS 变量已跟随，此处供需要 JS 的逻辑）。 */
  readonly colorScheme: "light" | "dark";
}

/** 完整 keyed renderer props。 */
export type A2uiNodeProps = PropsRuntime<"conversation.chat.node", "a2ui"> & A2uiNodeInjected;

/** 组件树解析（children 引用 + 交互装配）。emit(componentId, action) 由 SurfaceView 提供。 */
function ComponentNode({
  component,
  components,
  emit,
  colorScheme,
}: {
  component: A2uiComponent;
  components: Map<string, A2uiComponent>;
  emit: (componentId: string, action: { name: string; payload?: unknown }) => void;
  colorScheme: "light" | "dark";
}): ReactNode {
  const children = useMemo(
    () =>
      (component.children ?? [])
        .map((id) => components.get(id))
        .filter((child): child is A2uiComponent => child !== undefined),
    [component.children, components],
  );
  const childNodes = children.map((child) => (
    <ComponentNode key={child.id} component={child} components={components} emit={emit} colorScheme={colorScheme} />
  ));
  switch (component.component) {
    case "stat":
      return <StatView component={component} />;
    case "table":
      return <TableView component={component} />;
    case "chart":
      return <ChartView component={component} colorScheme={colorScheme} />;
    case "card":
      return <CardView component={component}>{childNodes}</CardView>;
    case "grid":
      return <GridView component={component}>{childNodes}</GridView>;
    case "callout":
      return <CalloutView component={component} />;
    case "button":
      return <ButtonView component={component} onAction={(action) => emit(component.id, action)} />;
    case "form":
      return (
        <FormView
          component={component}
          fieldIds={children.filter((child) => child.component === "input" || child.component === "select").map((child) => child.id)}
          onAction={(action) => emit(component.id, action)}
        >
          {childNodes}
        </FormView>
      );
    case "input":
      return <InputView component={component} />;
    case "select":
      return <SelectView component={component} />;
    default:
      return null;
  }
}

/** 一个 surface 的快照渲染（补 surfaceId + componentId 后回传）。 */
function SurfaceView({
  snapshot,
  sendAction,
  colorScheme,
}: {
  snapshot: A2uiSurfaceSnapshot;
  sendAction: (action: UiAction) => void;
  colorScheme: "light" | "dark";
}): ReactNode {
  const components = useMemo(
    () => new Map(snapshot.components.map((item) => [item.id, item])),
    [snapshot.components],
  );
  const root = components.get("root");
  if (root === undefined) {
    return null;
  }
  const emit = useCallback((componentId: string, action: { name: string; payload?: unknown }) => {
    sendAction({
      surfaceId: snapshot.surfaceId,
      name: action.name,
      component: componentId,
      ...(action.payload !== undefined ? { context: action.payload } : {}),
    });
  }, [sendAction, snapshot.surfaceId]);
  return (
    <div className="a2ui-surface" data-a2ui-surface={snapshot.surfaceId}>
      <DataModelContext.Provider value={snapshot.dataModel ?? {}}>
        <ComponentNode component={root} components={components} emit={emit} colorScheme={colorScheme} />
      </DataModelContext.Provider>
    </div>
  );
}

/** 'a2ui' keyed renderer：渲染全部 surface，持有字段值。 */
export const A2uiNodeView = memo(function A2uiNodeView({
  node,
  sendAction,
  colorScheme,
}: A2uiNodeProps) {
  const surfaces = [...node.data.surfaces.values()];
  const fieldValues = useRef(new Map<string, string>());
  const getField = useCallback((id: string) => fieldValues.current.get(id) ?? "", []);
  const setField = useCallback((id: string, value: string) => {
    fieldValues.current.set(id, value);
  }, []);
  if (surfaces.length === 0) {
    return null;
  }
  return (
    <FieldValuesContext.Provider value={getField}>
      <FieldSetContext.Provider value={setField}>
        <div className="a2ui-root" data-a2ui>
          {surfaces.map((surface) => (
            <SurfaceView
              key={surface.surfaceId}
              snapshot={surface.snapshot}
              sendAction={sendAction}
              colorScheme={colorScheme}
            />
          ))}
        </div>
      </FieldSetContext.Provider>
    </FieldValuesContext.Provider>
  );
});

export { createActionSender };
