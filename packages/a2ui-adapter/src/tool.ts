/**
 * a2ui-adapter tool —— `a2ui_render` 工具。
 *
 * 模型将 A2UI v0.9.1 消息数组作为 `messages` 传入（第一个为 createSurface，
 * 必须含 id="root" 组件）。工具**不调用模型**：用 a2ui-protocol 的 guard
 * 校验/修复后，将权威 document 序列化写入 `tool/result.meta`（durable、
 * 可回放），返回一句文本回执。浏览器端节点以工具调用位置为锚点渲染，
 * 流式显示（tool-call-delta），落定时读 meta（replay 同样走 meta）。
 *
 * 与 assistant 文本短代码路径的区别：工具调用在 assistant 流中是一块
 * tool-call-delta，**不会**被 AssistantMarkdown 渲染成可见文本 →
 * UI 原位内嵌、无原始 JSON 泄露。
 */

import type { Context } from "@deepseek-ai/cordis";
import { defineTool } from "@deepseek-ai/dsh-tools";
import type { GenericCallView, GenericResultView, ToolResult } from "@deepseek-ai/dsh-tools";
import type { JsonValue } from "@deepseek-ai/dsh-session";
import {
  type A2uiCatalogRegistry,
  inspectA2uiDocument,
  reduceA2uiDocument,
} from "@dsh-plugin-edu/a2ui-protocol";
import type { A2uiGuardDiagnostic, A2uiGuardStats } from "@dsh-plugin-edu/a2ui-protocol";
import { A2uiSurfaceStateStore } from "./surface-state.js";

export const A2UI_TOOL_NAME = "a2ui_render" as const;
/** tool/result.meta 判别符。 */
export const A2UI_META_KIND = "a2ui-surface" as const;

/** 一个 a2ui surface 的持久化事实（tool/result.meta）。 */
export interface A2uiSurfaceMeta {
  kind: typeof A2UI_META_KIND;
  /** 稳定 surface 标识（= 工具调用 id）。 */
  surfaceId: string;
  /** 规范化 A2UI document（JSONL：每行一个消息）。 */
  document: string;
  /** 可选标题。 */
  title?: string;
  /** 渲染的组件类型名列表。 */
  componentNames: string[];
  /** guard 发出的非致命警告数。 */
  warningCount: number;
  /** 可在 DSH 工具详情中审计的字段/组件过滤结果（不含原始业务值）。 */
  diagnostics: readonly A2uiGuardDiagnostic[];
  /** guard 的结构化统计。 */
  guardStats: A2uiGuardStats;
}

const isPlainRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);

const surfaceState = new A2uiSurfaceStateStore();

/** 序列化消息数组为 JSONL document。 */
function serializeDocument(messages: readonly unknown[]): string {
  return messages.map((message) => JSON.stringify(message)).join("\n");
}

/** 详细诊断并抛错（错误信息 model-visible，让模型能自我修正）。 */
function validateCreateSurfaceMessage(value: unknown, catalogs: A2uiCatalogRegistry): never | void {
  if (!isPlainRecord(value)) {
    throw new Error("a2ui_render: messages[0] must be a JSON object (an A2UI envelope)");
  }
  if (value.version !== "v0.9.1") {
    throw new Error(
      `a2ui_render: messages[0].version must be exactly "v0.9.1" (got ${JSON.stringify(value.version)})`,
    );
  }
  if (!isPlainRecord(value.createSurface)) {
    throw new Error(
      `a2ui_render: messages[0].createSurface must be a JSON object (got ${JSON.stringify(typeof value.createSurface)})`,
    );
  }
  const cs = value.createSurface;
  if (typeof cs.surfaceId !== "string" || cs.surfaceId.length === 0) {
    throw new Error('a2ui_render: messages[0].createSurface.surfaceId must be a non-empty string (use a stable id like "report-1")');
  }
  if (typeof cs.catalogId !== "undefined" && typeof cs.catalogId !== "string") {
    throw new Error(
      `a2ui_render: messages[0].createSurface.catalogId must be a string or omitted (got ${JSON.stringify(cs.catalogId)})`,
    );
  }
  if (catalogs.resolve(cs.catalogId) === undefined) {
    throw new Error(
      `a2ui_render: messages[0].createSurface.catalogId must name a registered catalog (${catalogs.catalogIds().join(", ")}) or be omitted`,
    );
  }
  if (!Array.isArray(cs.components)) {
    throw new Error("a2ui_render: messages[0].createSurface.components must be an array of component objects");
  }
  if (cs.components.length === 0) {
    throw new Error("a2ui_render: messages[0].createSurface.components must include at least the root component");
  }
  if (!cs.components.some((component) => isPlainRecord(component) && component.id === "root")) {
    throw new Error('a2ui_render: messages[0].createSurface.components must include a component with id "root"');
  }
}

const DOCUMENT_OPERATIONS = ["createSurface", "updateComponents", "updateDataModel", "deleteSurface"] as const;

/** Validate every envelope before repair so the model receives an actionable index-specific error. */
function validateDocumentMessages(messages: readonly unknown[]): void {
  messages.forEach((value, index) => {
    if (!isPlainRecord(value)) {
      throw new Error(`a2ui_render: messages[${index}] must be a JSON object (an A2UI envelope)`);
    }
    if (value.version !== "v0.9.1") {
      throw new Error(
        `a2ui_render: messages[${index}].version must be exactly "v0.9.1"; every lifecycle envelope repeats the version (got ${JSON.stringify(value.version)})`,
      );
    }
    const operations = DOCUMENT_OPERATIONS.filter((operation) => operation in value);
    if (operations.length !== 1) {
      throw new Error(
        `a2ui_render: messages[${index}] must contain exactly one lifecycle operation: ${DOCUMENT_OPERATIONS.join(", ")}`,
      );
    }
    const operation = operations[0];
    if (operation === undefined || !isPlainRecord(value[operation])) {
      throw new Error(`a2ui_render: messages[${index}].${String(operation)} must be a JSON object`);
    }
  });
}

