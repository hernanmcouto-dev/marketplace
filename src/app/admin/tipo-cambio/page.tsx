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
    const loadSuppliers = async () => {
      try {
        const response = await fetch("/api/suppliers/exchange-rate");
        const data = await response.json();
        if (data.suppliers) {
          setSuppliers(data.suppliers);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    loadSuppliers();
  }, []);

  const handleUpdate = async (supplierId: string, newRate: number) => {
    try {
      const response = await fetch("/api/suppliers/exchange-rate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ supplierId, exchange_rate: newRate }),
      });

      if (response.ok) {
        setMessage("Exchange rate actualizado correctamente");
        setTimeout(() => setMessage(""), 3000);
        setSuppliers(
          suppliers.map((s) =>
            s.id === supplierId ? { ...s, exchange_rate: newRate } : s
          )
        );
      }
    } catch (err) {
      setMessage("Error al actualizar");
      console.error(err);
    }
  };

  if (loading) return <div className="p-8">Cargando...</div>;

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-2">Tipo de Cambio</h1>
      <p className="text-gray-600 mb-8">Gestiona los tipos de cambio para proveedores con precios en USD</p>

      {message && (
        <div className="mb-4 p-4 bg-blue-100 text-blue-800 rounded">
          {message}
        </div>
      )}

      <div className="space-y-4">
        {suppliers.map((supplier) => (
          <div key={supplier.id} className="bg-white p-6 rounded border">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold">{supplier.name}</h3>
                <p className="text-sm text-gray-500">ID: {supplier.id}</p>
              </div>
              <div className="flex items-center gap-4">
                <input
                  type="number"
                  value={supplier.exchange_rate}
                  onChange={(e) =>
                    handleUpdate(supplier.id, parseFloat(e.target.value))
                  }
                  onBlur={(e) =>
                    handleUpdate(supplier.id, parseFloat(e.target.value))
                  }
                  className="w-32 px-3 py-2 border rounded font-mono text-right"
                />
                <span className="text-sm text-gray-500 w-20">{supplier.currency}/ARS</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {suppliers.length === 0 && (
        <div className="text-center p-8 text-gray-500">
          No hay proveedores configurados
        </div>
      )}
    </div>
  );
}
