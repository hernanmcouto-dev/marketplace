"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function ImportProductosPage() {
  const router = useRouter();
  const [jsonInput, setJsonInput] = useState("");
  const [provider, setProvider] = useState("San Julián");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const handleImport = async () => {
    if (!jsonInput.trim()) {
      setMessage("❌ Pega JSON válido");
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      const products = JSON.parse(jsonInput);

      if (!Array.isArray(products)) {
        setMessage("❌ El JSON debe ser un array de productos");
        setLoading(false);
        return;
      }

      const response = await fetch("/api/import/productos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ products, provider }),
      });

      const data = await response.json();

      if (response.ok) {
        setMessage(`✅ ${data.message}`);
        setJsonInput("");
        setTimeout(() => router.push("/admin/productos"), 2000);
      } else {
        setMessage(`❌ ${data.error}`);
      }
    } catch (err: any) {
      setMessage(`❌ JSON inválido: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      {/* Header */}
      <nav
        style={{
          backgroundColor: "#ef4444",
          color: "white",
          padding: "1rem",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <h1 style={{ margin: 0, fontSize: "1.5rem" }}>🔐 Admin</h1>
        <Link href="/admin" style={{ textDecoration: "none" }}>
          <button
            style={{
              backgroundColor: "#dc2626",
              color: "white",
              border: "none",
              padding: "0.5rem 1rem",
              borderRadius: "0.375rem",
              cursor: "pointer",
            }}
          >
            Volver
          </button>
        </Link>
      </nav>

      {/* Main Content */}
      <main style={{ flex: 1, padding: "2rem", maxWidth: "80rem", margin: "0 auto", width: "100%" }}>
        <h2 style={{ fontSize: "1.875rem", marginBottom: "1rem" }}>📥 Importar Productos</h2>

        {message && (
          <div
            style={{
              marginBottom: "1rem",
              padding: "0.75rem",
              backgroundColor: message.startsWith("✅") ? "#d1fae5" : "#fee2e2",
              color: message.startsWith("✅") ? "#065f46" : "#991b1b",
              borderRadius: "0.375rem",
            }}
          >
            {message}
          </div>
        )}

        <div style={{ backgroundColor: "white", border: "1px solid #e5e7eb", borderRadius: "0.5rem", padding: "1.5rem", marginBottom: "2rem" }}>
          <div style={{ marginBottom: "1.5rem" }}>
            <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: "500" }}>
              Proveedor
            </label>
            <select
              value={provider}
              onChange={(e) => setProvider(e.target.value)}
              style={{
                width: "100%",
                padding: "0.75rem",
                border: "1px solid #d1d5db",
                borderRadius: "0.375rem",
                fontSize: "1rem",
              }}
            >
              <option>Impotekno</option>
              <option>San Julián</option>
              <option>NextCell</option>
            </select>
          </div>

          <div style={{ marginBottom: "1.5rem" }}>
            <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: "500" }}>
              JSON de Productos
            </label>
            <textarea
              value={jsonInput}
              onChange={(e) => setJsonInput(e.target.value)}
              placeholder={`[\n  {\n    "sku": "PAS-001",\n    "name": "Producto Ejemplo",\n    "unit_price": 9999,\n    "units_per_package": 10,\n    "image_url": "https://example.com/image.jpg"\n  }\n]`}
              style={{
                width: "100%",
                height: "400px",
                padding: "1rem",
                border: "1px solid #d1d5db",
                borderRadius: "0.375rem",
                fontFamily: "monospace",
                fontSize: "0.875rem",
              }}
            />
          </div>

          <button
            onClick={handleImport}
            disabled={loading || !jsonInput.trim()}
            style={{
              padding: "0.75rem 1.5rem",
              backgroundColor: loading || !jsonInput.trim() ? "#9ca3af" : "#10b981",
              color: "white",
              border: "none",
              borderRadius: "0.375rem",
              cursor: loading || !jsonInput.trim() ? "not-allowed" : "pointer",
              fontWeight: "bold",
              fontSize: "1rem",
            }}
          >
            {loading ? "⏳ Importando..." : "▶️ Importar Productos"}
          </button>
        </div>

        {/* Help */}
        <div
          style={{
            padding: "1rem",
            backgroundColor: "#f0fdf4",
            border: "1px solid #86efac",
            borderRadius: "0.5rem",
            color: "#166534",
          }}
        >
          <p style={{ margin: "0 0 0.5rem 0", fontWeight: "bold" }}>ℹ️ Cómo usar:</p>
          <ol style={{ margin: "0.5rem 0 0 1.5rem" }}>
            <li>Selecciona el proveedor</li>
            <li>Pega un array JSON de productos con estructura: sku, name, unit_price, units_per_package (opcional), image_url (opcional)</li>
            <li>Haz clic en "Importar Productos"</li>
            <li>Se guardará en el archivo correspondiente (reemplaza productos anteriores del proveedor)</li>
          </ol>

          <p style={{ margin: "1rem 0 0.5rem 0", fontWeight: "bold" }}>📋 Estructura requerida:</p>
          <pre
            style={{
              backgroundColor: "#ffffff",
              padding: "1rem",
              borderRadius: "0.375rem",
              overflow: "auto",
              fontSize: "0.85rem",
            }}
          >
            {`[
  {
    "sku": "PAS-001",
    "name": "Nombre del Producto",
    "unit_price": 9999,
    "units_per_package": 10,
    "image_url": "https://example.com/image.jpg"
  }
]`}
          </pre>
        </div>
      </main>
    </div>
  );
}
