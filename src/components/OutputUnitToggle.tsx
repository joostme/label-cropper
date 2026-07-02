import { OutputUnit } from "../pdf/labelCropper";

type OutputUnitToggleProps = {
  outputUnit: OutputUnit;
  onChange: (unit: OutputUnit) => void;
};

export function OutputUnitToggle({ outputUnit, onChange }: OutputUnitToggleProps) {
  return (
    <div className="unit-toggle" role="group" aria-label="Output size units">
      <button
        type="button"
        className={`secondary unit-toggle-button${outputUnit === "mm" ? " is-active" : ""}`}
        aria-pressed={outputUnit === "mm"}
        onClick={() => onChange("mm")}
      >
        Metric
      </button>
      <button
        type="button"
        className={`secondary unit-toggle-button${outputUnit === "in" ? " is-active" : ""}`}
        aria-pressed={outputUnit === "in"}
        onClick={() => onChange("in")}
      >
        US Inches
      </button>
    </div>
  );
}
