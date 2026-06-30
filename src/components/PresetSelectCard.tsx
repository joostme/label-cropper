import { ListFilter } from "lucide-react";
import { LabelPreset, LABEL_PRESETS } from "../pdf/labelCropper";

type PresetSelectCardProps = {
  customPresets: LabelPreset[];
  selectedPresetId: string;
  onSelectPreset: (presetId: string) => void;
};

export function PresetSelectCard({ customPresets, selectedPresetId, onSelectPreset }: PresetSelectCardProps) {
  return (
    <div className="panel panel-compact">
      <div className="panel-header">
        <div className="panel-title">
          <ListFilter aria-hidden="true" size={18} />
          Use a saved preset
        </div>
        <p className="panel-note panel-note-tight">Pick the preset that should be applied to the uploaded files.</p>
      </div>
      <label className="preset-select">
        <span>Saved presets</span>
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
    </div>
  );
}
