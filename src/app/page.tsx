"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    // Redirigir a login si no hay sesión
    const auth = document.cookie.includes("auth=");
    if (!auth) {
      router.push("/login");
    } else {
      // Si hay sesión, ir al dashboard correspondiente
      try {
        const authCookie = document.cookie
          .split("; ")
          .find((row) => row.startsWith("auth="))
          ?.split("=")[1];

        if (authCookie) {
          const auth = JSON.parse(decodeURIComponent(authCookie));
          if (auth.userType === "admin") {
            router.push("/admin");
          } else {
            router.push("/cliente");
          }
        }
      } catch (err) {
        router.push("/login");
      }
    }
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
