"use client";

import React from "react";
import styles from "./PresetPromptChip.module.css";

interface PresetPromptChipProps {
  label: string;
  intent: string;
  onClick: () => void;
  className?: string;
  disabled?: boolean;
  icon?: string;
  shortcut?: string;
}

/**
 * PresetPromptChip - Molecule component
 * Clean action tile for rapid visual mutations
 */
export const PresetPromptChip: React.FC<PresetPromptChipProps> = ({
  label,
  intent,
  onClick,
  className = "",
  disabled = false,
  shortcut,
}) => {
  return (
    <button
      className={`${styles.container} ${className}`}
      onClick={onClick}
      disabled={disabled}
      aria-label={`Apply: ${intent}`}
      title={intent}
    >
      <div className={styles.headerRow}>
        <span className={styles.label}>{label}</span>
        {shortcut && <span className={styles.shortcut}>{shortcut}</span>}
      </div>
      <span className={styles.intent}>{intent}</span>
    </button>
  );
};

PresetPromptChip.displayName = "PresetPromptChip";
