"use client";

import Link from "next/link";
import { useState, useEffect } from "react";

export default function NextcellPanel() {
  const [products, setProducts] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState("scrape");
  const [loading, setLoading] = useState(false);
  const [logs, setLogs] = useState<Array<{ message: string; type: string; time: string }>>([]);
  const [scrapingReport, setScrapingReport] = useState<any>(null);
  const [showScrapingReport, setShowScrapingReport] = useState(false);

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    try {
      const response = await fetch("/products-nextcell.json");
      const data = await response.json();
      setProducts(data);
    } catch (error) {
      addLog("Error cargando productos", "error");
    }
  };

  const addLog = (message: string, type: string = "log") => {
    setLogs((p) => [...p, { message, type, time: new Date().toLocaleTimeString() }]);
  };

  const handleScrape = async () => {
    setLoading(true);
    setLogs([]);
    setScrapingReport(null);
    addLog("Iniciando scraping de NextCell...");

    try {
      const response = await fetch("/api/scrape-nextcell", { method: "POST" });
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
      addLog(`Error: ${err instanceof Error ? err.message : String(err)}`, "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#0f172a", color: "white" }}>
      <header style={{ background: "linear-gradient(135deg, #ef444480 0%, #0f172a 100%)", borderBottom: "2px solid #ef4444", padding: "2rem 1rem" }}>
        <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
          <Link href="/admin" style={{ textDecoration: "none", color: "white" }}>
            <div style={{ fontSize: "0.875rem", color: "#94a3b8", marginBottom: "0.5rem", cursor: "pointer" }}>
              ← Volver
            </div>
          </Link>
          <h1 style={{ margin: 0, fontSize: "2rem", fontWeight: "bold" }}>🔴 NextCell</h1>
          <p style={{ margin: "0.5rem 0 0 0", color: "#94a3b8" }}>{products.length} productos</p>
        </div>
      </header>

      <main style={{ maxWidth: "1200px", margin: "0 auto", padding: "2rem 1rem" }}>
        {/* Tabs */}
        <div style={{ display: "flex", gap: "1rem", marginBottom: "2rem", overflowX: "auto" }}>
          {[
            { key: "scrape", label: "🕷️ Scraper" },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              style={{
                padding: "0.75rem 1.5rem",
                backgroundColor: activeTab === tab.key ? "#ef4444" : "#1e293b",
                border: `2px solid ${activeTab === tab.key ? "#ef4444" : "#334155"}`,
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
            </div>

            <div style={{ backgroundColor: "#1e293b", padding: "1rem", borderRadius: "0.5rem", maxHeight: "400px", overflowY: "auto" }}>
              {logs.map((log, i) => (
                <div key={i} style={{ fontSize: "0.875rem", color: "#cbd5e1", marginBottom: "0.5rem" }}>
                  <span style={{ color: "#94a3b8" }}>[{log.time}]</span> {log.message}
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
