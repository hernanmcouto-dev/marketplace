"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

interface LogMessage {
  type: "log" | "progress" | "error" | "complete";
  message?: string;
  error?: string;
  current?: number;
  total?: number;
  percentage?: number;
  count?: number;
  timestamp?: string;
}

export default function ScraperPage() {
  const router = useRouter();
  const [running, setRunning] = useState(false);
  const [logs, setLogs] = useState<LogMessage[]>([]);
  const [progress, setProgress] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Solo renderizar si hay sesión
    setLoading(false);
  }, []);

  const handleStartScraper = async () => {
    setRunning(true);
    setLogs([]);
    setProgress(0);

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
            <li>Margen: 15%</li>
            <li>Prefijo SKU: SAR-</li>
            <li>Destino: public/products.json</li>
          </ul>
        </div>
      </main>
    </div>
  );
}
