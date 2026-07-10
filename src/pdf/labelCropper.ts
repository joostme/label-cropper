import { degrees, PDFDocument, PDFPage } from "pdf-lib";

export type CropPreset = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type OutputSizePreset = {
  widthMm: number;
  heightMm: number;
};

export type OutputUnit = "mm" | "in";

export type LabelPreset = {
  id: string;
  name: string;
  filenameHints?: string[];
  crop: CropPreset;
  output: OutputSizePreset;
};

export type PdfPageAssignment = {
  fileIndex: number;
  pageIndex: number;
  presetId: string;
};

export type ConversionSummary = {
  pages: number;
  rotatedPages: number;
  outputBytes: Uint8Array;
};

const POINTS_PER_INCH = 72;
const MILLIMETERS_PER_INCH = 25.4;
export const DEFAULT_OUTPUT_SIZE: OutputSizePreset = {
  widthMm: 101.6,
  heightMm: 152.4,
};
export const NORMALIZED_PAGE_WIDTH = 842;
export const NORMALIZED_PAGE_HEIGHT = 595;

export const LABEL_PRESETS: LabelPreset[] = [
  {
    id: "ebay-dhl-germany-a4",
    name: "eBay DHL Germany A4",
    filenameHints: ["ebay"],
    crop: {
      x: 430,
      y: 30,
      width: 367,
      height: 550,
    },
    output: DEFAULT_OUTPUT_SIZE,
  },
];

export const DEFAULT_LABEL_PRESET = LABEL_PRESETS[0];

export function findLabelPresetForFiles(
  files: File[],
  presets: LabelPreset[] = LABEL_PRESETS,
  fallback = DEFAULT_LABEL_PRESET,
): LabelPreset {
  const fileNames = files.map((file) => file.name.toLowerCase());

  return (
    presets.find((preset) =>
      preset.filenameHints?.some((hint) => fileNames.some((fileName) => fileName.includes(hint.toLowerCase()))),
    ) ?? fallback
  );
}

type PageBox = {
  left: number;
  bottom: number;
  right: number;
  top: number;
};

export async function convertLabels(
  files: File[],
  pageAssignments: PdfPageAssignment[],
  presets: LabelPreset[],
): Promise<ConversionSummary> {
  const outputPdf = await PDFDocument.create();
  const presetLookup = new Map(presets.map((preset) => [preset.id, preset]));
  const assignmentLookup = new Map(pageAssignments.map((assignment) => [getPdfPageAssignmentKey(assignment.fileIndex, assignment.pageIndex), assignment]));
  let outputPageSize: ReturnType<typeof outputSizeToPoints> | null = null;
  let sharedOutput: OutputSizePreset | null = null;
  let pages = 0;
  let rotatedPages = 0;

  for (const [fileIndex, file] of files.entries()) {
    const bytes = await file.arrayBuffer();
    const inputPdf = await PDFDocument.load(bytes, { ignoreEncryption: true });

    for (const [pageIndex, inputPage] of inputPdf.getPages().entries()) {
      const assignment = assignmentLookup.get(getPdfPageAssignmentKey(fileIndex, pageIndex));

      if (!assignment) {
        throw new Error(`Missing a preset assignment for ${file.name}, page ${pageIndex + 1}.`);
      }

      const labelPreset = presetLookup.get(assignment.presetId);

      if (!labelPreset) {
        throw new Error(`Preset "${assignment.presetId}" is no longer available for ${file.name}, page ${pageIndex + 1}.`);
      }

      if (!sharedOutput) {
        sharedOutput = normalizeOutputSize(labelPreset.output);
        outputPageSize = outputSizeToPoints(sharedOutput);
      } else if (!outputSizesMatch(sharedOutput, labelPreset.output)) {
        throw new Error("Assigned presets use different output page sizes. Choose presets with the same output size before exporting.");
      }

      const { crop, isPortrait } = getNormalizedCrop(inputPage, labelPreset.crop);
      const sourceBox = isPortrait ? normalizedLandscapeToPortraitBox(crop, inputPage) : cropToPageBox(crop);
      const embeddedPage = await outputPdf.embedPage(inputPage, sourceBox);
      const outputPage = outputPdf.addPage([outputPageSize.width, outputPageSize.height]);

      if (isPortrait) {
        outputPage.drawPage(embeddedPage, {
          x: 0,
          y: outputPageSize.height,
          width: outputPageSize.height,
          height: outputPageSize.width,
          rotate: degrees(-90),
        });
        rotatedPages += 1;
      } else {
        outputPage.drawPage(embeddedPage, {
          x: 0,
          y: 0,
          width: outputPageSize.width,
          height: outputPageSize.height,
        });
      }

      pages += 1;
    }
  }

  return {
    pages,
    rotatedPages,
    outputBytes: await outputPdf.save(),
  };
}

