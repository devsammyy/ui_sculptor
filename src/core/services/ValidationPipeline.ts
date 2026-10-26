import { Diagnostic } from "../ports/file-system.port";

/**
 * Validation Pipeline - Chain of Responsibility for AST verification
 * Each validator can pass, fail, or modify the code
 */
export interface Validator {
  readonly name: string;
  validate(
    code: string,
    filePath: string,
    projectFiles: Map<string, string>,
  ): Promise<ValidationResult>;
}

export interface ValidationResult {
  valid: boolean;
  diagnostics: Diagnostic[];
  modifiedCode?: string;
}

/**
 * Base validator class
 */
export abstract class BaseValidator implements Validator {
  abstract readonly name: string;

  abstract validate(
    code: string,
    filePath: string,
    projectFiles: Map<string, string>,
  ): Promise<ValidationResult>;

  protected createResult(
    valid: boolean,
    diagnostics: Diagnostic[] = [],
    modifiedCode?: string,
  ): ValidationResult {
    return { valid, diagnostics, modifiedCode };
  }

  protected createDiagnostic(
    type: Diagnostic["type"],
    severity: Diagnostic["severity"],
    message: string,
    line?: number,
    column?: number,
    suggestedFix?: string,
  ): Diagnostic {
    return { type, severity, message, line, column, suggestedFix };
  }
}

/**
 * Step 1: Syntax Check - Validates TypeScript/TSX syntax using Babel
 */
export class SyntaxValidator extends BaseValidator {
  readonly name = "SyntaxValidator";

  async validate(
    code: string,
    filePath: string,
    projectFiles: Map<string, string>,
  ): Promise<ValidationResult> {
    const diagnostics: Diagnostic[] = [];

    try {
      // Dynamic import to avoid bundling issues
      const { parse } = await import("@babel/parser");
      const parserOptions = this.getParserOptions(filePath);

      parse(code, parserOptions);
    } catch (error) {
      if (error instanceof Error) {
        const loc = this.extractLocation(error);
        diagnostics.push(
          this.createDiagnostic(
            "syntax",
            "error",
            `Syntax error: ${error.message}`,
            loc.line,
            loc.column,
            "Check for missing brackets, semicolons, or invalid TypeScript syntax",
          ),
        );
      }
    }

    return this.createResult(diagnostics.length === 0, diagnostics);
  }

  private getParserOptions(filePath: string) {
    const isTSX = filePath.endsWith(".tsx");
    const isTS = filePath.endsWith(".ts");

    const plugins: string[] = [
      "typescript",
      ...(isTSX ? ["jsx"] : []),
      "decorators-legacy",
      "classProperties",
    ];

    return {
      sourceType: "module" as const,
      plugins: plugins as any,
      errorRecovery: true,
    };
  }

  private extractLocation(error: Error): { line: number; column: number } {
    // Babel errors often have loc property
    const loc = (error as any).loc;
    if (loc) {
      return { line: loc.line, column: loc.column };
    }

    // Try to parse from message
    const match = error.message.match(/\((\d+):(\d+)\)/);
    if (match && match[1] && match[2]) {
      return { line: parseInt(match[1], 10), column: parseInt(match[2], 10) };
    }

    return { line: 1, column: 1 };
  }
}

/**
 * Step 2: Security Filter - Blocks unauthorized imports and dangerous patterns
 */
export class SecurityValidator extends BaseValidator {
  readonly name = "SecurityValidator";

  private readonly forbiddenImports = new Set([
    "fs",
    "child_process",
    "cluster",
    "crypto",
    "dgram",
    "dns",
    "http",
    "http2",
    "https",
    "net",
    "os",
    "path",
    "perf_hooks",
    "process",
    "punycode",
    "querystring",
    "readline",
    "repl",
    "stream",
    "string_decoder",
    "sys",
    "timers",
    "tls",
    "tty",
    "url",
    "util",
    "v8",
    "vm",
    "worker_threads",
    "zlib",
  ]);

