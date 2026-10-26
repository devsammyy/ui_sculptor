import generate from "@babel/generator";
import * as parser from "@babel/parser";
import traverse, { TraverseOptions } from "@babel/traverse";
import * as t from "@babel/types";

const traverseFn = (
  typeof traverse === "function" ? traverse : (traverse as any).default
) as typeof traverse;

/**
 * Babel AST Parser - Handles parsing, validation, and code emission
 * Provides utilities for AST manipulation and analysis
 */
export class BabelAstParser {
  /**
   * Parse source code into an AST
   */
  static parse(code: string, filePath: string): t.File {
    const isTSX = filePath.endsWith(".tsx");

    const plugins: parser.ParserPlugin[] = [
      "typescript",
      ...(isTSX ? (["jsx"] as parser.ParserPlugin[]) : []),
      "decorators-legacy",
      "classProperties",
      "exportDefaultFrom",
      "exportNamespaceFrom",
    ];

    return parser.parse(code, {
      sourceType: "module",
      plugins,
      errorRecovery: true,
      tokens: true,
      ranges: true,
    });
  }

  /**
   * Generate code from an AST
   */
  static generate(ast: t.File): { code: string; map: any } {
    return generate(ast, {
      retainLines: true,
      compact: false,
      concise: false,
      sourceMaps: true,
    });
  }

  /**
   * Transform code with a visitor
   */
  static transform(
    code: string,
    filePath: string,
    visitor: TraverseOptions,
  ): { code: string; ast: t.File } {
    const ast = this.parse(code, filePath);
    traverseFn(ast, visitor);
    const { code: transformedCode } = this.generate(ast);
    return { code: transformedCode, ast };
  }

  /**
   * Find a node at a specific line/column
   */
  static findNodeAtPosition(
    ast: t.File,
    line: number,
    column: number,
  ): t.Node | null {
    let foundNode: t.Node | null = null;

    traverseFn(ast, {
      enter(path) {
        const loc = path.node.loc;
        if (!loc) return;

        if (
          loc.start.line <= line &&
          loc.end.line >= line &&
          (loc.start.line !== line || loc.start.column <= column) &&
          (loc.end.line !== line || loc.end.column >= column)
        ) {
          foundNode = path.node;
        }
      },
    });

    return foundNode;
  }

  /**
   * Get the component name containing a position
   */
  static getComponentAtPosition(
    ast: t.File,
    line: number,
  ): string | null {
    let componentName: string | null = null;

    traverseFn(ast, {
      enter(path) {
        if (
          (path.isFunctionDeclaration() || path.isFunctionExpression()) &&
          path.node.id &&
          path.node.loc &&
          path.node.loc.start.line <= line &&
          path.node.loc.end.line >= line
        ) {
          componentName = path.node.id.name;
        } else if (
          path.isVariableDeclarator() &&
          path.node.id.type === "Identifier" &&
          path.node.init &&
          (path.node.init.type === "ArrowFunctionExpression" ||
            path.node.init.type === "FunctionExpression") &&
          path.node.loc &&
          path.node.loc.start.line <= line &&
          path.node.loc.end.line >= line
        ) {
          componentName = path.node.id.name;
        }
      },
    });

    return componentName;
  }

  /**
   * Extract all imports from code
   */
  static extractImports(
    code: string,
    filePath: string,
  ): Array<{
    source: string;
    specifiers: Array<{ local: string; imported?: string }>;
    isTypeOnly: boolean;
  }> {
    const ast = this.parse(code, filePath);
    const imports: Array<{
      source: string;
      specifiers: Array<{ local: string; imported?: string }>;
      isTypeOnly: boolean;
    }> = [];

    traverseFn(ast, {
      ImportDeclaration(path) {
        imports.push({
          source: path.node.source.value,
          specifiers: path.node.specifiers.map((s) => ({
            local: s.local.name,
            imported: t.isImportSpecifier(s)
              ? s.imported.type === "Identifier"
                ? s.imported.name
                : s.imported.value
              : undefined,
          })),
          isTypeOnly: path.node.importKind === "type",
        });
      },
    });

    return imports;
  }