export async function convertLabelsWithPreset(files: File[], labelPreset: LabelPreset): Promise<ConversionSummary> {
  const outputPdf = await PDFDocument.create();
  const outputPageSize = outputSizeToPoints(labelPreset.output);
  let pages = 0;
  let rotatedPages = 0;

  for (const file of files) {
    const bytes = await file.arrayBuffer();
    const inputPdf = await PDFDocument.load(bytes, { ignoreEncryption: true });

    for (const inputPage of inputPdf.getPages()) {
      const { crop, isPortrait } = getNormalizedCrop(inputPage, labelPreset.crop);
      const sourceBox = isPortrait ? normalizedLandscapeToPortraitBox(crop, inputPage) : cropToPageBox(crop);
      const embeddedPage = await outputPdf.embedPage(inputPage, sourceBox);
      const outputPage = outputPdf.addPage([outputPageSize.width, outputPageSize.height]);

      if (isPortrait) {
        outputPage.drawPage(embeddedPage, {
          x: 0,
          y: outputPageSize.height,
          width: outputPageSize.height,
          height: outputPageSize.width,
          rotate: degrees(-90),
        });
        rotatedPages += 1;
      } else {
        outputPage.drawPage(embeddedPage, {
          x: 0,
          y: 0,
          width: outputPageSize.width,
          height: outputPageSize.height,
        });
      }

      pages += 1;
    }
  }

  return {
    pages,
    rotatedPages,
    outputBytes: await outputPdf.save(),
  };
}

function getNormalizedCrop(page: PDFPage, preset: CropPreset): { crop: CropPreset; isPortrait: boolean } {
  const width = page.getWidth();
  const height = page.getHeight();
  const { isPortrait, normalizedWidth, normalizedHeight } = getNormalizedPageSize(width, height);

  return {
    isPortrait,
    crop: scaleCropToPageSize(preset, normalizedWidth, normalizedHeight),
  };
}

export function getNormalizedPageSize(pageWidth: number, pageHeight: number) {
  const isPortrait = pageWidth < pageHeight;

  return {
    isPortrait,
    normalizedWidth: isPortrait ? pageHeight : pageWidth,
    normalizedHeight: isPortrait ? pageWidth : pageHeight,
  };
}

export function scaleCropToPageSize(preset: CropPreset, pageWidth: number, pageHeight: number): CropPreset {
  return {
    x: (preset.x / NORMALIZED_PAGE_WIDTH) * pageWidth,
    y: (preset.y / NORMALIZED_PAGE_HEIGHT) * pageHeight,
    width: (preset.width / NORMALIZED_PAGE_WIDTH) * pageWidth,
    height: (preset.height / NORMALIZED_PAGE_HEIGHT) * pageHeight,
  };
}

export function scaleCropFromPageSize(crop: CropPreset, pageWidth: number, pageHeight: number): CropPreset {
  return {
    x: (crop.x / pageWidth) * NORMALIZED_PAGE_WIDTH,
    y: (crop.y / pageHeight) * NORMALIZED_PAGE_HEIGHT,
    width: (crop.width / pageWidth) * NORMALIZED_PAGE_WIDTH,
    height: (crop.height / pageHeight) * NORMALIZED_PAGE_HEIGHT,
  };
}

function cropToPageBox(crop: CropPreset): PageBox {
  return {
    left: crop.x,
    bottom: crop.y,
    right: crop.x + crop.width,
    top: crop.y + crop.height,
  };
}

function normalizedLandscapeToPortraitBox(crop: CropPreset, page: PDFPage): PageBox {
  const pageWidth = page.getWidth();

  return normalizedLandscapeToPortraitPageBox(crop, pageWidth);
}

export function presetCropToPageBox(presetCrop: CropPreset, pageWidth: number, pageHeight: number): PageBox {
  const { isPortrait, normalizedWidth, normalizedHeight } = getNormalizedPageSize(pageWidth, pageHeight);
  const crop = scaleCropToPageSize(presetCrop, normalizedWidth, normalizedHeight);

  return isPortrait ? normalizedLandscapeToPortraitPageBox(crop, pageWidth) : cropToPageBox(crop);
}

