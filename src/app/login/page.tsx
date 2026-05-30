"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [userType, setUserType] = useState<"cliente" | "admin">("cliente");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password, userType }),
      });

      const data = await response.json();

      if (response.ok) {
        if (userType === "admin") {
          router.push("/admin");
        } else {
          router.push("/cliente");
        }
      } else {
        setError(data.error || "Contraseña incorrecta");
      }
    } catch (err) {
      setError("Error al conectar con el servidor");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#f3f4f6",
      }}
    >
      <div
        style={{
          backgroundColor: "white",
          padding: "2rem",
          borderRadius: "0.5rem",
          boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
          width: "100%",
          maxWidth: "28rem",
        }}
      >
        <h1
          style={{
            fontSize: "1.875rem",
            fontWeight: "bold",
            marginBottom: "0.5rem",
            textAlign: "center",
          }}
        >
          Marketplace
        </h1>
        <p
          style={{
            textAlign: "center",
            color: "#6b7280",
            marginBottom: "2rem",
          }}
        >
          Ingresa como cliente o administrador
        </p>

        <form onSubmit={handleLogin}>
          <div style={{ marginBottom: "1.5rem" }}>
            <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: "500" }}>
              Tipo de Acceso
            </label>
            <div style={{ display: "flex", gap: "1rem" }}>
              <button
                type="button"
                onClick={() => setUserType("cliente")}
                style={{
                  flex: 1,
                  padding: "0.75rem",
                  border: "2px solid",
                  borderColor: userType === "cliente" ? "#3b82f6" : "#d1d5db",
                  borderRadius: "0.375rem",
                  backgroundColor: userType === "cliente" ? "#eff6ff" : "white",
                  color: userType === "cliente" ? "#3b82f6" : "#6b7280",
                  fontWeight: "500",
                  cursor: "pointer",
                }}
              >
                👤 Cliente
              </button>
              <button
                type="button"
                onClick={() => setUserType("admin")}
                style={{
                  flex: 1,
                  padding: "0.75rem",
                  border: "2px solid",
                  borderColor: userType === "admin" ? "#ef4444" : "#d1d5db",
                  borderRadius: "0.375rem",
                  backgroundColor: userType === "admin" ? "#fef2f2" : "white",
                  color: userType === "admin" ? "#ef4444" : "#6b7280",
                  fontWeight: "500",
                  cursor: "pointer",
                }}
              >
                🔐 Admin
              </button>
            </div>
          </div>

          <div style={{ marginBottom: "1.5rem" }}>
            <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: "500" }}>
              Contraseña
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={userType === "admin" ? "0007" : "1234"}
              style={{
                width: "100%",
                padding: "0.75rem",
                border: "1px solid #d1d5db",
                borderRadius: "0.375rem",
                fontSize: "1rem",
              }}
              disabled={loading}
            />
          </div>

          {error && (
            <div
              style={{
                marginBottom: "1rem",
                padding: "0.75rem",
                backgroundColor: "#fee2e2",
                color: "#991b1b",
                borderRadius: "0.375rem",
                fontSize: "0.875rem",
              }}
            >
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              width: "100%",
              padding: "0.75rem",
              backgroundColor: userType === "admin" ? "#ef4444" : "#3b82f6",
              color: "white",
              border: "none",
              borderRadius: "0.375rem",
              fontWeight: "500",
              cursor: loading ? "not-allowed" : "pointer",
              opacity: loading ? 0.7 : 1,
            }}
          >
            {loading ? "Conectando..." : "Ingresar"}
          </button>
        </form>

        <div
          style={{
            marginTop: "1.5rem",
            padding: "1rem",
            backgroundColor: "#f0fdf4",
            borderRadius: "0.375rem",
            fontSize: "0.875rem",
            color: "#166534",
          }}
        >
          <p style={{ margin: "0 0 0.5rem 0", fontWeight: "500" }}>Credenciales de prueba:</p>
          <p style={{ margin: "0.25rem 0" }}>👤 Cliente: 1234</p>
          <p style={{ margin: "0.25rem 0" }}>🔐 Admin: 0007</p>
        </div>
      </div>
    </div>
  );
}
