"use client";

import Link from "next/link";

export default function AdminHome() {
  const suppliers = [
    {
      name: "Impotekno",
      products: 447,
      color: "#3b82f6",
      icon: "📱",
      href: "/admin/impotekno",
      description: "Electrónica y tecnología",
    },
    {
      name: "San Julián",
      products: 486,
      color: "#10b981",
      icon: "🛍️",
      href: "/admin/sanjulian",
      description: "Productos variados",
    },
    {
      name: "NextCell",
      products: 4668,
      color: "#f59e0b",
      icon: "📦",
      href: "/admin/nextcell",
      description: "Catálogo amplio",
    },
  ];

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#0f172a", color: "white" }}>
      <header style={{ background: "linear-gradient(135deg, #1e293b 0%, #0f172a 100%)", borderBottom: "2px solid #3b82f6", padding: "2rem 1rem" }}>
        <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
          <h1 style={{ margin: 0, fontSize: "2.5rem", fontWeight: "bold" }}>⚙️ Panel de Administración</h1>
          <p style={{ margin: "0.5rem 0 0 0", color: "#94a3b8" }}>Selecciona un proveedor para gestionar sus productos</p>
        </div>
      </header>

      <main style={{ maxWidth: "1200px", margin: "0 auto", padding: "3rem 1rem" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "2rem" }}>
          {suppliers.map((supplier) => (
            <Link key={supplier.name} href={supplier.href} style={{ textDecoration: "none" }}>
              <div
                style={{
                  backgroundColor: "#1e293b",
                  border: `2px solid ${supplier.color}30`,
                  borderRadius: "1rem",
                  padding: "2rem",
                  cursor: "pointer",
                  transition: "all 0.3s",
                  height: "100%",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = supplier.color;
                  e.currentTarget.style.backgroundColor = "#0f172a";
                  e.currentTarget.style.boxShadow = `0 0 30px ${supplier.color}40`;
                  e.currentTarget.style.transform = "translateY(-8px)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = `${supplier.color}30`;
                  e.currentTarget.style.backgroundColor = "#1e293b";
                  e.currentTarget.style.boxShadow = "none";
                  e.currentTarget.style.transform = "translateY(0)";
                }}
              >
                <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>{supplier.icon}</div>
                <h2 style={{ margin: "0 0 0.5rem 0", fontSize: "1.5rem", color: supplier.color }}>
                  {supplier.name}
                </h2>
                <p style={{ margin: "0 0 1.5rem 0", color: "#cbd5e1", fontSize: "0.875rem" }}>
                  {supplier.description}
                </p>
                <div style={{ backgroundColor: "#334155", padding: "1rem", borderRadius: "0.5rem", marginBottom: "1.5rem" }}>
                  <div style={{ fontSize: "0.75rem", color: "#94a3b8", marginBottom: "0.25rem" }}>Productos</div>
                  <div style={{ fontSize: "2rem", fontWeight: "bold", color: supplier.color }}>
                    {supplier.products.toLocaleString()}
                  </div>
                </div>
                <div style={{ color: supplier.color, fontSize: "1.25rem", fontWeight: "bold" }}>
                  Abrir Panel →
                </div>
              </div>
            </Link>
          ))}
        </div>
      </main>
    </div>
  );
}
