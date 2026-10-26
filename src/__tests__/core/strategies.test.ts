import {
  HostedMetaStrategy,
  ModelStrategyFactory,
  MuseVoiceStrategy,
  OpenWeightSparkStrategy,
  SAM31Strategy,
} from "../../core/domain/strategies/model-strategy";
import { SynthesisContext } from "../../core/domain/models/viewport-target";

describe("Strategy Pattern - Model Synthesis & Perception", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  const mockContext: SynthesisContext = {
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
      boundingBox: { x: 0.4, y: 0.4, width: 0.2, height: 0.2 },
      confidence: 0.98,
      targetElement: "PrimaryButton",
    },
    astContext: {
      filePath: "src/components/PrimaryButton.tsx",
      nodeType: "JSXElement",
      startLine: 1,
      endLine: 10,
      sourceCode: "export const PrimaryButton = () => <button>Click</button>;",
      parentComponent: "PrimaryButton",
    },
    userIntent: "Change button text to Submit and style with primary color",
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

  describe("ModelStrategyFactory", () => {
    it("should default to OpenWeightSparkStrategy (vLLM local inference)", () => {
      delete process.env.USE_HOSTED_MODELS;
      const strategy = ModelStrategyFactory.createSynthesisStrategy();
      expect(strategy).toBeInstanceOf(OpenWeightSparkStrategy);
      expect(strategy.engineName).toContain("Muse-Spark-Open-7B");
    });

    it("should instantiate HostedMetaStrategy when USE_HOSTED_MODELS=true and key provided", () => {
      process.env.USE_HOSTED_MODELS = "true";
      process.env.META_API_KEY = "test-meta-key";
      const strategy = ModelStrategyFactory.createSynthesisStrategy();
      expect(strategy).toBeInstanceOf(HostedMetaStrategy);
      expect(strategy.engineName).toContain("Muse-Wonder");
    });

    it("should throw for perception strategy when META_API_KEY is missing", () => {
      delete process.env.META_API_KEY;
      expect(() => ModelStrategyFactory.createPerceptionStrategy()).toThrow(
        "META_API_KEY required",
      );
    });

    it("should instantiate SAM31Strategy and MuseVoiceStrategy when key is provided", () => {
      process.env.META_API_KEY = "meta-key-123";
      const perception = ModelStrategyFactory.createPerceptionStrategy();
      const voice = ModelStrategyFactory.createVoiceStrategy();
      expect(perception).toBeInstanceOf(SAM31Strategy);
      expect(voice).toBeInstanceOf(MuseVoiceStrategy);
    });
  });

  describe("OpenWeightSparkStrategy", () => {
    it("should handle unreachable vLLM endpoint gracefully with diagnostic result", async () => {
      const strategy = new OpenWeightSparkStrategy("http://127.0.0.1:9999/v1");
      const isConnected = await strategy.validateConnection();
      expect(isConnected).toBe(false);

      const result = await strategy.synthesizePatch(mockContext);
      expect(result.success).toBe(false);
      expect(result.diagnostics.length).toBeGreaterThan(0);
      expect(result.metadata.strategyUsed).toContain("Muse-Spark-Open-7B");
    });
  });

  describe("HostedMetaStrategy", () => {
    it("should fail gracefully when network request fails", async () => {
      const strategy = new HostedMetaStrategy("fake-key", "http://127.0.0.1:9999");
      const isConnected = await strategy.validateConnection();
      expect(isConnected).toBe(false);

      const result = await strategy.synthesizePatch(mockContext);
      expect(result.success).toBe(false);
    });
  });
});

