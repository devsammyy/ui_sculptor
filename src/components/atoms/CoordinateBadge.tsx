import React from "react";
import styles from "./CoordinateBadge.module.css";

interface CoordinateBadgeProps {
  x: number;
  y: number;
  className?: string;
}

/**
 * CoordinateBadge - Atom component
 * Floating HUD displaying current normalized (X, Y) coordinates
 */
export const CoordinateBadge: React.FC<CoordinateBadgeProps> = ({
  x,
  y,
  className = "",
}) => {
  return (
    <div
      className={`${styles.container} ${className}`}
      role="status"
      aria-live="polite"
      aria-label={`Coordinates: X ${(x * 100).toFixed(1)}%, Y ${(y * 100).toFixed(1)}%`}
    >
      <span className={styles.label}>X</span>
      <span className={styles.value}>{(x * 100).toFixed(1)}%</span>
      <span className={styles.separator} aria-hidden="true">
        ,
      </span>
      <span className={styles.label}>Y</span>
      <span className={styles.value}>{(y * 100).toFixed(1)}%</span>
    </div>
  );
};

CoordinateBadge.displayName = "CoordinateBadge";
