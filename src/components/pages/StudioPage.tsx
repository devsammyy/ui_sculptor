"use client";

import React, { useCallback, useEffect, useState } from "react";
import { MutateComponentCommand } from "../../core/domain/commands/sculpt-command";
import {
  selectActiveCoordinate,
  selectActiveFile,
  selectAgentStatus,
  selectCanRedo,
  selectCanUndo,
  selectDesignTokens,
  selectNewCode,
  selectOldCode,
  useSculptStore,
} from "../../hooks/useSculptStore";
import { StudioLayout } from "../templates/StudioLayout";
import { ProductCard } from "../ProductCard";
import { AnalyticsCard } from "../AnalyticsCard";
import styles from "./StudioPage.module.css";

interface StudioPageProps {
  initialPresets?: Array<{ label: string; intent: string }>;
}

const DEFAULT_CODE = `import React from 'react';

export interface DashboardHeroProps {
  title?: string;
  monthlyRevenue?: number;
  conversionRate?: number;
}

export const DashboardHero: React.FC<DashboardHeroProps> = ({
  title = "Acquisition & Revenue Analytics",
  monthlyRevenue = 148250,
  conversionRate = 5.84,
}) => {
  return (
    <div className="analytics-card">
      <header className="card-header">
        <h3>{title}</h3>
        <span className="live-badge">Live Production</span>
      </header>
      <div className="metrics-grid">
        <div className="metric">
          <span>ARR</span>
          <strong>\${monthlyRevenue.toLocaleString()}</strong>
        </div>
        <div className="metric">
          <span>Conversion</span>
          <strong>{conversionRate}%</strong>
        </div>
      </div>
      <div className="actions">
        <button className="primary-btn">Deploy Changes</button>
      </div>
    </div>
  );
};

export default DashboardHero;
`;

const STORAGE_KEY = "ui-sculptor:canvas-state";

interface PersistedCanvasState {
  code: string;
  hasExtraButton: boolean;
  hasExpandedGrid: boolean;
  isDarkMode: boolean;
  isHighContrast: boolean;
  isAnimated: boolean;
  cardTitle: string;
  monthlyRevenue: number;
}

function loadCanvasState(): PersistedCanvasState {
  if (typeof window === "undefined") {
    return {
      code: DEFAULT_CODE,
      hasExtraButton: false,
      hasExpandedGrid: false,
      isDarkMode: true,
      isHighContrast: false,
      isAnimated: false,
      cardTitle: "Acquisition & Revenue Analytics",
      monthlyRevenue: 148250,
    };
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as PersistedCanvasState;
  } catch {
    // corrupted — fall through to defaults
  }
  return {
    code: DEFAULT_CODE,
    hasExtraButton: false,
    hasExpandedGrid: false,
    isDarkMode: true,
    isHighContrast: false,
    isAnimated: false,
    cardTitle: "Acquisition & Revenue Analytics",
    monthlyRevenue: 148250,
  };
}

function saveCanvasState(state: PersistedCanvasState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // quota exceeded — silently ignore
  }
}

/**
 * StudioPage - Main Page component
 * High-craft visual engineering studio with live interactive canvas
 */
const SPATIAL_PRESETS = [
  { label: "Add 3D Knot", intent: "Add a rotating golden metallic torus knot mesh with specular reflections" },
  { label: "Cyberpunk Lights", intent: "Set vibrant point lights in neon cyan and magenta with high intensity" },
  { label: "Satellite Nodes", intent: "Add 4 orbiting glowing data cubes around the central geometry" },
  { label: "Particle Stars", intent: "Add an ambient field of 200 floating particle stars with depth" },
  { label: "Crystal Core", intent: "Change central geometry to a faceted crystal octahedron with glass material" },
];

