"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface Product {
  sku: string;
  name: string;
  unit_price: number;
  units_per_package?: number;
  image_url?: string;
  provider?: string;
}

export default function ProductosAdminPage() {
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");
  const [editingSku, setEditingSku] = useState<string | null>(null);
  const [editData, setEditData] = useState<Partial<Product>>({});
  const [message, setMessage] = useState("");

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    try {
      const response = await fetch("/api/admin/productos");
      const data = await response.json();
      setProducts(data.products || []);
    } catch (err) {
      console.error("Error loading products:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (product: Product) => {
    setEditingSku(product.sku);
    setEditData(product);
  };

  const handleSaveEdit = async () => {
    if (!editingSku) return;

    try {
      const response = await fetch("/api/admin/productos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "update",
          sku: editingSku,
          data: editData,
        }),
      });

      if (response.ok) {
        setMessage("✅ Producto actualizado");
        setEditingSku(null);
        loadProducts();
        setTimeout(() => setMessage(""), 3000);
      }
    } catch (err) {
      setMessage("❌ Error al actualizar");
    }
  };

  const handleDelete = async (sku: string) => {
    if (!confirm(`¿Eliminar producto ${sku}?`)) return;

    try {
      const response = await fetch("/api/admin/productos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "delete",
          sku,
        }),
      });

      if (response.ok) {
        setMessage("✅ Producto eliminado");
        loadProducts();
        setTimeout(() => setMessage(""), 3000);
      }
    } catch (err) {
      setMessage("❌ Error al eliminar");
    }
  };

  const handleDeleteProvider = async (provider: string) => {
    if (!confirm(`¿Eliminar todos los productos de ${provider}? Las imágenes se mantendrán.`)) return;

    try {
      const response = await fetch(`/api/admin/productos?provider=${provider}`, {
        method: "DELETE",
      });

      if (response.ok) {
        const data = await response.json();
        setMessage(`✅ ${data.message}`);
        loadProducts();
        setTimeout(() => setMessage(""), 3000);
      }
    } catch (err) {
      setMessage("❌ Error al eliminar");
    }
  };

  const filteredProducts = products.filter(
    (p) =>
      p.name.toLowerCase().includes(filter.toLowerCase()) ||
      p.sku.toLowerCase().includes(filter.toLowerCase())
  );

  const providers = [...new Set(products.map((p) => p.provider || "Sin proveedor"))];

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
        <Link href="/admin" style={{ textDecoration: "none" }}>
          <button
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
        </Link>
      </nav>

      {/* Main Content */}
      <main style={{ flex: 1, padding: "2rem", maxWidth: "1200px", margin: "0 auto", width: "100%" }}>
        <h2 style={{ fontSize: "1.875rem", marginBottom: "1rem" }}>📦 Gestionar Productos</h2>

        {message && (
          <div
            style={{
              marginBottom: "1rem",
              padding: "0.75rem",
              backgroundColor: message.startsWith("✅") ? "#d1fae5" : "#fee2e2",
              color: message.startsWith("✅") ? "#065f46" : "#991b1b",
              borderRadius: "0.375rem",
            }}
          >
            {message}
          </div>
        )}

        {/* Stats */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1rem", marginBottom: "2rem" }}>
          <div style={{ backgroundColor: "white", padding: "1rem", borderRadius: "0.5rem", border: "1px solid #e5e7eb" }}>
            <p style={{ margin: 0, color: "#6b7280", fontSize: "0.875rem" }}>Total Productos</p>
            <p style={{ margin: "0.5rem 0 0 0", fontSize: "1.875rem", fontWeight: "bold", color: "#3b82f6" }}>
              {products.length}
            </p>
          </div>
          <div style={{ backgroundColor: "white", padding: "1rem", borderRadius: "0.5rem", border: "1px solid #e5e7eb" }}>
            <p style={{ margin: 0, color: "#6b7280", fontSize: "0.875rem" }}>Proveedores</p>
            <p style={{ margin: "0.5rem 0 0 0", fontSize: "1.875rem", fontWeight: "bold", color: "#10b981" }}>
              {providers.length}
            </p>
          </div>
        </div>

        {/* Filters */}
        <div style={{ marginBottom: "2rem" }}>
          <input
            type="text"
            placeholder="Buscar por SKU o nombre..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            style={{
              width: "100%",
              padding: "0.75rem",
              border: "1px solid #d1d5db",
              borderRadius: "0.375rem",
              fontSize: "1rem",
            }}
          />
        </div>

        {/* Provider Actions */}
        {providers.length > 0 && (
          <div style={{ marginBottom: "2rem", padding: "1rem", backgroundColor: "#f9fafb", borderRadius: "0.5rem" }}>
            <p style={{ margin: "0 0 1rem 0", fontWeight: "500" }}>Acciones por Proveedor:</p>
            <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
              {providers.map((provider) => (
                <button
                  key={provider}
                  onClick={() => handleDeleteProvider(provider)}
                  style={{
                    padding: "0.5rem 1rem",
                    backgroundColor: "#ef4444",
                    color: "white",
                    border: "none",
                    borderRadius: "0.375rem",
                    cursor: "pointer",
                    fontSize: "0.875rem",
                  }}
                >
                  🗑️ Limpiar {provider}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Products Table */}
        {loading ? (
          <div style={{ textAlign: "center", padding: "2rem", color: "#6b7280" }}>
            Cargando productos...
          </div>
        ) : filteredProducts.length === 0 ? (
          <div
            style={{
              textAlign: "center",
              padding: "2rem",
              backgroundColor: "#f3f4f6",
              borderRadius: "0.5rem",
              color: "#6b7280",
            }}
          >
            No hay productos para mostrar
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                backgroundColor: "white",
                borderRadius: "0.5rem",
                boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
              }}
            >
              <thead>
                <tr style={{ backgroundColor: "#f9fafb", borderBottom: "1px solid #e5e7eb" }}>
                  <th style={{ padding: "1rem", textAlign: "left", fontWeight: "600" }}>SKU</th>
                  <th style={{ padding: "1rem", textAlign: "left", fontWeight: "600" }}>Nombre</th>
                  <th style={{ padding: "1rem", textAlign: "left", fontWeight: "600" }}>Proveedor</th>
                  <th style={{ padding: "1rem", textAlign: "left", fontWeight: "600" }}>Precio</th>
                  <th style={{ padding: "1rem", textAlign: "left", fontWeight: "600" }}>Bulto</th>
                  <th style={{ padding: "1rem", textAlign: "center", fontWeight: "600" }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filteredProducts.map((product, idx) => (
                  <tr
                    key={product.sku}
                    style={{
                      borderBottom: "1px solid #e5e7eb",
                      backgroundColor: editingSku === product.sku ? "#eff6ff" : idx % 2 === 0 ? "#f9fafb" : "white",
                    }}
                  >
                    <td style={{ padding: "1rem" }}>
                      <code style={{ backgroundColor: "#f3f4f6", padding: "0.25rem 0.5rem", borderRadius: "0.25rem" }}>
                        {product.sku}
                      </code>
                    </td>
                    <td style={{ padding: "1rem", maxWidth: "300px" }}>
                      {editingSku === product.sku ? (
                        <input
                          type="text"
                          value={editData.name || ""}
                          onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                          style={{
                            width: "100%",
                            padding: "0.5rem",
                            border: "1px solid #d1d5db",
                            borderRadius: "0.375rem",
                          }}
                        />
                      ) : (
                        product.name
                      )}
                    </td>
                    <td style={{ padding: "1rem" }}>{product.provider || "—"}</td>
                    <td style={{ padding: "1rem" }}>
                      {editingSku === product.sku ? (
                        <input
                          type="number"
                          value={editData.unit_price || 0}
                          onChange={(e) => setEditData({ ...editData, unit_price: parseInt(e.target.value) })}
                          style={{
                            width: "120px",
                            padding: "0.5rem",
                            border: "1px solid #d1d5db",
                            borderRadius: "0.375rem",
                          }}
                        />
                      ) : (
                        `$${product.unit_price.toLocaleString("es-AR")}`
                      )}
                    </td>
                    <td style={{ padding: "1rem" }}>{product.units_per_package || "—"}</td>
                    <td style={{ padding: "1rem", textAlign: "center" }}>
                      {editingSku === product.sku ? (
                        <div style={{ display: "flex", gap: "0.5rem", justifyContent: "center" }}>
                          <button
                            onClick={handleSaveEdit}
                            style={{
                              padding: "0.4rem 0.8rem",
                              backgroundColor: "#10b981",
                              color: "white",
                              border: "none",
                              borderRadius: "0.375rem",
                              cursor: "pointer",
                              fontSize: "0.875rem",
                            }}
                          >
                            Guardar
                          </button>
                          <button
                            onClick={() => setEditingSku(null)}
                            style={{
                              padding: "0.4rem 0.8rem",
                              backgroundColor: "#6b7280",
                              color: "white",
                              border: "none",
                              borderRadius: "0.375rem",
                              cursor: "pointer",
                              fontSize: "0.875rem",
                            }}
                          >
                            Cancelar
                          </button>
                        </div>
                      ) : (
                        <div style={{ display: "flex", gap: "0.5rem", justifyContent: "center" }}>
                          <button
                            onClick={() => handleEdit(product)}
                            style={{
                              padding: "0.4rem 0.8rem",
                              backgroundColor: "#3b82f6",
                              color: "white",
                              border: "none",
                              borderRadius: "0.375rem",
                              cursor: "pointer",
                              fontSize: "0.875rem",
                            }}
                          >
                            ✏️ Editar
                          </button>
                          <button
                            onClick={() => handleDelete(product.sku)}
                            style={{
                              padding: "0.4rem 0.8rem",
                              backgroundColor: "#ef4444",
                              color: "white",
                              border: "none",
                              borderRadius: "0.375rem",
                              cursor: "pointer",
                              fontSize: "0.875rem",
                            }}
                          >
                            🗑️ Eliminar
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div
          style={{
            marginTop: "2rem",
            padding: "1rem",
            backgroundColor: "#f0fdf4",
            border: "1px solid #86efac",
            borderRadius: "0.5rem",
            color: "#166534",
            fontSize: "0.875rem",
          }}
        >
          <p style={{ margin: "0 0 0.5rem 0", fontWeight: "500" }}>📝 Notas sobre scrapers:</p>
          <ul style={{ margin: "0.5rem 0 0 1.5rem", paddingLeft: 0 }}>
            <li>Al ejecutar scraper, los productos anteriores del proveedor se eliminan</li>
            <li>Las imágenes se reutilizan si el SKU es el mismo</li>
            <li>Las imágenes nuevas se descargan solo para productos nuevos</li>
            <li>Puedes editar precio, nombre y cantidad por bulto</li>
          </ul>
        </div>
      </main>
    </div>
  );
}
