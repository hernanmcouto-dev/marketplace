import React from "react";
import { useCart } from "@/lib/CartContext";

interface CartPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function CartPanel({ isOpen, onClose }: CartPanelProps) {
  const { items, removeFromCart, updateQuantity, total } = useCart();

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(0,0,0,0.5)",
        zIndex: 40,
      }}
      onClick={onClose}
    >
      <div
        style={{
          position: "fixed",
          right: 0,
          top: 0,
          bottom: 0,
          width: "100%",
          maxWidth: "400px",
          backgroundColor: "white",
          boxShadow: "-10px 0 25px rgba(0,0,0,0.2)",
          display: "flex",
          flexDirection: "column",
          zIndex: 50,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            backgroundColor: "#3b82f6",
            color: "white",
            padding: "1rem",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <h2 style={{ margin: 0, fontSize: "1.25rem" }}>🛒 Carrito</h2>
          <button
            onClick={onClose}
            style={{
              backgroundColor: "#1e40af",
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
        </div>

        {/* Items List */}
        <div
          style={{
            flex: 1,
            overflowY: "auto",
            padding: "1rem",
          }}
        >
          {items.length === 0 ? (
            <div style={{ textAlign: "center", color: "#6b7280", padding: "2rem 0" }}>
              <p style={{ margin: 0, fontSize: "3rem" }}>🛒</p>
              <p style={{ margin: "0.5rem 0 0 0" }}>El carrito está vacío</p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              {items.map((item) => (
                <div
                  key={item.sku}
                  style={{
                    padding: "1rem",
                    border: "1px solid #e5e7eb",
                    borderRadius: "0.375rem",
                  }}
                >
                  {/* Product Info */}
                  <div style={{ marginBottom: "0.75rem" }}>
                    <p style={{ margin: "0 0 0.25rem 0", fontWeight: "600", fontSize: "0.95rem" }}>
                      {item.name}
                    </p>
                    <p style={{ margin: 0, color: "#6b7280", fontSize: "0.75rem" }}>
                      SKU: {item.sku}
                    </p>
                  </div>

                  {/* Price */}
                  <p
                    style={{
                      margin: "0.5rem 0",
                      color: "#10b981",
                      fontWeight: "bold",
                      fontSize: "1rem",
                    }}
                  >
                    ${item.unit_price.toLocaleString("es-AR")}
                  </p>

                  {/* Quantity Controls */}
                  <div
                    style={{
                      display: "flex",
                      gap: "0.5rem",
                      alignItems: "center",
                      marginBottom: "0.75rem",
                    }}
                  >
                    <span style={{ color: "#6b7280", fontSize: "0.875rem" }}>Cantidad:</span>
                    <button
                      onClick={() => updateQuantity(item.sku, item.quantity - 1)}
                      style={{
                        padding: "0.25rem 0.5rem",
                        backgroundColor: "#f3f4f6",
                        border: "1px solid #d1d5db",
                        borderRadius: "0.25rem",
                        cursor: "pointer",
                        fontSize: "0.875rem",
                      }}
                    >
                      −
                    </button>
                    <span style={{ fontWeight: "600", minWidth: "2rem", textAlign: "center" }}>
                      {item.quantity}
                    </span>
                    <button
                      onClick={() => updateQuantity(item.sku, item.quantity + 1)}
                      style={{
                        padding: "0.25rem 0.5rem",
                        backgroundColor: "#f3f4f6",
                        border: "1px solid #d1d5db",
                        borderRadius: "0.25rem",
                        cursor: "pointer",
                        fontSize: "0.875rem",
                      }}
                    >
                      +
                    </button>
                  </div>

                  {/* Subtotal */}
                  <div
                    style={{
                      padding: "0.5rem",
                      backgroundColor: "#f3f4f6",
                      borderRadius: "0.25rem",
                      marginBottom: "0.75rem",
                    }}
                  >
                    <p style={{ margin: 0, fontSize: "0.75rem", color: "#6b7280" }}>Subtotal:</p>
                    <p style={{ margin: 0, fontWeight: "bold", color: "#1f2937" }}>
                      ${(item.unit_price * item.quantity).toLocaleString("es-AR")}
                    </p>
                  </div>

                  {/* Remove Button */}
                  <button
                    onClick={() => removeFromCart(item.sku)}
                    style={{
                      width: "100%",
                      padding: "0.5rem",
                      backgroundColor: "#fee2e2",
                      color: "#991b1b",
                      border: "1px solid #fecaca",
                      borderRadius: "0.375rem",
                      cursor: "pointer",
                      fontSize: "0.875rem",
                      fontWeight: "500",
                    }}
                  >
                    🗑️ Remover
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        {items.length > 0 && (
          <div
            style={{
              borderTop: "1px solid #e5e7eb",
              padding: "1rem",
              display: "flex",
              flexDirection: "column",
              gap: "0.75rem",
            }}
          >
            {/* Total */}
            <div
              style={{
                backgroundColor: "#f3f4f6",
                padding: "1rem",
                borderRadius: "0.375rem",
              }}
            >
              <p style={{ margin: 0, color: "#6b7280", fontSize: "0.875rem" }}>Total:</p>
              <p style={{ margin: "0.25rem 0 0 0", fontSize: "1.5rem", fontWeight: "bold" }}>
                ${total.toLocaleString("es-AR")}
              </p>
            </div>

            {/* Buttons */}
            <button
              onClick={onClose}
              style={{
                width: "100%",
                padding: "0.75rem 1rem",
                backgroundColor: "#e5e7eb",
                color: "#1f2937",
                border: "none",
                borderRadius: "0.375rem",
                cursor: "pointer",
                fontWeight: "500",
              }}
            >
              Continuar comprando
            </button>

            <button
              style={{
                width: "100%",
                padding: "0.75rem 1rem",
                backgroundColor: "#10b981",
                color: "white",
                border: "none",
                borderRadius: "0.375rem",
                cursor: "pointer",
                fontWeight: "bold",
                fontSize: "1rem",
              }}
            >
              Proceder al checkout
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
