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
  const [categorizingProducts, setCategorizingProducts] = useState(false);
  const [changingCategory, setChangingCategory] = useState(null);
  const [newCategory, setNewCategory] = useState("");
  const [scrapingReport, setScrapingReport] = useState(null);
  const [showScrapingReport, setShowScrapingReport] = useState(false);

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
    setScrapingReport(null);
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

      // Cargar reporte después del scraping
      const reportResponse = await fetch("/api/scraping-report?supplier=impotekno");
      if (reportResponse.ok) {
        const report = await reportResponse.json();
        setScrapingReport(report);
      }
    } catch (err) {
      addLog(`Error: ${err.message}`, "error");
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
          supplier: "impotekno",
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
      addLog(`Error: ${error.message}`, "error");
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

  const categorizeAllProducts = async () => {
    setCategorizingProducts(true);
    try {
      const response = await fetch("/api/categorize-products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ supplier: "impotekno" }),
      });

      const result = await response.json();
      if (response.ok) {
        addLog(`✅ ${result.categorized} productos categorizados`);
        loadProducts();
      } else {
        addLog(`Error: ${result.error}`, "error");
      }
    } catch (error) {
      addLog(`Error: ${error.message}`, "error");
    } finally {
      setCategorizingProducts(false);
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
                    <th style={{ padding: "1rem", textAlign: "left" }}>Categoría</th>
                    <th style={{ padding: "1rem", textAlign: "right" }}>Precio</th>
                    <th style={{ padding: "1rem", textAlign: "center" }}>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredProducts.slice(0, 50).map((product) => (
                    <tr key={product.sku} style={{ borderBottom: "1px solid #334155" }}>
                      <td style={{ padding: "1rem" }}>{product.sku}</td>
                      <td style={{ padding: "1rem", maxWidth: "200px" }}>
                        {product.name.substring(0, 35)}...
                      </td>
                      <td style={{ padding: "1rem", fontSize: "0.875rem", color: "#cbd5e1" }}>
                        {product.category || "Sin categorizar"}
                      </td>
                      <td style={{ padding: "1rem", textAlign: "right" }}>${product.unit_price}</td>
                      <td style={{ padding: "1rem", textAlign: "center" }}>
                        <div style={{ display: "flex", gap: "0.5rem", justifyContent: "center" }}>
                          <button
                            onClick={() => {
                              setEditingProduct(product);
                              setEditPrice(product.unit_price.toString());
                            }}
                            title="Editar precio"
                            style={{
                              padding: "0.4rem 0.8rem",
                              backgroundColor: "#3b82f6",
                              color: "white",
                              border: "none",
                              borderRadius: "0.25rem",
                              cursor: "pointer",
                              fontSize: "0.875rem",
                            }}
                          >
                            💰
                          </button>
                          <button
                            onClick={() => {
                              setChangingCategory(product);
                              setNewCategory(product.category || "");
                            }}
                            title="Cambiar categoría"
                            style={{
                              padding: "0.4rem 0.8rem",
                              backgroundColor: "#8b5cf6",
                              color: "white",
                              border: "none",
                              borderRadius: "0.25rem",
                              cursor: "pointer",
                              fontSize: "0.875rem",
                            }}
                          >
                            🏷️
                          </button>
                        </div>
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
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1rem" }}>
                  <button
                    onClick={() => setShowAnalysisDetails(showAnalysisDetails === "uncategorized" ? null : "uncategorized")}
                    style={{
                      padding: "1rem",
                      backgroundColor: "#334155",
                      color: "#ef4444",
                      border: "1px solid #ef4444",
                      borderRadius: "0.5rem",
                      cursor: "pointer",
                      fontWeight: "bold",
                    }}
                  >
                    📋 Ver {analytics.uncategorizedCount}
                  </button>
                  <button
                    onClick={categorizeAllProducts}
                    disabled={categorizingProducts}
                    style={{
                      padding: "1rem",
                      backgroundColor: categorizingProducts ? "#666" : "#ef4444",
                      color: "white",
                      border: "1px solid #ef4444",
                      borderRadius: "0.5rem",
                      cursor: categorizingProducts ? "not-allowed" : "pointer",
                      fontWeight: "bold",
                    }}
                  >
                    {categorizingProducts ? "⏳ Categorizando..." : "🤖 Categorizar Ahora"}
                  </button>
                </div>

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
            <div style={{ display: "flex", gap: "1rem", marginBottom: "2rem" }}>
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
                  flex: 1,
                }}
              >
                {loading ? "⏳ Scrapeando..." : "🚀 Iniciar Scraper"}
              </button>
              {scrapingReport && (
                <button
                  onClick={() => setShowScrapingReport(!showScrapingReport)}
                  style={{
                    padding: "1rem 2rem",
                    backgroundColor: "#3b82f6",
                    color: "white",
                    border: "none",
                    borderRadius: "0.5rem",
                    cursor: "pointer",
                    fontSize: "1rem",
                    fontWeight: "bold",
                  }}
                >
                  {showScrapingReport ? "Ocultar" : "📊 Ver detalles"}
                </button>
              )}
            </div>

            {/* Detalles del scraping */}
            {showScrapingReport && scrapingReport && (
              <div style={{ backgroundColor: "#1e293b", padding: "1.5rem", borderRadius: "0.5rem", marginBottom: "2rem" }}>
                <h3 style={{ margin: "0 0 1rem 0" }}>📊 Detalles del Scraping</h3>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "1rem", marginBottom: "1.5rem" }}>
                  <div style={{ backgroundColor: "#0f172a", padding: "1rem", borderRadius: "0.5rem" }}>
                    <div style={{ fontSize: "0.875rem", color: "#94a3b8" }}>Nuevos</div>
                    <div style={{ fontSize: "1.5rem", fontWeight: "bold", color: "#10b981" }}>
                      {scrapingReport.report.newProducts}
                    </div>
                  </div>
                  <div style={{ backgroundColor: "#0f172a", padding: "1rem", borderRadius: "0.5rem" }}>
                    <div style={{ fontSize: "0.875rem", color: "#94a3b8" }}>Actualizados</div>
                    <div style={{ fontSize: "1.5rem", fontWeight: "bold", color: "#3b82f6" }}>
                      {scrapingReport.updatedCount}
                    </div>
                  </div>
                  <div style={{ backgroundColor: "#0f172a", padding: "1rem", borderRadius: "0.5rem" }}>
                    <div style={{ fontSize: "0.875rem", color: "#94a3b8" }}>Eliminados</div>
                    <div style={{ fontSize: "1.5rem", fontWeight: "bold", color: "#ef4444" }}>
                      {scrapingReport.report.removedProducts.length}
                    </div>
                  </div>
                </div>

                {scrapingReport.newProductsDetails.length > 0 && (
                  <div style={{ marginBottom: "1.5rem" }}>
                    <h4 style={{ margin: "0 0 1rem 0", color: "#10b981" }}>✨ Productos Nuevos</h4>
                    <div style={{ maxHeight: "300px", overflowY: "auto" }}>
                      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.875rem" }}>
                        <thead>
                          <tr style={{ borderBottom: "1px solid #334155" }}>
                            <th style={{ padding: "0.5rem", textAlign: "left" }}>SKU</th>
                            <th style={{ padding: "0.5rem", textAlign: "left" }}>Nombre</th>
                            <th style={{ padding: "0.5rem", textAlign: "right" }}>Precio</th>
                            <th style={{ padding: "0.5rem", textAlign: "left" }}>Categoría</th>
                          </tr>
                        </thead>
                        <tbody>
                          {scrapingReport.newProductsDetails.map((p: any) => (
                            <tr key={p.sku} style={{ borderBottom: "1px solid #334155" }}>
                              <td style={{ padding: "0.5rem" }}>{p.sku}</td>
                              <td style={{ padding: "0.5rem", maxWidth: "200px", overflow: "hidden" }}>
                                {p.name.substring(0, 30)}...
                              </td>
                              <td style={{ padding: "0.5rem", textAlign: "right" }}>${p.unit_price}</td>
                              <td style={{ padding: "0.5rem", color: "#94a3b8" }}>{p.category}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {scrapingReport.removedProductsDetails.length > 0 && (
                  <div>
                    <h4 style={{ margin: "0 0 1rem 0", color: "#ef4444" }}>❌ Productos Eliminados</h4>
                    <div style={{ maxHeight: "300px", overflowY: "auto" }}>
                      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.875rem" }}>
                        <thead>
                          <tr style={{ borderBottom: "1px solid #334155" }}>
                            <th style={{ padding: "0.5rem", textAlign: "left" }}>SKU</th>
                            <th style={{ padding: "0.5rem", textAlign: "left" }}>Nombre</th>
                            <th style={{ padding: "0.5rem", textAlign: "left" }}>Categoría</th>
                          </tr>
                        </thead>
                        <tbody>
                          {scrapingReport.removedProductsDetails.map((p: any) => (
                            <tr key={p.sku} style={{ borderBottom: "1px solid #334155" }}>
                              <td style={{ padding: "0.5rem" }}>{p.sku}</td>
                              <td style={{ padding: "0.5rem", maxWidth: "200px", overflow: "hidden" }}>
                                {p.name.substring(0, 30)}...
                              </td>
                              <td style={{ padding: "0.5rem", color: "#94a3b8" }}>{p.category}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}

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

        {/* Modal para cambiar categoría */}
        {changingCategory && (
          <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
            <div style={{ backgroundColor: "#1e293b", padding: "2rem", borderRadius: "1rem", maxWidth: "500px", width: "90%" }}>
              <h3 style={{ margin: "0 0 1rem 0", fontSize: "1.5rem" }}>🏷️ Cambiar Categoría</h3>
              <p style={{ color: "#cbd5e1", marginBottom: "1rem" }}>
                <strong>{changingCategory.name}</strong>
              </p>
              <p style={{ color: "#94a3b8", fontSize: "0.875rem", marginBottom: "1rem" }}>
                SKU: {changingCategory.sku}
              </p>
              <div style={{ marginBottom: "1rem" }}>
                <label style={{ display: "block", marginBottom: "0.5rem", color: "#cbd5e1" }}>
                  Categoría:
                </label>
                <select
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "0.75rem",
                    backgroundColor: "#334155",
                    border: "1px solid #3b82f6",
                    borderRadius: "0.5rem",
                    color: "white",
                    fontSize: "1rem",
                  }}
                >
                  <option value="">Seleccionar categoría...</option>
                  <option value="Hogar y Cocina">Hogar y Cocina</option>
                  <option value="Herramientas y Electricidad">Herramientas y Electricidad</option>
                  <option value="Iluminación y LED">Iluminación y LED</option>
                  <option value="Audio Video y Parlantes">Audio Video y Parlantes</option>
                  <option value="Electrónica y Computación">Electrónica y Computación</option>
                  <option value="Juegos Juguetes y Librería">Juegos Juguetes y Librería</option>
                  <option value="Gadgets">Gadgets</option>
                  <option value="Bazar y Camping">Bazar y Camping</option>
                  <option value="Indumentaria y Textiles">Indumentaria y Textiles</option>
                  <option value="Cuidado Personal y Cosmética">Cuidado Personal y Cosmética</option>
                  <option value="Cables y Conectores">Cables y Conectores</option>
                  <option value="Seguridad y Cámaras">Seguridad y Cámaras</option>
                  <option value="Cargadores y Fuentes">Cargadores y Fuentes</option>
                  <option value="Accesorios para Celulares">Accesorios para Celulares</option>
                  <option value="Accesorios Auto Moto y Bici">Accesorios Auto Moto y Bici</option>
                  <option value="Liquidación">Liquidación</option>
                  <option value="Próximo a Ingresar">Próximo a Ingresar</option>
                </select>
              </div>
              <div style={{ display: "flex", gap: "1rem" }}>
                <button
                  onClick={updateProductCategory}
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
                  onClick={() => setChangingCategory(null)}
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
