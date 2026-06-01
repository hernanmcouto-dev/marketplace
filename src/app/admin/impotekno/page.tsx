"use client";

import Link from "next/link";
import { useState, useEffect } from "react";

export default function ImpoteknoPanel() {
  const [products, setProducts] = useState([]);
  const [activeTab, setActiveTab] = useState("list");
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [editingProduct, setEditingProduct] = useState(null);
  const [editPrice, setEditPrice] = useState("");
  const [logs, setLogs] = useState([]);
  const [showAnalysisDetails, setShowAnalysisDetails] = useState(null);

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

  const saveProductPrice = async () => {
    if (!editingProduct || !editPrice) return;

    const newPrice = parseInt(editPrice);
    if (isNaN(newPrice)) {
      addLog("Precio inválido", "error");
      return;
    }

    try {
      const updatedProducts = products.map((p) =>
        p.sku === editingProduct.sku ? { ...p, unit_price: newPrice } : p
      );

      const response = await fetch("/api/update-products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ products: updatedProducts, supplier: "impotekno" }),
      });

      if (response.ok) {
        setProducts(updatedProducts);
        addLog(`✅ Precio actualizado: ${editingProduct.sku} → $${newPrice}`);
        setEditingProduct(null);
        setEditPrice("");
      }
    } catch (error) {
      addLog(`Error guardando: ${error.message}`, "error");
    }
  };

  const filteredProducts = products.filter(
    (p) =>
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.sku.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const generateAnalytics = () => {
    if (products.length === 0) return null;

    // Estadísticas básicas
    const prices = products.map((p) => p.unit_price);
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    const avgPrice = Math.round(prices.reduce((a, b) => a + b, 0) / prices.length);

    // Distribución por categoría
    const categoryCount = {};
    const uncategorized = [];
    products.forEach((p) => {
      const cat = p.category || "Sin categorizar";
      if (cat === "Sin categorizar") {
        uncategorized.push(p);
      } else {
        categoryCount[cat] = (categoryCount[cat] || 0) + 1;
      }
    });

    // Rango de precios por categoría
    const categoryPrices = {};
    products.forEach((p) => {
      const cat = p.category || "Sin categorizar";
      if (!categoryPrices[cat]) {
        categoryPrices[cat] = [];
      }
      categoryPrices[cat].push(p.unit_price);
    });

    const categoryStats = Object.entries(categoryPrices).map(([cat, prices]) => ({
      category: cat,
      count: prices.length,
      minPrice: Math.min(...prices),
      maxPrice: Math.max(...prices),
      avgPrice: Math.round(prices.reduce((a, b) => a + b, 0) / prices.length),
    }));

    return {
      totalProducts: products.length,
      minPrice,
      maxPrice,
      avgPrice,
      categories: Object.entries(categoryCount).length,
      uncategorizedCount: uncategorized.length,
      uncategorizedProducts: uncategorized,
      categoryStats: categoryStats.sort((a, b) => b.count - a.count),
    };
  };

  const analytics = generateAnalytics();

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
        {/* Tabs */}
        <div style={{ display: "flex", gap: "1rem", marginBottom: "2rem", overflowX: "auto" }}>
          {[
            { key: "list", label: "📋 Productos" },
            { key: "analysis", label: "📊 Análisis" },
            { key: "scrape", label: "🕷️ Scraper" },
            { key: "import", label: "📤 Importar" },
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

        {/* Lista de Productos */}
        {activeTab === "list" && (
          <div>
            <h2 style={{ marginBottom: "1.5rem" }}>📋 Productos</h2>
            <input
              type="text"
              placeholder="Buscar por nombre o SKU..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                width: "100%",
                padding: "0.75rem",
                marginBottom: "1rem",
                backgroundColor: "#1e293b",
                border: "1px solid #334155",
                borderRadius: "0.5rem",
                color: "white",
              }}
            />
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ borderBottom: "2px solid #334155" }}>
                    <th style={{ padding: "1rem", textAlign: "left" }}>SKU</th>
                    <th style={{ padding: "1rem", textAlign: "left" }}>Nombre</th>
                    <th style={{ padding: "1rem", textAlign: "right" }}>Precio</th>
                    <th style={{ padding: "1rem", textAlign: "center" }}>Editar</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredProducts.slice(0, 50).map((product) => (
                    <tr key={product.sku} style={{ borderBottom: "1px solid #334155" }}>
                      <td style={{ padding: "1rem" }}>{product.sku}</td>
                      <td style={{ padding: "1rem", maxWidth: "300px" }}>
                        {product.name.substring(0, 40)}...
                      </td>
                      <td style={{ padding: "1rem", textAlign: "right" }}>${product.unit_price}</td>
                      <td style={{ padding: "1rem", textAlign: "center" }}>
                        <button
                          onClick={() => {
                            setEditingProduct(product);
                            setEditPrice(product.unit_price.toString());
                          }}
                          style={{
                            padding: "0.5rem 1rem",
                            backgroundColor: "#3b82f6",
                            color: "white",
                            border: "none",
                            borderRadius: "0.25rem",
                            cursor: "pointer",
                          }}
                        >
                          ✏️ Editar
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p style={{ marginTop: "1rem", color: "#94a3b8", fontSize: "0.875rem" }}>
              Mostrando 50 de {filteredProducts.length} productos
            </p>
          </div>
        )}

        {/* Análisis */}
        {activeTab === "analysis" && analytics && (
          <div>
            <h2 style={{ marginBottom: "2rem" }}>📊 Análisis de Base de Datos</h2>

            {/* Resumen General */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1rem", marginBottom: "2rem" }}>
              <div style={{ backgroundColor: "#1e293b", padding: "1.5rem", borderRadius: "0.5rem", borderLeft: "4px solid #3b82f6" }}>
                <div style={{ fontSize: "0.875rem", color: "#94a3b8", marginBottom: "0.5rem" }}>Total Productos</div>
                <div style={{ fontSize: "2rem", fontWeight: "bold", color: "#3b82f6" }}>
                  {analytics.totalProducts.toLocaleString()}
                </div>
              </div>
              <div style={{ backgroundColor: "#1e293b", padding: "1.5rem", borderRadius: "0.5rem", borderLeft: "4px solid #10b981" }}>
                <div style={{ fontSize: "0.875rem", color: "#94a3b8", marginBottom: "0.5rem" }}>Categorías</div>
                <div style={{ fontSize: "2rem", fontWeight: "bold", color: "#10b981" }}>
                  {analytics.categories}
                </div>
              </div>
              <div style={{ backgroundColor: "#1e293b", padding: "1.5rem", borderRadius: "0.5rem", borderLeft: "4px solid #f59e0b" }}>
                <div style={{ fontSize: "0.875rem", color: "#94a3b8", marginBottom: "0.5rem" }}>Precio Promedio</div>
                <div style={{ fontSize: "2rem", fontWeight: "bold", color: "#f59e0b" }}>
                  ${analytics.avgPrice.toLocaleString()}
                </div>
              </div>
              <div style={{ backgroundColor: "#1e293b", padding: "1.5rem", borderRadius: "0.5rem", borderLeft: "4px solid #ef4444" }}>
                <div style={{ fontSize: "0.875rem", color: "#94a3b8", marginBottom: "0.5rem" }}>Sin Categorizar</div>
                <div style={{ fontSize: "2rem", fontWeight: "bold", color: "#ef4444" }}>
                  {analytics.uncategorizedCount}
                </div>
              </div>
            </div>

            {/* Rango de Precios */}
            <div style={{ backgroundColor: "#1e293b", padding: "1.5rem", borderRadius: "0.5rem", marginBottom: "2rem" }}>
              <h3 style={{ margin: "0 0 1rem 0" }}>💰 Rango de Precios</h3>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "1rem" }}>
                <div>
                  <div style={{ fontSize: "0.875rem", color: "#94a3b8", marginBottom: "0.5rem" }}>Mínimo</div>
                  <div style={{ fontSize: "1.5rem", fontWeight: "bold", color: "#cbd5e1" }}>
                    ${analytics.minPrice.toLocaleString()}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: "0.875rem", color: "#94a3b8", marginBottom: "0.5rem" }}>Promedio</div>
                  <div style={{ fontSize: "1.5rem", fontWeight: "bold", color: "#cbd5e1" }}>
                    ${analytics.avgPrice.toLocaleString()}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: "0.875rem", color: "#94a3b8", marginBottom: "0.5rem" }}>Máximo</div>
                  <div style={{ fontSize: "1.5rem", fontWeight: "bold", color: "#cbd5e1" }}>
                    ${analytics.maxPrice.toLocaleString()}
                  </div>
                </div>
              </div>
            </div>

            {/* Distribución por Categoría */}
            <div style={{ backgroundColor: "#1e293b", padding: "1.5rem", borderRadius: "0.5rem", marginBottom: "2rem" }}>
              <h3 style={{ margin: "0 0 1rem 0" }}>📂 Distribución por Categoría</h3>
              <div style={{ maxHeight: "500px", overflowY: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ borderBottom: "1px solid #334155" }}>
                      <th style={{ padding: "0.75rem", textAlign: "left", fontSize: "0.875rem" }}>Categoría</th>
                      <th style={{ padding: "0.75rem", textAlign: "right", fontSize: "0.875rem" }}>Cantidad</th>
                      <th style={{ padding: "0.75rem", textAlign: "right", fontSize: "0.875rem" }}>Min - Max</th>
                      <th style={{ padding: "0.75rem", textAlign: "right", fontSize: "0.875rem" }}>Promedio</th>
                    </tr>
                  </thead>
                  <tbody>
                    {analytics.categoryStats.map((stat) => (
                      <tr key={stat.category} style={{ borderBottom: "1px solid #334155" }}>
                        <td style={{ padding: "0.75rem" }}>{stat.category}</td>
                        <td style={{ padding: "0.75rem", textAlign: "right", color: "#3b82f6", fontWeight: "bold" }}>
                          {stat.count}
                        </td>
                        <td style={{ padding: "0.75rem", textAlign: "right", fontSize: "0.875rem", color: "#94a3b8" }}>
                          ${stat.minPrice.toLocaleString()} - ${stat.maxPrice.toLocaleString()}
                        </td>
                        <td style={{ padding: "0.75rem", textAlign: "right", color: "#10b981", fontWeight: "bold" }}>
                          ${stat.avgPrice.toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Productos Sin Categorizar */}
            {analytics.uncategorizedCount > 0 && (
              <div style={{ backgroundColor: "#1e293b", padding: "1.5rem", borderRadius: "0.5rem", borderLeft: "4px solid #ef4444" }}>
                <button
                  onClick={() => setShowAnalysisDetails(showAnalysisDetails === "uncategorized" ? null : "uncategorized")}
                  style={{
                    width: "100%",
                    padding: "1rem",
                    backgroundColor: "#334155",
                    color: "#ef4444",
                    border: "1px solid #ef4444",
                    borderRadius: "0.5rem",
                    cursor: "pointer",
                    fontWeight: "bold",
                    marginBottom: "1rem",
                  }}
                >
                  ⚠️ Ver {analytics.uncategorizedCount} Productos Sin Categorizar
                </button>

                {showAnalysisDetails === "uncategorized" && (
                  <div style={{ backgroundColor: "#0f172a", padding: "1rem", borderRadius: "0.5rem", maxHeight: "400px", overflowY: "auto" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.875rem" }}>
                      <thead>
                        <tr style={{ borderBottom: "1px solid #334155" }}>
                          <th style={{ padding: "0.5rem", textAlign: "left" }}>SKU</th>
                          <th style={{ padding: "0.5rem", textAlign: "left" }}>Nombre</th>
                          <th style={{ padding: "0.5rem", textAlign: "right" }}>Precio</th>
                        </tr>
                      </thead>
                      <tbody>
                        {analytics.uncategorizedProducts.map((p) => (
                          <tr key={p.sku} style={{ borderBottom: "1px solid #334155" }}>
                            <td style={{ padding: "0.5rem" }}>{p.sku}</td>
                            <td style={{ padding: "0.5rem", maxWidth: "200px", overflow: "hidden" }}>
                              {p.name.substring(0, 30)}...
                            </td>
                            <td style={{ padding: "0.5rem", textAlign: "right" }}>${p.unit_price}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Scraper */}
        {activeTab === "scrape" && (
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
            <div style={{ backgroundColor: "#1e293b", padding: "1rem", borderRadius: "0.5rem", maxHeight: "400px", overflowY: "auto" }}>
              {logs.map((log, i) => (
                <div key={i} style={{ fontSize: "0.875rem", color: "#cbd5e1", marginBottom: "0.5rem" }}>
                  <span style={{ color: "#94a3b8" }}>[{log.time}]</span> {log.message}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Importar CSV */}
        {activeTab === "import" && (
          <div>
            <h2 style={{ marginBottom: "1.5rem" }}>📤 Importar desde CSV</h2>
            <div style={{ backgroundColor: "#1e293b", padding: "2rem", borderRadius: "0.5rem", maxWidth: "500px" }}>
              <input type="file" accept=".csv" style={{ marginBottom: "1rem", display: "block", width: "100%", padding: "1rem", backgroundColor: "#334155", border: "2px dashed #3b82f6", borderRadius: "0.5rem", color: "white" }} />
              <p style={{ color: "#94a3b8", fontSize: "0.875rem", marginBottom: "1rem" }}>Formato: SKU, Nombre, Precio</p>
              <button style={{ width: "100%", padding: "0.75rem", backgroundColor: "#8b5cf6", color: "white", border: "none", borderRadius: "0.5rem", cursor: "pointer", fontWeight: "bold" }}>
                Subir CSV
              </button>
            </div>
          </div>
        )}

        {/* Modal de Edición */}
        {editingProduct && (
          <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
            <div style={{ backgroundColor: "#1e293b", padding: "2rem", borderRadius: "1rem", maxWidth: "500px", width: "90%" }}>
              <h3 style={{ margin: "0 0 1rem 0", fontSize: "1.5rem" }}>✏️ Editar Precio</h3>
              <p style={{ color: "#cbd5e1", marginBottom: "1rem" }}>
                <strong>{editingProduct.name}</strong>
              </p>
              <p style={{ color: "#94a3b8", fontSize: "0.875rem", marginBottom: "1rem" }}>
                SKU: {editingProduct.sku}
              </p>
              <div style={{ marginBottom: "1rem" }}>
                <label style={{ display: "block", marginBottom: "0.5rem", color: "#cbd5e1" }}>
                  Nuevo Precio:
                </label>
                <input
                  type="number"
                  value={editPrice}
                  onChange={(e) => setEditPrice(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "0.75rem",
                    backgroundColor: "#334155",
                    border: "1px solid #3b82f6",
                    borderRadius: "0.5rem",
                    color: "white",
                    fontSize: "1rem",
                  }}
                />
              </div>
              <div style={{ display: "flex", gap: "1rem" }}>
                <button
                  onClick={saveProductPrice}
                  style={{
                    flex: 1,
                    padding: "0.75rem",
                    backgroundColor: "#10b981",
                    color: "white",
                    border: "none",
                    borderRadius: "0.5rem",
                    cursor: "pointer",
                    fontWeight: "bold",
                  }}
                >
                  ✅ Confirmar
                </button>
                <button
                  onClick={() => setEditingProduct(null)}
                  style={{
                    flex: 1,
                    padding: "0.75rem",
                    backgroundColor: "#ef4444",
                    color: "white",
                    border: "none",
                    borderRadius: "0.5rem",
                    cursor: "pointer",
                    fontWeight: "bold",
                  }}
                >
                  ❌ Cancelar
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
