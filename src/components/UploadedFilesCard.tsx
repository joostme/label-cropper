type UploadedFilesCardProps = {
  files: File[];
};

export function UploadedFilesCard({ files }: UploadedFilesCardProps) {
  if (files.length === 0) {
    return null;
  }

  return (
    <section className="panel panel-compact">
      <div className="panel-header">
        <div className="panel-title">Uploaded PDFs</div>
        <p className="panel-note panel-note-tight">These files will be combined into one output PDF using the page assignments above.</p>
      </div>

      <div className="file-list">
        {files.map((file) => (
          <div className="file-row" key={`${file.name}-${file.size}`}>
            <span>{file.name}</span>
            <small>{Math.round(file.size / 1024)} KB</small>
          </div>
        ))}
      </div>
    </section>
  );
}
