import { DiskFileSystemAdapter } from "@/infrastructure/adapters/file-system-adapters";
import { NextRequest, NextResponse } from "next/server";
import { HostedMetaStrategy } from "@/core/domain/strategies/model-strategy";
import { SynthesisContext } from "@/core/domain/models/viewport-target";
import { ValidationPipeline } from "@/core/services/ValidationPipeline";

/**
 * POST /api/sculpt
 * Core mutation endpoint — routes strictly to hosted Muse Wonder 1.0 (Meta API)
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    const body = await request.json();
    const { intent, target, filePath, context } = body as {
      intent: string;
      target: { x: number; y: number };
      filePath: string;
      context?: { designTokens?: Record<string, unknown> };
    };

    if (!intent || typeof intent !== "string") {
      return NextResponse.json(
        { success: false, error: "Missing or invalid 'intent' field" },
        { status: 400 },
      );
    }

    if (!filePath || typeof filePath !== "string") {
      return NextResponse.json(
        { success: false, error: "Missing or invalid 'filePath' field" },
        { status: 400 },
      );
    }

    // Read the source file from disk
    const fileSystem = new DiskFileSystemAdapter(process.cwd());
    let sourceCode = "";
    try {
      sourceCode = await fileSystem.readFile(filePath);
    } catch {
      sourceCode = "";
    }

    // Build synthesis context
    const synthesisContext: SynthesisContext = {
      userIntent: intent,
      target: {
        x: target?.x ?? 0.5,
        y: target?.y ?? 0.5,
        viewportWidth: 1280,
        viewportHeight: 800,
        timestamp: Date.now(),
        source: "click",
      },
      astContext: {
        filePath,
        sourceCode,
        nodeType: "JSXElement",
        startLine: 1,
        endLine: sourceCode.split("\n").length,
        parentComponent: filePath.split("/").pop()?.replace(/\.[^.]+$/, "") ?? "Component",
      },
      mask: {
        base64Png: "",
        boundingBox: { x: 0.25, y: 0.25, width: 0.5, height: 0.5 },
        confidence: 0.95,
        targetElement: "ui-component",
      },
      designTokens: {
        colors: {
          primary: "#0066CC",
          secondary: "#6B7280",
          background: "#FFFFFF",
          surface: "#F9FAFB",
          text: "#111827",
          border: "#E5E7EB",
        },
        spacing: { xs: "0.25rem", sm: "0.5rem", md: "1rem", lg: "1.5rem", xl: "2rem" },
        borderRadius: { sm: "0.25rem", md: "0.5rem", lg: "1rem", full: "9999px" },
        typography: {
          fontFamily: "Inter, system-ui, sans-serif",
          fontSizeBase: "1rem",
          fontSizeLg: "1.125rem",
          fontSizeXl: "1.5rem",
        },
        ...((context?.designTokens as Partial<SynthesisContext["designTokens"]>) ?? {}),
      },
      projectFiles: new Map([[filePath, sourceCode]]),
    };

    // Strict Hosted Meta API execution (Hackathon & Spec requirement)
    const metaApiKey = process.env["META_API_KEY"];
    const museWonderUrl =
      process.env["MUSE_WONDER_API_URL"] || "https://api.meta.ai/v1";

    if (!metaApiKey) {
      return NextResponse.json(
        {
          success: false,
          error: "META_API_KEY environment variable is required to execute Muse Wonder 1.0",
        },
        { status: 500 },
      );
    }

    const strategy = new HostedMetaStrategy(metaApiKey, museWonderUrl);
    const result = await strategy.synthesizePatch(synthesisContext);

    if (!result.success || !result.patchedCode) {
      return NextResponse.json(
        {
          success: false,
          error:
            result.diagnostics[0]?.message || "Synthesis failed — no patched code returned from Meta API",
        },
        { status: 500 },
      );
    }

    // Step 2: Validate patched code using AST pipeline BEFORE persisting to disk
    const validationPipeline = new ValidationPipeline();
    const validationResult = await validationPipeline.validate(
      result.patchedCode,
      filePath,
      synthesisContext.projectFiles,
    );

    if (!validationResult.valid) {
      const syntaxError = validationResult.diagnostics.find(
        (d) => d.severity === "error",
      );
      return NextResponse.json(
        {
          success: false,
          error:
            syntaxError?.message ||
            "Synthesis produced incomplete or invalid syntax — file modification aborted to preserve build stability",
        },
        { status: 422 },
      );
    }

    // Persist the patched file to disk
    try {
      await fileSystem.writeFile(filePath, result.patchedCode);

      // Record in undo history file for persistent rollbacks
      const historyPath = ".ui-sculptor/history.json";
      let history: Array<{
        filePath: string;
        oldCode: string;
        newCode: string;
        timestamp: number;
      }> = [];
      try {
        const historyContent = await fileSystem.readFile(historyPath);
        history = JSON.parse(historyContent);
      } catch {
        // history file does not exist yet
      }
      history.push({
        filePath,
        oldCode: sourceCode,
        newCode: result.patchedCode,
        timestamp: Date.now(),
      });
      await fileSystem.writeFile(historyPath, JSON.stringify(history, null, 2));
    } catch (writeErr) {
      console.error("[sculpt] Failed to write patched file / history:", writeErr);
    }

    return NextResponse.json({
      success: true,
      data: {
        oldCode: sourceCode,
        newCode: result.patchedCode,
        filePath,
        metadata: {
          strategyUsed: result.metadata.strategyUsed,
          durationMs: result.metadata.durationMs,
          tokensUsed: result.metadata.tokensUsed,
          totalDurationMs: Date.now() - startTime,
        },
      },
    });
  } catch (error) {
    console.error("[sculpt] Unhandled error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Sculpt execution failed",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
