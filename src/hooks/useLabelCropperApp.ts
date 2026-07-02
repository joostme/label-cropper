import { useMemo, useState } from "react";
import {
  DEFAULT_LABEL_PRESET,
  findLabelPresetForFiles,
  formatOutputSizeSlug,
  LabelPreset,
  LABEL_PRESETS,
  makePdfBlobUrl,
  OutputUnit,
} from "../pdf/labelCropper";
import { useLabelConversion } from "./useLabelConversion";
import { loadCustomLabelPresets, saveCustomLabelPresets } from "../presetStorage";
import { clonePreset, createPresetId } from "../presets/presetUtils";

const OUTPUT_UNIT_STORAGE_KEY = "label-cropper/output-unit/v1";

export function useLabelCropperApp() {
  const [files, setFiles] = useState<File[]>([]);
  const [fileInputResetKey, setFileInputResetKey] = useState(0);
  const [customPresets, setCustomPresets] = useState<LabelPreset[]>(() => loadCustomLabelPresets());
  const [selectedPresetId, setSelectedPresetId] = useState(DEFAULT_LABEL_PRESET.id);
  const [outputUnit, setOutputUnit] = useState<OutputUnit>(() => loadOutputUnitPreference());

  const availablePresets = useMemo(() => [...LABEL_PRESETS, ...customPresets], [customPresets]);
  const presetsForDetection = useMemo(() => [...customPresets, ...LABEL_PRESETS], [customPresets]);
  const selectedPreset = useMemo(
    () => availablePresets.find((preset) => preset.id === selectedPresetId) ?? DEFAULT_LABEL_PRESET,
    [availablePresets, selectedPresetId],
  );
  const conversion = useLabelConversion(files, selectedPreset);
  const isCustomPresetSelected = customPresets.some((preset) => preset.id === selectedPresetId);
  const hasResult = Boolean(conversion.pdfBytes && conversion.pdfUrl);
  const outputName = useMemo(() => {
    const sizeLabel = formatOutputSizeSlug(selectedPreset.output);

    if (files.length === 1) {
      return files[0].name.replace(/\.pdf$/i, `-${sizeLabel}.pdf`);
    }

    return `${files.length}-labels-${new Date().toISOString().slice(0, 10)}-${sizeLabel}.pdf`;
  }, [files, selectedPreset.output]);
  const firstFile = files[0] ?? null;

  function applyFiles(nextFiles: File[]) {
    const detectedPreset = findLabelPresetForFiles(nextFiles, presetsForDetection, selectedPreset);
    setFiles(nextFiles);
    setSelectedPresetId(detectedPreset.id);
  }

  function selectPreset(presetId: string) {
    setSelectedPresetId(presetId);
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

    const updatedPresets = customPresets.filter((preset) => preset.id !== selectedPresetId);
    saveCustomLabelPresets(updatedPresets);
    setCustomPresets(updatedPresets);
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
    setFileInputResetKey((current) => current + 1);
  }

  return {
    files,
    firstFile,
    fileInputResetKey,
    conversion,
    customPresets,
    availablePresets,
    selectedPresetId,
    selectedPreset,
    outputUnit,
    isCustomPresetSelected,
    hasResult,
    applyFiles,
    selectPreset,
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
