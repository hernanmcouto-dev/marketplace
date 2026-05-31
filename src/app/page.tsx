"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    // Redirigir a la tienda pública por defecto
    router.push("/shop");
  }, [router]);

  return (
    <main style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "2rem" }}>
      <div style={{ textAlign: "center" }}>
        <h1 style={{ fontSize: "2.25rem", fontWeight: "bold", marginBottom: "1rem" }}>
          Marketplace Simple
        </h1>
        <p style={{ fontSize: "1.125rem", color: "#6b7280", marginBottom: "2rem" }}>
          Redirigiendo...
        </p>
      </div>
    </main>
  );
}
