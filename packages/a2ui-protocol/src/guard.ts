/**
 * a2ui-protocol guard —— 安全边界 + 容错（无语义修复）。
 *
 * 模型输出不可信，本层只做白名单过滤与限额：
 * - 未知 component / 未知属性 → 丢弃；
 * - 数字 clamp、字符串截断、数组/组件数/深度硬限额；
 * - **不做语义推断式修复**（不做对象→字符串的"猜 label/value"降级、
 *   不自动补 root）——结构错误尽量安全丢弃，必要时丢弃整个 surface；
 * - `repairA2uiEnvelope` 幂等：同一输入修复结果稳定。
 *
 * 完整 document 支持 create/update/delete 生命周期；基础 repair 路径保持
 * 无副作用，工具落定时可调用 inspectA2uiDocument 获取诊断与统计。
 */

import { createDshBasicCatalogRegistry, getCatalogComponent, isCatalogComponent } from "./catalog/dsh-basic.js";
import type { A2uiCatalogRegistry } from "./catalog/registry.js";
import type { A2uiCatalog, CatalogProperty } from "./catalog/types.js";
import type { A2uiComponent } from "./protocol/messages.js";
import type {
  A2uiCreateSurface,
  A2uiDeleteSurface,
  A2uiEnvelope,
  A2uiUpdateComponents,
  A2uiUpdateDataModel,
} from "./protocol/messages.js";
import { isA2uiEnvelope } from "./protocol/messages.js";
import { reduceA2uiDocument } from "./protocol/surface.js";
import { A2UI_VERSION, A2UI_LIMITS } from "./protocol/types.js";
import type { A2uiComponentPropertyValue } from "./protocol/types.js";

const isPlainRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);

function truncateString(value: unknown, max: number): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }
  return value.length > max ? value.slice(0, max) : value;
}

function clampNumber(value: unknown): number | undefined {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return undefined;
  }
  return Math.max(0, Math.min(Math.round(value), Number.MAX_SAFE_INTEGER));
}

/** 数据绑定值：字面量（string/number/boolean）| {path} | {call, args}。 */
function sanitizeBound(value: unknown, max: number): A2uiComponentPropertyValue | undefined {
  if (typeof value === "string") {
    return truncateString(value, max);
  }
  if (typeof value === "number") {
    return clampNumber(value);
  }
  if (typeof value === "boolean") {
    return value;
  }
  if (isPlainRecord(value) && typeof value.path === "string") {
    const path = truncateString(value.path, max);
    if (path !== undefined) {
      return { path };
    }
  }
  if (isPlainRecord(value) && typeof value.call === "string" && isPlainRecord(value.args)) {
    const call = truncateString(value.call, max);
    if (call !== undefined) {
      return { call, args: value.args };
    }
  }
  return undefined;
}

/**
 * 归一图表序列为 renderer 的 `{ [name]: number[] }`。
 *
 * 除标准对象外，还支持模型稳定产出的两种数组形态：
 * - `[{ name, values | data }]`（多系列）
 * - `[{ label, value }]`（单系列点集；labels 由 repairComponent 同步补齐）
 */
function sanitizeChartSeries(value: unknown, maxPoints: number): Record<string, number[]> | undefined {
  const normalizeValues = (raw: unknown): number[] | undefined => {
    if (!Array.isArray(raw)) return undefined;
    const values = raw
      .slice(0, maxPoints)
      .map((item) => clampNumber(item))
      .filter((item): item is number => item !== undefined);
    return values.length > 0 ? values : undefined;
  };
  if (isPlainRecord(value)) {
    const out: Record<string, number[]> = {};
    for (const [name, raw] of Object.entries(value)) {
      const key = truncateString(name, A2UI_LIMITS.maxString);
      const values = normalizeValues(raw);
      if (key !== undefined && values !== undefined) out[key] = values;
    }
    return Object.keys(out).length > 0 ? out : {};
  }
  if (!Array.isArray(value)) return undefined;
  const named: Record<string, number[]> = {};
  const points: number[] = [];
  for (const item of value.slice(0, maxPoints)) {
    if (!isPlainRecord(item)) continue;
    const name = truncateString(item.name, A2UI_LIMITS.maxString);
    const values = normalizeValues(item.values ?? item.data);
    if (name !== undefined && values !== undefined) {
      named[name] = values;
      continue;
    }
    const point = clampNumber(item.value);
    if (typeof item.label === "string" && point !== undefined) points.push(point);
  }
  if (Object.keys(named).length > 0) return named;
  return points.length > 0 ? { value: points } : undefined;
}

