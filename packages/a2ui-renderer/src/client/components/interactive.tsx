import { createContext, useContext, useEffect, useState } from "react";
import type { ReactNode } from "react";
import type { A2uiComponent } from "@dsh-plugin-edu/a2ui-protocol";

export interface A2uiActionHandler { (action: { name: string; payload?: unknown }): void; }
export type FileMetadata = { name: string; size: number; type: string; lastModified: number };
export type FieldValue = string | number | boolean | FileMetadata[];
export const FieldValuesContext = createContext<(id: string) => FieldValue | undefined>(() => undefined);
export const FieldSetContext = createContext<(id: string, value: FieldValue) => void>(() => {});
export const DataModelContext = createContext<Record<string, unknown>>({});

function str(component: A2uiComponent, key: string, fallback = ""): string {
  return typeof component[key] === "string" ? component[key] as string : fallback;
}

function action(value: unknown): { name: string; payload?: unknown } | undefined {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return undefined;
  const record = value as Record<string, unknown>;
  return typeof record.name === "string" ? { name: record.name, ...(record.payload === undefined ? {} : { payload: record.payload }) } : undefined;
}

function boundValue(value: unknown, dataModel: Record<string, unknown>): string | number | boolean | undefined {
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") return value;
  if (typeof value !== "object" || value === null || !("path" in value) || typeof value.path !== "string") return undefined;
  const result = value.path.split("/").filter(Boolean).reduce<unknown>((current, part) =>
    current !== null && typeof current === "object" ? (current as Record<string, unknown>)[part] : undefined, dataModel);
  return typeof result === "string" || typeof result === "number" || typeof result === "boolean" ? result : undefined;
}

function stringValue(value: unknown): string {
  return typeof value === "string" || typeof value === "number" ? String(value) : "";
}

