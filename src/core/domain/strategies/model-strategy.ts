import { SynthesisContext, SynthesisResult } from "../models/viewport-target";
export type { SynthesisContext, SynthesisResult };

/**
 * Strategy interface for code synthesis
 * Allows pluggable model execution (Strategy Pattern)
 */
export interface CodeSynthesisStrategy {
  readonly engineName: string;
  readonly maxContextTokens: number;
  synthesizePatch(context: SynthesisContext): Promise<SynthesisResult>;
  validateConnection(): Promise<boolean>;
}

/**
 * Base class for model strategies with common functionality
 */
export abstract class BaseModelStrategy implements CodeSynthesisStrategy {
  abstract readonly engineName: string;
  abstract readonly maxContextTokens: number;

  abstract synthesizePatch(context: SynthesisContext): Promise<SynthesisResult>;
  abstract validateConnection(): Promise<boolean>;

  /**
   * Build the system prompt for code synthesis
   */
  protected buildSystemPrompt(context: SynthesisContext): string {
    return `You are an expert React/TypeScript developer specializing in precise UI mutations.
    
TARGET CONTEXT:
- File: ${context.astContext.filePath}
- Component: ${context.astContext.parentComponent || "Unknown"}
- Lines: ${context.astContext.startLine}-${context.astContext.endLine}
- User Intent: "${context.userIntent}"
- Viewport Target: (${context.target.x.toFixed(3)}, ${context.target.y.toFixed(3)})
- Element: ${context.mask.targetElement}

CURRENT CODE:
\`\`\`typescript
${context.astContext.sourceCode}
\`\`\`

DESIGN TOKENS:
${JSON.stringify(context.designTokens, null, 2)}

RULES:
1. Output ONLY the complete modified file content
2. Preserve all existing imports, exports, and structure
3. Use only the design tokens provided - no hardcoded values
4. No dynamic code execution (eval, new Function, etc.)
5. No unauthorized imports (fs, child_process, net, crypto, etc.)
6. Maintain TypeScript type safety
7. Follow React best practices (hooks rules, component patterns)
8. Keep changes minimal and focused on the user intent

Return the full file content with your modifications.`;
  }

  /**
   * Build user prompt with context
   */
  protected buildUserPrompt(context: SynthesisContext): string {
    return `Modify the component at the target location based on the user intent: "${context.userIntent}"

The user clicked/targeted coordinates (${context.target.x.toFixed(3)}, ${context.target.y.toFixed(3)}) which corresponds to: ${context.mask.targetElement}

SAM 3.1 detected this element with ${(context.mask.confidence * 100).toFixed(1)}% confidence.

Apply the minimal change needed to satisfy the intent while preserving all existing functionality.`;
  }
}

/**
 * Strategy for local open-weight models (Muse Spark Open via vLLM/Ollama)
 * Round 1 Compliance: Verified open-weight infrastructure
 */
export class OpenWeightSparkStrategy extends BaseModelStrategy {
  readonly engineName = "Muse-Spark-Open-7B (vLLM)";
  readonly maxContextTokens = 32768;

  private readonly endpoint: string;
  private readonly modelName: string;

  constructor(
    endpoint: string = "http://localhost:8000/v1",
    modelName: string = "muse-spark-open-7b",
  ) {
    super();
    this.endpoint = endpoint;
    this.modelName = modelName;
  }

