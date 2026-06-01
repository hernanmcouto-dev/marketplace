"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
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

export default function CategoriasPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [supplier, setSupplier] = useState<"impotekno" | "sanjulian" | "nextcell" | "nodo" | "todos">("todos");

  useEffect(() => {
    loadProducts();
  }, [supplier]);

  const loadProducts = async () => {
    setLoading(true);
    try {
      if (supplier === "todos") {
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
      setSelectedCategory(null);
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

  // Filtrar productos por categoría seleccionada
  const filteredProducts = selectedCategory
    ? products.filter((p) => p.category === selectedCategory)
    : [];

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
    <div style={{ minHeight: "100vh", backgroundColor: "#f9fafb" }}>
      {/* Header */}
      <nav
        style={{
          backgroundColor: "#1f2937",
          color: "white",
          padding: "1rem",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <Link href="/" style={{ textDecoration: "none", color: "white" }}>
          <h1 style={{ margin: 0, fontSize: "1.5rem" }}>🛍️ Planeta Once</h1>
        </Link>
        <div style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
          <select
            value={supplier}
            onChange={(e) => setSupplier(e.target.value as "impotekno" | "sanjulian" | "nextcell" | "nodo" | "todos")}
            style={{
              padding: "0.5rem",
              borderRadius: "0.375rem",
              border: "none",
              backgroundColor: "#374151",
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
      </nav>

      {/* Main */}
      <main style={{ padding: "2rem", maxWidth: "1400px", margin: "0 auto" }}>
        <h2 style={{ marginBottom: "1.5rem" }}>📂 Todas las Categorías</h2>

        {/* Botones de categorías */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))",
            gap: "1rem",
            marginBottom: "2rem",
          }}
        >
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
                  backgroundColor: isSelected ? color : "#ffffff",
                  border: `2px solid ${color}`,
                  borderRadius: "0.5rem",
                  cursor: "pointer",
                  fontWeight: "600",
                  color: isSelected ? "white" : color,
                  transition: "all 0.2s",
                  minHeight: "80px",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "center",
                  alignItems: "center",
                  textAlign: "center",
                }}
                onMouseOver={(e) => {
                  if (!isSelected) {
                    (e.target as HTMLButtonElement).style.backgroundColor = `${color}20`;
                  }
                }}
                onMouseOut={(e) => {
                  if (!isSelected) {
                    (e.target as HTMLButtonElement).style.backgroundColor = "white";
                  }
                }}
              >
                <div style={{ fontSize: "0.875rem" }}>{category}</div>
                <div style={{ fontSize: "1.5rem", fontWeight: "bold", marginTop: "0.5rem" }}>
                  {count}
                </div>
              </button>
            );
          })}
        </div>

        {/* Productos */}
        {selectedCategory && (
          <div>
            <h3 style={{ marginBottom: "1.5rem" }}>
              {selectedCategory} ({filteredProducts.length} productos)
            </h3>

            {loading ? (
              <div>Cargando...</div>
            ) : filteredProducts.length > 0 ? (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
                  gap: "1.5rem",
                }}
              >
                {filteredProducts.map((product) => (
                  <div
                    key={product.sku}
                    style={{
                      backgroundColor: "white",
                      borderRadius: "0.5rem",
                      overflow: "hidden",
                      border: "1px solid #e5e7eb",
                      transition: "transform 0.2s, box-shadow 0.2s",
                      cursor: "pointer",
                    }}
                    onMouseOver={(e) => {
                      (e.currentTarget as HTMLDivElement).style.transform = "translateY(-4px)";
                      (e.currentTarget as HTMLDivElement).style.boxShadow =
                        "0 10px 15px -3px rgba(0, 0, 0, 0.1)";
                    }}
                    onMouseOut={(e) => {
                      (e.currentTarget as HTMLDivElement).style.transform = "translateY(0)";
                      (e.currentTarget as HTMLDivElement).style.boxShadow = "none";
                    }}
                  >
                    {/* Imagen */}
                    <div
                      style={{
                        width: "100%",
                        height: "180px",
                        backgroundColor: "#f3f4f6",
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
                            "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='180'%3E%3Crect fill='%23e5e7eb' width='200' height='180'/%3E%3Ctext x='50%' y='50%' text-anchor='middle' dy='.3em' fill='%239ca3af'%3ESin imagen%3C/text%3E%3C/svg%3E";
                        }}
                      />
                      <div
                        style={{
                          position: "absolute",
                          top: "0.5rem",
                          right: "0.5rem",
                          backgroundColor: product.supplier ? SUPPLIER_COLORS[product.supplier]?.color || "#3b82f6" : "#3b82f6",
                          color: "white",
                          padding: "0.25rem 0.5rem",
                          borderRadius: "0.375rem",
                          fontSize: "0.65rem",
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
                          margin: "0 0 0.5rem 0",
                          fontSize: "0.875rem",
                          fontWeight: "600",
                          color: "#111827",
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

                      <div style={{ marginTop: "0.75rem" }}>
                        <div style={{ fontSize: "0.75rem", color: "#6b7280", marginBottom: "0.25rem" }}>
                          Precio
                        </div>
                        <div
                          style={{
                            fontSize: "1.25rem",
                            fontWeight: "bold",
                            color: product.supplier ? SUPPLIER_COLORS[product.supplier]?.color || "#111827" : COLORS[product.category] || "#111827",
                          }}
                        >
                          ${product.unit_price.toLocaleString("es-AR")}
                        </div>
                      </div>

                      <div style={{ marginTop: "0.75rem", fontSize: "0.75rem", color: "#6b7280" }}>
                        SKU: {product.sku}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ textAlign: "center", color: "#6b7280" }}>
                No hay productos en esta categoría
              </div>
            )}
          </div>
        )}

        {!selectedCategory && (
          <div
            style={{
              textAlign: "center",
              padding: "2rem",
              backgroundColor: "white",
              borderRadius: "0.5rem",
              color: "#6b7280",
            }}
          >
            👆 Selecciona una categoría para ver los productos
          </div>
        )}
      </main>
    </div>
  );
}
