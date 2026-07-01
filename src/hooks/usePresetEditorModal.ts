import { useMemo, useState } from "react";
import { LabelPreset } from "../pdf/labelCropper";
import { clampCropToBounds } from "../presets/cropBoxMath";
import { alignPresetToLabelAspect, clonePreset, CropField, formatFilenameHints, parseFilenameHints } from "../presets/presetUtils";

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
  const [draft, setDraft] = useState<LabelPreset>(() => alignPresetToLabelAspect(selectedPreset));
  const [sourcePresetId, setSourcePresetId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const canSave =
    draft.name.trim().length > 0 &&
    draft.crop.width > 0 &&
    draft.crop.height > 0;
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
    setMode("create");
    setSourcePresetId(null);
    setAspectLockEnabled(true);
    setDraft({
      ...alignPresetToLabelAspect(selectedPreset),
      id: "",
      name: "",
    });
    setError(null);
    setOpen(true);
  }

  function openDuplicate() {
    setMode("duplicate");
    setSourcePresetId(null);
    setAspectLockEnabled(true);
    setDraft({
      ...alignPresetToLabelAspect(selectedPreset),
      id: "",
      name: `${selectedPreset.name} Copy`,
    });
    setError(null);
    setOpen(true);
  }

  function openEdit() {
    setMode(isCustomPresetSelected ? "edit" : "edit-template");
    setSourcePresetId(isCustomPresetSelected ? selectedPreset.id : null);
    setAspectLockEnabled(true);
    setDraft(alignPresetToLabelAspect(selectedPreset));
    setError(null);
    setOpen(true);
  }

  function close() {
    setOpen(false);
    setError(null);
  }

  function updatePresetName(name: string) {
    setDraft((current) => ({ ...current, name }));
    setError(null);
  }

  function updateFilenameHints(value: string) {
    setDraft((current) => ({
      ...current,
      filenameHints: parseFilenameHints(value),
    }));
    setError(null);
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

    setDraft((current) => {
      const nextDraft = {
        ...current,
        crop: {
          ...current.crop,
          [field]: value,
        },
      };

      return aspectLockEnabled && (field === "width" || field === "height")
        ? alignPresetToLabelAspect(nextDraft, field)
        : nextDraft;
    });
    setError(null);
  }

  function setCrop(crop: LabelPreset["crop"]) {
    setDraft((current) => ({
      ...current,
      crop: clampCropToBounds(crop),
    }));
    setError(null);
  }

  function toggleAspectLock() {
    setAspectLockEnabled((current) => {
      const nextValue = !current;
      if (nextValue) {
        setDraft((draftValue) => alignPresetToLabelAspect(draftValue));
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
    setCrop,
    toggleAspectLock,
    save,
  };
}
