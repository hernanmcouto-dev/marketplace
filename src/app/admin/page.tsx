"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function AdminPage() {
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
          backgroundColor: "#ef4444",
          color: "white",
          padding: "1rem",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <h1 style={{ margin: 0, fontSize: "1.5rem" }}>🔐 Panel de Administrador</h1>
        <button
          onClick={handleLogout}
          style={{
            backgroundColor: "#dc2626",
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
        <h2 style={{ fontSize: "1.875rem", marginBottom: "2rem" }}>Panel de Control 🎛️</h2>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
            gap: "1.5rem",
            marginBottom: "2rem",
          }}
        >
          {/* Dashboard Cards */}
          <div
            style={{
              backgroundColor: "white",
              border: "1px solid #e5e7eb",
              borderRadius: "0.5rem",
              padding: "1.5rem",
            }}
          >
            <div style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>📦</div>
            <h3 style={{ margin: "0 0 0.5rem 0" }}>Productos</h3>
            <p style={{ color: "#3b82f6", fontSize: "1.5rem", margin: 0, fontWeight: "bold" }}>0</p>
            <p style={{ color: "#6b7280", fontSize: "0.875rem", margin: "0.5rem 0 0 0" }}>
              Gestionar inventario
            </p>
          </div>

          <div
            style={{
              backgroundColor: "white",
              border: "1px solid #e5e7eb",
              borderRadius: "0.5rem",
              padding: "1.5rem",
            }}
          >
            <div style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>📊</div>
            <h3 style={{ margin: "0 0 0.5rem 0" }}>Órdenes</h3>
            <p style={{ color: "#10b981", fontSize: "1.5rem", margin: 0, fontWeight: "bold" }}>0</p>
            <p style={{ color: "#6b7280", fontSize: "0.875rem", margin: "0.5rem 0 0 0" }}>
              Ver pedidos
            </p>
          </div>

          <div
            style={{
              backgroundColor: "white",
              border: "1px solid #e5e7eb",
              borderRadius: "0.5rem",
              padding: "1.5rem",
            }}
          >
            <div style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>💰</div>
            <h3 style={{ margin: "0 0 0.5rem 0" }}>Ventas</h3>
            <p style={{ color: "#f59e0b", fontSize: "1.5rem", margin: 0, fontWeight: "bold" }}>
              $0.00
            </p>
            <p style={{ color: "#6b7280", fontSize: "0.875rem", margin: "0.5rem 0 0 0" }}>
              Hoy
            </p>
          </div>

          <div
            style={{
              backgroundColor: "white",
              border: "1px solid #e5e7eb",
              borderRadius: "0.5rem",
              padding: "1.5rem",
            }}
          >
            <div style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>👥</div>
            <h3 style={{ margin: "0 0 0.5rem 0" }}>Clientes</h3>
            <p style={{ color: "#8b5cf6", fontSize: "1.5rem", margin: 0, fontWeight: "bold" }}>0</p>
            <p style={{ color: "#6b7280", fontSize: "0.875rem", margin: "0.5rem 0 0 0" }}>
              Usuarios activos
            </p>
          </div>
        </div>

        {/* Admin Tasks */}
        <div style={{ backgroundColor: "#f9fafb", borderRadius: "0.5rem", padding: "1.5rem" }}>
          <h3 style={{ marginTop: 0, marginBottom: "1rem" }}>Opciones de Administración</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            <Link href="/admin/scraper" style={{ textDecoration: "none" }}>
              <button
                style={{
                  width: "100%",
                  padding: "0.75rem 1rem",
                  backgroundColor: "#ef4444",
                  color: "white",
                  border: "none",
                  borderRadius: "0.375rem",
                  cursor: "pointer",
                  textAlign: "left",
                  fontWeight: "500",
                }}
              >
                🕷️ Web Scraper - Impotekno
              </button>
            </Link>
            <Link href="/admin/scraper-sanjulian" style={{ textDecoration: "none" }}>
              <button
                style={{
                  width: "100%",
                  padding: "0.75rem 1rem",
                  backgroundColor: "#dc2626",
                  color: "white",
                  border: "none",
                  borderRadius: "0.375rem",
                  cursor: "pointer",
                  textAlign: "left",
                  fontWeight: "500",
                }}
              >
                🕷️ Web Scraper - San Julián
              </button>
            </Link>
            <Link href="/admin/scraper-nextcell" style={{ textDecoration: "none" }}>
              <button
                style={{
                  width: "100%",
                  padding: "0.75rem 1rem",
                  backgroundColor: "#0891b2",
                  color: "white",
                  border: "none",
                  borderRadius: "0.375rem",
                  cursor: "pointer",
                  textAlign: "left",
                  fontWeight: "500",
                }}
              >
                🕷️ Web Scraper - NextCell
              </button>
            </Link>
            <Link href="/admin/productos" style={{ textDecoration: "none" }}>
              <button
                style={{
                  width: "100%",
                  padding: "0.75rem 1rem",
                  backgroundColor: "#8b5cf6",
                  color: "white",
                  border: "none",
                  borderRadius: "0.375rem",
                  cursor: "pointer",
                  textAlign: "left",
                  fontWeight: "500",
                }}
              >
                📋 Gestionar Productos
              </button>
            </Link>
            <Link href="/admin/import-productos" style={{ textDecoration: "none" }}>
              <button
                style={{
                  width: "100%",
                  padding: "0.75rem 1rem",
                  backgroundColor: "#06b6d4",
                  color: "white",
                  border: "none",
                  borderRadius: "0.375rem",
                  cursor: "pointer",
                  textAlign: "left",
                  fontWeight: "500",
                }}
              >
                📥 Importar desde JSON
              </button>
            </Link>
            <Link href="/admin/entrenar-categorias" style={{ textDecoration: "none" }}>
              <button
                style={{
                  width: "100%",
                  padding: "0.75rem 1rem",
                  backgroundColor: "#7c3aed",
                  color: "white",
                  border: "none",
                  borderRadius: "0.375rem",
                  cursor: "pointer",
                  textAlign: "left",
                  fontWeight: "500",
                }}
              >
                🧠 Entrenar Categorías
              </button>
            </Link>
            <Link href="/admin/categorizar" style={{ textDecoration: "none" }}>
              <button
                style={{
                  width: "100%",
                  padding: "0.75rem 1rem",
                  backgroundColor: "#ec4899",
                  color: "white",
                  border: "none",
                  borderRadius: "0.375rem",
                  cursor: "pointer",
                  textAlign: "left",
                  fontWeight: "500",
                }}
              >
                🏷️ Categorizar Todos
              </button>
            </Link>
            <Link href="/admin/entrenar-dudas" style={{ textDecoration: "none" }}>
              <button
                style={{
                  width: "100%",
                  padding: "0.75rem 1rem",
                  backgroundColor: "#dc2626",
                  color: "white",
                  border: "none",
                  borderRadius: "0.375rem",
                  cursor: "pointer",
                  textAlign: "left",
                  fontWeight: "500",
                }}
              >
                🔍 Revisar Productos Dudosos
              </button>
            </Link>
            <Link href="/admin/entrenar-final" style={{ textDecoration: "none" }}>
              <button
                style={{
                  width: "100%",
                  padding: "0.75rem 1rem",
                  backgroundColor: "#059669",
                  color: "white",
                  border: "none",
                  borderRadius: "0.375rem",
                  cursor: "pointer",
                  textAlign: "left",
                  fontWeight: "500",
                }}
              >
                ✅ Validación Final
              </button>
            </Link>
            <button
              style={{
                padding: "0.75rem 1rem",
                backgroundColor: "#3b82f6",
                color: "white",
                border: "none",
                borderRadius: "0.375rem",
                cursor: "pointer",
                textAlign: "left",
              }}
            >
              ➕ Agregar Producto Manual
            </button>
            <button
              style={{
                padding: "0.75rem 1rem",
                backgroundColor: "#10b981",
                color: "white",
                border: "none",
                borderRadius: "0.375rem",
                cursor: "pointer",
                textAlign: "left",
              }}
            >
              📤 Importar Productos (CSV)
            </button>
            <button
              style={{
                padding: "0.75rem 1rem",
                backgroundColor: "#8b5cf6",
                color: "white",
                border: "none",
                borderRadius: "0.375rem",
                cursor: "pointer",
                textAlign: "left",
              }}
            >
              🔧 Configuración de Tienda
            </button>
            <button
              style={{
                padding: "0.75rem 1rem",
                backgroundColor: "#f59e0b",
                color: "white",
                border: "none",
                borderRadius: "0.375rem",
                cursor: "pointer",
                textAlign: "left",
              }}
            >
              📊 Ver Reportes
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
