import { ensureWavBuffer } from "../../infrastructure/adapters/audio-converter";

describe("Audio Converter - WAV transcoding for Meta Muse Voice", () => {
  it("should preserve existing WAV buffers with RIFF headers", async () => {
    const fakeWav = Buffer.alloc(44);
    fakeWav.write("RIFF", 0);
    fakeWav.write("WAVE", 8);

    const result = await ensureWavBuffer(fakeWav);
    expect(result).toBe(fakeWav);
    expect(result.toString("utf8", 0, 4)).toBe("RIFF");
    expect(result.toString("utf8", 8, 12)).toBe("WAVE");
  });
});

