import React from "react";
import styles from "./MaskCanvasPin.module.css";

interface MaskCanvasPinProps {
  x: number; // percentage 0-1
  y: number; // percentage 0-1
  confidence: number; // 0-1
  className?: string;
  onRemove?: () => void;
}

/**
 * MaskCanvasPin - Atom component
 * Pulsing SVG pin dropped on click showing SAM 3.1 segmentation target
 */
export const MaskCanvasPin: React.FC<MaskCanvasPinProps> = ({
  x,
  y,
  confidence,
  className = "",
  onRemove,
}) => {
  const pinStyle: React.CSSProperties = {
    left: `${x * 100}%`,
    top: `${y * 100}%`,
    transform: "translate(-50%, -100%)",
  };

  return (
    <div
      className={`${styles.container} ${className}`}
      style={pinStyle}
      role="button"
      tabIndex={0}
      aria-label={`Target at ${(x * 100).toFixed(1)}%, ${(y * 100).toFixed(1)}% with ${(confidence * 100).toFixed(0)}% confidence`}
      onClick={onRemove}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onRemove?.();
        }
      }}
    >
      <div className={styles.pin} aria-hidden="true">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          width="24"
          height="24"
        >
          <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" />
          <circle cx="12" cy="9" r="2.5" fill="currentColor" />
        </svg>
      </div>
      <div
        className={styles.confidenceRing}
        style={{ "--confidence": confidence } as React.CSSProperties}
        aria-hidden="true"
      />
      <div className={styles.confidenceLabel}>
        {(confidence * 100).toFixed(0)}%
      </div>
    </div>
  );
};

MaskCanvasPin.displayName = "MaskCanvasPin";
