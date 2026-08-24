# dsh-a2ui 开发状态

> 更新时间：2026-08-24。P1、P2 已完成；本文件记录当前能力、验收证据、已知边界和后续扩展方向。

## 1. 当前能力矩阵

| 能力 | 实现状态 | 验证方式 |
|---|---|---|
| `a2ui_render` 工具通道 | 已完成 | adapter 集成测试 + DSH 真实工具调用 |
| 流式工具参数预览 | 已完成 | 未闭合 arguments 自动化测试；首个完整 envelope 可提前显示 |
| `tool/result.meta` 持久化与历史回放 | 已完成 | definition 回放测试 + 历史会话真实加载 |
| `createSurface` | 已完成 | 协议、adapter、renderer、真实浏览器 |
| `updateComponents` | 已完成 | 生命周期归约测试 + 真实浏览器显示“组件已更新” |
| `updateDataModel` | 已完成 | JSON Pointer 测试 + 真实输入框显示 `08` |
| `deleteSurface` | 已完成 | document 归约与 guard 测试 |
| 多 surface | 已完成 | 自动化完整链路 + 真实浏览器第二 surface |
| ECharts bars/line/donut | 已完成 | option 单测 + DSH 真实柱状图 |
| 浅色/深色主题 | 已完成 | ECharts option 单测 + DSH 主题实时切换 |
| button action | 已完成 | jsdom + 真实 `<ui_action ... refresh>` |
| form action 与字段值 | 已完成 | jsdom + 真实 `{"values":{"month":"08"}}` |
| DSH API 兼容检查 | 已完成 | adapter/client runtime capability 单测 + 真实插件加载 |
| 模型协议自纠正 | 已完成 | envelope 索引级错误诊断测试 + lifecycle teaching |
| chart 重绘防丢 | 已完成 | 同会话 durable 快照恢复与 `labels`/`series` 安全回填测试 |

## 2. P2 完成项

### P2-1 端到端验收

- 自动化：新增完整链路用例，覆盖流式 arguments、document 生命周期归约、React 渲染、ECharts 初始化、数据绑定、按钮和表单 action。
- 真实环境：DSH Web 新会话成功渲染双 surface；浏览器控制台为 0 error、0 warning。
- 交互证据：按钮回传 `{"force":true}`；表单回传 `{"values":{"month":"08"}}`，agent 能据此继续生成界面。

### P2-2 流式渲染

- 从尚未闭合的 `messages` 数组中提取已经完整结束的 JSON 对象。
- 预览始终先经过协议 guard，避免把半截或越权组件交给 renderer。
- 首个 envelope 完成后节点即可从 hidden 转为 visible；后续不完整 chunk 不会把已有预览清空。
- `tool/result.meta` 到达后使用完整 document 替换预览，历史回放走同一归约逻辑。

### P2-3 DSH 运行时兼容

- adapter 检查 `systemPrompt.section`、`tools.register` 等关键能力。
- client 检查会话节点注册、slot 注入、主题和 session action 所需能力。
- 缺失能力时快速失败并指出具体 API，避免插件静默半加载。

### P2-4 生命周期与 dataModel

- guard 接受并规范化完整 document，而非只处理第一条 `createSurface`。
- 生命周期引用必须有效：更新/删除只能指向已经存在的 surface。
- `updateComponents` 按组件 id 合并已声明字段；未知字段由 catalog 白名单移除。
- `updateDataModel` 使用合法 JSON Pointer 写入或删除值，字段通过 `value.path` 绑定并在新快照到达后同步。
- `deleteSurface` 从最终快照集合移除目标 surface。

### P2-5 ECharts 与主题

- 原自绘 SVG 图表已替换为 ECharts。
- 支持 bars、line、donut；窗口和容器变化时执行 resize，卸载时 dispose。
- option 根据 DSH `colorScheme` 生成前景色、网格线、tooltip、legend 和调色板；真实切换深色主题无控制台错误。

## 3. 最终验证结果

```text
pnpm check
  lint:       通过
  typecheck:  三包通过
  vitest:     13 files / 62 tests 通过

pnpm -r run build
  adapter:    通过
  renderer:   host/client bundle 通过

DSH Web smoke test
  HTTP:       127.0.0.1:3080 -> 200
  console:    0 errors / 0 warnings
  UI:         ECharts + 双 surface + updateComponents + dataModel=08
  actions:    button refresh + form query(month=08)
  theme:      浅色 -> 深色实时切换通过
```

## 4. 当前边界

1. 新的 `a2ui_render` 调用代表新的完整 document。若 action 后重绘仍需保留绑定值，模型必须在新调用中重复发送 `updateDataModel`；系统不会猜测任意业务 dataModel 的跨调用合并规则。
2. chart 仅对同 surface、同组件 id、同类型图表中遗漏的 `labels` / `series` 做安全回填；显式空值仍表示业务方确实要清空。
3. catalog 当前只开放十个组件，以保持 guard、样式和 action 语义可控。
4. ECharts 打入 client bundle，当前约 1.74 MB；首次加载成本仍有优化空间。
5. DSH API 尚可能发生破坏性变化；runtime guard 能把问题显性化，但不能替代升级后的真实回归。

## 5. 后续开发与优化方向

### 优先级 A：可靠性与发布工程

- 建立固定 DSH 版本矩阵，在 CI 中对当前支持版本执行 bundle 加载、历史回放 fixture 和浏览器 smoke test。
- 为 profile 安装增加可重复的备份、覆盖、哈希校验和回滚脚本，消除“工作区已构建但 profile 仍是旧 bundle”的环境差异。
- 增加 guard warning 明细与可观测指标，让被丢弃字段、组件和不合法生命周期在调试面板中可见。

### 优先级 B：性能

- 改为 ECharts core + 按需 chart/component 注册，减少 client bundle。
- 在 surface 很大时按 component subtree memo、虚拟化长表格，并限制高频流式预览刷新。
- 对多 surface 大 document 做增量归约缓存，避免每个 chunk 重放全部历史消息。

### 优先级 C：组件与业务能力

- 扩展日期/时间、开关、滑块、分页表格、tabs、modal、文件选择等常用组件。
- 给 table 增加排序、分页、空态和列格式化；给 chart 增加多轴、堆叠、数据缩放和可访问文本摘要。
- 设计受控的数据请求 action：通过 allowlist server handler 获取业务数据，而不是让前端组件任意访问网络。
- 若业务需要跨工具调用保持复杂状态，再引入显式 surface state/dataModel store，并定义冲突、清空和回放规则。

### 优先级 D：协议演进

- 跟踪 A2UI 官方后续版本，保留 v0.9.1 兼容层并提供 document migration。
- 评估接入官方 catalog/renderer 的可行性，保持 `dsh-basic` 作为 DSH 语义组件层，而不是把宿主样式耦合进协议层。

## 6. 快速排查

1. UI 不显示：确认工具调用名是 `a2ui_render`，再检查 `tool/result.meta.kind === "a2ui-surface"`。
2. 流式阶段不显示：确认首个 `createSurface` envelope 已完整闭合且包含 `version`、`surfaceId`、`root`。
3. 字段没有数据：使用 `value: { "path": "/..." }`，并确保同一 document 中有对应 `updateDataModel`；`valuePath` 无效。
4. 修改未生效：重新 build、覆盖或重新安装 profile bundle、核对 SHA-256，然后重启 DSH Web。
5. 图表异常：先看 guard 是否保留 `labels` / `series`，再看浏览器控制台与 ECharts 容器尺寸。
6. 宿主升级后失败：读取 runtime capability 错误中的缺失 API，再针对该 DSH 版本适配并重跑全部检查。