/** 按 catalog 属性类型清洗一个值；未知/非法 → undefined（丢弃）。 */
function sanitizeProperty(value: unknown, def: CatalogProperty): A2uiComponentPropertyValue | undefined {
  const max = def.maxLength ?? A2UI_LIMITS.maxString;
  switch (def.type) {
    case "string":
      return truncateString(value, max);
    case "number":
      return clampNumber(value);
    case "boolean":
      return typeof value === "boolean" ? value : undefined;
    case "string[]": {
      if (!Array.isArray(value)) {
        return undefined;
      }
      // 非字符串元素直接丢弃（不做对象降级）。
      const out = value
        .map((item) => truncateString(item, max))
        .filter((item): item is string => item !== undefined);
      return out.length > 0 ? out : undefined;
    }
    case "string[][]": {
      if (!Array.isArray(value)) {
        return undefined;
      }
      // 非数组行直接丢弃整行（不做对象行降级）。
      const out = value
        .map((row) =>
          Array.isArray(row)
            ? row.map((cell) => truncateString(cell, max)).filter((cell): cell is string => cell !== undefined)
            : null,
        )
        .filter((row): row is string[] => row !== null && row.length > 0);
      return out.length > 0 ? out : undefined;
    }
    case "number[]": {
      if (!Array.isArray(value)) {
        return undefined;
      }
      const out = value
        .map((item) => clampNumber(item))
        .filter((item): item is number => item !== undefined);
      return out.length > 0 ? out : undefined;
    }
    case "object":
      return isPlainRecord(value) ? value : undefined;
    case "object[]": {
      if (!Array.isArray(value)) {
        return undefined;
      }
      const out = value
        .slice(0, A2UI_LIMITS.maxChildren)
        .filter((item): item is Record<string, unknown> => isPlainRecord(item));
      return out.length > 0 ? out : undefined;
    }
    case "chart-series":
      return sanitizeChartSeries(value, def.maxLength ?? 60);
    case "bound":
      return sanitizeBound(value, max);
    default:
      return undefined;
  }
}

/** 修复单个组件；未知 component / 非法 id / 无合法属性 → undefined（丢弃）。 */
function repairComponent(value: unknown, catalog: A2uiCatalog): A2uiComponent | undefined {
  if (!isPlainRecord(value)) {
    return undefined;
  }
  const component = truncateString(value.component, A2UI_LIMITS.maxComponentNameLength);
  if (component === undefined || !isCatalogComponent(catalog, component)) {
    return undefined;
  }
  const id = truncateString(value.id, A2UI_LIMITS.maxIdLength);
  if (id === undefined || id.length === 0) {
    return undefined;
  }
  const def = getCatalogComponent(catalog, component);
  if (def === undefined) {
    return undefined;
  }
  const props: Record<string, unknown> = {};
  for (const propDef of def.properties) {
    if (!Object.hasOwn(value, propDef.name)) {
      continue;
    }
    const sanitized = sanitizeProperty(value[propDef.name], propDef);
    if (sanitized !== undefined) {
      props[propDef.name] = sanitized;
    }
  }
  // 点集数组 `[{ label, value }]` 的 label 与 series 一一对应；只在 labels 缺失时
  // 补齐，避免覆盖模型显式给出的横轴。该形态是 chart-series 的公开输入格式。
  if (component === "chart" && props.series !== undefined && !Object.hasOwn(props, "labels") && Array.isArray(value.series)) {
    const labels = value.series
      .slice(0, 60)
      .map((item) => isPlainRecord(item) ? truncateString(item.label, 200) : undefined)
      .filter((item): item is string => item !== undefined);
    if (labels.length > 0) props.labels = labels;
  }
  let children: string[] | undefined;
  if (Array.isArray(value.children)) {
    const cleaned = value.children
      .slice(0, def.limits.maxChildren ?? A2UI_LIMITS.maxChildren)
      .map((child) => truncateString(child, A2UI_LIMITS.maxIdLength))
      .filter((child): child is string => child !== undefined && child.length > 0);
    if (cleaned.length > 0) {
      children = cleaned;
    }
  }
  return { id, component, ...(children !== undefined ? { children } : {}), ...props };
}

