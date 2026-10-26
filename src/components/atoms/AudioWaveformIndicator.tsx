import React from "react";
import styles from "./AudioWaveformIndicator.module.css";

interface AudioWaveformIndicatorProps {
  level: number; // 0-1
  isRecording: boolean;
  className?: string;
}

/**
 * AudioWaveformIndicator - Atom component
 * Visualizes microphone input level with animated bars
 */
export const AudioWaveformIndicator: React.FC<AudioWaveformIndicatorProps> = ({
  level,
  isRecording,
  className = "",
}) => {
  const barCount = 5;
  const bars = Array.from({ length: barCount }, (_, i) => {
    // Stagger the animation delay for each bar
    const delay = i * 80;
    // Use the level to determine height, with some randomness for visual interest
    const baseHeight = Math.max(level * 100, isRecording ? 10 : 0);
    const variation = isRecording ? Math.sin(Date.now() / 100 + i) * 15 : 0;
    const height = Math.min(Math.max(baseHeight + variation, 0), 100);

    return (
      <div
        key={i}
        className={styles.bar}
        style={
          {
            height: `${height}%`,
            animationDelay: `${delay}ms`,
          } as React.CSSProperties
        }
      />
    );
  });

  return (
    <div
      className={`${styles.container} ${className}`}
      role="img"
      aria-label={
        isRecording
          ? `Recording, audio level ${Math.round(level * 100)}%`
          : "Microphone inactive"
      }
    >
      <div className={styles.waveform} aria-hidden="true">
        {bars}
      </div>
      <div
        className={`${styles.icon} ${isRecording ? styles.recording : ""}`}
        aria-hidden="true"
      >
        {isRecording ? (
          <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
            <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.3-3c0 3-2.54 5.1-5.3 5.1S6.7 14 6.7 11H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c3.28-.48 6-3.3 6-6.72h-1.7z" />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
            <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.3-3c0 3-2.54 5.1-5.3 5.1S6.7 14 6.7 11H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c3.28-.48 6-3.3 6-6.72h-1.7z" />
          </svg>
        )}
      </div>
    </div>
  );
};

AudioWaveformIndicator.displayName = "AudioWaveformIndicator";
