import React from "react";
import styles from "./ModelBadge.module.css";

interface ModelBadgeProps {
  engineName: string;
  verified: boolean;
  className?: string;
}

/**
 * ModelBadge - Atom component
 * Verified Open-Weight indicator pill
 */
export const ModelBadge: React.FC<ModelBadgeProps> = ({
  engineName,
  verified,
  className = "",
}) => {
  return (
    <span
      className={`${styles["container"]} ${verified ? styles["verified"] : styles["unverified"]} ${className}`}
      title={engineName}
    >
      <span className={styles["dot"]} aria-hidden="true" />
      <span className={styles["text"]}>
        {verified ? "Verified" : "Unverified"}
      </span>
      <span className={styles["engine"]}>{engineName}</span>
    </span>
  );
};

ModelBadge.displayName = "ModelBadge";
