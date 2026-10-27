"use client";

import React from "react";

export interface ProductCardProps {
  title?: string;
  price?: number;
  category?: string;
  description?: string;
  inStock?: boolean;
}

export const ProductCard: React.FC<ProductCardProps> = ({
  title = "Wireless Noise-Canceling Headphones",
  price = 249.99,
  category = "Audio Equipment",
  description = "Premium acoustic architecture with dynamic drivers, active spatial audio, and 30-hour battery life.",
  inStock = true,
}) => {
  return (
    <div
      style={{
        borderRadius: "16px",
        padding: "24px",
        background: "rgba(18, 21, 30, 0.94)",
        border: "1px solid rgba(255, 255, 255, 0.1)",
        color: "#f3f4f6",
        maxWidth: "420px",
        boxShadow: "0 20px 40px rgba(0, 0, 0, 0.5)",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "16px",
        }}
      >
        <span
          style={{
            fontSize: "11px",
            fontWeight: 600,
            textTransform: "uppercase",
            letterSpacing: "0.08em",
            color: "#38bdf8",
          }}
        >
          {category}
        </span>
        <span
          style={{
            padding: "4px 10px",
            borderRadius: "9999px",
            fontSize: "11px",
            fontWeight: 600,
            background: inStock ? "rgba(16, 185, 129, 0.15)" : "rgba(239, 68, 68, 0.15)",
            color: inStock ? "#34d399" : "#f87171",
            border: inStock ? "1px solid rgba(16, 185, 129, 0.3)" : "1px solid rgba(239, 68, 68, 0.3)",
          }}
        >
          {inStock ? "In Stock" : "Out of Stock"}
        </span>
      </div>

      <h3 style={{ fontSize: "20px", fontWeight: 700, margin: "0 0 8px 0" }}>
        {title}
      </h3>

      <p style={{ fontSize: "13px", color: "#94a3b8", lineHeight: 1.5, margin: "0 0 20px 0" }}>
        {description}
      </p>

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          paddingTop: "16px",
          borderTop: "1px solid rgba(255, 255, 255, 0.08)",
        }}
      >
        <div>
          <span style={{ fontSize: "11px", color: "#64748b", display: "block" }}>Price</span>
          <span style={{ fontSize: "22px", fontWeight: 700, color: "#ffffff" }}>
            ${price.toFixed(2)}
          </span>
        </div>

        <button
          style={{
            padding: "10px 20px",
            borderRadius: "8px",
            background: "#3b82f6",
            color: "#ffffff",
            border: "none",
            fontWeight: 600,
            cursor: "pointer",
            fontSize: "13px",
          }}
        >
          Add to Cart
        </button>
      </div>
    </div>
  );
};

export default ProductCard;
