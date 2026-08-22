/**
 * a2ui-renderer 交互组件 —— button / form / input / select。
 *
 * 交互回传：点击/提交 → dispatchAction（session.prompt 入队 a2ui/action
 * 用户消息）。字段值经 FieldValues/FieldSet Context 由 SurfaceView 统一
 * 持有（MVP 不做 dataModel 绑定生命周期）；form 提交时收集 children 字段值。
 */

import { createContext, useContext, useState } from "react";
import type { ReactNode } from "react";
import type { A2uiComponent } from "@dsh-a2ui/a2ui-protocol";

/** 交互动作回调（surfaceId 与 componentId 由 SurfaceView 补全）。 */
export interface A2uiActionHandler {
  (action: { name: string; payload?: unknown }): void;
}

/** 字段值读取（form 提交时收集）。 */
export const FieldValuesContext = createContext<(id: string) => string>(() => "");
/** 字段值写入（input/select 变更时上报）。 */
export const FieldSetContext = createContext<(id: string, value: string) => void>(() => {});

/* ── props 读取工具 ─────────────────────────────────────────────────────── */

function str(component: A2uiComponent, key: string, fallback = ""): string {
  const value = component[key];
  return typeof value === "string" ? value : fallback;
}

function bool(component: A2uiComponent, key: string, fallback = false): boolean {
  const value = component[key];
  return typeof value === "boolean" ? value : fallback;
}

/** 读取组件声明的 action（button.action / form.submitAction 形态：{ name, payload? }）。 */
function readAction(value: unknown): { name: string; payload?: unknown } | undefined {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return undefined;
  }
  const record = value as Record<string, unknown>;
  return typeof record.name === "string" ? { name: record.name, ...(record.payload !== undefined ? { payload: record.payload } : {}) } : undefined;
}

/** select 的 options：{ label, value }[]。 */
function readOptions(value: unknown): Array<{ label: string; value: string }> {
  if (!Array.isArray(value)) {
    return [];
  }
  return value
    .filter((item): item is Record<string, unknown> =>
      typeof item === "object" && item !== null && !Array.isArray(item))
    .map((item) => ({
      label: typeof item.label === "string" ? item.label : "",
      value: typeof item.value === "string" ? item.value : "",
    }))
    .filter((option) => option.value !== "");
}

/* ── button ─────────────────────────────────────────────────────────────── */

export function ButtonView({ component, onAction }: { component: A2uiComponent; onAction: A2uiActionHandler }): ReactNode {
  const action = readAction(component["action"]);
  const variant = str(component, "variant") === "primary" ? " a2ui-button-variant-primary" : "";
  const disabled = bool(component, "disabled");
  return (
    <button
      type="button"
      className={`a2ui-button${variant}`}
      disabled={disabled || action === undefined}
      onClick={() => {
        if (action !== undefined) {
          onAction({ name: action.name, ...(action.payload !== undefined ? { payload: action.payload } : {}) });
        }
      }}
    >
      {str(component, "label", "确定")}
    </button>
  );
}

/* ── input / select（表单字段） ─────────────────────────────────────────── */

function fieldDefault(component: A2uiComponent, key: string): string {
  const value = component[key];
  // 字面量 → 默认值；{path} 绑定 MVP 不解析（空默认，值由用户输入）。
  return typeof value === "string" ? value : "";
}

export function InputView({ component }: { component: A2uiComponent }): ReactNode {
  const setField = useContext(FieldSetContext);
  const [value, setValue] = useState(fieldDefault(component, "value"));
  const inputType = str(component, "type") === "number" ? "number" : "text";
  return (
    <label className="a2ui-field">
      {str(component, "label") && <span className="a2ui-field-label">{str(component, "label")}</span>}
      <input
        className="a2ui-input"
        type={inputType}
        value={value}
        placeholder={str(component, "placeholder")}
        onChange={(event) => {
          setValue(event.target.value);
          setField(component.id, event.target.value);
        }}
      />
    </label>
  );
}

export function SelectView({ component }: { component: A2uiComponent }): ReactNode {
  const setField = useContext(FieldSetContext);
  const options = readOptions(component["options"]);
  const [value, setValue] = useState(fieldDefault(component, "value"));
  return (
    <label className="a2ui-field">
      {str(component, "label") && <span className="a2ui-field-label">{str(component, "label")}</span>}
      <select
        className="a2ui-select"
        value={value}
        onChange={(event) => {
          setValue(event.target.value);
          setField(component.id, event.target.value);
        }}
      >
        <option value="">请选择…</option>
        {options.map((option) => <option key={option.value} value={option.value}>{option.label || option.value}</option>)}
      </select>
    </label>
  );
}

/* ── form（收集 children 字段值，提交时回传） ────────────────────────────── */

export function FormView({
  component,
  fieldIds,
  children,
  onAction,
}: {
  component: A2uiComponent;
  /** children 中可收集字段的组件 id 列表（来自 component.children 的 input/select）。 */
  fieldIds: string[];
  children?: ReactNode;
  onAction: A2uiActionHandler;
}): ReactNode {
  const getField = useContext(FieldValuesContext);
  const submit = readAction(component["submitAction"]);
  return (
    <form
      className="a2ui-form"
      onSubmit={(event) => {
        event.preventDefault();
        if (submit !== undefined) {
          const values: Record<string, string> = {};
          for (const id of fieldIds) {
            values[id] = getField(id);
          }
          onAction({ name: submit.name, payload: { values } });
        }
      }}
    >
      {str(component, "title") && <div className="a2ui-form-title">{str(component, "title")}</div>}
      {children}
      <button type="submit" className="a2ui-button a2ui-button-variant-primary">
        {submit?.name ?? "提交"}
      </button>
    </form>
  );
}