/**
 * 修复组件树：从 root BFS，深度 ≤ maxDepth，循环引用按 visited 截断，
 * children 引用不存在的 id 跳过，不可达组件（孤岛）丢弃。
 * 缺 root 或组件列表为空 → null（整个 surface 丢弃）。
 */
function repairComponentTree(rawComponents: unknown, catalog: A2uiCatalog): A2uiComponent[] | null {
  if (!Array.isArray(rawComponents)) {
    return null;
  }
  const repaired = rawComponents
    .slice(0, A2UI_LIMITS.maxComponents)
    .map((item) => repairComponent(item, catalog))
    .filter((item): item is A2uiComponent => item !== undefined);
  if (!repaired.some((item) => item.id === "root")) {
    return null;
  }
  const byId = new Map<string, A2uiComponent>();
  for (const item of repaired) {
    byId.set(item.id, item);
  }
  const reachable: A2uiComponent[] = [];
  const visited = new Set<string>(["root"]);
  let queue: string[] = ["root"];
  for (let depth = 1; depth <= A2UI_LIMITS.maxDepth && queue.length > 0; depth++) {
    const next: string[] = [];
    for (const id of queue) {
      const component = byId.get(id);
      if (component === undefined) {
        continue;
      }
      reachable.push(component);
      const children = component.children;
      if (children === undefined) {
        continue;
      }
      for (const child of children) {
        if (!visited.has(child)) {
          visited.add(child);
          next.push(child);
        }
      }
    }
    queue = next;
  }
  if (reachable.length === 0) {
    return null;
  }
  return reachable;
}

/** 修复 createSurface 载荷；surfaceId/catalog 非法或组件树不可修复 → null。 */
function repairCreateSurface(value: Record<string, unknown>, catalogRegistry: A2uiCatalogRegistry): A2uiCreateSurface | null {
  const surfaceId = truncateString(value.surfaceId, A2UI_LIMITS.maxIdLength);
  if (surfaceId === undefined || surfaceId.length === 0) {
    return null;
  }
  const catalog = catalogRegistry.resolve(typeof value.catalogId === "string" ? value.catalogId : undefined);
  if (catalog === undefined) {
    return null;
  }
  const components = repairComponentTree(value.components, catalog);
  if (components === null) {
    return null;
  }
  const theme = truncateString(value.theme, 64);
  return {
    surfaceId,
    catalogId: catalog.catalogId,
    ...(theme !== undefined ? { theme } : {}),
    ...(typeof value.sendDataModel === "boolean" ? { sendDataModel: value.sendDataModel } : {}),
    components,
  };
}

/**
 * 幂等修复一个 A2UI envelope。仅支持 createSurface（MVP）；
 * 非 v0.9.1 / 非 createSurface / 结构不可修复 → null。
 */
export function repairA2uiEnvelope(input: unknown, catalogRegistry = createDshBasicCatalogRegistry()): A2uiEnvelope | null {
  if (!isPlainRecord(input)) {
    return null;
  }
  if (input.version !== A2UI_VERSION) {
    return null;
  }
  if (!isPlainRecord(input.createSurface)) {
    return null;
  }
  const createSurface = repairCreateSurface(input.createSurface, catalogRegistry);
  if (createSurface === null) {
    return null;
  }
  return { version: A2UI_VERSION, createSurface };
}

