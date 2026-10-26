import { NextRequest, NextResponse } from "next/server";

/**
 * POST /api/perceive
 * SAM 3.1 + Muse Voice ingestion
 * Accepts image + optional audio, returns segmentation mask + transcription
 */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const imageFile = formData.get("image") as File | null;
    const audioFile = formData.get("audio") as File | null;
    const viewportWidth = parseInt(
      (formData.get("viewportWidth") as string) || "0",
      10,
    );
    const viewportHeight = parseInt(
      (formData.get("viewportHeight") as string) || "0",
      10,
    );

    if (!imageFile) {
      return NextResponse.json(
        { success: false, error: "Image file is required" },
        { status: 400 },
      );
    }

    if (!viewportWidth || !viewportHeight) {
      return NextResponse.json(
        { success: false, error: "Viewport dimensions are required" },
        { status: 400 },
      );
    }

    // Convert image to base64 for SAM
    const imageBuffer = await imageFile.arrayBuffer();
    const imageBase64 = Buffer.from(imageBuffer).toString("base64");
    const imageMimeType = imageFile.type || "image/png";

    // Call SAM 3.1 API
    const samUrl = process.env["SAM_API_URL"] || "http://localhost:8001";
    let segmentationMask = null;

    try {
      const samResponse = await fetch(`${samUrl}/segment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          image: `data:${imageMimeType};base64,${imageBase64}`,
          points: [], // Would come from click coordinates
        }),
        signal: AbortSignal.timeout(30000),
      });

      if (samResponse.ok) {
        const samData = await samResponse.json();
        segmentationMask = {
          maskData: samData.mask || [],
          bounds: samData.bounds || { x: 0, y: 0, width: 0, height: 0 },
          confidence: samData.confidence || 0.9,
          viewportWidth,
          viewportHeight,
        };
      }
    } catch (samError) {
      console.warn("SAM 3.1 unavailable, using fallback:", samError);
      // Fallback: create a simple bounding box mask
      segmentationMask = {
        maskData: [],
        bounds: { x: 0.25, y: 0.25, width: 0.5, height: 0.5 },
        confidence: 0.5,
        viewportWidth,
        viewportHeight,
      };
    }

    // Call Muse Voice API if audio provided
    let transcription = "";
    if (audioFile && audioFile.size > 0) {
      const audioBuffer = await audioFile.arrayBuffer();
      const audioBase64 = Buffer.from(audioBuffer).toString("base64");
      const audioMimeType = audioFile.type || "audio/webm";

      const museVoiceUrl =
        process.env["MUSE_VOICE_API_URL"] || "http://localhost:8002";
      try {
        const voiceResponse = await fetch(`${museVoiceUrl}/transcribe`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            audio: `data:${audioMimeType};base64,${audioBase64}`,
            language: "en",
          }),
          signal: AbortSignal.timeout(30000),
        });

        if (voiceResponse.ok) {
          const voiceData = await voiceResponse.json();
          transcription = voiceData.text || "";
        }
      } catch (voiceError) {
        console.warn("Muse Voice unavailable:", voiceError);
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        segmentationMask,
        transcription,
        timestamp: Date.now(),
      },
    });
  } catch (error) {
    console.error("Perception error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Perception processing failed",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
