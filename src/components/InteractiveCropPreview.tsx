import { useEffect, useMemo, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import { CropPreset } from "../pdf/labelCropper";
import { usePdfPagePreview } from "../hooks/usePdfPagePreview";
import { CropBoxHandle, cropPresetToDisplayRect, displayRectToCropPreset, moveDisplayRect, resizeDisplayRect } from "../presets/cropBoxMath";

type InteractiveCropPreviewProps = {
  file: File | null;
  crop: CropPreset;
  aspectLockEnabled: boolean;
  onCropChange: (crop: CropPreset) => void;
};

type InteractionState = {
  handle: CropBoxHandle;
  pointerId: number;
  startClientX: number;
  startClientY: number;
  startRect: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
};

type Size = {
  width: number;
  height: number;
};

const handles: Array<{ key: Exclude<CropBoxHandle, "move">; label: string }> = [
  { key: "nw", label: "Resize from top left" },
  { key: "ne", label: "Resize from top right" },
  { key: "sw", label: "Resize from bottom left" },
  { key: "se", label: "Resize from bottom right" },
];

export function InteractiveCropPreview({ file, crop, aspectLockEnabled, onCropChange }: InteractiveCropPreviewProps) {
  const { preview, loading, error } = usePdfPagePreview(file);
  const frameRef = useRef<HTMLDivElement | null>(null);
  const interactionRef = useRef<InteractionState | null>(null);
  const [displaySize, setDisplaySize] = useState<Size>({ width: 0, height: 0 });

  useEffect(() => {
    if (!frameRef.current) {
      return;
    }

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) {
        return;
      }

      setDisplaySize({
        width: entry.contentRect.width,
        height: entry.contentRect.height,
      });
    });

    observer.observe(frameRef.current);

    return () => {
      observer.disconnect();
    };
  }, [preview]);

  const cropRect = useMemo(() => {
    if (!preview || displaySize.width <= 0 || displaySize.height <= 0) {
      return null;
    }

    return cropPresetToDisplayRect(crop, preview.pageWidth, preview.pageHeight, displaySize.width, displaySize.height);
  }, [crop, displaySize.height, displaySize.width, preview]);

  useEffect(() => {
    function handlePointerMove(event: PointerEvent) {
      if (!preview || !interactionRef.current) {
        return;
      }

      const interaction = interactionRef.current;
      const deltaX = event.clientX - interaction.startClientX;
      const deltaY = event.clientY - interaction.startClientY;
      const nextRect =
        interaction.handle === "move"
          ? moveDisplayRect(interaction.startRect, deltaX, deltaY, displaySize)
          : resizeDisplayRect(interaction.startRect, interaction.handle, deltaX, deltaY, displaySize, aspectLockEnabled);

      onCropChange(displayRectToCropPreset(nextRect, preview.pageWidth, preview.pageHeight, displaySize.width, displaySize.height));
    }

    function handlePointerUp() {
      interactionRef.current = null;
    }

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
    window.addEventListener("pointercancel", handlePointerUp);

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
      window.removeEventListener("pointercancel", handlePointerUp);
    };
  }, [aspectLockEnabled, displaySize, onCropChange, preview]);

  function beginInteraction(handle: CropBoxHandle, event: ReactPointerEvent<HTMLDivElement>) {
    if (!cropRect) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    interactionRef.current = {
      handle,
      pointerId: event.pointerId,
      startClientX: event.clientX,
      startClientY: event.clientY,
      startRect: cropRect,
    };
  }

  return (
    <section className="preview-card">
      <div className="preview-card-header">
        <div className="panel-title">Adjust crop on source label</div>
        <p className="panel-note panel-note-tight">Drag the box to move it. Drag the corner handles to resize it. If multiple PDFs are loaded, the first file is shown here.</p>
      </div>

      {!file && <div className="empty-preview source-preview-empty">Upload a PDF to place the crop box.</div>}
      {file && loading && <div className="empty-preview source-preview-empty">Rendering source preview...</div>}
      {file && error && <p className="error">{error}</p>}

      {file && preview && (
        <div className="source-preview-shell">
          <div
            className="source-preview-frame"
            ref={frameRef}
            style={{ aspectRatio: `${preview.imageWidth} / ${preview.imageHeight}` }}
          >
            <img className="source-preview-image" src={preview.imageUrl} alt="Uploaded PDF source preview" draggable={false} />
            {cropRect && (
              <div
                className="crop-box"
                style={{
                  left: `${cropRect.x}px`,
                  top: `${cropRect.y}px`,
                  width: `${cropRect.width}px`,
                  height: `${cropRect.height}px`,
                }}
                onPointerDown={(event) => beginInteraction("move", event)}
              >
                <div className="crop-box-label">{aspectLockEnabled ? "4 x 6 locked" : "Free crop"}</div>
                {handles.map(({ key, label }) => (
                  <div
                    key={key}
                    className={`crop-handle crop-handle-${key}`}
                    aria-label={label}
                    role="button"
                    tabIndex={-1}
                    onPointerDown={(event) => beginInteraction(key, event)}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
