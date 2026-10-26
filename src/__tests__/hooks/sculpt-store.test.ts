import {
  selectActiveCoordinate,
  selectAgentLogs,
  selectAgentStatus,
  selectCanUndo,
  useSculptStore,
} from "../../hooks/useSculptStore";

describe("useSculptStore - CQRS State Management", () => {
  beforeEach(() => {
    useSculptStore.getState().reset();
  });

  it("should initialize with idle status and empty history", () => {
    const state = useSculptStore.getState();
    expect(selectAgentStatus(state)).toBe("idle");
    expect(selectActiveCoordinate(state)).toBeNull();
    expect(selectCanUndo(state)).toBe(false);
  });

  it("should update target coordinates and status via actions", () => {
    const target = {
      x: 0.25,
      y: 0.75,
      viewportWidth: 1920,
      viewportHeight: 1080,
      timestamp: Date.now(),
      source: "click" as const,
    };

    useSculptStore.getState().setTargetCoordinate(target);
    useSculptStore.getState().setAgentStatus("segmenting");

    const state = useSculptStore.getState();
    expect(selectActiveCoordinate(state)).toEqual(target);
    expect(selectAgentStatus(state)).toBe("segmenting");
  });

  it("should append and clear agent logs", () => {
    useSculptStore.getState().appendLog({
      step: "AST Parsing",
      status: "success",
      metadata: { nodes: 42 },
    });

    let state = useSculptStore.getState();
    expect(selectAgentLogs(state)).toHaveLength(1);
    expect(selectAgentLogs(state)[0]?.step).toBe("AST Parsing");

    useSculptStore.getState().clearLogs();
    state = useSculptStore.getState();
    expect(selectAgentLogs(state)).toHaveLength(0);
  });

  it("should support undoing commands from command history", async () => {
    const mockUndo = jest.fn().mockResolvedValue(undefined);
    const mockCmd = {
      id: "cmd-1",
      timestamp: Date.now(),
      targetFile: "Button.tsx",
      execute: jest.fn(),
      undo: mockUndo,
    };

    useSculptStore.getState().addCommand(mockCmd);
    expect(selectCanUndo(useSculptStore.getState())).toBe(true);

    await useSculptStore.getState().undoLastCommand();
    expect(mockUndo).toHaveBeenCalledTimes(1);
    expect(selectCanUndo(useSculptStore.getState())).toBe(false);
  });
});

