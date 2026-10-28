"use client";

import React, { useCallback, useState } from "react";
import {
  selectActiveCoordinate,
  selectActiveMask,
  selectAgentLogs,
  selectAgentStatus,
  selectCanRedo,
  selectCanUndo,
  selectDesignTokens,
  useSculptStore,
} from "../../hooks/useSculptStore";
import { PushToTalkTrigger } from "../molecules/PushToTalkTrigger";
import { TokenColorPicker } from "../molecules/TokenColorPicker";
import { AgentLogDrawer } from "../organisms/AgentLogDrawer";
import { AstDiffViewer } from "../organisms/AstDiffViewer";
import { QuickActionRibbon } from "../organisms/QuickActionRibbon";
import { Scene3DTarget } from "../organisms/Scene3DTarget";
import { ViewportOverlay } from "../organisms/ViewportOverlay";
import styles from "./StudioLayout.module.css";

interface StudioLayoutProps {
  children: React.ReactNode;
  onSculpt: (intent: string) => void;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  activeFile?: string;
  availableFiles?: string[];
  onFileSelect?: (file: string) => void;
  oldCode?: string;
  newCode?: string;
  presets?: Array<{ label: string; intent: string }>;
  viewportMode?: "desktop" | "tablet" | "mobile";
  onViewportChange?: (mode: "desktop" | "tablet" | "mobile") => void;
  activeTab?: "playground" | "3d" | "diff";
  onTabChange?: (tab: "playground" | "3d" | "diff") => void;
  scene3DProps?: {
    centerShape?: "torus" | "knot" | "cube" | "sphere" | "crystal";
    lightingTheme?: "default" | "cyberpunk" | "monochrome" | "sunset";
    hasExtraMesh?: boolean;
  };
}

/**
 * StudioLayout - Template component
 * High-performance 3-pane professional visual development studio
 */