function repairUpdateComponents(
  value: Record<string, unknown>,
  catalog: A2uiCatalog,
): A2uiUpdateComponents | null {
  const surfaceId = truncateString(value.surfaceId, A2UI_LIMITS.maxIdLength);
  if (surfaceId === undefined || surfaceId.length === 0 || !Array.isArray(value.components)) {
    return null;
  }
  const components = value.components
    .slice(0, A2UI_LIMITS.maxComponents)
    .map((component) => repairComponent(component, catalog))
    .filter((component): component is A2uiComponent => component !== undefined);
  if (components.length === 0) {
    return null;
  }
  return { surfaceId, components };
}

function repairUpdateDataModel(value: Record<string, unknown>): A2uiUpdateDataModel | null {
  const surfaceId = truncateString(value.surfaceId, A2UI_LIMITS.maxIdLength);
  if (surfaceId === undefined || surfaceId.length === 0) {
    return null;
  }
  const rawPath = value.path;
  const path = rawPath === undefined ? undefined : truncateString(rawPath, A2UI_LIMITS.maxString);
  if (rawPath !== undefined && (path === undefined || (path.length > 0 && !path.startsWith("/")))) {
    return null;
  }
  return {
    surfaceId,
    ...(path !== undefined ? { path } : {}),
    ...(Object.hasOwn(value, "value") ? { value: value.value } : {}),
  };
}

function repairDeleteSurface(value: Record<string, unknown>): A2uiDeleteSurface | null {
  const surfaceId = truncateString(value.surfaceId, A2UI_LIMITS.maxIdLength);
  return surfaceId === undefined || surfaceId.length === 0 ? null : { surfaceId };
}

/**
 * Repairs a complete, renderable A2UI document. The first message must create a
 * surface; later messages may create additional surfaces or update/delete an
 * existing one. Action/error envelopes are intentionally not accepted here:
 * `a2ui_render` persists a UI document, not client-to-agent traffic.
 */
function repairA2uiDocumentInternal(input: readonly unknown[], catalogRegistry: A2uiCatalogRegistry): A2uiEnvelope[] | null {
  if (input.length === 0) {
    return null;
  }
  const repaired: A2uiEnvelope[] = [];
  const catalogs = new Map<string, A2uiCatalog>();

  for (const [index, value] of input.entries()) {
    if (!isA2uiEnvelope(value)) {
      return null;
    }
    if ("createSurface" in value) {
      const envelope = repairA2uiEnvelope(value, catalogRegistry);
      if (envelope === null || !("createSurface" in envelope)) {
        return null;
      }
      if (index === 0 || repaired.length > 0) {
        repaired.push(envelope);
        const catalog = catalogRegistry.resolve(envelope.createSurface.catalogId);
        if (catalog === undefined) return null;
        catalogs.set(envelope.createSurface.surfaceId, catalog);
        continue;
      }
    }
    if (index === 0) {
      return null;
    }
    const current = reduceA2uiDocument(repaired);
    if ("updateComponents" in value) {
      const snapshot = current.get(value.updateComponents.surfaceId);
      const catalog = snapshot === undefined ? undefined : catalogs.get(snapshot.surfaceId);
      if (catalog === undefined || !isPlainRecord(value.updateComponents)) return null;
      const updateComponents = repairUpdateComponents(value.updateComponents, catalog);
      if (updateComponents === null || !current.has(updateComponents.surfaceId)) return null;
      repaired.push({ version: A2UI_VERSION, updateComponents });
      continue;
    }
    if ("updateDataModel" in value) {
      if (!isPlainRecord(value.updateDataModel)) return null;
      const updateDataModel = repairUpdateDataModel(value.updateDataModel);
      if (updateDataModel === null || !current.has(updateDataModel.surfaceId)) return null;
      repaired.push({ version: A2UI_VERSION, updateDataModel });
      continue;
    }
    if ("deleteSurface" in value) {
      if (!isPlainRecord(value.deleteSurface)) return null;
      const deleteSurface = repairDeleteSurface(value.deleteSurface);
      if (deleteSurface === null || !current.has(deleteSurface.surfaceId)) return null;
      repaired.push({ version: A2UI_VERSION, deleteSurface });
      catalogs.delete(deleteSurface.surfaceId);
      continue;
    }
    return null;
  }
  const first = repaired[0];
  return first !== undefined && "createSurface" in first ? repaired : null;
}

