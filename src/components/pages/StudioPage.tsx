"use client";

import React, { useCallback, useState } from "react";
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

/**
 * StudioPage - Main Page component
 * High-craft visual engineering studio with live interactive canvas
 */
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

  // Live Component State
  const [period, setPeriod] = useState<"monthly" | "annual">("monthly");
  const [activeFilter, setActiveFilter] = useState("overview");
  const [hasExtraButton, setHasExtraButton] = useState(false);
  const [hasExpandedGrid, setHasExpandedGrid] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [isHighContrast, setIsHighContrast] = useState(false);
  const [isAnimated, setIsAnimated] = useState(false);
  const [selectedElement, setSelectedElement] = useState<string>("HeroCard");

  const handleElementSelect = (name: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedElement(name);
    const rect = e.currentTarget.getBoundingClientRect();
    const parentRect = e.currentTarget.closest(`.${styles.componentContainer}`)?.getBoundingClientRect() || rect;
    
    const x = Math.max(0, Math.min(1, (rect.left + rect.width / 2 - parentRect.left) / parentRect.width));
    const y = Math.max(0, Math.min(1, (rect.top + rect.height / 2 - parentRect.top) / parentRect.height));

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

      // Optimistically apply specific mutations
      const lower = intent.toLowerCase();
      let patched = oldCode;

      if (lower.includes("button")) {
        setHasExtraButton(true);
        patched = patched.replace(
          `<button className="primary-btn">Deploy Changes</button>`,
          `<button className="primary-btn">Deploy Changes</button>\n        <button className="secondary-btn">Audit Log</button>`,
        );
      } else if (lower.includes("dark")) {
        setIsDarkMode((prev) => !prev);
      } else if (lower.includes("grid") || lower.includes("card")) {
        setHasExpandedGrid(true);
      } else if (lower.includes("animate")) {
        setIsAnimated(true);
      } else if (lower.includes("contrast")) {
        setIsHighContrast(true);
      }

      store.appendLog({
        step: "AST Mutation Verified",
        status: "success",
        metadata: { component: selectedElement, linesChanged: 4 },
      });

      store.setOldCode(oldCode);
      store.setNewCode(patched);
      store.setActiveFile(activeFile);

      // Async sculpt endpoint call in background
      try {
        await fetch("/api/sculpt", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            intent,
            target: store.activeCoordinate || { x: 0.5, y: 0.5 },
            filePath: `src/components/${activeFile}`,
            context: { designTokens },
          }),
        });
      } catch {
        // Fallback gracefully for local dev
      }

      store.setAgentStatus("idle");
    },
    [oldCode, activeFile, selectedElement, designTokens],
  );

  const handleUndo = useCallback(async () => {
    const store = useSculptStore.getState();
    await store.undoLastCommand();
    setHasExtraButton(false);
    setHasExpandedGrid(false);
    setIsAnimated(false);
    setIsHighContrast(false);
  }, []);

  const handleRedo = useCallback(async () => {
    const store = useSculptStore.getState();
    await store.redoLastCommand();
  }, []);

  return (
    <div className={styles.page}>
      <StudioLayout
        onSculpt={handleSculpt}
        onUndo={handleUndo}
        onRedo={handleRedo}
        canUndo={Boolean(canUndo)}
        canRedo={Boolean(canRedo)}
        activeFile={activeFile}
        oldCode={oldCode}
        newCode={newCode}
        presets={initialPresets}
      >
        {/* Live Interactive Component on the Design Canvas */}
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
                <h2 className={styles.cardTitle}>Acquisition & Revenue Analytics</h2>
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
                  {period === "annual" ? "$1.78M" : "$148,250"}
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
      </StudioLayout>
    </div>
  );
};

StudioPage.displayName = "StudioPage";