/**
 * 注册 `a2ui_render`。
 * @param ctx - 携带工具注册表的上下文。
 * @param catalogs - 当前 composition 激活的 catalog registry。
 */
export function applyA2uiTool(ctx: Context, catalogs: A2uiCatalogRegistry): void {
  ctx.tools.register(defineTool({
    name: A2UI_TOOL_NAME,
    description:
      "Generate an interactive UI — charts, KPI cards, tables, forms, or a dashboard — shown inline "
      + "in the conversation. Author the A2UI v0.9.1 messages yourself and pass them as `messages` "
      + "(createSurface first, a registered catalogId or the default catalog, root component id \"root\"), following the A2UI "
      + "authoring guide in your system prompt. The client renders them as you write the call, streaming. "
      + "Returns text only and writes no files; author the whole UI in one call and do not repeat it as text.",
    parameters: {
      messages: {
        type: "array",
        required: true,
        items: { type: "json" },
        description: "The A2UI v0.9.1 envelope objects, in order. Element 0 is createSurface; one component must have id \"root\".",
      },
      title: { type: "string", description: "Optional short title for the surface." },
    },
    output: {
      schema: {
        type: "object",
        additionalProperties: false,
        properties: {
          surfaceId: { type: "string", required: true },
          componentNames: { type: "array", required: true, items: { type: "string" } },
          warningCount: { type: "integer", required: true },
          meta: { type: "json", required: true },
        },
      },
      render: (_args, value) => {
        const names = value.componentNames.join(", ");
        const warned = value.warningCount > 0 ? ` (${value.warningCount} validation warning(s); inspect tool details)` : "";
        return [{
          type: "text",
          text: `Rendered an interactive UI (surface ${value.surfaceId}) with ${value.componentNames.length} component type(s): ${names}${warned}. It is shown to the user inline — do not repeat it as text.`,
        }];
      },
      // document 走 meta：durable、replayed、永不进入模型可见 content。
      presentationMeta: (_args, value): JsonValue => value.meta,
    },
    async execute(args, exec) {
      const messages = args.messages as unknown;
      if (!Array.isArray(messages) || messages.length === 0) {
        throw new Error("a2ui_render: messages must be a non-empty array");
      }
      // 完整 document 仍要求首条为 createSurface，后续可包含所有生命周期消息。
      const envelope = messages[0];
      // 详细诊断（model-visible 错误）后让 guard 修一次（防御）。
      validateCreateSurfaceMessage(envelope, catalogs);
      validateDocumentMessages(messages);
      const inspection = inspectA2uiDocument(messages, catalogs);
      const repairedDocument = inspection.document;
      const repairedFirst = repairedDocument?.[0];
      if (repairedFirst === undefined || !("createSurface" in repairedFirst)) {
        const diagnostic = inspection.diagnostics.find((item) => item.severity === "error");
        const detail = diagnostic === undefined ? "check surfaceId targets, JSON Pointer paths, catalogId, and the 200-component limit" : `${diagnostic.path}: ${diagnostic.message}`;
        throw new Error(`a2ui_render: guard rejected the document: ${detail}`);
      }
      // 重绘是完整快照；模型若遗漏已有 chart.series，按同会话、同业务 surface
      // 回填最后一次 durable 快照中的数据。显式 series: {} 仍表示清空。
      const merged = surfaceState.merge(exec.agent, repairedFirst);
      const normalized = [merged, ...(repairedDocument?.slice(1) ?? [])];
      const document = serializeDocument(normalized);
      const componentNames = [...reduceA2uiDocument(normalized).values()]
        .flatMap((surface) => surface.components.map((component) => component.component));
      const surfaceId = String(exec.callId);
      const title = typeof args.title === "string" && args.title.trim().length > 0 ? args.title.trim() : undefined;
      const meta: A2uiSurfaceMeta = {
        kind: A2UI_META_KIND,
        surfaceId,
        document,
        componentNames: [...new Set(componentNames)],
        warningCount: inspection.diagnostics.length,
        diagnostics: inspection.diagnostics,
        guardStats: inspection.stats,
        ...(title !== undefined ? { title } : {}),
      };
      return {
        surfaceId,
        componentNames: [...new Set(componentNames)],
        warningCount: inspection.diagnostics.length,
        meta: meta as unknown as JsonValue,
      };
    },
    presentCall(args): GenericCallView {
      const count = Array.isArray(args.messages) ? args.messages.length : 0;
      return {
        card: "generic",
        title: args.title !== undefined && args.title.length > 0 ? `Rendering ${args.title}` : "Rendering interactive UI",
        content: [{ type: "text", text: `${count} A2UI message(s)` }],
      };
    },
    presentResult(_args, result: ToolResult): GenericResultView | undefined {
      // 真正的 UI 是浏览器端 keyed on tool/result.meta 的节点；generic card 是宿主无 client 半部时的兜底。
      if (result.isError) return undefined;
      return { card: "generic", title: "Interactive UI rendered" };
    },
  }))
}
