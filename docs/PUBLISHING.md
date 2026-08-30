# 发布 A2UI 预发布版

发布单元是 `@dsh-plugin-edu/a2ui-protocol`、`@dsh-plugin-edu/a2ui-adapter` 与 `@dsh-plugin-edu/a2ui-renderer`。`a2ui-catalog-example` 保持私有，仅作为自定义组件库模板。

发布前先执行：

```bash
pnpm install
pnpm run release:check
```

然后用每个 tarball 在全新 DSH profile 中安装，确认 adapter bundle、renderer client bundle 和 A2UI 设置页均被加载。发布命令必须显式使用 beta tag：

```bash
pnpm --filter @dsh-plugin-edu/a2ui-protocol publish --tag beta --access public --registry https://registry.npmjs.org
pnpm --filter @dsh-plugin-edu/a2ui-renderer publish --tag beta --access public --registry https://registry.npmjs.org
pnpm --filter @dsh-plugin-edu/a2ui-adapter publish --tag beta --access public --registry https://registry.npmjs.org
```

真实发布前，仓库维护者必须补充已确认的 `repository` 元数据，并确认 npm 账号拥有 `@dsh-a2ui` scope 的公开发布权限。许可证固定为 Apache-2.0。不要把未验证的本机 `file:` 目录当作 registry 发布验收。
