import { CropPreset, LabelPreset } from "../pdf/labelCropper";

export type CropField = keyof LabelPreset["crop"];
export type AspectLockAnchor = "bestFit" | "width" | "height";

const LABEL_ASPECT_RATIO = 4 / 6;

export function clonePreset(preset: LabelPreset): LabelPreset {
  return {
    id: preset.id,
    name: preset.name,
    filenameHints: preset.filenameHints ? [...preset.filenameHints] : undefined,
    crop: { ...preset.crop },
  };
}

export function parseFilenameHints(value: string): string[] | undefined {
  const hints = value
    .split(",")
    .map((hint) => hint.trim())
    .filter(Boolean);

  return hints.length > 0 ? hints : undefined;
}

export function formatFilenameHints(hints?: string[]): string {
  return hints?.join(", ") ?? "";
}

export function presetsMatch(left: LabelPreset, right: LabelPreset): boolean {
  return (
    left.name === right.name &&
    left.crop.x === right.crop.x &&
    left.crop.y === right.crop.y &&
    left.crop.width === right.crop.width &&
    left.crop.height === right.crop.height &&
    formatFilenameHints(left.filenameHints) === formatFilenameHints(right.filenameHints)
  );
}

export function createPresetId(name: string, presets: LabelPreset[]): string {
  const baseId = slugifyPresetName(name);
  const takenIds = new Set(presets.map((preset) => preset.id));

  if (!takenIds.has(baseId)) {
    return baseId;
  }

  let suffix = 2;
  while (takenIds.has(`${baseId}-${suffix}`)) {
    suffix += 1;
  }

  return `${baseId}-${suffix}`;
}

export function alignCropToLabelAspect(crop: CropPreset, anchor: AspectLockAnchor = "bestFit"): CropPreset {
  if (crop.width <= 0 || crop.height <= 0) {
    return crop;
  }

  if (anchor === "width") {
    return {
      ...crop,
      height: Math.max(1, Math.round(crop.width / LABEL_ASPECT_RATIO)),
    };
  }

  if (anchor === "height") {
    return {
      ...crop,
      width: Math.max(1, Math.round(crop.height * LABEL_ASPECT_RATIO)),
    };
  }

  const widthAlignedCrop = alignCropToLabelAspect(crop, "height");
  const heightAlignedCrop = alignCropToLabelAspect(crop, "width");
  const widthChange = Math.abs(widthAlignedCrop.width - crop.width) / crop.width;
  const heightChange = Math.abs(heightAlignedCrop.height - crop.height) / crop.height;

  return widthChange <= heightChange ? widthAlignedCrop : heightAlignedCrop;
}

export function alignPresetToLabelAspect(preset: LabelPreset, anchor: AspectLockAnchor = "bestFit"): LabelPreset {
  return {
    ...clonePreset(preset),
    crop: alignCropToLabelAspect(preset.crop, anchor),
  };
}

function slugifyPresetName(name: string): string {
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return slug || "custom-label-preset";
}