export const StudioPage: React.FC<StudioPageProps> = ({
  initialPresets = [
    { label: "Add Button", intent: "Add a secondary audit log button with icon" },
    { label: "Dark Mode", intent: "Toggle high-contrast obsidian dark palette" },
    { label: "Card Grid", intent: "Expand analytics metrics to a 4-column KPI grid" },
    { label: "Animate", intent: "Add entrance spring animations and hover micro-interactions" },
    { label: "Fix Contrast", intent: "Enhance color contrast and WCAG AA accessibility compliance" },
  ],
}) => {
  const agentStatus = useSculptStore(selectAgentStatus);
  const activeFile = useSculptStore(selectActiveFile) || "DashboardHero.tsx";
  const oldCode = useSculptStore(selectOldCode) || DEFAULT_CODE;
  const newCode = useSculptStore(selectNewCode);
  const designTokens = useSculptStore(selectDesignTokens);
  const canUndo = useSculptStore(selectCanUndo);
  const canRedo = useSculptStore(selectCanRedo);

  // Tab and 3D Spatial states
  const [activeTab, setActiveTab] = useState<"playground" | "3d" | "diff">("playground");
  const [activeFile2D, setActiveFile2D] = useState<string>("DashboardHero.tsx");
  const [scene3DShape, setScene3DShape] = useState<"knot" | "torus" | "cube" | "sphere" | "crystal">("knot");
  const [scene3DLighting, setScene3DLighting] = useState<"default" | "cyberpunk" | "monochrome" | "sunset">("cyberpunk");
  const [scene3DHasSatellites, setScene3DHasSatellites] = useState(true);

  // Rehydrate canvas state from localStorage on first render
  const [_persisted] = useState<PersistedCanvasState>(loadCanvasState);

  // Live Component State — seeded from persisted values
  const [period, setPeriod] = useState<"monthly" | "annual">("monthly");
  const [activeFilter, setActiveFilter] = useState("overview");
  const [cardTitle, setCardTitle] = useState(_persisted.cardTitle);
  const [monthlyRevenue, setMonthlyRevenue] = useState(_persisted.monthlyRevenue);
  const [activeCohorts, setActiveCohorts] = useState(48290);
  const [conversionRate, setConversionRate] = useState(5.84);
  const [hasExtraButton, setHasExtraButton] = useState(_persisted.hasExtraButton);
  const [hasExpandedGrid, setHasExpandedGrid] = useState(_persisted.hasExpandedGrid);
  const [isDarkMode, setIsDarkMode] = useState(_persisted.isDarkMode);
  const [isHighContrast, setIsHighContrast] = useState(_persisted.isHighContrast);
  const [isAnimated, setIsAnimated] = useState(_persisted.isAnimated);
  const [selectedElement, setSelectedElement] = useState<string>("HeroCard");
  const [availableFiles, setAvailableFiles] = useState<string[]>(["DashboardHero.tsx"]);

  const applyCodeToComponentState = useCallback((code: string) => {
    setHasExtraButton(
      code.includes("secondary-btn") || code.includes("Audit Log"),
    );

    if (code.includes("isDarkMode = false") || code.includes('className="dashboard-hero light')) {
      setIsDarkMode(false);
    } else if (code.includes("isDarkMode = true") || code.includes('className="dashboard-hero dark')) {
      setIsDarkMode(true);
    }

    setHasExpandedGrid(
      code.includes("Customer LTV") || code.includes("hasExpandedGrid = true"),
    );
    setIsAnimated(
      code.includes("animated") || code.includes("isAnimated = true"),
    );
    setIsHighContrast(
      code.includes("high-contrast") ||
        code.includes("isHighContrast = true") ||
        code.includes("2px solid #ffffff"),
    );

    const titleMatch = code.match(/title\s*=\s*"([^"]+)"/);
    if (titleMatch && titleMatch[1]) {
      setCardTitle(titleMatch[1]);
    }

    const arrMatch = code.match(/monthlyRevenue\s*=\s*(\d+)/);
    if (arrMatch && arrMatch[1]) {
      const num = parseInt(arrMatch[1], 10);
      if (!isNaN(num)) setMonthlyRevenue(num);
    }
  }, []);

  // Fetch all available component files on mount
  useEffect(() => {
    fetch("/api/components")
      .then((res) => res.json())
      .then((data) => {
        if (data.success && Array.isArray(data.files) && data.files.length > 0) {
          setAvailableFiles(data.files);
        }
      })
      .catch(() => {});
  }, []);

  // Handler to switch files dynamically
  const handleFileSelect = useCallback(async (newFile: string) => {
    if (newFile !== "Scene3DTarget.tsx") {
      setActiveFile2D(newFile);
    }
    useSculptStore.getState().setActiveFile(newFile);
    try {
      const res = await fetch(`/api/components/${newFile}`);
      const data = await res.json();
      if (data.success && data.code) {
        useSculptStore.getState().setOldCode(data.code);
        useSculptStore.getState().setNewCode(data.code);
        applyCodeToComponentState(data.code);
      }
    } catch (err) {
      console.error("Failed to load file content:", err);
    }
  }, [applyCodeToComponentState]);

  // Handler when user switches between Canvas, 3D Spatial, and Code Diff tabs
  const handleTabChange = useCallback(
    (tab: "playground" | "3d" | "diff") => {
      setActiveTab(tab);
      if (tab === "3d") {
        useSculptStore.getState().setActiveFile("Scene3DTarget.tsx");
        fetch("/api/components/Scene3DTarget.tsx")
          .then((res) => res.json())
          .then((data) => {
            if (data.success && data.code) {
              useSculptStore.getState().setOldCode(data.code);
              useSculptStore.getState().setNewCode(data.code);
            }
          })
          .catch(() => {});
      } else if (tab === "playground") {
        useSculptStore.getState().setActiveFile(activeFile2D);
        fetch(`/api/components/${activeFile2D}`)
          .then((res) => res.json())
          .then((data) => {
            if (data.success && data.code) {
              useSculptStore.getState().setOldCode(data.code);
              useSculptStore.getState().setNewCode(data.code);
              applyCodeToComponentState(data.code);
            }
          })
          .catch(() => {});
      }
    },
    [activeFile2D, applyCodeToComponentState],
  );

  const handleElementSelect = (name: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedElement(name);
    const rect = e.currentTarget.getBoundingClientRect();
    const parentRect =
      e.currentTarget.closest(`.${styles.componentContainer}`)?.getBoundingClientRect() ||
      rect;

    const x = Math.max(
      0,
      Math.min(1, (rect.left + rect.width / 2 - parentRect.left) / parentRect.width),
    );
    const y = Math.max(
      0,
      Math.min(1, (rect.top + rect.height / 2 - parentRect.top) / parentRect.height),
    );

    useSculptStore.getState().setTargetCoordinate({
      x,
      y,
      viewportWidth: Math.round(parentRect.width),
      viewportHeight: Math.round(parentRect.height),
      timestamp: Date.now(),
      source: "click",
    });
  };

  const handleSculpt = useCallback(
    async (intent: string) => {
      const store = useSculptStore.getState();
      store.setAgentStatus("synthesizing");
      store.appendLog({
        step: `Perception: "${intent}"`,
        status: "pending",
        metadata: { intent, target: selectedElement },
      });

      try {
        const targetFilePath =
          activeFile === "Scene3DTarget.tsx" || activeTab === "3d"
            ? "src/components/organisms/Scene3DTarget.tsx"
            : `src/components/${activeFile}`;

        const response = await fetch("/api/sculpt", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            intent,
            target: store.activeCoordinate || { x: 0.5, y: 0.5 },
            filePath: targetFilePath,
            context: { designTokens },
          }),
        });

        const result = await response.json();
        if (result.success && result.data) {
          const { oldCode: prevCode, newCode: nextCode, metadata } = result.data;

          // Dispatch command to history for robust Undo/Redo
          const cmd = new MutateComponentCommand(
            `cmd-${Date.now()}`,
            Date.now(),
            targetFilePath,
            prevCode || oldCode,
            nextCode,
            {
              readFile: async () => prevCode,
              writeFile: async () => {},
              deleteFile: async () => {},
              exists: async () => true,
              listFiles: async () => [],
              readFiles: async () => new Map(),
              createSnapshot: async () => "",
              restoreSnapshot: async () => {},
              listSnapshots: async () => [],
            },
          );
          store.addCommand(cmd);

          store.setOldCode(prevCode || oldCode);
          store.setNewCode(nextCode);

          if (targetFilePath.includes("Scene3DTarget.tsx")) {
            if (nextCode.includes("crystal") || nextCode.includes("octahedron")) {
              setScene3DShape("crystal");
            } else if (nextCode.includes("torus") && !nextCode.includes("Knot")) {
              setScene3DShape("torus");
            } else if (nextCode.includes("cube")) {
              setScene3DShape("cube");
            } else if (nextCode.includes("sphere")) {
              setScene3DShape("sphere");
            } else if (nextCode.includes("knot")) {
              setScene3DShape("knot");
            }

            if (nextCode.includes("cyberpunk")) setScene3DLighting("cyberpunk");
            else if (nextCode.includes("monochrome")) setScene3DLighting("monochrome");
            else if (nextCode.includes("sunset")) setScene3DLighting("sunset");

            if (
              nextCode.includes("hasExtraMesh = false") ||
              nextCode.includes("hasExtraMesh={false}")
            ) {
              setScene3DHasSatellites(false);
            } else if (nextCode.includes("hasExtraMesh")) {
              setScene3DHasSatellites(true);
            }
          } else {
            applyCodeToComponentState(nextCode);
          }

          store.appendLog({
            step: `AST Mutation Verified (${metadata?.strategyUsed || "Autonomous Engine"})`,
            status: "success",
            metadata: {
              component: selectedElement,
              durationMs: metadata?.durationMs,
              tokens: metadata?.tokensUsed,
            },
          });
        } else {
          throw new Error(result.error || "Synthesis failed");
        }
      } catch (err) {
        console.error("Sculpt error:", err);
        store.appendLog({
          step: "Sculpt Execution Failed",
          status: "error",
          metadata: { error: err instanceof Error ? err.message : String(err) },
        });
      } finally {
        store.setAgentStatus("idle");
      }
    },
    [oldCode, activeFile, selectedElement, designTokens, applyCodeToComponentState],
  );

  const handleUndo = useCallback(async () => {
    const store = useSculptStore.getState();
    const command = await store.undoLastCommand();
    if (command && "beforeCode" in command) {
      const restored = (command as MutateComponentCommand).beforeCode;
      store.setNewCode(restored);
      applyCodeToComponentState(restored);
      store.appendLog({
        step: "Rollback Executed",
        status: "success",
        metadata: { file: activeFile },
      });

      try {
        await fetch("/api/rollback", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ steps: 1 }),
        });
      } catch {}
    }
  }, [activeFile, applyCodeToComponentState]);

  const handleRedo = useCallback(async () => {
    const store = useSculptStore.getState();
    const command = await store.redoLastCommand();
    if (command && "afterCode" in command) {
      const reapplied = (command as MutateComponentCommand).afterCode;
      store.setNewCode(reapplied);
      applyCodeToComponentState(reapplied);
      store.appendLog({
        step: "Redo Executed",
        status: "success",
        metadata: { file: activeFile },
      });
    }
  }, [activeFile, applyCodeToComponentState]);

  return (
    <div className={styles.page}>
      <StudioLayout
        onSculpt={handleSculpt}
        onUndo={handleUndo}
        onRedo={handleRedo}
        canUndo={Boolean(canUndo)}
        canRedo={Boolean(canRedo)}
        activeFile={activeTab === "3d" ? "Scene3DTarget.tsx" : activeFile}
        availableFiles={availableFiles}
        onFileSelect={handleFileSelect}
        oldCode={oldCode}
        newCode={newCode}
        presets={activeTab === "3d" ? SPATIAL_PRESETS : initialPresets}
        activeTab={activeTab}
        onTabChange={handleTabChange}
        scene3DProps={{
          centerShape: scene3DShape,
          lightingTheme: scene3DLighting,
          hasExtraMesh: scene3DHasSatellites,
        }}
      >
        {/* Render the currently selected component file */}
        {activeFile === "ProductCard.tsx" ? (
          <div
            className={styles.componentContainer}
            onClick={(e) => handleElementSelect("ProductCard", e)}
          >
            <ProductCard />
          </div>
        ) : activeFile === "AnalyticsCard.tsx" ? (
          <div
            className={styles.componentContainer}
            onClick={(e) => handleElementSelect("AnalyticsCard", e)}
          >
            <AnalyticsCard />
          </div>
        ) : (
          /* Default DashboardHero Component on the Design Canvas */
          <div
            className={`${styles.componentContainer} ${isDarkMode ? styles.darkTheme : styles.lightTheme} ${isHighContrast ? styles.highContrast : ""} ${isAnimated ? styles.animated : ""}`}
            onClick={(e) => handleElementSelect("DashboardHero", e)}
          >
          {/* Card Header */}
          <div
            className={styles.cardHeader}
            onClick={(e) => handleElementSelect("CardHeader", e)}
          >
            <div className={styles.headerLeft}>
              <div className={styles.brandIconWrapper}>
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className={styles.headerSvg}
                >
                  <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
                </svg>
              </div>
              <div>
                <div className={styles.cardEyebrow}>Enterprise Cohorts</div>
                <h2 className={styles.cardTitle}>{cardTitle}</h2>
              </div>
            </div>

            <div className={styles.headerRight}>
              <span
                className={styles.statusBadge}
                onClick={(e) => handleElementSelect("StatusBadge", e)}
              >
                <span className={styles.statusPulse} />
                Live Release v2.8
              </span>
            </div>
          </div>

          {/* Interactive Navigation Filter */}
          <div
            className={styles.filterBar}
            onClick={(e) => handleElementSelect("FilterBar", e)}
          >
            <div className={styles.tabPills}>
              {["overview", "cohorts", "conversions"].map((tab) => (
                <button
                  key={tab}
                  className={`${styles.tabPill} ${activeFilter === tab ? styles.activeTabPill : ""}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveFilter(tab);
                  }}
                >
                  {tab.charAt(0).toUpperCase() + tab.slice(1)}
                </button>
              ))}
            </div>

            <div className={styles.periodSwitcher}>
              <button
                className={`${styles.periodBtn} ${period === "monthly" ? styles.activePeriod : ""}`}
                onClick={(e) => {
                  e.stopPropagation();
                  setPeriod("monthly");
                }}
              >
                Monthly
              </button>
              <button
                className={`${styles.periodBtn} ${period === "annual" ? styles.activePeriod : ""}`}
                onClick={(e) => {
                  e.stopPropagation();
                  setPeriod("annual");
                }}
              >
                Annual -20%
              </button>
            </div>
          </div>

          {/* KPI Metrics Grid */}
          <div
            className={`${styles.metricsGrid} ${hasExpandedGrid ? styles.fourCols : ""}`}
            onClick={(e) => handleElementSelect("MetricsGrid", e)}
          >
            <div
              className={styles.metricCard}
              onClick={(e) => handleElementSelect("MetricARR", e)}
            >
              <span className={styles.metricLabel}>Net Recurring ARR</span>
              <div className={styles.metricNumberRow}>
                <span className={styles.metricNumber}>
                  {period === "annual"
                    ? `$${((monthlyRevenue * 12) / 1000000).toFixed(2)}M`
                    : `$${monthlyRevenue.toLocaleString()}`}
                </span>
                <span className={styles.positiveDelta}>+24.8%</span>
              </div>
              <div className={styles.progressBar}>
                <div className={styles.progressFill} style={{ width: "78%" }} />
              </div>
            </div>

            <div
              className={styles.metricCard}
              onClick={(e) => handleElementSelect("MetricActiveUsers", e)}
            >
              <span className={styles.metricLabel}>Active Cohorts</span>
              <div className={styles.metricNumberRow}>
                <span className={styles.metricNumber}>48,290</span>
                <span className={styles.positiveDelta}>+14.2%</span>
              </div>
              <div className={styles.progressBar}>
                <div className={styles.progressFill} style={{ width: "64%" }} />
              </div>
            </div>

            <div
              className={styles.metricCard}
              onClick={(e) => handleElementSelect("MetricConversion", e)}
            >
              <span className={styles.metricLabel}>Conversion Rate</span>
              <div className={styles.metricNumberRow}>
                <span className={styles.metricNumber}>5.84%</span>
                <span className={styles.positiveDelta}>+1.8%</span>
              </div>
              <div className={styles.progressBar}>
                <div className={styles.progressFill} style={{ width: "88%" }} />
              </div>
            </div>

            {hasExpandedGrid && (
              <div
                className={styles.metricCard}
                onClick={(e) => handleElementSelect("MetricRetention", e)}
              >
                <span className={styles.metricLabel}>Net Retention</span>
                <div className={styles.metricNumberRow}>
                  <span className={styles.metricNumber}>114.2%</span>
                  <span className={styles.positiveDelta}>+3.4%</span>
                </div>
                <div className={styles.progressBar}>
                  <div className={styles.progressFill} style={{ width: "92%" }} />
                </div>
              </div>
            )}
          </div>

          {/* Action Row */}
          <div
            className={styles.cardFooter}
            onClick={(e) => handleElementSelect("CardFooter", e)}
          >
            <div className={styles.footerInfo}>
              <div className={styles.avatarStack}>
                <span className={styles.avatar}>JD</span>
                <span className={styles.avatar}>AK</span>
                <span className={styles.avatar}>TS</span>
              </div>
              <span className={styles.socialProofText}>
                Trusted by 4,200+ engineering teams
              </span>
            </div>

            <div className={styles.actionButtonGroup}>
              {hasExtraButton && (
                <button
                  className={styles.secondaryBtn}
                  onClick={(e) => handleElementSelect("SecondaryButton", e)}
                >
                  <svg viewBox="0 0 20 20" fill="currentColor" width="14" height="14">
                    <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
                  </svg>
                  <span>Audit Log</span>
                </button>
              )}

              <button
                className={styles.primaryBtn}
                onClick={(e) => handleElementSelect("PrimaryButton", e)}
              >
                <span>Deploy Changes</span>
                <svg viewBox="0 0 20 20" fill="currentColor" width="14" height="14">
                  <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
          </div>
        </div>
        )}
      </StudioLayout>
    </div>
  );
};

StudioPage.displayName = "StudioPage";
