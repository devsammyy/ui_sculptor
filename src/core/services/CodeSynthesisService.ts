import {
  CommandHistory,
  ICommand,
  MutateComponentCommand,
} from "../domain/commands/sculpt-command";
import { SynthesisContext } from "../domain/models/viewport-target";
import {
  CodeSynthesisStrategy,
  ModelStrategyFactory,
} from "../domain/strategies/model-strategy";
import {
  FileSystemPort,
  TelemetryEvent,
  TelemetryPort,
} from "../ports/file-system.port";
import { ValidationPipeline, ValidationResult } from "./ValidationPipeline";

/**
 * Code Synthesis Service - Coordinates LLM strategy + AST self-healing
 * Implements the Chain of Responsibility pattern for validation
 */
export class CodeSynthesisService {
  private readonly strategy: CodeSynthesisStrategy;
  private readonly validationPipeline: ValidationPipeline;
  private readonly fileSystem: FileSystemPort;
  private readonly telemetry: TelemetryPort;
  private readonly commandHistory: CommandHistory;

  constructor(
    fileSystem: FileSystemPort,
    telemetry: TelemetryPort,
    strategy?: CodeSynthesisStrategy,
    validationPipeline?: ValidationPipeline,
    commandHistory?: CommandHistory,
  ) {
    this.strategy = strategy || ModelStrategyFactory.createSynthesisStrategy();
    this.validationPipeline = validationPipeline || new ValidationPipeline();
    this.fileSystem = fileSystem;
    this.telemetry = telemetry;
    this.commandHistory = commandHistory || new CommandHistory(20);
  }

  /**
   * Execute the full synthesis pipeline with self-healing
   */
  async synthesizeAndApply(context: SynthesisContext): Promise<{
    success: boolean;
    commands: ICommand[];
    diagnostics: ValidationResult;
    metadata: {
      durationMs: number;
      strategyUsed: string;
      healingAttempts: number;
    };
  }> {
    const startTime = Date.now();
    let healingAttempts = 0;
    const maxHealingAttempts = 3;
    let currentContext = context;

    this.emitTelemetry({
      type: "synthesis_start",
      timestamp: startTime,
      step: "synthesis",
      status: "pending",
      metadata: { strategy: this.strategy.engineName },
    });

    while (healingAttempts <= maxHealingAttempts) {
      // Step 1: Synthesize patch using strategy
      const synthesisResult =
        await this.strategy.synthesizePatch(currentContext);

      this.emitTelemetry({
        type: "synthesis_complete",
        timestamp: Date.now(),
        step: "synthesis",
        status: synthesisResult.success ? "success" : "error",
        metadata: {
          strategy: this.strategy.engineName,
          durationMs: synthesisResult.metadata.durationMs,
          tokensUsed: synthesisResult.metadata.tokensUsed,
        },
        error: synthesisResult.success
          ? undefined
          : synthesisResult.diagnostics[0]?.message,
      });

      if (!synthesisResult.success) {
        return {
          success: false,
          commands: [],
          diagnostics: {
            valid: false,
            diagnostics: synthesisResult.diagnostics,
          },
          metadata: {
            durationMs: Date.now() - startTime,
            strategyUsed: this.strategy.engineName,
            healingAttempts,
          },
        };
      }

      // Step 2: Validate through pipeline
      this.emitTelemetry({
        type: "validation_start",
        timestamp: Date.now(),
        step: "validation",
        status: "pending",
      });

      const validationResult = await this.validationPipeline.validate(
        synthesisResult.patchedCode,
        currentContext.astContext.filePath,
        currentContext.projectFiles,
      );

      this.emitTelemetry({
        type: "validation_complete",
        timestamp: Date.now(),
        step: "validation",
        status: validationResult.valid ? "success" : "error",
        metadata: {
          diagnosticsCount: validationResult.diagnostics.length,
          errors: validationResult.diagnostics.filter(
            (d) => d.severity === "error",
          ).length,
        },
      });

      // Step 3: If valid, apply the patch
      if (validationResult.valid) {
        const command = await this.applyPatch(
          currentContext.astContext.filePath,
          currentContext.astContext.sourceCode,
          synthesisResult.patchedCode,
        );

        this.emitTelemetry({
          type: "patch_applied",
          timestamp: Date.now(),
          step: "apply",
          status: "success",
          metadata: { file: currentContext.astContext.filePath },
        });

        return {
          success: true,
          commands: [command],
          diagnostics: validationResult,
          metadata: {
            durationMs: Date.now() - startTime,
            strategyUsed: this.strategy.engineName,
            healingAttempts,
          },
        };
      }

      // Step 4: Self-healing - feed diagnostics back to model
      const hasErrors = validationResult.diagnostics.some(
        (d) => d.severity === "error",
      );
      if (!hasErrors || healingAttempts >= maxHealingAttempts) {
        // No errors or max attempts reached - apply anyway with warnings
        const command = await this.applyPatch(
          currentContext.astContext.filePath,
          currentContext.astContext.sourceCode,
          synthesisResult.patchedCode,
        );

        return {
          success: true,
          commands: [command],
          diagnostics: validationResult,
          metadata: {
            durationMs: Date.now() - startTime,
            strategyUsed: this.strategy.engineName,
            healingAttempts,
          },
        };
      }

      // Prepare for healing attempt
      healingAttempts++;
      this.emitTelemetry({
        type: "synthesis_start",
        timestamp: Date.now(),
        step: `healing_attempt_${healingAttempts}`,
        status: "pending",
        metadata: {
          attempt: healingAttempts,
          diagnostics: validationResult.diagnostics,
        },
      });

      // Enhance context with diagnostics for next iteration
      currentContext = this.enhanceContextWithDiagnostics(
        currentContext,
        validationResult.diagnostics,
      );
    }

    // Should not reach here, but fallback
    return {
      success: false,
      commands: [],
      diagnostics: {
        valid: false,
        diagnostics: [
          {
            type: "runtime",
            severity: "error",
            message: "Max healing attempts exceeded",
          },
        ],
      },
      metadata: {
        durationMs: Date.now() - startTime,
        strategyUsed: this.strategy.engineName,
        healingAttempts,
      },
    };
  }

