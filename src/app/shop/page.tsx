"use client";

import { useState, useEffect, useRef } from "react";
import { CATEGORY_LIST } from "@/lib/product-categorizer";
import { useCart } from "@/lib/CartContext";
import CartPanel from "@/components/CartPanel";

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
  const { addToCart, items, total } = useCart();
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [supplier, setSupplier] = useState<"impotekno" | "sanjulian" | "nextcell" | "nodo" | "todos">("todos");
  const [sortBy, setSortBy] = useState<"nombre" | "precio-asc" | "precio-desc">("nombre");
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 1000000]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedQuantities, setSelectedQuantities] = useState<Record<string, number>>({});
  const [showCart, setShowCart] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [depositoSearchTerm, setDepositoSearchTerm] = useState("");
  const [carouselIndex, setCarouselIndex] = useState(0);
  const [featuredProducts, setFeaturedProducts] = useState<string[]>([]);
  const carouselRef = useRef<HTMLDivElement>(null);
  const [isCarouselHovered, setIsCarouselHovered] = useState(false);

  // Función para obtener productos random de cada depósito
  const generateFeaturedProducts = (allProducts: Product[]) => {
    const suppliers = ["impotekno", "sanjulian", "nextcell", "nodo"];
    const featured: string[] = [];

    suppliers.forEach((supplier) => {
      const supplierProducts = allProducts.filter((p) => p.supplier === supplier);
      if (supplierProducts.length > 0) {
        // Seleccionar 4 productos random de cada depósito
        const shuffled = [...supplierProducts].sort(() => Math.random() - 0.5);
        const selected = shuffled.slice(0, 4);
        featured.push(...selected.map((p) => p.sku));
      }
    });

    setFeaturedProducts(featured);
  };

  useEffect(() => {
    loadProducts();
  }, [supplier]);

  // Auto-scroll del carrusel (infinito sin interrupción)
  useEffect(() => {
    if (!isCarouselHovered && carouselRef.current) {
      const interval = setInterval(() => {
        if (carouselRef.current) {
          const carousel = carouselRef.current;
          const halfScroll = (carousel.scrollWidth - carousel.clientWidth) / 2;

          // Si llegó a la mitad (final de la primera copia), volver al inicio sin animación
          if (carousel.scrollLeft >= halfScroll - 50) {
            carousel.scrollLeft = 0;
          } else {
            carousel.scrollBy({
              left: 440, // Desplazar 2 productos a la vez
              behavior: "auto",
            });
          }
        }
      }, 1500); // Desplazarse cada 1.5 segundos

      return () => clearInterval(interval);
    }
  }, [isCarouselHovered]);

  const handleFilterBySupplier = (supplierCode: string) => {
    const supplierMap: Record<string, "impotekno" | "sanjulian" | "nextcell" | "nodo" | "todos"> = {
      impotekno: "impotekno",
      sanjulian: "sanjulian",
      nextcell: "nextcell",
      nodo: "nodo",
    };
    setSupplier(supplierMap[supplierCode] || "todos");
    setSelectedCategory(null);
    setSearchTerm("");
  };

  const loadProducts = async () => {
    setLoading(true);
    try {
      // Siempre cargar todos los depósitos para permitir búsqueda global
      const [azul, verde, rojo, amarillo] = await Promise.all([
        fetch("/products.json").then(r => r.json()),
        fetch("/products-sanjulian.json").then(r => r.json()),
        fetch("/products-nextcell.json").then(r => r.json()),
        fetch("/products-nodo.json").then(r => r.json()),
      ]);

      const allProductsWithSupplier = [
        ...azul.map((p: any) => ({ ...p, supplier: "impotekno" as const })),
        ...verde.map((p: any) => ({ ...p, supplier: "sanjulian" as const })),
        ...rojo.map((p: any) => ({ ...p, supplier: "nextcell" as const })),
        ...amarillo.map((p: any) => ({ ...p, supplier: "nodo" as const })),
      ];

      // Eliminar duplicados por SKU (mantener el primero)
      const seenSkus = new Set<string>();
      const uniqueProducts = allProductsWithSupplier.filter((p) => {
        if (seenSkus.has(p.sku)) return false;
        seenSkus.add(p.sku);
        return true;
      });

      setProducts(uniqueProducts);
      generateFeaturedProducts(uniqueProducts);
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

  // Función de búsqueda tipo Mercado Libre
  const searchProducts = (products: Product[], term: string) => {
    if (!term.trim()) return products;

    const lowerTerm = term.toLowerCase();
    const searchWords = lowerTerm.split(/\s+/).filter(w => w.length > 0);
    const hasMultipleWords = searchWords.length > 1;

    return products
      .map((product) => {
        const nameLower = product.name.toLowerCase();
        const skuLower = product.sku.toLowerCase();
        const nameWords = nameLower.split(/[\s\-().,/]+/);

        let score = 0;
        let matchedWordsCount = 0;

        // Búsqueda exacta en SKU (máxima prioridad)
        if (skuLower === lowerTerm) {
          score = 10000;
          matchedWordsCount = searchWords.length;
        } else if (skuLower.includes(lowerTerm)) {
          score = 5000;
          matchedWordsCount = searchWords.length;
        } else {
          // Verificar si todas las palabras están presentes
          searchWords.forEach((word) => {
            if (nameWords.includes(word)) {
              score += 100;
              matchedWordsCount++;
            } else if (nameLower.includes(word)) {
              score += 10;
              matchedWordsCount++;
            }
          });
        }

        return { product, score, matchedWordsCount };
      })
      .filter(({ matchedWordsCount }) => {
        // Si hay múltiples palabras, todas deben estar presentes
        // Si hay una sola palabra, basta con que esté presente
        if (hasMultipleWords) {
          return matchedWordsCount === searchWords.length;
        }
        return matchedWordsCount > 0;
      })
      .sort((a, b) => b.score - a.score)
      .map(({ product }) => product);
  };

  // Aplicar búsqueda mejorada (sin filtros de categoría/supplier si hay búsqueda)
  let filtered = searchTerm.trim()
    ? searchProducts(products, searchTerm)
    : products;

  // Filtrar por categoría, supplier y precio (solo si no hay búsqueda activa)
  if (!searchTerm.trim()) {
    filtered = filtered.filter((p) => {
      const matchCategory = !selectedCategory || p.category === selectedCategory;
      const matchSupplier = supplier === "todos" || p.supplier === supplier;
      const matchPrice = p.unit_price >= priceRange[0] && p.unit_price <= priceRange[1];
      return matchCategory && matchSupplier && matchPrice;
    });
  }

  // Aplicar búsqueda dentro del depósito (solo si no hay búsqueda principal)
  if (!searchTerm.trim() && depositoSearchTerm.trim()) {
    filtered = searchProducts(filtered, depositoSearchTerm);
  }

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

  // Agrupar items por supplier
  const itemsBySupplier: Record<string, number> = {};
  const totalesBySupplier: Record<string, number> = {};
  items.forEach((item) => {
    const supplier = item.supplier || "sin-deposito";
    itemsBySupplier[supplier] = (itemsBySupplier[supplier] || 0) + item.quantity;
    totalesBySupplier[supplier] = (totalesBySupplier[supplier] || 0) + item.unit_price * item.quantity;
  });

  const SUPPLIER_NAMES: Record<string, string> = {
    impotekno: "Azul",
    sanjulian: "Verde",
    nextcell: "Rojo",
    nodo: "Amarillo",
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
          position: "relative",
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

        {/* Cart Button */}
        <button
          onClick={() => setShowCart(true)}
          style={{
            position: "absolute",
            top: "1rem",
            right: "2rem",
            bottom: "1rem",
            backgroundColor: "#1a1a1a",
            color: "white",
            border: items.length > 0 ? "2px solid #22C55E" : "2px solid #64748b",
            borderRadius: "0.75rem",
            padding: "1rem 1.8rem",
            cursor: "pointer",
            fontWeight: "700",
            fontSize: "0.9rem",
            width: "calc(100% - 4rem - 280px)",
            maxWidth: "480px",
            textAlign: "left",
            boxShadow: items.length > 0 ? "0 10px 25px -5px #22C55E40" : "none",
            transition: "all 0.3s",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            whiteSpace: "normal",
            lineHeight: "1.3",
            overflow: "hidden",
          }}
          onMouseOver={(e) => {
            if (items.length > 0) {
              (e.currentTarget as HTMLButtonElement).style.borderColor = "#16a34a";
              (e.currentTarget as HTMLButtonElement).style.transform = "scale(1.02)";
            }
          }}
          onMouseOut={(e) => {
            if (items.length > 0) {
              (e.currentTarget as HTMLButtonElement).style.borderColor = "#22C55E";
              (e.currentTarget as HTMLButtonElement).style.transform = "scale(1)";
            }
          }}
        >
          <div style={{ marginBottom: "0.3rem", color: "white", fontSize: "0.95rem", fontWeight: "700" }}>
            🛒 {items.length > 0 ? `${items.length} productos` : "Carrito vacío"}
          </div>
          {items.length > 0 && (
            <>
              <div style={{ fontSize: "0.8rem", marginBottom: "0.3rem", borderTop: "1px solid rgba(255,255,255,0.1)", paddingTop: "0.3rem" }}>
                {Object.entries(itemsBySupplier).map(([supplier, quantity]) => (
                  <div key={supplier} style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8rem", color: SUPPLIER_COLORS[supplier]?.color || "#cbd5e1", marginBottom: "0.2rem" }}>
                    <span>Depósito {SUPPLIER_NAMES[supplier]}:</span>
                    <span>${totalesBySupplier[supplier]?.toLocaleString("es-AR") || 0}</span>
                  </div>
                ))}
              </div>
              <div style={{ borderTop: "1px solid rgba(255,255,255,0.1)", paddingTop: "0.3rem", fontSize: "0.95rem", fontWeight: "800", color: "white" }}>
                Total: ${total.toLocaleString("es-AR")}
              </div>
            </>
          )}
        </button>
      </header>

      {/* Main Content */}
      <main style={{ padding: "2rem 1rem", maxWidth: "1400px", margin: "0 auto" }}>
        {/* Featured Products Carousel */}
        <div style={{ marginBottom: "3rem" }}>
          <h2 style={{ color: "white", marginBottom: "1.5rem", fontSize: "1.5rem", fontWeight: "bold" }}>
            ⭐ Novedades Destacadas
          </h2>
          <div style={{ position: "relative", overflow: "hidden" }}>
            <div
              ref={carouselRef}
              onMouseEnter={() => setIsCarouselHovered(true)}
              onMouseLeave={() => setIsCarouselHovered(false)}
              style={{
                display: "flex",
                gap: "1rem",
                overflowX: "auto",
                paddingBottom: "1rem",
                scrollBehavior: "auto",
                scrollbarWidth: "none",
              }}
            >
              {/* Renderizar productos dos veces para efecto infinito */}
              {[...Array(2)].map((_, iteration) =>
                products.map((product) => {
                  if (!featuredProducts.includes(product.sku)) return null;
                  const supplierInfo = product.supplier ? SUPPLIER_COLORS[product.supplier] : undefined;

                  return (
                    <div
                      key={`${product.sku}-${iteration}`}
                      style={{
                        flex: "0 0 200px",
                        backgroundColor: "#1e293b",
                        borderRadius: "0.75rem",
                        border: "1px solid #334155",
                        overflow: "hidden",
                        transition: "all 0.3s",
                        cursor: "pointer",
                      }}
                      onMouseOver={(e) => {
                        (e.currentTarget as HTMLDivElement).style.transform = "translateY(-8px)";
                        (e.currentTarget as HTMLDivElement).style.borderColor = supplierInfo?.color || "#3b82f6";
                      }}
                      onMouseOut={(e) => {
                        (e.currentTarget as HTMLDivElement).style.transform = "translateY(0)";
                        (e.currentTarget as HTMLDivElement).style.borderColor = "#334155";
                      }}
                    >
                      {/* Imagen */}
                      <div
                        style={{
                          width: "100%",
                          paddingBottom: "100%",
                          backgroundColor: "#0f172a",
                          overflow: "hidden",
                          position: "relative",
                        }}
                      >
                        <img
                          src={product.image_url}
                          alt={product.name}
                          style={{
                            position: "absolute",
                            top: 0,
                            left: 0,
                            width: "100%",
                            height: "100%",
                            objectFit: "cover",
                          }}
                        />
                      </div>

                      {/* Depósito Badge */}
                      <div
                        style={{
                          position: "absolute",
                          top: "0.5rem",
                          right: "0.5rem",
                          backgroundColor: supplierInfo?.color || "#3b82f6",
                          color: "white",
                          padding: "0.3rem 0.7rem",
                          borderRadius: "0.25rem",
                          fontSize: "0.7rem",
                          fontWeight: "700",
                        }}
                      >
                        {supplierInfo?.name.split(" ")[1]}
                      </div>

                      {/* Información */}
                      <div style={{ padding: "0.75rem" }}>
                        <p style={{ margin: "0 0 0.5rem 0", fontSize: "0.8rem", color: "#cbd5e1", lineHeight: "1.2", minHeight: "2.4rem" }}>
                          {product.name}
                        </p>
                        <p style={{ margin: 0, fontSize: "1.1rem", fontWeight: "bold", color: supplierInfo?.color || "#3b82f6" }}>
                          ${product.unit_price.toLocaleString("es-AR")}
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Toolbar */}
        <div style={{ marginBottom: "2rem" }}>
          {/* Search & Supplier Row */}
          <div style={{ display: "flex", gap: "2rem", alignItems: "flex-end", marginBottom: "1.5rem" }}>
            {/* Search - Principal */}
            <div>
              <label style={{ display: "block", marginBottom: "0.5rem", color: "#e2e8f0", fontWeight: "600", fontSize: "0.95rem" }}>
                🔍 Buscador Principal - Busca en todo el sitio
              </label>
              <input
                type="text"
                placeholder="Nombre, SKU, marca..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{
                  width: "100%",
                  maxWidth: "500px",
                  padding: "0.65rem 1rem",
                  borderRadius: "0.5rem",
                  border: "2px solid #3b82f6",
                  backgroundColor: "#0f172a",
                  color: "white",
                  fontSize: "0.95rem",
                  fontWeight: "500",
                }}
              />
            </div>

            {/* Supplier */}
            <div style={{ marginLeft: "auto" }}>
              <label style={{ display: "block", marginBottom: "0.5rem", color: "#e2e8f0", fontWeight: "500", fontSize: "0.875rem" }}>
                🏪 Proveedor
              </label>
              <select
                value={supplier}
                onChange={(e) => setSupplier(e.target.value as "impotekno" | "sanjulian" | "nextcell" | "todos")}
                style={{
                  padding: "0.65rem 0.75rem",
                  borderRadius: "0.5rem",
                  border: "1px solid #475569",
                  backgroundColor: "#0f172a",
                  color: "white",
                  cursor: "pointer",
                  fontSize: "0.875rem",
                  minWidth: "400px",
                }}
              >
                <option value="todos">🏢 Todos los Depósitos</option>
                <option value="impotekno">🔵 Depósito Azul</option>
                <option value="sanjulian">🟢 Depósito Verde</option>
                <option value="nextcell">🔴 Depósito Rojo</option>
                <option value="nodo">🟡 Depósito Amarillo</option>
              </select>
            </div>
          </div>
        </div>

        {/* Categories Horizontal Buttons */}
        <div style={{ marginBottom: "2rem", display: "flex", gap: "0.75rem", flexWrap: "wrap", alignItems: "center" }}>
          <button
            onClick={() => setSelectedCategory(null)}
            style={{
              padding: "0.5rem 1rem",
              backgroundColor: !selectedCategory ? "#3b82f6" : "#475569",
              border: "none",
              borderRadius: "0.375rem",
              cursor: "pointer",
              color: "white",
              fontWeight: "600",
              fontSize: "0.825rem",
              whiteSpace: "nowrap",
              transition: "all 0.2s",
            }}
            onMouseOver={(e) => {
              if (selectedCategory) {
                (e.currentTarget as HTMLButtonElement).style.backgroundColor = "#3b82f6";
              }
            }}
            onMouseOut={(e) => {
              if (selectedCategory) {
                (e.currentTarget as HTMLButtonElement).style.backgroundColor = "#475569";
              }
            }}
          >
            Todas
          </button>
          {CATEGORY_LIST.map((category) => {
            const isSelected = selectedCategory === category;

            return (
              <button
                key={category}
                onClick={() => setSelectedCategory(isSelected ? null : category)}
                style={{
                  padding: "0.5rem 1rem",
                  backgroundColor: isSelected ? "#3b82f6" : "#475569",
                  border: "none",
                  borderRadius: "0.375rem",
                  cursor: "pointer",
                  color: "white",
                  fontWeight: "600",
                  fontSize: "0.825rem",
                  whiteSpace: "nowrap",
                  transition: "all 0.2s",
                }}
                onMouseOver={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.backgroundColor = "#3b82f6";
                }}
                onMouseOut={(e) => {
                  if (!isSelected) {
                    (e.currentTarget as HTMLButtonElement).style.backgroundColor = "#475569";
                  }
                }}
              >
                {category}
              </button>
            );
          })}
        </div>

        {/* Products Grid */}
        <div>
          <div style={{ marginBottom: "1.5rem", color: "#e2e8f0", display: "flex", justifyContent: "flex-start", alignItems: "center", gap: "3rem", flexWrap: "wrap" }}>
            <h2 style={{ margin: 0 }}>
              📦 {selectedCategory || "Todos los"} Productos ({filtered.length})
            </h2>
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
              <label style={{ color: "#cbd5e1", fontWeight: "500", whiteSpace: "nowrap" }}>Ordenar:</label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                style={{
                  padding: "0.5rem 0.75rem",
                  borderRadius: "0.375rem",
                  border: "1px solid #475569",
                  backgroundColor: "#0f172a",
                  color: "white",
                  cursor: "pointer",
                  minWidth: "180px",
                  fontSize: "0.875rem",
                }}
              >
                <option value="nombre">Nombre (A-Z)</option>
                <option value="precio-asc">Precio (Menor a Mayor)</option>
                <option value="precio-desc">Precio (Mayor a Menor)</option>
              </select>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginLeft: "auto" }}>
              <label style={{ color: "#e2e8f0", fontWeight: "600", whiteSpace: "nowrap", fontSize: "0.95rem" }}>🔎 En este depósito:</label>
              <input
                type="text"
                placeholder="Buscar en este depósito..."
                value={depositoSearchTerm}
                onChange={(e) => setDepositoSearchTerm(e.target.value)}
                style={{
                  padding: "0.65rem 1rem",
                  borderRadius: "0.375rem",
                  border: "2px solid #10b981",
                  backgroundColor: "#0f172a",
                  color: "white",
                  cursor: "text",
                  minWidth: "300px",
                  fontSize: "0.95rem",
                  fontWeight: "500",
                }}
              />
            </div>
          </div>

          {loading ? (
            <div style={{ textAlign: "center", color: "#cbd5e1", padding: "2rem" }}>
              ⏳ Cargando productos...
            </div>
          ) : filtered.length > 0 ? (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(6, 1fr)",
                gap: "1rem",
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
                      paddingBottom: "120%",
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
                        objectFit: "contain",
                        position: "absolute",
                        top: 0,
                        left: 0,
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
                  <div style={{ padding: "0.5rem" }}>
                    <h4
                      style={{
                        margin: "0 0 0.25rem 0",
                        fontSize: "0.75rem",
                        fontWeight: "600",
                        color: "white",
                        minHeight: "30px",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        display: "-webkit-box",
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: "vertical",
                      }}
                    >
                      {product.name}
                    </h4>

                    <div style={{ marginTop: "0.25rem" }}>
                      <div
                        style={{
                          fontSize: "1.25rem",
                          fontWeight: "700",
                          color: product.supplier ? SUPPLIER_COLORS[product.supplier]?.color || "#3b82f6" : COLORS[product.category] || "#3b82f6",
                          textAlign: "center",
                        }}
                      >
                        ${product.unit_price.toLocaleString("es-AR")}
                      </div>
                    </div>

                    {/* Controles de Cantidad */}
                    <div style={{ marginTop: "0.5rem" }}>
                      <div
                        style={{
                          display: "flex",
                          gap: "0.4rem",
                          alignItems: "center",
                          justifyContent: "center",
                          marginBottom: "0.5rem",
                        }}
                      >
                        <button
                          onClick={() =>
                            setSelectedQuantities({
                              ...selectedQuantities,
                              [product.sku]: Math.max(0, (selectedQuantities[product.sku] || 0) - 1),
                            })
                          }
                          style={{
                            padding: "0.25rem 0.5rem",
                            backgroundColor: product.supplier ? SUPPLIER_COLORS[product.supplier]?.color || "#3b82f6" : "#3b82f6",
                            border: "none",
                            borderRadius: "0.25rem",
                            cursor: "pointer",
                            fontSize: "1rem",
                            fontWeight: "700",
                            color: "white",
                            width: "1.8rem",
                            height: "1.8rem",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          −
                        </button>
                        <input
                          type="number"
                          min="0"
                          value={selectedQuantities[product.sku] || 0}
                          onChange={(e) =>
                            setSelectedQuantities({
                              ...selectedQuantities,
                              [product.sku]: Math.max(0, parseInt(e.target.value) || 0),
                            })
                          }
                          style={{
                            width: "1.8rem",
                            height: "1.8rem",
                            padding: "0.1rem",
                            border: `1px solid ${product.supplier ? SUPPLIER_COLORS[product.supplier]?.color || "#475569" : "#475569"}`,
                            borderRadius: "0.2rem",
                            textAlign: "center",
                            fontSize: "0.8rem",
                            fontWeight: "700",
                            backgroundColor: "#0f172a",
                            color: product.supplier ? SUPPLIER_COLORS[product.supplier]?.color || "#10b981" : "#10b981",
                          }}
                        />
                        <button
                          onClick={() =>
                            setSelectedQuantities({
                              ...selectedQuantities,
                              [product.sku]: (selectedQuantities[product.sku] || 0) + 1,
                            })
                          }
                          style={{
                            padding: "0.25rem 0.5rem",
                            backgroundColor: product.supplier ? SUPPLIER_COLORS[product.supplier]?.color || "#10b981" : "#10b981",
                            border: "none",
                            borderRadius: "0.25rem",
                            cursor: "pointer",
                            fontSize: "1rem",
                            fontWeight: "700",
                            color: "white",
                            width: "1.8rem",
                            height: "1.8rem",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          +
                        </button>
                      </div>

                      <button
                        onClick={() => {
                          const quantity = selectedQuantities[product.sku] || 0;
                          if (quantity > 0) {
                            addToCart(
                              {
                                sku: product.sku,
                                name: product.name,
                                unit_price: product.unit_price,
                                quantity: quantity,
                                image_url: product.image_url,
                                units_per_package: product.units_per_package,
                                supplier: product.supplier,
                              },
                              quantity
                            );
                            setSelectedQuantities({
                              ...selectedQuantities,
                              [product.sku]: 0,
                            });
                            setShowCart(true);
                          }
                        }}
                        disabled={(selectedQuantities[product.sku] || 0) === 0}
                        style={{
                          width: "100%",
                          backgroundColor: (selectedQuantities[product.sku] || 0) > 0 ? "#10b981" : "#475569",
                          color: "#fff",
                          border: "none",
                          padding: "0.3rem",
                          borderRadius: "0.25rem",
                          cursor: (selectedQuantities[product.sku] || 0) > 0 ? "pointer" : "not-allowed",
                          fontWeight: "600",
                          fontSize: "0.75rem",
                        }}
                      >
                        {(selectedQuantities[product.sku] || 0) > 0 ? "Carrito" : "Agregar"}
                      </button>
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

      {/* Shopping Cart Panel */}
      <CartPanel
        isOpen={showCart}
        onClose={() => setShowCart(false)}
        onFilterBySupplier={handleFilterBySupplier}
      />
    </div>
  );
}
