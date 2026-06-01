"use client";

import Link from "next/link";

export default function AdminDashboard() {
  const deposits = [
    {
      name: "Depósito Azul",
      path: "/admin/impotekno",
      color: "#3b82f6",
      icon: "🔵",
      description: "Panel de administración",
    },
    {
      name: "Depósito Verde",
      path: "/admin/sanjulian",
      color: "#10b981",
      icon: "🟢",
      description: "Panel de administración",
    },
    {
      name: "Depósito Rojo",
      path: "/admin/nextcell",
      color: "#ef4444",
      icon: "🔴",
      description: "Panel de administración",
    },
    {
      name: "Depósito Amarillo",
      path: "/admin/nodo",
      color: "#fbbf24",
      icon: "🟡",
      description: "Panel de administración",
    },
  ];

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#0f172a", color: "white" }}>
      {/* Header */}
      <header
        style={{
          background: "linear-gradient(135deg, #1e293b 0%, #0f172a 100%)",
          padding: "2rem 1rem",
          borderBottom: "2px solid #3b82f6",
          textAlign: "center",
        }}
      >
        <h1 style={{ fontSize: "2.5rem", marginBottom: "0.5rem" }}>🏭 Planeta Once - Admin</h1>
        <p style={{ color: "#94a3b8", fontSize: "1.1rem" }}>Gestiona los depósitos</p>
      </header>

      {/* Main Content */}
      <main style={{ maxWidth: "1200px", margin: "0 auto", padding: "3rem 1rem" }}>
        {/* Botón de Reportes */}
        <div style={{ marginBottom: "3rem", textAlign: "center" }}>
          <Link href="/admin/reportes" style={{ textDecoration: "none" }}>
            <button
              style={{
                padding: "1rem 2rem",
                backgroundColor: "#8b5cf6",
                color: "white",
                border: "none",
                borderRadius: "8px",
                fontSize: "1.1rem",
                fontWeight: "600",
                cursor: "pointer",
                transition: "all 0.3s ease",
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.backgroundColor = "#7c3aed";
                e.currentTarget.style.transform = "scale(1.05)";
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.backgroundColor = "#8b5cf6";
                e.currentTarget.style.transform = "scale(1)";
              }}
            >
              📋 Ver Reportes de Scraping
            </button>
          </Link>
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
            gap: "2rem",
          }}
        >
          {deposits.map((deposit) => (
            <Link
              key={deposit.path}
              href={deposit.path}
              style={{
                textDecoration: "none",
                color: "inherit",
              }}
            >
              <div
                style={{
                  background: `linear-gradient(135deg, ${deposit.color}20 0%, ${deposit.color}05 100%)`,
                  border: `2px solid ${deposit.color}`,
                  borderRadius: "12px",
                  padding: "2rem",
                  cursor: "pointer",
                  transition: "all 0.3s ease",
                  textAlign: "center",
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.transform = "translateY(-8px)";
                  e.currentTarget.style.boxShadow = `0 10px 30px ${deposit.color}30`;
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.boxShadow = "none";
                }}
              >
                <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>{deposit.icon}</div>
                <h2 style={{ fontSize: "1.5rem", marginBottom: "0.5rem", color: deposit.color }}>
                  {deposit.name}
                </h2>
                <p style={{ color: "#cbd5e1" }}>{deposit.description}</p>
                <button
                  style={{
                    marginTop: "1rem",
                    padding: "0.75rem 1.5rem",
                    backgroundColor: deposit.color,
                    color: "white",
                    border: "none",
                    borderRadius: "6px",
                    cursor: "pointer",
                    fontSize: "1rem",
                    fontWeight: "600",
                  }}
                >
                  Abrir Panel →
                </button>
              </div>
            </Link>
          ))}
        </div>
      </main>
    </div>
  );
}