  /**
   * Apply a code patch and create command for undo
   */
  private async applyPatch(
    filePath: string,
    beforeCode: string,
    afterCode: string,
  ): Promise<ICommand> {
    const command = new MutateComponentCommand(
      `cmd-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      Date.now(),
      filePath,
      beforeCode,
      afterCode,
      this.fileSystem,
    );

    await command.execute();
    this.commandHistory.push(command);

    return command;
  }

  /**
   * Enhance synthesis context with validation diagnostics for self-healing
   */
  private enhanceContextWithDiagnostics(
    context: SynthesisContext,
    diagnostics: ValidationResult["diagnostics"],
  ): SynthesisContext {
    const errorDiagnostics = diagnostics
      .filter((d) => d.severity === "error")
      .map(
        (d) =>
          `- ${d.type.toUpperCase()}: ${d.message}${d.suggestedFix ? ` (Fix: ${d.suggestedFix})` : ""}`,
      )
      .join("\n");

    const warningDiagnostics = diagnostics
      .filter((d) => d.severity === "warning")
      .map((d) => `- ${d.type.toUpperCase()}: ${d.message}`)
      .join("\n");

    const healingPrompt = `
PREVIOUS ATTEMPT FAILED VALIDATION. PLEASE FIX THE FOLLOWING ISSUES:

ERRORS (must fix):
${errorDiagnostics || "None"}

WARNINGS (should fix):
${warningDiagnostics || "None"}

Apply fixes while preserving the original user intent.`;

    return {
      ...context,
      userIntent: `${context.userIntent}\n\n${healingPrompt}`,
    };
  }

  /**
   * Undo the last command
   */
  async undo(): Promise<void> {
    const command = await this.commandHistory.undo();
    if (command) {
      this.emitTelemetry({
        type: "rollback",
        timestamp: Date.now(),
        step: "undo",
        status: "success",
        metadata: { file: command.targetFile },
      });
    }
  }

  /**
   * Redo the last undone command
   */
  async redo(): Promise<void> {
    const command = await this.commandHistory.redo();
    if (command) {
      this.emitTelemetry({
        type: "patch_applied",
        timestamp: Date.now(),
        step: "redo",
        status: "success",
        metadata: { file: command.targetFile },
      });
    }
  }

  /**
   * Check if undo is available
   */
  canUndo(): boolean {
    return this.commandHistory.canUndo();
  }

  /**
   * Check if redo is available
   */
  canRedo(): boolean {
    return this.commandHistory.canRedo();
  }

  /**
   * Get command history
   */
  getHistory(): readonly ICommand[] {
    return this.commandHistory.getHistory();
  }

  private emitTelemetry(
    event: Omit<TelemetryEvent, "timestamp"> & { timestamp?: number },
  ): void {
    this.telemetry.emit({
      ...event,
      timestamp: event.timestamp || Date.now(),
    });
  }
}
