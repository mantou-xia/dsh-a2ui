# dsh-a2ui

为 DeepSeek Harness（DSH）提供 A2UI v0.9.1 交互界面能力。模型通过 `a2ui_render` 工具输出结构化 document，DSH Web 在工具调用位置流式渲染 React UI；图表由 ECharts 绘制，用户操作通过 `<ui_action>` 回传 agent。整个接入不修改 DSH 内核。

## 当前能力

- 工具通道：原始 JSON 不进入 assistant 正文，UI 原位内嵌，并通过 `tool/result.meta` 持久化、回放。
- 流式首屏：`tool-call-delta` 尚未闭合时即可解析已完成的 envelope，先显示可用界面；工具结果落定后切换到权威 document。
- 完整生命周期：支持 `createSurface`、`updateComponents`、`updateDataModel`、`deleteSurface`，以及单次 document 中的多 surface。
- 数据模型绑定：`input` / `select` 使用 `value: { "path": "/..." }` 读取 `updateDataModel`，快照更新后实时同步字段值。
- ECharts：支持 `bars`、`line`、`donut`，响应容器尺寸变化并跟随 DSH 浅色/深色主题。
- 交互组件：按钮 action、表单字段收集及 `<ui_action surface component name>payload</ui_action>` 回传。
- 安全边界：协议 guard、catalog 字段白名单、组件数量上限、JSON Pointer 校验、生命周期引用校验和模型可见的精确错误诊断。
- 运行时兼容保护：adapter 与 client 启动时检查关键 DSH API，版本不兼容时快速失败并给出明确错误。
- guard 可观测性：工具详情中的 `meta.diagnostics` 和 `meta.guardStats` 会记录被过滤字段/组件与生命周期拒绝原因，不包含原始业务值。

## 架构

```text
模型调用 a2ui_render
  -> adapter 校验/修复完整 A2UI document
  -> tool/result.meta 持久化 JSONL document
  -> renderer 从 tool-call-delta 生成流式预览
  -> tool/result 到达后归约完整生命周期
  -> React 组件树 + ECharts 渲染
  -> button/form 产生 ui_action，交给 agent 下一轮处理
```

## 包结构

| 包 | 职责 |
|---|---|
| `@dsh-a2ui/a2ui-protocol` | A2UI v0.9.1 类型、`dsh-basic` catalog、guard、document 生命周期归约 |
| `@dsh-a2ui/a2ui-adapter` | 注册 `a2ui_render`、注入模型教学、运行时兼容检查、profile bundle 装配 |
| `@dsh-a2ui/a2ui-renderer` | DSH client 节点定义、流式/回放解析、React 组件、ECharts 与 action 回传 |

## dsh-basic 组件

| 类型 | 组件 |
|---|---|
| 展示 | `stat`、`table`、`chart`、`card`、`grid`、`callout` |
| 交互 | `button`、`form`、`input`、`select` |

图表类型：`bars`、`line`、`donut`。

## 开发与验证

```bash
pnpm install
pnpm check
pnpm -r run build
```

`pnpm check` 会依次执行 lint、三包 TypeScript 检查与 Vitest。当前共有 13 个测试文件、65 个测试，覆盖协议、adapter、流式解析、生命周期、数据模型、Guard 告警、ECharts 主题和完整 UI/action 链路。

GitHub Actions 会固定执行 Node 22 质量门禁，并在 DSH `0.1.0-rc.5`、`0.1.1-rc.2` 两个支持版本上重新安装后执行 typecheck、测试和 bundle 构建。兼容矩阵脚本只供 CI 使用：`node scripts/select-dsh-version.mjs <version>`。

## 安装到 DSH profile

```bash
dsh plugin --profile web add file:D:/git-depository/dsh-a2ui/packages/a2ui-adapter \
  file:D:/git-depository/dsh-a2ui/packages/a2ui-renderer
dsh --profile web
```

安装后应能访问 `/plugins/@dsh-a2ui/a2ui-renderer/client.js`，并在插件配置中看到 adapter 与 renderer。

日常源码更新后使用部署脚本，不再手工复制 bundle。它会先构建、备份 profile 中的四个 bundle 文件、覆盖、逐文件验证 SHA-256；失败时不会把“未验证的覆盖”当作成功。

```powershell
# 构建、备份、覆盖并验证默认 web profile
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\scripts\Install-DshProfileBundle.ps1

# 仅核对 profile 是否与当前工作区构建一致
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\scripts\Install-DshProfileBundle.ps1 -Action Verify

# 从输出的 Backup 名称恢复
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\scripts\Install-DshProfileBundle.ps1 -Action Rollback -BackupName dsh-a2ui-web-YYYYMMDD-HHMMSS
```

脚本的备份位于 `%USERPROFILE%\.dsh\backups`。覆盖或回滚后都需要重启 `dsh web`。

## Authoring 关键约束

- `messages[0]` 必须是包含 `id: "root"` 的 `createSurface`。
- 每一条 lifecycle envelope 都必须重复声明 `version: "v0.9.1"`。
- 数据绑定使用 `value: { "path": "/filters/month" }`，不存在 `valuePath` 字段。
- 新工具调用是一个新的完整 document。若重绘后仍需保留绑定值，必须在该次调用中重新发送对应的 `updateDataModel`。
- adapter 会在模型遗漏已有图表的 `labels` / `series` 时从同会话 durable 状态回填，但这只是防丢保护，不代替模型发送完整业务状态。

## 当前边界与后续方向

- 当前 catalog 是有意收敛的十组件集合；复杂布局、弹窗、分页、日期选择、文件上传等尚未提供。
- 新工具调用之间不自动合并任意 dataModel；只有单次 document 内的生命周期是权威且完整的。
- ECharts 仅注册 bars、line、donut 所需的 chart/component/renderer 模块，client bundle 已由约 1.74 MB 降至约 1.32 MB。
- 流式 preview 会缓存已通过 guard 的完整 envelope，只对新增 lifecycle 消息做增量归约，避免大 document 在每个 chunk 重放历史消息。
- DSH 仍处于快速演进阶段，升级宿主后应运行兼容检查、回放 fixtures 与真实浏览器 smoke test。

完整验收记录、能力矩阵和开发建议见 [docs/STATUS.md](docs/STATUS.md)。
