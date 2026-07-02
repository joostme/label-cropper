import { useMemo, useState } from "react";
import { LabelPreset } from "../pdf/labelCropper";
import { clampCropToBounds } from "../presets/cropBoxMath";
import {
  alignPresetToOutputAspect,
  clonePreset,
  CropField,
  formatFilenameHints,
  OutputField,
  parseFilenameHints,
} from "../presets/presetUtils";

type PresetEditorMode = "create" | "duplicate" | "edit" | "edit-template";

type UsePresetEditorModalParams = {
  selectedPreset: LabelPreset;
  isCustomPresetSelected: boolean;
  onSavePreset: (preset: LabelPreset, existingPresetId?: string) => { savedPreset: LabelPreset; message: string };
};

export function usePresetEditorModal({ selectedPreset, isCustomPresetSelected, onSavePreset }: UsePresetEditorModalParams) {
  const [isOpen, setOpen] = useState(false);
  const [mode, setMode] = useState<PresetEditorMode>("create");
  const [aspectLockEnabled, setAspectLockEnabled] = useState(true);
  const [draft, setDraft] = useState<LabelPreset>(() => alignPresetToOutputAspect(selectedPreset));
  const [sourcePresetId, setSourcePresetId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const canSave =
    draft.name.trim().length > 0 &&
    draft.crop.width > 0 &&
    draft.crop.height > 0 &&
    draft.output.widthMm > 0 &&
    draft.output.heightMm > 0;
  const presetHintValue = formatFilenameHints(draft.filenameHints);

  const modalTitle = useMemo(() => {
    if (mode === "duplicate") return "Duplicate preset";
    if (mode === "edit") return "Edit preset";
    if (mode === "edit-template") return "Customize built-in preset";
    return "Create preset";
  }, [mode]);

  const primaryActionLabel = useMemo(() => {
    return mode === "edit" ? "Update preset" : "Save preset";
  }, [mode]);

  function openCreate() {
    openWithDraft(
      "create",
      {
        ...alignPresetToOutputAspect(selectedPreset),
        id: "",
        name: "",
      },
      null,
    );
  }

  function openDuplicate() {
    openWithDraft(
      "duplicate",
      {
        ...alignPresetToOutputAspect(selectedPreset),
        id: "",
        name: `${selectedPreset.name} Copy`,
      },
      null,
    );
  }

  function openEdit() {
    openWithDraft(
      isCustomPresetSelected ? "edit" : "edit-template",
      alignPresetToOutputAspect(selectedPreset),
      isCustomPresetSelected ? selectedPreset.id : null,
    );
  }

  function close() {
    setOpen(false);
    setError(null);
  }

  function updatePresetName(name: string) {
    updateDraft((current) => ({ ...current, name }));
  }

  function updateFilenameHints(value: string) {
    updateDraft((current) => ({
      ...current,
      filenameHints: parseFilenameHints(value),
    }));
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

    updateDraft((current) => {
      const nextDraft = {
        ...current,
        crop: {
          ...current.crop,
          [field]: value,
        },
      };

      return aspectLockEnabled && (field === "width" || field === "height")
        ? alignPresetToOutputAspect(nextDraft, field)
        : nextDraft;
    });
  }

  function updateOutput(field: OutputField, value: number) {
    if (!Number.isFinite(value) || value <= 0) {
      return;
    }

    updateDraft((current) => {
      const nextDraft = {
        ...current,
        output: {
          ...current.output,
          [field]: value,
        },
      };

      return aspectLockEnabled ? alignPresetToOutputAspect(nextDraft) : nextDraft;
    });
  }

  function setCrop(crop: LabelPreset["crop"]) {
    updateDraft((current) => ({
      ...current,
      crop: clampCropToBounds(crop),
    }));
  }

  function toggleAspectLock() {
    setAspectLockEnabled((current) => {
      const nextValue = !current;
      if (nextValue) {
        setDraft((draftValue) => alignPresetToOutputAspect(draftValue));
      }
      return nextValue;
    });
    setError(null);
  }

  function save() {
    const trimmedName = draft.name.trim();
    if (!trimmedName) {
      setError("Preset name is required.");
      return;
    }

    if (draft.crop.width <= 0 || draft.crop.height <= 0) {
      setError("Width and height must be greater than zero.");
      return;
    }

    if (draft.output.widthMm <= 0 || draft.output.heightMm <= 0) {
      setError("Output width and height must be greater than zero.");
      return;
    }

    onSavePreset(
      {
        ...clonePreset(draft),
        name: trimmedName,
      },
      mode === "edit" ? sourcePresetId ?? undefined : undefined,
    );

    setOpen(false);
    setError(null);
  }

  return {
    isOpen,
    draft,
    presetHintValue,
    aspectLockEnabled,
    canSave,
    error,
    modalTitle,
    primaryActionLabel,
    openCreate,
    openDuplicate,
    openEdit,
    close,
    updatePresetName,
    updateFilenameHints,
    updateCrop,
    updateOutput,
    setCrop,
    toggleAspectLock,
    save,
  };

  function openWithDraft(nextMode: PresetEditorMode, nextDraft: LabelPreset, nextSourcePresetId: string | null) {
    setMode(nextMode);
    setSourcePresetId(nextSourcePresetId);
    setAspectLockEnabled(true);
    setDraft(nextDraft);
    setError(null);
    setOpen(true);
  }

  function updateDraft(updater: (current: LabelPreset) => LabelPreset) {
    setDraft(updater);
    setError(null);
  }
}
