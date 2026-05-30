"use client";

import { useEffect, useState } from "react";

interface Product {
  sku: string;
  name: string;
  unit_price: number;
  image_url?: string;
  provider?: string;
}

export default function TiendaPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadProducts = async () => {
      try {
        const response = await fetch("/api/productos/all");
        const data = await response.json();
        setProducts(Array.isArray(data.products) ? data.products : []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    loadProducts();
  }, []);

  if (loading) return <div className="p-8 text-center">Cargando...</div>;

  const byProvider = products.reduce((acc, p) => {
    const provider = p.provider || "Otros";
    if (!acc[provider]) acc[provider] = [];
    acc[provider].push(p);
    return acc;
  }, {} as Record<string, Product[]>);

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <h1 className="text-3xl font-bold mb-2">Tienda</h1>
      <p className="text-gray-600 mb-8">Total: <strong>{products.length}</strong> productos</p>

      {Object.entries(byProvider).map(([provider, prods]) => (
        <div key={provider} className="mb-12">
          <h2 className="text-xl font-semibold mb-4 text-blue-600">{provider} ({prods.length})</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {prods.map((p, i) => (
              <div key={`${p.sku}-${i}`} className="bg-white p-3 rounded border hover:shadow transition text-center">
                <div className="h-24 bg-gradient-to-br from-gray-200 to-gray-100 rounded mb-2 flex items-center justify-center">
                  <span className="text-gray-400 text-xs">📦</span>
                </div>
                <p className="text-xs font-mono text-gray-500 truncate">{p.sku}</p>
                <p className="text-xs font-semibold mb-2 line-clamp-2 h-8">{p.name}</p>
                <p className="text-sm font-bold text-green-600">${p.unit_price.toLocaleString("es-AR")}</p>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
