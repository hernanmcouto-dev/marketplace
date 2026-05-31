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
}

interface TrainingExample {
  sku: string;
  name: string;
  category: string;
  timestamp: string;
}

export default function EntrenarCategoriasPage() {
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [shuffledProducts, setShuffledProducts] = useState<Product[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [supplier, setSupplier] = useState<"impotekno" | "sanjulian">("impotekno");
  const [trained, setTrained] = useState<TrainingExample[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [showAnalysis, setShowAnalysis] = useState(false);
  const [showCategorySelect, setShowCategorySelect] = useState(false);

  useEffect(() => {
    loadProducts();
    loadTrainedExamples();
  }, []);

  useEffect(() => {
    if (products.length > 0) {
      // Shuffle products
      const shuffled = [...products].sort(() => Math.random() - 0.5);
      setShuffledProducts(shuffled);
    }
  }, [products, supplier]);

  // Auto-run analysis when we have 15+ examples
  useEffect(() => {
    if (trained.length >= 15 && !showAnalysis) {
      setShowAnalysis(true);
    }
  }, [trained.length]);

  const loadProducts = async () => {
    setLoading(true);
    try {
      const filename = supplier === "impotekno" ? "products.json" : "products-sanjulian.json";
      const response = await fetch(`/${filename}`);
      if (!response.ok) throw new Error("No se pudo cargar");
      const data = await response.json();
      setProducts(data);
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadTrainedExamples = async () => {
    try {
      const saved = localStorage.getItem("trainedExamples");
      if (saved) {
        const parsed = JSON.parse(saved);
        // Limpiar referencias a "Audio y Video" antigua
        const cleaned = parsed.map((ex: TrainingExample) =>
          ex.category === "Audio y Video" ? { ...ex, category: "Audio Video y Parlantes" } : ex
        );
        setTrained(cleaned);
        localStorage.setItem("trainedExamples", JSON.stringify(cleaned));
      }
    } catch (error) {
      console.error("Error loading trained examples:", error);
    }
  };

  const handleCategorize = (category: string) => {
    const current = shuffledProducts[currentIndex];
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
    localStorage.setItem("trainedExamples", JSON.stringify(updated));
    setMessage("✅ Guardado");
    setShowCategorySelect(false);
    setTimeout(() => setMessage(""), 1000);

    if (currentIndex < shuffledProducts.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const current = shuffledProducts[currentIndex];
  const currentTraining = trained.find(
    (t) => t.sku === current?.sku || t.name === current?.name
  );
  const proposedCategory = current
    ? categorizeProduct(current.name).primary
    : null;

  if (showAnalysis) {
    return (
      <AnalysisView
        trained={trained}
        onBack={() => {
          setShowAnalysis(false);
          setCurrentIndex(0);
          setTrained([]);
          localStorage.removeItem("trainedExamples");
        }}
      />
    );
  }

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
        <h1 style={{ margin: 0, fontSize: "1.5rem" }}>🧠 Entrenar Categorías</h1>
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
      <main style={{ flex: 1, padding: "2rem", maxWidth: "900px", margin: "0 auto", width: "100%" }}>
        {/* Info */}
        <div
          style={{
            marginBottom: "2rem",
            padding: "1rem",
            backgroundColor: "#dbeafe",
            borderRadius: "0.5rem",
            color: "#0c4a6e",
          }}
        >
          ✨ <strong>Cuando tengas 15+ productos categorizados, haré el análisis automáticamente</strong>
        </div>

        {/* Proveedor y progreso */}
        <div style={{ marginBottom: "2rem", display: "flex", gap: "2rem", alignItems: "center" }}>
          <div>
            <label style={{ fontWeight: "bold", marginRight: "0.5rem" }}>Proveedor:</label>
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
          </div>
          <div style={{ color: "#6b7280" }}>
            <strong>{trained.length}</strong> categorizados | <strong>{shuffledProducts.length - currentIndex}</strong> por hacer
          </div>
        </div>

        {loading ? (
          <div>Cargando...</div>
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
              <div style={{ fontSize: "0.75rem", color: "#6b7280", marginBottom: "0.25rem" }}>
                SKU
              </div>
              <div style={{ fontWeight: "bold", fontSize: "0.875rem", marginBottom: "0.75rem" }}>
                {current.sku}
              </div>
              <div style={{ fontSize: "0.75rem", color: "#6b7280", marginBottom: "0.25rem" }}>
                Precio
              </div>
              <div style={{ fontWeight: "bold", fontSize: "0.875rem" }}>${current.unit_price}</div>
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
                      backgroundColor: currentTraining ? "#dcfce7" : "#dbeafe",
                      border: `2px solid ${currentTraining ? "#86efac" : "#0284c7"}`,
                      borderRadius: "0.5rem",
                      marginBottom: "1rem",
                    }}
                  >
                    <div style={{ fontSize: "0.875rem", color: currentTraining ? "#166534" : "#0c4a6e", marginBottom: "0.5rem" }}>
                      {currentTraining ? "✓ Categorizado:" : "Propuesta:"}
                    </div>
                    <div
                      style={{
                        fontSize: "1.5rem",
                        fontWeight: "bold",
                        color: currentTraining ? "#22c55e" : "#0369a1",
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
                      ✓ Confirmar
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
          <div>No hay productos</div>
        )}

        {/* Stats */}
        <div
          style={{
            marginTop: "3rem",
            padding: "1.5rem",
            backgroundColor: "white",
            border: "1px solid #e5e7eb",
            borderRadius: "0.5rem",
          }}
        >
          <h3 style={{ margin: "0 0 1rem 0" }}>📊 Conteo por Categoría</h3>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: "1rem" }}>
            {CATEGORY_LIST.map((cat) => {
              const count = trained.filter((t) => t.category === cat).length;
              return (
                <div
                  key={cat}
                  style={{
                    padding: "0.75rem",
                    backgroundColor: count > 0 ? "#dbeafe" : "#f3f4f6",
                    borderRadius: "0.375rem",
                    textAlign: "center",
                  }}
                >
                  <div
                    style={{
                      fontSize: "1.5rem",
                      fontWeight: "bold",
                      color: count > 0 ? "#0369a1" : "#9ca3af",
                    }}
                  >
                    {count}
                  </div>
                  <div style={{ fontSize: "0.75rem", color: "#6b7280" }}>{cat}</div>
                </div>
              );
            })}
          </div>
        </div>
      </main>
    </div>
  );
}

/* Analysis View */
function AnalysisView({
  trained,
  onBack,
}: {
  trained: TrainingExample[];
  onBack: () => void;
}) {
  const categoryCounts: Record<string, number> = {};
  const categoryExamples: Record<string, TrainingExample[]> = {};

  trained.forEach((ex) => {
    categoryCounts[ex.category] = (categoryCounts[ex.category] || 0) + 1;
    if (!categoryExamples[ex.category]) {
      categoryExamples[ex.category] = [];
    }
    categoryExamples[ex.category].push(ex);
  });

  return (
    <div style={{ minHeight: "100vh", padding: "2rem", backgroundColor: "#f9fafb" }}>
      <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
        <div style={{ marginBottom: "2rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h1 style={{ margin: 0 }}>📊 Análisis de Aprendizaje</h1>
          <button
            onClick={onBack}
            style={{
              padding: "0.75rem 1.5rem",
              backgroundColor: "#3b82f6",
              color: "white",
              border: "none",
              borderRadius: "0.375rem",
              fontWeight: "bold",
              cursor: "pointer",
            }}
          >
            ← Volver a Entrenar
          </button>
        </div>

        <div
          style={{
            backgroundColor: "white",
            border: "1px solid #e5e7eb",
            borderRadius: "0.5rem",
            padding: "2rem",
          }}
        >
          <h2>📈 Tus Categorías Aprendidas</h2>
          <p style={{ color: "#6b7280" }}>
            Total de ejemplos: <strong>{trained.length}</strong>
          </p>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "2rem", marginTop: "2rem" }}>
            {Object.entries(categoryCounts).map(([category, count]) => (
              <div key={category} style={{ border: "1px solid #e5e7eb", borderRadius: "0.5rem", padding: "1.5rem" }}>
                <h3 style={{ margin: "0 0 1rem 0", color: "#0369a1" }}>{category}</h3>
                <p style={{ margin: "0 0 1rem 0", fontSize: "0.875rem", color: "#6b7280" }}>
                  <strong>{count}</strong> productos
                </p>
                <div style={{ fontSize: "0.875rem" }}>
                  {categoryExamples[category].slice(0, 5).map((ex, idx) => (
                    <div key={idx} style={{ color: "#374151", marginBottom: "0.5rem" }}>
                      • {ex.name.substring(0, 50)}...
                    </div>
                  ))}
                  {categoryExamples[category].length > 5 && (
                    <div style={{ color: "#9ca3af", fontSize: "0.75rem" }}>
                      ... y {categoryExamples[category].length - 5} más
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div style={{ marginTop: "2rem", padding: "1.5rem", backgroundColor: "#dbeafe", borderRadius: "0.5rem", color: "#0c4a6e" }}>
            ✅ <strong>Análisis listo.</strong> Ahora voy a reescribir el algoritmo basándome en estos patrones. Por favor, dame 2-3 minutos para actualizar el sistema.
          </div>
        </div>
      </div>
    </div>
  );
}
