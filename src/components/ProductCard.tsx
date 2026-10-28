export interface ProductCardProps {
  name?: string;
  description?: string;
  price?: number;
  imageUrl?: string;
  imageAlt?: string;
  rating?: number;
  onAddToCart?: () => void;
}

export const ProductCard = ({
  name = "Wireless Headphones",
  description = "High-quality sound with comfortable, all-day wear and intuitive controls.",
  price = 49.99,
  imageUrl,
  imageAlt,
  rating = 4.8,
  onAddToCart,
}: ProductCardProps) => {
  return (
    <article
      style={{
        backgroundColor: "#FF0000",
        border: "1px solid #E5E7EB",
        borderRadius: "1rem",
        boxSizing: "border-box",
        color: "#111827",
        display: "flex",
        flexDirection: "column",
        fontFamily: "Inter, system-ui, sans-serif",
        overflow: "hidden",
        width: "100%",
      }}
    >
      {imageUrl ? (
        <img
          src={imageUrl}
          alt={imageAlt ?? name}
          style={{
            aspectRatio: "4 / 3",
            backgroundColor: "#F9FAFB",
            display: "block",
            objectFit: "cover",
            width: "100%",
          }}
        />
      ) : (
        <div
          role="img"
          aria-label={imageAlt ?? name}
          style={{
            alignItems: "center",
            aspectRatio: "4 / 3",
            backgroundColor: "#FF0000",
            color: "#6B7280",
            display: "flex",
            fontSize: "1rem",
            justifyContent: "center",
            width: "100%",
          }}
        >
          Product Image
        </div>
      )}

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "0.5rem",
          padding: "1.5rem",
        }}
      >
        <h3
          style={{
            fontSize: "1.125rem",
            margin: 0,
          }}
        >
          {name}
        </h3>

        <p
          style={{
            color: "#6B7280",
            fontSize: "1rem",
            margin: 0,
          }}
        >
          {description}
        </p>

        <div
          aria-label={`Rated ${rating} out of 5`}
          style={{ color: "#6B7280", fontSize: "1rem" }}
        >
          ★ {rating.toFixed(1)}
        </div>

        <div
          style={{
            alignItems: "center",
            display: "flex",
            gap: "1rem",
            justifyContent: "space-between",
            marginTop: "1rem",
          }}
        >
          <span style={{ fontSize: "1.5rem" }}>${price.toFixed(2)}</span>

          <button
            type="button"
            onClick={onAddToCart}
            style={{
              backgroundColor: "#0066CC",
              border: "1px solid #0066CC",
              borderRadius: "0.5rem",
              color: "#FFFFFF",
              cursor: "pointer",
              fontFamily: "Inter, system-ui, sans-serif",
              fontSize: "1rem",
              padding: "0.5rem 1rem",
              whiteSpace: "nowrap",
            }}
          >
            Add to Cart
          </button>
        </div>
      </div>
    </article>
  );
};