import { NextRequest, NextResponse } from "next/server";

/**
 * GET /api/verify-model
 * Open-weight infrastructure verification
 * Checks if vLLM/Ollama is running and Muse Spark Open 7B is available
 */
export async function GET(request: NextRequest) {
  try {
    const vllmUrl = process.env["VLLM_BASE_URL"] || "http://localhost:8000";
    const ollamaUrl =
      process.env["OLLAMA_BASE_URL"] || "http://localhost:11434";

    // Check vLLM
    let vllmStatus = "unavailable";
    let vllmModels: string[] = [];
    try {
      const vllmResponse = await fetch(`${vllmUrl}/v1/models`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
        signal: AbortSignal.timeout(5000),
      });
      if (vllmResponse.ok) {
        const data = await vllmResponse.json();
        vllmModels = data.data?.map((m: any) => m.id) || [];
        vllmStatus = vllmModels.some(
          (m) => m.includes("muse") || m.includes("spark"),
        )
          ? "ready"
          : "running";
      }
    } catch {
      vllmStatus = "unreachable";
    }

    // Check Ollama
    let ollamaStatus = "unavailable";
    let ollamaModels: string[] = [];
    try {
      const ollamaResponse = await fetch(`${ollamaUrl}/api/tags`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
        signal: AbortSignal.timeout(5000),
      });
      if (ollamaResponse.ok) {
        const data = await ollamaResponse.json();
        ollamaModels = data.models?.map((m: any) => m.name) || [];
        ollamaStatus = ollamaModels.some(
          (m) => m.includes("muse") || m.includes("spark"),
        )
          ? "ready"
          : "running";
      }
    } catch {
      ollamaStatus = "unreachable";
    }

    const hasOpenWeight = vllmStatus === "ready" || ollamaStatus === "ready";

    return NextResponse.json({
      success: true,
      data: {
        openWeightAvailable: hasOpenWeight,
        vllm: {
          status: vllmStatus,
          url: vllmUrl,
          models: vllmModels,
        },
        ollama: {
          status: ollamaStatus,
          url: ollamaUrl,
          models: ollamaModels,
        },
        recommendedEngine:
          vllmStatus === "ready"
            ? "vllm"
            : ollamaStatus === "ready"
              ? "ollama"
              : "none",
      },
    });
  } catch (error) {
    console.error("Model verification error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to verify model infrastructure",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