export function pageBoxToPresetCrop(pageBox: PageBox, pageWidth: number, pageHeight: number): CropPreset {
  const { isPortrait, normalizedWidth, normalizedHeight } = getNormalizedPageSize(pageWidth, pageHeight);
  const crop = isPortrait ? portraitPageBoxToNormalizedLandscapeCrop(pageBox, pageWidth) : pageBoxToCrop(pageBox);

  return scaleCropFromPageSize(crop, normalizedWidth, normalizedHeight);
}

function normalizedLandscapeToPortraitPageBox(crop: CropPreset, pageWidth: number): PageBox {
  return {
    left: pageWidth - (crop.y + crop.height),
    bottom: crop.x,
    right: pageWidth - crop.y,
    top: crop.x + crop.width,
  };
}

function portraitPageBoxToNormalizedLandscapeCrop(pageBox: PageBox, pageWidth: number): CropPreset {
  return {
    x: pageBox.bottom,
    y: pageWidth - pageBox.right,
    width: pageBox.top - pageBox.bottom,
    height: pageBox.right - pageBox.left,
  };
}

function pageBoxToCrop(pageBox: PageBox): CropPreset {
  return {
    x: pageBox.left,
    y: pageBox.bottom,
    width: pageBox.right - pageBox.left,
    height: pageBox.top - pageBox.bottom,
  };
}

export function makePdfBlobUrl(bytes: Uint8Array): string {
  const blobBytes = new Uint8Array(bytes.byteLength);
  blobBytes.set(bytes);
  return URL.createObjectURL(new Blob([blobBytes], { type: "application/pdf" }));
}

export function normalizeOutputSize(output?: Partial<OutputSizePreset>): OutputSizePreset {
  return {
    widthMm: normalizeOutputDimension(output?.widthMm, DEFAULT_OUTPUT_SIZE.widthMm),
    heightMm: normalizeOutputDimension(output?.heightMm, DEFAULT_OUTPUT_SIZE.heightMm),
  };
}

export function outputSizesMatch(left: OutputSizePreset, right: OutputSizePreset): boolean {
  return Math.abs(left.widthMm - right.widthMm) < 0.01 && Math.abs(left.heightMm - right.heightMm) < 0.01;
}

export function getPdfPageAssignmentKey(fileIndex: number, pageIndex: number): string {
  return `${fileIndex}:${pageIndex}`;
}

export function getOutputAspectRatio(output: OutputSizePreset): number {
  return output.widthMm / output.heightMm;
}

export function formatOutputSize(output: OutputSizePreset, unit: OutputUnit = "mm"): string {
  return `${formatOutputDimension(output.widthMm, unit)} x ${formatOutputDimension(output.heightMm, unit)} ${unit}`;
}

export function formatOutputDimension(millimeters: number, unit: OutputUnit = "mm"): string {
  return formatOutputUnitValue(convertMillimetersToOutputUnit(millimeters, unit), unit);
}

export function convertMillimetersToOutputUnit(millimeters: number, unit: OutputUnit): number {
  return unit === "in" ? millimeters / MILLIMETERS_PER_INCH : millimeters;
}

export function convertOutputUnitToMillimeters(value: number, unit: OutputUnit): number {
  return unit === "in" ? value * MILLIMETERS_PER_INCH : value;
}

export function formatOutputSizeSlug(output: OutputSizePreset): string {
  return `${formatMillimeters(output.widthMm)}x${formatMillimeters(output.heightMm)}mm`;
}

function outputSizeToPoints(output: OutputSizePreset) {
  return {
    width: millimetersToPoints(output.widthMm),
    height: millimetersToPoints(output.heightMm),
  };
}

function millimetersToPoints(millimeters: number): number {
  return (millimeters / MILLIMETERS_PER_INCH) * POINTS_PER_INCH;
}

function normalizeOutputDimension(value: number | undefined, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? value : fallback;
}

function formatMillimeters(value: number): string {
  return formatOutputUnitValue(value, "mm");
}

function formatOutputUnitValue(value: number, unit: OutputUnit): string {
  const digits = unit === "in" ? 2 : 1;
  const roundedValue = Number(value.toFixed(digits));

  return unit === "in" ? formatInchesValue(roundedValue) : roundedValue.toString();
}

function formatInchesValue(value: number): string {
  return Number.isInteger(value) ? value.toFixed(0) : value.toString();
}
