import { ChangeEvent, DragEvent, useMemo, useRef, useState } from "react";
import { Download, FileUp, ListFilter, Printer, RotateCw, Trash2 } from "lucide-react";
import {
  convertLabels,
  DEFAULT_LABEL_PRESET,
  findLabelPresetForFiles,
  LabelPreset,
  LABEL_PRESETS,
  makePdfBlobUrl,
} from "./pdf/labelCropper";

type AppState = {
  files: File[];
  labelPreset: LabelPreset;
  pdfUrl: string | null;
  pdfBytes: Uint8Array | null;
  pages: number;
  rotatedPages: number;
  busy: boolean;
  error: string | null;
};

const initialState: AppState = {
  files: [],
  labelPreset: DEFAULT_LABEL_PRESET,
  pdfUrl: null,
  pdfBytes: null,
  pages: 0,
  rotatedPages: 0,
  busy: false,
  error: null,
};

export default function App() {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [state, setState] = useState<AppState>(initialState);
  const [isDragging, setDragging] = useState(false);

  const hasResult = Boolean(state.pdfBytes && state.pdfUrl);
  const outputName = useMemo(() => {
    if (state.files.length === 1) {
      return state.files[0].name.replace(/\.pdf$/i, "-4x6.pdf");
    }

    return `${state.files.length}-labels-${new Date().toISOString().slice(0, 10)}-4x6.pdf`;
  }, [state.files]);

  async function runConversion(files: File[], labelPreset = state.labelPreset) {
    if (state.pdfUrl) {
      URL.revokeObjectURL(state.pdfUrl);
    }

    setState((current) => ({ ...current, files, labelPreset, pdfUrl: null, pdfBytes: null, busy: true, error: null }));

    try {
      const result = await convertLabels(files, labelPreset);
      setState((current) => ({
        ...current,
        pdfBytes: result.outputBytes,
        pdfUrl: makePdfBlobUrl(result.outputBytes),
        pages: result.pages,
        rotatedPages: result.rotatedPages,
        busy: false,
      }));
    } catch (error) {
      setState((current) => ({
        ...current,
        busy: false,
        error: error instanceof Error ? error.message : "Could not convert this PDF.",
      }));
    }
  }

  function collectPdfFiles(fileList: FileList | null) {
    return Array.from(fileList ?? []).filter((file) => file.type === "application/pdf" || file.name.endsWith(".pdf"));
  }

  function handleFileInput(event: ChangeEvent<HTMLInputElement>) {
    const files = collectPdfFiles(event.currentTarget.files);
    if (files.length > 0) {
      void runConversion(files, findLabelPresetForFiles(files, state.labelPreset));
    }
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragging(false);
    const files = collectPdfFiles(event.dataTransfer.files);
    if (files.length > 0) {
      void runConversion(files, findLabelPresetForFiles(files, state.labelPreset));
    }
  }

  function handlePresetChange(event: ChangeEvent<HTMLSelectElement>) {
    const labelPreset = LABEL_PRESETS.find((preset) => preset.id === event.currentTarget.value) ?? DEFAULT_LABEL_PRESET;
    setState((current) => ({ ...current, labelPreset }));
    if (state.files.length > 0) {
      void runConversion(state.files, labelPreset);
    }
  }

  function downloadPdf() {
    if (!state.pdfBytes) return;

    const link = document.createElement("a");
    link.href = makePdfBlobUrl(state.pdfBytes);
    link.download = outputName;
    link.click();
    URL.revokeObjectURL(link.href);
  }

  function openPdfForPrinting() {
    if (!state.pdfBytes) return;

    window.open(makePdfBlobUrl(state.pdfBytes), "_blank", "noopener,noreferrer");
  }

  function reset() {
    if (state.pdfUrl) {
      URL.revokeObjectURL(state.pdfUrl);
    }
    setState(initialState);
    if (inputRef.current) {
      inputRef.current.value = "";
    }
  }

  return (
    <main className="app-shell">
      <section className="workspace">
        <header className="header">
          <div>
            <p className="eyebrow">Local PDF conversion</p>
            <h1>4x6 Label Cropper</h1>
          </div>
          <div className="status-pill">
            <RotateCw aria-hidden="true" size={18} />
            Auto-rotate portrait A4
          </div>
        </header>

        <div className="tool-grid">
          <div className="controls">
            <div
              className={`drop-zone ${isDragging ? "is-dragging" : ""}`}
              onDragOver={(event) => {
                event.preventDefault();
                setDragging(true);
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={handleDrop}
              onClick={() => inputRef.current?.click()}
              role="button"
              tabIndex={0}
            >
              <input ref={inputRef} type="file" accept="application/pdf" multiple onChange={handleFileInput} />
              <FileUp aria-hidden="true" size={34} />
              <strong>Drop label PDFs here</strong>
              <span>or select one or more label files</span>
            </div>

            {state.files.length > 0 && (
              <div className="file-list">
                {state.files.map((file) => (
                  <div className="file-row" key={`${file.name}-${file.size}`}>
                    <span>{file.name}</span>
                    <small>{Math.round(file.size / 1024)} KB</small>
                  </div>
                ))}
              </div>
            )}

            <div className="panel">
              <div className="panel-title">
                <ListFilter aria-hidden="true" size={18} />
                Label format
              </div>
              <label className="preset-select">
                <span>Preset</span>
                <select value={state.labelPreset.id} onChange={handlePresetChange}>
                  {LABEL_PRESETS.map((preset) => (
                    <option key={preset.id} value={preset.id}>
                      {preset.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="actions">
              <button type="button" className="secondary" onClick={reset} disabled={state.busy && state.files.length === 0}>
                <Trash2 aria-hidden="true" size={18} />
                Reset
              </button>
              <button type="button" onClick={downloadPdf} disabled={!hasResult}>
                <Download aria-hidden="true" size={18} />
                Download
              </button>
              <button type="button" onClick={openPdfForPrinting} disabled={!hasResult}>
                <Printer aria-hidden="true" size={18} />
                Print
              </button>
            </div>

            {state.error && <p className="error">{state.error}</p>}
            {hasResult && (
              <p className="result">
                {state.files.length} file{state.files.length === 1 ? "" : "s"} combined into {state.pages} output page
                {state.pages === 1 ? "" : "s"}. {state.rotatedPages} page{state.rotatedPages === 1 ? "" : "s"} rotated.
              </p>
            )}
          </div>

          <div className="preview">
            {state.busy && <div className="empty-preview">Converting...</div>}
            {!state.busy && !state.pdfUrl && <div className="empty-preview">4 x 6 PDF preview</div>}
            {!state.busy && state.pdfUrl && <iframe title="Cropped DHL label preview" src={state.pdfUrl} />}
          </div>
        </div>
      </section>
    </main>
  );
}
