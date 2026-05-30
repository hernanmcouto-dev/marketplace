"use client";

import { useState, useEffect } from "react";

interface Supplier {
  id: string;
  name: string;
  exchange_rate: number;
  currency: string;
}

export default function TipoCambioPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  useEffect(() => {
    loadSuppliers();
  }, []);

  const loadSuppliers = async () => {
    try {
      const response = await fetch("/api/suppliers/exchange-rate", {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      });
      const data = await response.json();
      if (data.suppliers) {
        setSuppliers(data.suppliers);
      }
      setLoading(false);
    } catch (err) {
      console.error("Error loading suppliers:", err);
      setLoading(false);
    }
  };

  const handleUpdate = async (supplierId: string, newRate: number) => {
    try {
      const response = await fetch("/api/suppliers/exchange-rate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ supplierId, exchange_rate: newRate }),
      });

      if (response.ok) {
        const result = await response.json();
        setMessage("Tipo de cambio actualizado");
        setTimeout(() => setMessage(""), 2000);
        await loadSuppliers();
      } else {
        setMessage("Error al actualizar");
      }
    } catch (err) {
      setMessage("Error al actualizar");
      console.error(err);
    }
  };

  return (
    <div style={{ padding: "2rem", maxWidth: "56rem", margin: "0 auto" }}>
      <h1 style={{ fontSize: "1.875rem", fontWeight: "bold", marginBottom: "0.5rem" }}>
        Tipo de Cambio
      </h1>
      <p style={{ color: "#4b5563", marginBottom: "2rem" }}>
        Gestiona los tipos de cambio para proveedores
      </p>

      {message && (
        <div style={{ marginBottom: "1rem", padding: "1rem", backgroundColor: "#dbeafe", color: "#1e40af", borderRadius: "0.375rem" }}>
          {message}
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: "center", padding: "2rem", color: "#9ca3af" }}>
          Cargando proveedores...
        </div>
      ) : suppliers.length === 0 ? (
        <div style={{ textAlign: "center", padding: "2rem", color: "#9ca3af" }}>
          No hay proveedores configurados
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          {suppliers.map((supplier) => (
            <div
              key={supplier.id}
              style={{
                backgroundColor: "white",
                padding: "1.5rem",
                borderRadius: "0.375rem",
                border: "1px solid #e5e7eb",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div>
                  <h3 style={{ fontSize: "1.125rem", fontWeight: "600", margin: "0 0 0.25rem 0" }}>
                    {supplier.name}
                  </h3>
                  <p style={{ fontSize: "0.875rem", color: "#6b7280", margin: 0 }}>
                    {supplier.currency} → ARS
                  </p>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                  <input
                    type="number"
                    value={supplier.exchange_rate}
                    onChange={(e) => {
                      const newVal = parseFloat(e.target.value);
                      if (!isNaN(newVal)) {
                        handleUpdate(supplier.id, newVal);
                      }
                    }}
                    style={{
                      width: "8rem",
                      padding: "0.5rem",
                      border: "1px solid #d1d5db",
                      borderRadius: "0.375rem",
                      fontFamily: "monospace",
                      textAlign: "right",
                    }}
                  />
                  <span style={{ fontSize: "0.875rem", color: "#6b7280", width: "5rem" }}>
                    {supplier.exchange_rate.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
