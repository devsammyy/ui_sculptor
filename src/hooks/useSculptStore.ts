import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";
import { ICommand } from "../core/domain/commands/sculpt-command";
import {
  DesignTokens,
  SegmentationMask,
  ViewportTarget,
} from "../core/domain/models/viewport-target";

/**
 * Sculpt Store - Zustand state management with CQRS pattern
 * Commands (Mutations) vs Queries (Visual State)
 */
interface SculptState {
  // Query State (Read-only views)
  activeCoordinate: ViewportTarget | null;
  activeMask: SegmentationMask | null;
  agentStatus:
    | "idle"
    | "listening"
    | "segmenting"
    | "synthesizing"
    | "validating"
    | "hot-reloading"
    | "error";
  agentLogs: Array<{
    step: string;
    timestamp: number;
    status: "success" | "pending" | "error";
    metadata?: Record<string, unknown>;
  }>;
  commandHistory: ICommand[];
  redoHistory: ICommand[];
  designTokens: DesignTokens;
  isRecording: boolean;
  audioLevel: number;
  activeFile: string | undefined;
  newCode: string | undefined;
  oldCode: string | undefined;

  // Command Dispatches (State mutations)
  setTargetCoordinate: (target: ViewportTarget) => void;
  setMask: (mask: SegmentationMask) => void;
  setAgentStatus: (status: SculptState["agentStatus"]) => void;
  appendLog: (log: {
    step: string;
    status: "success" | "pending" | "error";
    metadata?: Record<string, unknown>;
  }) => void;
  clearLogs: () => void;
  addCommand: (command: ICommand) => void;
  undoLastCommand: () => Promise<ICommand | null>;
  redoLastCommand: () => Promise<ICommand | null>;
  setDesignTokens: (tokens: Partial<DesignTokens>) => void;
  setRecording: (recording: boolean) => void;
  setAudioLevel: (level: number) => void;
  setActiveFile: (file: string | undefined) => void;
  setNewCode: (code: string | undefined) => void;
  setOldCode: (code: string | undefined) => void;
  reset: () => void;
}

// Default design tokens
const defaultDesignTokens: DesignTokens = {
  colors: {
    primary: "#0066CC",
    secondary: "#6B7280",
    background: "#FFFFFF",
    surface: "#F9FAFB",
    text: "#111827",
    border: "#E5E7EB",
  },
  spacing: {
    xs: "0.25rem",
    sm: "0.5rem",
    md: "1rem",
    lg: "1.5rem",
    xl: "2rem",
  },
  borderRadius: {
    sm: "0.25rem",
    md: "0.5rem",
    lg: "1rem",
    full: "9999px",
  },
  typography: {
    fontFamily: "Inter, system-ui, sans-serif",
    fontSizeBase: "1rem",
    fontSizeLg: "1.125rem",
    fontSizeXl: "1.5rem",
  },
};

export const useSculptStore = create<SculptState>()(
  subscribeWithSelector((set, get) => ({
    // Initial state
    activeCoordinate: null,
    activeMask: null,
    agentStatus: "idle",
    agentLogs: [],
    commandHistory: [],
    redoHistory: [],
    designTokens: defaultDesignTokens,
    isRecording: false,
    audioLevel: 0,
    activeFile: undefined,
    newCode: undefined,
    oldCode: undefined,

    // Commands
    setTargetCoordinate: (target) => set({ activeCoordinate: target }),

    setMask: (mask) => set({ activeMask: mask }),

    setAgentStatus: (status) => set({ agentStatus: status }),

    appendLog: (log) =>
      set((state) => ({
        agentLogs: [...state.agentLogs, { ...log, timestamp: Date.now() }],
      })),

    clearLogs: () => set({ agentLogs: [] }),

    addCommand: (command) =>
      set((state) => ({
        commandHistory: [...state.commandHistory, command],
        redoHistory: [],
      })),

    undoLastCommand: async () => {
      const { commandHistory } = get();
      if (commandHistory.length === 0) return null;

      const lastCommand = commandHistory[commandHistory.length - 1];
      if (!lastCommand) return null;
      await lastCommand.undo();

      set((state) => ({
        commandHistory: state.commandHistory.slice(0, -1),
        redoHistory: [...state.redoHistory, lastCommand],
      }));
      return lastCommand;
    },

    redoLastCommand: async () => {
      const { redoHistory } = get();
      if (redoHistory.length === 0) return null;

      const nextCommand = redoHistory[redoHistory.length - 1];
      if (!nextCommand) return null;
      await nextCommand.execute();

      set((state) => ({
        redoHistory: state.redoHistory.slice(0, -1),
        commandHistory: [...state.commandHistory, nextCommand],
      }));
      return nextCommand;
    },

    setDesignTokens: (tokens) =>
      set((state) => ({
        designTokens: { ...state.designTokens, ...tokens },
      })),

    setRecording: (recording) => set({ isRecording: recording }),

    setAudioLevel: (level) => set({ audioLevel: level }),

    setActiveFile: (file) => set({ activeFile: file }),

    setNewCode: (code) => set({ newCode: code }),

    setOldCode: (code) => set({ oldCode: code }),

    reset: () =>
      set({
        activeCoordinate: null,
        activeMask: null,
        agentStatus: "idle",
        agentLogs: [],
        commandHistory: [],
        redoHistory: [],
        designTokens: defaultDesignTokens,
        isRecording: false,
        audioLevel: 0,
        activeFile: undefined,
        newCode: undefined,
        oldCode: undefined,
      }),
  })),
);

/**
 * Selectors for common queries
 */
export const selectActiveCoordinate = (state: SculptState) =>
  state.activeCoordinate;
export const selectActiveMask = (state: SculptState) => state.activeMask;
export const selectAgentStatus = (state: SculptState) => state.agentStatus;
export const selectAgentLogs = (state: SculptState) => state.agentLogs;
export const selectCommandHistory = (state: SculptState) =>
  state.commandHistory;
export const selectDesignTokens = (state: SculptState) => state.designTokens;
export const selectIsRecording = (state: SculptState) => state.isRecording;
export const selectAudioLevel = (state: SculptState) => state.audioLevel;
export const selectCanUndo = (state: SculptState) =>
  state.commandHistory.length > 0;
export const selectCanRedo = (state: SculptState) =>
  state.redoHistory.length > 0;
export const selectActiveFile = (state: SculptState) => state.activeFile;
export const selectNewCode = (state: SculptState) => state.newCode;
export const selectOldCode = (state: SculptState) => state.oldCode;
