"use client";

import Link from "next/link";
import { useState, useEffect } from "react";

interface ScrapingReport {
  report: {
    newProducts: number;
    newImages: number;
    cachedImages: number;
    removedProducts: string[];
    totalProducts: number;
    timestamp: string;
  };
  newProductsDetails: any[];
  removedProductsDetails: any[];
  updatedCount: number;
}

export default function ReportesPage() {
  const [reports, setReports] = useState<Record<string, ScrapingReport | null>>({
    azul: null,
    verde: null,
    rojo: null,
    amarillo: null,
  });
  const [loading, setLoading] = useState(true);

  const deposits = [
    { key: "azul", name: "Depósito Azul", supplier: "impotekno", color: "#3b82f6", icon: "🔵" },
    { key: "verde", name: "Depósito Verde", supplier: "sanjulian", color: "#10b981", icon: "🟢" },
    { key: "rojo", name: "Depósito Rojo", supplier: "nextcell", color: "#ef4444", icon: "🔴" },
    { key: "amarillo", name: "Depósito Amarillo", supplier: "nodo", color: "#fbbf24", icon: "🟡" },
  ];

  useEffect(() => {
    loadReports();
  }, []);

  const loadReports = async () => {
    setLoading(true);
    const newReports: Record<string, ScrapingReport | null> = {};

    for (const deposit of deposits) {
      try {
        const response = await fetch(`/api/scraping-report?supplier=${deposit.supplier}`);
        if (response.ok) {
          const data = await response.json();
          newReports[deposit.key] = data;
        } else {
          newReports[deposit.key] = null;
        }
      } catch (error) {
        newReports[deposit.key] = null;
      }
    }

    setReports(newReports);
    setLoading(false);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString("es-AR");
  };

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#0f172a", color: "white" }}>
      <header
        style={{
          background: "linear-gradient(135deg, #1e293b 0%, #0f172a 100%)",
          padding: "2rem 1rem",
          borderBottom: "2px solid #3b82f6",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
        }}
      >
        <div>
          <h1 style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>📋 Reportes de Scraping</h1>
          <p style={{ color: "#94a3b8" }}>Últimos cambios en los depósitos</p>
        </div>
        <Link href="/admin" style={{ textDecoration: "none" }}>
          <button
            style={{
              padding: "0.5rem 1rem",
              backgroundColor: "#6366f1",
              color: "white",
              border: "none",
              borderRadius: "6px",
              cursor: "pointer",
              fontSize: "0.9rem",
              fontWeight: "600",
            }}
          >
            ← Volver
          </button>
        </Link>
      </header>

      <div style={{ maxWidth: "1400px", margin: "0 auto", padding: "2rem 1rem" }}>
        <button
          onClick={loadReports}
          style={{
            marginBottom: "2rem",
            padding: "0.5rem 1rem",
            backgroundColor: "#3b82f6",
            color: "white",
            border: "none",
            borderRadius: "6px",
            cursor: "pointer",
          }}
        >
          🔄 Actualizar Reportes
        </button>
      </div>

      <main style={{ maxWidth: "1400px", margin: "0 auto", padding: "2rem 1rem" }}>
        {loading ? (
          <div style={{ textAlign: "center", padding: "2rem" }}>
            <p>Cargando reportes...</p>
          </div>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(350px, 1fr))",
              gap: "2rem",
            }}
          >
            {deposits.map((deposit) => {
              const report = reports[deposit.key];

              return (
                <div
                  key={deposit.key}
                  style={{
                    background: `linear-gradient(135deg, ${deposit.color}15 0%, ${deposit.color}05 100%)`,
                    border: `2px solid ${deposit.color}`,
                    borderRadius: "12px",
                    padding: "1.5rem",
                  }}
                >
                  <h2 style={{ fontSize: "1.3rem", marginBottom: "0.5rem", color: deposit.color }}>
                    {deposit.icon} {deposit.name}
                  </h2>
                  {report ? (
                    <>
                      <p style={{ color: "#94a3b8", fontSize: "0.9rem", marginBottom: "1rem" }}>
                        📅 {formatDate((report as any).report?.timestamp || (report as any).timestamp)}
                      </p>

                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1.5rem" }}>
                        <div style={{ backgroundColor: "#1e293b", padding: "1rem", borderRadius: "8px" }}>
                          <p style={{ color: "#94a3b8", fontSize: "0.85rem" }}>Total</p>
                          <p style={{ fontSize: "1.5rem", fontWeight: "600", color: "#10b981" }}>
                            {(report as any).report?.totalProducts || (report as any).totalProducts || 0}
                          </p>
                        </div>
                        <div style={{ backgroundColor: "#1e293b", padding: "1rem", borderRadius: "8px" }}>
                          <p style={{ color: "#94a3b8", fontSize: "0.85rem" }}>Nuevos</p>
                          <p style={{ fontSize: "1.5rem", fontWeight: "600", color: "#fbbf24" }}>
                            +{(report as any).report?.newProducts || (report as any).newProducts || 0}
                          </p>
                        </div>
                      </div>

                      {((report as any).description || (report as any).report?.description) && (
                        <div style={{ backgroundColor: "#1e293b", padding: "1rem", borderRadius: "8px", marginBottom: "1rem" }}>
                          <p style={{ color: "#cbd5e1", fontSize: "0.9rem", margin: 0 }}>
                            {(report as any).description || (report as any).report?.description}
                          </p>
                        </div>
                      )}

                      {(report as any).usdToArs && (
                        <div style={{ backgroundColor: "#1e293b", padding: "1rem", borderRadius: "8px" }}>
                          <p style={{ color: "#94a3b8", fontSize: "0.85rem" }}>Tipo de Cambio</p>
                          <p style={{ fontSize: "1.2rem", color: "#fbbf24", margin: 0 }}>
                            💱 1 USD = {(report as any).usdToArs} ARS
                          </p>
                        </div>
                      )}

                      {report.newProductsDetails && report.newProductsDetails.length > 0 && (
                        <div style={{ marginTop: "1rem" }}>
                          <h3 style={{ fontSize: "0.95rem", marginBottom: "0.5rem", color: "#10b981" }}>
                            ✨ Nuevos ({report.newProductsDetails.length})
                          </h3>
                          <div style={{ backgroundColor: "#1e293b", borderRadius: "6px", maxHeight: "150px", overflowY: "auto", padding: "0.5rem", fontSize: "0.8rem" }}>
                            {report.newProductsDetails.slice(0, 5).map((p: any) => (
                              <div key={p.sku} style={{ padding: "0.3rem", borderBottom: "1px solid #334155", color: "#cbd5e1" }}>
                                {p.name} ({p.sku})
                              </div>
                            ))}
                            {report.newProductsDetails.length > 5 && (
                              <div style={{ padding: "0.3rem", color: "#94a3b8" }}>
                                +{report.newProductsDetails.length - 5} más
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {report.removedProductsDetails && report.removedProductsDetails.length > 0 && (
                        <div style={{ marginTop: "1rem" }}>
                          <h3 style={{ fontSize: "0.95rem", marginBottom: "0.5rem", color: "#ef4444" }}>
                            🗑️ Eliminados ({report.removedProductsDetails.length})
                          </h3>
                          <div style={{ backgroundColor: "#1e293b", borderRadius: "6px", maxHeight: "150px", overflowY: "auto", padding: "0.5rem", fontSize: "0.8rem" }}>
                            {report.removedProductsDetails.slice(0, 5).map((p: any) => (
                              <div key={p.sku} style={{ padding: "0.3rem", borderBottom: "1px solid #334155", color: "#cbd5e1" }}>
                                {p.name} ({p.sku})
                              </div>
                            ))}
                            {report.removedProductsDetails.length > 5 && (
                              <div style={{ padding: "0.3rem", color: "#94a3b8" }}>
                                +{report.removedProductsDetails.length - 5} más
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </>
                  ) : (
                    <p style={{ color: "#94a3b8", fontSize: "0.9rem" }}>
                      ❌ Sin reporte disponible
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
