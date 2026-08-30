/**
 * a2ui-renderer A2uiNodeView —— 'a2ui' keyed renderer。
 *
 * 渲染 surface 组件树（children id 引用解析）；交互组件（button/form/
 * input/select）经注入的 sendAction 以 `<ui_action>` 回传 agent。
 */

import { memo, useCallback, useMemo, useRef, useSyncExternalStore } from "react";
import type { ReactNode } from "react";
import type { PropsRuntime } from "@deepseek-ai/dsh-client-ui-slots";
import type { A2uiComponent, A2uiSurfaceSnapshot } from "@dsh-a2ui/a2ui-protocol";
import { createActionSender, type UiAction } from "../dispatch.ts";
import { A2uiComponentRegistry } from "../registry.ts";
import {
  DataModelContext,
  FieldSetContext,
  FieldValuesContext,
} from "./interactive.tsx";
import { A2uiCanvas } from "./A2uiCanvas.tsx";
import { registerDshBasicComponents } from "./dsh-basic.tsx";

const fallbackRegistry = new A2uiComponentRegistry();
registerDshBasicComponents(fallbackRegistry);

/** 插件注入的渲染器依赖。 */
export interface A2uiNodeInjected {
  readonly sendAction: (action: UiAction) => void;
  /** 当前宿主配色（主题切换时刷新；CSS 变量已跟随，此处供需要 JS 的逻辑）。 */
  readonly colorScheme: "light" | "dark";
  /** Runtime registry that component-library client plugins contribute to. */
  readonly a2uiRenderer?: A2uiComponentRegistry;
}

/** 完整 keyed renderer props。 */
export type A2uiNodeProps = PropsRuntime<"conversation.chat.node", "a2ui"> & A2uiNodeInjected;

/** 组件树解析（children 引用 + 交互装配）。emit(componentId, action) 由 SurfaceView 提供。 */
function ComponentNode({
  component,
  components,
  emit,
  colorScheme,
  catalogId,
  registry,
}: {
  component: A2uiComponent;
  components: Map<string, A2uiComponent>;
  emit: (componentId: string, action: { name: string; payload?: unknown }) => void;
  colorScheme: "light" | "dark";
  catalogId: string;
  registry: A2uiComponentRegistry;
}): ReactNode {
  const children = useMemo(
    () =>
      (component.children ?? [])
        .map((id) => components.get(id))
        .filter((child): child is A2uiComponent => child !== undefined),
    [component.children, components],
  );
  const childNodes = children.map((child) => (
    <ComponentNode key={child.id} component={child} components={components} emit={emit} colorScheme={colorScheme} catalogId={catalogId} registry={registry} />
  ));
  const Renderer = registry.resolve(catalogId, component.component);
  return Renderer === undefined
    ? null
    : (
      <div className="a2ui-component" data-a2ui-component={component.component} data-a2ui-component-id={component.id}>
        <Renderer component={component} childComponents={children} emit={(action) => emit(component.id, action)} colorScheme={colorScheme}>{childNodes}</Renderer>
      </div>
    );
}

/** 一个 surface 的快照渲染（补 surfaceId + componentId 后回传）。 */
function SurfaceView({
  snapshot,
  sendAction,
  colorScheme,
  registry,
}: {
  snapshot: A2uiSurfaceSnapshot;
  sendAction: (action: UiAction) => void;
  colorScheme: "light" | "dark";
  registry: A2uiComponentRegistry;
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
    <A2uiCanvas surfaceId={snapshot.surfaceId}>
      <DataModelContext.Provider value={snapshot.dataModel ?? {}}>
        <ComponentNode component={root} components={components} emit={emit} colorScheme={colorScheme} catalogId={snapshot.catalogId} registry={registry} />
      </DataModelContext.Provider>
    </A2uiCanvas>
  );
}

/** 'a2ui' keyed renderer：渲染全部 surface，持有字段值。 */
export const A2uiNodeView = memo(function A2uiNodeView({
  node,
  sendAction,
  colorScheme,
  a2uiRenderer,
}: A2uiNodeProps) {
  const registry = a2uiRenderer ?? fallbackRegistry;
  useSyncExternalStore(registry.subscribe.bind(registry), registry.getVersion.bind(registry), registry.getVersion.bind(registry));
  const surfaces = [...node.data.surfaces.values()];
  const fieldValues = useRef(new Map<string, import("./interactive.tsx").FieldValue>());
  const getField = useCallback((id: string) => fieldValues.current.get(id), []);
  const setField = useCallback((id: string, value: import("./interactive.tsx").FieldValue) => {
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
              registry={registry}
            />
          ))}
        </div>
      </FieldSetContext.Provider>
    </FieldValuesContext.Provider>
  );
});

export { createActionSender };
