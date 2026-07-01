import { KeyboardEvent, useRef, useState } from "react";
import { FileUp } from "lucide-react";
import { collectPdfFiles } from "../files/collectPdfFiles";

type UploadPanelProps = {
  inputResetKey: number;
  onFilesSelected: (files: File[]) => void;
  compact?: boolean;
  title?: string;
  subtitle?: string;
};

export function UploadPanel({
  inputResetKey,
  onFilesSelected,
  compact = false,
  title = "Drop PDFs here",
  subtitle = "or select one or more label files",
}: UploadPanelProps) {
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

  function handleSelectedFiles(fileList: FileList | null) {
    const nextFiles = collectPdfFiles(fileList);
    if (nextFiles.length > 0) {
      onFilesSelected(nextFiles);
    }
  }

  return (
    <div
      className={`drop-zone ${compact ? "drop-zone-compact" : ""} ${isDragging ? "is-dragging" : ""}`}
      onDragOver={(event) => {
        event.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(event) => {
        event.preventDefault();
        setDragging(false);
        handleSelectedFiles(event.dataTransfer.files);
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
          handleSelectedFiles(event.currentTarget.files);
          event.currentTarget.value = "";
        }}
      />
      <FileUp aria-hidden="true" size={34} />
      <strong>{title}</strong>
      <span>{subtitle}</span>
    </div>
  );
}
