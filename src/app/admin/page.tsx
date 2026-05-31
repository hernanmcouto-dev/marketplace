"use client";
import Link from "next/link";

export default function AdminDashboard() {
  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#0f172a" }}>
      <header style={{ background: "linear-gradient(135deg, #1e293b 0%, #0f172a 100%)", color: "white", padding: "2rem 1rem", borderBottom: "2px solid #3b82f6" }}>
        <div style={{ maxWidth: "1400px", margin: "0 auto" }}>
          <h1 style={{ margin: 0, fontSize: "2rem", fontWeight: "bold" }}>Panel de Admin</h1>
        </div>
      </header>

      <main style={{ maxWidth: "1400px", margin: "0 auto", padding: "2rem 1rem" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "1.5rem" }}>
          <Link href="/admin/entrenar-categorias" style={{ textDecoration: "none" }}>
            <div style={{ backgroundColor: "#1e293b", border: "2px solid #3b82f620", borderRadius: "0.75rem", padding: "1.5rem", cursor: "pointer", color: "white", minHeight: "150px", display: "flex", flexDirection: "column", justifyContent: "space-between" }} onMouseOver={e => { e.currentTarget.style.borderColor = "#3b82f6"; e.currentTarget.style.backgroundColor = "#0f172a"; }} onMouseOut={e => { e.currentTarget.style.borderColor = "#3b82f620"; e.currentTarget.style.backgroundColor = "#1e293b"; }}>
              <div><h3 style={{ margin: "0 0 0.5rem 0" }}>Entrenar Categorias</h3></div>
              <span style={{ color: "#3b82f6" }}>→</span>
            </div>
          </Link>
          
          <Link href="/admin/entrenar-dudas" style={{ textDecoration: "none" }}>
            <div style={{ backgroundColor: "#1e293b", border: "2px solid #f59e0b20", borderRadius: "0.75rem", padding: "1.5rem", cursor: "pointer", color: "white", minHeight: "150px", display: "flex", flexDirection: "column", justifyContent: "space-between" }} onMouseOver={e => { e.currentTarget.style.borderColor = "#f59e0b"; e.currentTarget.style.backgroundColor = "#0f172a"; }} onMouseOut={e => { e.currentTarget.style.borderColor = "#f59e0b20"; e.currentTarget.style.backgroundColor = "#1e293b"; }}>
              <div><h3 style={{ margin: "0 0 0.5rem 0" }}>Revisar Dudas</h3></div>
              <span style={{ color: "#f59e0b" }}>→</span>
            </div>
          </Link>

          <Link href="/admin/entrenar-final" style={{ textDecoration: "none" }}>
            <div style={{ backgroundColor: "#1e293b", border: "2px solid #10b98120", borderRadius: "0.75rem", padding: "1.5rem", cursor: "pointer", color: "white", minHeight: "150px", display: "flex", flexDirection: "column", justifyContent: "space-between" }} onMouseOver={e => { e.currentTarget.style.borderColor = "#10b981"; e.currentTarget.style.backgroundColor = "#0f172a"; }} onMouseOut={e => { e.currentTarget.style.borderColor = "#10b98120"; e.currentTarget.style.backgroundColor = "#1e293b"; }}>
              <div><h3 style={{ margin: "0 0 0.5rem 0" }}>Validacion Final</h3></div>
              <span style={{ color: "#10b981" }}>→</span>
            </div>
          </Link>

          <Link href="/shop" style={{ textDecoration: "none" }}>
            <div style={{ backgroundColor: "#1e293b", border: "2px solid #ec489920", borderRadius: "0.75rem", padding: "1.5rem", cursor: "pointer", color: "white", minHeight: "150px", display: "flex", flexDirection: "column", justifyContent: "space-between" }} onMouseOver={e => { e.currentTarget.style.borderColor = "#ec4899"; e.currentTarget.style.backgroundColor = "#0f172a"; }} onMouseOut={e => { e.currentTarget.style.borderColor = "#ec489920"; e.currentTarget.style.backgroundColor = "#1e293b"; }}>
              <div><h3 style={{ margin: "0 0 0.5rem 0" }}>Ver Tienda</h3></div>
              <span style={{ color: "#ec4899" }}>→</span>
            </div>
          </Link>
        </div>
      </main>
    </div>
  );
}
