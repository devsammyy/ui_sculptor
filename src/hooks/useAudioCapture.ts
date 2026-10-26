import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Audio Capture Hook - Handles MediaRecorder for push-to-talk voice input
 */
export interface UseAudioCaptureReturn {
  isRecording: boolean;
  audioLevel: number;
  startRecording: () => Promise<void>;
  stopRecording: () => void;
  error: string | null;
}

/** Pick the best supported MIME type for this browser */
function getSupportedMimeType(): string {
  const candidates = [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/ogg;codecs=opus",
    "audio/ogg",
    "audio/mp4",
  ];
  for (const mime of candidates) {
    if (typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(mime)) {
      return mime;
    }
  }
  return ""; // let the browser decide
}

export function useAudioCapture(
  onTranscription?: (audioBlob: Blob) => Promise<void>,
): UseAudioCaptureReturn {
  const [isRecording, setIsRecording] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const isRecordingRef = useRef(false); // stable ref for the rAF loop
  const onTranscriptionRef = useRef(onTranscription);

  // Keep ref in sync so the onstop closure always sees the latest callback
  useEffect(() => {
    onTranscriptionRef.current = onTranscription;
  }, [onTranscription]);

  /** Runs in a requestAnimationFrame loop while recording */
  const tickAudioLevel = useCallback(() => {
    if (!analyserRef.current || !isRecordingRef.current) return;

    const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
    analyserRef.current.getByteFrequencyData(dataArray);
    const avg = dataArray.reduce((a, v) => a + v, 0) / dataArray.length;
    setAudioLevel(Math.min(avg / 128, 1));

    animationFrameRef.current = requestAnimationFrame(tickAudioLevel);
  }, []);

  const startRecording = useCallback(async () => {
    if (isRecordingRef.current) return; // already recording

    try {
      setError(null);

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 16000,
        },
      });

      streamRef.current = stream;

      // Audio level analysis
      const audioContext = new AudioContext();
      audioContextRef.current = audioContext;
      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      analyserRef.current = analyser;

      // Pick a MIME type the browser actually supports
      const mimeType = getSupportedMimeType();
      const recorderOptions = mimeType ? { mimeType } : {};
      const mediaRecorder = new MediaRecorder(stream, recorderOptions);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      // Single authoritative onstop — calls the transcription callback
      mediaRecorder.onstop = async () => {
        const blob = new Blob(audioChunksRef.current, {
          type: mimeType || "audio/webm",
        });
        if (onTranscriptionRef.current && blob.size > 0) {
          await onTranscriptionRef.current(blob);
        }
      };

      mediaRecorder.start(100);
      isRecordingRef.current = true;
      setIsRecording(true);

      // Start the level meter loop
      animationFrameRef.current = requestAnimationFrame(tickAudioLevel);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Microphone access denied";
      setError(message);
      console.error("[useAudioCapture] startRecording error:", err);
    }
  }, [tickAudioLevel]);

  const stopRecording = useCallback(() => {
    if (!mediaRecorderRef.current || !isRecordingRef.current) return;

    // Stop the level meter
    if (animationFrameRef.current !== null) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    // Stop the recorder — triggers onstop which fires the transcription callback
    if (mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }

    // Release mic
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;

    // Close AudioContext
    audioContextRef.current?.close().catch(() => {});
    audioContextRef.current = null;
    analyserRef.current = null;

    isRecordingRef.current = false;
    setIsRecording(false);
    setAudioLevel(0);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      streamRef.current?.getTracks().forEach((t) => t.stop());
      if (mediaRecorderRef.current?.state !== "inactive") {
        mediaRecorderRef.current?.stop();
      }
      audioContextRef.current?.close().catch(() => {});
    };
  }, []);

  return { isRecording, audioLevel, startRecording, stopRecording, error };
}

/**
 * Hook for converting audio blob to base64
 */
export function useAudioBase64() {
  const toBase64 = useCallback(async (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        // Remove data URL prefix
        const base64 = result.split(",")[1] ?? "";
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }, []);

  return { toBase64 };
}
