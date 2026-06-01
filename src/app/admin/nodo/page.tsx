"use client";

import Link from "next/link";
import { useState, useEffect } from "react";

export default function NodoPanel() {
  const [products, setProducts] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState("list");
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 50;
  const [editingProduct, setEditingProduct] = useState<{ sku: string; name?: string } | null>(null);
  const [editPrice, setEditPrice] = useState("");
  const [logs, setLogs] = useState<Array<{ message: string; type: string; time: string }>>([]);
  const [showAnalysisDetails, setShowAnalysisDetails] = useState<string | null>(null);
  const [categorizingProducts, setCategorizingProducts] = useState(false);
  const [changingCategory, setChangingCategory] = useState<{ sku: string; name?: string } | null>(null);
  const [newCategory, setNewCategory] = useState("");
  const [scrapingReport, setScrapingReport] = useState<any>(null);
  const [showScrapingReport, setShowScrapingReport] = useState(false);
  const [usdToArs, setUsdToArs] = useState("1430");
  const [savingConfig, setSavingConfig] = useState(false);

  useEffect(() => {
    loadProducts();
    loadConfig();
  }, []);

  const loadProducts = async () => {
    try {
      const response = await fetch("/products-nodo.json");
      const data = await response.json();
      setProducts(data);
    } catch (error) {
      addLog("Error cargando productos", "error");
    }
  };

  const loadConfig = async () => {
    try {
      const response = await fetch("/config-nodo.json");
      const data = await response.json();
      setUsdToArs(data.usd_to_ars.toString());
    } catch (error) {
      addLog("Error cargando configuración", "error");
    }
  };

  const saveConfig = async () => {
    setSavingConfig(true);
    try {
      const response = await fetch("/api/update-config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ usdToArs: parseFloat(usdToArs) }),
      });

      if (response.ok) {
        const result = await response.json();
        addLog(`✅ ${result.message}`);
      } else {
        addLog("Error guardando configuración", "error");
      }
    } catch (error) {
      addLog(`Error: ${error instanceof Error ? error instanceof Error ? error.message : String(error) : String(error)}`, "error");
    } finally {
      setSavingConfig(false);
    }
  };

  const addLog = (message: string, type: string = "log") => {
    setLogs((p) => [...p, { message, type, time: new Date().toLocaleTimeString() }]);
  };

  const handleScrape = async () => {
    setLoading(true);
    setLogs([]);
    setScrapingReport(null);
    addLog("Iniciando scraping de Nodo Urquiza...");

    try {
      const response = await fetch("/api/scrape-nodo", { method: "POST" });
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
              if (msg.type === "report" && msg.report) {
                setScrapingReport({ report: msg.report });
                addLog(`📊 Reporte: ${msg.report.totalProducts} productos, ${msg.report.newProducts} nuevos`);
              }
            } catch (e) {}
          }
        }
      }

      addLog("✅ Scraping completado", "complete");
      loadProducts();

      const reportResponse = await fetch("/api/scraping-report?supplier=nodo");
      if (reportResponse.ok) {
        const report = await reportResponse.json();
        setScrapingReport(report);
      }
    } catch (err) {
      addLog(`Error: ${err instanceof Error ? err.message : String(err)}`, "error");
    } finally {
      setLoading(false);
    }
  };

  const updateProductCategory = async () => {
    if (!changingCategory || !newCategory) return;

    try {
      const response = await fetch("/api/update-product-category", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sku: changingCategory.sku,
          category: newCategory,
          supplier: "nodo",
        }),
      });

      if (response.ok) {
        const result = await response.json();
        setProducts((prev) =>
          prev.map((p) =>
            p.sku === changingCategory.sku ? { ...p, category: newCategory } : p
          )
        );
        addLog(`✅ ${result.message}`);
        setChangingCategory(null);
        setNewCategory("");
      }
    } catch (error) {
      addLog(`Error: ${error instanceof Error ? error instanceof Error ? error.message : String(error) : String(error)}`, "error");
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
        body: JSON.stringify({ products: updatedProducts, supplier: "nodo" }),
      });

      if (response.ok) {
        setProducts(updatedProducts);
        addLog(`✅ Precio actualizado: ${editingProduct.sku} → $${newPrice}`);
        setEditingProduct(null);
        setEditPrice("");
      }
    } catch (error) {
      addLog(`Error guardando: ${error instanceof Error ? error instanceof Error ? error.message : String(error) : String(error)}`, "error");
    }
  };

  const filteredProducts = products.filter((p) =>
    p.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const paginatedProducts = filteredProducts.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);

  const categories = [...new Set(products.map((p) => p.category))].sort();

  const stats = {
    total: products.length,
    minPrice: Math.min(...products.map((p) => p.unit_price || 0)),
    maxPrice: Math.max(...products.map((p) => p.unit_price || 0)),
    avgPrice: Math.round(
      products.reduce((sum, p) => sum + (p.unit_price || 0), 0) / products.length
    ),
    categories: categories.length,
  };

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#0f172a", color: "white" }}>
      <header style={{ padding: "2rem", borderBottom: "2px solid #fbbf24" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
          <h1 style={{ margin: 0 }}>🟡 Nodo Urquiza - Depósito Amarillo</h1>
          <Link href="/admin" style={{ color: "#fbbf24", textDecoration: "none" }}>← Volver</Link>
        </div>
        <p style={{ margin: 0, color: "#cbd5e1" }}>Gestión de productos y scraping</p>
      </header>

      <main style={{ padding: "2rem", maxWidth: "1400px", margin: "0 auto" }}>
        {/* Configuración de Tipo de Cambio */}
        <div style={{ backgroundColor: "#1f2937", padding: "1.5rem", borderRadius: "0.5rem", marginBottom: "2rem", border: "1px solid #fbbf24" }}>
          <h3 style={{ margin: "0 0 1rem 0" }}>💱 Configuración Tipo de Cambio</h3>
          <div style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
            <label>1 USD = </label>
            <input
              type="number"
              value={usdToArs}
              onChange={(e) => setUsdToArs(e.target.value)}
              style={{
                padding: "0.5rem",
                borderRadius: "0.375rem",
                border: "none",
                backgroundColor: "#374151",
                color: "white",
                width: "100px",
              }}
            />
            <label> ARS</label>
            <button
              onClick={saveConfig}
              disabled={savingConfig}
              style={{
                padding: "0.5rem 1rem",
                backgroundColor: "#fbbf24",
                color: "#000",
                border: "none",
                borderRadius: "0.375rem",
                cursor: "pointer",
                fontWeight: "bold",
              }}
            >
              {savingConfig ? "Guardando..." : "Guardar"}
            </button>
          </div>
        </div>

        {/* Toolbar */}
        <div style={{ display: "flex", gap: "1rem", marginBottom: "2rem", flexWrap: "wrap" }}>
          <button
            onClick={handleScrape}
            disabled={loading}
            style={{
              padding: "0.75rem 1.5rem",
              backgroundColor: "#fbbf24",
              color: "#000",
              border: "none",
              borderRadius: "0.375rem",
              fontWeight: "bold",
              cursor: "pointer",
            }}
          >
            {loading ? "⏳ Scrapeando..." : "🔄 Ejecutar Scraper"}
          </button>

          <div style={{ display: "flex", gap: "0.5rem" }}>
            <input
              type="text"
              placeholder="Buscar SKU o nombre..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              style={{
                padding: "0.5rem",
                borderRadius: "0.375rem",
                border: "1px solid #4b5563",
                backgroundColor: "#1f2937",
                color: "white",
                minWidth: "200px",
              }}
            />
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", gap: "1rem", marginBottom: "2rem", borderBottom: "1px solid #4b5563" }}>
          {["list", "analytics"].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                padding: "0.75rem 1rem",
                backgroundColor: activeTab === tab ? "#fbbf24" : "transparent",
                color: activeTab === tab ? "#000" : "#cbd5e1",
                border: "none",
                cursor: "pointer",
                fontWeight: activeTab === tab ? "bold" : "normal",
              }}
            >
              {tab === "list" ? "📋 Productos" : "📊 Análisis"}
            </button>
          ))}
        </div>

        {/* Tab: Lista de Productos */}
        {activeTab === "list" && (
          <div>
            <h3>Productos ({filteredProducts.length})</h3>

            {paginatedProducts.length > 0 ? (
              <div>
                <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "1rem" }}>
                  <thead>
                    <tr style={{ borderBottom: "2px solid #4b5563" }}>
                      <th style={{ padding: "1rem", textAlign: "left" }}>SKU</th>
                      <th style={{ padding: "1rem", textAlign: "left" }}>Nombre</th>
                      <th style={{ padding: "1rem", textAlign: "right" }}>Precio</th>
                      <th style={{ padding: "1rem", textAlign: "left" }}>Categoría</th>
                      <th style={{ padding: "1rem", textAlign: "center" }}>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedProducts.map((product, idx) => (
                      <tr key={`${product.sku}-${idx}`} style={{ borderBottom: "1px solid #374151" }}>
                        <td style={{ padding: "1rem" }}>{product.sku}</td>
                        <td style={{ padding: "1rem" }}>{product.name.substring(0, 40)}</td>
                        <td style={{ padding: "1rem", textAlign: "right" }}>
                          {editingProduct?.sku === product.sku ? (
                            <input
                              type="number"
                              value={editPrice}
                              onChange={(e) => setEditPrice(e.target.value)}
                              style={{
                                padding: "0.25rem",
                                borderRadius: "0.25rem",
                                border: "1px solid #fbbf24",
                                width: "80px",
                              }}
                            />
                          ) : (
                            `$${product.unit_price}`
                          )}
                        </td>
                        <td style={{ padding: "1rem" }}>{product.category || "-"}</td>
                        <td style={{ padding: "1rem", textAlign: "center" }}>
                          {editingProduct?.sku === product.sku ? (
                            <>
                              <button onClick={saveProductPrice} style={{ marginRight: "0.5rem", cursor: "pointer" }}>
                                ✅
                              </button>
                              <button onClick={() => setEditingProduct(null)} style={{ cursor: "pointer" }}>
                                ❌
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                onClick={() => {
                                  setEditingProduct(product);
                                  setEditPrice(product.unit_price.toString());
                                }}
                                style={{ marginRight: "0.5rem", cursor: "pointer" }}
                              >
                                💰
                              </button>
                              <button
                                onClick={() => {
                                  setChangingCategory(product);
                                  setNewCategory(product.category || "");
                                }}
                                style={{ cursor: "pointer" }}
                              >
                                🏷️
                              </button>
                            </>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* Cambiar categoría modal */}
                {changingCategory && (
                  <div style={{
                    position: "fixed",
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: "rgba(0,0,0,0.8)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    zIndex: 1000,
                  }}>
                    <div style={{
                      backgroundColor: "#1f2937",
                      padding: "2rem",
                      borderRadius: "0.5rem",
                      maxWidth: "400px",
                    }}>
                      <h3>Cambiar categoría: {changingCategory.sku}</h3>
                      <select
                        value={newCategory}
                        onChange={(e) => setNewCategory(e.target.value)}
                        style={{
                          width: "100%",
                          padding: "0.5rem",
                          marginBottom: "1rem",
                          borderRadius: "0.375rem",
                          border: "none",
                          backgroundColor: "#374151",
                          color: "white",
                        }}
                      >
                        <option value="">Selecciona categoría...</option>
                        {categories.map((cat) => (
                          <option key={cat} value={cat}>
                            {cat}
                          </option>
                        ))}
                      </select>
                      <div style={{ display: "flex", gap: "1rem" }}>
                        <button
                          onClick={updateProductCategory}
                          style={{
                            flex: 1,
                            padding: "0.5rem",
                            backgroundColor: "#fbbf24",
                            color: "#000",
                            border: "none",
                            borderRadius: "0.375rem",
                            fontWeight: "bold",
                            cursor: "pointer",
                          }}
                        >
                          Guardar
                        </button>
                        <button
                          onClick={() => setChangingCategory(null)}
                          style={{
                            flex: 1,
                            padding: "0.5rem",
                            backgroundColor: "#374151",
                            color: "white",
                            border: "none",
                            borderRadius: "0.375rem",
                            cursor: "pointer",
                          }}
                        >
                          Cancelar
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Paginación */}
                <div style={{ display: "flex", gap: "0.5rem", justifyContent: "center", marginTop: "2rem" }}>
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                    <button
                      key={page}
                      onClick={() => setCurrentPage(page)}
                      style={{
                        padding: "0.5rem 0.75rem",
                        backgroundColor: currentPage === page ? "#fbbf24" : "#374151",
                        color: currentPage === page ? "#000" : "white",
                        border: "none",
                        borderRadius: "0.25rem",
                        cursor: "pointer",
                      }}
                    >
                      {page}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <p>No hay productos. Ejecuta el scraper.</p>
            )}
          </div>
        )}

        {/* Tab: Análisis */}
        {activeTab === "analytics" && (
          <div>
            <h3>Estadísticas</h3>

            {/* Reporte de scraping - ARRIBA */}
            <div style={{ backgroundColor: "#fbbf24", color: "#000", padding: "1.5rem", borderRadius: "0.5rem", marginBottom: "2rem" }}>
              <h4 style={{ margin: "0 0 1rem 0" }}>📊 Último Scraping</h4>
              {scrapingReport ? (
                <div>
                  <p style={{ margin: "0.5rem 0" }}>✅ Total de productos: <strong>{scrapingReport.report?.totalProducts || scrapingReport.totalProducts}</strong></p>
                  <p style={{ margin: "0.5rem 0" }}>✨ Nuevos: <strong>{scrapingReport.report?.newProducts || scrapingReport.newProducts}</strong></p>
                  <p style={{ margin: "0.5rem 0" }}>💱 Tipo de cambio: <strong>1 USD = {scrapingReport.report?.usdToArs || scrapingReport.usdToArs} ARS</strong></p>
                  <p style={{ margin: "0.5rem 0", fontSize: "0.875rem" }}>🕐 {new Date(scrapingReport.report?.timestamp || scrapingReport.timestamp).toLocaleString()}</p>
                </div>
              ) : (
                <p style={{ margin: 0, color: "#666" }}>Sin reportes aún. Ejecuta el scraper para ver resultados.</p>
              )}
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1rem", marginBottom: "2rem" }}>
              <div style={{ backgroundColor: "#1f2937", padding: "1rem", borderRadius: "0.5rem" }}>
                <p style={{ margin: 0, color: "#cbd5e1" }}>Total</p>
                <p style={{ margin: 0, fontSize: "2rem", fontWeight: "bold" }}>{stats.total}</p>
              </div>
              <div style={{ backgroundColor: "#1f2937", padding: "1rem", borderRadius: "0.5rem" }}>
                <p style={{ margin: 0, color: "#cbd5e1" }}>Precio Mínimo</p>
                <p style={{ margin: 0, fontSize: "1.5rem" }}>${stats.minPrice}</p>
              </div>
              <div style={{ backgroundColor: "#1f2937", padding: "1rem", borderRadius: "0.5rem" }}>
                <p style={{ margin: 0, color: "#cbd5e1" }}>Precio Máximo</p>
                <p style={{ margin: 0, fontSize: "1.5rem" }}>${stats.maxPrice}</p>
              </div>
              <div style={{ backgroundColor: "#1f2937", padding: "1rem", borderRadius: "0.5rem" }}>
                <p style={{ margin: 0, color: "#cbd5e1" }}>Precio Promedio</p>
                <p style={{ margin: 0, fontSize: "1.5rem" }}>${stats.avgPrice}</p>
              </div>
              <div style={{ backgroundColor: "#1f2937", padding: "1rem", borderRadius: "0.5rem" }}>
                <p style={{ margin: 0, color: "#cbd5e1" }}>Categorías</p>
                <p style={{ margin: 0, fontSize: "1.5rem" }}>{stats.categories}</p>
              </div>
            </div>
          </div>
        )}

        {/* Log de eventos */}
        <div style={{ marginTop: "2rem" }}>
          <h3>📝 Log de Eventos</h3>
          <div style={{
            backgroundColor: "#1f2937",
            padding: "1rem",
            borderRadius: "0.5rem",
            maxHeight: "300px",
            overflow: "auto",
            fontFamily: "monospace",
            fontSize: "0.875rem",
          }}>
            {logs.length > 0 ? (
              logs.map((log, idx) => (
                <div key={idx} style={{
                  color: log.type === "error" ? "#ef4444" : log.type === "complete" ? "#10b981" : "#cbd5e1",
                  marginBottom: "0.5rem",
                }}>
                  [{log.time}] {log.message}
                </div>
              ))
            ) : (
              <div style={{ color: "#6b7280" }}>Sin eventos aún...</div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
