export function collectPdfFiles(fileList: FileList | null): File[] {
  return Array.from(fileList ?? []).filter((file) => file.type === "application/pdf" || file.name.endsWith(".pdf"));
}
