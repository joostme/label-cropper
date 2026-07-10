import { LabelPreset, LABEL_PRESETS } from "../pdf/labelCropper";
import { PdfPageManifestEntry } from "../pdf/pdfPageManifest";

type AssignedPdfPage = PdfPageManifestEntry & {
  presetId: string;
};

type PageAssignmentsCardProps = {
  pages: AssignedPdfPage[];
  customPresets: LabelPreset[];
  loading: boolean;
  error: string | null;
  onPagePresetChange: (fileIndex: number, pageIndex: number, presetId: string) => void;
  onApplySelectedPresetToAll: () => void;
};

export function PageAssignmentsCard({
  pages,
  customPresets,
  loading,
  error,
  onPagePresetChange,
  onApplySelectedPresetToAll,
}: PageAssignmentsCardProps) {
  if (!loading && !error && pages.length === 0) {
    return null;
  }

  return (
    <section className="panel panel-compact">
      <div className="panel-header">
        <div className="panel-title">Page Assignments</div>
        <p className="panel-note panel-note-tight">Each input page can use a different crop preset, but all selected presets must share one output size.</p>
      </div>

      <div className="page-assignment-toolbar">
        <button type="button" className="secondary" onClick={onApplySelectedPresetToAll} disabled={loading || pages.length === 0}>
          Apply selected preset to all pages
        </button>
      </div>

      {loading && <p className="panel-note">Reading PDF pages...</p>}
      {error && <p className="error">{error}</p>}

      {!loading && !error && (
        <div className="page-assignment-list">
          {pages.map((page) => (
            <label className="page-assignment-row" key={page.id}>
              <div className="page-assignment-copy">
                <strong>{page.fileName}</strong>
                <span>
                  Page {page.pageNumber} of {page.totalPagesInFile}
                </span>
              </div>

              <select
                value={page.presetId}
                aria-label={`Preset for ${page.fileName}, page ${page.pageNumber}`}
                onChange={(event) => onPagePresetChange(page.fileIndex, page.pageIndex, event.currentTarget.value)}
              >
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
          ))}
        </div>
      )}
    </section>
  );
}