  /**
   * Extract all exports from code
   */
  static extractExports(
    code: string,
    filePath: string,
  ): Array<{
    type: "named" | "default" | "namespace" | "all";
    name?: string;
    isTypeOnly: boolean;
  }> {
    const ast = this.parse(code, filePath);
    const exports: Array<{
      type: "named" | "default" | "namespace" | "all";
      name?: string;
      isTypeOnly: boolean;
    }> = [];

    traverseFn(ast, {
      ExportNamedDeclaration(path) {
        if (path.node.declaration) {
          if (path.node.declaration.type === "VariableDeclaration") {
            for (const decl of path.node.declaration.declarations) {
              if (decl.id.type === "Identifier") {
                exports.push({
                  type: "named",
                  name: decl.id.name,
                  isTypeOnly: path.node.exportKind === "type",
                });
              }
            }
          } else if (
            path.node.declaration.type === "FunctionDeclaration" ||
            path.node.declaration.type === "ClassDeclaration"
          ) {
            if (path.node.declaration.id) {
              exports.push({
                type: "named",
                name: path.node.declaration.id.name,
                isTypeOnly: path.node.exportKind === "type",
              });
            }
          } else if (
            path.node.declaration.type === "TSInterfaceDeclaration" ||
            path.node.declaration.type === "TSTypeAliasDeclaration"
          ) {
            exports.push({
              type: "named",
              name: path.node.declaration.id.name,
              isTypeOnly: true,
            });
          }
        }
        if (path.node.specifiers) {
          for (const spec of path.node.specifiers) {
            if ("exported" in spec) {
              const exportedName =
                spec.exported.type === "Identifier"
                  ? spec.exported.name
                  : spec.exported.value;
              exports.push({
                type: "named",
                name: exportedName,
                isTypeOnly: path.node.exportKind === "type",
              });
            }
          }
        }
      },
      ExportDefaultDeclaration(path) {
        const decl = path.node.declaration;
        const name = "id" in decl && decl.id ? decl.id.name : undefined;
        exports.push({
          type: "default",
          name,
          isTypeOnly: false,
        });
      },
      ExportAllDeclaration(path) {
        exports.push({
          type: "all",
          isTypeOnly: path.node.exportKind === "type",
        });
      },
    });

    return exports;
  }

  /**
   * Check if code has syntax errors
   */
  static hasSyntaxErrors(
    code: string,
    filePath: string,
  ): { hasErrors: boolean; errors: string[] } {
    const errors: string[] = [];

    try {
      this.parse(code, filePath);
    } catch (error) {
      if (error instanceof Error) {
        errors.push(error.message);
      }
    }

    return { hasErrors: errors.length > 0, errors };
  }

  /**
   * Get the source code for a specific node range
   */
  static getSourceForRange(code: string, start: number, end: number): string {
    return code.slice(start, end);
  }

  /**
   * Find all JSX elements in the code
   */
  static findJSXElements(
    code: string,
    filePath: string,
  ): Array<{
    name: string;
    startLine: number;
    endLine: number;
    attributes: Record<string, string>;
  }> {
    const ast = this.parse(code, filePath);
    const elements: Array<{
      name: string;
      startLine: number;
      endLine: number;
      attributes: Record<string, string>;
    }> = [];

    traverseFn(ast, {
      JSXElement(path) {
        const openingElement = path.node.openingElement;
        let name = "Unknown";

        if (openingElement.name.type === "JSXIdentifier") {
          name = openingElement.name.name;
        } else if (openingElement.name.type === "JSXMemberExpression") {
          name = `${(openingElement.name.object as any).name}.${openingElement.name.property.name}`;
        }

        const attributes: Record<string, string> = {};
        for (const attr of openingElement.attributes) {
          if (
            attr.type === "JSXAttribute" &&
            attr.name.type === "JSXIdentifier"
          ) {
            const value = attr.value;
            if (value && value.type === "StringLiteral") {
              attributes[attr.name.name] = value.value;
            } else if (value && value.type === "JSXExpressionContainer") {
              attributes[attr.name.name] = "{expression}";
            } else {
              attributes[attr.name.name] = "true";
            }
          }
        }

        elements.push({
          name,
          startLine: path.node.loc?.start.line || 0,
          endLine: path.node.loc?.end.line || 0,
          attributes,
        });
      },
    });

    return elements;
  }

