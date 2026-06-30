import { useEffect, useMemo, useRef, useState } from "react";
import type { Dispatch, MutableRefObject, SetStateAction } from "react";
import {
  convertLabels,
  DEFAULT_LABEL_PRESET,
  findLabelPresetForFiles,
  LabelPreset,
  LABEL_PRESETS,
  makePdfBlobUrl,
} from "../pdf/labelCropper";
import { loadCustomLabelPresets, saveCustomLabelPresets } from "../presetStorage";
import {
  alignPresetToLabelAspect,
  clonePreset,
  createPresetId,
  CropField,
  formatFilenameHints,
  parseFilenameHints,
  presetsMatch,
} from "../presets/presetUtils";
import { CropPreset } from "../pdf/labelCropper";
import { clampCropToBounds } from "../presets/cropBoxMath";

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

export function useLabelCropperApp() {
  const conversionRequestRef = useRef(0);
  const [files, setFiles] = useState<File[]>([]);
  const [fileInputResetKey, setFileInputResetKey] = useState(0);
  const [conversion, setConversion] = useState<ConversionState>(initialConversionState);
  const [customPresets, setCustomPresets] = useState<LabelPreset[]>(() => loadCustomLabelPresets());
  const [selectedPresetId, setSelectedPresetId] = useState(DEFAULT_LABEL_PRESET.id);
  const [presetDraft, setPresetDraft] = useState<LabelPreset>(() => alignPresetToLabelAspect(DEFAULT_LABEL_PRESET));
  const [aspectLockEnabled, setAspectLockEnabled] = useState(true);
  const [presetMessage, setPresetMessage] = useState<string | null>(null);
  const [presetError, setPresetError] = useState<string | null>(null);

  const availablePresets = useMemo(() => [...LABEL_PRESETS, ...customPresets], [customPresets]);
  const presetsForDetection = useMemo(() => [...customPresets, ...LABEL_PRESETS], [customPresets]);
  const selectedSavedPreset = useMemo(
    () => availablePresets.find((preset) => preset.id === selectedPresetId) ?? DEFAULT_LABEL_PRESET,
    [availablePresets, selectedPresetId],
  );
  const comparableSelectedPreset = useMemo(
    () => (aspectLockEnabled ? alignPresetToLabelAspect(selectedSavedPreset) : selectedSavedPreset),
    [aspectLockEnabled, selectedSavedPreset],
  );
  const isCustomPresetSelected = customPresets.some((preset) => preset.id === selectedPresetId);
  const hasResult = Boolean(conversion.pdfBytes && conversion.pdfUrl);
  const hasUnsavedPresetChanges = !presetsMatch(presetDraft, comparableSelectedPreset);
  const presetHintValue = formatFilenameHints(presetDraft.filenameHints);
  const canSavePreset =
    presetDraft.name.trim().length > 0 &&
    presetDraft.crop.width > 0 &&
    presetDraft.crop.height > 0 &&
    (isCustomPresetSelected ? hasUnsavedPresetChanges : true);
  const outputName = useMemo(() => {
    if (files.length === 1) {
      return files[0].name.replace(/\.pdf$/i, "-4x6.pdf");
    }

    return `${files.length}-labels-${new Date().toISOString().slice(0, 10)}-4x6.pdf`;
  }, [files]);
  const firstFile = files[0] ?? null;

  useEffect(() => {
    return () => {
      if (conversion.pdfUrl) {
        URL.revokeObjectURL(conversion.pdfUrl);
      }
    };
  }, [conversion.pdfUrl]);

  useEffect(() => {
    if (files.length === 0) {
      return;
    }

    const requestId = conversionRequestRef.current;
    setConversion((current) => ({ ...current, busy: true, error: null }));

    const timeoutId = window.setTimeout(() => {
      void (async () => {
        try {
          const result = await convertLabels(files, presetDraft);
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
  }, [files, presetDraft.crop.height, presetDraft.crop.width, presetDraft.crop.x, presetDraft.crop.y]);

  function applyFiles(nextFiles: File[]) {
    invalidatePendingConversion(conversionRequestRef);
    const detectedPreset = findLabelPresetForFiles(nextFiles, presetsForDetection, presetDraft);
    setFiles(nextFiles);
    setSelectedPresetId(detectedPreset.id);
    setPresetDraft(aspectLockEnabled ? alignPresetToLabelAspect(detectedPreset) : clonePreset(detectedPreset));
    clearPresetFeedback(setPresetError, setPresetMessage);
  }

  function selectPreset(presetId: string) {
    const nextPreset = availablePresets.find((preset) => preset.id === presetId) ?? DEFAULT_LABEL_PRESET;
    invalidatePendingConversion(conversionRequestRef);
    setSelectedPresetId(nextPreset.id);
    setPresetDraft(aspectLockEnabled ? alignPresetToLabelAspect(nextPreset) : clonePreset(nextPreset));
    clearPresetFeedback(setPresetError, setPresetMessage);
  }

  function updatePresetName(name: string) {
    setPresetDraft((current) => ({ ...current, name }));
    clearPresetFeedback(setPresetError, setPresetMessage);
  }

  function updateFilenameHints(value: string) {
    setPresetDraft((current) => ({
      ...current,
      filenameHints: parseFilenameHints(value),
    }));
    clearPresetFeedback(setPresetError, setPresetMessage);
  }

  function updateCrop(field: CropField, value: number) {
    if (!Number.isFinite(value)) {
      return;
    }

    if ((field === "x" || field === "y") && value < 0) {
      return;
    }

    if ((field === "width" || field === "height") && value <= 0) {
      return;
    }

    invalidatePendingConversion(conversionRequestRef);
    setPresetDraft((current) => ({
      ...current,
      crop: {
        ...(field === "width" && aspectLockEnabled
          ? alignPresetToLabelAspect(
              {
                ...current,
                crop: {
                  ...current.crop,
                  width: value,
                },
              },
              "width",
            ).crop
          : field === "height" && aspectLockEnabled
            ? alignPresetToLabelAspect(
                {
                  ...current,
                  crop: {
                    ...current.crop,
                    height: value,
                  },
                },
                "height",
              ).crop
            : {
                ...current.crop,
                [field]: value,
              }),
      },
    }));
    clearPresetFeedback(setPresetError, setPresetMessage);
  }

  function setCrop(crop: CropPreset) {
    invalidatePendingConversion(conversionRequestRef);
    setPresetDraft((current) => ({
      ...current,
      crop: clampCropToBounds(crop),
    }));
    clearPresetFeedback(setPresetError, setPresetMessage);
  }

  function toggleAspectLock() {
    const nextValue = !aspectLockEnabled;
    setAspectLockEnabled(nextValue);
    if (nextValue) {
      setPresetDraft((current) => alignPresetToLabelAspect(current));
    }
    clearPresetFeedback(setPresetError, setPresetMessage);
  }

  function savePreset() {
    const trimmedName = presetDraft.name.trim();
    if (!trimmedName) {
      setPresetError("Preset name is required.");
      setPresetMessage(null);
      return;
    }

    if (presetDraft.crop.width <= 0 || presetDraft.crop.height <= 0) {
      setPresetError("Width and height must be greater than zero.");
      setPresetMessage(null);
      return;
    }

    const normalizedPreset: LabelPreset = {
      ...clonePreset(presetDraft),
      name: trimmedName,
      filenameHints: parseFilenameHints(presetHintValue),
    };

    if (isCustomPresetSelected) {
      const updatedPresets = customPresets.map((preset) =>
        preset.id === selectedPresetId ? { ...normalizedPreset, id: selectedPresetId } : preset,
      );
      saveCustomLabelPresets(updatedPresets);
      setCustomPresets(updatedPresets);
      setPresetDraft(clonePreset({ ...normalizedPreset, id: selectedPresetId }));
      setPresetMessage("Preset updated on this device.");
      setPresetError(null);
      return;
    }

    const savedPreset = {
      ...normalizedPreset,
      id: createPresetId(trimmedName, availablePresets),
    };
    const updatedPresets = [...customPresets, savedPreset];
    saveCustomLabelPresets(updatedPresets);
    setCustomPresets(updatedPresets);
    setSelectedPresetId(savedPreset.id);
    setPresetDraft(clonePreset(savedPreset));
    setPresetMessage("Preset saved on this device.");
    setPresetError(null);
  }

  function deletePreset() {
    if (!isCustomPresetSelected) {
      return;
    }

    const updatedPresets = customPresets.filter((preset) => preset.id !== selectedPresetId);
    saveCustomLabelPresets(updatedPresets);
    setCustomPresets(updatedPresets);
    invalidatePendingConversion(conversionRequestRef);
    setSelectedPresetId(DEFAULT_LABEL_PRESET.id);
    setPresetDraft(clonePreset(DEFAULT_LABEL_PRESET));
    setPresetMessage("Preset removed from this device.");
    setPresetError(null);
  }

  function downloadPdf() {
    if (!conversion.pdfBytes) {
      return;
    }

    const link = document.createElement("a");
    link.href = makePdfBlobUrl(conversion.pdfBytes);
    link.download = outputName;
    link.click();
    URL.revokeObjectURL(link.href);
  }

  function openPdfForPrinting() {
    if (!conversion.pdfBytes) {
      return;
    }

    window.open(makePdfBlobUrl(conversion.pdfBytes), "_blank", "noopener,noreferrer");
  }

  function reset() {
    invalidatePendingConversion(conversionRequestRef);
    setFiles([]);
    setConversion(initialConversionState);
    setSelectedPresetId(DEFAULT_LABEL_PRESET.id);
    setPresetDraft(aspectLockEnabled ? alignPresetToLabelAspect(DEFAULT_LABEL_PRESET) : clonePreset(DEFAULT_LABEL_PRESET));
    setPresetMessage(null);
    setPresetError(null);
    setFileInputResetKey((current) => current + 1);
  }

  return {
    files,
    firstFile,
    fileInputResetKey,
    conversion,
    customPresets,
    selectedPresetId,
    presetDraft,
    aspectLockEnabled,
    presetHintValue,
    presetMessage,
    presetError,
    canSavePreset,
    isCustomPresetSelected,
    hasResult,
    applyFiles,
    selectPreset,
    updatePresetName,
    updateFilenameHints,
    updateCrop,
    setCrop,
    toggleAspectLock,
    savePreset,
    deletePreset,
    downloadPdf,
    openPdfForPrinting,
    reset,
  };
}

function invalidatePendingConversion(conversionRequestRef: MutableRefObject<number>) {
  conversionRequestRef.current += 1;
}

function clearPresetFeedback(
  setPresetError: Dispatch<SetStateAction<string | null>>,
  setPresetMessage: Dispatch<SetStateAction<string | null>>,
) {
  setPresetError(null);
  setPresetMessage(null);
}
