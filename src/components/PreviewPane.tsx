import { ConversionState } from "../hooks/useLabelCropperApp";

type PreviewPaneProps = {
  conversion: ConversionState;
};

export function PreviewPane({ conversion }: PreviewPaneProps) {
  return (
    <div className="preview">
      {!conversion.pdfUrl && <div className="empty-preview">4 x 6 PDF preview</div>}
      {conversion.pdfUrl && <iframe title="Cropped label preview" src={conversion.pdfUrl} />}
      {conversion.busy && <div className="preview-overlay">Updating preview...</div>}
    </div>
  );
}
