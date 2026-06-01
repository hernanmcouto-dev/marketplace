"use client";

import Link from "next/link";
import { useState, useEffect } from "react";

export default function ImpoteknoPanel() {
  const [products, setProducts] = useState([]);
  const [margin, setMargin] = useState(1.0);
  const [activeTab, setActiveTab] = useState("list");
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [editingProduct, setEditingProduct] = useState(null);
  const [logs, setLogs] = useState([]);

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    try {
      const response = await fetch("/products.json");
      const data = await response.json();
      setProducts(data);
    } catch (error) {
      addLog("Error cargando productos", "error");
    }
  };

  const addLog = (message, type = "log") => {
    setLogs((p) => [...p, { message, type, time: new Date().toLocaleTimeString() }]);
  };

  const handleScrape = async () => {
    setLoading(true);
    setLogs([]);
    addLog("Iniciando scraping de Impotekno...");

    try {
      const response = await fetch("/api/scrape-impotekno", { method: "POST" });
      if (!response.body) throw new Error("Sin respuesta");

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split("\n");

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            try {
              const msg = JSON.parse(line.slice(6));
              if (msg.message) addLog(msg.message);
            } catch (e) {}
          }
        }
      }

      addLog("✅ Scraping completado", "complete");
      loadProducts();
    } catch (err) {
      addLog(`Error: ${err.message}`, "error");
    } finally {
      setLoading(false);
    }
  };

  const updateMargin = (productId, newMargin) => {
    setProducts((p) =>
      p.map((prod) =>
        prod.sku === productId
          ? { ...prod, unit_price: Math.round(prod.unit_price * newMargin) }
          : prod
      )
    );
    addLog(`Margen actualizado para ${productId}`);
  };

  const filteredProducts = products.filter(
    (p) =>
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.sku.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const Tabs = {
    list: (
      <div>
        <h2 style={{ marginBottom: "1.5rem" }}>📋 Productos</h2>
        <div style={{ marginBottom: "1rem" }}>
          <input
            type="text"
            placeholder="Buscar por nombre o SKU..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              width: "100%",
              padding: "0.75rem",
              backgroundColor: "#1e293b",
              border: "1px solid #334155",
              borderRadius: "0.5rem",
              color: "white",
            }}
          />
        </div>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: "2px solid #334155" }}>
                <th style={{ padding: "1rem", textAlign: "left" }}>SKU</th>
                <th style={{ padding: "1rem", textAlign: "left" }}>Nombre</th>
                <th style={{ padding: "1rem", textAlign: "right" }}>Precio</th>
                <th style={{ padding: "1rem", textAlign: "center" }}>Margen</th>
                <th style={{ padding: "1rem", textAlign: "center" }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filteredProducts.slice(0, 20).map((product) => (
                <tr key={product.sku} style={{ borderBottom: "1px solid #334155" }}>
                  <td style={{ padding: "1rem" }}>{product.sku}</td>
                  <td style={{ padding: "1rem", maxWidth: "300px", overflow: "hidden" }}>
                    {product.name.substring(0, 50)}...
                  </td>
                  <td style={{ padding: "1rem", textAlign: "right" }}>${product.unit_price}</td>
                  <td style={{ padding: "1rem", textAlign: "center" }}>
                    <select
                      defaultValue="1.0"
                      onChange={(e) => updateMargin(product.sku, parseFloat(e.target.value))}
                      style={{
                        padding: "0.5rem",
                        backgroundColor: "#334155",
                        color: "white",
                        border: "1px solid #3b82f6",
                        borderRadius: "0.25rem",
                      }}
                    >
                      <option value="0.9">-10%</option>
                      <option value="1.0">0%</option>
                      <option value="1.1">+10%</option>
                      <option value="1.2">+20%</option>
                      <option value="1.5">+50%</option>
                    </select>
                  </td>
                  <td style={{ padding: "1rem", textAlign: "center" }}>
                    <button
                      onClick={() => setEditingProduct(product)}
                      style={{
                        padding: "0.5rem 1rem",
                        backgroundColor: "#3b82f6",
                        color: "white",
                        border: "none",
                        borderRadius: "0.25rem",
                        cursor: "pointer",
                      }}
                    >
                      Editar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p style={{ marginTop: "1rem", color: "#94a3b8", fontSize: "0.875rem" }}>
          Mostrando 20 de {filteredProducts.length} productos
        </p>
      </div>
    ),
    scrape: (
      <div>
        <h2 style={{ marginBottom: "1.5rem" }}>🕷️ Ejecutar Scraper</h2>
        <button
          onClick={handleScrape}
          disabled={loading}
          style={{
            padding: "1rem 2rem",
            backgroundColor: loading ? "#666" : "#ef4444",
            color: "white",
            border: "none",
            borderRadius: "0.5rem",
            cursor: loading ? "not-allowed" : "pointer",
            fontSize: "1rem",
            fontWeight: "bold",
            marginBottom: "2rem",
          }}
        >
          {loading ? "⏳ Scrapeando..." : "🚀 Iniciar Scraper"}
        </button>

        <div
          style={{
            backgroundColor: "#1e293b",
            padding: "1rem",
            borderRadius: "0.5rem",
            maxHeight: "400px",
            overflowY: "auto",
          }}
        >
          {logs.map((log, i) => (
            <div key={i} style={{ fontSize: "0.875rem", color: "#cbd5e1", marginBottom: "0.5rem" }}>
              <span style={{ color: "#94a3b8" }}>[{log.time}]</span> {log.message}
            </div>
          ))}
        </div>
      </div>
    ),
    margin: (
      <div>
        <h2 style={{ marginBottom: "1.5rem" }}>💰 Ajustar Margen Global</h2>
        <div style={{ backgroundColor: "#1e293b", padding: "2rem", borderRadius: "0.5rem", maxWidth: "500px" }}>
          <label style={{ display: "block", marginBottom: "1rem" }}>
            Multiplicador de precio:
            <input
              type="number"
              min="0.5"
              max="3"
              step="0.1"
              defaultValue="1.0"
              onChange={(e) => setMargin(parseFloat(e.target.value))}
              style={{
                marginTop: "0.5rem",
                width: "100%",
                padding: "0.75rem",
                backgroundColor: "#334155",
                color: "white",
                border: "1px solid #3b82f6",
                borderRadius: "0.25rem",
              }}
            />
          </label>
          <p style={{ color: "#94a3b8", fontSize: "0.875rem", marginBottom: "1rem" }}>
            1.0 = sin cambio | 1.2 = +20% | 0.8 = -20%
          </p>
          <button
            onClick={() => {
              setProducts((p) =>
                p.map((prod) => ({ ...prod, unit_price: Math.round(prod.unit_price * margin) }))
              );
              addLog(`Margen global aplicado: ${(margin * 100).toFixed(0)}%`);
            }}
            style={{
              width: "100%",
              padding: "0.75rem",
              backgroundColor: "#f59e0b",
              color: "white",
              border: "none",
              borderRadius: "0.5rem",
              cursor: "pointer",
              fontWeight: "bold",
            }}
          >
            Aplicar a Todos
          </button>
        </div>
      </div>
    ),
    import: (
      <div>
        <h2 style={{ marginBottom: "1.5rem" }}>📤 Importar desde CSV</h2>
        <div style={{ backgroundColor: "#1e293b", padding: "2rem", borderRadius: "0.5rem", maxWidth: "500px" }}>
          <input
            type="file"
            accept=".csv"
            style={{
              display: "block",
              marginBottom: "1rem",
              padding: "1rem",
              backgroundColor: "#334155",
              border: "2px dashed #3b82f6",
              borderRadius: "0.5rem",
              color: "white",
            }}
          />
          <p style={{ color: "#94a3b8", fontSize: "0.875rem", marginBottom: "1rem" }}>
            Formato esperado: SKU, Nombre, Precio
          </p>
          <button
            onClick={() => addLog("Importación: Funcionalidad en desarrollo")}
            style={{
              width: "100%",
              padding: "0.75rem",
              backgroundColor: "#8b5cf6",
              color: "white",
              border: "none",
              borderRadius: "0.5rem",
              cursor: "pointer",
              fontWeight: "bold",
            }}
          >
            Subir CSV
          </button>
        </div>
      </div>
    ),
  };

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#0f172a", color: "white" }}>
      <header style={{ background: "linear-gradient(135deg, #3b82f680 0%, #0f172a 100%)", borderBottom: "2px solid #3b82f6", padding: "2rem 1rem" }}>
        <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
          <Link href="/admin" style={{ textDecoration: "none", color: "white" }}>
            <div style={{ fontSize: "0.875rem", color: "#94a3b8", marginBottom: "0.5rem", cursor: "pointer" }}>
              ← Volver
            </div>
          </Link>
          <h1 style={{ margin: 0, fontSize: "2rem", fontWeight: "bold" }}>📱 Impotekno</h1>
          <p style={{ margin: "0.5rem 0 0 0", color: "#94a3b8" }}>{products.length} productos</p>
        </div>
      </header>

      <main style={{ maxWidth: "1200px", margin: "0 auto", padding: "2rem 1rem" }}>
        <div style={{ display: "flex", gap: "1rem", marginBottom: "2rem", overflowX: "auto" }}>
          {[
            { key: "list", label: "📋 Productos", icon: "📋" },
            { key: "scrape", label: "🕷️ Scraper", icon: "🕷️" },
            { key: "margin", label: "💰 Margen", icon: "💰" },
            { key: "import", label: "📤 Importar", icon: "📤" },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              style={{
                padding: "0.75rem 1.5rem",
                backgroundColor: activeTab === tab.key ? "#3b82f6" : "#1e293b",
                border: `2px solid ${activeTab === tab.key ? "#3b82f6" : "#334155"}`,
                borderRadius: "0.5rem",
                color: "white",
                cursor: "pointer",
                fontWeight: activeTab === tab.key ? "bold" : "normal",
                whiteSpace: "nowrap",
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {Tabs[activeTab] || Tabs.list}
      </main>
    </div>
  );
}
