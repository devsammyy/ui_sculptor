/**
 * File System Port - Outbound Port (Driven Interface)
 * Defines the contract for file persistence operations
 * Implemented by DiskFileSystemAdapter (local) and MemoryFileSystemAdapter (cloud demo)
 */

export interface FileSystemPort {
  /**
   * Read a file's content
   */
  readFile(path: string): Promise<string>;

  /**
   * Write content to a file (creates or overwrites)
   */
  writeFile(path: string, content: string): Promise<void>;

  /**
   * Delete a file
   */
  deleteFile(path: string): Promise<void>;

  /**
   * Check if a file exists
   */
  exists(path: string): Promise<boolean>;

  /**
   * List files in a directory
   */
  listFiles(dirPath: string): Promise<string[]>;

  /**
   * Read multiple files at once
   */
  readFiles(paths: string[]): Promise<Map<string, string>>;

  /**
   * Create a snapshot/checkpoint of current state
   */
  createSnapshot(label?: string): Promise<string>; // Returns snapshot ID

  /**
   * Restore from a snapshot
   */
  restoreSnapshot(snapshotId: string): Promise<void>;

  /**
   * List available snapshots
   */
  listSnapshots(): Promise<
    Array<{ id: string; label: string; timestamp: number }>
  >;
}

/**
 * Extended port for virtual file systems (cloud demo)
 */
export interface VirtualFileSystemPort extends FileSystemPort {
  /**
   * Get the entire virtual file tree as JSON
   */
  getFileTree(): Promise<VirtualFileNode>;

  /**
   * Set the entire virtual file tree
   */
  setFileTree(tree: VirtualFileNode): Promise<void>;
}

export interface VirtualFileNode {
  name: string;
  type: "file" | "directory";
  content?: string;
  children?: Map<string, VirtualFileNode>;
}

/**
 * Code Generator Port - Outbound Port
 * Defines the contract for generating code from spatial context
 */
export interface CodeGeneratorPort {
  /**
   * Generate a code patch from synthesis context
   */
  generatePatch(context: SynthesisContext): Promise<GenerationResult>;

  /**
   * Validate generated code before applying
   */
  validateCode(code: string, filePath: string): Promise<ValidationResult>;
}

export interface SynthesisContext {
  target: ViewportTarget;
  mask: SegmentationMask;
  astContext: ASTNodeContext;
  userIntent: string;
  projectFiles: Map<string, string>;
  designTokens: DesignTokens;
}

export interface GenerationResult {
  success: boolean;
  code: string;
  diagnostics: Diagnostic[];
  metadata: {
    strategyUsed: string;
    durationMs: number;
    tokensUsed: number;
  };
}

export interface ValidationResult {
  valid: boolean;
  diagnostics: Diagnostic[];
}

export interface Diagnostic {
  type: "syntax" | "security" | "export" | "type" | "runtime";
  severity: "error" | "warning" | "info";
  message: string;
  line?: number;
  column?: number;
  suggestedFix?: string;
}

// Re-export domain types for port contracts
export interface ViewportTarget {
  x: number;
  y: number;
  viewportWidth: number;
  viewportHeight: number;
  timestamp: number;
  source: "click" | "voice" | "gesture";
}

export interface SegmentationMask {
  base64Png: string;
  boundingBox: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  confidence: number;
  targetElement: string;
}

export interface ASTNodeContext {
  filePath: string;
  nodeType: string;
  startLine: number;
  endLine: number;
  sourceCode: string;
  parentComponent?: string;
}

export interface DesignTokens {
  colors: {
    primary: string;
    secondary: string;
    background: string;
    surface: string;
    text: string;
    border: string;
  };
  spacing: {
    xs: string;
    sm: string;
    md: string;
    lg: string;
    xl: string;
  };
  borderRadius: {
    sm: string;
    md: string;
    lg: string;
    full: string;
  };
  typography: {
    fontFamily: string;
    fontSizeBase: string;
    fontSizeLg: string;
    fontSizeXl: string;
  };
}

/**
 * Perception Port - Inbound Port (Driving Interface)
 * Accepts user viewport gestures and resolves them into UI selection events
 */
export interface PerceptionPort {
  /**
   * Process a viewport click/tap and return segmentation mask
   */
  processViewportTarget(
    imageBase64: string,
    targetX: number,
    targetY: number,
    viewportWidth: number,
    viewportHeight: number,
  ): Promise<PerceptionResult>;

  /**
   * Transcribe voice input to text intent
   */
  transcribeVoice(audioBase64: string, mimeType: string): Promise<string>;

  /**
   * Combined perception: image + optional voice
   */
  perceive(input: PerceptionInput): Promise<PerceptionResult>;
}

export interface PerceptionInput {
  screenshotBase64: string;
  targetX: number;
  targetY: number;
  viewportWidth: number;
  viewportHeight: number;
  audioBase64?: string;
  audioMimeType?: string;
}

export interface PerceptionResult {
  target: ViewportTarget;
  mask: SegmentationMask;
  userIntent: string;
}

/**
 * Telemetry Port - Outbound Port
 * Emits real-time agent execution milestones to the UI
 */
export interface TelemetryPort {
  /**
   * Emit a telemetry event
   */
  emit(event: TelemetryEvent): void;

  /**
   * Subscribe to telemetry events
   */
  subscribe(listener: TelemetryListener): () => void;
}

export interface TelemetryEvent {
  readonly type:
    | "perception_start"
    | "perception_complete"
    | "synthesis_start"
    | "synthesis_complete"
    | "validation_start"
    | "validation_complete"
    | "patch_applied"
    | "rollback"
    | "error";
  readonly timestamp: number;
  readonly step: string;
  readonly status: "pending" | "success" | "error";
  readonly metadata?: Record<string, unknown>;
  readonly error?: string;
}

export type TelemetryListener = (event: TelemetryEvent) => void;

/**
 * Sculpt Command Port - Inbound Port
 * Accepts mutation intent, coordinates AST parsing, triggers code synthesis, and commits patches
 */
export interface SculptCommandPort {
  /**
   * Execute a sculpt command from perception result
   */
  executeSculpt(input: SculptInput): Promise<SculptResult>;

  /**
   * Undo the last command
   */
  undo(): Promise<void>;

  /**
   * Redo the last undone command
   */
  redo(): Promise<void>;
}

export interface SculptInput {
  perceptionResult: PerceptionResult;
  projectFiles: Map<string, string>;
  designTokens: DesignTokens;
}

export interface SculptResult {
  success: boolean;
  appliedCommands: ICommand[];
  diagnostics: Diagnostic[];
  metadata: {
    durationMs: number;
    strategyUsed: string;
  };
}

// Need to import ICommand - using a simplified version here
export interface ICommand {
  id: string;
  timestamp: number;
  targetFile: string;
  execute(): Promise<void>;
  undo(): Promise<void>;
}
