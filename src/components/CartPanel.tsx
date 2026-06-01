import React from "react";
import { useCart } from "@/lib/CartContext";

interface CartPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onFilterBySupplier?: (supplier: string) => void;
}

const SUPPLIER_INFO: Record<string, { name: string; color: string; minOrder: number }> = {
  impotekno: { name: "Depósito Azul", color: "#1E40AF", minOrder: 150000 },
  sanjulian: { name: "Depósito Verde", color: "#16A34A", minOrder: 100000 },
  nodo: { name: "Depósito Amarillo", color: "#D97706", minOrder: 50000 },
  nextcell: { name: "Depósito Rojo", color: "#DC2626", minOrder: 150000 },
};

export default function CartPanel({ isOpen, onClose, onFilterBySupplier }: CartPanelProps) {
  const { items, removeFromCart, updateQuantity, total } = useCart();

  if (!isOpen) return null;

  // Agrupar items por depósito
  const itemsBySupplier = items.reduce(
    (acc, item) => {
      const supplier = item.supplier || "impotekno";
      if (!acc[supplier]) acc[supplier] = [];
      acc[supplier].push(item);
      return acc;
    },
    {} as Record<string, typeof items>
  );

  // Calcular subtotales y estado por depósito
  const depositoStates = Object.entries(itemsBySupplier).map(([supplier, supplierItems]) => {
    const info = SUPPLIER_INFO[supplier];
    const subtotal = supplierItems.reduce((sum, item) => sum + item.unit_price * item.quantity, 0);
    const isReady = subtotal >= info.minOrder;
    const remaining = Math.max(0, info.minOrder - subtotal);

    return {
      supplier,
      info,
      items: supplierItems,
      subtotal,
      isReady,
      remaining,
      progress: Math.min((subtotal / info.minOrder) * 100, 100),
    };
  });

  const readyDeposits = depositoStates.filter((d) => d.isReady);
  const pendingDeposits = depositoStates.filter((d) => !d.isReady);
  const totalReadyAmount = readyDeposits.reduce((sum, d) => sum + d.subtotal, 0);

  const handleCheckoutDeposit = (supplier: string) => {
    // Implementar lógica de checkout individual
    console.log(`Checkout para ${supplier}`);
    // TODO: Redirigir a checkout con solo los items de este depósito
  };

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
          maxWidth: "1000px",
          backgroundColor: "white",
          boxShadow: "-10px 0 25px rgba(0,0,0,0.2)",
          display: "flex",
          flexDirection: "row",
          zIndex: 50,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* ========== PANEL IZQUIERDO: DEPÓSITOS ========== */}
        <div
          style={{
            flex: 0.6,
            display: "flex",
            flexDirection: "column",
            borderRight: "1px solid #E5E7EB",
            overflow: "hidden",
          }}
        >
          {/* Header */}
          <div
            style={{
              backgroundColor: "#1F2937",
              color: "white",
              padding: "1.25rem",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <div>
              <h2 style={{ margin: 0, fontSize: "1.3rem", fontWeight: "700" }}>MI CARRITO</h2>
              <p style={{ margin: "0.25rem 0 0 0", fontSize: "0.85rem", color: "#D1D5DB" }}>
                {items.length} producto{items.length !== 1 ? "s" : ""}
              </p>
            </div>
            <button
              onClick={onClose}
              style={{
                backgroundColor: "#374151",
                color: "white",
                border: "none",
                width: "2.5rem",
                height: "2.5rem",
                borderRadius: "50%",
                cursor: "pointer",
                fontSize: "1.5rem",
                fontWeight: "bold",
              }}
            >
              ✕
            </button>
          </div>

          {/* Contenido */}
          {items.length === 0 ? (
            <div
              style={{
                flex: 1,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexDirection: "column",
                color: "#6B7280",
              }}
            >
              <p style={{ fontSize: "3rem", margin: 0 }}>🛒</p>
              <p style={{ fontSize: "1rem", marginTop: "0.5rem" }}>El carrito está vacío</p>
            </div>
          ) : (
            <div style={{ flex: 1, overflowY: "auto", padding: "1rem" }}>
              {depositoStates.map((deposito) => (
                <div
                  key={deposito.supplier}
                  style={{
                    marginBottom: "1.5rem",
                    padding: "1.2rem",
                    backgroundColor: `${deposito.info.color}08`,
                    border: `2px solid ${deposito.info.color}`,
                    borderRadius: "0.75rem",
                  }}
                >
                  {/* Encabezado de Depósito - Nuevo Diseño */}
                  <div
                    style={{
                      marginBottom: "1rem",
                      paddingBottom: "1rem",
                      borderBottom: `2px solid ${deposito.info.color}40`,
                    }}
                  >
                    <h3 style={{ margin: "0 0 0.5rem 0", fontSize: "1rem", fontWeight: "700", color: "#1F2937" }}>
                      {deposito.info.name} - Mínimo de compra ${deposito.info.minOrder.toLocaleString("es-AR")}
                    </h3>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}
                    >
                      <p style={{ margin: 0, fontSize: "1.1rem", fontWeight: "700", color: "#1F2937" }}>
                        ${deposito.subtotal.toLocaleString("es-AR")}
                      </p>
                      <div style={{ fontSize: "1.2rem" }}>
                        {deposito.isReady ? (
                          <span style={{ color: "#22C55E" }}>✅</span>
                        ) : (
                          <span style={{ color: "#DC2626" }}>❌</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Productos */}
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", marginBottom: "1rem" }}>
                    {deposito.items.map((item) => (
                      <div
                        key={item.sku}
                        style={{
                          padding: "0.75rem",
                          backgroundColor: "#F9FAFB",
                          border: `1px solid ${deposito.info.color}20`,
                          borderRadius: "0.375rem",
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "start",
                            marginBottom: "0.5rem",
                          }}
                        >
                          <div style={{ flex: 1 }}>
                            <p style={{ margin: 0, fontWeight: "600", fontSize: "0.85rem", color: "#1F2937" }}>
                              {item.name}
                            </p>
                            <p style={{ margin: "0.1rem 0 0 0", fontSize: "0.75rem", color: "#6B7280" }}>
                              {item.sku}
                            </p>
                          </div>
                          <p style={{ margin: 0, fontWeight: "700", color: deposito.info.color, fontSize: "0.9rem" }}>
                            ${item.unit_price.toLocaleString("es-AR")}
                          </p>
                        </div>

                        <div
                          style={{
                            display: "flex",
                            gap: "0.3rem",
                            alignItems: "center",
                            marginBottom: "0.5rem",
                          }}
                        >
                          <button
                            onClick={() => updateQuantity(item.sku, Math.max(0, item.quantity - 1))}
                            style={{
                              padding: "0.2rem 0.35rem",
                              backgroundColor: deposito.info.color,
                              color: "white",
                              border: "none",
                              borderRadius: "0.2rem",
                              cursor: "pointer",
                              fontSize: "0.7rem",
                              fontWeight: "bold",
                            }}
                          >
                            −
                          </button>
                          <span style={{ fontWeight: "600", minWidth: "1.2rem", textAlign: "center", fontSize: "0.8rem" }}>
                            {item.quantity}
                          </span>
                          <button
                            onClick={() => updateQuantity(item.sku, item.quantity + 1)}
                            style={{
                              padding: "0.2rem 0.35rem",
                              backgroundColor: deposito.info.color,
                              color: "white",
                              border: "none",
                              borderRadius: "0.2rem",
                              cursor: "pointer",
                              fontSize: "0.7rem",
                              fontWeight: "bold",
                            }}
                          >
                            +
                          </button>
                          <span style={{ marginLeft: "auto", fontWeight: "700", color: "#1F2937", fontSize: "0.8rem" }}>
                            ${(item.unit_price * item.quantity).toLocaleString("es-AR")}
                          </span>
                        </div>

                        <button
                          onClick={() => removeFromCart(item.sku)}
                          style={{
                            width: "100%",
                            padding: "0.3rem",
                            backgroundColor: "#FEE2E2",
                            color: "#991B1B",
                            border: "none",
                            borderRadius: "0.25rem",
                            cursor: "pointer",
                            fontSize: "0.7rem",
                            fontWeight: "500",
                          }}
                        >
                          🗑️ Remover
                        </button>
                      </div>
                    ))}
                  </div>

                  {/* Acciones de Depósito */}
                  <div style={{ display: "flex", gap: "0.5rem" }}>
                    <button
                      onClick={() => {
                        onFilterBySupplier?.(deposito.supplier);
                        onClose();
                      }}
                      style={{
                        flex: 1,
                        padding: "0.75rem",
                        backgroundColor: deposito.info.color,
                        color: "white",
                        border: "none",
                        borderRadius: "0.375rem",
                        cursor: "pointer",
                        fontWeight: "700",
                        fontSize: "0.9rem",
                      }}
                    >
                      ➕ Continuar en {deposito.info.name.split(" ")[1]}
                    </button>
                    {deposito.isReady && (
                      <button
                        onClick={() => handleCheckoutDeposit(deposito.supplier)}
                        style={{
                          flex: 1,
                          padding: "0.6rem",
                          backgroundColor: deposito.info.color,
                          color: "white",
                          border: "none",
                          borderRadius: "0.375rem",
                          cursor: "pointer",
                          fontWeight: "700",
                          fontSize: "0.8rem",
                        }}
                      >
                        FINALIZAR ✅
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ========== PANEL DERECHO: RESUMEN ========== */}
        {items.length > 0 && (
          <div
            style={{
              flex: 0.4,
              display: "flex",
              flexDirection: "column",
              backgroundColor: "#F9FAFB",
              padding: "1.5rem",
              overflowY: "auto",
            }}
          >
            {/* Depósitos Listos */}
            <div style={{ marginBottom: "2rem" }}>
              <h3 style={{ margin: "0 0 1rem 0", fontSize: "0.95rem", fontWeight: "700", color: "#1F2937" }}>
                ✅ DEPÓSITOS LISTOS ({readyDeposits.length})
              </h3>

              {readyDeposits.length === 0 ? (
                <p style={{ margin: 0, fontSize: "0.85rem", color: "#6B7280", fontStyle: "italic" }}>
                  Ningún depósito alcanzó el mínimo
                </p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                  {readyDeposits.map((deposito) => (
                    <div
                      key={deposito.supplier}
                      style={{
                        padding: "0.75rem",
                        backgroundColor: "white",
                        border: `2px solid ${deposito.info.color}`,
                        borderRadius: "0.375rem",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                        }}
                      >
                        <p style={{ margin: 0, fontSize: "0.85rem", fontWeight: "600", color: "#1F2937" }}>
                          {deposito.info.name}
                        </p>
                        <p
                          style={{
                            margin: 0,
                            fontSize: "0.9rem",
                            fontWeight: "700",
                            color: deposito.info.color,
                          }}
                        >
                          ${deposito.subtotal.toLocaleString("es-AR")}
                        </p>
                      </div>
                    </div>
                  ))}

                  <div
                    style={{
                      padding: "1rem",
                      backgroundColor: "#DCFCE7",
                      border: "2px solid #22C55E",
                      borderRadius: "0.375rem",
                      marginTop: "0.5rem",
                    }}
                  >
                    <p style={{ margin: "0 0 0.5rem 0", fontSize: "0.8rem", color: "#15803D" }}>
                      MONTO TOTAL LISTO
                    </p>
                    <p
                      style={{
                        margin: 0,
                        fontSize: "1.5rem",
                        fontWeight: "900",
                        color: "#15803D",
                      }}
                    >
                      ${totalReadyAmount.toLocaleString("es-AR")}
                    </p>
                  </div>

                  <button
                    style={{
                      width: "100%",
                      padding: "0.85rem",
                      backgroundColor: "#22C55E",
                      color: "white",
                      border: "none",
                      borderRadius: "0.375rem",
                      cursor: "pointer",
                      fontWeight: "700",
                      fontSize: "0.95rem",
                      marginTop: "1rem",
                    }}
                  >
                    ENVIAR PEDIDO ({readyDeposits.length}) ✅
                  </button>
                </div>
              )}
            </div>

            {/* Depósitos Pendientes */}
            {pendingDeposits.length > 0 && (
              <div>
                <h3 style={{ margin: "0 0 1rem 0", fontSize: "0.95rem", fontWeight: "700", color: "#6B7280" }}>
                  ⏳ DEPÓSITOS PENDIENTES ({pendingDeposits.length})
                </h3>

                <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                  {pendingDeposits.map((deposito) => (
                    <div
                      key={deposito.supplier}
                      style={{
                        padding: "0.75rem",
                        backgroundColor: "#F3F4F6",
                        border: "1px solid #D1D5DB",
                        borderRadius: "0.375rem",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          marginBottom: "0.4rem",
                        }}
                      >
                        <p style={{ margin: 0, fontSize: "0.85rem", fontWeight: "600", color: "#6B7280" }}>
                          {deposito.info.name}
                        </p>
                        <p
                          style={{
                            margin: 0,
                            fontSize: "0.75rem",
                            fontWeight: "700",
                            color: "#F97316",
                          }}
                        >
                          Faltan ${deposito.remaining.toLocaleString("es-AR")}
                        </p>
                      </div>
                      <div
                        style={{
                          fontSize: "0.75rem",
                          color: "#6B7280",
                        }}
                      >
                        ${deposito.subtotal.toLocaleString("es-AR")} / ${deposito.info.minOrder.toLocaleString("es-AR")}
                      </div>
                    </div>
                  ))}
                </div>

                <p
                  style={{
                    margin: "1rem 0 0 0",
                    fontSize: "0.75rem",
                    color: "#6B7280",
                    fontStyle: "italic",
                    lineHeight: "1.4",
                  }}
                >
                  📌 <strong>Estos productos no se perderán.</strong> Se guardarán automáticamente en tu carrito para tu próxima compra.
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
