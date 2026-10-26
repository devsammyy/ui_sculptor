import {
  CommandHistory,
  CompositeCommand,
  CreateFileCommand,
  DeleteFileCommand,
  MutateComponentCommand,
} from "../../core/domain/commands/sculpt-command";
import { MemoryFileSystemAdapter } from "../../infrastructure/adapters/file-system-adapters";

describe("Command Pattern - UI-Sculptor Mutation Loop", () => {
  let fileSystem: MemoryFileSystemAdapter;

  beforeEach(() => {
    fileSystem = new MemoryFileSystemAdapter();
  });

  describe("MutateComponentCommand", () => {
    it("should write afterCode on execute and restore beforeCode on undo", async () => {
      const filePath = "src/components/Button.tsx";
      await fileSystem.writeFile(filePath, "<button>Old</button>");

      const command = new MutateComponentCommand(
        "cmd-1",
        Date.now(),
        filePath,
        "<button>Old</button>",
        "<button>New</button>",
        fileSystem,
      );

      await command.execute();
      expect(await fileSystem.readFile(filePath)).toBe("<button>New</button>");

      await command.undo();
      expect(await fileSystem.readFile(filePath)).toBe("<button>Old</button>");
    });

    it("should clone with updated code using withUpdatedCode", async () => {
      const command = new MutateComponentCommand(
        "cmd-1",
        1000,
        "test.tsx",
        "A",
        "B",
        fileSystem,
      );

      const chained = command.withUpdatedCode("C");
      expect(chained.id).toBe("cmd-1");
      expect(chained.timestamp).toBe(1000);
      expect(chained.targetFile).toBe("test.tsx");

      await chained.execute();
      expect(await fileSystem.readFile("test.tsx")).toBe("C");
    });
  });

  describe("CreateFileCommand & DeleteFileCommand", () => {
    it("should create file on execute and delete on undo", async () => {
      const command = new CreateFileCommand(
        "cmd-2",
        Date.now(),
        "created.ts",
        "export const x = 1;",
        fileSystem,
      );

      await command.execute();
      expect(await fileSystem.exists("created.ts")).toBe(true);
      expect(await fileSystem.readFile("created.ts")).toBe("export const x = 1;");

      await command.undo();
      expect(await fileSystem.exists("created.ts")).toBe(false);
    });

    it("should delete file on execute and restore on undo", async () => {
      await fileSystem.writeFile("to-delete.ts", "const y = 2;");
      const command = new DeleteFileCommand(
        "cmd-3",
        Date.now(),
        "to-delete.ts",
        "const y = 2;",
        fileSystem,
      );

      await command.execute();
      expect(await fileSystem.exists("to-delete.ts")).toBe(false);

      await command.undo();
      expect(await fileSystem.exists("to-delete.ts")).toBe(true);
      expect(await fileSystem.readFile("to-delete.ts")).toBe("const y = 2;");
    });
  });

  describe("CompositeCommand", () => {
    it("should execute commands sequentially and undo in reverse order without mutating array", async () => {
      const order: string[] = [];

      const mockCmd1 = {
        id: "c1",
        timestamp: 1,
        targetFile: "f1",
        execute: jest.fn().mockImplementation(async () => {
          order.push("exec1");
        }),
        undo: jest.fn().mockImplementation(async () => {
          order.push("undo1");
        }),
      };

      const mockCmd2 = {
        id: "c2",
        timestamp: 2,
        targetFile: "f2",
        execute: jest.fn().mockImplementation(async () => {
          order.push("exec2");
        }),
        undo: jest.fn().mockImplementation(async () => {
          order.push("undo2");
        }),
      };

      const composite = new CompositeCommand([mockCmd1, mockCmd2]);
      await composite.execute();
      expect(order).toEqual(["exec1", "exec2"]);

      await composite.undo();
      expect(order).toEqual(["exec1", "exec2", "undo2", "undo1"]);

      // Re-executing should maintain correct forward order
      order.length = 0;
      await composite.execute();
      expect(order).toEqual(["exec1", "exec2"]);
    });
  });

  describe("CommandHistory - Ring Buffer & Checkpoints", () => {
    it("should manage undo and redo stacks correctly", async () => {
      const history = new CommandHistory(5);
      expect(history.canUndo()).toBe(false);
      expect(history.canRedo()).toBe(false);

      const filePath = "state.txt";
      await fileSystem.writeFile(filePath, "v0");

      const cmd1 = new MutateComponentCommand("1", 1, filePath, "v0", "v1", fileSystem);
      await cmd1.execute();
      history.push(cmd1);

      const cmd2 = new MutateComponentCommand("2", 2, filePath, "v1", "v2", fileSystem);
      await cmd2.execute();
      history.push(cmd2);

      expect(history.canUndo()).toBe(true);
      expect(history.canRedo()).toBe(false);
      expect(await fileSystem.readFile(filePath)).toBe("v2");

      // Undo cmd2
      await history.undo();
      expect(await fileSystem.readFile(filePath)).toBe("v1");
      expect(history.canRedo()).toBe(true);

      // Redo cmd2
      await history.redo();
      expect(await fileSystem.readFile(filePath)).toBe("v2");

      // Undo all
      await history.undo();
      await history.undo();
      expect(await fileSystem.readFile(filePath)).toBe("v0");
      expect(history.canUndo()).toBe(false);
    });

    it("should enforce ring buffer capacity by dropping oldest entries", () => {
      const history = new CommandHistory(3);

      for (let i = 1; i <= 5; i++) {
        history.push({
          id: `cmd-${i}`,
          timestamp: i,
          targetFile: `file-${i}`,
          execute: jest.fn(),
          undo: jest.fn(),
        });
      }

      const activeHistory = history.getHistory();
      expect(activeHistory.length).toBe(3);
      expect(activeHistory[0]?.id).toBe("cmd-3");
      expect(activeHistory[1]?.id).toBe("cmd-4");
      expect(activeHistory[2]?.id).toBe("cmd-5");
    });

    it("should discard future history when a new command is pushed after undo", async () => {
      const history = new CommandHistory(5);
      const c1 = { id: "1", timestamp: 1, targetFile: "f", execute: jest.fn(), undo: jest.fn() };
      const c2 = { id: "2", timestamp: 2, targetFile: "f", execute: jest.fn(), undo: jest.fn() };
      const c3 = { id: "3", timestamp: 3, targetFile: "f", execute: jest.fn(), undo: jest.fn() };

      history.push(c1);
      history.push(c2);
      await history.undo();
      expect(history.canRedo()).toBe(true);

      history.push(c3);
      expect(history.canRedo()).toBe(false);
      expect(history.getHistory().map((c) => c.id)).toEqual(["1", "3"]);
    });
  });
});

