import {
  ExportIntegrityValidator,
  SecurityValidator,
  SyntaxValidator,
  TypeValidator,
  ValidationPipeline,
} from "../../core/services/ValidationPipeline";

describe("Validation Pipeline - Chain of Responsibility Pattern", () => {
  const emptyFiles = new Map<string, string>();

  describe("SyntaxValidator", () => {
    const validator = new SyntaxValidator();

    it("should pass for valid React component code", async () => {
      const code = `
        import React from 'react';
        export const Button = () => <button>Click me</button>;
      `;
      const result = await validator.validate(code, "Button.tsx", emptyFiles);
      expect(result.valid).toBe(true);
      expect(result.diagnostics).toHaveLength(0);
    });

    it("should fail and report location for syntax errors", async () => {
      const code = `
        import React from 'react';
        export const Broken = () => {
          return <div>Unclosed;
        };
      `;
      const result = await validator.validate(code, "Broken.tsx", emptyFiles);
      expect(result.valid).toBe(false);
      expect(result.diagnostics.length).toBeGreaterThan(0);
      expect(result.diagnostics[0]?.type).toBe("syntax");
      expect(result.diagnostics[0]?.severity).toBe("error");
    });
  });

  describe("SecurityValidator - Guardrails & Sandboxing", () => {
    const validator = new SecurityValidator();

    it("should block forbidden Node modules like fs and child_process", async () => {
      const code = `
        import fs from 'fs';
        import { spawn } from 'child_process';
        export const Test = () => <div>Safe</div>;
      `;
      const result = await validator.validate(code, "Test.tsx", emptyFiles);
      expect(result.valid).toBe(false);
      const fsDiag = result.diagnostics.find((d) => d.message.includes("fs"));
      const cpDiag = result.diagnostics.find((d) => d.message.includes("child_process"));
      expect(fsDiag).toBeDefined();
      expect(cpDiag).toBeDefined();
    });

    it("should block eval and new Function", async () => {
      const code = `
        export const Dangerous = () => {
          eval("alert('hacked')");
          const fn = new Function("return 1;");
          return <div>Danger</div>;
        };
      `;
      const result = await validator.validate(code, "Dangerous.tsx", emptyFiles);
      expect(result.valid).toBe(false);
      expect(result.diagnostics.some((d) => d.message.includes("eval"))).toBe(true);
    });

    it("should allow safe standard React and styling imports", async () => {
      const code = `
        import React, { useState } from 'react';
        import styles from './Button.module.css';
        export const Clean = () => <div className={styles.container}>Clean</div>;
      `;
      const result = await validator.validate(code, "Button.tsx", emptyFiles);
      expect(result.valid).toBe(true);
    });
  });

  describe("ExportIntegrityValidator", () => {
    const validator = new ExportIntegrityValidator();

    it("should pass when file exports at least one component or utility", async () => {
      const code = `
        export const Card = () => <div>Card</div>;
        export default Card;
      `;
      const result = await validator.validate(code, "Card.tsx", emptyFiles);
      expect(result.valid).toBe(true);
    });

    it("should warn or fail when an existing export is removed", async () => {
      const prevFiles = new Map<string, string>([
        ["Secret.tsx", "export const Secret = () => <div>Secret</div>;"],
      ]);
      const code = `
        const Secret = () => <div>Secret</div>;
      `;
      const result = await validator.validate(code, "Secret.tsx", prevFiles);
      expect(result.diagnostics.some((d) => d.type === "export")).toBe(true);
    });
  });

  describe("ValidationPipeline (Orchestrator)", () => {
    it("should run code through full chain and aggregate diagnostics", async () => {
      const pipeline = new ValidationPipeline();
      const validCode = `
        import React from 'react';
        export const Hero = () => <h1>Welcome to UI-Sculptor</h1>;
        export default Hero;
      `;

      const result = await pipeline.validate(validCode, "Hero.tsx", emptyFiles);
      expect(result.valid).toBe(true);
      expect(result.diagnostics.filter((d) => d.severity === "error")).toHaveLength(0);
    });

    it("should short-circuit or flag errors when malicious code enters pipeline", async () => {
      const pipeline = new ValidationPipeline();
      const badCode = `
        import * as fs from 'fs';
        export const Bad = () => {
          eval("bad");
          return <div>Bad</div>;
        };
      `;

      const result = await pipeline.validate(badCode, "Bad.tsx", emptyFiles);
      expect(result.valid).toBe(false);
      expect(result.diagnostics.some((d) => d.severity === "error")).toBe(true);
    });
  });
});
