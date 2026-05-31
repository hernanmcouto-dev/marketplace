"use client";

import Link from "next/link";

export default function RevisionesPage() {
  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#0f172a", color: "white" }}>
      {/* Header */}
      <header
        style={{
          background: "linear-gradient(135deg, #1e293b 0%, #0f172a 100%)",
          borderBottom: "2px solid #f59e0b",
          padding: "2rem 1rem",
        }}
      >
        <Link href="/admin" style={{ textDecoration: "none", color: "white" }}>
          <div style={{ maxWidth: "1200px", margin: "0 auto", cursor: "pointer" }}>
            <div style={{ fontSize: "1rem", color: "#94a3b8", marginBottom: "0.5rem" }}>← Volver</div>
            <h1 style={{ margin: 0, fontSize: "2rem", fontWeight: "bold" }}>✅ Revisar Productos</h1>
            <p style={{ margin: "0.5rem 0 0 0", color: "#94a3b8" }}>
              Valida y corrige la categorización
            </p>
          </div>
        </Link>
      </header>

      <main style={{ maxWidth: "1200px", margin: "0 auto", padding: "2rem 1rem" }}>
        <div
          style={{
            backgroundColor: "#1e293b",
            border: "1px solid #334155",
            borderRadius: "0.75rem",
            padding: "3rem",
            textAlign: "center",
          }}
        >
          <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>✅</div>
          <h2 style={{ margin: "0 0 1rem 0", fontSize: "1.5rem" }}>Módulo de Revisión</h2>
          <p style={{ margin: "0 0 2rem 0", color: "#cbd5e1" }}>
            Esta página está en desarrollo para revisar y validar productos categorizados.
          </p>
          <p style={{ color: "#94a3b8", fontSize: "0.875rem" }}>
            Aquí podrás revisar la categorización automática y hacer correcciones manuales.
          </p>

          <div style={{ marginTop: "2rem", display: "flex", gap: "1rem", justifyContent: "center" }}>
            <Link href="/shop" style={{ textDecoration: "none" }}>
              <button
                style={{
                  padding: "0.75rem 1.5rem",
                  backgroundColor: "#3b82f6",
                  color: "white",
                  border: "none",
                  borderRadius: "0.5rem",
                  cursor: "pointer",
                  fontSize: "1rem",
                }}
              >
                Ver Tienda
              </button>
            </Link>
            <Link href="/categorias" style={{ textDecoration: "none" }}>
              <button
                style={{
                  padding: "0.75rem 1.5rem",
                  backgroundColor: "#8b5cf6",
                  color: "white",
                  border: "none",
                  borderRadius: "0.5rem",
                  cursor: "pointer",
                  fontSize: "1rem",
                }}
              >
                Ver Categorías
              </button>
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
