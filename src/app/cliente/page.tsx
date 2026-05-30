"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

interface Product {
  sku: string;
  name: string;
  unit_price: number;
  units_per_package?: number;
  image_url?: string;
}

export default function ClientePage() {
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [totalCount, setTotalCount] = useState(0);

  useEffect(() => {
    loadProducts();
  }, []);

  useEffect(() => {
    filterAndSearch();
  }, [search, filter]);

  const loadProducts = async () => {
    try {
      const response = await fetch("/api/productos?limit=100");
      const data = await response.json();
      if (data.products) {
        setProducts(data.products);
        setAllProducts(data.products);
        setTotalCount(data.total);
      }
    } catch (err) {
      console.error("Error loading products:", err);
    } finally {
      setLoading(false);
    }
  };

  const filterAndSearch = () => {
    let filtered = allProducts;

    // Filtrar por proveedor
    if (filter !== "all") {
      filtered = filtered.filter((p) => p.sku.startsWith(filter));
    }

    // Filtrar por búsqueda
    if (search.trim()) {
      const searchLower = search.toLowerCase();
      filtered = filtered.filter(
        (p) =>
          p.name?.toLowerCase().includes(searchLower) ||
          p.sku?.toLowerCase().includes(searchLower)
      );
    }

    setProducts(filtered);
  };

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  };

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
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <span style={{ fontSize: "0.875rem" }}>{products.length} productos</span>
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
        </div>
      </nav>

      {/* Main Content */}
      <main style={{ flex: 1, padding: "2rem", maxWidth: "80rem", margin: "0 auto", width: "100%" }}>
        <h2 style={{ fontSize: "1.875rem", marginBottom: "1rem" }}>Bienvenido, Cliente 👋</h2>

        {/* Search Bar */}
        <div style={{ marginBottom: "1.5rem" }}>
          <div style={{ display: "flex", gap: "0.5rem", maxWidth: "50%", marginBottom: "1rem" }}>
            <input
              type="text"
              placeholder="Buscar producto..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && filterAndSearch()}
              style={{
                flex: 1,
                padding: "0.5rem 0.75rem",
                fontSize: "0.875rem",
                border: "1px solid #d1d5db",
                borderRadius: "0.375rem",
                fontFamily: "inherit",
              }}
            />
            <button
              onClick={filterAndSearch}
              style={{
                padding: "0.5rem 0.75rem",
                backgroundColor: "#3b82f6",
                color: "white",
                border: "none",
                borderRadius: "0.375rem",
                cursor: "pointer",
                fontSize: "1rem",
              }}
            >
              🔍
            </button>
          </div>
          {(search || filter !== "all") && (
            <p style={{ margin: 0, color: "#6b7280", fontSize: "0.75rem" }}>
              Mostrando {products.length} de {totalCount} productos
            </p>
          )}
        </div>

        {/* Catalog Filters */}
        <div style={{ marginBottom: "2rem", paddingBottom: "1rem", borderBottom: "1px solid #e5e7eb" }}>
          <p style={{ margin: "0 0 0.5rem 0", fontSize: "0.875rem", color: "#6b7280" }}>Filtrar por proveedor:</p>
          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
            {[
              { label: "Todos", value: "all" },
              { label: "Impotekno", value: "SAR" },
              { label: "San Julián", value: "PAS" },
              { label: "NextCell", value: "PTT" },
            ].map((option) => (
              <button
                key={option.value}
                onClick={() => setFilter(option.value)}
                style={{
                  padding: "0.4rem 0.75rem",
                  fontSize: "0.75rem",
                  backgroundColor: filter === option.value ? "#3b82f6" : "#f3f4f6",
                  color: filter === option.value ? "white" : "#374151",
                  border: "1px solid #d1d5db",
                  borderRadius: "0.375rem",
                  cursor: "pointer",
                  fontWeight: filter === option.value ? "bold" : "normal",
                }}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div style={{ textAlign: "center", padding: "2rem", color: "#6b7280" }}>
            Cargando productos...
          </div>
        ) : products.length === 0 ? (
          <div
            style={{
              backgroundColor: "#fef3c7",
              border: "1px solid #fcd34d",
              borderRadius: "0.5rem",
              padding: "1rem",
              color: "#92400e",
              textAlign: "center",
            }}
          >
            <p style={{ margin: 0 }}>
              📦 No hay productos disponibles. El admin debe ejecutar el scraper primero.
            </p>
          </div>
        ) : (
          <>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
                gap: "1.5rem",
                marginBottom: "2rem",
              }}
            >
              {products.map((product) => (
                <div
                  key={product.sku}
                  style={{
                    backgroundColor: "white",
                    border: "1px solid #e5e7eb",
                    borderRadius: "0.5rem",
                    padding: "1rem",
                    textAlign: "center",
                    transition: "box-shadow 0.2s",
                    cursor: "pointer",
                  }}
                  onMouseOver={(e) => (e.currentTarget.style.boxShadow = "0 10px 15px rgba(0,0,0,0.1)")}
                  onMouseOut={(e) => (e.currentTarget.style.boxShadow = "none")}
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
                      overflow: "hidden",
                    }}
                  >
                    {product.image_url ? (
                      <img
                        src={product.image_url}
                        alt={product.name}
                        style={{ width: "100%", height: "100%", objectFit: "cover" }}
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = "none";
                          const parent = (e.target as HTMLImageElement).parentElement;
                          if (parent) parent.textContent = "📦";
                        }}
                      />
                    ) : (
                      "📦"
                    )}
                  </div>
                  <p style={{ fontSize: "0.75rem", color: "#9ca3af", margin: "0 0 0.5rem 0" }}>
                    {product.sku}
                  </p>
                  <h3 style={{ margin: "0 0 0.5rem 0", fontSize: "0.95rem", fontWeight: "600", minHeight: "2.5rem" }}>
                    {product.name}
                  </h3>
                  <p style={{ color: "#10b981", margin: "0.5rem 0", fontSize: "1.25rem", fontWeight: "bold" }}>
                    ${product.unit_price.toLocaleString("es-AR")}
                  </p>
                  {product.units_per_package && (
                    <p style={{ color: "#6b7280", fontSize: "0.75rem", margin: "0.5rem 0" }}>
                      {product.units_per_package} unidades por bulto
                    </p>
                  )}
                  <button
                    style={{
                      width: "100%",
                      backgroundColor: "#3b82f6",
                      color: "white",
                      border: "none",
                      padding: "0.5rem",
                      borderRadius: "0.375rem",
                      cursor: "pointer",
                      marginTop: "0.75rem",
                      fontWeight: "500",
                    }}
                  >
                    🛒 Agregar al carrito
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
                ✅ {products.length} productos disponibles en la tienda
              </p>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