/** Guard 输出的可持久化诊断。path 指向原始 messages 参数中的字段。 */
export interface A2uiGuardDiagnostic {
  readonly severity: "warning" | "error";
  readonly code: "component-dropped" | "property-dropped" | "lifecycle-rejected" | "document-rejected";
  readonly path: string;
  readonly message: string;
}

/** 用于工具详情的轻量级 guard 统计，不包含任何用户业务数据。 */
export interface A2uiGuardStats {
  readonly inputEnvelopeCount: number;
  readonly acceptedEnvelopeCount: number;
  readonly inputComponentCount: number;
  readonly retainedComponentCount: number;
  readonly droppedComponentCount: number;
  readonly droppedPropertyCount: number;
  readonly rejectedLifecycleCount: number;
}

export interface A2uiDocumentInspection {
  readonly document: A2uiEnvelope[] | null;
  readonly diagnostics: readonly A2uiGuardDiagnostic[];
  readonly stats: A2uiGuardStats;
}

const COMPONENT_STRUCTURAL_KEYS = new Set(["id", "component", "children"]);

function operationName(value: Record<string, unknown>): "createSurface" | "updateComponents" | "updateDataModel" | "deleteSurface" | undefined {
  const names = ["createSurface", "updateComponents", "updateDataModel", "deleteSurface"] as const;
  return names.find((name) => name in value);
}

function reportComponentFiltering(
  raw: Record<string, unknown>,
  repaired: A2uiEnvelope,
  index: number,
  diagnostics: A2uiGuardDiagnostic[],
  stats: { inputComponentCount: number; retainedComponentCount: number; droppedComponentCount: number; droppedPropertyCount: number },
): void {
  const operation = operationName(raw);
  if (operation !== "createSurface" && operation !== "updateComponents") return;
  const rawPayload = raw[operation];
  const repairedPayload = operation === "createSurface"
    ? ("createSurface" in repaired ? repaired.createSurface : undefined)
    : ("updateComponents" in repaired ? repaired.updateComponents : undefined);
  if (!isPlainRecord(rawPayload) || !isPlainRecord(repairedPayload) || !Array.isArray(rawPayload.components) || !Array.isArray(repairedPayload.components)) {
    return;
  }
  stats.inputComponentCount += rawPayload.components.length;
  stats.retainedComponentCount += repairedPayload.components.length;
  const retainedById = new Map(
    repairedPayload.components
      .map((component) => [component.id, component]),
  );
  rawPayload.components.forEach((component, componentIndex) => {
    const path = `messages[${index}].${operation}.components[${componentIndex}]`;
    if (!isPlainRecord(component) || typeof component.id !== "string") {
      stats.droppedComponentCount++;
      diagnostics.push({ severity: "warning", code: "component-dropped", path, message: "Component was dropped because it has no valid id or component declaration." });
      return;
    }
    const retained = retainedById.get(component.id);
    if (retained === undefined) {
      stats.droppedComponentCount++;
      diagnostics.push({ severity: "warning", code: "component-dropped", path, message: `Component '${component.id}' was dropped by catalog or reachability validation.` });
      return;
    }
    for (const property of Object.keys(component)) {
      if (COMPONENT_STRUCTURAL_KEYS.has(property)) continue;
      if (!Object.hasOwn(retained, property)) {
        stats.droppedPropertyCount++;
        diagnostics.push({ severity: "warning", code: "property-dropped", path: `${path}.${property}`, message: `Property '${property}' was removed because it is unknown or invalid for component '${component.id}'.` });
      }
    }
  });
}

