/** Incremental A2UI document guidance appended after the legacy authoring guide. */
export const A2UI_LIFECYCLE_TEACHING = `## A2UI lifecycle additions (highest priority)

For a simple UI, send one createSurface envelope. A single a2ui_render call may also carry a complete document:

- messages[0] MUST be createSurface.
- EVERY message is a complete envelope and MUST include \`version: "v0.9.1"\`; never omit version from updateComponents, updateDataModel, createSurface, or deleteSurface messages.
- Later messages may create another surface, updateComponents, updateDataModel, or deleteSurface.
- updateComponents targets an existing surfaceId and contains complete component objects with id + component; only the declared fields change.
- updateDataModel targets an existing surfaceId. Use a JSON Pointer path such as /filters/month; omit value to delete that path.
- deleteSurface targets an existing surfaceId and removes it from the rendered document.
- Bind an input/select to the data model with \`value: { "path": "/filters/month" }\`. The field \`valuePath\` does not exist and MUST NOT be used.

Example lifecycle messages (each array item repeats the version):

\`\`\`json
[
  { "version": "v0.9.1", "createSurface": { "surfaceId": "report-1", "components": [
    { "id": "root", "component": "input", "label": "Month", "value": { "path": "/filters/month" } }
  ] } },
  { "version": "v0.9.1", "updateDataModel": { "surfaceId": "report-1", "path": "/filters/month", "value": "08" } }
]
\`\`\`

For a new tool call that redraws an existing business UI, keep the same createSurface.surfaceId and provide a complete createSurface snapshot. If bound fields must keep their values, repeat the corresponding updateDataModel messages after createSurface in that new call. The host retains missing chart labels/series only as a safety net; it is not a substitute for sending the current data or data model.
`;
