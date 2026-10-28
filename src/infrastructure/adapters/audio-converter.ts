import ffmpegStatic from "ffmpeg-static";
import { spawn } from "child_process";
import fs from "fs";

function getFfmpegPath(): string {
  // Prefer system ffmpeg if installed
  if (fs.existsSync("/usr/bin/ffmpeg")) {
    return "/usr/bin/ffmpeg";
  }
  if (fs.existsSync("/usr/local/bin/ffmpeg")) {
    return "/usr/local/bin/ffmpeg";
  }
  // Next check ffmpeg-static if valid file
  if (typeof ffmpegStatic === "string" && fs.existsSync(ffmpegStatic)) {
    return ffmpegStatic;
  }
  return "ffmpeg";
}

/**
 * Ensures an audio buffer is converted to a 16kHz 16-bit mono WAV buffer
 * suitable for Meta Muse Voice Transcribe API (POST /v1/asr/transcribe).
 */
export async function ensureWavBuffer(inputBuffer: Buffer): Promise<Buffer> {
  // If already standard WAV (starts with 'RIFF' and has 'WAVE' at offset 8)
  if (
    inputBuffer.length >= 12 &&
    inputBuffer.toString("utf8", 0, 4) === "RIFF" &&
    inputBuffer.toString("utf8", 8, 12) === "WAVE"
  ) {
    return inputBuffer;
  }

  return new Promise((resolve, reject) => {
    const bin = getFfmpegPath();
    const ffmpeg = spawn(bin, [
      "-y",
      "-i", "pipe:0",
      "-ar", "16000",
      "-ac", "1",
      "-c:a", "pcm_s16le",
      "-f", "wav",
      "pipe:1",
    ]);

    const chunks: Buffer[] = [];
    ffmpeg.stdout.on("data", (chunk) => chunks.push(chunk));
    let stderr = "";
    ffmpeg.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });

    ffmpeg.on("close", (code) => {
      if (code === 0) {
        resolve(Buffer.concat(chunks));
      } else {
        reject(
          new Error(
            `Audio conversion failed with exit code ${code}: ${stderr.slice(-200)}`,
          ),
        );
      }
    });

    ffmpeg.on("error", (err) => reject(err));

    ffmpeg.stdin.write(inputBuffer);
    ffmpeg.stdin.end();
  });
}
