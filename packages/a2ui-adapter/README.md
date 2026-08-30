# @dsh-plugin-edu/a2ui-adapter

Host-side DeepSeek Harness plugin for A2UI. It registers `a2ui_render`, validates documents against installed catalogs, contributes model guidance, and exposes the local component-library import endpoint when its `profileName` configuration is set.

Install it together with `@dsh-plugin-edu/a2ui-renderer` in a DSH Web profile:

```bash
dsh plugin --profile web add @dsh-plugin-edu/a2ui-adapter@beta @dsh-plugin-edu/a2ui-renderer@beta
```

The included bundle patch configures `profileName: web`. For another profile, copy the patch into your own bundle and set `profileName` to that profile name before starting DSH.

Requires Node.js 22 or later and DSH `0.1.0-rc.5` or newer.
