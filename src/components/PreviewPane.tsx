import { CropPreset } from "../pdf/labelCropper";
import { ConversionState } from "../hooks/useLabelCropperApp";
import { InteractiveCropPreview } from "./InteractiveCropPreview";

type PreviewPaneProps = {
  file: File | null;
  crop: CropPreset;
  aspectLockEnabled: boolean;
  onCropChange: (crop: CropPreset) => void;
  conversion: ConversionState;
};

export function PreviewPane({ file, crop, aspectLockEnabled, onCropChange, conversion }: PreviewPaneProps) {
  return (
    <div className="preview-column">
      <InteractiveCropPreview file={file} crop={crop} aspectLockEnabled={aspectLockEnabled} onCropChange={onCropChange} />

      <section className="preview-card preview-output-card">
        <div className="preview-card-header">
          <div className="panel-title">4 x 6 output preview</div>
        </div>
        <div className="preview">
          {!conversion.pdfUrl && <div className="empty-preview">4 x 6 PDF preview</div>}
          {conversion.pdfUrl && <iframe title="Cropped label preview" src={conversion.pdfUrl} />}
          {conversion.busy && <div className="preview-overlay">Updating preview...</div>}
        </div>
      </section>
    </div>
  );
}
