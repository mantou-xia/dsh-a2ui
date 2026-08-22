/**
 * a2ui-adapter teaching —— 教学段文本（注入系统提示词）。
 *
 * 教模型通过 `a2ui_render` 工具输出 A2UI 表面：工具调用在 assistant 流中
 * 是一块 tool-call-delta，UI 节点锚定在工具调用位置 → **原位内嵌**，
 * 且不会产生任何可见的原始 JSON 文本（AssistantMarkdown 只渲染文本块）。
 */

export const A2UI_TEACHING = `## A2UI 结构化输出（通过 a2ui_render 工具）

当你需要以结构化 UI（卡片/表格/图表/可点击按钮/可填表单）替代纯文本响应时，**调用 \`a2ui_render\` 工具**，把 A2UI 消息对象数组作为 \`messages\` 参数传入。UI 会原位内嵌渲染在对话中（工具调用处），这是唯一受支持的方式——**不要在回复文本中重复输出或粘贴 A2UI JSON**。

调用时，\`messages\` 的第一个元素必须是 createSurface（a2ui v0.9.1 envelope）：

\`\`\`json
{
  "version": "v0.9.1",
  "createSurface": {
    "surfaceId": "report-1",
    "catalogId": "dsh-basic",
    "components": [
      {"id": "root", "component": "grid", "columns": 2, "children": ["stat-1", "table-1"]},
      {"id": "stat-1", "component": "stat", "label": "总销售额", "value": "128 万", "unit": "元"},
      {"id": "table-1", "component": "table", "title": "月度明细", "columns": ["月", "销售额"], "rows": [["1月", "30 万"]]}
    ]
  }
}
\`\`\`

组件清单（catalogId = "dsh-basic"）：
- 静态：stat / table / chart（kind: bars | line | donut）/ card / grid（children 引用子组件）/ callout
- 交互：button（label + action: { name, payload? }）/ form（submitAction + children 引用 input/select）/ input（label、placeholder、type: text|number）/ select（label + options）

触发条件（结构化优于纯文本时使用）：
- 统计数字对比 → stat / table
- 趋势或占比 → chart
- 要点归纳 → card / grid / callout
- 需要用户输入、选择或点击操作 → 交互组件

规则：
1. 根组件 id 必须为 "root"，children 是子组件 id 引用列表
2. 数据必须真实，不要编造；只放关键摘要，全量明细仍用 markdown
3. 一次 3–8 个组件、一个主组件；table ≤ 10 行、chart ≤ 12 个点（guard 硬上限兜底）
4. stat 的 value ≤ 200 字符；card/callout 的 body ≤ 2000 字符
5. 交互组件：
   - button.action = { "name": "动作名", "payload": {...} }；用户点击会以 ui_action 消息回传
   - form.submitAction = { "name": "提交动作名" }；form 的 children 引用 input/select，提交时字段值自动收集进 context
   - input.type 用 "text" 或 "number"
6. 用户回传的消息形如 <ui_action surface="..." component="..." name="...">payload</ui_action>，收到后按用户意图处理，再调用 \`a2ui_render\` 工具整体重绘该 surface（surfaceId 用工具返回的 id 保持一致）

**重绘 = 整值替换 surface（不是增量 patch）**：每次调用 \`a2ui_render\` 都必须把**当前完整状态**写回 \`components\`，不能只写"变了的部分"——chart 的 \`series\`、form 的 \`children\`、grid 的子项等都要完整列出。如果用户在 form 里提交新数据点，**重绘时 chart 的 series 必须包含所有旧数据点 + 新增的点**（否则图表会显示"无数据"）；保留 form 也要把 input/select 作为 children 列回。简单规则：\`a2ui_render\` 调一次 = 一次完整的"画面截图"。

**每次调用 \`a2ui_render\` 前请自检 \`messages[0]\` 形状**（调用被工具拒绝时会得到具体错误信息，按错误修）：
- 必须是单个 JSON 对象，**第一行就是 \`{"version":"v0.9.1","createSurface":{...}}\`**，**没有 \`messages\` 包裹层、没有 markdown 残片、没有 \`[component-id]\` 链接引用**——你之前在 user message 里用 \`[button-id]\` markdown 引用只是你自己的笔记方式，**不要把它塞进 messages 数组
- \`createSurface.surfaceId\` 用稳定 id（如 "report-1"），重绘时保持一致
- \`createSurface.catalogId\` 必须是 \`"dsh-basic"\` 或省略
- \`createSurface.components\` 是数组，**必须含 id="root" 组件**作为入口
- 整次调用**只输出一个 envelope**（surface 整值替换）

调用工具后可以用简短文字说明（如"已生成图表"），但**不要**再输出 A2UI JSON 内容。`;
