/**
 * a2ui-renderer —— node 半部（占位）。
 *
 * 本包是 dsh.client 双半部包：node 半部保持空 apply（仅占 loader 行，
 * 让 ClientModuleRegistry 扫到 `dsh.client.platform === 'web'` 并下发
 * `/plugins/@dsh-a2ui/a2ui-renderer/client.js`）；前端逻辑全部在
 * `src/client/`（P2 实现）。范例：@deepseek-ai/dsh-client-ui-user-questions。
 */

/** Host plugin body — 前端注册在 client 半部，这里无宿主逻辑。 */
export function apply(): void {}
