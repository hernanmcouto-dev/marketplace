"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { categorizeProduct, CATEGORY_LIST, type CategorizationResult } from "@/lib/product-categorizer";

interface Product {
  sku: string;
  name: string;
  unit_price: number;
  units_per_package: number;
  image_url: string;
  category?: string;
}

interface ProductWithCategory extends Product {
  categorization: CategorizationResult;
  userCategory?: string;
}

export default function CategorizarPage() {
  const router = useRouter();
  const [products, setProducts] = useState<ProductWithCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [supplier, setSupplier] = useState<"impotekno" | "sanjulian">("impotekno");
  const [saveMessage, setSaveMessage] = useState("");
  const [categorizedCount, setCategorizedCount] = useState(0);

  useEffect(() => {
    loadAndCategorize();
  }, [supplier]);

  const loadAndCategorize = async () => {
    setLoading(true);
    try {
      const filename = supplier === "impotekno" ? "products.json" : "products-sanjulian.json";
      const response = await fetch(`/public/${filename}`);
      if (!response.ok) throw new Error("No se pudo cargar");

      const data: Product[] = await response.json();

      const withCategorization: ProductWithCategory[] = data.map((product) => ({
        ...product,
        categorization: categorizeProduct(product.name),
      }));

      setProducts(withCategorization);
      setCurrentIndex(0);
      setCategorizedCount(0);
      setSaveMessage("");
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  };

  const current = products[currentIndex];
  const progress = ((currentIndex + 1) / products.length) * 100;

  const handleConfirm = () => {
    if (current && !current.userCategory) {
      const updated = [...products];
      updated[currentIndex].userCategory = current.categorization.primary;
      setProducts(updated);
      setCategorizedCount((prev) => prev + 1);
    }
    if (currentIndex < products.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const handleChangeCategory = (category: string) => {
    const updated = [...products];
    updated[currentIndex].userCategory = category;
    setProducts(updated);
    setCategorizedCount((prev) => prev + 1);
    if (currentIndex < products.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const handleSave = async () => {
    setSaveMessage("Guardando...");
    try {
      const response = await fetch("/api/save-categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          supplier,
          products: products.map((p) => ({
            ...p,
            category: p.userCategory || p.categorization.primary,
          })),
        }),
      });

      if (!response.ok) throw new Error("Error al guardar");
      setSaveMessage("✅ ¡Guardado exitosamente!");
      setTimeout(() => setSaveMessage(""), 3000);
    } catch (error) {
      setSaveMessage("❌ Error al guardar");
    }
  };

  if (loading) return <div style={{ padding: "2rem" }}>Cargando...</div>;
  if (!current) return <div style={{ padding: "2rem" }}>No hay productos</div>;

  const isClear = !current.categorization.needsConfirmation;
  const finalCategory = current.userCategory || current.categorization.primary;

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", backgroundColor: "#f9fafb" }}>
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
        <h1 style={{ margin: 0, fontSize: "1.5rem" }}>🏷️ Categorizar Productos</h1>
        <button
          onClick={() => router.push("/admin")}
          style={{
            backgroundColor: "#dc2626",
            border: "none",
            color: "white",
            padding: "0.5rem 1rem",
            borderRadius: "0.375rem",
            cursor: "pointer",
          }}
        >
          Volver
        </button>
      </nav>

      {/* Main */}
      <main style={{ flex: 1, padding: "2rem", maxWidth: "800px", margin: "0 auto", width: "100%" }}>
        {/* Selector proveedor */}
        <div style={{ marginBottom: "2rem", display: "flex", gap: "1rem", alignItems: "center" }}>
          <label style={{ fontWeight: "bold" }}>Proveedor:</label>
          <select
            value={supplier}
            onChange={(e) => setSupplier(e.target.value as "impotekno" | "sanjulian")}
            style={{
              padding: "0.5rem",
              border: "1px solid #e5e7eb",
              borderRadius: "0.375rem",
              cursor: "pointer",
            }}
          >
            <option value="impotekno">Impotekno</option>
            <option value="sanjulian">San Julián</option>
          </select>
          <span style={{ color: "#6b7280" }}>
            {categorizedCount}/{products.length}
          </span>
        </div>

        {/* Progreso */}
        <div style={{ marginBottom: "2rem" }}>
          <div
            style={{
              width: "100%",
              height: "12px",
              backgroundColor: "#e5e7eb",
              borderRadius: "0.375rem",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                width: `${progress}%`,
                height: "100%",
                backgroundColor: "#10b981",
                transition: "width 0.3s ease",
              }}
            />
          </div>
          <div style={{ fontSize: "0.875rem", color: "#6b7280", marginTop: "0.5rem", textAlign: "center" }}>
            {currentIndex + 1} de {products.length}
          </div>
        </div>

        {/* Producto */}
        <div
          style={{
            backgroundColor: "white",
            border: "1px solid #e5e7eb",
            borderRadius: "0.5rem",
            padding: "2rem",
            marginBottom: "2rem",
          }}
        >
          {/* Imagen */}
          <div style={{ marginBottom: "1.5rem", textAlign: "center" }}>
            <img
              src={current.image_url}
              alt={current.name}
              style={{
                maxWidth: "300px",
                maxHeight: "300px",
                borderRadius: "0.375rem",
                backgroundColor: "#f3f4f6",
              }}
              onError={(e) => {
                (e.target as HTMLImageElement).src =
                  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Crect fill='%23e5e7eb' width='200' height='200'/%3E%3Ctext x='50%' y='50%' text-anchor='middle' dy='.3em' fill='%239ca3af'%3ESin imagen%3C/text%3E%3C/svg%3E";
              }}
            />
          </div>

          {/* Info */}
          <div style={{ marginBottom: "1.5rem" }}>
            <div style={{ fontSize: "0.875rem", color: "#6b7280", marginBottom: "0.25rem" }}>SKU</div>
            <div style={{ fontWeight: "bold", marginBottom: "1rem" }}>{current.sku}</div>

            <div style={{ fontSize: "0.875rem", color: "#6b7280", marginBottom: "0.25rem" }}>Producto</div>
            <div style={{ fontSize: "1.25rem", fontWeight: "bold", marginBottom: "1rem" }}>{current.name}</div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", fontSize: "0.875rem" }}>
              <div>
                <div style={{ color: "#6b7280", marginBottom: "0.25rem" }}>Precio</div>
                <div style={{ fontWeight: "bold" }}>${current.unit_price}</div>
              </div>
              <div>
                <div style={{ color: "#6b7280", marginBottom: "0.25rem" }}>Unidades</div>
                <div style={{ fontWeight: "bold" }}>{current.units_per_package}</div>
              </div>
            </div>
          </div>

          {/* Categorización */}
          <div
            style={{
              padding: "1.5rem",
              backgroundColor: isClear ? "#dbeafe" : "#fef3c7",
              border: `2px solid ${isClear ? "#0284c7" : "#f59e0b"}`,
              borderRadius: "0.375rem",
            }}
          >
            {isClear ? (
              <>
                <div style={{ fontSize: "0.875rem", color: "#0c4a6e", marginBottom: "0.5rem" }}>
                  ✅ Categoría clara
                </div>
                <div style={{ fontSize: "1.5rem", fontWeight: "bold", color: "#0369a1", marginBottom: "1rem" }}>
                  {finalCategory}
                </div>
                <button
                  onClick={handleConfirm}
                  style={{
                    width: "100%",
                    padding: "0.75rem",
                    backgroundColor: "#0284c7",
                    color: "white",
                    border: "none",
                    borderRadius: "0.375rem",
                    fontWeight: "bold",
                    cursor: "pointer",
                    fontSize: "1rem",
                  }}
                >
                  ✓ Confirmar y Siguiente →
                </button>
              </>
            ) : (
              <>
                <div style={{ fontSize: "0.875rem", color: "#92400e", marginBottom: "0.75rem" }}>
                  ❓ Hay varias opciones posibles. ¿Cuál es la correcta?
                </div>

                {/* Opciones */}
                <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                  {[current.categorization.primary, ...current.categorization.alternatives].map((cat) => (
                    <button
                      key={cat}
                      onClick={() => handleChangeCategory(cat)}
                      style={{
                        padding: "0.75rem",
                        backgroundColor: "#ffffff",
                        border: `2px solid ${cat === current.categorization.primary ? "#f59e0b" : "#e5e7eb"}`,
                        borderRadius: "0.375rem",
                        cursor: "pointer",
                        fontWeight: "bold",
                        textAlign: "left",
                        fontSize: "1rem",
                        color: cat === current.categorization.primary ? "#f59e0b" : "#374151",
                      }}
                    >
                      {cat === current.categorization.primary && "⭐ "} {cat}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Botón guardar */}
        <button
          onClick={handleSave}
          disabled={categorizedCount === 0}
          style={{
            width: "100%",
            padding: "1rem",
            backgroundColor: categorizedCount === 0 ? "#d1d5db" : "#10b981",
            color: "white",
            border: "none",
            borderRadius: "0.375rem",
            fontWeight: "bold",
            fontSize: "1rem",
            cursor: categorizedCount === 0 ? "not-allowed" : "pointer",
          }}
        >
          💾 Guardar {categorizedCount} categorías
        </button>

        {saveMessage && (
          <div
            style={{
              marginTop: "1rem",
              padding: "1rem",
              backgroundColor: saveMessage.includes("✅") ? "#dcfce7" : "#fee2e2",
              color: saveMessage.includes("✅") ? "#166534" : "#991b1b",
              borderRadius: "0.375rem",
              textAlign: "center",
              fontWeight: "bold",
            }}
          >
            {saveMessage}
          </div>
        )}
      </main>
    </div>
  );
}
