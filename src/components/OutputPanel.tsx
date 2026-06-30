import { Download, Printer, Trash2 } from "lucide-react";
import { ConversionState } from "../hooks/useLabelCropperApp";

type OutputPanelProps = {
  conversion: ConversionState;
  filesCount: number;
  hasResult: boolean;
  onReset: () => void;
  onDownload: () => void;
  onPrint: () => void;
};

export function OutputPanel({ conversion, filesCount, hasResult, onReset, onDownload, onPrint }: OutputPanelProps) {
  return (
    <>
      <div className="actions">
        <button type="button" className="secondary" onClick={onReset} disabled={conversion.busy && filesCount === 0}>
          <Trash2 aria-hidden="true" size={18} />
          Reset
        </button>
        <button type="button" onClick={onDownload} disabled={!hasResult}>
          <Download aria-hidden="true" size={18} />
          Download
        </button>
        <button type="button" onClick={onPrint} disabled={!hasResult}>
          <Printer aria-hidden="true" size={18} />
          Print
        </button>
      </div>

      {conversion.error && <p className="error">{conversion.error}</p>}
      {hasResult && (
        <p className="result">
          {filesCount} file{filesCount === 1 ? "" : "s"} combined into {conversion.pages} output page
          {conversion.pages === 1 ? "" : "s"}. {conversion.rotatedPages} page{conversion.rotatedPages === 1 ? "" : "s"} rotated.
        </p>
      )}
    </>
  );
}
