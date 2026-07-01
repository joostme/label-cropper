import { ConversionState } from "../hooks/useLabelConversion";

type PreviewPaneProps = {
  conversion: ConversionState;
  title?: string;
  emptyLabel?: string;
  compact?: boolean;
};

export function PreviewPane({
  conversion,
  title = "Output Preview",
  emptyLabel = "4 x 6 PDF preview",
  compact = false,
}: PreviewPaneProps) {
  return (
    <section className={`preview-card preview-output-card${compact ? " preview-card-compact" : ""}`}>
      <div className="preview-card-header">
        <div className="panel-title">{title}</div>
      </div>
      {conversion.error && <p className="error preview-error">{conversion.error}</p>}
      <div className="preview">
        {!conversion.pdfUrl && <div className="empty-preview">{emptyLabel}</div>}
        {conversion.pdfUrl && <iframe title="Cropped label preview" src={conversion.pdfUrl} />}
        {conversion.busy && <div className="preview-overlay">Updating preview...</div>}
      </div>
    </section>
  );
}
