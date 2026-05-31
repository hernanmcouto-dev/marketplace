"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { CATEGORY_LIST } from "@/lib/product-categorizer";

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
  const [currentIndex, setCurrentIndex] = useState(0);
  const [supplier, setSupplier] = useState<"impotekno" | "sanjulian">("impotekno");
  const [trained, setTrained] = useState<TrainingExample[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  useEffect(() => {
    loadProducts();
  }, [supplier]);

  useEffect(() => {
    loadTrainedExamples();
  }, []);

  const loadProducts = async () => {
    setLoading(true);
    try {
      const filename = supplier === "impotekno" ? "products.json" : "products-sanjulian.json";
      const response = await fetch(`/${filename}`);
      if (!response.ok) throw new Error("No se pudo cargar");
      const data = await response.json();
      setProducts(data);
      setCurrentIndex(0);
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

    const updated = trained.filter(
      (t) => t.sku !== current.sku && t.name !== current.name
    );
    updated.push(example);

    setTrained(updated);
    localStorage.setItem("trainedExamples", JSON.stringify(updated));
    setMessage("✅ Guardado");
    setTimeout(() => setMessage(""), 1000);

    if (currentIndex < products.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const current = products[currentIndex];
  const isAlreadyTrained = trained.some(
    (t) => t.sku === current?.sku || t.name === current?.name
  );

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
        {/* Proveedor */}
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
            {trained.length} categorizados
          </span>
        </div>

        {loading ? (
          <div>Cargando...</div>
        ) : current ? (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "300px 1fr",
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
                }}
                onError={(e) => {
                  (e.target as HTMLImageElement).src =
                    "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Crect fill='%23e5e7eb' width='200' height='200'/%3E%3C/svg%3E";
                }}
              />
              <div style={{ fontSize: "0.875rem", color: "#6b7280", marginBottom: "0.25rem" }}>
                SKU
              </div>
              <div style={{ fontWeight: "bold", marginBottom: "1rem" }}>{current.sku}</div>
              <div style={{ fontSize: "0.875rem", color: "#6b7280", marginBottom: "0.25rem" }}>
                Precio
              </div>
              <div style={{ fontWeight: "bold" }}>${current.unit_price}</div>
            </div>

            {/* Nombre y categorías */}
            <div>
              <div style={{ fontSize: "1.25rem", fontWeight: "bold", marginBottom: "2rem" }}>
                {current.name}
              </div>

              {isAlreadyTrained && (
                <div
                  style={{
                    padding: "1rem",
                    backgroundColor: "#dcfce7",
                    border: "1px solid #86efac",
                    borderRadius: "0.375rem",
                    marginBottom: "1rem",
                    color: "#166534",
                    fontWeight: "bold",
                  }}
                >
                  ✓ Ya categorizado: {trained.find((t) => t.sku === current.sku)?.category}
                </div>
              )}

              <div style={{ fontSize: "0.875rem", color: "#6b7280", marginBottom: "0.75rem", fontWeight: "bold" }}>
                ¿Cuál es la categoría correcta?
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                {CATEGORY_LIST.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => handleCategorize(cat)}
                    style={{
                      padding: "1rem",
                      backgroundColor: "#f3f4f6",
                      border: "1px solid #e5e7eb",
                      borderRadius: "0.375rem",
                      cursor: "pointer",
                      fontWeight: "500",
                      fontSize: "0.875rem",
                      transition: "all 0.2s",
                    }}
                    onMouseEnter={(e) => {
                      (e.target as HTMLButtonElement).style.backgroundColor = "#e5e7eb";
                      (e.target as HTMLButtonElement).style.borderColor = "#3b82f6";
                    }}
                    onMouseLeave={(e) => {
                      (e.target as HTMLButtonElement).style.backgroundColor = "#f3f4f6";
                      (e.target as HTMLButtonElement).style.borderColor = "#e5e7eb";
                    }}
                  >
                    {cat}
                  </button>
                ))}
              </div>

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

              <div style={{ marginTop: "2rem", fontSize: "0.875rem", color: "#6b7280" }}>
                {currentIndex + 1} de {products.length}
              </div>
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
          <h3 style={{ margin: "0 0 1rem 0" }}>📊 Ejemplos Entrenados</h3>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "1rem" }}>
            {CATEGORY_LIST.map((cat) => {
              const count = trained.filter((t) => t.category === cat).length;
              return (
                <div key={cat} style={{ textAlign: "center" }}>
                  <div style={{ fontSize: "1.5rem", fontWeight: "bold", color: "#3b82f6" }}>
                    {count}
                  </div>
                  <div style={{ fontSize: "0.875rem", color: "#6b7280" }}>{cat}</div>
                </div>
              );
            })}
          </div>
        </div>
      </main>
    </div>
  );
}
