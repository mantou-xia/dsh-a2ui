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
- 组件库注册表：宿主侧按 catalogId 校验，浏览器侧按 catalogId/component 分派 React renderer；两个注册都由 Cordis effect 管理，插件卸载后自动失效。
- 设置页：独立 A2UI 设置分区支持 `studio`、`soft`、`contrast` 三套画布皮肤，能够导出组件库要求模板，并从本机目录导入受信任组件库。



## 架构

```text
模型调用 a2ui_render
  -> adapter 的 a2uiCatalogs 校验/修复完整 A2UI document
  -> tool/result.meta 持久化 JSONL document
  -> renderer 从 tool-call-delta 生成流式预览
  -> tool/result 到达后归约完整生命周期
  -> a2uiRenderer 查找 catalogId/component 的 React renderer
  -> button/form 产生 ui_action，交给 agent 下一轮处理
```



## 包结构


| 包                                | 职责                                                                  |
| -------------------------------- | ------------------------------------------------------------------- |
| `@dsh-plugin-edu/a2ui-protocol`        | A2UI v0.9.1 类型、`dsh-basic` catalog、guard、document 生命周期归约            |
| `@dsh-plugin-edu/a2ui-adapter`         | 注册 `a2ui_render`、宿主 catalog registry、模型教学、运行时兼容检查、profile bundle 装配 |
| `@dsh-plugin-edu/a2ui-renderer`        | DSH client 节点定义、流式/回放解析、浏览器组件 registry、ECharts 与 action 回传          |
| `@dsh-plugin-edu/a2ui-catalog-example` | 独立 `dsh-example` catalog，演示第三方组件库的双端接入与卸载                           |




## dsh-basic 组件


| 类型    | 组件                                                                   |
| ----- | -------------------------------------------------------------------- |
| 展示与布局 | `stat`、`table`、`chart`、`card`、`grid`、`callout`、`tabs`、`modal`        |
| 交互    | `button`、`form`、`input`、`select`、`datetime`、`switch`、`slider`、`file` |


图表类型：`bars`、`line`、`donut`。

## 开发组件库

一个组件库必须有宿主和浏览器两个 Cordis 插件半部，它们使用同一个 `catalogId`。

1. 宿主半部通过 `registerA2uiCatalog(ctx, { catalog, teaching })` 注册属性白名单、限额和模型教学；不要绕过该 helper 直接保留注册，因为它负责把 catalog 与教学段一起放进插件 effect 生命周期。
2. 浏览器半部以 `ctx.effect(() => ctx.a2uiRenderer.register(catalogId, component, Renderer), label)` 注册每个 React 组件；`Renderer` 只接收已通过 guard 的 component、children、颜色模式与 action 回调。
3. 每个 catalog component 都必须在两侧成对存在。宿主缺失则工具拒绝 document；浏览器缺失则该组件不渲染，避免猜测未知 UI 语义。
4. `catalogId` 和同 catalog 内的 component 名在一个 composition 中唯一；重复注册会在加载时失败。注册返回的 disposer 只移除自身的贡献，热卸载不会误删新 owner。
5. catalog 必须声明每个模型可写属性、字段类型和资源限额；组件库不得让 renderer 绕过 guard 自行接受任意属性或直接访问网络。
6. 为支持设置页导入，`package.json` 还必须声明 `a2ui` 元数据，并且 `host` / `client` 指向已经构建的两个入口：

```json
{
  "a2ui": {
    "catalog": { "id": "your-catalog", "components": ["your-component"] },
    "host": "./lib/index.js",
    "client": "./lib/client.js"
  }
}
```

可复制的最小实现见 [a2ui-catalog-example](packages/a2ui-catalog-example/README.md)。安装它会额外提供 `dsh-example/notice`：

```bash
dsh plugin --profile web add file:D:/git-depository/dsh-a2ui/packages/a2ui-adapter \
  file:D:/git-depository/dsh-a2ui/packages/a2ui-renderer \
  file:D:/git-depository/dsh-a2ui/packages/a2ui-catalog-example
```



## 开发与验证

```bash
pnpm install
pnpm check
pnpm -r run build
```

`pnpm check` 会依次执行 lint、全部工作区 TypeScript 检查与 Vitest，覆盖协议、catalog 注册与卸载、adapter、流式解析、生命周期、数据模型、Guard 告警、ECharts 主题和完整 UI/action 链路。

GitHub Actions 会固定执行 Node 22 质量门禁，并在 DSH `0.1.0-rc.5`、`0.1.1-rc.2` 两个支持版本上重新安装后执行 typecheck、测试和 bundle 构建。兼容矩阵脚本只供 CI 使用：`node scripts/select-dsh-version.mjs <version>`。

## 安装到 DSH profile

```bash
dsh plugin --profile web add file:D:/git-depository/dsh-a2ui/packages/a2ui-adapter \
  file:D:/git-depository/dsh-a2ui/packages/a2ui-renderer \
  file:D:/git-depository/dsh-a2ui/packages/a2ui-catalog-example
dsh --profile web
```

