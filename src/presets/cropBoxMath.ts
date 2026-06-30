import { CropPreset, NORMALIZED_PAGE_HEIGHT, NORMALIZED_PAGE_WIDTH, scaleCropFromPageSize, scaleCropToPageSize } from "../pdf/labelCropper";

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

const LABEL_ASPECT_RATIO = 4 / 6;
const MIN_CROP_SIZE = 24;

export function cropPresetToDisplayRect(
  crop: CropPreset,
  pageWidth: number,
  pageHeight: number,
  displayWidth: number,
  displayHeight: number,
): CropRect {
  const pageCrop = scaleCropToPageSize(crop, pageWidth, pageHeight);

  return {
    x: (pageCrop.x / pageWidth) * displayWidth,
    y: ((pageHeight - (pageCrop.y + pageCrop.height)) / pageHeight) * displayHeight,
    width: (pageCrop.width / pageWidth) * displayWidth,
    height: (pageCrop.height / pageHeight) * displayHeight,
  };
}

export function displayRectToCropPreset(
  rect: CropRect,
  pageWidth: number,
  pageHeight: number,
  displayWidth: number,
  displayHeight: number,
): CropPreset {
  return clampCropToBounds(
    scaleCropFromPageSize(
      {
        x: (rect.x / displayWidth) * pageWidth,
        y: pageHeight - (((rect.y + rect.height) / displayHeight) * pageHeight),
        width: (rect.width / displayWidth) * pageWidth,
        height: (rect.height / displayHeight) * pageHeight,
      },
      pageWidth,
      pageHeight,
    ),
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

export function clampCropToBounds(crop: CropPreset): CropPreset {
  const width = clamp(Math.round(crop.width), 1, NORMALIZED_PAGE_WIDTH);
  const height = clamp(Math.round(crop.height), 1, NORMALIZED_PAGE_HEIGHT);

  return {
    x: clamp(Math.round(crop.x), 0, NORMALIZED_PAGE_WIDTH - width),
    y: clamp(Math.round(crop.y), 0, NORMALIZED_PAGE_HEIGHT - height),
    width,
    height,
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

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}
