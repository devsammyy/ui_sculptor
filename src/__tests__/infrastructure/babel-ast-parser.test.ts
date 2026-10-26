import {
  BabelAstParser,
  createComponentTemplate,
  createHookTemplate,
} from "../../infrastructure/parsers/BabelAstParser";

describe("BabelAstParser - AST Inspection and Manipulation", () => {
  const sampleCode = `
import React, { useState, useEffect } from 'react';
import styles from './Card.module.css';

export interface CardProps {
  title: string;
}

export const Card: React.FC<CardProps> = ({ title }) => {
  const [active, setActive] = useState(false);
  return (
    <div className={styles.card} id="card-root">
      <h2 title={title}>{title}</h2>
      <button onClick={() => setActive(!active)}>Toggle</button>
    </div>
  );
};

export default Card;
`;

  it("should parse and regenerate valid TSX code without loss", () => {
    const ast = BabelAstParser.parse(sampleCode, "Card.tsx");
    expect(ast).toBeDefined();
    expect(ast.type).toBe("File");

    const { code } = BabelAstParser.generate(ast);
    expect(code).toContain("export const Card");
    expect(code).toContain("export default Card");
  });

  it("should detect syntax errors accurately", () => {
    const invalidCode = "const x = ;";
    const res = BabelAstParser.hasSyntaxErrors(invalidCode, "broken.ts");
    expect(res.hasErrors).toBe(true);
    expect(res.errors.length).toBeGreaterThan(0);

    const validRes = BabelAstParser.hasSyntaxErrors("const x = 10;", "valid.ts");
    expect(validRes.hasErrors).toBe(false);
  });

  it("should extract imports and detect type-only imports", () => {
    const code = `
      import React, { useState } from 'react';
      import type { User } from './types';
    `;
    const imports = BabelAstParser.extractImports(code, "test.tsx");
    expect(imports).toHaveLength(2);

    const reactImport = imports.find((i) => i.source === "react");
    expect(reactImport).toBeDefined();
    expect(reactImport?.isTypeOnly).toBe(false);

    const typeImport = imports.find((i) => i.source === "./types");
    expect(typeImport).toBeDefined();
    expect(typeImport?.isTypeOnly).toBe(true);
  });

  it("should extract exports including named and default", () => {
    const exports = BabelAstParser.extractExports(sampleCode, "Card.tsx");
    const namedExports = exports.filter((e) => e.type === "named").map((e) => e.name);
    expect(namedExports).toContain("Card");
    expect(namedExports).toContain("CardProps");

    const defaultExport = exports.find((e) => e.type === "default");
    expect(defaultExport).toBeDefined();
  });

  it("should extract JSX elements with attributes", () => {
    const elements = BabelAstParser.findJSXElements(sampleCode, "Card.tsx");
    const names = elements.map((e) => e.name);
    expect(names).toContain("div");
    expect(names).toContain("h2");
    expect(names).toContain("button");
  });

  it("should identify enclosing component name at line", () => {
    const ast = BabelAstParser.parse(sampleCode, "Card.tsx");
    const comp = BabelAstParser.getComponentAtPosition(ast, 11);
    expect(comp).toBe("Card");
  });

  it("should add new import if not present", () => {
    const updated = BabelAstParser.addImport(
      sampleCode,
      "Card.tsx",
      "@/components/Icon",
      "Icon",
    );
    expect(updated).toContain("import { Icon } from \"@/components/Icon\";");
  });

  it("should create templates using helper functions", () => {
    const component = createComponentTemplate("Avatar", "{ src: string }");
    expect(component).toContain("export const Avatar");
    expect(component).toContain("export default Avatar;");

    const hook = createHookTemplate("useTheme", "string", "return 'dark';");
    expect(hook).toContain("export function useTheme(): string");
  });
});

