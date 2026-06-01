"use client";

import { useState, useEffect } from "react";
import { CATEGORY_LIST } from "@/lib/product-categorizer";

interface Product {
  sku: string;
  name: string;
  unit_price: number;
  units_per_package: number;
  image_url: string;
  category: string;
  supplier?: "impotekno" | "sanjulian" | "nextcell" | "nodo";
}

export default function ShopPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [supplier, setSupplier] = useState<"impotekno" | "sanjulian" | "nextcell" | "nodo" | "todos">("todos");
  const [sortBy, setSortBy] = useState<"nombre" | "precio-asc" | "precio-desc">("nombre");
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 1000000]);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    loadProducts();
  }, [supplier]);

  const loadProducts = async () => {
    setLoading(true);
    try {
      if (supplier === "todos") {
        // Cargar todos los depósitos
        const [azul, verde, rojo, amarillo] = await Promise.all([
          fetch("/products.json").then(r => r.json()),
          fetch("/products-sanjulian.json").then(r => r.json()),
          fetch("/products-nextcell.json").then(r => r.json()),
          fetch("/products-nodo.json").then(r => r.json()),
        ]);

        const allProducts = [
          ...azul.map((p: any) => ({ ...p, supplier: "impotekno" as const })),
          ...verde.map((p: any) => ({ ...p, supplier: "sanjulian" as const })),
          ...rojo.map((p: any) => ({ ...p, supplier: "nextcell" as const })),
          ...amarillo.map((p: any) => ({ ...p, supplier: "nodo" as const })),
        ];

        setProducts(allProducts);
      } else {
        const filename =
          supplier === "impotekno" ? "products.json" :
          supplier === "sanjulian" ? "products-sanjulian.json" :
          supplier === "nextcell" ? "products-nextcell.json" :
          "products-nodo.json";
        const response = await fetch(`/${filename}`);
        if (!response.ok) throw new Error("Error cargando productos");
        const data = await response.json();
        setProducts(data.map((p: any) => ({ ...p, supplier })));
      }
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  };

  // Contar productos por categoría
  const categoryCounts: Record<string, number> = {};
  products.forEach((p) => {
    categoryCounts[p.category] = (categoryCounts[p.category] || 0) + 1;
  });

  // Función de búsqueda mejorada
  const searchProducts = (products: Product[], term: string) => {
    if (!term.trim()) return products;

    const lowerTerm = term.toLowerCase();
    const searchWords = lowerTerm.split(/\s+/).filter(w => w.length > 0);

    return products
      .map((product) => {
        const nameLower = product.name.toLowerCase();
        const skuLower = product.sku.toLowerCase();

        let score = 0;

        // Búsqueda exacta en SKU (máxima prioridad)
        if (skuLower === lowerTerm) {
          score += 1000;
        } else if (skuLower.includes(lowerTerm)) {
          score += 500;
        }

        // Búsqueda de palabras completas en nombre
        searchWords.forEach((word) => {
          const words = nameLower.split(/[\s\-().,/]+/);
          if (words.includes(word)) {
            score += 100;
          } else if (nameLower.includes(word)) {
            // Subcadena en nombre (menor prioridad)
            score += 10;
          }
        });

        return { product, score };
      })
      .filter(({ score }) => score > 0)
      .sort((a, b) => b.score - a.score)
      .map(({ product }) => product);
  };

  // Filtrar y ordenar productos
  let filtered = products.filter((p) => {
    const matchCategory = !selectedCategory || p.category === selectedCategory;
    const matchPrice = p.unit_price >= priceRange[0] && p.unit_price <= priceRange[1];
    return matchCategory && matchPrice;
  });

  // Aplicar búsqueda mejorada
  filtered = searchProducts(filtered, searchTerm);

  // Ordenar
  if (sortBy === "precio-asc") {
    filtered.sort((a, b) => a.unit_price - b.unit_price);
  } else if (sortBy === "precio-desc") {
    filtered.sort((a, b) => b.unit_price - a.unit_price);
  } else {
    filtered.sort((a, b) => a.name.localeCompare(b.name));
  }

  const SUPPLIER_COLORS: Record<string, { name: string; color: string }> = {
    impotekno: { name: "Depósito Azul", color: "#3b82f6" },
    sanjulian: { name: "Depósito Verde", color: "#10b981" },
    nextcell: { name: "Depósito Rojo", color: "#ef4444" },
    nodo: { name: "Depósito Amarillo", color: "#fbbf24" },
  };

  const COLORS: Record<string, string> = {
    "Hogar y Cocina": "#ef4444",
    "Herramientas y Electricidad": "#f97316",
    "Iluminación y LED": "#eab308",
    "Audio Video y Parlantes": "#3b82f6",
    "Electrónica y Computación": "#8b5cf6",
    "Juegos Juguetes y Librería": "#ec4899",
    "Gadgets": "#06b6d4",
    "Bazar y Camping": "#10b981",
    "Indumentaria y Textiles": "#f43f5e",
    "Cuidado Personal y Cosmética": "#d946ef",
    "Cables y Conectores": "#6366f1",
    "Seguridad y Cámaras": "#14b8a6",
    "Cargadores y Fuentes": "#ca8a04",
    "Accesorios para Celulares": "#0891b2",
    "Accesorios Auto Moto y Bici": "#7c2d12",
    "Liquidación": "#64748b",
    "Próximo a Ingresar": "#78716c",
  };

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#0f172a" }}>
      {/* Header Premium */}
      <header
        style={{
          background: "linear-gradient(135deg, #1e293b 0%, #0f172a 100%)",
          color: "white",
          padding: "2rem 1rem",
          borderBottom: "2px solid #3b82f6",
        }}
      >
        <div style={{ maxWidth: "1400px", margin: "0 auto" }}>
          <h1 style={{ margin: "0 0 0.5rem 0", fontSize: "2.5rem", fontWeight: "bold" }}>
            🛍️ Planeta Once Marketplace
          </h1>
          <p style={{ margin: 0, fontSize: "1.125rem", color: "#cbd5e1" }}>
            Descubre {products.length} productos categorizados inteligentemente
          </p>
        </div>
      </header>

      {/* Main Content */}
      <main style={{ padding: "2rem 1rem", maxWidth: "1400px", margin: "0 auto" }}>
        {/* Toolbar */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
            gap: "1.5rem",
            marginBottom: "2rem",
            backgroundColor: "#1e293b",
            padding: "1.5rem",
            borderRadius: "0.75rem",
            border: "1px solid #334155",
          }}
        >
          {/* Search */}
          <div>
            <label style={{ display: "block", marginBottom: "0.5rem", color: "#e2e8f0", fontWeight: "500" }}>
              🔍 Buscar
            </label>
            <input
              type="text"
              placeholder="Nombre o SKU..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                width: "100%",
                padding: "0.75rem",
                borderRadius: "0.5rem",
                border: "1px solid #475569",
                backgroundColor: "#0f172a",
                color: "white",
                fontSize: "1rem",
              }}
            />
          </div>

          {/* Supplier */}
          <div>
            <label style={{ display: "block", marginBottom: "0.5rem", color: "#e2e8f0", fontWeight: "500" }}>
              🏪 Proveedor
            </label>
            <select
              value={supplier}
              onChange={(e) => setSupplier(e.target.value as "impotekno" | "sanjulian" | "nextcell" | "todos")}
              style={{
                width: "100%",
                padding: "0.75rem",
                borderRadius: "0.5rem",
                border: "1px solid #475569",
                backgroundColor: "#0f172a",
                color: "white",
                cursor: "pointer",
              }}
            >
              <option value="todos">🏢 Todos los Depósitos</option>
              <option value="impotekno">🔵 Depósito Azul</option>
              <option value="sanjulian">🟢 Depósito Verde</option>
              <option value="nextcell">🔴 Depósito Rojo</option>
              <option value="nodo">🟡 Depósito Amarillo</option>
            </select>
          </div>

          {/* Sort */}
          <div>
            <label style={{ display: "block", marginBottom: "0.5rem", color: "#e2e8f0", fontWeight: "500" }}>
              📊 Ordenar
            </label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              style={{
                width: "100%",
                padding: "0.75rem",
                borderRadius: "0.5rem",
                border: "1px solid #475569",
                backgroundColor: "#0f172a",
                color: "white",
                cursor: "pointer",
              }}
            >
              <option value="nombre">Nombre (A-Z)</option>
              <option value="precio-asc">Precio (Menor a Mayor)</option>
              <option value="precio-desc">Precio (Mayor a Menor)</option>
            </select>
          </div>

          {/* Price Range */}
          <div>
            <label style={{ display: "block", marginBottom: "0.5rem", color: "#e2e8f0", fontWeight: "500" }}>
              💰 Precio Máx: ${priceRange[1].toLocaleString("es-AR")}
            </label>
            <input
              type="range"
              min="0"
              max="1000000"
              step="10000"
              value={priceRange[1]}
              onChange={(e) => setPriceRange([priceRange[0], parseInt(e.target.value)])}
              style={{ width: "100%", cursor: "pointer" }}
            />
          </div>
        </div>

        {/* Categories Grid */}
        <div style={{ marginBottom: "3rem" }}>
          <h2 style={{ color: "white", marginBottom: "1rem" }}>📂 Categorías ({CATEGORY_LIST.length})</h2>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))",
              gap: "1rem",
            }}
          >
            <button
              onClick={() => setSelectedCategory(null)}
              style={{
                padding: "1rem",
                backgroundColor: !selectedCategory ? "#3b82f6" : "#1e293b",
                border: `2px solid ${!selectedCategory ? "#3b82f6" : "#475569"}`,
                borderRadius: "0.5rem",
                cursor: "pointer",
                fontWeight: "600",
                color: "white",
                transition: "all 0.2s",
              }}
              onMouseOver={(e) => {
                if (selectedCategory) {
                  (e.target as HTMLButtonElement).style.backgroundColor = "#334155";
                }
              }}
              onMouseOut={(e) => {
                if (selectedCategory) {
                  (e.target as HTMLButtonElement).style.backgroundColor = "#1e293b";
                }
              }}
            >
              <div>Todas</div>
              <div style={{ fontSize: "1.5rem", marginTop: "0.5rem" }}>{products.length}</div>
            </button>

            {CATEGORY_LIST.map((category) => {
              const count = categoryCounts[category] || 0;
              const color = COLORS[category] || "#6b7280";
              const isSelected = selectedCategory === category;

              return (
                <button
                  key={category}
                  onClick={() => setSelectedCategory(isSelected ? null : category)}
                  style={{
                    padding: "1rem",
                    backgroundColor: isSelected ? color : "#1e293b",
                    border: `2px solid ${color}`,
                    borderRadius: "0.5rem",
                    cursor: "pointer",
                    fontWeight: "600",
                    color: isSelected ? "white" : color,
                    transition: "all 0.2s",
                    minHeight: "100px",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "center",
                    alignItems: "center",
                    textAlign: "center",
                    fontSize: "0.875rem",
                  }}
                  onMouseOver={(e) => {
                    if (!isSelected) {
                      (e.target as HTMLButtonElement).style.backgroundColor = `${color}15`;
                      (e.target as HTMLButtonElement).style.transform = "scale(1.05)";
                    }
                  }}
                  onMouseOut={(e) => {
                    if (!isSelected) {
                      (e.target as HTMLButtonElement).style.backgroundColor = "#1e293b";
                      (e.target as HTMLButtonElement).style.transform = "scale(1)";
                    }
                  }}
                >
                  <div>{category}</div>
                  <div style={{ fontSize: "1.5rem", fontWeight: "bold", marginTop: "0.5rem" }}>
                    {count}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Products Grid */}
        <div>
          <div style={{ marginBottom: "1.5rem", color: "#e2e8f0" }}>
            <h2 style={{ margin: "0 0 0.5rem 0" }}>
              📦 {selectedCategory || "Todos los"} Productos ({filtered.length})
            </h2>
          </div>

          {loading ? (
            <div style={{ textAlign: "center", color: "#cbd5e1", padding: "2rem" }}>
              ⏳ Cargando productos...
            </div>
          ) : filtered.length > 0 ? (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
                gap: "1.5rem",
              }}
            >
              {filtered.map((product) => (
                <div
                  key={product.sku}
                  style={{
                    backgroundColor: "#1e293b",
                    borderRadius: "0.75rem",
                    overflow: "hidden",
                    border: "1px solid #334155",
                    transition: "all 0.3s",
                    cursor: "pointer",
                  }}
                  onMouseOver={(e) => {
                    (e.currentTarget as HTMLDivElement).style.transform = "translateY(-8px)";
                    (e.currentTarget as HTMLDivElement).style.borderColor = COLORS[product.category] || "#3b82f6";
                    (e.currentTarget as HTMLDivElement).style.boxShadow =
                      `0 10px 25px -5px ${COLORS[product.category] || "#3b82f6"}40`;
                  }}
                  onMouseOut={(e) => {
                    (e.currentTarget as HTMLDivElement).style.transform = "translateY(0)";
                    (e.currentTarget as HTMLDivElement).style.borderColor = "#334155";
                    (e.currentTarget as HTMLDivElement).style.boxShadow = "none";
                  }}
                >
                  {/* Imagen */}
                  <div
                    style={{
                      width: "100%",
                      height: "200px",
                      backgroundColor: "#0f172a",
                      overflow: "hidden",
                      position: "relative",
                    }}
                  >
                    <img
                      src={product.image_url}
                      alt={product.name}
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                      }}
                      onError={(e) => {
                        (e.target as HTMLImageElement).src =
                          "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='220' height='200'%3E%3Crect fill='%23334155' width='220' height='200'/%3E%3Ctext x='50%' y='50%' text-anchor='middle' dy='.3em' fill='%23cbd5e1' font-size='14'%3ESin imagen%3C/text%3E%3C/svg%3E";
                      }}
                    />
                    <div
                      style={{
                        position: "absolute",
                        top: "0.5rem",
                        right: "0.5rem",
                        backgroundColor: product.supplier ? SUPPLIER_COLORS[product.supplier]?.color || "#3b82f6" : "#3b82f6",
                        color: "white",
                        padding: "0.25rem 0.75rem",
                        borderRadius: "0.375rem",
                        fontSize: "0.75rem",
                        fontWeight: "600",
                      }}
                    >
                      {product.supplier ? SUPPLIER_COLORS[product.supplier]?.name.split(" ")[1] : "Depósito"}
                    </div>
                  </div>

                  {/* Contenido */}
                  <div style={{ padding: "1rem" }}>
                    <h4
                      style={{
                        margin: "0 0 0.75rem 0",
                        fontSize: "0.875rem",
                        fontWeight: "600",
                        color: "white",
                        minHeight: "40px",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        display: "-webkit-box",
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: "vertical",
                      }}
                    >
                      {product.name}
                    </h4>

                    <div style={{ marginTop: "1rem" }}>
                      <div style={{ fontSize: "0.75rem", color: "#94a3b8", marginBottom: "0.25rem" }}>
                        Precio Unitario
                      </div>
                      <div
                        style={{
                          fontSize: "1.5rem",
                          fontWeight: "bold",
                          color: product.supplier ? SUPPLIER_COLORS[product.supplier]?.color || "#3b82f6" : COLORS[product.category] || "#3b82f6",
                        }}
                      >
                        ${product.unit_price.toLocaleString("es-AR")}
                      </div>
                    </div>

                    <div style={{ marginTop: "0.75rem", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem" }}>
                      <div>
                        <div style={{ fontSize: "0.75rem", color: "#94a3b8" }}>SKU</div>
                        <div style={{ fontSize: "0.75rem", color: "#cbd5e1", fontWeight: "500" }}>
                          {product.sku}
                        </div>
                      </div>
                      <div>
                        <div style={{ fontSize: "0.75rem", color: "#94a3b8" }}>Cantidad</div>
                        <div style={{ fontSize: "0.75rem", color: "#cbd5e1", fontWeight: "500" }}>
                          {product.units_per_package} pcs
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div
              style={{
                textAlign: "center",
                padding: "3rem",
                backgroundColor: "#1e293b",
                borderRadius: "0.75rem",
                border: "1px solid #334155",
                color: "#94a3b8",
              }}
            >
              <div style={{ fontSize: "2rem", marginBottom: "1rem" }}>🔍</div>
              <p>No se encontraron productos con los filtros seleccionados</p>
              <button
                onClick={() => {
                  setSelectedCategory(null);
                  setSearchTerm("");
                  setPriceRange([0, 1000000]);
                }}
                style={{
                  marginTop: "1rem",
                  padding: "0.75rem 1.5rem",
                  backgroundColor: "#3b82f6",
                  color: "white",
                  border: "none",
                  borderRadius: "0.375rem",
                  cursor: "pointer",
                  fontWeight: "600",
                }}
              >
                Limpiar filtros
              </button>
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer
        style={{
          backgroundColor: "#0f172a",
          borderTop: "1px solid #334155",
          padding: "2rem 1rem",
          textAlign: "center",
          color: "#94a3b8",
          marginTop: "3rem",
        }}
      >
        <p>© 2026 Planeta Once Marketplace. Sistema de categorización inteligente</p>
      </footer>
    </div>
  );
}
