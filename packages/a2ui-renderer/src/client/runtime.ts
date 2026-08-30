/** Runtime capability checks for the client half of the DSH plugin. */

type CapabilityContext = {
  conversationEvents?: { register?: unknown };
  slots?: { inject?: unknown; register?: unknown };
  sessions?: { scope?: unknown };
  theme?: { getTheme?: unknown };
  workspaces?: { pickDirectory?: unknown };
};

function callable(value: unknown): boolean {
  return typeof value === "function";
}

/**
 * Verify every API used by the renderer before registering any side effect.
 * This turns a DSH client API breaking change into one actionable load error.
 */
export function assertA2uiClientCapabilities(ctx: CapabilityContext): void {
  const missing: string[] = [];
  if (!callable(ctx.conversationEvents?.register)) missing.push("conversationEvents.register");
  if (!callable(ctx.slots?.inject)) missing.push("slots.inject");
  if (!callable(ctx.slots?.register)) missing.push("slots.register");
  if (!callable(ctx.sessions?.scope)) missing.push("sessions.scope");
  if (!callable(ctx.theme?.getTheme)) missing.push("theme.getTheme");
  if (!callable(ctx.workspaces?.pickDirectory)) missing.push("workspaces.pickDirectory");
  if (missing.length > 0) {
    throw new Error(
      `[dsh-a2ui] incompatible DSH client: missing ${missing.join(", ")}. `
      + "Install a DSH version exposing the conversation, slots, sessions, theme, and workspace client services.",
    );
  }
}
