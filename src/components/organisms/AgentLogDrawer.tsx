"use client";

import React, { useEffect, useRef } from "react";
import styles from "./AgentLogDrawer.module.css";

interface LogEntry {
  step: string;
  timestamp: number;
  status: "success" | "pending" | "error";
  metadata?: Record<string, unknown>;
}

interface AgentLogDrawerProps {
  logs: LogEntry[];
  isOpen: boolean;
  onClose: () => void;
  className?: string;
}

/**
 * AgentLogDrawer - Organism component
 * Terminal view streaming the autonomous reasoning chain
 */
export const AgentLogDrawer: React.FC<AgentLogDrawerProps> = ({
  logs,
  isOpen,
  onClose,
  className = "",
}) => {
  const logContainerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new logs arrive
  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [logs]);

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString("en-US", {
      hour12: false,
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      fractionalSecondDigits: 3,
    });
  };

  const getStatusIcon = (status: LogEntry["status"]) => {
    switch (status) {
      case "success":
        return (
          <svg
            viewBox="0 0 16 16"
            fill="currentColor"
            width="14"
            height="14"
            className={styles["statusIcon"]}
          >
            <path d="M13.78 4.22a.75.75 0 0 1 0 1.06l-7.25 7.25a.75.75 0 0 1-1.06 0L2.22 9.28a.75.75 0 0 1 1.06-1.06L6 10.94l6.72-6.72a.75.75 0 0 1 1.06 0Z" />
          </svg>
        );
      case "pending":
        return (
          <svg
            viewBox="0 0 16 16"
            fill="currentColor"
            width="14"
            height="14"
            className={`${styles["statusIcon"]} ${styles["pending"]}`}
          >
            <circle cx="8" cy="8" r="6" />
          </svg>
        );
      case "error":
        return (
          <svg
            viewBox="0 0 16 16"
            fill="currentColor"
            width="14"
            height="14"
            className={styles["statusIcon"]}
          >
            <path d="M8 1.5a6.5 6.5 0 1 0 0 13 6.5 6.5 0 0 0 0-13ZM8 4a.75.75 0 0 1 .75.75v4.5a.75.75 0 0 1-1.5 0v-4.5A.75.75 0 0 1 8 4Zm0 10a1 1 0 1 1 0-2 1 1 0 0 1 0 2Z" />
          </svg>
        );
    }
  };

  const getStatusColor = (status: LogEntry["status"]) => {
    switch (status) {
      case "success":
        return "var(--color-success, #10B981)";
      case "pending":
        return "var(--color-primary, #0066CC)";
      case "error":
        return "var(--color-error, #EF4444)";
    }
  };

  return (
    <div
      className={`${styles["drawer"]} ${isOpen ? styles["open"] : ""} ${className}`}
      role="dialog"
      aria-label="Agent execution log"
    >
      <div className={styles["header"]}>
        <h3 className={styles["title"]}>Agent Log</h3>
        <button
          className={styles["closeButton"]}
          onClick={onClose}
          aria-label="Close log drawer"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            width="18"
            height="18"
          >
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div
        className={styles["logContainer"]}
        ref={logContainerRef}
        role="log"
        aria-live="polite"
      >
        {logs.length === 0 ? (
          <div className={styles["emptyState"]}>
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              width="32"
              height="32"
            >
              <path d="M9 12h6M9 16h6M9 8h6" />
            </svg>
            <p>
              No logs yet. Start a sculpt operation to see the agent's reasoning
              chain.
            </p>
          </div>
        ) : (
          logs.map((log, index) => (
            <div key={index} className={styles["logEntry"]}>
              <div className={styles["logMain"]}>
                <span className={styles["timestamp"]}>
                  {formatTime(log.timestamp)}
                </span>
                {getStatusIcon(log.status)}
                <span
                  className={styles["step"]}
                  style={{ color: getStatusColor(log.status) }}
                >
                  {log.step}
                </span>
              </div>
              {log.metadata && (
                <details className={styles["metadata"]}>
                  <summary>Details</summary>
                  <pre className={styles.metadataContent}>
                    {JSON.stringify(log.metadata, null, 2)}
                  </pre>
                </details>
              )}
            </div>
          ))
        )}
      </div>

      <div className={styles["footer"]}>
        <span className={styles["logCount"]}>
          {logs.length} entr{logs.length === 1 ? "y" : "ies"}
        </span>
        <button className={styles.clearButton} onClick={() => {}} disabled>
          Clear
        </button>
      </div>
    </div>
  );
};

AgentLogDrawer.displayName = "AgentLogDrawer";
