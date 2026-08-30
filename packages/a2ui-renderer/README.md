# @dsh-a2ui/a2ui-renderer

Web client half of the DeepSeek Harness A2UI plugin. It renders streamed and replayed A2UI surfaces, provides the A2UI settings page, canvas skins, and the browser component registry used by custom component libraries.

Install it together with the host adapter:

```bash
dsh plugin --profile web add @dsh-a2ui/a2ui-adapter@beta @dsh-a2ui/a2ui-renderer@beta
```

Custom browser component libraries can import renderer types from `@dsh-a2ui/a2ui-renderer/client`.

Requires Node.js 22 or later and DSH `0.1.0-rc.5` or newer.
