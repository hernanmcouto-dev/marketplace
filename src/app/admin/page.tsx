"use client";

import Link from "next/link";
import { useState, useEffect } from "react";

export default function AdminDashboard() {
  const [stats, setStats] = useState({
    totalProducts: 5601,
    suppliers: 3,
    categories: 17,
  });

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#0f172a", color: "white" }}>
      {/* Header */}
      <header
        style={{
          background: "linear-gradient(135deg, #1e293b 0%, #0f172a 100%)",
          borderBottom: "2px solid #3b82f6",
          padding: "2rem 1rem",
        }}
      >
        <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
          <h1 style={{ margin: 0, fontSize: "2.5rem", fontWeight: "bold" }}>
            🛠️ Panel de Administración
          </h1>
          <p style={{ margin: "0.5rem 0 0 0", color: "#94a3b8" }}>
            Gestiona el marketplace Planeta Once
          </p>
        </div>
      </header>

      <main style={{ maxWidth: "1200px", margin: "0 auto", padding: "2rem 1rem" }}>
        {/* Stats Cards */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            gap: "1rem",
            marginBottom: "3rem",
          }}
        >
          <div
            style={{
              backgroundColor: "#1e293b",
              border: "1px solid #334155",
              borderRadius: "0.75rem",
              padding: "1.5rem",
            }}
          >
            <div style={{ fontSize: "0.875rem", color: "#94a3b8", marginBottom: "0.5rem" }}>
              📦 Productos Totales
            </div>
            <div style={{ fontSize: "2.5rem", fontWeight: "bold", color: "#3b82f6" }}>
              {stats.totalProducts.toLocaleString()}
            </div>
            <div style={{ fontSize: "0.75rem", color: "#64748b", marginTop: "0.5rem" }}>
              En 3 proveedores
            </div>
          </div>

          <div
            style={{
              backgroundColor: "#1e293b",
              border: "1px solid #334155",
              borderRadius: "0.75rem",
              padding: "1.5rem",
            }}
          >
            <div style={{ fontSize: "0.875rem", color: "#94a3b8", marginBottom: "0.5rem" }}>
              🏪 Proveedores
            </div>
            <div style={{ fontSize: "2.5rem", fontWeight: "bold", color: "#10b981" }}>
              {stats.suppliers}
            </div>
            <div style={{ fontSize: "0.75rem", color: "#64748b", marginTop: "0.5rem" }}>
              Impotekno • San Julián • NextCell
            </div>
          </div>

          <div
            style={{
              backgroundColor: "#1e293b",
              border: "1px solid #334155",
              borderRadius: "0.75rem",
              padding: "1.5rem",
            }}
          >
            <div style={{ fontSize: "0.875rem", color: "#94a3b8", marginBottom: "0.5rem" }}>
              🏷️ Categorías
            </div>
            <div style={{ fontSize: "2.5rem", fontWeight: "bold", color: "#f59e0b" }}>
              {stats.categories}
            </div>
            <div style={{ fontSize: "0.75rem", color: "#64748b", marginTop: "0.5rem" }}>
              Todas categorizadas
            </div>
          </div>
        </div>

        {/* Main Actions */}
        <div style={{ marginBottom: "3rem" }}>
          <h2 style={{ fontSize: "1.5rem", marginBottom: "1.5rem" }}>📋 Acciones</h2>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
              gap: "1.5rem",
            }}
          >
            {/* Entrenar */}
            <Link href="/admin/entrenar" style={{ textDecoration: "none" }}>
              <div
                style={{
                  backgroundColor: "#1e293b",
                  border: "2px solid #3b82f620",
                  borderRadius: "0.75rem",
                  padding: "1.5rem",
                  cursor: "pointer",
                  transition: "all 0.3s",
                  height: "100%",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = "#3b82f6";
                  e.currentTarget.style.backgroundColor = "#0f172a";
                  e.currentTarget.style.boxShadow = "0 0 20px rgba(59, 130, 246, 0.3)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = "#3b82f620";
                  e.currentTarget.style.backgroundColor = "#1e293b";
                  e.currentTarget.style.boxShadow = "none";
                }}
              >
                <h3 style={{ margin: "0 0 0.5rem 0", fontSize: "1.125rem" }}>🎓 Entrenar</h3>
                <p style={{ margin: "0 0 1rem 0", color: "#cbd5e1", fontSize: "0.875rem" }}>
                  Categoriza productos manualmente para mejorar el sistema
                </p>
                <span style={{ color: "#3b82f6", fontSize: "1.25rem" }}>→</span>
              </div>
            </Link>

            {/* Revisar */}
            <Link href="/admin/revisiones" style={{ textDecoration: "none" }}>
              <div
                style={{
                  backgroundColor: "#1e293b",
                  border: "2px solid #f59e0b20",
                  borderRadius: "0.75rem",
                  padding: "1.5rem",
                  cursor: "pointer",
                  transition: "all 0.3s",
                  height: "100%",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = "#f59e0b";
                  e.currentTarget.style.backgroundColor = "#0f172a";
                  e.currentTarget.style.boxShadow = "0 0 20px rgba(245, 158, 11, 0.3)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = "#f59e0b20";
                  e.currentTarget.style.backgroundColor = "#1e293b";
                  e.currentTarget.style.boxShadow = "none";
                }}
              >
                <h3 style={{ margin: "0 0 0.5rem 0", fontSize: "1.125rem" }}>
                  ✅ Revisar Productos
                </h3>
                <p style={{ margin: "0 0 1rem 0", color: "#cbd5e1", fontSize: "0.875rem" }}>
                  Valida y corrige la categorización de productos
                </p>
                <span style={{ color: "#f59e0b", fontSize: "1.25rem" }}>→</span>
              </div>
            </Link>

            {/* Shop */}
            <Link href="/shop" style={{ textDecoration: "none" }}>
              <div
                style={{
                  backgroundColor: "#1e293b",
                  border: "2px solid #10b98120",
                  borderRadius: "0.75rem",
                  padding: "1.5rem",
                  cursor: "pointer",
                  transition: "all 0.3s",
                  height: "100%",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = "#10b981";
                  e.currentTarget.style.backgroundColor = "#0f172a";
                  e.currentTarget.style.boxShadow = "0 0 20px rgba(16, 185, 129, 0.3)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = "#10b98120";
                  e.currentTarget.style.backgroundColor = "#1e293b";
                  e.currentTarget.style.boxShadow = "none";
                }}
              >
                <h3 style={{ margin: "0 0 0.5rem 0", fontSize: "1.125rem" }}>🏪 Ver Tienda</h3>
                <p style={{ margin: "0 0 1rem 0", color: "#cbd5e1", fontSize: "0.875rem" }}>
                  Visualiza como ven los clientes el marketplace
                </p>
                <span style={{ color: "#10b981", fontSize: "1.25rem" }}>→</span>
              </div>
            </Link>

            {/* Categorías */}
            <Link href="/categorias" style={{ textDecoration: "none" }}>
              <div
                style={{
                  backgroundColor: "#1e293b",
                  border: "2px solid #8b5cf620",
                  borderRadius: "0.75rem",
                  padding: "1.5rem",
                  cursor: "pointer",
                  transition: "all 0.3s",
                  height: "100%",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = "#8b5cf6";
                  e.currentTarget.style.backgroundColor = "#0f172a";
                  e.currentTarget.style.boxShadow = "0 0 20px rgba(139, 92, 246, 0.3)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = "#8b5cf620";
                  e.currentTarget.style.backgroundColor = "#1e293b";
                  e.currentTarget.style.boxShadow = "none";
                }}
              >
                <h3 style={{ margin: "0 0 0.5rem 0", fontSize: "1.125rem" }}>📊 Categorías</h3>
                <p style={{ margin: "0 0 1rem 0", color: "#cbd5e1", fontSize: "0.875rem" }}>
                  Explora productos por categoría
                </p>
                <span style={{ color: "#8b5cf6", fontSize: "1.25rem" }}>→</span>
              </div>
            </Link>
          </div>
        </div>

        {/* Info Box */}
        <div
          style={{
            backgroundColor: "#1e293b",
            border: "1px solid #334155",
            borderRadius: "0.75rem",
            padding: "2rem",
          }}
        >
          <h3 style={{ margin: "0 0 1rem 0", color: "#3b82f6" }}>ℹ️ Estado del Sistema</h3>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1rem" }}>
            <div>
              <div style={{ fontSize: "0.875rem", color: "#94a3b8" }}>Productos Impotekno</div>
              <div style={{ fontSize: "1.5rem", fontWeight: "bold", marginTop: "0.5rem" }}>447</div>
            </div>
            <div>
              <div style={{ fontSize: "0.875rem", color: "#94a3b8" }}>Productos San Julián</div>
              <div style={{ fontSize: "1.5rem", fontWeight: "bold", marginTop: "0.5rem" }}>486</div>
            </div>
            <div>
              <div style={{ fontSize: "0.875rem", color: "#94a3b8" }}>Productos NextCell</div>
              <div style={{ fontSize: "1.5rem", fontWeight: "bold", marginTop: "0.5rem" }}>4,668</div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
