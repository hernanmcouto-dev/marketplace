"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

export default function ClientePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(false);
  }, [router]);

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  };

  if (loading) {
    return <div style={{ padding: "2rem", textAlign: "center" }}>Cargando...</div>;
  }

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      {/* Header */}
      <nav
        style={{
          backgroundColor: "#3b82f6",
          color: "white",
          padding: "1rem",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <h1 style={{ margin: 0, fontSize: "1.5rem" }}>📦 Tienda</h1>
        <button
          onClick={handleLogout}
          style={{
            backgroundColor: "#1e40af",
            color: "white",
            border: "none",
            padding: "0.5rem 1rem",
            borderRadius: "0.375rem",
            cursor: "pointer",
          }}
        >
          Cerrar sesión
        </button>
      </nav>

      {/* Main Content */}
      <main style={{ flex: 1, padding: "2rem", maxWidth: "80rem", margin: "0 auto", width: "100%" }}>
        <h2 style={{ fontSize: "1.875rem", marginBottom: "1rem" }}>Bienvenido, Cliente 👋</h2>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(250px, 1fr))",
            gap: "1.5rem",
            marginBottom: "2rem",
          }}
        >
          {/* Placeholder Products */}
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              style={{
                backgroundColor: "white",
                border: "1px solid #e5e7eb",
                borderRadius: "0.5rem",
                padding: "1rem",
                textAlign: "center",
              }}
            >
              <div
                style={{
                  backgroundColor: "#f3f4f6",
                  height: "150px",
                  borderRadius: "0.375rem",
                  marginBottom: "1rem",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "3rem",
                }}
              >
                📦
              </div>
              <h3 style={{ margin: "0 0 0.5rem 0" }}>Producto {i}</h3>
              <p style={{ color: "#6b7280", margin: "0 0 1rem 0" }}>$999.99</p>
              <button
                style={{
                  backgroundColor: "#3b82f6",
                  color: "white",
                  border: "none",
                  padding: "0.5rem 1rem",
                  borderRadius: "0.375rem",
                  cursor: "pointer",
                }}
              >
                Agregar al carrito
              </button>
            </div>
          ))}
        </div>

        <div
          style={{
            backgroundColor: "#f0fdf4",
            border: "1px solid #86efac",
            borderRadius: "0.5rem",
            padding: "1rem",
            color: "#166534",
          }}
        >
          <p style={{ margin: 0 }}>
            ℹ️ Esta es una tienda de prueba. Los productos aparecerán aquí cuando se agreguen.
          </p>
        </div>
      </main>
    </div>
  );
}
