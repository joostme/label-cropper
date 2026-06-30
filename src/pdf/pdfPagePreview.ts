import { getDocument, GlobalWorkerOptions } from "pdfjs-dist";
import workerSrc from "pdfjs-dist/build/pdf.worker.min.mjs?url";

GlobalWorkerOptions.workerSrc = workerSrc;

const MAX_PREVIEW_WIDTH = 1100;

export type PdfPagePreview = {
  imageUrl: string;
  imageWidth: number;
  imageHeight: number;
  pageWidth: number;
  pageHeight: number;
};

export async function renderFirstPdfPagePreview(file: File): Promise<PdfPagePreview> {
  const bytes = new Uint8Array(await file.arrayBuffer());
  const loadingTask = getDocument({ data: bytes });
  const pdfDocument = await loadingTask.promise;

  try {
    const page = await pdfDocument.getPage(1);
    const baseViewport = page.getViewport({ scale: 1 });
    const rotation = baseViewport.width < baseViewport.height ? 90 : 0;
    const normalizedViewport = page.getViewport({ scale: 1, rotation });
    const scale = Math.min(2, MAX_PREVIEW_WIDTH / normalizedViewport.width);
    const viewport = page.getViewport({ scale, rotation });
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");

    if (!context) {
      throw new Error("Could not create a canvas context for the PDF preview.");
    }

    canvas.width = Math.ceil(viewport.width);
    canvas.height = Math.ceil(viewport.height);

    await page.render({
      canvasContext: context,
      viewport,
    }).promise;

    const imageUrl = await canvasToObjectUrl(canvas);

    return {
      imageUrl,
      imageWidth: canvas.width,
      imageHeight: canvas.height,
      pageWidth: normalizedViewport.width,
      pageHeight: normalizedViewport.height,
    };
  } finally {
    await pdfDocument.cleanup();
    await loadingTask.destroy();
  }
}

async function canvasToObjectUrl(canvas: HTMLCanvasElement): Promise<string> {
  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((result) => {
      if (!result) {
        reject(new Error("Could not create the PDF preview image."));
        return;
      }

      resolve(result);
    }, "image/png");
  });

  return URL.createObjectURL(blob);
}
