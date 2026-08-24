import { createContext, useContext, useEffect, useState } from "react";
import type { ReactNode } from "react";
import type { A2uiComponent } from "@dsh-a2ui/a2ui-protocol";

export interface A2uiActionHandler { (action: { name: string; payload?: unknown }): void; }
export const FieldValuesContext = createContext<(id: string) => string>(() => "");
export const FieldSetContext = createContext<(id: string, value: string) => void>(() => {});
export const DataModelContext = createContext<Record<string, unknown>>({});

function str(component: A2uiComponent, key: string, fallback = ""): string {
  return typeof component[key] === "string" ? component[key] as string : fallback;
}

function action(value: unknown): { name: string; payload?: unknown } | undefined {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return undefined;
  const record = value as Record<string, unknown>;
  return typeof record.name === "string" ? { name: record.name, ...(record.payload === undefined ? {} : { payload: record.payload }) } : undefined;
}

function boundValue(value: unknown, dataModel: Record<string, unknown>): string {
  if (typeof value === "string" || typeof value === "number") return String(value);
  if (typeof value !== "object" || value === null || !("path" in value) || typeof value.path !== "string") return "";
  const result = value.path.split("/").filter(Boolean).reduce<unknown>((current, part) =>
    current !== null && typeof current === "object" ? (current as Record<string, unknown>)[part] : undefined, dataModel);
  return typeof result === "string" || typeof result === "number" ? String(result) : "";
}

export function ButtonView({ component, onAction }: { component: A2uiComponent; onAction: A2uiActionHandler }): ReactNode {
  const declared = action(component.action);
  const disabled = component.disabled === true || declared === undefined;
  return <button type="button" className={`a2ui-button${str(component, "variant") === "primary" ? " a2ui-button-variant-primary" : ""}`} disabled={disabled} onClick={() => declared !== undefined && onAction(declared)}>{str(component, "label", "确定")}</button>;
}

export function InputView({ component }: { component: A2uiComponent }): ReactNode {
  const setField = useContext(FieldSetContext);
  const dataModel = useContext(DataModelContext);
  const [value, setValue] = useState(() => boundValue(component.value, dataModel));
  useEffect(() => {
    const next = boundValue(component.value, dataModel);
    setValue(next);
    setField(component.id, next);
  }, [component.id, component.value, dataModel, setField]);
  return <label className="a2ui-field">{str(component, "label") && <span className="a2ui-field-label">{str(component, "label")}</span>}<input className="a2ui-input" type={str(component, "type") === "number" ? "number" : "text"} value={value} placeholder={str(component, "placeholder")} onChange={(event) => { setValue(event.target.value); setField(component.id, event.target.value); }} /></label>;
}

export function SelectView({ component }: { component: A2uiComponent }): ReactNode {
  const setField = useContext(FieldSetContext);
  const dataModel = useContext(DataModelContext);
  const [value, setValue] = useState(() => boundValue(component.value, dataModel));
  useEffect(() => {
    const next = boundValue(component.value, dataModel);
    setValue(next);
    setField(component.id, next);
  }, [component.id, component.value, dataModel, setField]);
  const options = Array.isArray(component.options) ? component.options.filter((item): item is Record<string, unknown> => typeof item === "object" && item !== null && !Array.isArray(item)) : [];
  return <label className="a2ui-field">{str(component, "label") && <span className="a2ui-field-label">{str(component, "label")}</span>}<select className="a2ui-select" value={value} onChange={(event) => { setValue(event.target.value); setField(component.id, event.target.value); }}><option value="">请选择</option>{options.map((option) => typeof option.value === "string" ? <option key={option.value} value={option.value}>{typeof option.label === "string" ? option.label : option.value}</option> : null)}</select></label>;
}

export function FormView({ component, fieldIds, children, onAction }: { component: A2uiComponent; fieldIds: string[]; children?: ReactNode; onAction: A2uiActionHandler }): ReactNode {
  const getField = useContext(FieldValuesContext);
  const submit = action(component.submitAction);
  return <form className="a2ui-form" onSubmit={(event) => { event.preventDefault(); if (submit !== undefined) onAction({ name: submit.name, payload: { values: Object.fromEntries(fieldIds.map((id) => [id, getField(id)])) } }); }}>{str(component, "title") && <div className="a2ui-form-title">{str(component, "title")}</div>}{children}<button type="submit" className="a2ui-button a2ui-button-variant-primary" disabled={submit === undefined}>{submit?.name ?? "提交"}</button></form>;
}
