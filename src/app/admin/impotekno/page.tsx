"use client";

import Link from "next/link";

export default function SupplierPanel() {
  const supplier = {
    name: "Impotekno",
    color: "#3b82f6",
    products: 447,
  };

  const options = [
    { title: "🕷️ Scraping", description: "Ejecutar scraper para importar productos", action: "scrape", color: "#ef4444" },
    { title: "📝 Editar Productos", description: "Modificar datos de productos existentes", action: "edit", color: "#3b82f6" },
    { title: "💰 Ajustar Margen", description: "Cambiar porcentaje de ganancia", action: "margin", color: "#f59e0b" },
    { title: "➕ Agregar Producto", description: "Crear nuevo producto manualmente", action: "add", color: "#10b981" },
    { title: "📤 Importar CSV", description: "Cargar productos desde archivo", action: "import", color: "#8b5cf6" },
    { title: "🗑️ Eliminar Productos", description: "Remover productos del catálogo", action: "delete", color: "#ef4444" },
  ];

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#0f172a", color: "white" }}>
      <header style={{ background: `linear-gradient(135deg, ${supplier.color}80 0%, #0f172a 100%)`, borderBottom: `2px solid ${supplier.color}`, padding: "2rem 1rem" }}>
        <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
          <Link href="/admin" style={{ textDecoration: "none", color: "white", cursor: "pointer" }}>
            <div style={{ fontSize: "0.875rem", color: "#94a3b8", marginBottom: "0.5rem" }}>← Volver a Panel Principal</div>
          </Link>
          <h1 style={{ margin: 0, fontSize: "2.5rem", fontWeight: "bold" }}>
            📱 Gestión de Impotekno
          </h1>
          <p style={{ margin: "0.5rem 0 0 0", color: "#94a3b8" }}>
            {supplier.products.toLocaleString()} productos en catálogo
          </p>
        </div>
      </header>

      <main style={{ maxWidth: "1200px", margin: "0 auto", padding: "3rem 1rem" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "2rem" }}>
          {options.map((opt) => (
            <button
              key={opt.action}
              onClick={() => alert(`${opt.title} - En desarrollo`)}
              style={{
                backgroundColor: "#1e293b",
                border: `2px solid ${opt.color}30`,
                borderRadius: "1rem",
                padding: "2rem",
                cursor: "pointer",
                transition: "all 0.3s",
                color: "white",
                textAlign: "left",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = opt.color;
                e.currentTarget.style.backgroundColor = "#0f172a";
                e.currentTarget.style.boxShadow = `0 0 30px ${opt.color}40`;
                e.currentTarget.style.transform = "translateY(-4px)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = `${opt.color}30`;
                e.currentTarget.style.backgroundColor = "#1e293b";
                e.currentTarget.style.boxShadow = "none";
                e.currentTarget.style.transform = "translateY(0)";
              }}
            >
              <div style={{ fontSize: "2rem", marginBottom: "1rem" }}>{opt.title.split(" ")[0]}</div>
              <h3 style={{ margin: "0 0 0.5rem 0", fontSize: "1.125rem", color: opt.color }}>
                {opt.title.split(" ").slice(1).join(" ")}
              </h3>
              <p style={{ margin: 0, color: "#cbd5e1", fontSize: "0.875rem" }}>
                {opt.description}
              </p>
            </button>
          ))}
        </div>
      </main>
    </div>
  );
}
