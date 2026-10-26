"use client";

import React, { useMemo, useState } from "react";
import { DiffGutter } from "../atoms/DiffGutter";
import styles from "./AstDiffViewer.module.css";

interface DiffLine {
  type: "added" | "removed" | "unchanged";
  content: string;
  lineNumber?: number;
  oldLineNumber?: number;
  newLineNumber?: number;
}

interface AstDiffViewerProps {
  oldCode: string;
  newCode: string;
  filePath: string;
  className?: string;
  showLineNumbers?: boolean;
}

/**
 * AstDiffViewer - Organism component
 * Side-by-side AST modification diff inspector
 */
export const AstDiffViewer: React.FC<AstDiffViewerProps> = ({
  oldCode,
  newCode,
  filePath,
  className = "",
  showLineNumbers = true,
}) => {
  const [viewMode, setViewMode] = useState<"unified" | "split">("unified");

  const diff = useMemo(() => computeDiff(oldCode, newCode), [oldCode, newCode]);
  const stats = useMemo(() => computeStats(diff), [diff]);

  return (
    <div className={`${styles.container} ${className}`}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.fileInfo}>
          <span className={styles.fileIcon} aria-hidden="true">
            <svg viewBox="0 0 16 16" fill="currentColor" width="16" height="16">
              <path d="M14.5 2H6a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2zM6 2.5a.5.5 0 0 1 .5-.5h8a.5.5 0 0 1 .5.5v10a.5.5 0 0 1-.5.5H6a.5.5 0 0 1-.5-.5V4a.5.5 0 0 1 .5-.5z" />
            </svg>
          </span>
          <span className={styles.fileName}>{filePath}</span>
        </div>

        <DiffGutter additions={stats.additions} deletions={stats.deletions} />

        <div
          className={styles.viewToggle}
          role="group"
          aria-label="Diff view mode"
        >
          <button
            className={`${styles.toggleButton} ${viewMode === "unified" ? styles.active : ""}`}
            onClick={() => setViewMode("unified")}
            aria-pressed={viewMode === "unified"}
          >
            Unified
          </button>
          <button
            className={`${styles.toggleButton} ${viewMode === "split" ? styles.active : ""}`}
            onClick={() => setViewMode("split")}
            aria-pressed={viewMode === "split"}
          >
            Split
          </button>
        </div>
      </div>

      {/* Diff content */}
      <div className={styles.diffContent}>
        {viewMode === "unified" ? (
          <UnifiedDiffView diff={diff} showLineNumbers={showLineNumbers} />
        ) : (
          <SplitDiffView diff={diff} showLineNumbers={showLineNumbers} />
        )}
      </div>
    </div>
  );
};

AstDiffViewer.displayName = "AstDiffViewer";