  private readonly dangerousPatterns = [
    {
      pattern: /\beval\s*\(/,
      message: "eval() is not allowed",
      fix: "Use safe alternatives",
    },
    {
      pattern: /new\s+Function\s*\(/,
      message: "new Function() is not allowed",
      fix: "Use static code",
    },
    {
      pattern: /<script\b[^>]*>/,
      message: "Inline <script> tags are not allowed",
      fix: "Use React components",
    },
    {
      pattern: /dangerouslySetInnerHTML/,
      message: "dangerouslySetInnerHTML is not allowed",
      fix: "Use safe React patterns",
    },
    {
      pattern: /require\s*\(\s*['"`](fs|child_process|crypto|net)['"`]\s*\)/,
      message: "Dynamic require of forbidden module",
      fix: "Remove dynamic require",
    },
  ];

  async validate(
    code: string,
    filePath: string,
    projectFiles: Map<string, string>,
  ): Promise<ValidationResult> {
    const diagnostics: Diagnostic[] = [];

    // Check imports
    const importDiagnostics = this.checkImports(code);
    diagnostics.push(...importDiagnostics);

    // Check dangerous patterns
    const patternDiagnostics = this.checkDangerousPatterns(code);
    diagnostics.push(...patternDiagnostics);

    const hasErrors = diagnostics.some((d) => d.severity === "error");
    return this.createResult(!hasErrors, diagnostics);
  }

  private checkImports(code: string): Diagnostic[] {
    const diagnostics: Diagnostic[] = [];
    const importRegex = /import\s+(?:[^'"\n]+\s+from\s+)?['"`]([^'"\n]+)['"`]/g;
    const requireRegex = /require\s*\(\s*['"`]([^'"\n]+)['"`]\s*\)/g;

    for (const match of code.matchAll(importRegex)) {
      const importPath = match[1];
      if (importPath && this.isForbiddenImport(importPath)) {
        diagnostics.push(
          this.createDiagnostic(
            "security",
            "error",
            `Forbidden import: "${importPath}" - Node.js built-in modules are not allowed in browser code`,
            this.getLineNumber(code, match.index ?? 0),
            undefined,
            "Remove the import or use a browser-compatible alternative",
          ),
        );
      }
    }

    for (const match of code.matchAll(requireRegex)) {
      const importPath = match[1];
      if (importPath && this.isForbiddenImport(importPath)) {
        diagnostics.push(
          this.createDiagnostic(
            "security",
            "error",
            `Forbidden require: "${importPath}" - Node.js built-in modules are not allowed`,
            this.getLineNumber(code, match.index ?? 0),
            undefined,
            "Remove the require or use a browser-compatible alternative",
          ),
        );
      }
    }

    return diagnostics;
  }

  private isForbiddenImport(importPath: string): boolean {
    // Check exact match
    if (this.forbiddenImports.has(importPath)) return true;

    // Check if it starts with a forbidden module (e.g., 'fs/promises')
    for (const forbidden of this.forbiddenImports) {
      if (importPath === forbidden || importPath.startsWith(forbidden + "/")) {
        return true;
      }
    }

    return false;
  }

  private checkDangerousPatterns(code: string): Diagnostic[] {
    const diagnostics: Diagnostic[] = [];

    for (const { pattern, message, fix } of this.dangerousPatterns) {
      const globalRegex = new RegExp(pattern.source, "g");
      for (const match of code.matchAll(globalRegex)) {
        diagnostics.push(
          this.createDiagnostic(
            "security",
            "error",
            message,
            this.getLineNumber(code, match.index ?? 0),
            undefined,
            fix,
          ),
        );
      }
    }

    return diagnostics;
  }

  private getLineNumber(code: string, index: number): number {
    return code.substring(0, index).split("\n").length;
  }
}

/**
 * Step 3: Export Integrity - Ensures exports are not broken
 */
export class ExportIntegrityValidator extends BaseValidator {
  readonly name = "ExportIntegrityValidator";

  async validate(
    code: string,
    filePath: string,
    projectFiles: Map<string, string>,
  ): Promise<ValidationResult> {
    const diagnostics: Diagnostic[] = [];

    try {
      const { parse } = await import("@babel/parser");
      const ast = parse(code, this.getParserOptions(filePath) as any);

      // Find all export declarations
      const exports = this.extractExports(ast);
      const originalExports = this.getOriginalExports(filePath, projectFiles);

      // Check if any original exports were removed
      for (const originalExport of originalExports) {
        if (!exports.has(originalExport)) {
          diagnostics.push(
            this.createDiagnostic(
              "export",
              "error",
              `Export "${originalExport}" was removed - this breaks consumers`,
              undefined,
              undefined,
              `Re-add export: export ${originalExport}`,
            ),
          );
        }
      }

      // Check for default export consistency
      const hasDefaultExport = exports.has("default");
      const originalHasDefault = originalExports.has("default");
      if (originalHasDefault && !hasDefaultExport) {
        diagnostics.push(
          this.createDiagnostic(
            "export",
            "error",
            "Default export was removed",
            undefined,
            undefined,
            "Add: export default ComponentName",
          ),
        );
      }
    } catch (error) {
      // If parsing fails, syntax validator will catch it
    }

    const hasErrors = diagnostics.some((d) => d.severity === "error");
    return this.createResult(!hasErrors, diagnostics);
  }

  private getParserOptions(filePath: string) {
    const isTSX = filePath.endsWith(".tsx");
    const plugins: string[] = ["typescript", ...(isTSX ? ["jsx"] : [])];

    return {
      sourceType: "module" as const,
      plugins,
    };
  }

  private extractExports(ast: any): Set<string> {
    const exports = new Set<string>();
    const body = ast?.program?.body || (Array.isArray(ast?.body) ? ast.body : []);

    for (const node of body) {
      if (!node) continue;

      if (node.type === "ExportNamedDeclaration") {
        if (node.declaration) {
          if (node.declaration.type === "VariableDeclaration") {
            for (const decl of node.declaration.declarations) {
              if (decl.id?.type === "Identifier") {
                exports.add(decl.id.name);
              }
            }
          } else if (
            node.declaration.type === "FunctionDeclaration" ||
            node.declaration.type === "ClassDeclaration"
          ) {
            if (node.declaration.id?.name) {
              exports.add(node.declaration.id.name);
            }
          } else if (
            node.declaration.type === "TSInterfaceDeclaration" ||
            node.declaration.type === "TSTypeAliasDeclaration"
          ) {
            if (node.declaration.id?.name) {
              exports.add(node.declaration.id.name);
            }
          }
        }
        if (node.specifiers) {
          for (const spec of node.specifiers) {
            if (spec.exported) {
              const name = spec.exported.name || spec.exported.value;
              if (name) exports.add(name);
            }
          }
        }
      } else if (node.type === "ExportDefaultDeclaration") {
        exports.add("default");
        if (node.declaration?.id?.name) {
          exports.add(node.declaration.id.name);
        }
      } else if (node.type === "ExportAllDeclaration") {
        exports.add("*");
      }
    }

    return exports;
  }

  private getOriginalExports(
    filePath: string,
    projectFiles: Map<string, string>,
  ): Set<string> {
    const originalCode = projectFiles.get(filePath);
    if (!originalCode) return new Set();

    try {
      const { parse } = require("@babel/parser");
      const ast = parse(originalCode, this.getParserOptions(filePath));
      return this.extractExports(ast);
    } catch {
      return new Set();
    }
  }
}

/**
 * Step 4: Type Validator - Basic TypeScript type checking
 */
export class TypeValidator extends BaseValidator {
  readonly name = "TypeValidator";

  async validate(
    code: string,
    filePath: string,
    projectFiles: Map<string, string>,
  ): Promise<ValidationResult> {
    const diagnostics: Diagnostic[] = [];

    // Check for common type issues
    const typeIssues = this.checkCommonTypeIssues(code, filePath);
    diagnostics.push(...typeIssues);

    const hasErrors = diagnostics.some((d) => d.severity === "error");
    return this.createResult(!hasErrors, diagnostics);
  }

  private checkCommonTypeIssues(code: string, filePath: string): Diagnostic[] {
    const diagnostics: Diagnostic[] = [];

    // Check for implicit any
    if (code.includes(": any") && !code.includes("// @ts-ignore")) {
      // This is a warning, not an error
      const lines = code.split("\n");
      lines.forEach((line, i) => {
        if (line.includes(": any") && !line.includes("// @ts-ignore")) {
          diagnostics.push(
            this.createDiagnostic(
              "type",
              "warning",
              'Implicit "any" type detected',
              i + 1,
              line.indexOf(": any") + 1,
              "Add explicit type annotation",
            ),
          );
        }
      });
    }

    // Check for missing React import in JSX files
    if (
      filePath.endsWith(".tsx") &&
      !code.includes("import React") &&
      !code.includes('from "react"') &&
      !code.includes("from 'react'")
    ) {
      // Only warn if JSX is used
      if (code.includes("<") && code.includes(">") && code.match(/<\w+/)) {
        diagnostics.push(
          this.createDiagnostic(
            "type",
            "warning",
            "JSX used but React not imported",
            1,
            1,
            'Add: import React from "react"',
          ),
        );
      }
    }

    return diagnostics;
  }
}

/**
 * Validation Pipeline - Chain of Responsibility orchestrator
 */
export class ValidationPipeline {
  private validators: Validator[] = [
    new SyntaxValidator(),
    new SecurityValidator(),
    new ExportIntegrityValidator(),
    new TypeValidator(),
  ];

  constructor(customValidators?: Validator[]) {
    if (customValidators) {
      this.validators = customValidators;
    }
  }

  addValidator(validator: Validator): void {
    this.validators.push(validator);
  }

  removeValidator(name: string): void {
    this.validators = this.validators.filter((v) => v.name !== name);
  }

  async validate(
    code: string,
    filePath: string,
    projectFiles: Map<string, string>,
  ): Promise<ValidationResult> {
    let currentCode = code;
    const allDiagnostics: Diagnostic[] = [];

    for (const validator of this.validators) {
      const result = await validator.validate(
        currentCode,
        filePath,
        projectFiles,
      );
      allDiagnostics.push(...result.diagnostics);

      if (result.modifiedCode) {
        currentCode = result.modifiedCode;
      }

      // Stop on first error (fail fast)
      if (result.diagnostics.some((d) => d.severity === "error")) {
        return {
          valid: false,
          diagnostics: allDiagnostics,
          modifiedCode: currentCode,
        };
      }
    }

    return {
      valid: true,
      diagnostics: allDiagnostics,
      modifiedCode: currentCode,
    };
  }

  getValidators(): readonly Validator[] {
    return this.validators;
  }
}
