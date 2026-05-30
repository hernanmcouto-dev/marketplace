import got from "got";
import { CookieJar } from "tough-cookie";

const cookieJar = new CookieJar();
const client = got.extend({
  cookieJar,
  headers: {
    "User-Agent": "Mozilla/5.0",
    "Referer": "https://sanjulian99.com/catalogo2021.php?rub=1",
  },
});

try {
  await client.post("https://sanjulian99.com/index.php", {
    form: { clave: "pasteur", enviar: "Ingresar" },
  });

  const urls = [
    "https://sanjulian99.com/api/productos?rub=1",
    "https://sanjulian99.com/api/catalogo?rub=1",
    "https://sanjulian99.com/getproductos.php?rub=1",
    "https://sanjulian99.com/productos.php?rub=1",
    "https://sanjulian99.com/listaproductos.php?rub=1",
    "https://sanjulian99.com/catalogo_data.php?rub=1",
  ];

  for (const url of urls) {
    try {
      const resp = await client.get(url);
      console.log(`✓ ${url}: ${resp.statusCode}`);
      console.log(resp.body.substring(0, 300));
      console.log("---");
    } catch (err) {
      // console.log(`✗ ${url}: ${err.response?.statusCode || err.message}`);
    }
  }
} catch (err) {
  console.error(err.message);
}
