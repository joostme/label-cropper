import * as Tooltip from "@radix-ui/react-tooltip";
import { CircleHelp, Lock, LockOpen } from "lucide-react";
import { LabelPreset } from "../pdf/labelCropper";
import { CropField } from "../presets/presetUtils";

type PresetEditorCardProps = {
  presetDraft: LabelPreset;
  presetHintValue: string;
  canSavePreset: boolean;
  aspectLockEnabled: boolean;
  isCustomPresetSelected: boolean;
  presetError: string | null;
  presetMessage: string | null;
  onPresetNameChange: (name: string) => void;
  onFilenameHintsChange: (value: string) => void;
  onCropChange: (field: CropField, value: number) => void;
  onToggleAspectLock: () => void;
  onSavePreset: () => void;
  onDeletePreset: () => void;
};

const cropFields: Array<{ field: CropField; label: string; min: number }> = [
  { field: "x", label: "X", min: 0 },
  { field: "y", label: "Y", min: 0 },
  { field: "width", label: "Width", min: 1 },
  { field: "height", label: "Height", min: 1 },
];

export function PresetEditorCard({
  presetDraft,
  presetHintValue,
  canSavePreset,
  aspectLockEnabled,
  isCustomPresetSelected,
  presetError,
  presetMessage,
  onPresetNameChange,
  onFilenameHintsChange,
  onCropChange,
  onToggleAspectLock,
  onSavePreset,
  onDeletePreset,
}: PresetEditorCardProps) {
  return (
    <div className="panel panel-editor">
      <div className="panel-header">
        <div className="panel-kicker">Preset builder</div>
        <div className="panel-title">Create or edit a preset</div>
        <p className="panel-note">
          Built-in presets are read-only. Change the values here, watch the preview update, then save a local preset for this
          device.
        </p>
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
          <span className="preset-section-title">Crop dimensions</span>
          <Tooltip.Root>
            <Tooltip.Trigger asChild>
              <button
                type="button"
                className={`aspect-lock-toggle ${aspectLockEnabled ? "is-active" : ""}`}
                aria-label={aspectLockEnabled ? "Disable 4 by 6 aspect ratio lock" : "Enable 4 by 6 aspect ratio lock"}
                aria-pressed={aspectLockEnabled}
                onClick={onToggleAspectLock}
              >
                {aspectLockEnabled ? <Lock aria-hidden="true" size={15} /> : <LockOpen aria-hidden="true" size={15} />}
              </button>
            </Tooltip.Trigger>
            <Tooltip.Portal>
              <Tooltip.Content className="tooltip-content" side="top" align="end" sideOffset={10}>
                {aspectLockEnabled
                  ? "Aspect ratio lock is on. Width and height stay aligned to 4 x 6, so changing one automatically updates the other."
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
        <button type="button" className="secondary" onClick={onSavePreset} disabled={!canSavePreset}>
          {isCustomPresetSelected ? "Update preset" : "Save as new preset"}
        </button>
        <button type="button" className="secondary" onClick={onDeletePreset} disabled={!isCustomPresetSelected}>
          Delete saved preset
        </button>
      </div>

      {presetError && <p className="error">{presetError}</p>}
      {!presetError && presetMessage && <p className="result">{presetMessage}</p>}
    </div>
  );
}
