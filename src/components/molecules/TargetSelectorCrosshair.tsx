"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { CoordinateBadge } from "../atoms/CoordinateBadge";
import { MaskCanvasPin } from "../atoms/MaskCanvasPin";
import styles from "./TargetSelectorCrosshair.module.css";

interface TargetSelectorCrosshairProps {
  containerRef: React.RefObject<HTMLDivElement>;
  onTargetSelect: (target: {
    x: number;
    y: number;
    viewportWidth: number;
    viewportHeight: number;
  }) => void;
  activeTarget?: { x: number; y: number; confidence: number } | null;
  className?: string;
  enabled?: boolean;
}

/**
 * TargetSelectorCrosshair - Molecule component
 * Interactive click reticle with coordinate tooltip
 */
export const TargetSelectorCrosshair: React.FC<
  TargetSelectorCrosshairProps
> = ({
  containerRef,
  onTargetSelect,
  activeTarget,
  className = "",
  enabled = true,
}) => {
  const [hoverCoords, setHoverCoords] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const [showCoords, setShowCoords] = useState(false);
  const crosshairRef = useRef<HTMLDivElement>(null);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!enabled || !containerRef.current) return;

      const rect = containerRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      if (x >= 0 && x <= rect.width && y >= 0 && y <= rect.height) {
        setHoverCoords({ x: x / rect.width, y: y / rect.height });
        setShowCoords(true);
      } else {
        setShowCoords(false);
      }
    },
    [containerRef, enabled],
  );

  const handleMouseLeave = useCallback(() => {
    setShowCoords(false);
  }, []);

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      if (!enabled || !containerRef.current) return;

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
    [containerRef, enabled, onTargetSelect],
  );

  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      if (!enabled || !containerRef.current) return;

      const touch = e.touches[0];
      const rect = containerRef.current.getBoundingClientRect();
      const x = touch.clientX - rect.left;
      const y = touch.clientY - rect.top;

      if (x >= 0 && x <= rect.width && y >= 0 && y <= rect.height) {
        setHoverCoords({ x: x / rect.width, y: y / rect.height });
        setShowCoords(true);
      }
    },
    [containerRef, enabled],
  );

  const handleTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      if (!enabled || !containerRef.current) return;

      const touch = e.changedTouches[0];
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
    [containerRef, enabled, onTargetSelect],
  );

  // Crosshair follows mouse
  useEffect(() => {
    if (!crosshairRef.current || !hoverCoords) return;

    crosshairRef.current.style.left = `${hoverCoords.x * 100}%`;
    crosshairRef.current.style.top = `${hoverCoords.y * 100}%`;
  }, [hoverCoords]);

  return (
    <div
      ref={containerRef}
      className={`${styles.container} ${className}`}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onClick={handleClick}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      style={{ touchAction: "none" }}
    >
      {/* Crosshair lines */}
      <div ref={crosshairRef} className={styles.crosshair} aria-hidden="true">
        <div
          className={styles.line}
          style={{ transform: "translateX(-50%)" }}
        />
        <div
          className={styles.line}
          style={{ transform: "translateY(-50%) rotate(90deg)" }}
        />
        <div className={styles.center} />
      </div>

      {/* Coordinate tooltip */}
      {showCoords && hoverCoords && (
        <CoordinateBadge
          x={hoverCoords.x}
          y={hoverCoords.y}
          className={styles.tooltip}
        />
      )}

      {/* Active target pin */}
      {activeTarget && (
        <MaskCanvasPin
          x={activeTarget.x}
          y={activeTarget.y}
          confidence={activeTarget.confidence}
          className={styles.activePin}
        />
      )}

      <style jsx>{`
        .${styles.container} {
          position: relative;
          width: 100%;
          height: 100%;
        }
      `}</style>
    </div>
  );
};

TargetSelectorCrosshair.displayName = "TargetSelectorCrosshair";
