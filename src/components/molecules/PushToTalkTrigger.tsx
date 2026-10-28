"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
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
 * Mic button + keyboard shortcut listener + waveform + transcription state
 */
export const PushToTalkTrigger: React.FC<PushToTalkTriggerProps> = ({
  onTranscription,
  onRecordingChange,
  className = "",
  shortcutKey = "Space",
}) => {
  const [transcriptionError, setTranscriptionError] = useState<string | null>(null);

  const handleAudioReady = useCallback(
    async (audioBlob: Blob) => {
      setTranscriptionError(null);
      try {
        const base64 = await blobToBase64(audioBlob);
        const response = await fetch("/api/perceive", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            audioBase64: base64,
            audioMimeType: audioBlob.type || "audio/wav",
          }),
        });

        if (response.ok) {
          const data = await response.json();
          const text = (data.intent || data.transcription || "").trim();
          if (text) {
            onTranscription(text);
          } else {
            console.warn("[PushToTalkTrigger] No speech recognized in audio");
          }
        } else {
          const errData = await response.json().catch(() => ({}));
          const errMsg = errData.details || errData.error || `HTTP ${response.status}`;
          console.error("[PushToTalkTrigger] Transcription error:", errMsg);
          setTranscriptionError(errMsg);
          setTimeout(() => setTranscriptionError(null), 4000);
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Transcription failed";
        console.error("[PushToTalkTrigger] Failed to send audio:", err);
        setTranscriptionError(msg);
        setTimeout(() => setTranscriptionError(null), 4000);
      }
    },
    [onTranscription],
  );

  const {
    isRecording,
    isTranscribing,
    audioLevel,
    startRecording,
    stopRecording,
    error: captureError,
  } = useAudioCapture(handleAudioReady);

  const buttonRef = useRef<HTMLButtonElement>(null);
  const isSpacePressed = useRef(false);
  const mouseDownTime = useRef(0);
  const isMouseDown = useRef(false);

  const activeError = captureError || transcriptionError;

  // Keyboard shortcut handling (Spacebar push-to-talk)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === shortcutKey && !isSpacePressed.current && !isRecording && !isTranscribing) {
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
      if (e.code === shortcutKey && isSpacePressed.current) {
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
  }, [shortcutKey, isRecording, isTranscribing, startRecording, stopRecording]);

  // Notify parent of recording state changes
  useEffect(() => {
    onRecordingChange?.(isRecording);
  }, [isRecording, onRecordingChange]);

  // Seamless click-to-toggle AND hold-to-talk support
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (e.button !== 0) return; // Only primary mouse button
      e.preventDefault();
      isMouseDown.current = true;
      mouseDownTime.current = Date.now();

      if (!isRecording && !isTranscribing) {
        startRecording();
      }
    },
    [isRecording, isTranscribing, startRecording],
  );

  const handleMouseUp = useCallback(() => {
    if (!isMouseDown.current) return;
    isMouseDown.current = false;
    const duration = Date.now() - mouseDownTime.current;

    // If held for >= 350ms, this was hold-to-talk -> release stops recording.
    // If clicked briefly (< 350ms), keep recording until clicked again (toggle mode).
    if (duration >= 350 && isRecording) {
      stopRecording();
    }
  }, [isRecording, stopRecording]);

  const handleClick = useCallback(() => {
    const duration = Date.now() - mouseDownTime.current;
    // If it was a quick click and already recording, stop it!
    if (duration < 350 && isRecording) {
      stopRecording();
    }
  }, [isRecording, stopRecording]);

  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      e.preventDefault();
      mouseDownTime.current = Date.now();
      if (!isRecording && !isTranscribing) {
        startRecording();
      }
    },
    [isRecording, isTranscribing, startRecording],
  );

  const handleTouchEnd = useCallback(() => {
    const duration = Date.now() - mouseDownTime.current;
    if (duration >= 350 && isRecording) {
      stopRecording();
    }
  }, [isRecording, stopRecording]);

  return (
    <button
      ref={buttonRef}
      type="button"
      className={`${styles.container} ${isRecording ? styles.recording : ""} ${
        isTranscribing ? styles.transcribing : ""
      } ${className}`}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      onClick={handleClick}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      aria-label={
        isTranscribing
          ? "Transcribing voice with Meta Muse..."
          : isRecording
          ? "Listening... Click or release to transcribe"
          : `Click or hold ${shortcutKey} to speak`
      }
      aria-pressed={isRecording}
      disabled={isTranscribing}
      title={
        activeError
          ? `Error: ${activeError}`
          : isTranscribing
          ? "Transcribing voice with Meta Muse..."
          : isRecording
          ? "Listening... Click or release Space to finish"
          : `Click or hold ${shortcutKey} to speak`
      }
    >
      <AudioWaveformIndicator
        level={audioLevel}
        isRecording={isRecording}
        isTranscribing={isTranscribing}
      />
      <span className={styles.shortcutHint}>
        {isTranscribing ? "..." : shortcutKey === "Space" ? "␣" : shortcutKey}
      </span>
      {activeError && (
        <span className={styles.error} role="alert">
          {activeError}
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