function numberValue(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function accessibleLabel(component: A2uiComponent, fallback: string): string {
  return str(component, "label") || str(component, "placeholder") || fallback;
}

export function ButtonView({ component, onAction }: { component: A2uiComponent; onAction: A2uiActionHandler }): ReactNode {
  const declared = action(component.action);
  const disabled = component.disabled === true || declared === undefined;
  return <button type="button" className={`a2ui-button${str(component, "variant") === "primary" ? " a2ui-button-variant-primary" : ""}`} disabled={disabled} onClick={() => declared !== undefined && onAction(declared)}>{str(component, "label", "确定")}</button>;
}

export function InputView({ component }: { component: A2uiComponent }): ReactNode {
  const setField = useContext(FieldSetContext);
  const dataModel = useContext(DataModelContext);
  const [value, setValue] = useState(() => stringValue(boundValue(component.value, dataModel)));
  useEffect(() => {
    const next = stringValue(boundValue(component.value, dataModel));
    setValue(next);
    setField(component.id, next);
  }, [component.id, component.value, dataModel, setField]);
  return <label className="a2ui-field">{str(component, "label") && <span className="a2ui-field-label">{str(component, "label")}</span>}<input className="a2ui-input" aria-label={accessibleLabel(component, "输入内容")} type={str(component, "type") === "number" ? "number" : "text"} value={value} placeholder={str(component, "placeholder")} disabled={component.disabled === true} onChange={(event) => { setValue(event.target.value); setField(component.id, event.target.value); }} /></label>;
}

export function SelectView({ component }: { component: A2uiComponent }): ReactNode {
  const setField = useContext(FieldSetContext);
  const dataModel = useContext(DataModelContext);
  const [value, setValue] = useState(() => stringValue(boundValue(component.value, dataModel)));
  useEffect(() => {
    const next = stringValue(boundValue(component.value, dataModel));
    setValue(next);
    setField(component.id, next);
  }, [component.id, component.value, dataModel, setField]);
  const options = Array.isArray(component.options) ? component.options.filter((item): item is Record<string, unknown> => typeof item === "object" && item !== null && !Array.isArray(item)) : [];
  return <label className="a2ui-field">{str(component, "label") && <span className="a2ui-field-label">{str(component, "label")}</span>}<select className="a2ui-select" aria-label={accessibleLabel(component, "请选择")} value={value} disabled={component.disabled === true} onChange={(event) => { setValue(event.target.value); setField(component.id, event.target.value); }}><option value="">请选择</option>{options.map((option) => typeof option.value === "string" ? <option key={option.value} value={option.value}>{typeof option.label === "string" ? option.label : option.value}</option> : null)}</select></label>;
}

export function DateTimeView({ component }: { component: A2uiComponent }): ReactNode {
  const setField = useContext(FieldSetContext);
  const dataModel = useContext(DataModelContext);
  const [value, setValue] = useState(() => stringValue(boundValue(component.value, dataModel)));
  useEffect(() => {
    const next = stringValue(boundValue(component.value, dataModel));
    setValue(next);
    setField(component.id, next);
  }, [component.id, component.value, dataModel, setField]);
  const mode = str(component, "mode");
  const type = mode === "time" || mode === "datetime-local" ? mode : "date";
  return <label className="a2ui-field">{str(component, "label") && <span className="a2ui-field-label">{str(component, "label")}</span>}<input className="a2ui-input" aria-label={accessibleLabel(component, "日期和时间")} type={type} value={value} min={str(component, "min")} max={str(component, "max")} disabled={component.disabled === true} onChange={(event) => { setValue(event.target.value); setField(component.id, event.target.value); }} /></label>;
}

export function SwitchView({ component }: { component: A2uiComponent }): ReactNode {
  const setField = useContext(FieldSetContext);
  const dataModel = useContext(DataModelContext);
  const [checked, setChecked] = useState(() => boundValue(component.value, dataModel) === true);
  useEffect(() => {
    const next = boundValue(component.value, dataModel) === true;
    setChecked(next);
    setField(component.id, next);
  }, [component.id, component.value, dataModel, setField]);
  return <label className="a2ui-switch"><input className="a2ui-switch-control" aria-label={accessibleLabel(component, "开关")} type="checkbox" role="switch" checked={checked} disabled={component.disabled === true} onChange={(event) => { setChecked(event.target.checked); setField(component.id, event.target.checked); }} /><span>{str(component, "label")}</span></label>;
}

export function SliderView({ component }: { component: A2uiComponent }): ReactNode {
  const setField = useContext(FieldSetContext);
  const dataModel = useContext(DataModelContext);
  const min = numberValue(component.min, 0);
  const max = Math.max(min, numberValue(component.max, 100));
  const step = Math.max(1, numberValue(component.step, 1));
  const initialValue = Math.min(max, Math.max(min, numberValue(boundValue(component.value, dataModel), min)));
  const [value, setValue] = useState(initialValue);
  useEffect(() => {
    const next = Math.min(max, Math.max(min, numberValue(boundValue(component.value, dataModel), min)));
    setValue(next);
    setField(component.id, next);
  }, [component.id, component.value, dataModel, max, min, setField]);
  return <label className="a2ui-field a2ui-slider">{str(component, "label") && <span className="a2ui-field-label">{str(component, "label")}</span>}<span><input aria-label={accessibleLabel(component, "滑块")} type="range" min={min} max={max} step={step} value={value} disabled={component.disabled === true} onChange={(event) => { const next = Number(event.target.value); setValue(next); setField(component.id, next); }} /><output>{value}</output></span></label>;
}

export function FileView({ component }: { component: A2uiComponent }): ReactNode {
  const setField = useContext(FieldSetContext);
  return <label className="a2ui-field">{str(component, "label") && <span className="a2ui-field-label">{str(component, "label")}</span>}<input className="a2ui-input a2ui-file-input" aria-label={accessibleLabel(component, "选择文件")} type="file" accept={str(component, "accept")} multiple={component.multiple === true} disabled={component.disabled === true} onChange={(event) => { const files = Array.from(event.target.files ?? []).map((file) => ({ name: file.name, size: file.size, type: file.type, lastModified: file.lastModified })); setField(component.id, files); }} /></label>;
}

export function ModalView({ component, children, onAction }: { component: A2uiComponent; children?: ReactNode; onAction: A2uiActionHandler }): ReactNode {
  const declared = action(component.closeAction);
  const [open, setOpen] = useState(component.open === true);
  useEffect(() => setOpen(component.open === true), [component.open]);
  if (!open) return null;
  const close = () => {
    setOpen(false);
    if (declared !== undefined) onAction(declared);
  };
  return <div className="a2ui-modal-backdrop" role="presentation" onMouseDown={close}><section className="a2ui-modal" role="dialog" aria-modal="true" aria-label={str(component, "title", "对话框")} onMouseDown={(event) => event.stopPropagation()}><header className="a2ui-modal-header">{str(component, "title") && <div className="a2ui-card-title">{str(component, "title")}</div>}<button type="button" className="a2ui-modal-close" aria-label="关闭对话框" onClick={close}>×</button></header><div>{children}</div></section></div>;
}

export function FormView({ component, fieldIds, children, onAction }: { component: A2uiComponent; fieldIds: string[]; children?: ReactNode; onAction: A2uiActionHandler }): ReactNode {
  const getField = useContext(FieldValuesContext);
  const submit = action(component.submitAction);
  return <form className="a2ui-form" onSubmit={(event) => { event.preventDefault(); if (submit !== undefined) onAction({ name: submit.name, payload: { values: Object.fromEntries(fieldIds.map((id) => [id, getField(id)])) } }); }}>{str(component, "title") && <div className="a2ui-form-title">{str(component, "title")}</div>}{children}<button type="submit" className="a2ui-button a2ui-button-variant-primary" disabled={submit === undefined}>{submit?.name ?? "提交"}</button></form>;
}
