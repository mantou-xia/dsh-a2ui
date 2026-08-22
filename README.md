# dsh-a2ui

为 [deepseek-harness](https://github.com/deepseek-ai/deepseek-harness)（dsh）提供 **A2UI**（Agent-to-UI，[a2ui.org](https://a2ui.org/) v0.9.1）插件能力：模型以 assistant 文本输出 `[a2ui]...[/a2ui]` 短代码，dsh Web GUI（`dsh web`）聊天流中渲染为**可交互** UI，用户操作经既有 `SessionsApi.prompt` 回传 agent。**dsh 内核零改动**，全部通过插件机制接入。

## 架构

```
A2UI v0.9.1 Protocol（wire format，严格对应官方）
    ↓
DSH Custom Catalog（catalogId: 'dsh-basic'，组件名 + 属性白名单 + 限额）
    ↓
DSH Renderer（React 渲染 + 交互回传）
```

- **协议与组件彻底分离**：协议层只承载官方 v0.9.1 消息模型（envelope + 6 类消息判别），自定义组件属于 catalog 层（官方协议 `catalogId` 的合法扩展点）。未来接官方 A2UI client / 其他 renderer / 升级 v1.x，协议层原样复用。
- **主链路唯一**：`assistant/chunk`（live）+ `assistant/message`（history/replay）文本 → 提取短代码 → guard 修复 → surface 整值渲染。**无自定义会话事件、无工具通道、无组件级增量**（见下方 MVP 范围外清单）。

## 包结构（三包 monorepo）

| 包 | 职责 | 运行时依赖 |
|---|---|---|
| `@dsh-a2ui/a2ui-protocol` | 协议类型（官方 v0.9.1）、catalog（dsh-basic）、guard（安全边界）、shortcode | 零依赖 |
| `@dsh-a2ui/a2ui-adapter` | 宿主侧 Cordis 插件：注入 A2UI 教学段；bundle patch 装配 adapter + renderer 两行 | 零依赖 |
| `@dsh-a2ui/a2ui-renderer` | dsh.client 双半部包：`ConversationNodeDefinition<'a2ui'>` + keyed renderer + 静态/交互组件 | react |

> **adapter → renderer 依赖定位声明**：adapter 的 `cordis.patch.yml` 引用了 renderer 包名（让 `ClientModuleRegistry` 扫到 `dsh.client` 并下发 bundle），但 adapter **不 import renderer**——该引用仅用于 profile/bundle 装配，**不代表运行时业务依赖**。集成时两个包分别安装。

### 组件（dsh-basic catalog）

静态：`stat` / `table` / `chart`(bars|line|donut) / `card` / `grid` / `callout`；
交互：`button`（点击回传 action）/ `form`（提交收集字段值）/ `input` / `select`。

官方组件 → 自定义组件映射：

| 官方 basic catalog | dsh-basic |
|---|---|
| Button | button |
| TextField | input |
| ChoicePicker | select |
| Column / Row / List / Card | grid / card |

## 集成步骤

1. 构建三包（renderer 产出 `lib/client.js`）：
   ```bash
   pnpm install
   pnpm --filter @dsh-a2ui/a2ui-adapter build
   pnpm --filter @dsh-a2ui/a2ui-renderer build
   ```
2. 安装到 dsh web profile（两个包分别装，adapter 声明 `dsh.bundle.patch` 自动成为 profile layer）：
   ```bash
   dsh plugin --profile web add file:D:/git-depository/dsh-a2ui/packages/a2ui-adapter \
     file:D:/git-depository/dsh-a2ui/packages/a2ui-renderer
   ```
3. 验证插件树出现两行：
   ```bash
   dsh --profile web --dump-config | grep dsh-a2ui
   # - id: dsh-a2ui            name: '@dsh-a2ui/a2ui-adapter'
   # - id: dsh-a2ui-renderer   name: '@dsh-a2ui/a2ui-renderer'
   ```
4. 重启 `dsh web`，浏览器加载 renderer bundle（`/plugins/@dsh-a2ui/a2ui-renderer/client.js` 返回 200 即链路通）。

## 教学段（模型输出纪律）

adapter 经 `ctx.systemPrompt.section({ name: 'a2ui', order: 130 })` 注入教学段：模型在结构化表达优于纯文本时（统计→stat/table、趋势→chart、要点→card/grid/callout、需用户输入→交互组件）**调用 `a2ui_render` 工具**（参数 = A2UI v0.9.1 消息数组，createSurface 为首，`catalogId: "dsh-basic"`，根组件 id `root`）；工具将 document 写入 `tool/result.meta`，UI **原位内嵌**在工具调用处（无原始 JSON 文本泄露）。交互回传消息形如 `<ui_action surface=.. component=.. name=..>payload</ui_action>`，agent 收到后以新 surface **整值重绘**（surfaceId 保持一致）。

## MVP 范围外（未来需要时再加）

- 自定义 session event（`a2ui/message`）
- 自定义 RPC / Remote namespace
- 组件级增量 patch（`updateComponents` / `updateDataModel` / `deleteSurface` 消息类型已定义，Renderer 当前忽略）
- 独立 state store（dataModel 生命周期，见 `docs/STATUS.md` P1-1）
- 独立 action protocol / A2UI middleware / server-side renderer

## 验证状态

- ✅ 三包 typecheck / vitest（37 tests）/ oxlint 全绿
- ✅ dsh web 集成链路：`ClientModuleRegistry` 扫描到 renderer、bundle 正常下发
- ✅ 真实 E2E 部分通过：UI 渲染（含主题样式）、form 提交 → `<ui_action>` 回传 → 模型响应、工具 reject 错误可见
- 🔴 已知问题：模型重画时 chart 数据可能丢失（"无数据"，见 `docs/STATUS.md` P1-1）

> **给后续开发者**：完整的已实现功能、已知问题、环境坑与排查指南见 **[docs/STATUS.md](docs/STATUS.md)**。
