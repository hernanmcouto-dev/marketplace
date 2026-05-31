"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

interface LogMessage {
  type: "log" | "progress" | "error" | "complete" | "report";
  message?: string;
  error?: string;
  current?: number;
  total?: number;
  percentage?: number;
  count?: number;
  timestamp?: string;
  report?: {
    newProducts: number;
    newImages: number;
    cachedImages: number;
    removedProducts: string[];
    totalProducts: number;
    timestamp: string;
  };
}

export default function ScraperPage() {
  const router = useRouter();
  const [running, setRunning] = useState(false);
  const [logs, setLogs] = useState<LogMessage[]>([]);
  const [progress, setProgress] = useState(0);
  const [loading, setLoading] = useState(true);
  const [report, setReport] = useState<LogMessage["report"] | null>(null);

  useEffect(() => {
    // Solo renderizar si hay sesión
    setLoading(false);
  }, []);

  const handleStartScraper = async () => {
    setRunning(true);
    setLogs([]);
    setProgress(0);
    setReport(null);

    try {
      const response = await fetch("/api/scrape-impotekno", {
        method: "POST",
      });

      if (!response.body) {
        setLogs([{ type: "error", error: "No response body" }]);
        setRunning(false);
        return;
      }

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
              const message = JSON.parse(line.slice(6)) as LogMessage;
              setLogs((prev) => [...prev, message]);

              if (message.type === "progress") {
                setProgress(message.percentage || 0);
              } else if (message.type === "report") {
                setReport(message.report || null);
              } else if (message.type === "complete") {
                setRunning(false);
              } else if (message.type === "error") {
                setRunning(false);
              }
            } catch (err) {
              console.error("Error parsing message:", err);
            }
          }
        }
      }
    } catch (err: any) {
      setLogs([{ type: "error", error: err.message }]);
      setRunning(false);
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
        <button
          onClick={() => router.push("/admin")}
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
      </nav>

      {/* Main Content */}
      <main style={{ flex: 1, padding: "2rem", maxWidth: "80rem", margin: "0 auto", width: "100%" }}>
        <h2 style={{ fontSize: "1.875rem", marginBottom: "2rem" }}>🕷️ Web Scraper - Impotekno</h2>

        {/* Control Panel */}
        <div
          style={{
            backgroundColor: "white",
            border: "1px solid #e5e7eb",
            borderRadius: "0.5rem",
            padding: "1.5rem",
            marginBottom: "2rem",
          }}
        >
          <button
            onClick={handleStartScraper}
            disabled={running}
            style={{
              padding: "0.75rem 1.5rem",
              backgroundColor: running ? "#9ca3af" : "#10b981",
              color: "white",
              border: "none",
              borderRadius: "0.375rem",
              cursor: running ? "not-allowed" : "pointer",
              fontWeight: "bold",
              fontSize: "1rem",
            }}
          >
            {running ? "⏳ Scrapeando..." : "▶️ Iniciar Scraper"}
          </button>

          {progress > 0 && (
            <div style={{ marginTop: "1.5rem" }}>
              <div style={{ marginBottom: "0.5rem", fontSize: "0.875rem", color: "#6b7280" }}>
                Progreso: {progress}%
              </div>
              <div
                style={{
                  width: "100%",
                  height: "24px",
                  backgroundColor: "#e5e7eb",
                  borderRadius: "0.375rem",
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    width: `${progress}%`,
                    height: "100%",
                    backgroundColor: "#10b981",
                    transition: "width 0.3s ease",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "white",
                    fontSize: "0.75rem",
                    fontWeight: "bold",
                  }}
                >
                  {progress > 10 ? `${progress}%` : ""}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Logs Display */}
        <div
          style={{
            backgroundColor: "#1f2937",
            color: "#e5e7eb",
            borderRadius: "0.5rem",
            padding: "1rem",
            fontFamily: "monospace",
            fontSize: "0.875rem",
            maxHeight: "500px",
            overflowY: "auto",
          }}
        >
          {logs.length === 0 ? (
            <div style={{ color: "#9ca3af" }}>Haz clic en "Iniciar Scraper" para comenzar...</div>
          ) : (
            logs.map((log, idx) => (
              <div key={idx} style={{ marginBottom: "0.5rem" }}>
                {log.type === "log" && (
                  <span style={{ color: "#a3e635" }}>
                    [{new Date(log.timestamp || "").toLocaleTimeString()}] {log.message}
                  </span>
                )}
                {log.type === "progress" && (
                  <span style={{ color: "#60a5fa" }}>
                    [{log.current}/{log.total}] {log.message} ({log.percentage}%)
                  </span>
                )}
                {log.type === "error" && (
                  <span style={{ color: "#f87171" }}>❌ ERROR: {log.error}</span>
                )}
                {log.type === "complete" && (
                  <span style={{ color: "#4ade80" }}>✅ {log.message}</span>
                )}
              </div>
            ))
          )}
        </div>

        {/* Report */}
        {report && (
          <div
            style={{
              marginTop: "2rem",
              padding: "1.5rem",
              backgroundColor: "#f8fafc",
              border: "2px solid #3b82f6",
              borderRadius: "0.5rem",
              color: "#1e293b",
            }}
          >
            <h3 style={{ margin: "0 0 1rem 0", fontSize: "1.25rem", color: "#1e40af" }}>
              📊 Informe del Scraper
            </h3>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1rem" }}>
              <div style={{ padding: "1rem", backgroundColor: "#dbeafe", borderRadius: "0.375rem" }}>
                <div style={{ fontSize: "0.875rem", color: "#0c4a6e", marginBottom: "0.5rem" }}>
                  ✨ Productos Nuevos
                </div>
                <div style={{ fontSize: "1.875rem", fontWeight: "bold", color: "#0369a1" }}>
                  {report.newProducts}
                </div>
              </div>

              <div style={{ padding: "1rem", backgroundColor: "#dcfce7", borderRadius: "0.375rem" }}>
                <div style={{ fontSize: "0.875rem", color: "#166534", marginBottom: "0.5rem" }}>
                  📸 Imágenes Nuevas
                </div>
                <div style={{ fontSize: "1.875rem", fontWeight: "bold", color: "#22c55e" }}>
                  {report.newImages}
                </div>
              </div>

              <div style={{ padding: "1rem", backgroundColor: "#fef3c7", borderRadius: "0.375rem" }}>
                <div style={{ fontSize: "0.875rem", color: "#92400e", marginBottom: "0.5rem" }}>
                  ♻️ Imágenes en Caché
                </div>
                <div style={{ fontSize: "1.875rem", fontWeight: "bold", color: "#f59e0b" }}>
                  {report.cachedImages}
                </div>
              </div>

              <div style={{ padding: "1rem", backgroundColor: "#fee2e2", borderRadius: "0.375rem" }}>
                <div style={{ fontSize: "0.875rem", color: "#7f1d1d", marginBottom: "0.5rem" }}>
                  ❌ Productos Removidos
                </div>
                <div style={{ fontSize: "1.875rem", fontWeight: "bold", color: "#ef4444" }}>
                  {report.removedProducts.length}
                </div>
              </div>
            </div>

            <div style={{ padding: "1rem", backgroundColor: "#f3f4f6", borderRadius: "0.375rem", marginBottom: "1rem" }}>
              <div style={{ fontSize: "0.875rem", color: "#374151", marginBottom: "0.5rem", fontWeight: "bold" }}>
                📦 Total de Productos
              </div>
              <div style={{ fontSize: "1.5rem", fontWeight: "bold", color: "#1f2937" }}>
                {report.totalProducts} productos
              </div>
            </div>

            {report.removedProducts.length > 0 && (
              <div style={{ padding: "1rem", backgroundColor: "#fef2f2", borderRadius: "0.375rem", borderLeft: "4px solid #ef4444" }}>
                <div style={{ fontSize: "0.875rem", color: "#7f1d1d", marginBottom: "0.5rem", fontWeight: "bold" }}>
                  SKUs que ya no están disponibles:
                </div>
                <div style={{ fontSize: "0.75rem", color: "#991b1b", maxHeight: "200px", overflowY: "auto" }}>
                  {report.removedProducts.slice(0, 20).map((sku, idx) => (
                    <div key={idx}>• {sku}</div>
                  ))}
                  {report.removedProducts.length > 20 && (
                    <div style={{ marginTop: "0.5rem", fontWeight: "bold" }}>
                      ... y {report.removedProducts.length - 20} más
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Info */}
        <div
          style={{
            marginTop: "2rem",
            padding: "1rem",
            backgroundColor: "#f0fdf4",
            border: "1px solid #86efac",
            borderRadius: "0.5rem",
            color: "#166534",
          }}
        >
          <p style={{ margin: "0 0 0.5rem 0", fontWeight: "bold" }}>ℹ️ Información:</p>
          <ul style={{ margin: "0.5rem 0 0 1.5rem", paddingLeft: 0 }}>
            <li>Impotekno: 22 categorías</li>
            <li>Margen: 10%</li>
            <li>Prefijo SKU: SAR-</li>
            <li>Destino: public/products.json</li>
          </ul>
        </div>
      </main>
    </div>
  );
}
