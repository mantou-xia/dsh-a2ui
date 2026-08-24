/** Runtime capability checks for the host half of the DSH plugin. */

type CapabilityContext = {
  tools?: { register?: unknown };
  systemPrompt?: { section?: unknown };
};

function callable(value: unknown): boolean {
  return typeof value === "function";
}

/**
 * DSH is still a developer-preview host. Fail at plugin startup with the
 * missing service names instead of accepting a load and failing later during a
 * tool call, which makes an upstream breaking change diagnosable.
 */
export function assertA2uiHostCapabilities(ctx: CapabilityContext): void {
  const missing: string[] = [];
  if (!callable(ctx.tools?.register)) missing.push("tools.register");
  if (!callable(ctx.systemPrompt?.section)) missing.push("systemPrompt.section");
  if (missing.length > 0) {
    throw new Error(
      `[dsh-a2ui] incompatible DSH host: missing ${missing.join(", ")}. `
      + "Install a DSH version exposing the documented Cordis tools and systemPrompt services.",
    );
  }
}
