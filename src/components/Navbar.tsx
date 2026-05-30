import Link from "next/link";

export function Navbar() {
  return (
    <nav style={{ backgroundColor: "#2563eb", color: "white", padding: "1rem 0", position: "sticky", top: 0, zIndex: 50 }}>
      <div style={{ maxWidth: "80rem", margin: "0 auto", padding: "0 1rem" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "1rem" }}>
          <Link href="/tienda" style={{ textDecoration: "none", color: "white" }}>
            <h1 style={{ fontSize: "1.875rem", fontWeight: "bold", margin: 0 }}>
              PlanetaOnce
            </h1>
          </Link>
          <form style={{ display: "flex", flex: 1, maxWidth: "28rem" }} action="/tienda">
            <div style={{ position: "relative", width: "100%" }}>
              <input
                type="text"
                name="q"
                placeholder="Buscar productos..."
                style={{
                  width: "100%",
                  padding: "0.5rem",
                  borderRadius: "0.375rem",
                  color: "#111827",
                  border: "none",
                }}
              />
              <button
                type="submit"
                style={{
                  position: "absolute",
                  right: "0.5rem",
                  top: "0.5rem",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: "#4b5563",
                }}
              >
                🔍
              </button>
            </div>
          </form>
          <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
            <button
              style={{
                background: "none",
                border: "none",
                color: "white",
                cursor: "pointer",
                fontSize: "1.5rem",
              }}
              title="Carrito"
            >
              🛒
            </button>
            <Link href="/admin/tipo-cambio" style={{ textDecoration: "none", color: "white", fontSize: "1.25rem" }}>
              ⚙️
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
}
