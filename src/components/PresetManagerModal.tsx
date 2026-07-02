import { X } from "lucide-react";
import { useLabelConversion } from "../hooks/useLabelConversion";
import { formatOutputSize, LabelPreset } from "../pdf/labelCropper";
import { CropField, OutputField } from "../presets/presetUtils";
import { InteractiveCropPreview } from "./InteractiveCropPreview";
import { PresetEditorCard } from "./PresetEditorCard";
import { PreviewPane } from "./PreviewPane";
import { UploadPanel } from "./UploadPanel";

type PresetManagerModalProps = {
  isOpen: boolean;
  files: File[];
  file: File | null;
  inputResetKey: number;
  presetDraft: LabelPreset;
  presetHintValue: string;
  canSavePreset: boolean;
  aspectLockEnabled: boolean;
  presetError: string | null;
  title: string;
  primaryActionLabel: string;
  onClose: () => void;
  onPresetNameChange: (name: string) => void;
  onFilenameHintsChange: (value: string) => void;
  onCropChange: (field: CropField, value: number) => void;
  onOutputChange: (field: OutputField, value: number) => void;
  onVisualCropChange: (crop: LabelPreset["crop"]) => void;
  onToggleAspectLock: () => void;
  onSavePreset: () => void;
  onFilesSelected: (files: File[]) => void;
};

export function PresetManagerModal({
  isOpen,
  files,
  file,
  inputResetKey,
  presetDraft,
  presetHintValue,
  canSavePreset,
  aspectLockEnabled,
  presetError,
  title,
  primaryActionLabel,
  onClose,
  onPresetNameChange,
  onFilenameHintsChange,
  onCropChange,
  onOutputChange,
  onVisualCropChange,
  onToggleAspectLock,
  onSavePreset,
  onFilesSelected,
}: PresetManagerModalProps) {
  const draftConversion = useLabelConversion(files, presetDraft);

  if (!isOpen) {
    return null;
  }

  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <section
        className="modal-shell"
        role="dialog"
        aria-modal="true"
        aria-labelledby="preset-modal-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="modal-header">
          <div>
            <h2 className="section-title" id="preset-modal-title">
              {title}
            </h2>
          </div>
          <button type="button" className="modal-close" aria-label="Close preset modal" onClick={onClose}>
            <X aria-hidden="true" size={18} />
          </button>
        </div>

        <div className="modal-content-grid">
          <div className="modal-preview-column">
            <UploadPanel
              inputResetKey={inputResetKey}
              onFilesSelected={onFilesSelected}
              compact
              title={file ? "Replace Preview PDF" : "Upload Preview PDF"}
              subtitle={file ? file.name : "Drop a PDF here or choose one to preview this preset."}
            />
            <InteractiveCropPreview
              file={file}
              crop={presetDraft.crop}
              output={presetDraft.output}
              aspectLockEnabled={aspectLockEnabled}
              onCropChange={onVisualCropChange}
            />
          </div>
          <div className="modal-side-column">
            <PresetEditorCard
              presetDraft={presetDraft}
              presetHintValue={presetHintValue}
              canSavePreset={canSavePreset}
              aspectLockEnabled={aspectLockEnabled}
              presetError={presetError}
              onPresetNameChange={onPresetNameChange}
              onFilenameHintsChange={onFilenameHintsChange}
              onCropChange={onCropChange}
              onOutputChange={onOutputChange}
              onToggleAspectLock={onToggleAspectLock}
              onSavePreset={onSavePreset}
              onSecondaryAction={onClose}
              title="Preset Settings"
              primaryActionLabel={primaryActionLabel}
              secondaryActionLabel="Cancel"
            />
            <PreviewPane
              conversion={draftConversion}
              title="Draft Output Preview"
              emptyLabel={file ? `${formatOutputSize(presetDraft.output)} PDF preview` : "Upload a PDF to preview the draft output."}
              compact
            />
          </div>
        </div>
      </section>
    </div>
  );
}
