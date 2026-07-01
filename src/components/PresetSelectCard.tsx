import { ListFilter } from "lucide-react";
import { LabelPreset, LABEL_PRESETS } from "../pdf/labelCropper";

type PresetSelectCardProps = {
  customPresets: LabelPreset[];
  selectedPresetId: string;
  isCustomPresetSelected: boolean;
  onSelectPreset: (presetId: string) => void;
  onCreatePreset: () => void;
  onEditPreset: () => void;
  onDuplicatePreset: () => void;
  onDeletePreset: () => void;
};

export function PresetSelectCard({
  customPresets,
  selectedPresetId,
  isCustomPresetSelected,
  onSelectPreset,
  onCreatePreset,
  onEditPreset,
  onDuplicatePreset,
  onDeletePreset,
}: PresetSelectCardProps) {
  return (
    <div className="panel panel-compact">
      <div className="panel-header">
        <div className="panel-title">
          <ListFilter aria-hidden="true" size={18} />
          Preset
        </div>
      </div>
      <label className="preset-select">
        <span>Available presets</span>
        <select value={selectedPresetId} onChange={(event) => onSelectPreset(event.currentTarget.value)}>
          {LABEL_PRESETS.map((preset) => (
            <option key={preset.id} value={preset.id}>
              {preset.name}
            </option>
          ))}
          {customPresets.length > 0 && <option disabled>----------</option>}
          {customPresets.map((preset) => (
            <option key={preset.id} value={preset.id}>
              {preset.name} (saved on this device)
            </option>
          ))}
        </select>
      </label>
      <div className="preset-toolbar">
        <button type="button" className="secondary" onClick={onCreatePreset}>
          Create preset
        </button>
        <button type="button" className="secondary" onClick={onEditPreset}>
          Edit
        </button>
        <button type="button" className="secondary" onClick={onDuplicatePreset}>
          Duplicate
        </button>
        <button type="button" className="secondary" onClick={onDeletePreset} disabled={!isCustomPresetSelected}>
          Delete
        </button>
      </div>
    </div>
  );
}
