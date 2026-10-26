/**
 * Domain entity representing a user's viewport interaction target.
 * Normalized coordinates (0-1) for resolution independence.
 */
export interface ViewportTarget {
  readonly x: number; // 0.0 - 1.0
  readonly y: number; // 0.0 - 1.0
  readonly viewportWidth: number;
  readonly viewportHeight: number;
  readonly timestamp: number;
  readonly source: "click" | "voice" | "gesture";
}

/**
 * SAM 3.1 segmentation mask output
 */
export interface SegmentationMask {
  readonly base64Png: string;
  readonly boundingBox: {
    readonly x: number;
    readonly y: number;
    readonly width: number;
    readonly height: number;
  };
  readonly confidence: number;
  readonly targetElement: string; // CSS selector or component name
}

/**
 * AST Node representation for mutation context
 */
export interface ASTNodeContext {
  readonly filePath: string;
  readonly nodeType: string;
  readonly startLine: number;
  readonly endLine: number;
  readonly sourceCode: string;
  readonly parentComponent?: string;
}

/**
 * Synthesis context passed to model strategies
 */
export interface SynthesisContext {
  readonly target: ViewportTarget;
  readonly mask: SegmentationMask;
  readonly astContext: ASTNodeContext;
  readonly userIntent: string; // From Muse Voice transcription
  readonly projectFiles: Map<string, string>; // Relevant file contents
  readonly designTokens: DesignTokens;
}

/**
 * Design tokens for consistent styling
 */
export interface DesignTokens {
  readonly colors: {
    readonly primary: string;
    readonly secondary: string;
    readonly background: string;
    readonly surface: string;
    readonly text: string;
    readonly border: string;
  };
  readonly spacing: {
    readonly xs: string;
    readonly sm: string;
    readonly md: string;
    readonly lg: string;
    readonly xl: string;
  };
  readonly borderRadius: {
    readonly sm: string;
    readonly md: string;
    readonly lg: string;
    readonly full: string;
  };
  readonly typography: {
    readonly fontFamily: string;
    readonly fontSizeBase: string;
    readonly fontSizeLg: string;
    readonly fontSizeXl: string;
  };
}

/**
 * Result of code synthesis
 */
export interface SynthesisResult {
  readonly success: boolean;
  readonly patchedCode: string;
  readonly diagnostics: Diagnostic[];
  readonly metadata: {
    readonly strategyUsed: string;
    readonly durationMs: number;
    readonly tokensUsed: number;
  };
}

/**
 * Diagnostic information for self-healing
 */
export interface Diagnostic {
  readonly type: "syntax" | "security" | "export" | "type" | "runtime";
  readonly severity: "error" | "warning" | "info";
  readonly message: string;
  readonly line?: number;
  readonly column?: number;
  readonly suggestedFix?: string;
}
