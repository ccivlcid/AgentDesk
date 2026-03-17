import { useState, useCallback, useRef } from "react";
import { ZOOM_MIN, ZOOM_MAX, ZOOM_STEP, FIT_PADDING } from "./constants";
import type { FlowNode } from "./useFlowLayout";

export interface ViewTransform {
  x: number;
  y: number;
  scale: number;
}

interface UseViewTransformReturn {
  transform: ViewTransform;
  svgRef: React.RefObject<SVGSVGElement | null>;
  handleWheel: (e: React.WheelEvent<SVGSVGElement>) => void;
  handlePanStart: (e: React.MouseEvent<SVGSVGElement>) => void;
  handlePanMove: (e: React.MouseEvent<SVGSVGElement>) => void;
  handlePanEnd: () => void;
  zoomIn: () => void;
  zoomOut: () => void;
  fitToView: (nodes: FlowNode[]) => void;
  isPanning: boolean;
}

export function useViewTransform(): UseViewTransformReturn {
  const [transform, setTransform] = useState<ViewTransform>({ x: 0, y: 0, scale: 1 });
  const svgRef = useRef<SVGSVGElement>(null);
  const isPanningRef = useRef(false);
  const panStartRef = useRef({ x: 0, y: 0, tx: 0, ty: 0 });
  const [isPanning, setIsPanning] = useState(false);

  const handleWheel = useCallback((e: React.WheelEvent<SVGSVGElement>) => {
    e.preventDefault();
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    setTransform((prev) => {
      const delta = e.deltaY > 0 ? -ZOOM_STEP : ZOOM_STEP;
      const nextScale = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, prev.scale + delta));
      const scaleRatio = nextScale / prev.scale;
      return {
        scale: nextScale,
        x: mouseX - scaleRatio * (mouseX - prev.x),
        y: mouseY - scaleRatio * (mouseY - prev.y),
      };
    });
  }, []);

  const handlePanStart = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    if (e.button !== 0) return;
    // Only pan on SVG background (not on nodes)
    const target = e.target as SVGElement;
    if (target.closest("[data-node]")) return;
    isPanningRef.current = true;
    setIsPanning(true);
    panStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      tx: transform.x,
      ty: transform.y,
    };
    e.preventDefault();
  }, [transform.x, transform.y]);

  const handlePanMove = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    if (!isPanningRef.current) return;
    const dx = e.clientX - panStartRef.current.x;
    const dy = e.clientY - panStartRef.current.y;
    setTransform((prev) => ({
      ...prev,
      x: panStartRef.current.tx + dx,
      y: panStartRef.current.ty + dy,
    }));
  }, []);

  const handlePanEnd = useCallback(() => {
    isPanningRef.current = false;
    setIsPanning(false);
  }, []);

  const zoomIn = useCallback(() => {
    setTransform((prev) => {
      const svg = svgRef.current;
      const cx = svg ? svg.clientWidth / 2 : 0;
      const cy = svg ? svg.clientHeight / 2 : 0;
      const nextScale = Math.min(ZOOM_MAX, prev.scale + ZOOM_STEP);
      const scaleRatio = nextScale / prev.scale;
      return {
        scale: nextScale,
        x: cx - scaleRatio * (cx - prev.x),
        y: cy - scaleRatio * (cy - prev.y),
      };
    });
  }, []);

  const zoomOut = useCallback(() => {
    setTransform((prev) => {
      const svg = svgRef.current;
      const cx = svg ? svg.clientWidth / 2 : 0;
      const cy = svg ? svg.clientHeight / 2 : 0;
      const nextScale = Math.max(ZOOM_MIN, prev.scale - ZOOM_STEP);
      const scaleRatio = nextScale / prev.scale;
      return {
        scale: nextScale,
        x: cx - scaleRatio * (cx - prev.x),
        y: cy - scaleRatio * (cy - prev.y),
      };
    });
  }, []);

  const fitToView = useCallback((nodes: FlowNode[]) => {
    const svg = svgRef.current;
    if (!svg || nodes.length === 0) return;
    const rect = svg.getBoundingClientRect();

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const node of nodes) {
      minX = Math.min(minX, node.x);
      minY = Math.min(minY, node.y);
      maxX = Math.max(maxX, node.x + node.width);
      maxY = Math.max(maxY, node.y + node.height);
    }

    const boundsW = maxX - minX;
    const boundsH = maxY - minY;
    if (boundsW === 0 || boundsH === 0) return;

    const scaleX = (rect.width - FIT_PADDING * 2) / boundsW;
    const scaleY = (rect.height - FIT_PADDING * 2) / boundsH;
    const scale = Math.min(scaleX, scaleY, 1.0);

    setTransform({
      scale,
      x: (rect.width - boundsW * scale) / 2 - minX * scale,
      y: (rect.height - boundsH * scale) / 2 - minY * scale,
    });
  }, []);

  return {
    transform,
    svgRef,
    handleWheel,
    handlePanStart,
    handlePanMove,
    handlePanEnd,
    zoomIn,
    zoomOut,
    fitToView,
    isPanning,
  };
}
