import { useEffect, useMemo, useState } from "react";
import {
  DEFAULT_LABEL_PRESET,
  findLabelPresetForFiles,
  formatOutputSizeSlug,
  getPdfPageAssignmentKey,
  LabelPreset,
  LABEL_PRESETS,
  makePdfBlobUrl,
  OutputUnit,
  outputSizesMatch,
  PdfPageAssignment,
} from "../pdf/labelCropper";
import { useLabelConversion } from "./useLabelConversion";
import { loadCustomLabelPresets, saveCustomLabelPresets } from "../presetStorage";
import { clonePreset, createPresetId } from "../presets/presetUtils";
import { inspectPdfFiles, PdfPageManifestEntry } from "../pdf/pdfPageManifest";

const OUTPUT_UNIT_STORAGE_KEY = "label-cropper/output-unit/v1";
const OUTPUT_SIZE_MISMATCH_ERROR = "Assigned presets use different output page sizes. Choose presets with the same output size before exporting.";

type AssignedPdfPage = PdfPageManifestEntry & {
  presetId: string;
};

export function useLabelCropperApp() {
  const [files, setFiles] = useState<File[]>([]);
  const [fileInputResetKey, setFileInputResetKey] = useState(0);
  const [customPresets, setCustomPresets] = useState<LabelPreset[]>(() => loadCustomLabelPresets());
  const [selectedPresetId, setSelectedPresetId] = useState(DEFAULT_LABEL_PRESET.id);
  const [initialAssignmentPresetId, setInitialAssignmentPresetId] = useState(DEFAULT_LABEL_PRESET.id);
  const [outputUnit, setOutputUnit] = useState<OutputUnit>(() => loadOutputUnitPreference());
  const [pageManifest, setPageManifest] = useState<PdfPageManifestEntry[]>([]);
  const [pageAssignments, setPageAssignments] = useState<PdfPageAssignment[]>([]);
  const [pageManifestBusy, setPageManifestBusy] = useState(false);
  const [pageManifestError, setPageManifestError] = useState<string | null>(null);

  const availablePresets = useMemo(() => [...LABEL_PRESETS, ...customPresets], [customPresets]);
  const presetsForDetection = useMemo(() => [...customPresets, ...LABEL_PRESETS], [customPresets]);
  const selectedPreset = useMemo(
    () => availablePresets.find((preset) => preset.id === selectedPresetId) ?? DEFAULT_LABEL_PRESET,
    [availablePresets, selectedPresetId],
  );
  const pageAssignmentsByKey = useMemo(
    () => new Map(pageAssignments.map((assignment) => [getPdfPageAssignmentKey(assignment.fileIndex, assignment.pageIndex), assignment])),
    [pageAssignments],
  );
  const assignedPages = useMemo<AssignedPdfPage[]>(
    () =>
      pageManifest.map((page) => ({
        ...page,
        presetId: pageAssignmentsByKey.get(page.id)?.presetId ?? initialAssignmentPresetId,
      })),
    [initialAssignmentPresetId, pageAssignmentsByKey, pageManifest],
  );
  const assignedPresets = useMemo(
    () =>
      assignedPages
        .map((page) => availablePresets.find((preset) => preset.id === page.presetId))
        .filter((preset): preset is LabelPreset => Boolean(preset)),
    [assignedPages, availablePresets],
  );
  const hasOutputSizeMismatch = useMemo(() => {
    if (assignedPresets.length <= 1) {
      return false;
    }

    const [firstPreset, ...otherPresets] = assignedPresets;
    return otherPresets.some((preset) => !outputSizesMatch(firstPreset.output, preset.output));
  }, [assignedPresets]);
  const sharedOutputSize = useMemo(() => {
    if (hasOutputSizeMismatch) {
      return null;
    }

    return assignedPresets[0]?.output ?? selectedPreset.output;
  }, [assignedPresets, hasOutputSizeMismatch, selectedPreset.output]);
  const pageAssignmentsReady = files.length === 0 || (!pageManifestBusy && pageManifest.length > 0 && pageAssignments.length === pageManifest.length);
  const assignmentValidationError = pageManifestError ?? (hasOutputSizeMismatch ? OUTPUT_SIZE_MISMATCH_ERROR : null);
  const conversion = useLabelConversion(files, pageAssignments, availablePresets, pageAssignmentsReady, assignmentValidationError);
  const isCustomPresetSelected = customPresets.some((preset) => preset.id === selectedPresetId);
  const hasResult = Boolean(conversion.pdfBytes && conversion.pdfUrl);
  const outputName = useMemo(() => {
    const sizeLabel = formatOutputSizeSlug(sharedOutputSize ?? selectedPreset.output);

    if (files.length === 1) {
      return files[0].name.replace(/\.pdf$/i, `-${sizeLabel}.pdf`);
    }

    return `${files.length}-labels-${new Date().toISOString().slice(0, 10)}-${sizeLabel}.pdf`;
  }, [files, selectedPreset.output, sharedOutputSize]);
  const firstFile = files[0] ?? null;

  useEffect(() => {
    if (files.length === 0) {
      setPageManifest([]);
      setPageAssignments([]);
      setPageManifestBusy(false);
      setPageManifestError(null);
      return;
    }

    let cancelled = false;

    setPageManifest([]);
    setPageAssignments([]);
    setPageManifestBusy(true);
    setPageManifestError(null);

    void (async () => {
      try {
        const nextPageManifest = await inspectPdfFiles(files);
        if (cancelled) {
          return;
        }

        setPageManifest(nextPageManifest);
        setPageAssignments(
          nextPageManifest.map((page) => ({
            fileIndex: page.fileIndex,
            pageIndex: page.pageIndex,
            presetId: initialAssignmentPresetId,
          })),
        );
        setPageManifestBusy(false);
      } catch (error) {
        if (cancelled) {
          return;
        }

        setPageManifest([]);
        setPageAssignments([]);
        setPageManifestBusy(false);
        setPageManifestError(error instanceof Error ? error.message : "Could not read the uploaded PDF pages.");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [files, initialAssignmentPresetId]);

  function applyFiles(nextFiles: File[]) {
    const detectedPreset = findLabelPresetForFiles(nextFiles, presetsForDetection, selectedPreset);
    setFiles(nextFiles);
    setSelectedPresetId(detectedPreset.id);
    setInitialAssignmentPresetId(detectedPreset.id);
  }

  function selectPreset(presetId: string) {
    setSelectedPresetId(presetId);
  }

  function updatePagePreset(fileIndex: number, pageIndex: number, presetId: string) {
    setPageAssignments((currentAssignments) =>
      currentAssignments.map((assignment) =>
        assignment.fileIndex === fileIndex && assignment.pageIndex === pageIndex ? { ...assignment, presetId } : assignment,
      ),
    );
  }

  function applySelectedPresetToAllPages() {
    setPageAssignments((currentAssignments) => currentAssignments.map((assignment) => ({ ...assignment, presetId: selectedPresetId })));
  }

  function updateOutputUnit(nextUnit: OutputUnit) {
    setOutputUnit(nextUnit);

    if (typeof window !== "undefined") {
      window.localStorage.setItem(OUTPUT_UNIT_STORAGE_KEY, nextUnit);
    }
  }

  function savePresetDefinition(preset: LabelPreset, existingPresetId?: string) {
    if (existingPresetId) {
      const updatedPreset = { ...clonePreset(preset), id: existingPresetId };
      const nextPresets = customPresets.map((entry) => (entry.id === existingPresetId ? updatedPreset : entry));
      saveCustomLabelPresets(nextPresets);
      setCustomPresets(nextPresets);
      setSelectedPresetId(updatedPreset.id);

      return {
        savedPreset: updatedPreset,
        message: "Preset updated on this device.",
      };
    }

    const savedPreset = {
      ...clonePreset(preset),
      id: createPresetId(preset.name.trim(), availablePresets),
    };
    const updatedPresets = [...customPresets, savedPreset];
    saveCustomLabelPresets(updatedPresets);
    setCustomPresets(updatedPresets);
    setSelectedPresetId(savedPreset.id);

    return {
      savedPreset,
      message: "Preset saved on this device.",
    };
  }

  function deleteSelectedPreset() {
    if (!isCustomPresetSelected) {
      return false;
    }

    const presetIdToDelete = selectedPresetId;
    const updatedPresets = customPresets.filter((preset) => preset.id !== selectedPresetId);
    saveCustomLabelPresets(updatedPresets);
    setCustomPresets(updatedPresets);
    setPageAssignments((currentAssignments) =>
      currentAssignments.map((assignment) =>
        assignment.presetId === presetIdToDelete ? { ...assignment, presetId: DEFAULT_LABEL_PRESET.id } : assignment,
      ),
    );
    setInitialAssignmentPresetId((currentPresetId) => (currentPresetId === presetIdToDelete ? DEFAULT_LABEL_PRESET.id : currentPresetId));
    setSelectedPresetId(DEFAULT_LABEL_PRESET.id);
    return true;
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
    setFiles([]);
    setSelectedPresetId(DEFAULT_LABEL_PRESET.id);
    setInitialAssignmentPresetId(DEFAULT_LABEL_PRESET.id);
    setFileInputResetKey((current) => current + 1);
  }

  return {
    files,
    firstFile,
    fileInputResetKey,
    conversion,
    customPresets,
    availablePresets,
    assignedPages,
    pageManifestBusy,
    pageManifestError,
    sharedOutputSize,
    selectedPresetId,
    selectedPreset,
    outputUnit,
    isCustomPresetSelected,
    hasResult,
    applyFiles,
    selectPreset,
    updatePagePreset,
    applySelectedPresetToAllPages,
    updateOutputUnit,
    savePresetDefinition,
    deleteSelectedPreset,
    downloadPdf,
    openPdfForPrinting,
    reset,
  };
}

function loadOutputUnitPreference(): OutputUnit {
  if (typeof window === "undefined") {
    return "in";
  }

  const rawValue = window.localStorage.getItem(OUTPUT_UNIT_STORAGE_KEY);
  return rawValue === "mm" || rawValue === "in" ? rawValue : "in";
}
