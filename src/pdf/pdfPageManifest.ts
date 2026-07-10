import { PDFDocument } from "pdf-lib";
import { getPdfPageAssignmentKey } from "./labelCropper";

export type PdfPageManifestEntry = {
  id: string;
  fileIndex: number;
  pageIndex: number;
  pageNumber: number;
  totalPagesInFile: number;
  fileName: string;
};

export async function inspectPdfFiles(files: File[]): Promise<PdfPageManifestEntry[]> {
  const pagesByFile = await Promise.all(
    files.map(async (file, fileIndex) => {
      const bytes = await file.arrayBuffer();
      const inputPdf = await PDFDocument.load(bytes, { ignoreEncryption: true });
      const totalPagesInFile = inputPdf.getPageCount();

      return Array.from({ length: totalPagesInFile }, (_, pageIndex) => ({
        id: getPdfPageAssignmentKey(fileIndex, pageIndex),
        fileIndex,
        pageIndex,
        pageNumber: pageIndex + 1,
        totalPagesInFile,
        fileName: file.name,
      }));
    }),
  );

  return pagesByFile.flat();
}
