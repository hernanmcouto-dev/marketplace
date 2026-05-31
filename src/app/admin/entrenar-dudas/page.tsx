"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { categorizeProduct, CATEGORY_LIST } from "@/lib/product-categorizer";

interface Product {
  sku: string;
  name: string;
  unit_price: number;
  units_per_package: number;
  image_url: string;
  categorized_as?: string;
  supplier?: string;
}

interface TrainingExample {
  sku: string;
  name: string;
  category: string;
  timestamp: string;
}

export default function EntrenarDudasPage() {
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [trained, setTrained] = useState<TrainingExample[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [showCategorySelect, setShowCategorySelect] = useState(false);

  useEffect(() => {
    loadDubiousProducts();
    loadTrainedExamples();
  }, []);

  const loadDubiousProducts = async () => {
    setLoading(true);
    try {
      const response = await fetch("/dubious-products.json");
      if (!response.ok) throw new Error("No se pudo cargar");
      const data = await response.json();
      setProducts(data.dubious_products);
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadTrainedExamples = async () => {
    try {
      const saved = localStorage.getItem("trainedDubious");
      if (saved) {
        setTrained(JSON.parse(saved));
      }
    } catch (error) {
      console.error("Error loading trained examples:", error);
    }
  };

  const handleCategorize = (category: string) => {
    const current = products[currentIndex];
    if (!current) return;

    const example: TrainingExample = {
      sku: current.sku,
      name: current.name,
      category,
      timestamp: new Date().toISOString(),
    };

    const updated = trained.filter((t) => t.sku !== current.sku);
    updated.push(example);

    setTrained(updated);
    localStorage.setItem("trainedDubious", JSON.stringify(updated));
    setMessage("✅ Guardado");
    setShowCategorySelect(false);
    setTimeout(() => setMessage(""), 1000);

    if (currentIndex < products.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const current = products[currentIndex];
  const currentTraining = trained.find((t) => t.sku === current?.sku);
  const proposedCategory = current ? categorizeProduct(current.name).primary : null;

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", backgroundColor: "#f9fafb" }}>
      {/* Header */}
      <nav
        style={{
          backgroundColor: "#dc2626",
          color: "white",
          padding: "1rem",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <h1 style={{ margin: 0, fontSize: "1.5rem" }}>🔍 Entrenar Productos Dudosos</h1>
        <button
          onClick={() => router.push("/admin")}
          style={{
            backgroundColor: "#991b1b",
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
      <main style={{ flex: 1, padding: "2rem", maxWidth: "900px", margin: "0 auto", width: "100%" }}>
        {/* Info */}
        <div
          style={{
            marginBottom: "2rem",
            padding: "1rem",
            backgroundColor: "#fee2e2",
            borderRadius: "0.5rem",
            color: "#991b1b",
          }}
        >
          ⚠️ <strong>Revisando {products.length} productos con baja confianza en la categorización</strong>
        </div>

        {/* Progreso */}
        <div style={{ marginBottom: "2rem", display: "flex", gap: "2rem", alignItems: "center" }}>
          <div>
            <label style={{ fontWeight: "bold", marginRight: "0.5rem" }}>Progreso:</label>
            <span style={{ color: "#6b7280" }}>
              <strong>{trained.length}</strong> corregidos | <strong>{products.length - currentIndex}</strong> por revisar
            </span>
          </div>
        </div>

        {loading ? (
          <div>Cargando productos dudosos...</div>
        ) : current ? (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "280px 1fr",
              gap: "2rem",
              alignItems: "start",
            }}
          >
            {/* Imagen y datos */}
            <div>
              <img
                src={current.image_url}
                alt={current.name}
                style={{
                  width: "100%",
                  borderRadius: "0.375rem",
                  backgroundColor: "#f3f4f6",
                  marginBottom: "1rem",
                  border: "1px solid #e5e7eb",
                }}
                onError={(e) => {
                  (e.target as HTMLImageElement).src =
                    "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Crect fill='%23e5e7eb' width='200' height='200'/%3E%3C/svg%3E";
                }}
              />
              <div style={{ fontSize: "0.75rem", color: "#6b7280", marginBottom: "0.25rem" }}>SKU</div>
              <div style={{ fontWeight: "bold", fontSize: "0.875rem", marginBottom: "0.75rem" }}>
                {current.sku}
              </div>
              <div style={{ fontSize: "0.75rem", color: "#6b7280", marginBottom: "0.25rem" }}>Precio</div>
              <div style={{ fontWeight: "bold", fontSize: "0.875rem", marginBottom: "1rem" }}>
                ${current.unit_price}
              </div>
              <div style={{ fontSize: "0.75rem", color: "#6b7280", marginBottom: "0.25rem" }}>Categorizado como</div>
              <div style={{ fontWeight: "bold", fontSize: "0.75rem", color: "#dc2626" }}>
                {current.categorized_as}
              </div>
            </div>

            {/* Nombre y categoría */}
            <div>
              <div style={{ fontSize: "1.25rem", fontWeight: "bold", marginBottom: "2rem" }}>
                {current.name}
              </div>

              {!showCategorySelect ? (
                <div>
                  {/* Estado actual */}
                  <div
                    style={{
                      padding: "1.5rem",
                      backgroundColor: currentTraining ? "#dcfce7" : "#fef3c7",
                      border: `2px solid ${currentTraining ? "#86efac" : "#dc2626"}`,
                      borderRadius: "0.5rem",
                      marginBottom: "1rem",
                    }}
                  >
                    <div style={{ fontSize: "0.875rem", color: currentTraining ? "#166534" : "#92400e", marginBottom: "0.5rem" }}>
                      {currentTraining ? "✓ Corregido a:" : "⚠️ ¿Cuál es la categoría correcta?"}
                    </div>
                    <div
                      style={{
                        fontSize: "1.5rem",
                        fontWeight: "bold",
                        color: currentTraining ? "#22c55e" : "#dc2626",
                      }}
                    >
                      {currentTraining?.category || proposedCategory}
                    </div>
                  </div>

                  {/* Botones */}
                  <div style={{ display: "flex", gap: "1rem" }}>
                    <button
                      onClick={() => handleCategorize(proposedCategory!)}
                      style={{
                        flex: 1,
                        padding: "0.75rem",
                        backgroundColor: "#10b981",
                        color: "white",
                        border: "none",
                        borderRadius: "0.375rem",
                        fontWeight: "bold",
                        cursor: "pointer",
                      }}
                    >
                      ✓ {proposedCategory}
                    </button>
                    <button
                      onClick={() => setShowCategorySelect(true)}
                      style={{
                        flex: 1,
                        padding: "0.75rem",
                        backgroundColor: "#f59e0b",
                        color: "white",
                        border: "none",
                        borderRadius: "0.375rem",
                        fontWeight: "bold",
                        cursor: "pointer",
                      }}
                    >
                      🔄 Cambiar
                    </button>
                  </div>
                </div>
              ) : (
                <div>
                  <div style={{ fontSize: "0.875rem", color: "#6b7280", marginBottom: "1rem", fontWeight: "bold" }}>
                    Selecciona la categoría correcta:
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                    {CATEGORY_LIST.map((cat) => (
                      <button
                        key={cat}
                        onClick={() => handleCategorize(cat)}
                        style={{
                          padding: "0.75rem",
                          backgroundColor: cat === proposedCategory ? "#fef3c7" : "#f3f4f6",
                          border: `2px solid ${cat === proposedCategory ? "#dc2626" : "#e5e7eb"}`,
                          borderRadius: "0.375rem",
                          cursor: "pointer",
                          fontWeight: "500",
                          fontSize: "0.875rem",
                          color: cat === proposedCategory ? "#92400e" : "#374151",
                        }}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {message && (
                <div
                  style={{
                    marginTop: "1rem",
                    padding: "0.75rem",
                    backgroundColor: "#dcfce7",
                    color: "#166534",
                    borderRadius: "0.375rem",
                    textAlign: "center",
                    fontWeight: "bold",
                  }}
                >
                  {message}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div>No hay productos dudosos para revisar</div>
        )}
      </main>
    </div>
  );
}
