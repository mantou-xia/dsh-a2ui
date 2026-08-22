# dsh-a2ui 开发状态（功能清单 · 已知问题 · 排查指南）

> 面向后续开发者。所有条目均基于 2026-08-22 的实际构建与验证（dsh 本地 rc.5 宿主 + npm registry 编译）。
> 状态标记：✅ 已验证（单测/集成链路/真实环境）· ⚠️ 部分验证（真实 E2E 依赖模型 API）· 🔴 已知问题

---

## 1. 已实现功能

### 1.1 三包结构（pnpm monorepo）

| 包 | 职责 | 状态 |
|---|---|---|
| `packages/a2ui-protocol` | 协议层（官方 v0.9.1 envelope 严格类型）、catalog（dsh-basic：静态 6 + 交互 4）、guard（安全边界）、shortcode（兜底解析） | ✅ 零依赖，37 测试覆盖 |
| `packages/a2ui-adapter` | Cordis 插件：注册 `a2ui_render` 工具（host 侧）+ 注入 A2UI 教学段 + bundle patch 装配 | ✅ 单测 + 真实加载 |
| `packages/a2ui-renderer` | dsh.client 双半部：`ConversationNodeDefinition<'a2ui'>` + keyed renderer + 组件 + action 回传 | ✅ 单测 + 集成链路 |

### 1.2 数据链路（工具通道，仿 dsh-valuz-genui）

```
模型 → 调用 a2ui_render 工具（参数 = A2UI v0.9.1 消息数组）
     → execute 用 guard 修复 → 写 tool/result.meta { kind:'a2ui-surface', document: JSONL }
     → client 端 Definition 监听 tool-call-delta（流式锚点）+ tool/result（落定）
     → UI 节点 anchorSeq = 工具调用事件 seq → 原位内嵌在对话中
     → 用户交互 → <ui_action> → conversation.send → agent 下一轮 → 重画
```

- ✅ 模型输出不产生可见 JSON 文本（AssistantMarkdown 不渲染 tool-call-delta）
- ✅ 位置：UI 锚定工具调用点，**不再是** assistant 消息末尾
- ✅ 回放：`tool/result.meta` 持久化，历史会话重开可恢复
- ✅ action 回传：`<ui_action surface component name>payload</ui_action>` + `ctx.sessions.scope(sessionId).get('conversation').send()`

### 1.3 组件（dsh-basic catalog）

- ✅ 静态：`stat` / `table` / `chart`(bars|line|donut SVG) / `card` / `grid`(children) / `callout`
- ✅ 交互：`button`(点击→action) / `form`(提交收集 input/select → context.values) / `input` / `select`
- ✅ 主题跟随：CSS 用 dsh `--dsw-alias-*` 语义变量（`body[data-ds-dark-theme]` 自动切换）+ 注入 `colorScheme`
- ✅ 组件渲染/交互逻辑有 jsdom 单测（A2uiNodeView.test.tsx，6 用例）

### 1.4 构建与集成

- ✅ 三包 `pnpm check`（lint 0 / typecheck / 37 tests）全绿
- ✅ `tsdown` 双半部构建：host `lib/index.js`（ESM）+ client `lib/client.js`（`__ModuleLoader__.load` CJS 协议，dsh platform externals）
- ✅ dsh web 集成链路：`--dump-config` 出现两行 → manifest 含 renderer → `/plugins/@dsh-a2ui/a2ui-renderer/client.js` 200
- ✅ dsh 包依赖用 **npm registry 版本**（peerDependencies 声明，devDeps 具体版本编译），绕开 link/file 坑

---

## 2. 已知问题（按影响排序）

### 🔴 P1-1 chart 数据丢失（"无数据"）— 未解决
- **现象**：用户通过 form 提交新数据点（`add_point`），模型文字声称"已加入环形图"，但重画后 chart 显示"无数据"。
- **根因**：`a2ui_render` 是**整值替换**——工具只 validate + persist envelope，**不校验/补齐数据语义**。模型收到 `<ui_action>` 后重画时**没把新增数据点写回 chart 的 `series` 字段**（模型行为/幻觉，非插件 bug）。
- **已尝试**：教学段加"重绘 = 整值替换 = 必须传完整 series"条款（加强 2 次）——仍复现。
- **待办方向**（未实现）：
  - host 侧状态存储：adapter 维护 surface 数据模型，`a2ui_render` 重画时**服务端合并数据**（form 提交的值进 dataModel 后自动填回 series）——超出当前范围
  - 或教学段更激进 + 少组件化重绘
  - 或接受模型行为，UI 侧对空 series 给更明确提示

### 🔴 P1-2 模型不严格遵守 messages 结构 — 部分缓解
- **现象**：模型重画时 messages[0] 缺 `version` / `components` / root，或夹 markdown 残片（`[button-id]`），导致 `a2ui_render` reject。
- **缓解**：tool.ts `validateCreateSurfaceMessage` 逐字段详细诊断（model-visible 错误），模型按错误自修；教学段明确"messages 数组只放完整 envelope，无残片"。
- **状态**：缓解后错误率下降，但**不能保证模型完全遵守**（依赖模型能力）。

### 🟡 P2-1 真实环境 E2E 未全跑通
- ✅ 已验证：UI 渲染（含样式）、form 提交 → `<ui_action>` → 模型响应、工具 reject 错误可见
- ⚠️ 未验证：button 点击 → 模型重画**数据正确**（P1-1 拦截）；多 surface；长时间会话回放一致性

