import { ModelStrategyFactory } from "@/core/domain/strategies/model-strategy";
import { CodeSynthesisService } from "@/core/services/CodeSynthesisService";
import { ValidationPipeline } from "@/core/services/ValidationPipeline";
import {
  DiskFileSystemAdapter,
  ConsoleTelemetryAdapter,
} from "@/infrastructure/adapters/file-system-adapters";
import { SynthesisContext } from "@/core/domain/models/viewport-target";
import { NextRequest, NextResponse } from "next/server";

/**
 * POST /api/sculpt
 * Orchestrator entry point
 * Accepts intent + target, runs perception -> synthesis -> validation -> apply
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { intent, target, filePath, context } = body;

    if (!intent || !target) {
      return NextResponse.json(
        { success: false, error: "Intent and target are required" },
        { status: 400 },
      );
    }

    // Initialize services
    const fileSystem = new DiskFileSystemAdapter(process.cwd());
    const telemetry = new ConsoleTelemetryAdapter();
    const validationPipeline = new ValidationPipeline();
    const modelStrategy = ModelStrategyFactory.createSynthesisStrategy();
    const codeSynthesis = new CodeSynthesisService(
      fileSystem,
      telemetry,
      modelStrategy,
      validationPipeline,
    );

    // Read the target file
    const targetFilePath = filePath || "src/components/sculpted/Component.tsx";
    let oldCode = "";
    if (filePath) {
      try {
        oldCode = await fileSystem.readFile(filePath);
      } catch {
        // File might not exist yet (create new)
        oldCode = "";
      }
    }

    const normalizedTarget = {
      x: typeof target?.x === "number" ? target.x : 0.5,
      y: typeof target?.y === "number" ? target.y : 0.5,
      viewportWidth: target?.viewportWidth || 1280,
      viewportHeight: target?.viewportHeight || 800,
      timestamp: target?.timestamp || Date.now(),
      source: (target?.source as "click" | "voice" | "gesture") || "click",
    };

    const mask = {
      base64Png: context?.mask?.base64Png || "",
      boundingBox: context?.mask?.boundingBox || {
        x: normalizedTarget.x,
        y: normalizedTarget.y,
        width: 0.1,
        height: 0.1,
      },
      confidence: context?.mask?.confidence || 0.95,
      targetElement:
        context?.mask?.targetElement ||
        (typeof target === "string" ? target : "Component"),
    };

    const astContext = {
      filePath: targetFilePath,
      nodeType: "JSXElement",
      startLine: 1,
      endLine: oldCode ? oldCode.split("\n").length : 1,
      sourceCode:
        oldCode ||
        `import React from 'react';\n\nexport const Component: React.FC = () => {\n  return <div>Scaffold</div>;\n};\nexport default Component;\n`,
      parentComponent: mask.targetElement,
    };

    const projectFiles = new Map<string, string>();
    if (oldCode) {
      projectFiles.set(targetFilePath, oldCode);
    }

    // Build synthesis context
    const synthesisContext: SynthesisContext = {
      target: normalizedTarget,
      mask,
      astContext,
      userIntent: intent,
      projectFiles,
      designTokens: context?.designTokens || {
        colors: {
          primary: "#0066CC",
          secondary: "#6B7280",
          background: "#FFFFFF",
          surface: "#F9FAFB",
          text: "#111827",
          border: "#E5E7EB",
        },
        spacing: { xs: "4px", sm: "8px", md: "16px", lg: "24px", xl: "32px" },
        typography: {
          fontFamily: "Inter, system-ui, sans-serif",
          fontSizeBase: "16px",
          fontSizeLg: "18px",
          fontSizeXl: "20px",
        },
        borderRadius: { sm: "4px", md: "8px", lg: "12px", full: "9999px" },
      },
    };

    // Run code synthesis and patch application pipeline
    const synthesisResult = await codeSynthesis.synthesizeAndApply(synthesisContext);

    if (!synthesisResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: "Code synthesis failed",
          diagnostics: synthesisResult.diagnostics,
        },
        { status: 422 },
      );
    }

    let newCode = "";
    try {
      newCode = await fileSystem.readFile(targetFilePath);
    } catch {
      newCode = "";
    }

    // Return result with diff info
    return NextResponse.json({
      success: true,
      data: {
        filePath: targetFilePath,
        oldCode,
        newCode,
        diagnostics: synthesisResult.diagnostics,
        metadata: synthesisResult.metadata,
      },
    });
  } catch (error) {
    console.error("Sculpt error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Sculpt operation failed",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
