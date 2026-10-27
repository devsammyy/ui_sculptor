"use client";

import React from "react";

export interface DashboardHeroProps {
  title?: string;
  monthlyRevenue?: number;
  activeCohorts?: number;
  conversionRate?: number;
  isDarkMode?: boolean;
  hasExtraButton?: boolean;
  hasExpandedGrid?: boolean;
  isAnimated?: boolean;
  isHighContrast?: boolean;
  onDeploy?: () => void;
  onAuditLog?: () => void;
}

export const DashboardHero: React.FC<DashboardHeroProps> = ({
  title = "Mode & Revenue Analytics",
  monthlyRevenue = 148250,
  activeCohorts = 48290,
  conversionRate = 5.84,
  isDarkMode = true,
  hasExtraButton = true,
  hasExpandedGrid = false,
  isAnimated = false,
  isHighContrast = false,
  onDeploy,
  onAuditLog,
}) => {
  return (
    <div
      className={`dashboard-hero ${isDarkMode ? "dark" : "light"} ${
        isHighContrast ? "high-contrast" : ""
      } ${isAnimated ? "animated" : ""}`}
      style={{
        borderRadius: "16px",
        padding: "24px",
        background: isDarkMode ? "rgba(18, 21, 30, 0.94)" : "#ffffff",
        border: isHighContrast
          ? "2px solid #ffffff"
          : "1px solid rgba(255, 255, 255, 0.1)",
        color: isDarkMode ? "#f3f4f6" : "#0f172a",
      }}
    >
      <header
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "20px",
        }}
      >
        <div>
          <span
            style={{
              fontSize: "11px",
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              color: "#3b82f6",
            }}
          >
            Enterprise Cohorts
          </span>
          <h2 style={{ fontSize: "18px", fontWeight: 700, margin: "4px 0 0 0" }}>
            {title}
          </h2>
        </div>
      </header>

      <div
        className="metrics-grid"
        style={{
          display: "grid",
          gridTemplateColumns: hasExpandedGrid
            ? "repeat(4, 1fr)"
            : "repeat(3, 1fr)",
          gap: "12px",
          marginBottom: "20px",
        }}
      >
        <div
          className="metric-card"
          style={{
            background: "rgba(255, 255, 255, 0.03)",
            border: "1px solid rgba(255, 255, 255, 0.07)",
            borderRadius: "12px",
            padding: "14px",
          }}
        >
          <span style={{ fontSize: "12px", color: "#94a3b8" }}>
            Net Recurring ARR
          </span>
          <div
            style={{
              fontSize: "20px",
              fontWeight: 700,
              margin: "6px 0",
              display: "flex",
              alignItems: "center",
              gap: "8px",
            }}
          >
            <span>${monthlyRevenue.toLocaleString()}</span>
            <span
              style={{
                fontSize: "11px",
                fontWeight: 600,
                color: "#10b981",
                background: "rgba(16, 185, 129, 0.1)",
                padding: "2px 6px",
                borderRadius: "4px",
              }}
            >
              +24.8%
            </span>
          </div>
        </div>

        <div
          className="metric-card"
          style={{
            background: "rgba(255, 255, 255, 0.03)",
            border: "1px solid rgba(255, 255, 255, 0.07)",
            borderRadius: "12px",
            padding: "14px",
          }}
        >
          <span style={{ fontSize: "12px", color: "#94a3b8" }}>
            Active Cohorts
          </span>
          <div
            style={{
              fontSize: "20px",
              fontWeight: 700,
              margin: "6px 0",
              display: "flex",
              alignItems: "center",
              gap: "8px",
            }}
          >
            <span>{activeCohorts.toLocaleString()}</span>
            <span
              style={{
                fontSize: "11px",
                fontWeight: 600,
                color: "#10b981",
                background: "rgba(16, 185, 129, 0.1)",
                padding: "2px 6px",
                borderRadius: "4px",
              }}
            >
              +14.2%
            </span>
          </div>
        </div>

        <div
          className="metric-card"
          style={{
            background: "rgba(255, 255, 255, 0.03)",
            border: "1px solid rgba(255, 255, 255, 0.07)",
            borderRadius: "12px",
            padding: "14px",
          }}
        >
          <span style={{ fontSize: "12px", color: "#94a3b8" }}>
            Conversion Rate
          </span>
          <div
            style={{
              fontSize: "20px",
              fontWeight: 700,
              margin: "6px 0",
              display: "flex",
              alignItems: "center",
              gap: "8px",
            }}
          >
            <span>{conversionRate}%</span>
            <span
              style={{
                fontSize: "11px",
                fontWeight: 600,
                color: "#10b981",
                background: "rgba(16, 185, 129, 0.1)",
                padding: "2px 6px",
                borderRadius: "4px",
              }}
            >
              +1.8%
            </span>
          </div>
        </div>

        {hasExpandedGrid && (
          <div
            className="metric-card"
            style={{
              background: "rgba(255, 255, 255, 0.03)",
              border: "1px solid rgba(255, 255, 255, 0.07)",
              borderRadius: "12px",
              padding: "14px",
            }}
          >
            <span style={{ fontSize: "12px", color: "#94a3b8" }}>
              Customer LTV
            </span>
            <div
              style={{
                fontSize: "20px",
                fontWeight: 700,
                margin: "6px 0",
                display: "flex",
                alignItems: "center",
                gap: "8px",
              }}
            >
              <span>$12,840</span>
              <span
                style={{
                  fontSize: "11px",
                  fontWeight: 600,
                  color: "#10b981",
                  background: "rgba(16, 185, 129, 0.1)",
                  padding: "2px 6px",
                  borderRadius: "4px",
                }}
              >
                +31.5%
              </span>
            </div>
          </div>
        )}
      </div>

      <footer
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          paddingTop: "12px",
          borderTop: "1px solid rgba(255, 255, 255, 0.06)",
        }}
      >
        <span style={{ fontSize: "12px", color: "#94a3b8" }}>
          Trusted by 4,200+ engineering teams
        </span>
        <div style={{ display: "flex", gap: "8px" }}>
          {hasExtraButton && (
            <button
              type="button"
              onClick={onAuditLog}
              className="secondary-btn"
              aria-label="View audit log"
              style={{
                padding: "0.5rem 1rem",
                borderRadius: "0.5rem",
                background: "rgba(255, 255, 255, 0.06)",
                border: "1px solid rgba(255, 255, 255, 0.12)",
                color: "#f3f4f6",
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: "0.5rem",
                fontWeight: 500,
              }}
            >
              <svg
                aria-hidden="true"
                focusable="false"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" y1="13" x2="8" y2="13" />
                <line x1="16" y1="17" x2="8" y2="17" />
                <line x1="10" y1="9" x2="8" y2="9" />
              </svg>
              <span>Audit Log</span>
            </button>
          )}
          <button
            onClick={onDeploy}
            className="primary-btn"
            style={{
              padding: "8px 16px",
              borderRadius: "8px",
              background: "#3b82f6",
              color: "#ffffff",
              border: "none",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Deploy Changes →
          </button>
        </div>
      </footer>
    </div>
  );
};

export default DashboardHero;