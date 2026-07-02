import * as Tooltip from "@radix-ui/react-tooltip";
import { CircleHelp, Lock, LockOpen } from "lucide-react";
import { formatOutputSize, LabelPreset } from "../pdf/labelCropper";
import { CropField, OutputField } from "../presets/presetUtils";

type PresetEditorCardProps = {
  presetDraft: LabelPreset;
  presetHintValue: string;
  canSavePreset: boolean;
  aspectLockEnabled: boolean;
  presetError: string | null;
  onPresetNameChange: (name: string) => void;
  onFilenameHintsChange: (value: string) => void;
  onCropChange: (field: CropField, value: number) => void;
  onOutputChange: (field: OutputField, value: number) => void;
  onToggleAspectLock: () => void;
  onSavePreset: () => void;
  onSecondaryAction?: () => void;
  title?: string;
  primaryActionLabel?: string;
  secondaryActionLabel?: string;
};

const cropFields: Array<{ field: CropField; label: string; min: number }> = [
  { field: "x", label: "X", min: 0 },
  { field: "y", label: "Y", min: 0 },
  { field: "width", label: "Width", min: 1 },
  { field: "height", label: "Height", min: 1 },
];

const outputFields: Array<{ field: OutputField; label: string; min: number }> = [
  { field: "widthMm", label: "Width (mm)", min: 0.1 },
  { field: "heightMm", label: "Height (mm)", min: 0.1 },
];

export function PresetEditorCard({
  presetDraft,
  presetHintValue,
  canSavePreset,
  aspectLockEnabled,
  presetError,
  onPresetNameChange,
  onFilenameHintsChange,
  onCropChange,
  onOutputChange,
  onToggleAspectLock,
  onSavePreset,
  onSecondaryAction,
  title = "Create or edit a preset",
  primaryActionLabel = "Save preset",
  secondaryActionLabel = "Cancel",
}: PresetEditorCardProps) {
  return (
    <div className="panel panel-editor">
      <div className="panel-header">
        <div className="panel-title">{title}</div>
      </div>

      <div className="preset-editor-grid">
        <label className="field field-wide">
          <span>Name</span>
          <input type="text" value={presetDraft.name} onChange={(event) => onPresetNameChange(event.currentTarget.value)} placeholder="My shipping label" />
        </label>

        <label className="field field-wide">
          <span className="field-label-with-help">
            Filename hints
            <Tooltip.Root>
              <Tooltip.Trigger asChild>
                <button type="button" className="field-help" aria-label="Explain how filename hints work">
                  <CircleHelp aria-hidden="true" size={14} />
                </button>
              </Tooltip.Trigger>
              <Tooltip.Portal>
                <Tooltip.Content className="tooltip-content" side="top" align="start" sideOffset={10}>
                  Enter comma-separated filename fragments from the original PDF, such as <strong>dhl</strong> or{" "}
                  <strong>ebay</strong>. If an uploaded filename contains one of them, this preset will be selected automatically.
                  <Tooltip.Arrow className="tooltip-arrow" />
                </Tooltip.Content>
              </Tooltip.Portal>
            </Tooltip.Root>
          </span>
          <input
            type="text"
            value={presetHintValue}
            onChange={(event) => onFilenameHintsChange(event.currentTarget.value)}
            placeholder="dhl, ebay"
          />
        </label>

        <div className="field-wide preset-section-header">
          <span className="preset-section-title">Output page size</span>
        </div>

        {outputFields.map(({ field, label, min }) => (
          <label className="field" key={field}>
            <span>{label}</span>
            <input
              type="number"
              min={min}
              step="0.1"
              value={presetDraft.output[field]}
              onChange={(event) => {
                if (event.currentTarget.value === "") {
                  return;
                }

                onOutputChange(field, Number(event.currentTarget.value));
              }}
            />
          </label>
        ))}

        <div className="field-wide preset-section-header">
          <span className="preset-section-title">Crop dimensions</span>
          <Tooltip.Root>
            <Tooltip.Trigger asChild>
              <button
                type="button"
                className={`aspect-lock-toggle ${aspectLockEnabled ? "is-active" : ""}`}
                aria-label={aspectLockEnabled ? `Disable ${formatOutputSize(presetDraft.output)} aspect ratio lock` : `Enable ${formatOutputSize(presetDraft.output)} aspect ratio lock`}
                aria-pressed={aspectLockEnabled}
                onClick={onToggleAspectLock}
              >
                {aspectLockEnabled ? <Lock aria-hidden="true" size={15} /> : <LockOpen aria-hidden="true" size={15} />}
              </button>
            </Tooltip.Trigger>
            <Tooltip.Portal>
              <Tooltip.Content className="tooltip-content" side="top" align="end" sideOffset={10}>
                {aspectLockEnabled
                  ? `Aspect ratio lock is on. Width and height stay aligned to ${formatOutputSize(presetDraft.output)}, so changing one automatically updates the other.`
                  : "Aspect ratio lock is off. Width and height can be edited independently."}
                <Tooltip.Arrow className="tooltip-arrow" />
              </Tooltip.Content>
            </Tooltip.Portal>
          </Tooltip.Root>
        </div>

        {cropFields.map(({ field, label, min }) => (
          <label className="field" key={field}>
            <span>{label}</span>
            <input
              type="number"
              min={min}
              step="1"
              value={presetDraft.crop[field]}
              onChange={(event) => {
                if (event.currentTarget.value === "") {
                  return;
                }

                onCropChange(field, Number(event.currentTarget.value));
              }}
            />
          </label>
        ))}
      </div>

      <div className="preset-actions">
        <button type="button" className="secondary" onClick={onSecondaryAction}>
          {secondaryActionLabel}
        </button>
        <button type="button" onClick={onSavePreset} disabled={!canSavePreset}>
          {primaryActionLabel}
        </button>
      </div>

      {presetError && <p className="error">{presetError}</p>}
    </div>
  );
}
