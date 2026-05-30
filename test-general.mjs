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
  console.log("1. Haciendo login...");
  const loginResp = await client.post("https://sanjulian99.com/index.php", {
    form: {
      clave: "pasteur",
      enviar: "Ingresar",
    },
  });
  console.log(`Login status: ${loginResp.statusCode}`);

  console.log("2. Accediendo a categoría GENERAL (99999)...");
  const response = await client.get(
    "https://sanjulian99.com/catalogo2021.php?rub=99999"
  );

  const html = response.body;
  fs.writeFileSync("sanjulian_general.html", html);

  // Buscar patrones de productos
  const trMatches = html.match(/<tr[^>]*>/g) || [];
  const tdMatches = html.match(/<td[^>]*>/g) || [];
  const tableMatches = html.match(/<table[^>]*>/g) || [];

  console.log(`\nEstadísticas del HTML:`);
  console.log(`- <table> tags: ${tableMatches.length}`);
  console.log(`- <tr> tags: ${trMatches.length}`);
  console.log(`- <td> tags: ${tdMatches.length}`);
  console.log(`- Total chars: ${html.length}`);

  // Buscar números entre paréntesis que indiquen cantidad
  const catMatches = html.match(/\(\d+\)/g) || [];
  console.log(`- Categorías con cantidad: ${catMatches.length}`);
  console.log(`- Primeras 5: ${catMatches.slice(0, 5).join(", ")}`);

} catch (err) {
  console.error("Error:", err.message);
}
