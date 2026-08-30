# a2ui-catalog-example

`@dsh-plugin-edu/a2ui-catalog-example` 是可热插拔 A2UI 组件库的最小完整实现。

它声明 `dsh-example` catalog，并提供一个 `notice` 组件：

```json
{
  "version": "v0.9.1",
  "createSurface": {
    "surfaceId": "notice-1",
    "catalogId": "dsh-example",
    "components": [
      {"id": "root", "component": "notice", "title": "已就绪", "body": "组件库已加载", "tone": "success"}
    ]
  }
}
```

## 结构

- `src/catalog.ts` 是唯一的 catalog 定义和模型教学来源。
- `src/index.ts` 是宿主半部，调用 `registerA2uiCatalog()`，让 guard 与模型教学随插件加载和卸载。
- `src/client.tsx` 是浏览器半部，使用 `ctx.a2uiRenderer.register()` 注册 React renderer；返回的 disposer 由 `ctx.effect()` 管理。
- `cordis.patch.yml` 将宿主半部作为独立 DSH bundle 加入 profile；`package.json#dsh.client` 同时使浏览器半部进入 web 客户端入口图；`package.json#a2ui` 声明 catalog、组件名以及已构建的双端入口，供设置页的本机目录导入校验。

## 新建组件库

复制本包并替换 package 名、`catalogId` 与组件名。一个可安装的库必须同时满足：

1. catalog 为每个组件声明允许属性、属性类型和限额。
2. 宿主半部的 `inject` 包含 `a2uiCatalogs` 与 `systemPrompt`，并通过 `registerA2uiCatalog()` 注册 catalog 和教学。
3. 浏览器半部的 `inject` 包含 `a2uiRenderer`，并为 catalog 的每个组件使用 `ctx.effect()` 注册 renderer。
4. 包必须通过 `dsh.bundle.patch` 提供一条宿主插件行，并声明 `dsh.client`，使两端随同一 profile bundle 加载。
5. catalogId/component 组合不能和已装库重复；重复是加载错误，不存在覆盖顺序。
6. 卸载测试必须断言 guard 拒绝该 catalog，且浏览器 registry 不再解析该 renderer。
7. 若要通过 A2UI 设置页导入，`package.json#a2ui` 必须声明非空 catalog id、无重复的组件列表，以及存在的 `./lib/index.js` 和 `./lib/client.js` 入口。

模型作者只能使用当前已安装组件库的 catalog。未安装库的 `catalogId` 在 `a2ui_render` 执行时会得到可纠正的错误提示。
