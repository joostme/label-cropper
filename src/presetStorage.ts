import { LabelPreset, normalizeOutputSize } from "./pdf/labelCropper";

const STORAGE_KEY = "label-cropper/custom-presets/v2";
const LEGACY_STORAGE_KEY = "label-cropper/custom-presets/v1";

export function loadCustomLabelPresets(): LabelPreset[] {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const rawValue = window.localStorage.getItem(STORAGE_KEY) ?? window.localStorage.getItem(LEGACY_STORAGE_KEY);
    if (!rawValue) {
      return [];
    }

    const parsedValue = JSON.parse(rawValue);
    if (!Array.isArray(parsedValue)) {
      return [];
    }

    return parsedValue.flatMap((entry) => {
      const preset = toLabelPreset(entry);
      return preset ? [preset] : [];
    });
  } catch {
    return [];
  }
}

export function saveCustomLabelPresets(presets: LabelPreset[]) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(presets));
}

function toLabelPreset(value: unknown): LabelPreset | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const entry = value as Partial<LabelPreset>;
  const crop = entry.crop;
  const output = normalizeOutputSize(entry.output);
  if (
    typeof entry.id !== "string" ||
    typeof entry.name !== "string" ||
    !crop ||
    typeof crop.x !== "number" ||
    typeof crop.y !== "number" ||
    typeof crop.width !== "number" ||
    typeof crop.height !== "number"
  ) {
    return null;
  }

  return {
    id: entry.id,
    name: entry.name,
    filenameHints: Array.isArray(entry.filenameHints)
      ? entry.filenameHints.filter((hint): hint is string => typeof hint === "string" && hint.trim().length > 0)
      : undefined,
    crop: {
      x: crop.x,
      y: crop.y,
      width: crop.width,
      height: crop.height,
    },
    output,
  };
}