安装后应能访问 `/plugins/@dsh-plugin-edu/a2ui-renderer/client.js`，并在插件配置中看到 adapter 与示例 catalog bundle。

## npm 预发布安装

`0.1.0-beta.1` 起，对外发布 `protocol`、`adapter` 和 `renderer` 三个运行包；`a2ui-catalog-example` 仍是仓库内可复制的私有模板。使用 npm 预发布版本时，在 DSH Web profile 中同时安装 adapter 与 renderer：

```bash
dsh plugin --profile web add @dsh-plugin-edu/a2ui-adapter@beta @dsh-plugin-edu/a2ui-renderer@beta
dsh --profile web
```

发布操作与 tarball 验收步骤见 [docs/PUBLISHING.md](docs/PUBLISHING.md)。

日常源码更新后使用部署脚本，不再手工复制 bundle。它会先构建、备份 profile 中的六个 bundle 文件、覆盖、逐文件验证 SHA-256；失败时不会把“未验证的覆盖”当作成功。

```powershell
# 构建、备份、覆盖并验证默认 web profile
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\scripts\Install-DshProfileBundle.ps1

# 仅核对 profile 是否与当前工作区构建一致
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\scripts\Install-DshProfileBundle.ps1 -Action Verify

# 从输出的 Backup 名称恢复
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\scripts\Install-DshProfileBundle.ps1 -Action Rollback -BackupName dsh-a2ui-web-YYYYMMDD-HHMMSS
```

脚本的备份位于 `%USERPROFILE%\.dsh\backups`。覆盖或回滚后都需要重启 `dsh web`。

## A2UI 设置页与本机组件库导入

打开 DSH Web 设置中的 **A2UI** 分区即可切换画布皮肤。皮肤仅影响 A2UI 画布，并保存在当前浏览器的 `localStorage` 中，不会修改 profile 文件。

“导出组件库要求模板”会下载带有 `dsh` 与 `a2ui` 元数据骨架的 JSON 模板。“导入本机组件库”使用浏览器原生目录选择器：选择包含已构建 `lib/` 的组件库目录后，宿主会校验 package 名、宿主/浏览器加载声明、catalog id、组件列表和两个入口文件，再对当前 profile 执行 `pnpm add file:<目录>` 并将 bundle 写入 profile 清单。导入成功后重启 `dsh web` 生效。

导入目录中的插件代码会在本机 DSH 进程和浏览器客户端执行，因此只导入你信任、并已经审阅过的组件库。默认 adapter patch 配置的目标 profile 是 `web`；若使用其他 profile，需要将 adapter 的 `profileName` 配置改为对应名称。

## Authoring 关键约束

- `messages[0]` 必须是包含 `id: "root"` 的 `createSurface`。
- 每一条 lifecycle envelope 都必须重复声明 `version: "v0.9.1"`。
- 数据绑定使用 `value: { "path": "/filters/month" }`，不存在 `valuePath` 字段。
- 新工具调用是一个新的完整 document。若重绘后仍需保留绑定值，必须在该次调用中重新发送对应的 `updateDataModel`。
- adapter 会在模型遗漏已有图表的 `labels` / `series` 时从同会话 durable 状态回填，但这只是防丢保护，不代替模型发送完整业务状态。

## 画布布局规则

每个 surface 都在 renderer 的 `a2ui-canvas` 中渲染。画布负责统一宽度、内边距、间距、响应式断点与面板视觉；组件库只定义组件的业务内容和交互，不应自行假定外层页面尺寸。

- `grid.columns` 决定桌面端列数（1–6）；画布在宽度不超过 720px 时统一回退为单列。
- `stat`、`callout`、`button` 和一般第三方组件各占一个 grid 单元。
- `chart`、`table`、`form`、`card`、`tabs` 在 2–6 列 grid 中跨两个单元，给高信息密度内容保留可读宽度；单列 grid 不跨列。
- 所有组件节点都会带 `data-a2ui-component` 类型标记。新组件库若需要专属排版，只能基于该标记在自己的浏览器 half 中补充样式，不能绕过 `a2ui-canvas`。



## 当前边界与后续方向

- `dsh-basic` 是内置组件库，不再是唯一可用 catalog；复杂布局、分页和业务专用组件可作为独立组件库接入，仍须遵守双端注册规范。
- 新工具调用之间不自动合并任意 dataModel；只有单次 document 内的生命周期是权威且完整的。
- ECharts 仅注册 bars、line、donut 所需的 chart/component/renderer 模块，client bundle 已由约 1.74 MB 降至约 1.32 MB。
- 流式 preview 会缓存已通过 guard 的完整 envelope，只对新增 lifecycle 消息做增量归约，避免大 document 在每个 chunk 重放历史消息。
- DSH 仍处于快速演进阶段，升级宿主后应运行兼容检查、回放 fixtures 与真实浏览器 smoke test。

完整验收记录、能力矩阵和开发建议见 [docs/STATUS.md](docs/STATUS.md)。
