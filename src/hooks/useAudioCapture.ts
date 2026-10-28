import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Audio Capture Hook - Handles Web Audio / MediaRecorder for push-to-talk voice input
 */
export interface UseAudioCaptureReturn {
  isRecording: boolean;
  isTranscribing: boolean;
  audioLevel: number;
  startRecording: () => Promise<void>;
  stopRecording: () => void;
  error: string | null;
}

/** Encode Float32Array PCM samples into a standard 16-bit Mono WAV ArrayBuffer */
function encodeWav(samples: Float32Array, sampleRate: number): ArrayBuffer {
  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buffer);

  function writeString(offset: number, str: string) {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i));
    }
  }

  // RIFF header
  writeString(0, "RIFF");
  view.setUint32(4, 36 + samples.length * 2, true);
  writeString(8, "WAVE");

  // Format chunk
  writeString(12, "fmt ");
  view.setUint32(16, 16, true); // SubChunk1Size (16 for PCM)
  view.setUint16(20, 1, true); // AudioFormat (1 for PCM)
  view.setUint16(22, 1, true); // NumChannels (1 mono)
  view.setUint32(24, sampleRate, true); // SampleRate
  view.setUint32(28, sampleRate * 2, true); // ByteRate (SampleRate * 1 channel * 2 bytes)
  view.setUint16(32, 2, true); // BlockAlign (1 channel * 2 bytes)
  view.setUint16(34, 16, true); // BitsPerSample (16 bits)

  // Data chunk
  writeString(36, "data");
  view.setUint32(40, samples.length * 2, true);

  // Convert float32 to int16 PCM
  let offset = 44;
  for (let i = 0; i < samples.length; i++, offset += 2) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }

  return buffer;
}

/** Pick fallback supported MIME type for MediaRecorder if needed */
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
  return "";
}

export function useAudioCapture(
  onTranscription?: (audioBlob: Blob) => Promise<void>,
): UseAudioCaptureReturn {
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const pcmChunksRef = useRef<Float32Array[]>([]);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const isRecordingRef = useRef(false);
  const isStartingRef = useRef(false);
  const stopRequestedRef = useRef(false);
  const onTranscriptionRef = useRef(onTranscription);

  // Keep ref in sync so callbacks always see the latest handler
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

  const cleanupAudioPipeline = useCallback(() => {
    if (animationFrameRef.current !== null) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    if (processorRef.current) {
      try {
        processorRef.current.disconnect();
      } catch {}
      processorRef.current = null;
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }

    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }

    analyserRef.current = null;
    isRecordingRef.current = false;
    setIsRecording(false);
    setAudioLevel(0);
  }, []);

  const finishAndTranscribe = useCallback(async () => {
    cleanupAudioPipeline();

    // Prepare recorded audio blob
    let blob: Blob | null = null;

    // Prefer clean 16kHz WAV from PCM samples
    if (pcmChunksRef.current.length > 0) {
      const totalLength = pcmChunksRef.current.reduce((acc, c) => acc + c.length, 0);
      if (totalLength > 0) {
        const allSamples = new Float32Array(totalLength);
        let offset = 0;
        for (const chunk of pcmChunksRef.current) {
          allSamples.set(chunk, offset);
          offset += chunk.length;
        }
        const wavBuffer = encodeWav(allSamples, 16000);
        blob = new Blob([wavBuffer], { type: "audio/wav" });
      }
    }

    // Fall back to MediaRecorder chunks if PCM was empty
    if (!blob || blob.size === 0) {
      if (audioChunksRef.current.length > 0) {
        blob = new Blob(audioChunksRef.current, {
          type: getSupportedMimeType() || "audio/webm",
        });
      }
    }

    pcmChunksRef.current = [];
    audioChunksRef.current = [];

    if (blob && blob.size > 0 && onTranscriptionRef.current) {
      try {
        setIsTranscribing(true);
        await onTranscriptionRef.current(blob);
      } catch (err) {
        console.error("[useAudioCapture] Transcription error:", err);
      } finally {
        setIsTranscribing(false);
      }
    }
  }, [cleanupAudioPipeline]);

  const startRecording = useCallback(async () => {
    if (isRecordingRef.current || isStartingRef.current) return;

    try {
      setError(null);
      isStartingRef.current = true;
      stopRequestedRef.current = false;
      pcmChunksRef.current = [];
      audioChunksRef.current = [];

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 16000,
        },
      });

      // Handle if stop was requested while waiting for permission/device
      if (stopRequestedRef.current) {
        stream.getTracks().forEach((t) => t.stop());
        isStartingRef.current = false;
        return;
      }

      streamRef.current = stream;

      // Audio level & PCM recording using 16kHz AudioContext
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const audioContext = new AudioCtx({ sampleRate: 16000 });
      audioContextRef.current = audioContext;

      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      analyserRef.current = analyser;

      // ScriptProcessor captures raw 16kHz PCM audio samples
      if (audioContext.createScriptProcessor) {
        const processor = audioContext.createScriptProcessor(4096, 1, 1);
        processor.onaudioprocess = (e) => {
          if (!isRecordingRef.current) return;
          const inputData = e.inputBuffer.getChannelData(0);
          pcmChunksRef.current.push(new Float32Array(inputData));
        };
        source.connect(processor);
        processor.connect(audioContext.destination);
        processorRef.current = processor;
      }

      // Also use MediaRecorder as companion fallback
      const mimeType = getSupportedMimeType();
      if (typeof MediaRecorder !== "undefined") {
        try {
          const recorderOptions = mimeType ? { mimeType } : {};
          const mediaRecorder = new MediaRecorder(stream, recorderOptions);
          mediaRecorderRef.current = mediaRecorder;
          mediaRecorder.ondataavailable = (event) => {
            if (event.data && event.data.size > 0) {
              audioChunksRef.current.push(event.data);
            }
          };
          mediaRecorder.start(100);
        } catch (recorderErr) {
          console.warn("[useAudioCapture] MediaRecorder fallback init failed:", recorderErr);
        }
      }

      isRecordingRef.current = true;
      isStartingRef.current = false;
      setIsRecording(true);

      // Start level visualizer loop
      animationFrameRef.current = requestAnimationFrame(tickAudioLevel);
    } catch (err) {
      isStartingRef.current = false;
      const message =
        err instanceof Error ? err.message : "Microphone access denied";
      setError(message);
      console.error("[useAudioCapture] startRecording error:", err);
    }
  }, [tickAudioLevel]);

  const stopRecording = useCallback(() => {
    // If start is still initializing getUserMedia, mark stop requested
    if (isStartingRef.current) {
      stopRequestedRef.current = true;
      return;
    }

    if (!isRecordingRef.current) return;

    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state !== "inactive"
    ) {
      try {
        mediaRecorderRef.current.stop();
      } catch {}
    }

    finishAndTranscribe();
  }, [finishAndTranscribe]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanupAudioPipeline();
    };
  }, [cleanupAudioPipeline]);

  return {
    isRecording,
    isTranscribing,
    audioLevel,
    startRecording,
    stopRecording,
    error,
  };
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
