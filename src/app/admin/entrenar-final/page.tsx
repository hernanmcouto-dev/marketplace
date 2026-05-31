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
}

interface TrainingExample {
  sku: string;
  name: string;
  category: string;
  timestamp: string;
}

export default function EntrenarFinalPage() {
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [trained, setTrained] = useState<TrainingExample[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [showCategorySelect, setShowCategorySelect] = useState(false);

  useEffect(() => {
    loadFinalRound();
    loadTrainedExamples();
  }, []);

  const loadFinalRound = async () => {
    setLoading(true);
    try {
      const response = await fetch("/final-round.json");
      if (!response.ok) throw new Error("No se pudo cargar");
      const data = await response.json();
      setProducts(data.final_validation_round);
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadTrainedExamples = async () => {
    try {
      const saved = localStorage.getItem("trainedFinal");
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
    localStorage.setItem("trainedFinal", JSON.stringify(updated));
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
          backgroundColor: "#059669",
          color: "white",
          padding: "1rem",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <h1 style={{ margin: 0, fontSize: "1.5rem" }}>✅ Validación Final</h1>
        <button
          onClick={() => router.push("/admin")}
          style={{
            backgroundColor: "#047857",
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
            backgroundColor: "#d1fae5",
            borderRadius: "0.5rem",
            color: "#065f46",
          }}
        >
          🎯 <strong>Ronda final de validación: 15 productos de categorías variadas</strong>
        </div>

        {/* Progreso */}
        <div style={{ marginBottom: "2rem", display: "flex", gap: "2rem", alignItems: "center" }}>
          <div>
            <label style={{ fontWeight: "bold", marginRight: "0.5rem" }}>Progreso:</label>
            <span style={{ color: "#6b7280" }}>
              <strong>{trained.length}</strong> validados | <strong>{products.length - currentIndex}</strong> por revisar
            </span>
          </div>
        </div>

        {loading ? (
          <div>Cargando productos...</div>
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
              <div
                style={{
                  width: "100%",
                  height: "200px",
                  borderRadius: "0.375rem",
                  backgroundColor: "#e5e7eb",
                  marginBottom: "1rem",
                  border: "1px solid #d1d5db",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#9ca3af",
                }}
              >
                {current.image_url === "/images/placeholder.jpg" ? "Sin imagen" : "Imagen"}
              </div>
              <div style={{ fontSize: "0.75rem", color: "#6b7280", marginBottom: "0.25rem" }}>SKU</div>
              <div style={{ fontWeight: "bold", fontSize: "0.875rem", marginBottom: "0.75rem" }}>
                {current.sku}
              </div>
              <div style={{ fontSize: "0.75rem", color: "#6b7280", marginBottom: "0.25rem" }}>Precio</div>
              <div style={{ fontWeight: "bold", fontSize: "0.875rem", marginBottom: "1rem" }}>
                ${current.unit_price}
              </div>
              <div style={{ fontSize: "0.75rem", color: "#6b7280", marginBottom: "0.25rem" }}>Propuesta sistema</div>
              <div style={{ fontWeight: "bold", fontSize: "0.75rem", color: "#059669" }}>
                {proposedCategory}
              </div>
            </div>

            {/* Nombre y categoría */}
            <div>
              <div style={{ fontSize: "1.25rem", fontWeight: "bold", marginBottom: "2rem" }}>
                {current.name}
              </div>

              {!showCategorySelect ? (
                <div>
                  {/* Propuesta actual */}
                  <div
                    style={{
                      padding: "1.5rem",
                      backgroundColor: currentTraining ? "#d1fae5" : "#dbeafe",
                      border: `2px solid ${currentTraining ? "#10b981" : "#0284c7"}`,
                      borderRadius: "0.5rem",
                      marginBottom: "1rem",
                    }}
                  >
                    <div
                      style={{
                        fontSize: "0.875rem",
                        color: currentTraining ? "#065f46" : "#0c4a6e",
                        marginBottom: "0.5rem",
                      }}
                    >
                      {currentTraining ? "✓ Tu categoría:" : "Propuesta del sistema:"}
                    </div>
                    <div
                      style={{
                        fontSize: "1.5rem",
                        fontWeight: "bold",
                        color: currentTraining ? "#059669" : "#0369a1",
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
                      ✓ Correcto
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
                      ✏️ Corregir
                    </button>
                  </div>
                </div>
              ) : (
                <div>
                  <div style={{ fontSize: "0.875rem", color: "#6b7280", marginBottom: "1rem", fontWeight: "bold" }}>
                    ¿Cuál debería ser?
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                    {CATEGORY_LIST.map((cat) => (
                      <button
                        key={cat}
                        onClick={() => handleCategorize(cat)}
                        style={{
                          padding: "0.75rem",
                          backgroundColor: cat === proposedCategory ? "#dbeafe" : "#f3f4f6",
                          border: `2px solid ${cat === proposedCategory ? "#0284c7" : "#e5e7eb"}`,
                          borderRadius: "0.375rem",
                          cursor: "pointer",
                          fontWeight: "500",
                          fontSize: "0.875rem",
                          color: cat === proposedCategory ? "#0369a1" : "#374151",
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
                    backgroundColor: "#d1fae5",
                    color: "#065f46",
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
          <div>No hay productos</div>
        )}
      </main>
    </div>
  );
}