// Unified diff view
function UnifiedDiffView({
  diff,
  showLineNumbers,
}: {
  diff: DiffLine[];
  showLineNumbers: boolean;
}) {
  return (
    <div className={styles.unifiedView}>
      <table className={styles.diffTable} cellSpacing={0} cellPadding={0}>
        <tbody>
          {diff.map((line, index) => (
            <tr
              key={index}
              className={`${styles.diffRow} ${styles[line.type]}`}
            >
              {showLineNumbers && (
                <>
                  <td className={styles.lineNumber}>
                    {line.oldLineNumber !== undefined ? line.oldLineNumber : ""}
                  </td>
                  <td className={styles.lineNumber}>
                    {line.newLineNumber !== undefined ? line.newLineNumber : ""}
                  </td>
                </>
              )}
              <td className={styles.lineContent}>
                <span className={styles.linePrefix}>
                  {line.type === "added"
                    ? "+"
                    : line.type === "removed"
                      ? "−"
                      : " "}
                </span>
                <code className={styles.codeLine}>{line.content || " "}</code>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// Split diff view
function SplitDiffView({
  diff,
  showLineNumbers,
}: {
  diff: DiffLine[];
  showLineNumbers: boolean;
}) {
  const oldLines = diff.filter((l) => l.type !== "added");
  const newLines = diff.filter((l) => l.type !== "removed");

  return (
    <div className={styles.splitView}>
      <div className={styles.splitPane}>
        <div className={styles.paneHeader}>
          <span className={styles.paneTitle}>Before</span>
          <span className={styles.paneCount}>{oldLines.length} lines</span>
        </div>
        <table className={styles["diffTable"]} cellSpacing={0} cellPadding={0}>
          <tbody>
            {oldLines.map((line, index) => (
              <tr
                key={index}
                className={`${styles["diffRow"]} ${line.type === "removed" ? styles["removed"] : styles["unchanged"]}`}
              >
                {showLineNumbers && (
                  <td className={styles["lineNumber"]}>
                    {line.oldLineNumber !== undefined ? line.oldLineNumber : ""}
                  </td>
                )}
                <td className={styles["lineContent"]}>
                  <span className={styles["linePrefix"]}>
                    {line.type === "removed" ? "−" : " "}
                  </span>
                  <code className={styles["codeLine"]}>
                    {line.content || " "}
                  </code>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className={styles["splitPane"]}>
        <div className={styles["paneHeader"]}>
          <span className={styles["paneTitle"]}>After</span>
          <span className={styles["paneCount"]}>{newLines.length} lines</span>
        </div>
        <table className={styles["diffTable"]} cellSpacing={0} cellPadding={0}>
          <tbody>
            {newLines.map((line, index) => (
              <tr
                key={index}
                className={`${styles["diffRow"]} ${line.type === "added" ? styles["added"] : styles["unchanged"]}`}
              >
                {showLineNumbers && (
                  <td className={styles["lineNumber"]}>
                    {line.newLineNumber !== undefined ? line.newLineNumber : ""}
                  </td>
                )}
                <td className={styles["lineContent"]}>
                  <span className={styles["linePrefix"]}>
                    {line.type === "added" ? "+" : " "}
                  </span>
                  <code className={styles["codeLine"]}>
                    {line.content || " "}
                  </code>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// Simple diff algorithm (Myers diff would be better for production)
function computeDiff(oldCode: string, newCode: string): DiffLine[] {
  const oldLines = oldCode.split("\n");
  const newLines = newCode.split("\n");

  const diff: DiffLine[] = [];
  let oldIndex = 0;
  let newIndex = 0;
  let oldLineNum = 1;
  let newLineNum = 1;

  // Simple LCS-based diff
  const lcs = computeLCS(oldLines, newLines);
  let lcsIndex = 0;

  while (oldIndex < oldLines.length || newIndex < newLines.length) {
    const oldLine = oldLines[oldIndex];
    const newLine = newLines[newIndex];
    const lcsLine = lcs[lcsIndex];

    if (
      lcsLine !== undefined &&
      oldLine !== undefined &&
      newLine !== undefined &&
      oldLine === lcsLine &&
      newLine === lcsLine
    ) {
      // Unchanged line
      diff.push({
        type: "unchanged",
        content: oldLine,
        oldLineNumber: oldLineNum++,
        newLineNumber: newLineNum++,
      });
      oldIndex++;
      newIndex++;
      lcsIndex++;
    } else if (
      lcsLine !== undefined &&
      oldLine !== undefined &&
      newLine !== undefined &&
      oldLine !== lcsLine &&
      newLine === lcsLine
    ) {
      // Line removed
      diff.push({
        type: "removed",
        content: oldLine,
        oldLineNumber: oldLineNum++,
      });
      oldIndex++;
    } else if (
      lcsLine !== undefined &&
      oldLine !== undefined &&
      newLine !== undefined &&
      oldLine === lcsLine &&
      newLine !== lcsLine
    ) {
      // Line added
      diff.push({
        type: "added",
        content: newLine,
        newLineNumber: newLineNum++,
      });
      newIndex++;
    } else if (
      oldIndex < oldLines.length &&
      newIndex < newLines.length &&
      oldLine !== undefined &&
      newLine !== undefined
    ) {
      // Both changed - show as remove + add
      diff.push({
        type: "removed",
        content: oldLine,
        oldLineNumber: oldLineNum++,
      });
      diff.push({
        type: "added",
        content: newLine,
        newLineNumber: newLineNum++,
      });
      oldIndex++;
      newIndex++;
    } else if (oldIndex < oldLines.length && oldLine !== undefined) {
      // Remaining old lines
      diff.push({
        type: "removed",
        content: oldLine,
        oldLineNumber: oldLineNum++,
      });
      oldIndex++;
    } else if (newIndex < newLines.length && newLine !== undefined) {
      // Remaining new lines
      diff.push({
        type: "added",
        content: newLine,
        newLineNumber: newLineNum++,
      });
      newIndex++;
    } else {
      // Safety break
      break;
    }
  }

  return diff;
}

function computeLCS(a: string[], b: string[]): string[] {
  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array(m + 1)
    .fill(null)
    .map(() => Array(n + 1).fill(0));

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (a[i - 1] === b[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j] ?? 0, dp[i][j - 1] ?? 0);
      }
    }
  }

  // Reconstruct LCS
  const lcs: string[] = [];
  let i = m;
  let j = n;
  while (i > 0 && j > 0) {
    const aVal = a[i - 1];
    const bVal = b[j - 1];
    if (aVal !== undefined && bVal !== undefined && aVal === bVal) {
      lcs.unshift(aVal);
      i--;
      j--;
    } else if ((dp[i - 1][j] ?? 0) > (dp[i][j - 1] ?? 0)) {
      i--;
    } else {
      j--;
    }
  }

  return lcs;
}

function computeStats(diff: DiffLine[]) {
  return {
    additions: diff.filter((l) => l.type === "added").length,
    deletions: diff.filter((l) => l.type === "removed").length,
    unchanged: diff.filter((l) => l.type === "unchanged").length,
  };
}
