import { CropPreset, pageBoxToPresetCrop, presetCropToPageBox } from "../pdf/labelCropper";

export type CropBoxHandle = "move" | "nw" | "ne" | "sw" | "se";

export type CropRect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

type Bounds = {
  width: number;
  height: number;
};

type ViewportTransform = [number, number, number, number, number, number];

const LABEL_ASPECT_RATIO = 4 / 6;
const MIN_CROP_SIZE = 24;

export function clampCropToBounds(crop: CropPreset): CropPreset {
  return {
    x: Math.round(crop.x),
    y: Math.round(crop.y),
    width: Math.max(1, Math.round(crop.width)),
    height: Math.max(1, Math.round(crop.height)),
  };
}

export function cropPresetToDisplayRect(
  crop: CropPreset,
  pageWidth: number,
  pageHeight: number,
  viewportTransform: ViewportTransform,
  imageWidth: number,
  imageHeight: number,
  displayWidth: number,
  displayHeight: number,
): CropRect {
  const pageBox = presetCropToPageBox(crop, pageWidth, pageHeight);
  const topLeft = applyTransform(pageBox.left, pageBox.top, viewportTransform);
  const bottomRight = applyTransform(pageBox.right, pageBox.bottom, viewportTransform);
  const imageRect = normalizeRect(topLeft.x, topLeft.y, bottomRight.x, bottomRight.y);

  return {
    x: (imageRect.x / imageWidth) * displayWidth,
    y: (imageRect.y / imageHeight) * displayHeight,
    width: (imageRect.width / imageWidth) * displayWidth,
    height: (imageRect.height / imageHeight) * displayHeight,
  };
}

export function displayRectToCropPreset(
  rect: CropRect,
  pageWidth: number,
  pageHeight: number,
  viewportTransform: ViewportTransform,
  imageWidth: number,
  imageHeight: number,
  displayWidth: number,
  displayHeight: number,
): CropPreset {
  const imageRect = {
    x: (rect.x / displayWidth) * imageWidth,
    y: (rect.y / displayHeight) * imageHeight,
    width: (rect.width / displayWidth) * imageWidth,
    height: (rect.height / displayHeight) * imageHeight,
  };
  const inverseTransform = invertTransform(viewportTransform);
  const topLeft = applyTransform(imageRect.x, imageRect.y, inverseTransform);
  const bottomRight = applyTransform(imageRect.x + imageRect.width, imageRect.y + imageRect.height, inverseTransform);

  return pageBoxToPresetCrop(
    {
      left: Math.min(topLeft.x, bottomRight.x),
      bottom: Math.min(topLeft.y, bottomRight.y),
      right: Math.max(topLeft.x, bottomRight.x),
      top: Math.max(topLeft.y, bottomRight.y),
    },
    pageWidth,
    pageHeight,
  );
}

export function moveDisplayRect(rect: CropRect, deltaX: number, deltaY: number, bounds: Bounds): CropRect {
  return {
    ...rect,
    x: clamp(rect.x + deltaX, 0, bounds.width - rect.width),
    y: clamp(rect.y + deltaY, 0, bounds.height - rect.height),
  };
}

export function resizeDisplayRect(
  rect: CropRect,
  handle: Exclude<CropBoxHandle, "move">,
  deltaX: number,
  deltaY: number,
  bounds: Bounds,
  aspectLockEnabled: boolean,
): CropRect {
  const left = rect.x;
  const top = rect.y;
  const right = rect.x + rect.width;
  const bottom = rect.y + rect.height;

  let nextLeft = left;
  let nextTop = top;
  let nextRight = right;
  let nextBottom = bottom;

  if (handle.includes("w")) {
    nextLeft = clamp(left + deltaX, 0, right - MIN_CROP_SIZE);
  } else {
    nextRight = clamp(right + deltaX, left + MIN_CROP_SIZE, bounds.width);
  }

  if (handle.includes("n")) {
    nextTop = clamp(top + deltaY, 0, bottom - MIN_CROP_SIZE);
  } else {
    nextBottom = clamp(bottom + deltaY, top + MIN_CROP_SIZE, bounds.height);
  }

  if (aspectLockEnabled) {
    return lockRectAspect(
      {
        x: nextLeft,
        y: nextTop,
        width: nextRight - nextLeft,
        height: nextBottom - nextTop,
      },
      handle,
      bounds,
      rect,
      deltaX,
      deltaY,
    );
  }

  return {
    x: nextLeft,
    y: nextTop,
    width: nextRight - nextLeft,
    height: nextBottom - nextTop,
  };
}

function lockRectAspect(
  rect: CropRect,
  handle: Exclude<CropBoxHandle, "move">,
  bounds: Bounds,
  startRect: CropRect,
  deltaX: number,
  deltaY: number,
): CropRect {
  const anchorX = handle.includes("w") ? startRect.x + startRect.width : startRect.x;
  const anchorY = handle.includes("n") ? startRect.y + startRect.height : startRect.y;
  const widthDriven = Math.abs(deltaX / Math.max(startRect.width, 1)) >= Math.abs(deltaY / Math.max(startRect.height, 1));

  let width = rect.width;
  let height = rect.height;

  if (widthDriven) {
    height = Math.max(MIN_CROP_SIZE, width / LABEL_ASPECT_RATIO);
  } else {
    width = Math.max(MIN_CROP_SIZE, height * LABEL_ASPECT_RATIO);
  }

  const maxWidth = handle.includes("w") ? anchorX : bounds.width - anchorX;
  const maxHeight = handle.includes("n") ? anchorY : bounds.height - anchorY;

  if (width > maxWidth) {
    width = maxWidth;
    height = width / LABEL_ASPECT_RATIO;
  }

  if (height > maxHeight) {
    height = maxHeight;
    width = height * LABEL_ASPECT_RATIO;
  }

  width = Math.max(MIN_CROP_SIZE, width);
  height = Math.max(MIN_CROP_SIZE, height);

  const x = handle.includes("w") ? anchorX - width : anchorX;
  const y = handle.includes("n") ? anchorY - height : anchorY;

  return {
    x: clamp(x, 0, bounds.width - width),
    y: clamp(y, 0, bounds.height - height),
    width,
    height,
  };
}

function applyTransform(x: number, y: number, [a, b, c, d, e, f]: ViewportTransform) {
  return {
    x: a * x + c * y + e,
    y: b * x + d * y + f,
  };
}

function invertTransform([a, b, c, d, e, f]: ViewportTransform): ViewportTransform {
  const determinant = a * d - b * c;

  return [
    d / determinant,
    -b / determinant,
    -c / determinant,
    a / determinant,
    (c * f - d * e) / determinant,
    (b * e - a * f) / determinant,
  ];
}

function normalizeRect(x1: number, y1: number, x2: number, y2: number): CropRect {
  return {
    x: Math.min(x1, x2),
    y: Math.min(y1, y2),
    width: Math.abs(x2 - x1),
    height: Math.abs(y2 - y1),
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}
