import {
  CodeSynthesisStrategy,
  SynthesisContext,
  SynthesisResult,
} from "../../core/domain/strategies/model-strategy";

/**
 * OpenWeight Model Adapter - Communicates with locally running Muse Spark Open via vLLM/Ollama
 * Implements CodeSynthesisStrategy for local open-weight inference
 */
export class OpenWeightModelAdapter implements CodeSynthesisStrategy {
  readonly engineName = "Muse-Spark-Open-7B (vLLM)";
  readonly maxContextTokens = 32768;

  private readonly endpoint: string;
  private readonly modelName: string;
  private readonly apiKey: string;

  constructor(
    endpoint: string = process.env.VLLM_ENDPOINT || "http://localhost:8000/v1",
    modelName: string = process.env.VLLM_MODEL || "muse-spark-open-7b",
    apiKey: string = process.env.VLLM_API_KEY || "local",
  ) {
    this.endpoint = endpoint;
    this.modelName = modelName;
    this.apiKey = apiKey;
  }

  async validateConnection(): Promise<boolean> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const response = await fetch(`${this.endpoint}/models`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.apiKey}`,
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
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

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 60000);

      const response = await fetch(`${this.endpoint}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.apiKey}`,
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
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text().catch(() => "");
        throw new Error(
          `vLLM API error: ${response.status} ${response.statusText} - ${errorText}`,
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

  private buildSystemPrompt(context: SynthesisContext): string {
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

  private buildUserPrompt(context: SynthesisContext): string {
    return `Modify the component at the target location based on the user intent: "${context.userIntent}"

The user clicked/targeted coordinates (${context.target.x.toFixed(3)}, ${context.target.y.toFixed(3)}) which corresponds to: ${context.mask.targetElement}

SAM 3.1 detected this element with ${(context.mask.confidence * 100).toFixed(1)}% confidence.

Apply the minimal change needed to satisfy the intent while preserving all existing functionality.`;
  }

  private extractCodeBlock(content: string): string {
    const codeBlockMatch = content.match(
      /```(?:typescript|tsx|javascript|jsx)?\n([\s\S]*?)\n```/,
    );
    if (codeBlockMatch) {
      return codeBlockMatch[1].trim();
    }
    return content.trim();
  }
}

/**
 * Hosted Meta Model Adapter - Interfaces with Meta Model API for SAM 3.1, Muse Wonder, Muse Voice
 * Implements CodeSynthesisStrategy for cloud-hosted models
 */
export class HostedMetaModelAdapter implements CodeSynthesisStrategy {
  readonly engineName = "Muse-Wonder-1.0 (Meta API)";
  readonly maxContextTokens = 1000000;

  private readonly apiKey: string;
  private readonly baseUrl: string;

  constructor(
    apiKey: string = process.env.META_API_KEY!,
    baseUrl: string = process.env.META_API_BASE || "https://api.meta.com/v1",
  ) {
    this.apiKey = apiKey;
    this.baseUrl = baseUrl;
  }

  async validateConnection(): Promise<boolean> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const response = await fetch(`${this.baseUrl}/models`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.apiKey}`,
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
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

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 120000);

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
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

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

  private buildSystemPrompt(context: SynthesisContext): string {
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

  private buildUserPrompt(context: SynthesisContext): string {
    return `Modify the component at the target location based on the user intent: "${context.userIntent}"

The user clicked/targeted coordinates (${context.target.x.toFixed(3)}, ${context.target.y.toFixed(3)}) which corresponds to: ${context.mask.targetElement}

SAM 3.1 detected this element with ${(context.mask.confidence * 100).toFixed(1)}% confidence.

Apply the minimal change needed to satisfy the intent while preserving all existing functionality.`;
  }

  private extractCodeBlock(content: string): string {
    const codeBlockMatch = content.match(
      /```(?:typescript|tsx|javascript|jsx)?\n([\s\S]*?)\n```/,
    );
    if (codeBlockMatch) {
      return codeBlockMatch[1].trim();
    }
    return content.trim();
  }
}

/**
 * SAM 3.1 Perception Adapter - For image segmentation
 */
export interface PerceptionAdapter {
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

export class SAM31Adapter implements PerceptionAdapter {
  readonly engineName = "SAM-3.1 (Meta)";

  private readonly apiKey: string;
  private readonly baseUrl: string;

  constructor(
    apiKey: string = process.env.META_API_KEY!,
    baseUrl: string = process.env.META_API_BASE || "https://api.meta.com/v1",
  ) {
    this.apiKey = apiKey;
    this.baseUrl = baseUrl;
  }

  async segmentImage(
    imageBase64: string,
    targetX: number,
    targetY: number,
  ): Promise<SegmentationResult> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    try {
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
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

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
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  }
}

/**
 * Muse Voice Transcription Adapter
 */
export interface VoiceAdapter {
  readonly engineName: string;
  transcribe(audioBase64: string, mimeType: string): Promise<string>;
}

export class MuseVoiceAdapter implements VoiceAdapter {
  readonly engineName = "Muse-Voice-Transcribe-1.0 (Meta)";

  private readonly apiKey: string;
  private readonly baseUrl: string;

  constructor(
    apiKey: string = process.env.META_API_KEY!,
    baseUrl: string = process.env.META_API_BASE || "https://api.meta.com/v1",
  ) {
    this.apiKey = apiKey;
    this.baseUrl = baseUrl;
  }

  async transcribe(audioBase64: string, mimeType: string): Promise<string> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    try {
      const formData = new FormData();
      const blob = new Blob([Buffer.from(audioBase64, "base64")], {
        type: mimeType,
      });
      formData.append("file", blob, "audio.webm");
      formData.append("model", "muse-voice-transcribe-1.0");

      const response = await fetch(`${this.baseUrl}/audio/transcriptions`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: formData,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Muse Voice API error: ${response.status}`);
      }

      const data = await response.json();
      return data.text || "";
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  }
}