  async validateConnection(): Promise<boolean> {
    try {
      const response = await fetch(`${this.endpoint}/models`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
        signal: AbortSignal.timeout(5000),
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  async synthesizePatch(context: SynthesisContext): Promise<SynthesisResult> {
    const startTime = Date.now();

    try {
      const systemPrompt = this.buildSystemPrompt(context);
      const userPrompt = this.buildUserPrompt(context);

      const response = await fetch(`${this.endpoint}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env["VLLM_API_KEY"] || "local"}`,
        },
        body: JSON.stringify({
          model: this.modelName,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
          temperature: 0.1,
          max_tokens: 4096,
          stream: false,
        }),
        signal: AbortSignal.timeout(60000),
      });

      if (!response.ok) {
        throw new Error(
          `vLLM API error: ${response.status} ${response.statusText}`,
        );
      }

      const data = await response.json();
      const patchedCode = data.choices[0]?.message?.content || "";

      return {
        success: true,
        patchedCode: this.extractCodeBlock(patchedCode),
        diagnostics: [],
        metadata: {
          strategyUsed: this.engineName,
          durationMs: Date.now() - startTime,
          tokensUsed: data.usage?.total_tokens || 0,
        },
      };
    } catch (error) {
      return {
        success: false,
        patchedCode: "",
        diagnostics: [
          {
            type: "runtime",
            severity: "error",
            message:
              error instanceof Error
                ? error.message
                : "Unknown synthesis error",
          },
        ],
        metadata: {
          strategyUsed: this.engineName,
          durationMs: Date.now() - startTime,
          tokensUsed: 0,
        },
      };
    }
  }

  private extractCodeBlock(content: string): string {
    // Extract code from markdown code blocks if present
    const codeBlockMatch = content.match(
      /```(?:typescript|tsx|javascript|jsx)?\n([\s\S]*?)\n```/,
    );
    if (codeBlockMatch && codeBlockMatch[1]) {
      return codeBlockMatch[1].trim();
    }
    return content.trim();
  }
}

/**
 * Strategy for hosted Meta models (Muse Wonder, SAM 3.1, Muse Voice)
 * Uses Meta Model API with 1M context window
 */
export class HostedMetaStrategy extends BaseModelStrategy {
  readonly engineName = "Muse-Wonder-1.0 (Meta API)";
  readonly maxContextTokens = 1000000;

  private readonly apiKey: string;
  private readonly baseUrl: string;

  constructor(apiKey: string, baseUrl: string = "https://api.meta.com/v1") {
    super();
    this.apiKey = apiKey;
    this.baseUrl = baseUrl;
  }

  async validateConnection(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/models`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.apiKey}`,
        },
        signal: AbortSignal.timeout(5000),
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  async synthesizePatch(context: SynthesisContext): Promise<SynthesisResult> {
    const startTime = Date.now();

    try {
      const systemPrompt = this.buildSystemPrompt(context);
      const userPrompt = this.buildUserPrompt(context);

      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: "muse-wonder-1.0",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
          temperature: 0.1,
          max_tokens: 8192,
          stream: false,
        }),
        signal: AbortSignal.timeout(120000),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          `Meta API error: ${response.status} - ${errorData.error?.message || response.statusText}`,
        );
      }

      const data = await response.json();
      const patchedCode = data.choices[0]?.message?.content || "";

      return {
        success: true,
        patchedCode: this.extractCodeBlock(patchedCode),
        diagnostics: [],
        metadata: {
          strategyUsed: this.engineName,
          durationMs: Date.now() - startTime,
          tokensUsed: data.usage?.total_tokens || 0,
        },
      };
    } catch (error) {
      return {
        success: false,
        patchedCode: "",
        diagnostics: [
          {
            type: "runtime",
            severity: "error",
            message:
              error instanceof Error
                ? error.message
                : "Unknown synthesis error",
          },
        ],
        metadata: {
          strategyUsed: this.engineName,
          durationMs: Date.now() - startTime,
          tokensUsed: 0,
        },
      };
    }
  }

  private extractCodeBlock(content: string): string {
    const codeBlockMatch = content.match(
      /```(?:typescript|tsx|javascript|jsx)?\n([\s\S]*?)\n```/,
    );
    if (codeBlockMatch && codeBlockMatch[1]) {
      return codeBlockMatch[1].trim();
    }
    return content.trim();
  }
}

/**
 * Strategy for SAM 3.1 segmentation (perception, not synthesis)
 */
