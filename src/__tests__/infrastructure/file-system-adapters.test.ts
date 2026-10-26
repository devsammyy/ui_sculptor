import {
  ConsoleTelemetryAdapter,
  DiskFileSystemAdapter,
  MemoryFileSystemAdapter,
} from "../../infrastructure/adapters/file-system-adapters";
import { TelemetryEvent } from "../../core/ports/file-system.port";
import * as fs from "fs/promises";
import * as path from "path";
import * as os from "os";

describe("File System & Telemetry Adapters - Hexagonal Architecture", () => {
  describe("MemoryFileSystemAdapter (Cloud Sandboxed Mode)", () => {
    let memFs: MemoryFileSystemAdapter;

    beforeEach(() => {
      memFs = new MemoryFileSystemAdapter();
    });

    it("should write and read files in memory", async () => {
      await memFs.writeFile("src/Button.tsx", "export const Button = () => null;");
      expect(await memFs.exists("src/Button.tsx")).toBe(true);
      expect(await memFs.readFile("src/Button.tsx")).toBe("export const Button = () => null;");
    });

    it("should delete files and report existence correctly", async () => {
      await memFs.writeFile("temp.ts", "test");
      await memFs.deleteFile("temp.ts");
      expect(await memFs.exists("temp.ts")).toBe(false);
    });

    it("should list files matching hierarchy", async () => {
      await memFs.writeFile("src/a.ts", "a");
      await memFs.writeFile("src/sub/b.ts", "b");
      const files = await memFs.listFiles("src");
      expect(files).toContain("src/a.ts");
      expect(files).toContain("src/sub/b.ts");
    });

    it("should support snapshots and rollback to snapshot", async () => {
      await memFs.writeFile("file.txt", "v1");
      const snapshotId = await memFs.createSnapshot("checkpoint-1");

      await memFs.writeFile("file.txt", "v2");
      expect(await memFs.readFile("file.txt")).toBe("v2");

      await memFs.restoreSnapshot(snapshotId);
      expect(await memFs.readFile("file.txt")).toBe("v1");

      const snapshots = await memFs.listSnapshots();
      expect(snapshots.some((s) => s.id === snapshotId)).toBe(true);
    });

    it("should export and restore complete virtual file tree", async () => {
      await memFs.writeFile("components/Modal.tsx", "modal code");
      const tree = await memFs.getFileTree();
      expect(tree.name).toBe("root");
      expect(tree.children?.has("components")).toBe(true);

      const newMemFs = new MemoryFileSystemAdapter();
      await newMemFs.setFileTree(tree);
      expect(await newMemFs.readFile("components/Modal.tsx")).toBe("modal code");
    });
  });

  describe("DiskFileSystemAdapter (Local Development Mode)", () => {
    let tempDir: string;
    let diskFs: DiskFileSystemAdapter;

    beforeEach(async () => {
      tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "ui-sculptor-test-"));
      diskFs = new DiskFileSystemAdapter(tempDir);
    });

    afterEach(async () => {
      await fs.rm(tempDir, { recursive: true, force: true });
    });

    it("should write and read files on local disk", async () => {
      await diskFs.writeFile("nested/file.txt", "disk content");
      expect(await diskFs.exists("nested/file.txt")).toBe(true);
      expect(await diskFs.readFile("nested/file.txt")).toBe("disk content");
    });

    it("should list and batch read files", async () => {
      await diskFs.writeFile("a.txt", "A");
      await diskFs.writeFile("b.txt", "B");
      const files = await diskFs.listFiles("");
      expect(files).toContain("a.txt");
      expect(files).toContain("b.txt");

      const contents = await diskFs.readFiles(["a.txt", "b.txt"]);
      expect(contents.get("a.txt")).toBe("A");
      expect(contents.get("b.txt")).toBe("B");
    });
  });

  describe("ConsoleTelemetryAdapter", () => {
    it("should notify subscribers when telemetry events are emitted", () => {
      const telemetry = new ConsoleTelemetryAdapter();
      const events: TelemetryEvent[] = [];

      const unsubscribe = telemetry.subscribe((evt) => {
        events.push(evt);
      });

      const event: TelemetryEvent = {
        type: "synthesis_start",
        timestamp: 1000,
        step: "synthesis",
        status: "pending",
        metadata: { model: "muse-spark-7b" },
      };

      telemetry.emit(event);
      expect(events).toHaveLength(1);
      expect(events[0]).toEqual(event);

      unsubscribe();
      telemetry.emit({
        type: "synthesis_complete",
        timestamp: 2000,
        step: "synthesis",
        status: "success",
      });

      // Should not receive events after unsubscribe
      expect(events).toHaveLength(1);
    });
  });
});

