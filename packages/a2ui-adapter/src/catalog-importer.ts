/** Trusted local-directory installation for A2UI component-library bundles. */

import { spawn } from "node:child_process";
import { existsSync, readFileSync, realpathSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { isAbsolute, join } from "node:path";
import type { IncomingMessage, ServerResponse } from "node:http";
import type { Context } from "@deepseek-ai/cordis";
import type {} from "@deepseek-ai/dsh-host-webserver";

/** Component-library metadata required for installation through the A2UI settings page. */
export type A2uiLibraryMetadata = {
  readonly catalog: { readonly id: string; readonly components: readonly string[] };
  readonly host: string;
  readonly client: string;
};

type PackageManifest = {
  readonly name?: unknown;
  readonly dsh?: { readonly bundle?: { readonly patch?: unknown }; readonly client?: { readonly platform?: unknown } };
  readonly a2ui?: unknown;
};

/** Successful installation result returned to the settings page. */
export type A2uiCatalogImportResult = {
  readonly packageName: string;
  readonly catalogId: string;
  readonly restartRequired: true;
};

/** Validate the metadata and DSH loading declarations of one local package directory. */
export function inspectA2uiCatalogLibrary(directory: string): { directory: string; packageName: string; metadata: A2uiLibraryMetadata } {
  if (!isAbsolute(directory)) throw new Error("组件库目录必须是绝对路径。");
  const resolved = realpathSync(directory);
  const manifestPath = join(resolved, "package.json");
  if (!existsSync(manifestPath)) throw new Error("组件库目录缺少 package.json。");
  const manifest = JSON.parse(readFileSync(manifestPath, "utf8")) as PackageManifest;
  if (typeof manifest.name !== "string" || !manifest.name.startsWith("@dsh-a2ui/") || manifest.name.length === "@dsh-a2ui/".length) {
    throw new Error("组件库 package.json 的 name 必须使用 @dsh-a2ui/ 命名空间。");
  }
  if (typeof manifest.dsh?.bundle?.patch !== "string" || !existsSync(join(resolved, manifest.dsh.bundle.patch))) {
    throw new Error("组件库必须声明存在的 dsh.bundle.patch 宿主加载文件。");
  }
  if (manifest.dsh.client?.platform !== "web") throw new Error("组件库必须声明 dsh.client.platform: web。");
  if (typeof manifest.a2ui !== "object" || manifest.a2ui === null || Array.isArray(manifest.a2ui)) {
    throw new Error("组件库必须声明 a2ui 元数据。");
  }
  const metadata = manifest.a2ui as Partial<A2uiLibraryMetadata>;
  const catalog = metadata.catalog;
  if (typeof catalog !== "object" || catalog === null || typeof catalog.id !== "string" || catalog.id.trim() !== catalog.id || catalog.id.length === 0) {
    throw new Error("a2ui.catalog.id 必须是非空的规范 catalog id。");
  }
  if (!Array.isArray(catalog.components) || catalog.components.length === 0 || catalog.components.some((name) => typeof name !== "string" || name.trim() !== name || name.length === 0)) {
    throw new Error("a2ui.catalog.components 必须包含至少一个规范组件名。");
  }
  if (new Set(catalog.components).size !== catalog.components.length) throw new Error("a2ui.catalog.components 不能重复。");
  if (typeof metadata.host !== "string" || !existsSync(join(resolved, metadata.host))) throw new Error("a2ui.host 必须指向已构建的宿主入口。");
  if (typeof metadata.client !== "string" || !existsSync(join(resolved, metadata.client))) throw new Error("a2ui.client 必须指向已构建的浏览器入口。");
  return { directory: resolved, packageName: manifest.name, metadata: { catalog: { id: catalog.id, components: [...catalog.components] }, host: metadata.host, client: metadata.client } };
}

/** Install one inspected library into the selected DSH profile. */
export async function installA2uiCatalogLibrary(directory: string, profileName: string): Promise<A2uiCatalogImportResult> {
  if (profileName.trim() !== profileName || profileName.length === 0) throw new Error("A2UI profileName 必须是非空名称。");
  const inspected = inspectA2uiCatalogLibrary(directory);
  const home = process.env.DSH_HOME?.trim() || join(homedir(), ".dsh");
  const profileDirectory = join(home, "profiles", profileName);
  if (!existsSync(join(profileDirectory, "package.json"))) throw new Error(`DSH profile ${JSON.stringify(profileName)} 不存在。`);
  await runPnpm(profileDirectory, ["add", `file:${inspected.directory}`]);
  const profileManifestPath = join(profileDirectory, "package.json");
  const profileManifest = JSON.parse(readFileSync(profileManifestPath, "utf8")) as { dsh?: { profile?: { bundles?: string[] } } };
  const bundles = profileManifest.dsh?.profile?.bundles ?? [];
  if (!bundles.includes(inspected.packageName)) {
    profileManifest.dsh = { ...profileManifest.dsh, profile: { ...profileManifest.dsh?.profile, bundles: [...bundles, inspected.packageName] } };
    writeFileSync(profileManifestPath, JSON.stringify(profileManifest, undefined, 2) + "\n");
  }
  return { packageName: inspected.packageName, catalogId: inspected.metadata.catalog.id, restartRequired: true };
}

/** Register the local-only import HTTP endpoint when the web Host is present. */
export function registerA2uiCatalogImportRoute(ctx: Context, profileName: string | undefined): void {
  if (profileName === undefined) return;
  ctx.inject(["webServer"], (webCtx) => {
    webCtx.effect(() => webCtx.webServer.register({
      kind: "exact",
      path: "/api/a2ui/catalogs/import",
      handler: async (request, response) => {
        if (request.method !== "POST") return respond(response, 405, { error: "仅支持 POST。" });
        if (!isSameOrigin(request)) return respond(response, 403, { error: "仅接受同源设置页请求。" });
        try {
          const body = await readJson(request);
          const path = typeof body.path === "string" ? body.path : "";
          const installed = await installA2uiCatalogLibrary(path, profileName);
          respond(response, 200, installed);
        } catch (error) {
          respond(response, 400, { error: error instanceof Error ? error.message : String(error) });
        }
      },
    }), "a2ui catalog local importer");
  });
}

function runPnpm(cwd: string, args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(process.platform === "win32" ? "pnpm.cmd" : "pnpm", args, { cwd, stdio: "ignore", shell: process.platform === "win32" });
    child.once("error", reject);
    child.once("exit", (code) => code === 0 ? resolve() : reject(new Error(`pnpm 安装组件库失败，退出码 ${String(code)}。`)));
  });
}

function isSameOrigin(request: IncomingMessage): boolean {
  const origin = request.headers.origin;
  const host = request.headers.host;
  return typeof origin === "string" && typeof host === "string" && origin === `http://${host}`;
}

function readJson(request: IncomingMessage): Promise<Record<string, unknown>> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let bytes = 0;
    request.on("data", (chunk: Buffer) => {
      bytes += chunk.length;
      if (bytes > 16_384) {
        request.destroy();
        reject(new Error("安装请求超过 16 KiB 限额。"));
      } else chunks.push(chunk);
    });
    request.once("error", reject);
    request.once("end", () => {
      try {
        const value = JSON.parse(Buffer.concat(chunks).toString("utf8")) as unknown;
        if (typeof value !== "object" || value === null || Array.isArray(value)) throw new Error("安装请求必须是 JSON 对象。");
        resolve(value as Record<string, unknown>);
      } catch (error) { reject(error); }
    });
  });
}

function respond(response: ServerResponse, status: number, body: unknown): void {
  response.writeHead(status, { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" });
  response.end(JSON.stringify(body));
}
