"use client";

import React, { useState } from "react";
import { PresetPromptChip } from "../molecules/PresetPromptChip";
import styles from "./QuickActionRibbon.module.css";

interface QuickActionRibbonProps {
  presets: Array<{ label: string; intent: string }>;
  onPresetSelect: (intent: string) => void;
  className?: string;
  disabled?: boolean;
}

/**
 * QuickActionRibbon - Organism component
 * Professional mutation palette with search and keyboard shortcuts
 */
export const QuickActionRibbon: React.FC<QuickActionRibbonProps> = ({
  presets,
  onPresetSelect,
  className = "",
  disabled = false,
}) => {
  const [search, setSearch] = useState("");

  const filteredPresets = presets.filter(
    (p) =>
      p.label.toLowerCase().includes(search.toLowerCase()) ||
      p.intent.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div
      className={`${styles.container} ${className}`}
      role="toolbar"
      aria-label="Component mutation presets"
    >
      <div className={styles.header}>
        <div className={styles.titleRow}>
          <span className={styles.title}>Actions Palette</span>
          <span className={styles.counter}>{filteredPresets.length}</span>
        </div>
        <div className={styles.searchWrapper}>
          <svg
            className={styles.searchIcon}
            viewBox="0 0 20 20"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.75"
          >
            <circle cx="9" cy="9" r="6" />
            <path d="M13.5 13.5L17 17" strokeLinecap="round" />
          </svg>
          <input
            type="text"
            className={styles.searchInput}
            placeholder="Search actions..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className={styles.presetsList}>
        {filteredPresets.map((preset, index) => (
          <PresetPromptChip
            key={index}
            label={preset.label}
            intent={preset.intent}
            shortcut={`⌘${index + 1}`}
            onClick={() => onPresetSelect(preset.intent)}
            disabled={disabled}
          />
        ))}
        {filteredPresets.length === 0 && (
          <div className={styles.emptyState}>No matching actions found</div>
        )}
      </div>
    </div>
  );
};

QuickActionRibbon.displayName = "QuickActionRibbon";
