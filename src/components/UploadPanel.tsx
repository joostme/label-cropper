import { KeyboardEvent, useRef, useState } from "react";
import { FileUp } from "lucide-react";
import { collectPdfFiles } from "../files/collectPdfFiles";

type UploadPanelProps = {
  files: File[];
  inputResetKey: number;
  onFilesSelected: (files: File[]) => void;
};

export function UploadPanel({ files, inputResetKey, onFilesSelected }: UploadPanelProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [isDragging, setDragging] = useState(false);

  function openFilePicker() {
    inputRef.current?.click();
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      openFilePicker();
    }
  }

  return (
    <>
      <div
        className={`drop-zone ${isDragging ? "is-dragging" : ""}`}
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);
          const nextFiles = collectPdfFiles(event.dataTransfer.files);
          if (nextFiles.length > 0) {
            onFilesSelected(nextFiles);
          }
        }}
        onClick={openFilePicker}
        onKeyDown={handleKeyDown}
        role="button"
        tabIndex={0}
      >
        <input
          key={inputResetKey}
          ref={inputRef}
          type="file"
          accept="application/pdf"
          multiple
          onChange={(event) => {
            const nextFiles = collectPdfFiles(event.currentTarget.files);
            if (nextFiles.length > 0) {
              onFilesSelected(nextFiles);
            }
          }}
        />
        <FileUp aria-hidden="true" size={34} />
        <strong>Drop label PDFs here</strong>
        <span>or select one or more label files</span>
      </div>

      {files.length > 0 && (
        <div className="file-list">
          {files.map((file) => (
            <div className="file-row" key={`${file.name}-${file.size}`}>
              <span>{file.name}</span>
              <small>{Math.round(file.size / 1024)} KB</small>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
