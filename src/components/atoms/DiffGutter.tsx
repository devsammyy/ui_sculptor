import React from "react";
import styles from "./DiffGutter.module.css";

interface DiffGutterProps {
  additions: number;
  deletions: number;
  className?: string;
}

/**
 * DiffGutter - Atom component
 * AST diff line-number renderer showing additions/deletions
 */
export const DiffGutter: React.FC<DiffGutterProps> = ({
  additions,
  deletions,
  className = "",
}) => {
  return (
    <div
      className={`${styles["container"]} ${className}`}
      role="status"
      aria-label={`Diff: ${additions} additions, ${deletions} deletions`}
    >
      <div className={styles["item"]}>
        <span
          className={`${styles["icon"]} ${styles["addition"]}`}
          aria-hidden="true"
        >
          +
        </span>
        <span className={styles["count"]}>{additions}</span>
        <span className={styles["label"]}>added</span>
      </div>
      <div className={styles["divider"]} aria-hidden="true" />
      <div className={styles["item"]}>
        <span
          className={`${styles["icon"]} ${styles["deletion"]}`}
          aria-hidden="true"
        >
          −
        </span>
        <span className={styles["count"]}>{deletions}</span>
        <span className={styles["label"]}>removed</span>
      </div>
    </div>
  );
};

DiffGutter.displayName = "DiffGutter";
