import { NextRequest, NextResponse } from "next/server";

/**
 * POST /api/perceive
 * SAM 3.1 + Muse Voice ingestion
 * Accepts image + optional audio (multipart or JSON), returns segmentation mask + transcription
 */
export async function POST(request: NextRequest) {
  try {
    const contentType = request.headers.get("content-type") || "";

    let imageBase64: string | null = null;
    let imageMimeType = "image/png";
    let audioBase64: string | null = null;
    let audioMimeType = "audio/webm";
    let viewportWidth = 1280;
    let viewportHeight = 800;

    if (contentType.includes("application/json")) {
      const json = await request.json();
      audioBase64 = json.audioBase64 || null;
      audioMimeType = json.audioMimeType || "audio/webm";
      imageBase64 = json.imageBase64 || null;
      viewportWidth = json.viewportWidth || 1280;
      viewportHeight = json.viewportHeight || 800;
    } else if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      const imageFile = formData.get("image") as File | null;
      const audioFile = formData.get("audio") as File | null;
      viewportWidth = parseInt(
        (formData.get("viewportWidth") as string) || "1280",
        10,
      );
      viewportHeight = parseInt(
        (formData.get("viewportHeight") as string) || "800",
        10,
      );

      if (imageFile) {
        const imageBuffer = await imageFile.arrayBuffer();
        imageBase64 = Buffer.from(imageBuffer).toString("base64");
        imageMimeType = imageFile.type || "image/png";
      }

      if (audioFile) {
        const audioBuffer = await audioFile.arrayBuffer();
        audioBase64 = Buffer.from(audioBuffer).toString("base64");
        audioMimeType = audioFile.type || "audio/webm";
      }
    }

    // Process SAM 3.1 Segmentation if image provided
    let segmentationMask = null;
    if (imageBase64) {
      const metaApiKey = process.env["META_API_KEY"];
      const samUrl = process.env["SAM_API_URL"] || "https://api.meta.ai/v1";
      const samResponse = await fetch(`${samUrl}/segment`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(metaApiKey ? { Authorization: `Bearer ${metaApiKey}` } : {}),
        },
        body: JSON.stringify({
          image: `data:${imageMimeType};base64,${imageBase64}`,
          points: [],
        }),
        signal: AbortSignal.timeout(15000),
      });

      if (!samResponse.ok) {
        const errorText = await samResponse.text().catch(() => "");
        throw new Error(`SAM 3.1 API error (${samResponse.status}): ${errorText}`);
      }

      const samData = await samResponse.json();
      segmentationMask = {
        maskData: samData.mask || [],
        bounds: samData.bounds || { x: 0, y: 0, width: 0, height: 0 },
        confidence: samData.confidence || 0.95,
        viewportWidth,
        viewportHeight,
      };
    }

    // Process Muse Voice API if audio provided
    let transcription = "";
    if (audioBase64) {
      const metaApiKey = process.env["META_API_KEY"];
      const museVoiceUrl =
        process.env["MUSE_VOICE_API_URL"] || "https://api.meta.ai/v1";

      // Build multipart form for the transcription endpoint
      const audioBuffer = Buffer.from(audioBase64, "base64");
      const boundary = "----MetaVoiceBoundary" + Date.now().toString(16);
      const ext = audioMimeType.includes("ogg") ? "ogg" : "webm";

      const formParts = [
        `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="audio.${ext}"\r\nContent-Type: ${audioMimeType}\r\n\r\n`,
        audioBuffer,
        `\r\n--${boundary}\r\nContent-Disposition: form-data; name="model"\r\n\r\nmuse-voice-transcribe-1.0\r\n`,
        `--${boundary}\r\nContent-Disposition: form-data; name="language"\r\n\r\nen\r\n`,
        `--${boundary}--\r\n`,
      ];

      const bodyParts = formParts.map((p) =>
        typeof p === "string" ? Buffer.from(p, "utf-8") : p,
      );
      const body = Buffer.concat(bodyParts);

      const voiceResponse = await fetch(
        `${museVoiceUrl}/audio/transcriptions`,
        {
          method: "POST",
          headers: {
            "Content-Type": `multipart/form-data; boundary=${boundary}`,
            ...(metaApiKey
              ? { Authorization: `Bearer ${metaApiKey}` }
              : {}),
          },
          body,
          signal: AbortSignal.timeout(15000),
        },
      );

      if (!voiceResponse.ok) {
        const errorText = await voiceResponse.text().catch(() => "");
        throw new Error(`Muse Voice API error (${voiceResponse.status}): ${errorText}`);
      }

      const voiceData = await voiceResponse.json();
      transcription = voiceData.text || "";
    }

    return NextResponse.json({
      success: true,
      intent: transcription,
      transcription,
      segmentationMask,
    });
  } catch (error) {
    console.error("Perception error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Perception failed",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
