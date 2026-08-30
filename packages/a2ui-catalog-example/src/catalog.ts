/** Example catalog library definition shared by its host and browser halves. */

import type { A2uiCatalogRegistration } from "@dsh-plugin-edu/a2ui-protocol";

export const A2UI_EXAMPLE_CATALOG_ID = "dsh-example" as const;

/** A minimal independent catalog used to prove the library registration path. */
export const A2UI_EXAMPLE_CATALOG = {
  catalogId: A2UI_EXAMPLE_CATALOG_ID,
  components: [
    {
      component: "notice",
      properties: [
        { name: "title", type: "string", maxLength: 120 },
        { name: "body", type: "string", maxLength: 600 },
        { name: "tone", type: "string", maxLength: 20 },
      ],
      limits: { maxStringLength: 720 },
    },
  ],
} satisfies A2uiCatalogRegistration["catalog"];

/** Model-facing guide contributed while this catalog library is installed. */
export const A2UI_EXAMPLE_TEACHING = `## dsh-example catalog

When a compact status notice is enough, set createSurface.catalogId to \`"dsh-example"\` and use one \`notice\` component. Its fields are \`title\`, \`body\`, and optional \`tone\` (\`success\`, \`warn\`, or \`error\`).`;

export const A2UI_EXAMPLE_REGISTRATION: A2uiCatalogRegistration = {
  catalog: A2UI_EXAMPLE_CATALOG,
  teaching: A2UI_EXAMPLE_TEACHING,
};
