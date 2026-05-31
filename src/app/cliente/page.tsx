"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import ProductModal from "@/components/ProductModal";
import CartPanel from "@/components/CartPanel";
import { useCart } from "@/lib/CartContext";

interface Product {
  sku: string;
  name: string;
  unit_price: number;
  units_per_package?: number;
  image_url?: string;
}

export default function ClientePage() {
  const router = useRouter();
  const { itemCount } = useCart();
  const [products, setProducts] = useState<Product[]>([]);
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [suggestions, setSuggestions] = useState<Product[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [showCart, setShowCart] = useState(false);

  useEffect(() => {
    loadProducts();
  }, []);

  useEffect(() => {
    if (search.trim()) {
      const searchLower = search.toLowerCase();
      const filtered = allProducts.filter(
        (p) =>
          p.name?.toLowerCase().includes(searchLower) ||
          p.sku?.toLowerCase().includes(searchLower)
      );
      setSuggestions(filtered.slice(0, 8)); // Mostrar máximo 8 sugerencias
      setProducts(filtered); // ✅ Actualizar también los productos mostrados
      setShowSuggestions(true);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
      setProducts(allProducts.slice(0, 50)); // Mostrar primeros 50 si está vacío
    }
  }, [search, allProducts]);

  const loadProducts = async () => {
    try {
      const response = await fetch("/api/productos?limit=10000"); // Cargar TODOS los productos
      const data = await response.json();
      if (data.products) {
        setAllProducts(data.products);
        setProducts(data.products.slice(0, 50)); // Mostrar primeros 50
        setTotalCount(data.total);
      }
    } catch (err) {
      console.error("Error loading products:", err);
    } finally {
      setLoading(false);
    }
  };

  const selectSuggestion = (product: Product) => {
    setSearch(product.name);
    const filtered = allProducts.filter((p) =>
      p.name?.toLowerCase().includes(product.name.toLowerCase())
    );
    setProducts(filtered);
    setShowSuggestions(false);
  };

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  };

  const openProductModal = (product: Product) => {
    setSelectedProduct(product);
    setShowModal(true);
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      {/* Header */}
      <nav
        style={{
          position: "sticky",
          top: 0,
          zIndex: 40,
          backgroundColor: "#3b82f6",
          color: "white",
          padding: "0.75rem 1rem",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <h1 style={{ margin: 0, fontSize: "1.5rem" }}>📦 Tienda</h1>
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <span style={{ fontSize: "0.875rem" }}>{products.length} productos</span>
          <button
            onClick={() => setShowCart(!showCart)}
            style={{
              position: "relative",
              backgroundColor: "#1e40af",
              color: "white",
              border: "none",
              padding: "0.5rem 1rem",
              borderRadius: "0.375rem",
              cursor: "pointer",
              fontSize: "1.25rem",
            }}
          >
            🛒
            {itemCount > 0 && (
              <span
                style={{
                  position: "absolute",
                  top: "-0.5rem",
                  right: "-0.5rem",
                  backgroundColor: "#ef4444",
                  color: "white",
                  borderRadius: "50%",
                  width: "1.5rem",
                  height: "1.5rem",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "0.75rem",
                  fontWeight: "bold",
                }}
              >
                {itemCount}
              </span>
            )}
          </button>
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
      <main style={{ flex: 1, maxWidth: "80rem", margin: "0 auto", width: "100%" }}>
        {/* Google-style Search Bar - Sticky */}
        <div style={{
          position: "sticky",
          top: "3.8rem",
          zIndex: 30,
          backgroundColor: "white",
          padding: "0.5rem 1rem",
          borderBottom: "1px solid #e5e7eb",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          width: "100%"
        }}>
          <div style={{ position: "relative", width: "100%", maxWidth: "500px" }}>
            <div style={{ display: "flex", gap: "0.5rem" }}>
              <input
                type="text"
                placeholder="🔍 Buscar..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onFocus={() => search && setShowSuggestions(true)}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                style={{
                  flex: 1,
                  padding: "0.4rem 0.75rem",
                  fontSize: "0.85rem",
                  border: "1px solid #d1d5db",
                  borderRadius: "0.375rem",
                  fontFamily: "inherit",
                  boxShadow: search ? "0 4px 6px rgba(0,0,0,0.1)" : "none",
                  transition: "all 0.2s",
                }}
              />
            </div>

            {/* Suggestions Dropdown */}
            {showSuggestions && suggestions.length > 0 && (
              <div
                style={{
                  position: "absolute",
                  top: "100%",
                  left: 0,
                  right: 0,
                  backgroundColor: "white",
                  border: "1px solid #d1d5db",
                  borderTop: "none",
                  borderRadius: "0 0 0.375rem 0.375rem",
                  boxShadow: "0 4px 6px rgba(0,0,0,0.1)",
                  zIndex: 10,
                  maxHeight: "300px",
                  overflowY: "auto",
                }}
              >
                {suggestions.map((product) => (
                  <div
                    key={product.sku}
                    onClick={() => selectSuggestion(product)}
                    style={{
                      padding: "0.75rem 1rem",
                      borderBottom: "1px solid #f3f4f6",
                      cursor: "pointer",
                      transition: "background-color 0.2s",
                    }}
                    onMouseOver={(e) =>
                      (e.currentTarget.style.backgroundColor = "#f3f4f6")
                    }
                    onMouseOut={(e) =>
                      (e.currentTarget.style.backgroundColor = "white")
                    }
                  >
                    <div style={{ fontSize: "0.875rem", fontWeight: "500", color: "#1f2937" }}>
                      {product.name}
                    </div>
                    <div style={{ fontSize: "0.75rem", color: "#6b7280" }}>
                      {product.sku} • ${product.unit_price.toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {search && !showSuggestions && (
            <p style={{ margin: "0.5rem 0 0 0", color: "#6b7280", fontSize: "0.75rem" }}>
              Mostrando {products.length} productos
            </p>
          )}
        </div>

        {/* Content Area */}
        <div style={{ padding: "1.5rem 2rem" }}>
          <h2 style={{ fontSize: "1.5rem", marginBottom: "0.75rem" }}>Bienvenido, Cliente 👋</h2>

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
                  onClick={() => openProductModal(product)}
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
                    onClick={(e) => {
                      e.stopPropagation();
                      openProductModal(product);
                    }}
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
                    🛒 Ver detalles
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
        </div>
      </main>

      {/* Product Detail Modal */}
      <ProductModal product={selectedProduct} onClose={() => {
        setShowModal(false);
        setSelectedProduct(null);
      }} />

      {/* Shopping Cart Panel */}
      <CartPanel isOpen={showCart} onClose={() => setShowCart(false)} />
    </div>
  );
}
