"use client";

import React, { useCallback, useEffect, useRef } from "react";
import { useAudioCapture } from "../../hooks/useAudioCapture";
import { AudioWaveformIndicator } from "../atoms/AudioWaveformIndicator";
import styles from "./PushToTalkTrigger.module.css";

interface PushToTalkTriggerProps {
  onTranscription: (text: string) => void;
  onRecordingChange?: (isRecording: boolean) => void;
  className?: string;
  shortcutKey?: string; // Default: 'Space'
}

/**
 * PushToTalkTrigger - Molecule component
 * Mic button + keyboard shortcut listener + waveform
 */
export const PushToTalkTrigger: React.FC<PushToTalkTriggerProps> = ({
  onTranscription,
  onRecordingChange,
  className = "",
  shortcutKey = "Space",
}) => {
  const { isRecording, audioLevel, startRecording, stopRecording, error } =
    useAudioCapture(
      useCallback(
        async (audioBlob: Blob) => {
          // Convert to base64 and send to API
          const base64 = await blobToBase64(audioBlob);
          try {
            const response = await fetch("/api/perceive", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                audioBase64: base64,
                audioMimeType: "audio/webm",
              }),
            });

            if (response.ok) {
              const data = await response.json();
              if (data.intent) {
                onTranscription(data.intent);
              }
            }
          } catch (err) {
            console.error("Transcription failed:", err);
          }
        },
        [onTranscription],
      ),
    );

  const buttonRef = useRef<HTMLButtonElement>(null);
  const isSpacePressed = useRef(false);

  // Keyboard shortcut handling
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === shortcutKey && !isSpacePressed.current && !isRecording) {
        // Prevent default only for space key when not in input
        const activeElement = document.activeElement;
        const isInput =
          activeElement?.tagName === "INPUT" ||
          activeElement?.tagName === "TEXTAREA" ||
          activeElement?.getAttribute("contenteditable") === "true";

        if (!isInput) {
          e.preventDefault();
          isSpacePressed.current = true;
          startRecording();
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === shortcutKey && isSpacePressed.current && isRecording) {
        e.preventDefault();
        isSpacePressed.current = false;
        stopRecording();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [shortcutKey, isRecording, startRecording, stopRecording]);

  // Notify parent of recording state changes
  useEffect(() => {
    onRecordingChange?.(isRecording);
  }, [isRecording, onRecordingChange]);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      startRecording();
    },
    [startRecording],
  );

  const handleMouseUp = useCallback(() => {
    stopRecording();
  }, [stopRecording]);

  const handleMouseLeave = useCallback(() => {
    if (isRecording) {
      stopRecording();
    }
  }, [isRecording, stopRecording]);

  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      e.preventDefault();
      startRecording();
    },
    [startRecording],
  );

  const handleTouchEnd = useCallback(() => {
    stopRecording();
  }, [stopRecording]);

  return (
    <button
      ref={buttonRef}
      className={`${styles.container} ${isRecording ? styles.recording : ""} ${className}`}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseLeave}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      aria-label={
        isRecording
          ? "Release to stop recording"
          : `Hold ${shortcutKey} or click to record`
      }
      aria-pressed={isRecording}
      disabled={error !== null}
      title={
        error ? `Error: ${error}` : `Hold ${shortcutKey} or click to speak`
      }
    >
      <AudioWaveformIndicator level={audioLevel} isRecording={isRecording} />
      <span className={styles.shortcutHint}>
        {shortcutKey === "Space" ? "␣" : shortcutKey}
      </span>
      {error && (
        <span className={styles.error} role="alert">
          {error}
        </span>
      )}
    </button>
  );
};

PushToTalkTrigger.displayName = "PushToTalkTrigger";

// Helper function
function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      resolve(result.split(",")[1] || "");
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}
