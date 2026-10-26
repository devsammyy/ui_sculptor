"use client";

import React, { useCallback, useRef, useState } from "react";
import { useViewportCoordinates } from "../../hooks/useViewportCoordinates";
import { CoordinateBadge } from "../atoms/CoordinateBadge";
import { MaskCanvasPin } from "../atoms/MaskCanvasPin";
import styles from "./ViewportOverlay.module.css";

interface ViewportOverlayProps {
  screenshot?: string; // base64 data URL
  children: React.ReactNode;
  onTargetSelect: (target: {
    x: number;
    y: number;
    viewportWidth: number;
    viewportHeight: number;
  }) => void;
  activeMask?: string | null; // base64 PNG
  activeTarget?: { x: number; y: number; confidence: number } | null;
  className?: string;
}

/**
 * ViewportOverlay - Organism component
 * Multi-layer canvas: clicks, SAM 3.1 SVG mask, and HUD
 */
export const ViewportOverlay: React.FC<ViewportOverlayProps> = ({
  screenshot,
  children,
  onTargetSelect,
  activeMask,
  activeTarget,
  className = "",
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const { getNormalizedCoordinates } = useViewportCoordinates();
  const [hoverCoords, setHoverCoords] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const [showHoverCoords, setShowHoverCoords] = useState(false);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (x >= 0 && x <= rect.width && y >= 0 && y <= rect.height) {
      setHoverCoords({ x: x / rect.width, y: y / rect.height });
      setShowHoverCoords(true);
    } else {
      setShowHoverCoords(false);
    }
  }, []);

  const handleMouseLeave = useCallback(() => {
    setShowHoverCoords(false);
  }, []);

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      if (!containerRef.current) return;

      const rect = containerRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      if (x >= 0 && x <= rect.width && y >= 0 && y <= rect.height) {
        onTargetSelect({
          x: x / rect.width,
          y: y / rect.height,
          viewportWidth: rect.width,
          viewportHeight: rect.height,
        });
      }
    },
    [onTargetSelect],
  );

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (!containerRef.current) return;

    const touch = e.touches[0];
    if (!touch) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = touch.clientX - rect.left;
    const y = touch.clientY - rect.top;

    if (x >= 0 && x <= rect.width && y >= 0 && y <= rect.height) {
      setHoverCoords({ x: x / rect.width, y: y / rect.height });
      setShowHoverCoords(true);
    }
  }, []);

  const handleTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      if (!containerRef.current) return;

      const touch = e.changedTouches[0];
      if (!touch) return;
      const rect = containerRef.current.getBoundingClientRect();
      const x = touch.clientX - rect.left;
      const y = touch.clientY - rect.top;

      if (x >= 0 && x <= rect.width && y >= 0 && y <= rect.height) {
        onTargetSelect({
          x: x / rect.width,
          y: y / rect.height,
          viewportWidth: rect.width,
          viewportHeight: rect.height,
        });
      }
    },
    [onTargetSelect],
  );

  return (
    <div
      ref={containerRef}
      className={`${styles["container"]} ${className}`}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onClick={handleClick}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      style={{ touchAction: "none" }}
    >
      {/* Layer 1: Playground content */}
      <div className={styles["contentLayer"]}>
        {screenshot ? (
          <img
            src={screenshot}
            alt="Playground preview"
            className={styles["screenshot"]}
            draggable={false}
          />
        ) : (
          children
        )}
      </div>

      {/* Layer 2: SAM 3.1 Segmentation Mask */}
      {activeMask && (
        <div className={styles["maskLayer"]} aria-hidden="true">
          <img
            src={activeMask}
            alt="Segmentation mask"
            className={styles["maskImage"]}
            draggable={false}
          />
        </div>
      )}

      {/* Layer 3: Crosshair (follows mouse) */}
      {showHoverCoords && hoverCoords && (
        <div className={styles["crosshairLayer"]} aria-hidden="true">
          <div
            className={styles["crosshair"]}
            style={{
              left: `${hoverCoords.x * 100}%`,
              top: `${hoverCoords.y * 100}%`,
            }}
          >
            <div className={styles["crosshairLine"]} />
            <div
              className={styles["crosshairLine"]}
              style={{ transform: "rotate(90deg)" }}
            />
            <div className={styles["crosshairCenter"]} />
          </div>
        </div>
      )}

      {/* Layer 4: Active target pin */}
      {activeTarget && (
        <MaskCanvasPin
          x={activeTarget.x}
          y={activeTarget.y}
          confidence={activeTarget.confidence}
          className={styles["activePin"]}
        />
      )}

      {/* Layer 5: Hover coordinate tooltip */}
      {showHoverCoords && hoverCoords && (
        <CoordinateBadge
          x={hoverCoords.x}
          y={hoverCoords.y}
          className={styles["hoverTooltip"]}
        />
      )}
    </div>
  );
};

ViewportOverlay.displayName = "ViewportOverlay";
