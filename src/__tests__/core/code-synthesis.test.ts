import { CodeSynthesisService } from "../../core/services/CodeSynthesisService";
import { ValidationPipeline } from "../../core/services/ValidationPipeline";
import {
  ConsoleTelemetryAdapter,
  MemoryFileSystemAdapter,
} from "../../infrastructure/adapters/file-system-adapters";
import { CommandHistory } from "../../core/domain/commands/sculpt-command";
import { SynthesisContext } from "../../core/domain/models/viewport-target";
import { CodeSynthesisStrategy } from "../../core/domain/strategies/model-strategy";
import { TelemetryEvent } from "../../core/ports/file-system.port";

describe("CodeSynthesisService - Autonomous Self-Healing Loop", () => {
  let fileSystem: MemoryFileSystemAdapter;
  let telemetry: ConsoleTelemetryAdapter;
  let validationPipeline: ValidationPipeline;
  let commandHistory: CommandHistory;

  beforeEach(() => {
    fileSystem = new MemoryFileSystemAdapter();
    telemetry = new ConsoleTelemetryAdapter();
    validationPipeline = new ValidationPipeline();
    commandHistory = new CommandHistory(10);
  });

  const baseContext: SynthesisContext = {
    target: {
      x: 0.5,
      y: 0.5,
      viewportWidth: 1280,
      viewportHeight: 800,
      timestamp: Date.now(),
      source: "click",
    },
    mask: {
      base64Png: "",
      boundingBox: { x: 0.1, y: 0.1, width: 0.2, height: 0.1 },
      confidence: 0.99,
      targetElement: "Heading",
    },
    astContext: {
      filePath: "src/components/Heading.tsx",
      nodeType: "JSXElement",
      startLine: 1,
      endLine: 5,
      sourceCode: "export const Heading = () => <h1>Original</h1>;\nexport default Heading;\n",
      parentComponent: "Heading",
    },
    userIntent: "Change heading text to Sculpted",
    projectFiles: new Map(),
    designTokens: {
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
        fontFamily: "Inter, sans-serif",
        fontSizeBase: "16px",
        fontSizeLg: "18px",
        fontSizeXl: "20px",
      },
      borderRadius: { sm: "4px", md: "8px", lg: "12px", full: "9999px" },
    },
  };

  it("should synthesize, validate, apply patch and record command on success", async () => {
    const mockStrategy: CodeSynthesisStrategy = {
      engineName: "Mock-Engine-1",
      maxContextTokens: 4096,
      validateConnection: async () => true,
      synthesizePatch: async () => ({
        success: true,
        patchedCode: "export const Heading = () => <h1>Sculpted</h1>;\nexport default Heading;\n",
        diagnostics: [],
        metadata: {
          strategyUsed: "Mock-Engine-1",
          durationMs: 50,
          tokensUsed: 120,
        },
      }),
    };

    const telemetryEvents: TelemetryEvent[] = [];
    telemetry.subscribe((e) => telemetryEvents.push(e));

    const service = new CodeSynthesisService(
      fileSystem,
      telemetry,
      mockStrategy,
      validationPipeline,
      commandHistory,
    );

    const result = await service.synthesizeAndApply(baseContext);
    expect(result.success).toBe(true);
    expect(result.commands).toHaveLength(1);
    expect(commandHistory.canUndo()).toBe(true);

    const updatedContent = await fileSystem.readFile("src/components/Heading.tsx");
    expect(updatedContent).toContain("<h1>Sculpted</h1>");

    // Telemetry milestones
    expect(telemetryEvents.some((e) => e.type === "synthesis_start")).toBe(true);
    expect(telemetryEvents.some((e) => e.type === "validation_complete")).toBe(true);
    expect(telemetryEvents.some((e) => e.type === "patch_applied")).toBe(true);
  });

  it("should attempt self-healing when validation encounters a fixable error", async () => {
    let callCount = 0;
    const mockStrategy: CodeSynthesisStrategy = {
      engineName: "Mock-Self-Healing-Engine",
      maxContextTokens: 4096,
      validateConnection: async () => true,
      synthesizePatch: async () => {
        callCount++;
        if (callCount === 1) {
          // Pass 1: Generates code with forbidden eval
          return {
            success: true,
            patchedCode: "export const Heading = () => { eval(''); return <h1>Broken</h1>; };\nexport default Heading;\n",
            diagnostics: [],
            metadata: { strategyUsed: "Mock-Self-Healing-Engine", durationMs: 40, tokensUsed: 100 },
          };
        }
        // Pass 2: Self-healed code
        return {
          success: true,
          patchedCode: "export const Heading = () => <h1>Healed</h1>;\nexport default Heading;\n",
          diagnostics: [],
          metadata: { strategyUsed: "Mock-Self-Healing-Engine", durationMs: 40, tokensUsed: 90 },
        };
      },
    };

    const service = new CodeSynthesisService(
      fileSystem,
      telemetry,
      mockStrategy,
      validationPipeline,
      commandHistory,
    );

    const result = await service.synthesizeAndApply(baseContext);
    expect(result.success).toBe(true);
    expect(callCount).toBe(2);
    expect(result.metadata.healingAttempts).toBe(1);

    const fileContent = await fileSystem.readFile("src/components/Heading.tsx");
    expect(fileContent).toContain("<h1>Healed</h1>");
  });

  it("should fail gracefully when model synthesis fails", async () => {
    const failingStrategy: CodeSynthesisStrategy = {
      engineName: "Failing-Strategy",
      maxContextTokens: 4096,
      validateConnection: async () => false,
      synthesizePatch: async () => ({
        success: false,
        patchedCode: "",
        diagnostics: [{ type: "runtime", severity: "error", message: "Inference failed" }],
        metadata: { strategyUsed: "Failing-Strategy", durationMs: 10, tokensUsed: 0 },
      }),
    };

    const service = new CodeSynthesisService(
      fileSystem,
      telemetry,
      failingStrategy,
      validationPipeline,
      commandHistory,
    );

    const result = await service.synthesizeAndApply(baseContext);
    expect(result.success).toBe(false);
    expect(result.commands).toHaveLength(0);
  });
});

