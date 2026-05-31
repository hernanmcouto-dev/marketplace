import React, { useState } from "react";
import { useCart } from "@/lib/CartContext";

interface Product {
  sku: string;
  name: string;
  unit_price: number;
  units_per_package?: number;
  image_url?: string;
}

interface ProductModalProps {
  product: Product | null;
  onClose: () => void;
}

export default function ProductModal({ product, onClose }: ProductModalProps) {
  const [quantity, setQuantity] = useState(1);
  const { addToCart } = useCart();

  if (!product) return null;

  const handleAddToCart = () => {
    addToCart(product, quantity);
    setQuantity(1);
    onClose();
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(0,0,0,0.5)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 50,
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: "white",
          borderRadius: "0.5rem",
          padding: "2rem",
          maxWidth: "500px",
          width: "90%",
          boxShadow: "0 10px 25px rgba(0,0,0,0.2)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          style={{
            position: "absolute",
            top: "1rem",
            right: "1rem",
            backgroundColor: "#ef4444",
            color: "white",
            border: "none",
            width: "2rem",
            height: "2rem",
            borderRadius: "50%",
            cursor: "pointer",
            fontSize: "1.25rem",
          }}
        >
          ✕
        </button>

        {/* Image */}
        <div
          style={{
            width: "100%",
            height: "250px",
            backgroundColor: "#f3f4f6",
            borderRadius: "0.375rem",
            marginBottom: "1.5rem",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            overflow: "hidden",
          }}
        >
          {product.image_url ? (
            <img
              src={product.image_url}
              alt={product.name}
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = "none";
              }}
            />
          ) : (
            <span style={{ fontSize: "3rem" }}>📦</span>
          )}
        </div>

        {/* Product Info */}
        <h2 style={{ fontSize: "1.5rem", marginBottom: "0.5rem", color: "#1f2937" }}>
          {product.name}
        </h2>
        <p style={{ color: "#6b7280", fontSize: "0.875rem", marginBottom: "1rem" }}>
          SKU: {product.sku}
        </p>

        <div style={{ marginBottom: "1.5rem" }}>
          <p style={{ color: "#6b7280", fontSize: "0.875rem", marginBottom: "0.25rem" }}>
            Precio unitario:
          </p>
          <p style={{ fontSize: "1.75rem", color: "#10b981", fontWeight: "bold" }}>
            ${product.unit_price.toLocaleString("es-AR")}
          </p>
        </div>

        {product.units_per_package && (
          <p style={{ color: "#6b7280", fontSize: "0.875rem", marginBottom: "1rem" }}>
            Unidades por paquete: {product.units_per_package}
          </p>
        )}

        {/* Quantity Selector */}
        <div style={{ marginBottom: "1.5rem" }}>
          <p style={{ color: "#6b7280", fontSize: "0.875rem", marginBottom: "0.5rem" }}>
            Cantidad:
          </p>
          <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
            <button
              onClick={() => setQuantity(Math.max(1, quantity - 1))}
              style={{
                padding: "0.5rem 0.75rem",
                backgroundColor: "#f3f4f6",
                border: "1px solid #d1d5db",
                borderRadius: "0.375rem",
                cursor: "pointer",
              }}
            >
              −
            </button>
            <input
              type="number"
              min="1"
              value={quantity}
              onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
              style={{
                width: "60px",
                padding: "0.5rem",
                border: "1px solid #d1d5db",
                borderRadius: "0.375rem",
                textAlign: "center",
              }}
            />
            <button
              onClick={() => setQuantity(quantity + 1)}
              style={{
                padding: "0.5rem 0.75rem",
                backgroundColor: "#f3f4f6",
                border: "1px solid #d1d5db",
                borderRadius: "0.375rem",
                cursor: "pointer",
              }}
            >
              +
            </button>
          </div>
        </div>

        {/* Subtotal */}
        <div
          style={{
            padding: "1rem",
            backgroundColor: "#f3f4f6",
            borderRadius: "0.375rem",
            marginBottom: "1.5rem",
          }}
        >
          <p style={{ color: "#6b7280", fontSize: "0.875rem", marginBottom: "0.25rem" }}>
            Subtotal:
          </p>
          <p style={{ fontSize: "1.5rem", color: "#1f2937", fontWeight: "bold" }}>
            ${(product.unit_price * quantity).toLocaleString("es-AR")}
          </p>
        </div>

        {/* Add to Cart Button */}
        <button
          onClick={handleAddToCart}
          style={{
            width: "100%",
            padding: "0.75rem 1rem",
            backgroundColor: "#3b82f6",
            color: "white",
            border: "none",
            borderRadius: "0.375rem",
            cursor: "pointer",
            fontSize: "1rem",
            fontWeight: "bold",
          }}
        >
          Agregar al carrito
        </button>
      </div>
    </div>
  );
}
