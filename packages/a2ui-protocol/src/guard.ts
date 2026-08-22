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
 * MVP 只处理 createSurface（= 完整 Surface Snapshot）；
 * 其余消息 kind 返回 null（Renderer 未来版本再扩展）。
 */

import { getCatalogComponent, isCatalogComponent, resolveCatalog } from "./catalog/dsh-basic.js";
import type { A2uiCatalog, CatalogProperty } from "./catalog/types.js";
import type { A2uiComponent } from "./protocol/messages.js";
import type { A2uiEnvelope, A2uiCreateSurface } from "./protocol/messages.js";
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
function repairCreateSurface(value: Record<string, unknown>): A2uiCreateSurface | null {
  const surfaceId = truncateString(value.surfaceId, A2UI_LIMITS.maxIdLength);
  if (surfaceId === undefined || surfaceId.length === 0) {
    return null;
  }
  const catalog = resolveCatalog(typeof value.catalogId === "string" ? value.catalogId : undefined);
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
export function repairA2uiEnvelope(input: unknown): A2uiEnvelope | null {
  if (!isPlainRecord(input)) {
    return null;
  }
  if (input.version !== A2UI_VERSION) {
    return null;
  }
  if (!isPlainRecord(input.createSurface)) {
    return null;
  }
  const createSurface = repairCreateSurface(input.createSurface);
  if (createSurface === null) {
    return null;
  }
  return { version: A2UI_VERSION, createSurface };
}
