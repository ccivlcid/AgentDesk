import { useEffect, useRef, useState } from "react";
import { useI18n } from "../../i18n";

const mono = "var(--th-font-mono)";

interface Props {
  imageUrl: string;
  onMaskChange: (maskB64: string | null) => void;
}

export default function MaskCanvas({ imageUrl, onMaskChange }: Props) {
  const { t } = useI18n();
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [painting, setPainting] = useState(false);
  const [brushSize, setBrushSize] = useState(30);
  const [hasMask, setHasMask] = useState(false);
  const lastPos = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => { clearMask(); }, [imageUrl]); // eslint-disable-line react-hooks/exhaustive-deps

  function clearMask() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasMask(false);
    onMaskChange(null);
  }

  function exportMask(canvas: HTMLCanvasElement) {
    // Create black background + white painted areas
    const off = document.createElement("canvas");
    off.width = canvas.width;
    off.height = canvas.height;
    const ctx = off.getContext("2d")!;
    ctx.fillStyle = "black";
    ctx.fillRect(0, 0, off.width, off.height);
    ctx.drawImage(canvas, 0, 0);
    onMaskChange(off.toDataURL("image/png"));
    setHasMask(true);
  }

  function getPos(e: React.MouseEvent): { x: number; y: number } {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) * (canvas.width / rect.width),
      y: (e.clientY - rect.top) * (canvas.height / rect.height),
    };
  }

  function onMouseDown(e: React.MouseEvent) {
    setPainting(true);
    const pos = getPos(e);
    lastPos.current = pos;
    paint(pos, pos);
  }

  function onMouseMove(e: React.MouseEvent) {
    if (!painting) return;
    const pos = getPos(e);
    paint(lastPos.current ?? pos, pos);
    lastPos.current = pos;
  }

  function onMouseUp() {
    setPainting(false);
    lastPos.current = null;
    if (canvasRef.current) exportMask(canvasRef.current);
  }

  function paint(from: { x: number; y: number }, to: { x: number; y: number }) {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    ctx.globalCompositeOperation = "source-over";
    ctx.strokeStyle = "white";
    ctx.lineWidth = brushSize;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(to.x, to.y);
    ctx.stroke();
  }

  return (
    <div style={{ position: "relative", width: "100%", userSelect: "none" }} ref={containerRef}>
      {/* Base image */}
      <img
        src={imageUrl}
        style={{ width: "100%", display: "block", borderRadius: 4 }}
        alt="input"
        draggable={false}
      />
      {/* Mask canvas overlay */}
      <canvas
        ref={canvasRef}
        width={512}
        height={512}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseUp}
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          cursor: "crosshair",
          borderRadius: 4,
          opacity: 0.55,
        }}
      />
      {/* Controls */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 6 }}>
        <span style={{ fontFamily: mono, fontSize: 9, color: "var(--th-text-muted)" }}>
          {t({ ko: "브러시", en: "Brush", ja: "ブラシ", zh: "画笔" })}
        </span>
        <input
          type="range"
          min={5}
          max={80}
          value={brushSize}
          onChange={(e) => setBrushSize(Number(e.target.value))}
          style={{ flex: 1, accentColor: "var(--th-accent)" }}
        />
        <button
          type="button"
          onClick={clearMask}
          style={{
            padding: "2px 8px",
            background: "transparent",
            border: "1px solid var(--th-border)",
            borderRadius: 3,
            fontFamily: mono,
            fontSize: 9,
            color: "var(--th-text-muted)",
            cursor: "pointer",
          }}
        >
          {t({ ko: "지우기", en: "Clear", ja: "クリア", zh: "清除" })}
        </button>
        {hasMask && (
          <span style={{ display: "inline-flex", color: "#30d158" }} aria-hidden>
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </span>
        )}
      </div>
    </div>
  );
}
