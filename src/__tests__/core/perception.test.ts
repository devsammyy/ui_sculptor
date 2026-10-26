import { PerceptionService } from "../../core/services/PerceptionService";
import {
  PerceptionStrategy,
  VoiceStrategy,
} from "../../core/domain/strategies/model-strategy";

describe("PerceptionService - SAM 3.1 & Muse Voice Ingestion", () => {
  it("should normalize coordinates and orchestrate image segmentation", async () => {
    const mockSamStrategy: PerceptionStrategy = {
      engineName: "Mock-SAM",
      segmentImage: jest.fn().mockResolvedValue({
        maskBase64: "data:image/png;base64,maskdata",
        boundingBox: { x: 100, y: 100, width: 200, height: 80 },
        confidence: 0.96,
        targetElement: "SubmitButton",
      }),
    };

    const mockVoiceStrategy: VoiceStrategy = {
      engineName: "Mock-Voice",
      transcribe: jest.fn().mockResolvedValue("Make the button rounded and blue"),
    };

    const service = new PerceptionService(mockSamStrategy, mockVoiceStrategy);

    const result = await service.processViewportTarget(
      "fake-image-base64",
      500,
      250,
      1000,
      500,
    );

    expect(result.target.x).toBe(0.5);
    expect(result.target.y).toBe(0.5);
    expect(result.target.viewportWidth).toBe(1000);
    expect(result.target.viewportHeight).toBe(500);
    expect(result.mask.targetElement).toBe("SubmitButton");
    expect(result.mask.confidence).toBe(0.96);
  });

  it("should combine image segmentation with voice transcription in perceive()", async () => {
    const mockSamStrategy: PerceptionStrategy = {
      engineName: "Mock-SAM",
      segmentImage: jest.fn().mockResolvedValue({
        maskBase64: "mask",
        boundingBox: { x: 0, y: 0, width: 100, height: 100 },
        confidence: 0.92,
        targetElement: "Card",
      }),
    };

    const mockVoiceStrategy: VoiceStrategy = {
      engineName: "Mock-Voice",
      transcribe: jest.fn().mockResolvedValue("Add drop shadow to card"),
    };

    const service = new PerceptionService(mockSamStrategy, mockVoiceStrategy);

    const result = await service.perceive({
      screenshotBase64: "screenshot",
      targetX: 200,
      targetY: 200,
      viewportWidth: 800,
      viewportHeight: 600,
      audioBase64: "audio-stream",
      audioMimeType: "audio/webm",
    });

    expect(result.userIntent).toBe("Add drop shadow to card");
    expect(result.mask.targetElement).toBe("Card");
    expect(mockVoiceStrategy.transcribe).toHaveBeenCalledWith(
      "audio-stream",
      "audio/webm",
    );
  });
});