function reportRejectedLifecycle(
  input: readonly unknown[],
  diagnostics: A2uiGuardDiagnostic[],
  stats: { rejectedLifecycleCount: number },
): void {
  const knownSurfaces = new Set<string>();
  input.forEach((item, index) => {
    const path = `messages[${index}]`;
    if (!isPlainRecord(item) || item.version !== A2UI_VERSION) {
      stats.rejectedLifecycleCount++;
      diagnostics.push({ severity: "error", code: "document-rejected", path, message: "Envelope is not a valid A2UI v0.9.1 object." });
      return;
    }
    const operation = operationName(item);
    if (operation === undefined || !isPlainRecord(item[operation])) {
      stats.rejectedLifecycleCount++;
      diagnostics.push({ severity: "error", code: "document-rejected", path, message: "Envelope must contain one supported lifecycle operation." });
      return;
    }
    const payload = item[operation];
    const surfaceId = typeof payload.surfaceId === "string" ? payload.surfaceId : undefined;
    if (operation === "createSurface" && surfaceId !== undefined) {
      knownSurfaces.add(surfaceId);
      return;
    }
    if (operation === "updateDataModel" && payload.path !== undefined && (typeof payload.path !== "string" || (payload.path.length > 0 && !payload.path.startsWith("/")))) {
      stats.rejectedLifecycleCount++;
      diagnostics.push({ severity: "error", code: "lifecycle-rejected", path: `${path}.updateDataModel.path`, message: "Data-model path must be a JSON Pointer beginning with '/'." });
      return;
    }
    if (surfaceId === undefined || !knownSurfaces.has(surfaceId)) {
      stats.rejectedLifecycleCount++;
      diagnostics.push({ severity: "error", code: "lifecycle-rejected", path: `${path}.${operation}.surfaceId`, message: `Lifecycle operation targets missing surface '${surfaceId ?? ""}'.` });
      return;
    }
    if (operation === "deleteSurface") knownSurfaces.delete(surfaceId);
  });
  if (diagnostics.length === 0) {
    diagnostics.push({ severity: "error", code: "document-rejected", path: "messages", message: "Document was rejected by structural validation." });
  }
}

/**
 * Repairs a document and returns an audit trail suitable for tool/result.meta.
 * The diagnostics intentionally contain paths and rule outcomes only, never raw
 * component values or data-model values.
 */
export function inspectA2uiDocument(input: readonly unknown[], catalogRegistry = createDshBasicCatalogRegistry()): A2uiDocumentInspection {
  const document = repairA2uiDocumentInternal(input, catalogRegistry);
  const diagnostics: A2uiGuardDiagnostic[] = [];
  const mutableStats = {
    inputEnvelopeCount: input.length,
    acceptedEnvelopeCount: document?.length ?? 0,
    inputComponentCount: 0,
    retainedComponentCount: 0,
    droppedComponentCount: 0,
    droppedPropertyCount: 0,
    rejectedLifecycleCount: 0,
  };
  if (document === null) {
    reportRejectedLifecycle(input, diagnostics, mutableStats);
  } else {
    input.forEach((raw, index) => {
      const repaired = document[index];
      if (isPlainRecord(raw) && repaired !== undefined) {
        reportComponentFiltering(raw, repaired, index, diagnostics, mutableStats);
      }
    });
  }
  return { document, diagnostics, stats: mutableStats };
}

/** 修复完整 A2UI document；需要诊断时使用 inspectA2uiDocument。 */
export function repairA2uiDocument(input: readonly unknown[], catalogRegistry = createDshBasicCatalogRegistry()): A2uiEnvelope[] | null {
  return repairA2uiDocumentInternal(input, catalogRegistry);
}
