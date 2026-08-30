/** A2UI settings page: canvas skin and trusted local component-library import. */

import { useState, useSyncExternalStore } from "react";
import type { InjectFace, PropsRuntime } from "@deepseek-ai/dsh-client-ui-slots";
import { A2UI_SKINS, getA2uiSkin, setA2uiSkin, subscribeA2uiSkin, type A2uiSkin } from "../skins.ts";
import { downloadA2uiCatalogTemplate } from "./catalog-template.ts";
import type { A2uiCatalogImportResult } from "./catalog-import.ts";

/** Host actions bound by the renderer plugin. */
export type A2uiSettingsInjected = {
  readonly chooseDirectory: () => Promise<string | null>;
  readonly importDirectory: (path: string) => Promise<A2uiCatalogImportResult>;
};

type A2uiSettingsSectionProps = PropsRuntime<"settings.section"> & InjectFace<A2uiSettingsInjected>;

/** Render the A2UI settings page. */
export function A2uiSettingsSection({ chooseDirectory, importDirectory }: A2uiSettingsSectionProps) {
  const skin = useSyncExternalStore(subscribeA2uiSkin, getA2uiSkin, getA2uiSkin);
  const [directory, setDirectory] = useState("");
  const [status, setStatus] = useState<string>();
  const [busy, setBusy] = useState(false);
  const pick = async (): Promise<void> => {
    setStatus(undefined);
    try {
      const selected = await chooseDirectory();
      if (selected !== null) setDirectory(selected);
    } catch (error) { setStatus(error instanceof Error ? error.message : String(error)); }
  };
  const install = async (): Promise<void> => {
    if (directory.trim() === "") return;
    setBusy(true);
    setStatus(undefined);
    try {
      const result = await importDirectory(directory);
      setStatus(`已安装 ${result.packageName}（catalog: ${result.catalogId}）。请重启 DSH 后加载。`);
    } catch (error) { setStatus(error instanceof Error ? error.message : String(error)); }
    finally { setBusy(false); }
  };
  return (
    <section className="a2ui-settings" aria-label="A2UI 设置">
      <header><h2>A2UI</h2><p>配置画布皮肤，并从本机受信任目录导入组件库。</p></header>
      <div className="a2ui-settings-card">
        <h3>渲染皮肤</h3>
        <label className="a2ui-settings-field">画布外观
          <select value={skin} onChange={(event) => setA2uiSkin(event.target.value as A2uiSkin)}>
            {A2UI_SKINS.map((option) => <option key={option} value={option}>{option === "studio" ? "工作室" : option === "soft" ? "柔和" : "高对比"}</option>)}
          </select>
        </label>
        <div className="a2ui-skin-preview" data-a2ui-skin={skin} aria-label={`${skin} 皮肤预览`}>
          <div><strong>面板预览</strong><span>当前已应用：{skin === "studio" ? "工作室" : skin === "soft" ? "柔和" : "高对比"}</span></div>
          <button type="button" className="a2ui-button">示例操作</button>
        </div>
      </div>
      <div className="a2ui-settings-card">
        <h3>组件库模板</h3>
        <p>导出可被本机导入器校验的 package 元数据模板；完整双端实现可复制 a2ui-catalog-example。</p>
        <button type="button" className="a2ui-button" onClick={downloadA2uiCatalogTemplate}>导出要求模板</button>
      </div>
      <div className="a2ui-settings-card">
        <h3>导入本机组件库</h3>
        <p>选择已经构建的本机组件库目录。导入会更新当前 DSH profile，运行中的实例不会加载新代码。</p>
        <div className="a2ui-settings-import">
          <input value={directory} readOnly placeholder="选择组件库目录" aria-label="组件库目录" />
          <button type="button" className="a2ui-button" onClick={pick} disabled={busy}>选择目录</button>
          <button type="button" className="a2ui-button a2ui-button-variant-primary" onClick={install} disabled={busy || directory === ""}>{busy ? "正在安装…" : "校验并导入"}</button>
        </div>
        {status !== undefined && <p className="a2ui-settings-status" role="status">{status}</p>}
      </div>
    </section>
  );
}
