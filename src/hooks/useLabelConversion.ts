import { useEffect, useRef, useState } from "react";
import type { MutableRefObject } from "react";
import { convertLabels, LabelPreset, makePdfBlobUrl } from "../pdf/labelCropper";

export type ConversionState = {
  pdfUrl: string | null;
  pdfBytes: Uint8Array | null;
  pages: number;
  rotatedPages: number;
  busy: boolean;
  error: string | null;
};

const initialConversionState: ConversionState = {
  pdfUrl: null,
  pdfBytes: null,
  pages: 0,
  rotatedPages: 0,
  busy: false,
  error: null,
};

export function useLabelConversion(files: File[], preset: LabelPreset) {
  const conversionRequestRef = useRef(0);
  const [conversion, setConversion] = useState<ConversionState>(initialConversionState);

  useEffect(() => {
    return () => {
      if (conversion.pdfUrl) {
        URL.revokeObjectURL(conversion.pdfUrl);
      }
    };
  }, [conversion.pdfUrl]);

  useEffect(() => {
    if (files.length === 0) {
      invalidatePendingConversion(conversionRequestRef);
      setConversion(initialConversionState);
      return;
    }

    const requestId = conversionRequestRef.current;
    setConversion((current) => ({ ...current, busy: true, error: null }));

    const timeoutId = window.setTimeout(() => {
      void (async () => {
        try {
          const result = await convertLabels(files, preset);
          if (conversionRequestRef.current !== requestId) {
            return;
          }

          setConversion({
            pdfBytes: result.outputBytes,
            pdfUrl: makePdfBlobUrl(result.outputBytes),
            pages: result.pages,
            rotatedPages: result.rotatedPages,
            busy: false,
            error: null,
          });
        } catch (error) {
          if (conversionRequestRef.current !== requestId) {
            return;
          }

          setConversion((current) => ({
            ...current,
            busy: false,
            error: error instanceof Error ? error.message : "Could not convert this PDF.",
          }));
        }
      })();
    }, 180);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [files, preset]);

  return conversion;
}

function invalidatePendingConversion(conversionRequestRef: MutableRefObject<number>) {
  conversionRequestRef.current += 1;
}
