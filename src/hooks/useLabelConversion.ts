import { useEffect, useRef, useState } from "react";
import { convertLabels, convertLabelsWithPreset, LabelPreset, makePdfBlobUrl, PdfPageAssignment } from "../pdf/labelCropper";

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

const EMPTY_PAGE_ASSIGNMENTS: PdfPageAssignment[] = [];
const EMPTY_PRESETS: LabelPreset[] = [];

export function useLabelConversion(
  files: File[],
  presetOrPageAssignments: LabelPreset | PdfPageAssignment[],
  presetsOrReady?: LabelPreset[] | boolean,
  readyOrValidationError?: boolean | string | null,
  validationError: string | null = null,
) {
  const conversionRequestRef = useRef(0);
  const [conversion, setConversion] = useState<ConversionState>(initialConversionState);
  const isAssignedMode = Array.isArray(presetOrPageAssignments);
  const pageAssignments = isAssignedMode ? presetOrPageAssignments : EMPTY_PAGE_ASSIGNMENTS;
  const presets = isAssignedMode && Array.isArray(presetsOrReady) ? presetsOrReady : EMPTY_PRESETS;
  const ready = isAssignedMode ? Boolean(readyOrValidationError) : typeof presetsOrReady === "boolean" ? presetsOrReady : true;
  const resolvedValidationError =
    isAssignedMode && typeof validationError === "string"
      ? validationError
      : !isAssignedMode && typeof readyOrValidationError === "string"
        ? readyOrValidationError
        : null;

  useEffect(() => {
    return () => {
      if (conversion.pdfUrl) {
        URL.revokeObjectURL(conversion.pdfUrl);
      }
    };
  }, [conversion.pdfUrl]);

  useEffect(() => {
    const requestId = conversionRequestRef.current + 1;
    conversionRequestRef.current = requestId;

    if (files.length === 0) {
      setConversion(initialConversionState);
      return;
    }

    if (resolvedValidationError) {
      setConversion({
        ...initialConversionState,
        error: resolvedValidationError,
      });
      return;
    }

    if (!ready) {
      setConversion((current) => ({
        ...current,
        pdfBytes: null,
        pdfUrl: null,
        pages: 0,
        rotatedPages: 0,
        busy: true,
        error: null,
      }));
      return;
    }

    setConversion((current) => ({ ...current, busy: true, error: null }));

    const timeoutId = window.setTimeout(() => {
      void (async () => {
        try {
          const result = isAssignedMode
            ? await convertLabels(files, pageAssignments, presets)
            : await convertLabelsWithPreset(files, presetOrPageAssignments);
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
  }, [files, isAssignedMode, pageAssignments, presetOrPageAssignments, presets, ready, resolvedValidationError]);

  return conversion;
}
