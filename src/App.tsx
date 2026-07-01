import * as Tooltip from "@radix-ui/react-tooltip";
import { GitFork, ScanLine } from "lucide-react";
import { OutputPanel } from "./components/OutputPanel";
import { PresetManagerModal } from "./components/PresetManagerModal";
import { PresetSelectCard } from "./components/PresetSelectCard";
import { PreviewPane } from "./components/PreviewPane";
import { UploadPanel } from "./components/UploadPanel";
import { UploadedFilesCard } from "./components/UploadedFilesCard";
import { useLabelCropperApp } from "./hooks/useLabelCropperApp";
import { usePresetEditorModal } from "./hooks/usePresetEditorModal";

export default function App() {
  const app = useLabelCropperApp();
  const presetModal = usePresetEditorModal({
    selectedPreset: app.selectedPreset,
    isCustomPresetSelected: app.isCustomPresetSelected,
    onSavePreset: app.savePresetDefinition,
  });

  return (
    <Tooltip.Provider delayDuration={150}>
      <main className="app-shell">
        <section className="workspace">
          <header className="header">
            <div className="hero-copy">
              <div className="hero-mark" aria-hidden="true">
                <ScanLine size={28} strokeWidth={2.1} />
              </div>
              <div>
                <h1>Croppy x64</h1>
              </div>
            </div>
          </header>

          <UploadPanel inputResetKey={app.fileInputResetKey} onFilesSelected={app.applyFiles} />

          <section className="happy-path-grid">
            <div className="controls">
              <PresetSelectCard
                customPresets={app.customPresets}
                selectedPresetId={app.selectedPresetId}
                isCustomPresetSelected={app.isCustomPresetSelected}
                onSelectPreset={app.selectPreset}
                onCreatePreset={presetModal.openCreate}
                onEditPreset={presetModal.openEdit}
                onDuplicatePreset={presetModal.openDuplicate}
                onDeletePreset={() => {
                  if (!app.isCustomPresetSelected) {
                    return;
                  }

                  if (window.confirm(`Delete preset "${app.selectedPreset.name}" from this device?`)) {
                    app.deleteSelectedPreset();
                  }
                }}
              />
              <UploadedFilesCard files={app.files} />
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
          </section>

          <footer className="app-footer">
            <a href="https://github.com/joostme/label-cropper" target="_blank" rel="noreferrer">
              <GitFork aria-hidden="true" size={16} />
              View the project on GitHub
            </a>
          </footer>
        </section>

        <PresetManagerModal
          isOpen={presetModal.isOpen}
          files={app.files}
          file={app.firstFile}
          inputResetKey={app.fileInputResetKey}
          presetDraft={presetModal.draft}
          presetHintValue={presetModal.presetHintValue}
          canSavePreset={presetModal.canSave}
          aspectLockEnabled={presetModal.aspectLockEnabled}
          presetError={presetModal.error}
          title={presetModal.modalTitle}
          primaryActionLabel={presetModal.primaryActionLabel}
          onClose={presetModal.close}
          onPresetNameChange={presetModal.updatePresetName}
          onFilenameHintsChange={presetModal.updateFilenameHints}
          onCropChange={presetModal.updateCrop}
          onVisualCropChange={presetModal.setCrop}
          onToggleAspectLock={presetModal.toggleAspectLock}
          onSavePreset={presetModal.save}
          onFilesSelected={app.applyFiles}
        />
      </main>
    </Tooltip.Provider>
  );
}
