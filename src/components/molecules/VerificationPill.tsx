"use client";

import React, { useEffect, useState } from "react";
import { ModelBadge } from "../atoms/ModelBadge";
import styles from "./VerificationPill.module.css";

interface VerificationPillProps {
  className?: string;
}

/**
 * VerificationPill - Molecule component
 * Health check chip linked to /api/verify-model
 */
export const VerificationPill: React.FC<VerificationPillProps> = ({
  className = "",
}) => {
  const [status, setStatus] = useState<"checking" | "verified" | "failed">(
    "checking",
  );
  const [engineName, setEngineName] = useState("");

  useEffect(() => {
    const checkModel = async () => {
      try {
        const response = await fetch("/api/verify-model");
        if (response.ok) {
          const data = await response.json();
          setEngineName(data.engineName || "Unknown");
          setStatus(data.verified ? "verified" : "failed");
        } else {
          setStatus("failed");
        }
      } catch {
        setStatus("failed");
      }
    };

    checkModel();
    const interval = setInterval(checkModel, 30000); // Check every 30s

    return () => clearInterval(interval);
  }, []);

  const statusConfig = {
    checking: { label: "Verifying...", verified: false },
    verified: { label: "Verified", verified: true },
    failed: { label: "Failed", verified: false },
  };

  const config = statusConfig[status];

  return (
    <div className={`${styles["container"]} ${styles[status]} ${className}`}>
      <ModelBadge
        engineName={engineName || "Checking..."}
        verified={status === "verified"}
      />
      <span className={styles["statusText"]}>{config.label}</span>
    </div>
  );
};

VerificationPill.displayName = "VerificationPill";
