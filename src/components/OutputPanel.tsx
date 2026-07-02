import { Download, Printer, Trash2 } from "lucide-react";
import { ConversionState } from "../hooks/useLabelConversion";
import { formatOutputSize, OutputSizePreset } from "../pdf/labelCropper";

type OutputPanelProps = {
  conversion: ConversionState;
  filesCount: number;
  hasResult: boolean;
  output: OutputSizePreset;
  onReset: () => void;
  onDownload: () => void;
  onPrint: () => void;
};

export function OutputPanel({ conversion, filesCount, hasResult, output, onReset, onDownload, onPrint }: OutputPanelProps) {
  return (
    <>
      <div className="panel panel-compact">
        <div className="panel-header">
          <div className="panel-title">Output Format</div>
        </div>
        <p className="panel-note panel-note-tight">{formatOutputSize(output)} PDF page</p>
      </div>

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
    </>
  );
}
