"use client";

import React from "react";

export interface AnalyticsCardProps {
  title?: string;
  count?: number;
  delta?: string;
  isPositive?: boolean;
}

export const AnalyticsCard: React.FC<AnalyticsCardProps> = ({
  title = "Active Users",
  count = 12480,
  delta = "+8.2%",
  isPositive = true,
}) => {
  return (
    <div
      style={{
        padding: "20px",
        borderRadius: "12px",
        background: "rgba(255, 255, 255, 0.05)",
        border: "1px solid rgba(255, 255, 255, 0.1)",
        color: "#ffffff",
      }}
    >
      <h4 style={{ margin: "0 0 8px 0", fontSize: "14px", color: "#9ca3af" }}>
        {title}
      </h4>
      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
        <span style={{ fontSize: "24px", fontWeight: "bold" }}>
          {count.toLocaleString()}
        </span>
        <span
          style={{
            fontSize: "12px",
            color: isPositive ? "#10b981" : "#ef4444",
            padding: "2px 6px",
            background: isPositive
              ? "rgba(16, 185, 129, 0.1)"
              : "rgba(239, 68, 68, 0.1)",
            borderRadius: "4px",
          }}
        >
          {delta}
        </span>
      </div>
    </div>
  );
};

export default AnalyticsCard;