export interface PerceptionStrategy {
  readonly engineName: string;
  segmentImage(
    imageBase64: string,
    targetX: number,
    targetY: number,
  ): Promise<SegmentationResult>;
}

export interface SegmentationResult {
  readonly maskBase64: string;
  readonly boundingBox: { x: number; y: number; width: number; height: number };
  readonly confidence: number;
  readonly targetElement: string;
}

export class SAM31Strategy implements PerceptionStrategy {
  readonly engineName = "SAM-3.1 (Meta)";

  private readonly apiKey: string;
  private readonly baseUrl: string;

  constructor(apiKey: string, baseUrl: string = "https://api.meta.com/v1") {
    this.apiKey = apiKey;
    this.baseUrl = baseUrl;
  }

  async segmentImage(
    imageBase64: string,
    targetX: number,
    targetY: number,
  ): Promise<SegmentationResult> {
    const response = await fetch(`${this.baseUrl}/segment`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: "sam-3.1",
        image: imageBase64,
        point_coords: [[targetX, targetY]],
        point_labels: [1],
      }),
      signal: AbortSignal.timeout(30000),
    });

    if (!response.ok) {
      throw new Error(`SAM 3.1 API error: ${response.status}`);
    }

    const data = await response.json();
    return {
      maskBase64: data.mask,
      boundingBox: data.bbox,
      confidence: data.confidence,
      targetElement: data.element_type || "unknown",
    };
  }
}

/**
 * Strategy for Muse Voice transcription
 */
export interface VoiceStrategy {
  readonly engineName: string;
  transcribe(audioBase64: string, mimeType: string): Promise<string>;
}

export class MuseVoiceStrategy implements VoiceStrategy {
  readonly engineName = "Muse-Voice-Transcribe-1.0 (Meta)";

  private readonly apiKey: string;
  private readonly baseUrl: string;

  constructor(apiKey: string, baseUrl: string = "https://api.meta.com/v1") {
    this.apiKey = apiKey;
    this.baseUrl = baseUrl;
  }

  async transcribe(audioBase64: string, mimeType: string): Promise<string> {
    const response = await fetch(`${this.baseUrl}/audio/transcriptions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: (() => {
        const formData = new FormData();
        const blob = new Blob([Buffer.from(audioBase64, "base64")], {
          type: mimeType,
        });
        formData.append("file", blob, "audio.webm");
        formData.append("model", "muse-voice-transcribe-1.0");
        return formData;
      })(),
      signal: AbortSignal.timeout(30000),
    });

    if (!response.ok) {
      throw new Error(`Muse Voice API error: ${response.status}`);
    }

    const data = await response.json();
    return data.text || "";
  }
}

/**
 * Factory for creating the appropriate strategy based on environment
 */
export class ModelStrategyFactory {
  static createSynthesisStrategy(): CodeSynthesisStrategy {
    const useHosted = process.env["USE_HOSTED_MODELS"] === "true";
    const metaApiKey = process.env["META_API_KEY"];

    if (useHosted && metaApiKey) {
      return new HostedMetaStrategy(metaApiKey);
    }

    const vllmEndpoint =
      process.env["VLLM_ENDPOINT"] || "http://localhost:8000/v1";
    return new OpenWeightSparkStrategy(vllmEndpoint);
  }

  static createPerceptionStrategy(): PerceptionStrategy {
    const metaApiKey = process.env["META_API_KEY"];
    if (!metaApiKey) {
      throw new Error("META_API_KEY required for SAM 3.1 perception");
    }
    return new SAM31Strategy(metaApiKey);
  }

  static createVoiceStrategy(): VoiceStrategy {
    const metaApiKey = process.env["META_API_KEY"];
    if (!metaApiKey) {
      throw new Error("META_API_KEY required for Muse Voice");
    }
    return new MuseVoiceStrategy(metaApiKey);
  }
}