### 🟡 P2-2 流式渲染未实现（对比 valuz）
- 现状：`tool/result` 落定后才渲染 UI（buildViewNode 只在 settled 时返回）。
- valuz 有 tool-call-delta **流式累积**（模型还在写参数时 UI 就逐步出现）。我们 MVP 未做流式 UI（仅定义 state 的 argsRaw 累积，未用于渲染）。
- 位置锚定（anchorSeq = 工具调用 seq）已实现。

### 🟡 P2-3 dsh API 版本敏感（破坏性变更风险）
- 本地宿主 dsh **0.1.0-rc.5**；编译用 registry **0.1.1-rc.2 / cordis 4.0.1**。peer 声明 `>=0.1.0-rc.5` 依赖向后兼容。
- dsh 处于 developer preview，`ConversationNodeDefinition` / `tool/result.meta` / `sessions.scope` 等 API 可能变动。**升级 dsh 后必须重验加载链路**。

### 🟡 P2-4 组件级增量 / dataModel 生命周期未实现（设计如此）
- 协议类型已定义 `updateComponents` / `updateDataModel` / `deleteSurface`，**Renderer 收到即忽略**（MVP 范围外，见 README）。
- surface 为整值 checkpoint：新消息 `Map.set(surfaceId, snapshot)` 整体替换。

### 🟡 P2-5 主题切换的实时跟随
- CSS 变量方式**自动跟随**（--dsw-alias-* 定义在 body[data-ds-dark-theme] 下）。注入的 `colorScheme` 目前只传入组件未实际使用（CSS 已够）。若未来需要 JS 内图表主题，用 `colorScheme` + 订阅 theme 变化。

---

## 3. 环境与集成坑（必读）

| 坑 | 说明 | 规避 |
|---|---|---|
| **profile 缓存旧 bundle** | `dsh plugin add file:<pkg>` 装包时复制 `lib/`；rebuild 后**不重新 add**，web 下发的还是旧 bundle（症状：改代码没效果） | 每次 rebuild 后 `dsh plugin --profile web remove + add` 强刷 |
| **EADDRINUSE 残留进程** | 杀 3080 需要多轮：`netstat -ano \| grep :3080` 拿 PID 逐个 `taskkill /PID x /F`，直到端口空；单轮 kill 常杀不干净 | 循环 kill 至 `netstat` 无 LISTEN |
| **pnpm shim 坏** | Windows Git Bash 下 nvm4w corepack shim 被 MSYS 路径转换破坏（`d:\c\nvm4w\...`） | 用 wrapper：managed node 22.22.2 直调 `node_modules/corepack/dist/pnpm.js` |
| **link:/file: 依赖坑** | 包内 `link:` 依赖按**安装点**（profile 目录）解析，路径全错；`file:` 引 dsh 仓库包会嵌套解析失败 | dsh 包一律用 **npm registry** 版本（peerDeps + devDeps） |
| **CSS 未注入** | `injectA2uiStyles()` 必须在 client `apply()` 调用（之前漏调 → 全默认样式） | 检查 `document.querySelector('style[data-plugin="@dsh-a2ui/a2ui-renderer"]')` 存在 |
| **Edit 大模板字符串** | Edit 替换可能吞模板字符串闭合反引号（PARSE_ERROR） | 大模板字符串用 Write 整体覆盖 |
| **模型行为不可控** | a2ui_render 只验结构不验语义；model 重画可能丢数据/夹残片 | 教学段 + 详细诊断错误；P1-1 的 host 状态存储是根治方向 |

---

## 4. 排查指南（快速 debug）

1. **UI 没渲染** → 看 chat 流里是否有 tool-call（a2ui_render）→ 看 `tool/result` 是否 error（assistant 消息里能看到模型侧错误）→ 看浏览器 console 有无 client 报错
2. **UI 无样式** → DevTools Elements 搜 `data-plugin="@dsh-a2ui/a2ui-renderer"` 的 `<style>` → 无则 `injectA2uiStyles` 未执行（检查 bundle 是否有 `createElement`，`grep createElement profile/.../lib/client.js`）
3. **改了代码没效果** → 确认 rebuild + `remove + add` 强刷 profile + 重启 web（强刷浏览器 Ctrl+Shift+R）
4. **模型报 a2ui_render 错误** → 错误信息逐字段（version/catalogId/components/root），按提示让模型修；或把完整 messages 贴给模型
5. **位置不对/原始 JSON 可见** → 说明走的是旧文本短代码路径（工具通道已无此问题），检查模型是否真的调了工具
6. **EADDRINUSE** → 多轮 kill 3080

---

## 5. 后续 Roadmap（按优先级）

1. **P1-1 根治**：host 侧 surface 状态存储（adapter 维护 dataModel，重画时服务端合并 form 提交值 → 自动填回 series）——真正解决"form 提交后数据丢失"
2. **流式渲染**：tool-call-delta 累积 → 模型写参数时 UI 逐步渲染（对齐 valuz 体验）
3. **组件级增量**：`updateComponents` / `updateDataModel` / `deleteSurface` 支持（协议类型已备）
4. **E2E 自动化**：vitest 集成 dsh web 的端到端（mock model 输出固定 envelope → 验证渲染）
5. **多 surface / 并发**：同一会话多 surface、surface 生命周期管理

---

*参考实现：https://github.com/valuz-ai/dsh-valuz-genui · https://github.com/omdsh-dev/dsh-genui*
