import got from "got";
import { CookieJar } from "tough-cookie";
import fs from "fs";

const cookieJar = new CookieJar();
const client = got.extend({
  cookieJar,
  headers: {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
  },
});

try {
  await client.post("https://sanjulian99.com/index.php", {
    form: {
      clave: "pasteur",
      enviar: "Ingresar",
    },
  });
  console.log("✓ Login exitoso");

  const response = await client.get("https://sanjulian99.com/catalogo2021.php?rub=1");
  const html = response.body;

  fs.writeFileSync("sanjulian_category1.html", html);
  console.log("✓ HTML guardado");

  // Análisis
  if (html.includes("<tr")) {
    console.log("✓ Encontrado: <tr>");
  } else {
    console.log("✗ NO encontrado: <tr>");
  }

  if (html.includes("<td")) {
    console.log("✓ Encontrado: <td>");
  } else {
    console.log("✗ NO encontrado: <td>");
  }

  if (html.includes("caja_producto")) {
    console.log("✓ Encontrado: caja_producto");
  }

  // Buscar palabras clave
  const lines = html.split("\n");
  const productLines = lines.filter(line =>
    line.includes("producto") ||
    line.includes("SKU") ||
    line.includes("Codigo") ||
    line.includes("caja")
  );

  console.log(`\n📊 Líneas con palabras clave: ${productLines.length}`);
  console.log("\nPrimeras 10 líneas con palabras clave:");
  productLines.slice(0, 10).forEach(line => {
    console.log(line.substring(0, 150));
  });

} catch (err) {
  console.error("Error:", err.message);
}