  /**
   * Replace a node in the AST with new code
   */
  static replaceNode(
    code: string,
    filePath: string,
    targetLine: number,
    targetColumn: number,
    replacementCode: string,
  ): string {
    const ast = this.parse(code, filePath);
    let replaced = false;

    traverseFn(ast, {
      enter(path) {
        if (replaced) return;

        const loc = path.node.loc;
        if (!loc) return;

        if (
          loc.start.line <= targetLine &&
          loc.end.line >= targetLine &&
          (loc.start.line !== targetLine || loc.start.column <= targetColumn) &&
          (loc.end.line !== targetLine || loc.end.column >= targetColumn)
        ) {
          // Try to parse replacement code as an expression/statement
          try {
            const replacementAst = parser.parse(replacementCode, {
              sourceType: "module",
              plugins: ["typescript", "jsx"],
            });

            if (replacementAst.program.body.length === 1 && replacementAst.program.body[0]) {
              path.replaceWith(replacementAst.program.body[0]);
              replaced = true;
            }
          } catch {
            // If parsing fails, skip replacement
          }
        }
      },
    });

    if (replaced) {
      const { code: newCode } = this.generate(ast);
      return newCode;
    }

    return code;
  }

  /**
   * Add an import to the code if not already present
   */
  static addImport(
    code: string,
    filePath: string,
    importSource: string,
    importName: string,
    isTypeOnly: boolean = false,
  ): string {
    const ast = this.parse(code, filePath);
    let hasImport = false;

    traverseFn(ast, {
      ImportDeclaration(path) {
        if (path.node.source.value === importSource) {
          const hasSpecifier = path.node.specifiers.some(
            (s) =>
              s.local.name === importName ||
              (t.isImportSpecifier(s) &&
                ((s.imported.type === "Identifier" && s.imported.name === importName) ||
                 (s.imported.type === "StringLiteral" && s.imported.value === importName))),
          );
          if (!hasSpecifier) {
            const specifier = t.importSpecifier(
              t.identifier(importName),
              t.identifier(importName),
            );
            path.node.specifiers.push(specifier);
            if (isTypeOnly) {
              path.node.importKind = "type";
            }
          }
          hasImport = true;
        }
      },
    });

    if (!hasImport) {
      // Add new import at the top
      const specifier = t.importSpecifier(
        t.identifier(importName),
        t.identifier(importName),
      );

      const importDecl = t.importDeclaration(
        [specifier],
        t.stringLiteral(importSource),
      );
      if (isTypeOnly) {
        importDecl.importKind = "type";
      }

      ast.program.body.unshift(importDecl);
    }

    const { code: newCode } = this.generate(ast);
    return newCode;
  }

  /**
   * Remove unused imports
   */
  static removeUnusedImports(
    code: string,
    filePath: string,
    usedIdentifiers: Set<string>,
  ): string {
    const ast = this.parse(code, filePath);

    traverseFn(ast, {
      ImportDeclaration(path) {
        const usedSpecifiers = path.node.specifiers.filter((s) =>
          usedIdentifiers.has(s.local.name),
        );
        if (usedSpecifiers.length === 0) {
          path.remove();
        } else if (usedSpecifiers.length < path.node.specifiers.length) {
          path.node.specifiers = usedSpecifiers;
        }
      },
    });

    const { code: newCode } = this.generate(ast);
    return newCode;
  }
}

/**
 * Utility to create a minimal React component template
 */
export function createComponentTemplate(
  componentName: string,
  props: string = "{}",
  body: string = "return <div />;",
): string {
  return `import React from 'react';

interface ${componentName}Props ${props}

export const ${componentName}: React.FC<${componentName}Props> = (${componentName === "Props" ? "props" : "props"}) => {
  ${body}
};

export default ${componentName};
`;
}

/**
 * Utility to create a hook template
 */
export function createHookTemplate(
  hookName: string,
  returnType: string,
  body: string,
): string {
  return `import { useState, useEffect, useCallback } from 'react';

export function ${hookName}(): ${returnType} {
  ${body}
}
`;
}
