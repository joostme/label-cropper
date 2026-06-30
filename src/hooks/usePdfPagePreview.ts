import { useEffect, useState } from "react";
import { PdfPagePreview, renderFirstPdfPagePreview } from "../pdf/pdfPagePreview";

type PdfPagePreviewState = {
  preview: PdfPagePreview | null;
  loading: boolean;
  error: string | null;
};

const initialState: PdfPagePreviewState = {
  preview: null,
  loading: false,
  error: null,
};

export function usePdfPagePreview(file: File | null) {
  const [state, setState] = useState<PdfPagePreviewState>(initialState);

  useEffect(() => {
    if (!file) {
      setState(initialState);
      return;
    }

    let cancelled = false;
    let currentUrl: string | null = null;

    setState((current) => ({
      ...current,
      loading: true,
      error: null,
    }));

    void (async () => {
      try {
        const preview = await renderFirstPdfPagePreview(file);
        if (cancelled) {
          URL.revokeObjectURL(preview.imageUrl);
          return;
        }

        currentUrl = preview.imageUrl;
        setState({
          preview,
          loading: false,
          error: null,
        });
      } catch (error) {
        if (cancelled) {
          return;
        }

        setState({
          preview: null,
          loading: false,
          error: error instanceof Error ? error.message : "Could not render the source preview.",
        });
      }
    })();

    return () => {
      cancelled = true;
      if (currentUrl) {
        URL.revokeObjectURL(currentUrl);
      }
    };
  }, [file]);

  return state;
}
