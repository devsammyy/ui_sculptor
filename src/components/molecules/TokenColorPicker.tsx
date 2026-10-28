"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import styles from "./TokenColorPicker.module.css";

export interface TokenColorPickerProps {
  label: string;
  value: string;
  onChange: (color: string) => void;
  className?: string;
}

const CURATED_PALETTE = [
  // Primary / Tech / Blue
  "#0066CC",
  "#2563EB",
  "#3B82F6",
  "#60A5FA",
  "#06B6D4",
  "#6366F1",
  "#8B5CF6",
  // Accents / Status / Warm
  "#10B981",
  "#059669",
  "#F59E0B",
  "#F97316",
  "#EF4444",
  "#E11D48",
  "#EC4899",
  // Neutrals / Surfaces / Mono
  "#000000",
  "#0A0A0C",
  "#111827",
  "#1F2937",
  "#6B7280",
  "#E5E7EB",
  "#FFFFFF",
];

export const TokenColorPicker: React.FC<TokenColorPickerProps> = ({
  label,
  value,
  onChange,
  className = "",
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState(value);
  const [coords, setCoords] = useState<{ top: number; left: number }>({
    top: 0,
    left: 0,
  });

  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  // Sync external value
  useEffect(() => {
    setInputValue(value);
  }, [value]);

  const updatePosition = useCallback(() => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const popoverWidth = 260;
    const popoverHeight = 270;
    const padding = 16;

    // Expand to the left of the trigger so it moves away from the viewport's right edge
    let left = rect.right - popoverWidth;

    // Viewport horizontal bounds clamping
    if (left + popoverWidth > window.innerWidth - padding) {
      left = window.innerWidth - popoverWidth - padding;
    }
    if (left < padding) {
      left = padding;
    }

    // Viewport vertical bounds clamping
    let top = rect.bottom + 8;
    if (top + popoverHeight > window.innerHeight - padding) {
      // Flip upwards if not enough room below
      top = Math.max(padding, rect.top - popoverHeight - 8);
    }

    setCoords({ top, left });
  }, []);

  const handleOpen = () => {
    updatePosition();
    setIsOpen(true);
  };

  const handleClose = () => {
    setIsOpen(false);
  };

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;

    const handlePointerDown = (e: MouseEvent) => {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(e.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(e.target as Node)
      ) {
        handleClose();
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        handleClose();
      }
    };

    const handleWindowEvents = () => {
      updatePosition();
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    window.addEventListener("resize", handleWindowEvents, { passive: true });
    window.addEventListener("scroll", handleWindowEvents, { passive: true });

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("resize", handleWindowEvents);
      window.removeEventListener("scroll", handleWindowEvents);
    };
  }, [isOpen, updatePosition]);

  const handleHexChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let raw = e.target.value.trim();
    if (!raw.startsWith("#")) raw = "#" + raw;
    setInputValue(raw);
    if (/^#[0-9A-Fa-f]{3,8}$/.test(raw)) {
      onChange(raw);
    }
  };

  const handleColorSelect = (color: string) => {
    setInputValue(color);
    onChange(color);
  };

  return (
    <div className={`${styles.container} ${className}`}>
      <button
        ref={triggerRef}
        type="button"
        className={styles.swatchTrigger}
        style={{ backgroundColor: value }}
        onClick={() => (isOpen ? handleClose() : handleOpen())}
        title={`Customize ${label} (Current: ${value})`}
        aria-label={`Customize ${label}`}
        aria-expanded={isOpen}
      />

      {isOpen &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            ref={popoverRef}
            className={styles.popoverPortal}
            style={{
              top: `${coords.top}px`,
              left: `${coords.left}px`,
            }}
            role="dialog"
            aria-label={`${label} color picker`}
          >
            <div className={styles.popoverHeader}>
              <span className={styles.popoverTitle}>{label}</span>
              <button
                type="button"
                className={styles.closeButton}
                onClick={handleClose}
                aria-label="Close color picker"
              >
                ✕
              </button>
            </div>

            {/* Live Preview & Hex Input */}
            <div className={styles.previewRow}>
              <div
                className={styles.largePreviewSwatch}
                style={{ backgroundColor: value }}
              />
              <div className={styles.hexInputWrapper}>
                <span className={styles.hexPrefix}>#</span>
                <input
                  type="text"
                  className={styles.hexInput}
                  value={inputValue.replace(/^#/, "")}
                  onChange={handleHexChange}
                  placeholder="0066CC"
                  maxLength={8}
                  spellCheck={false}
                  aria-label={`${label} hex value`}
                />
              </div>
            </div>

            {/* Quick Palettes */}
            <div className={styles.paletteSection}>
              <span className={styles.paletteLabel}>Palette Presets</span>
              <div className={styles.paletteGrid}>
                {CURATED_PALETTE.map((color) => (
                  <button
                    key={color}
                    type="button"
                    className={`${styles.paletteItem} ${
                      value.toLowerCase() === color.toLowerCase()
                        ? styles.activePaletteItem
                        : ""
                    }`}
                    style={{ backgroundColor: color }}
                    onClick={() => handleColorSelect(color)}
                    title={color}
                    aria-label={`Select ${color}`}
                  />
                ))}
              </div>
            </div>

            {/* Native Spectrum Picker Trigger (Centered Safely Within Screen) */}
            <label className={styles.customPickerRow}>
              <span className={styles.customPickerLabel}>
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <circle cx="12" cy="12" r="10" />
                  <path d="M12 2a7 7 0 0 1 7 7c0 4.5-5 8-7 13-2-5-7-8.5-7-13a7 7 0 0 1 7-7z" />
                </svg>
                Custom Spectrum Picker
              </span>
              <input
                type="color"
                className={styles.nativeColorInput}
                value={value.startsWith("#") && value.length === 7 ? value : "#0066cc"}
                onChange={(e) => handleColorSelect(e.target.value)}
                aria-label="Custom color spectrum"
              />
            </label>
          </div>,
          document.body,
        )}
    </div>
  );
};

