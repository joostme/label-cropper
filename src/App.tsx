import * as Tooltip from "@radix-ui/react-tooltip";
import { OutputPanel } from "./components/OutputPanel";
import { PresetEditorCard } from "./components/PresetEditorCard";
import { PresetSelectCard } from "./components/PresetSelectCard";
import { PreviewPane } from "./components/PreviewPane";
import { UploadPanel } from "./components/UploadPanel";
import { useLabelCropperApp } from "./hooks/useLabelCropperApp";

export default function App() {
  const app = useLabelCropperApp();

  return (
    <Tooltip.Provider delayDuration={150}>
      <main className="app-shell">
        <section className="workspace">
          <header className="header">
            <div>
              <h1>4x6 Label Cropper</h1>
            </div>
          </header>

          <div className="tool-grid">
            <div className="controls">
              <UploadPanel files={app.files} inputResetKey={app.fileInputResetKey} onFilesSelected={app.applyFiles} />
              <PresetSelectCard
                customPresets={app.customPresets}
                selectedPresetId={app.selectedPresetId}
                onSelectPreset={app.selectPreset}
              />
              <PresetEditorCard
                presetDraft={app.presetDraft}
                presetHintValue={app.presetHintValue}
                canSavePreset={app.canSavePreset}
                aspectLockEnabled={app.aspectLockEnabled}
                isCustomPresetSelected={app.isCustomPresetSelected}
                presetError={app.presetError}
                presetMessage={app.presetMessage}
                onPresetNameChange={app.updatePresetName}
                onFilenameHintsChange={app.updateFilenameHints}
                onCropChange={app.updateCrop}
                onToggleAspectLock={app.toggleAspectLock}
                onSavePreset={app.savePreset}
                onDeletePreset={app.deletePreset}
              />
              <OutputPanel
                conversion={app.conversion}
                filesCount={app.files.length}
                hasResult={app.hasResult}
                onReset={app.reset}
                onDownload={app.downloadPdf}
                onPrint={app.openPdfForPrinting}
              />
            </div>

            <PreviewPane conversion={app.conversion} />
          </div>
        </section>
      </main>
    </Tooltip.Provider>
  );
}
