import {
  MuseVoiceStrategy,
  PerceptionStrategy,
  SAM31Strategy,
  VoiceStrategy,
} from "../domain/strategies/model-strategy";
import {
  PerceptionInput,
  PerceptionPort,
  PerceptionResult,
  SegmentationMask,
  ViewportTarget,
} from "../ports/file-system.port";

/**
 * Perception Service - Orchestrates SAM 3.1 + Muse Voice
 * Implements the PerceptionPort inbound interface
 */
export class PerceptionService implements PerceptionPort {
  private readonly samStrategy: PerceptionStrategy;
  private readonly voiceStrategy: VoiceStrategy;

  constructor(samStrategy?: PerceptionStrategy, voiceStrategy?: VoiceStrategy) {
    this.samStrategy =
      samStrategy || new SAM31Strategy(process.env["META_API_KEY"]!);
    this.voiceStrategy =
      voiceStrategy || new MuseVoiceStrategy(process.env["META_API_KEY"]!);
  }

  async processViewportTarget(
    imageBase64: string,
    targetX: number,
    targetY: number,
    viewportWidth: number,
    viewportHeight: number,
  ): Promise<PerceptionResult> {
    // Normalize coordinates to 0-1 range
    const normalizedX = targetX / viewportWidth;
    const normalizedY = targetY / viewportHeight;

    // SAM 3.1 expects pixel coordinates
    const segmentation = await this.samStrategy.segmentImage(
      imageBase64,
      targetX,
      targetY,
    );

    const target: ViewportTarget = {
      x: normalizedX,
      y: normalizedY,
      viewportWidth,
      viewportHeight,
      timestamp: Date.now(),
      source: "click",
    };

    const mask: SegmentationMask = {
      base64Png: segmentation.maskBase64,
      boundingBox: segmentation.boundingBox,
      confidence: segmentation.confidence,
      targetElement: segmentation.targetElement,
    };

    return {
      target,
      mask,
      userIntent: "", // Will be filled by voice if provided
    };
  }

  async transcribeVoice(
    audioBase64: string,
    mimeType: string,
  ): Promise<string> {
    return this.voiceStrategy.transcribe(audioBase64, mimeType);
  }

  async perceive(input: PerceptionInput): Promise<PerceptionResult> {
    // Process visual target first
    const visualResult = await this.processViewportTarget(
      input.screenshotBase64,
      input.targetX,
      input.targetY,
      input.viewportWidth,
      input.viewportHeight,
    );

    // If voice provided, transcribe and merge
    if (input.audioBase64 && input.audioMimeType) {
      const intent = await this.transcribeVoice(
        input.audioBase64,
        input.audioMimeType,
      );
      return {
        ...visualResult,
        userIntent: intent,
        target: {
          ...visualResult.target,
          source: "voice",
        },
      };
    }

    return visualResult;
  }

  /**
   * Create a perception service with custom strategies (for testing)
   */
  static createWithStrategies(
    samStrategy: PerceptionStrategy,
    voiceStrategy: VoiceStrategy,
  ): PerceptionService {
    return new PerceptionService(samStrategy, voiceStrategy);
  }
}