export const StudioLayout: React.FC<StudioLayoutProps> = ({
  children,
  onSculpt,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  activeFile = "DashboardHero.tsx",
  availableFiles = ["DashboardHero.tsx"],
  onFileSelect,
  oldCode,
  newCode,
  presets = [],
  viewportMode: externalViewportMode,
  onViewportChange,
  activeTab: externalActiveTab,
  onTabChange,
  scene3DProps,
}) => {
  const agentStatus = useSculptStore(selectAgentStatus);
  const agentLogs = useSculptStore(selectAgentLogs);
  const activeMask = useSculptStore(selectActiveMask);
  const activeCoordinate = useSculptStore(selectActiveCoordinate);
  const designTokens = useSculptStore(selectDesignTokens);
  const canUndoStore = useSculptStore(selectCanUndo);
  const canRedoStore = useSculptStore(selectCanRedo);

  const [showLogs, setShowLogs] = useState(false);
  const [internalActiveTab, setInternalActiveTab] = useState<
    "playground" | "3d" | "diff"
  >("playground");
  const activeTab = externalActiveTab || internalActiveTab;

  const handleTabSelect = (tab: "playground" | "3d" | "diff") => {
    setInternalActiveTab(tab);
    onTabChange?.(tab);
  };

  const [sidebarTab, setSidebarTab] = useState<"palette" | "tree">("palette");
  const [internalViewportMode, setInternalViewportMode] = useState<
    "desktop" | "tablet" | "mobile"
  >("desktop");
  const [zoomLevel, setZoomLevel] = useState(100);
  const [promptText, setPromptText] = useState("");
  const [copiedCode, setCopiedCode] = useState(false);

  const currentViewport = externalViewportMode || internalViewportMode;
  const setViewport = (mode: "desktop" | "tablet" | "mobile") => {
    if (onViewportChange) {
      onViewportChange(mode);
    } else {
      setInternalViewportMode(mode);
    }
  };

  const handleTargetSelect = useCallback(
    (target: {
      x: number;
      y: number;
      viewportWidth: number;
      viewportHeight: number;
    }) => {
      useSculptStore.getState().setTargetCoordinate({
        ...target,
        timestamp: Date.now(),
        source: "click",
      });
    },
    [],
  );

  const handlePresetSelect = useCallback(
    (intent: string) => {
      onSculpt(intent);
    },
    [onSculpt],
  );

  const handlePromptSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const inputEl = e.currentTarget.querySelector('input[name="prompt"]') as HTMLInputElement | null;
    const finalPrompt = (inputEl?.value || promptText || "").trim();
    if (finalPrompt) {
      onSculpt(finalPrompt);
      setPromptText("");
      if (inputEl) inputEl.value = "";
    }
  };

  const handleCopyJSX = () => {
    const codeToCopy = newCode || oldCode || "// UI Sculptor JSX Component";
    navigator.clipboard.writeText(codeToCopy).then(() => {
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    });
  };

  return (
    <div
      className={styles.studio}
      style={
        {
          "--color-primary": designTokens.colors.primary,
        } as React.CSSProperties
      }
    >
      {/* Top Bar - Sleek Navigation */}
      <header className={styles.topBar}>
        <div className={styles.topBarLeft}>
          <div className={styles.brandMark}>
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className={styles.brandIcon}
            >
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
            </svg>
            <span className={styles.brandTitle}>UI Sculptor</span>
          </div>

          <div className={styles.breadcrumbDivider}>/</div>

          <div className={styles.filePill} title={activeFile}>
            <span className={styles.fileDot} />
            {availableFiles && availableFiles.length > 1 && onFileSelect ? (
              <select
                className={styles.fileSelect}
                value={activeFile}
                onChange={(e) => onFileSelect(e.target.value)}
                aria-label="Select target component file"
              >
                {availableFiles.map((file) => (
                  <option key={file} value={file} className={styles.fileOption}>
                    {file}
                  </option>
                ))}
              </select>
            ) : (
              <span className={styles.fileName}>{activeFile}</span>
            )}
          </div>

          {/* Device Viewport Selector */}
          <div className={styles.viewportSelector}>
            <button
              className={`${styles.viewportButton} ${currentViewport === "desktop" ? styles.activeViewport : ""}`}
              onClick={() => setViewport("desktop")}
              title="Desktop viewport (100%)"
              aria-label="Desktop"
            >
              <svg viewBox="0 0 20 20" fill="currentColor" width="14" height="14">
                <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 011 1v8a1 1 0 01-1 1H4a1 1 0 01-1-1V4zm1 1v6h12V5H4zm-1 9a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
              </svg>
            </button>
            <button
              className={`${styles.viewportButton} ${currentViewport === "tablet" ? styles.activeViewport : ""}`}
              onClick={() => setViewport("tablet")}
              title="Tablet viewport (768px)"
              aria-label="Tablet"
            >
              <svg viewBox="0 0 20 20" fill="currentColor" width="14" height="14">
                <path fillRule="evenodd" d="M6 2a2 2 0 00-2 2v12a2 2 0 002 2h8a2 2 0 002-2V4a2 2 0 00-2-2H6zm1 2h6v10H7V4zm3 11a1 1 0 100 2 1 1 0 000-2z" clipRule="evenodd" />
              </svg>
            </button>
            <button
              className={`${styles.viewportButton} ${currentViewport === "mobile" ? styles.activeViewport : ""}`}
              onClick={() => setViewport("mobile")}
              title="Mobile viewport (375px)"
              aria-label="Mobile"
            >
              <svg viewBox="0 0 20 20" fill="currentColor" width="14" height="14">
                <path fillRule="evenodd" d="M7 2a2 2 0 00-2 2v12a2 2 0 002 2h6a2 2 0 002-2V4a2 2 0 00-2-2H7zm1 2h4v10H8V4zm2 11a1 1 0 100 2 1 1 0 000-2z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
        </div>

        {/* Center - Workspace Modes */}
        <div className={styles.topBarCenter}>
          <div className={styles.segmentedControl} role="tablist">
            <button
              role="tab"
              aria-selected={activeTab === "playground"}
              className={`${styles.segmentButton} ${activeTab === "playground" ? styles.activeSegment : ""}`}
              onClick={() => handleTabSelect("playground")}
            >
              <svg viewBox="0 0 20 20" fill="currentColor" width="14" height="14">
                <path d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4V5h12v10z" />
              </svg>
              <span>Canvas</span>
            </button>
            <button
              role="tab"
              aria-selected={activeTab === "diff"}
              className={`${styles.segmentButton} ${activeTab === "diff" ? styles.activeSegment : ""}`}
              onClick={() => handleTabSelect("diff")}
            >
              <svg viewBox="0 0 20 20" fill="currentColor" width="14" height="14">
                <path fillRule="evenodd" d="M12.316 3.051a1 1 0 01.633 1.265l-4 12a1 1 0 11-1.898-.632l4-12a1 1 0 011.265-.633zM5.707 6.293a1 1 0 010 1.414L3.414 10l2.293 2.293a1 1 0 11-1.414 1.414l-3-3a1 1 0 010-1.414l3-3a1 1 0 011.414 0zm8.586 0a1 1 0 011.414 0l3 3a1 1 0 010 1.414l-3 3a1 1 0 11-1.414-1.414L16.586 10l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
              <span>Code & Diff</span>
            </button>
            <button
              role="tab"
              aria-selected={activeTab === "3d"}
              className={`${styles.segmentButton} ${activeTab === "3d" ? styles.activeSegment : ""}`}
              onClick={() => handleTabSelect("3d")}
            >
              <svg viewBox="0 0 20 20" fill="currentColor" width="14" height="14">
                <path d="M10 2L2 6l8 4 8-4-8-4zM2 9l8 4 8-4M2 13l8 4 8-4" />
              </svg>
              <span>3D Spatial</span>
            </button>
          </div>
        </div>

        {/* Right - Studio Actions */}
        <div className={styles.topBarRight}>
          <div className={styles.actionButtonGroup}>
            <button
              className={styles.headerIconButton}
              onClick={onUndo}
              disabled={!canUndo && !canUndoStore}
              title="Undo (Ctrl+Z)"
              aria-label="Undo"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="15" height="15">
                <path d="M3 7v6h6M3 13a9 9 0 1 0 2.7-6.3L3 7" />
              </svg>
            </button>
            <button
              className={styles.headerIconButton}
              onClick={onRedo}
              disabled={!canRedo && !canRedoStore}
              title="Redo (Ctrl+Shift+Z)"
              aria-label="Redo"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="15" height="15">
                <path d="M21 7v6h-6M21 13a9 9 0 1 1-2.7-6.3L21 7" />
              </svg>
            </button>
          </div>

          <button
            className={styles.copyButton}
            onClick={handleCopyJSX}
            title="Copy component JSX"
          >
            {copiedCode ? (
              <span className={styles.copiedText}>Copied!</span>
            ) : (
              <>
                <svg viewBox="0 0 20 20" fill="currentColor" width="13" height="13">
                  <path d="M8 2a1 1 0 000 2h2a1 1 0 100-2H8z" />
                  <path d="M3 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2V5z" />
                </svg>
                <span>Copy JSX</span>
              </>
            )}
          </button>

          <button
            className={`${styles.terminalButton} ${showLogs ? styles.activeTerminal : ""}`}
            onClick={() => setShowLogs(!showLogs)}
            title="Toggle Activity Console"
            aria-label="Toggle Console"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
              <path d="M4 17l6-6-6-6M12 19h8" />
            </svg>
            <span>Activity</span>
            {agentLogs.length > 0 && (
              <span className={styles.logBadge}>{agentLogs.length}</span>
            )}
          </button>

          <div className={styles.connectionIndicator} title={`Status: ${agentStatus}`}>
            <span className={`${styles.connectionDot} ${styles[agentStatus] || ""}`} />
            <span className={styles.connectionLabel}>
              {agentStatus === "idle" ? "Ready" : agentStatus}
            </span>
          </div>
        </div>
      </header>

      {/* Main Studio Viewport */}
      <main className={styles.main}>
        {/* Left Sidebar */}
        <aside className={styles.sidebar}>
          <div className={styles.sidebarNav}>
            <button
              className={`${styles.sidebarTabBtn} ${sidebarTab === "palette" ? styles.activeSidebarTab : ""}`}
              onClick={() => setSidebarTab("palette")}
            >
              Palette
            </button>
            <button
              className={`${styles.sidebarTabBtn} ${sidebarTab === "tree" ? styles.activeSidebarTab : ""}`}
              onClick={() => setSidebarTab("tree")}
            >
              Hierarchy
            </button>
          </div>

          <div className={styles.sidebarContent}>
            {sidebarTab === "palette" ? (
              <QuickActionRibbon
                presets={presets}
                onPresetSelect={handlePresetSelect}
                disabled={agentStatus !== "idle"}
              />
            ) : (
              <div className={styles.treeView}>
                <div className={styles.treeSectionTitle}>
                  {activeTab === "3d"
                    ? "3D Spatial Hierarchy"
                    : "Component Hierarchy"}
                </div>
                {activeTab === "3d" ? (
                  <>
                    <div
                      className={styles.treeItem}
                      onClick={() => onSculpt("Target 3D Scene root")}
                    >
                      <span className={styles.treeTag}>&lt;Scene3D&gt;</span>
                    </div>
                    <div
                      className={`${styles.treeItem} ${styles.indent1}`}
                      onClick={() => onSculpt("Target central 3D geometry")}
                    >
                      <span className={styles.treeTag}>
                        &lt;FloatingCoreObject&gt;
                      </span>
                    </div>
                    <div
                      className={`${styles.treeItem} ${styles.indent1}`}
                      onClick={() => onSculpt("Target satellite data nodes")}
                    >
                      <span className={styles.treeTag}>
                        &lt;SatelliteNodes&gt;
                      </span>
                    </div>
                    <div
                      className={`${styles.treeItem} ${styles.indent1}`}
                      onClick={() => onSculpt("Target spatial particle field")}
                    >
                      <span className={styles.treeTag}>
                        &lt;SpatialParticleField&gt;
                      </span>
                    </div>
                    <div
                      className={`${styles.treeItem} ${styles.indent1}`}
                      onClick={() => onSculpt("Target 3D lighting system")}
                    >
                      <span className={styles.treeTag}>
                        &lt;CyberpunkLighting&gt;
                      </span>
                    </div>
                  </>
                ) : (
                  <>
                    <div
                      className={styles.treeItem}
                      onClick={() => onSculpt("Target hero card wrapper")}
                    >
                      <span className={styles.treeTag}>&lt;HeroCard&gt;</span>
                    </div>
                    <div
                      className={`${styles.treeItem} ${styles.indent1}`}
                      onClick={() => onSculpt("Target metrics grid")}
                    >
                      <span className={styles.treeTag}>&lt;MetricsGrid&gt;</span>
                    </div>
                    <div
                      className={`${styles.treeItem} ${styles.indent2}`}
                      onClick={() => onSculpt("Target revenue metric")}
                    >
                      <span className={styles.treeTag}>
                        &lt;RevenueMetric&gt;
                      </span>
                    </div>
                    <div
                      className={`${styles.treeItem} ${styles.indent1}`}
                      onClick={() => onSculpt("Target action button bar")}
                    >
                      <span className={styles.treeTag}>&lt;ActionBar&gt;</span>
                    </div>
                    <div
                      className={`${styles.treeItem} ${styles.indent2}`}
                      onClick={() => onSculpt("Target primary action button")}
                    >
                      <span className={styles.treeTag}>
                        &lt;PrimaryButton&gt;
                      </span>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </aside>

        {/* Center - Visual Canvas */}
        <section className={styles.playground} role="main">
          <div className={styles.canvasToolbar}>
            <div className={styles.canvasBreadcrumb}>
              <span>Canvas</span>
              <span className={styles.canvasSeparator}>/</span>
              <span className={styles.canvasCurrent}>
                {currentViewport.toUpperCase()} ({currentViewport === "desktop" ? "100%" : currentViewport === "tablet" ? "768px" : "375px"})
              </span>
            </div>

            <div className={styles.zoomControls}>
              <button
                className={styles.zoomBtn}
                onClick={() => setZoomLevel((z) => Math.max(50, z - 10))}
                title="Zoom Out"
              >
                -
              </button>
              <span className={styles.zoomText}>{zoomLevel}%</span>
              <button
                className={styles.zoomBtn}
                onClick={() => setZoomLevel((z) => Math.min(150, z + 10))}
                title="Zoom In"
              >
                +
              </button>
              <button
                className={styles.zoomResetBtn}
                onClick={() => setZoomLevel(100)}
                title="Reset Zoom"
              >
                Reset
              </button>
            </div>
          </div>

          <div className={`${styles.canvasStage} ${activeTab !== "playground" ? styles.canvasStageFull : ""}`}>
            {activeTab === "playground" && (
              <div
                className={`${styles.deviceFrame} ${styles[currentViewport]}`}
                style={{ transform: `scale(${zoomLevel / 100})` }}
              >
                <ViewportOverlay
                  onTargetSelect={handleTargetSelect}
                  activeMask={activeMask ? "mask" : null}
                  activeTarget={
                    activeCoordinate
                      ? {
                          x: activeCoordinate.x,
                          y: activeCoordinate.y,
                          confidence: 0.95,
                        }
                      : null
                  }
                >
                  {children}
                </ViewportOverlay>
              </div>
            )}

            {activeTab === "3d" && (
              <div className={styles.stagePanel}>
                <Scene3DTarget
                  targetCoordinate={activeCoordinate}
                  centerShape={scene3DProps?.centerShape || "knot"}
                  lightingTheme={scene3DProps?.lightingTheme || "cyberpunk"}
                  hasExtraMesh={scene3DProps?.hasExtraMesh ?? true}
                  onTargetSelect={(pos) => {
                    useSculptStore.getState().setTargetCoordinate({
                      x: Math.max(0, Math.min(1, (pos[0] + 12) / 24)),
                      y: Math.max(0, Math.min(1, (pos[2] + 12) / 24)),
                      viewportWidth: 1280,
                      viewportHeight: 800,
                      timestamp: Date.now(),
                      source: "gesture",
                    });
                  }}
                />
              </div>
            )}

            {activeTab === "diff" && (
              <div className={styles.stagePanel}>
                <AstDiffViewer
                  oldCode={oldCode || `// Current code`}
                  newCode={newCode || `// Modified code`}
                  filePath={activeFile}
                />
              </div>
            )}
          </div>

          {/* Floating Command Dock (Raycast / V0 Style) */}
          <div className={styles.floatingCommandDock}>
            <form className={styles.commandForm} onSubmit={handlePromptSubmit}>
              <div className={styles.commandInputWrapper}>
                <svg
                  className={styles.sparkleIcon}
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  width="16"
                  height="16"
                >
                  <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" />
                </svg>
                <input
                  type="text"
                  name="prompt"
                  className={styles.commandInput}
                  placeholder="Describe modification or hold Space to talk..."
                  value={promptText}
                  onChange={(e) => setPromptText(e.target.value)}
                  disabled={agentStatus !== "idle"}
                />
              </div>

              <div className={styles.dockControls}>
                <PushToTalkTrigger
                  onTranscription={(text) => {
                    setPromptText(text);
                    onSculpt(text);
                  }}
                  onRecordingChange={() => {}}
                />
                <button
                  type="submit"
                  className={styles.sculptSubmitBtn}
                  disabled={agentStatus !== "idle"}
                >
                  <span>Sculpt</span>
                  <span className={styles.enterKeyHint}>↵</span>
                </button>
              </div>
            </form>
          </div>
        </section>

        {/* Right Sidebar - Inspector */}
        <aside className={styles.inspector}>
          <div className={styles.inspectorCard}>
            <div className={styles.inspectorHeader}>
              <span className={styles.inspectorTitle}>Target Selection</span>
              {activeCoordinate && (
                <span className={styles.selectionPill}>Targeted</span>
              )}
            </div>
            {activeCoordinate ? (
              <div className={styles.coordGrid}>
                <div className={styles.coordCell}>
                  <span className={styles.coordLabel}>Coord X</span>
                  <span className={styles.coordVal}>
                    {(activeCoordinate.x * 100).toFixed(1)}%
                  </span>
                </div>
                <div className={styles.coordCell}>
                  <span className={styles.coordLabel}>Coord Y</span>
                  <span className={styles.coordVal}>
                    {(activeCoordinate.y * 100).toFixed(1)}%
                  </span>
                </div>
                <div className={styles.coordCell}>
                  <span className={styles.coordLabel}>Viewport</span>
                  <span className={styles.coordVal}>
                    {activeCoordinate.viewportWidth} × {activeCoordinate.viewportHeight}
                  </span>
                </div>
                <div className={styles.coordCell}>
                  <span className={styles.coordLabel}>Input</span>
                  <span className={styles.coordVal}>{activeCoordinate.source}</span>
                </div>
              </div>
            ) : (
              <div className={styles.targetPromptNotice}>
                Click any component on canvas to drop a precision sculpt reticle
              </div>
            )}
          </div>

          <div className={styles.inspectorCard}>
            <div className={styles.inspectorHeader}>
              <span className={styles.inspectorTitle}>Design Tokens</span>
              <span className={styles.tokenCount}>Tokens</span>
            </div>
            <div className={styles.tokensList}>
              <div className={styles.tokenRow}>
                <div className={styles.tokenInfo}>
                  <span className={styles.tokenName}>Primary Accent</span>
                  <span className={styles.tokenHex}>
                    {designTokens.colors.primary}
                  </span>
                </div>
                <TokenColorPicker
                  label="Primary Accent"
                  value={designTokens.colors.primary}
                  onChange={(color) =>
                    useSculptStore.getState().setDesignTokens({
                      colors: { ...designTokens.colors, primary: color },
                    })
                  }
                />
              </div>
              <div className={styles.tokenRow}>
                <div className={styles.tokenInfo}>
                  <span className={styles.tokenName}>Surface Background</span>
                  <span className={styles.tokenHex}>
                    {designTokens.colors.surface}
                  </span>
                </div>
                <TokenColorPicker
                  label="Surface Background"
                  value={designTokens.colors.surface}
                  onChange={(color) =>
                    useSculptStore.getState().setDesignTokens({
                      colors: { ...designTokens.colors, surface: color },
                    })
                  }
                />
              </div>
              <div className={styles.tokenRow}>
                <div className={styles.tokenInfo}>
                  <span className={styles.tokenName}>Text Primary</span>
                  <span className={styles.tokenHex}>
                    {designTokens.colors.text}
                  </span>
                </div>
                <TokenColorPicker
                  label="Text Primary"
                  value={designTokens.colors.text}
                  onChange={(color) =>
                    useSculptStore.getState().setDesignTokens({
                      colors: { ...designTokens.colors, text: color },
                    })
                  }
                />
              </div>
              <div className={styles.tokenRow}>
                <div className={styles.tokenInfo}>
                  <span className={styles.tokenName}>Border Color</span>
                  <span className={styles.tokenHex}>
                    {designTokens.colors.border}
                  </span>
                </div>
                <TokenColorPicker
                  label="Border Color"
                  value={designTokens.colors.border}
                  onChange={(color) =>
                    useSculptStore.getState().setDesignTokens({
                      colors: { ...designTokens.colors, border: color },
                    })
                  }
                />
              </div>
            </div>
          </div>

          <div className={styles.inspectorCard}>
            <div className={styles.inspectorHeader}>
              <span className={styles.inspectorTitle}>Typography & Shape</span>
            </div>
            <div className={styles.propertyGroup}>
              <span className={styles.propertyLabel}>Font Family</span>
              <span className={styles.propertyValue}>
                {designTokens.typography.fontFamily.split(",")[0]}
              </span>
            </div>
            <div className={styles.propertyGroup}>
              <span className={styles.propertyLabel}>Base Size</span>
              <span className={styles.propertyValue}>
                {designTokens.typography.fontSizeBase}
              </span>
            </div>
            <div className={styles.propertyGroup}>
              <span className={styles.propertyLabel}>Border Radius</span>
              <span className={styles.propertyValue}>
                {designTokens.borderRadius.md}
              </span>
            </div>
          </div>
        </aside>
      </main>

      {/* Bottom Status Line */}
      <footer className={styles.statusBar}>
        <div className={styles.statusBarLeft}>
          <span className={styles.statusItem}>UI-Sculptor Studio</span>
          <span className={styles.statusDotSeparator}>•</span>
          <span className={styles.statusItem}>{activeFile}</span>
          <span className={styles.statusDotSeparator}>•</span>
          <span className={styles.statusItem}>TypeScript JSX</span>
        </div>
        <div className={styles.statusBarRight}>
          <span className={styles.statusItem}>
            Undo Stack: {canUndo || canUndoStore ? "Available" : "Empty"}
          </span>
          <span className={styles.statusDotSeparator}>•</span>
          <span className={styles.statusItem}>AST Engine Ready</span>
        </div>
      </footer>

      {/* Slide-over Activity Log Drawer */}
      <AgentLogDrawer
        logs={agentLogs}
        isOpen={showLogs}
        onClose={() => setShowLogs(false)}
      />
    </div>
  );
};

StudioLayout.displayName = "StudioLayout";
