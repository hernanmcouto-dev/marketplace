import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export const revalidate = 0;

export async function GET(req: NextRequest) {
  try {
    const categorizedPath = path.join(process.cwd(), "products-categorized.json");

    let categories: { [key: string]: any[] } = {};

    if (fs.existsSync(categorizedPath)) {
      categories = JSON.parse(fs.readFileSync(categorizedPath, "utf-8"));
    } else {
      const impoteknoPath = path.join(process.cwd(), "public", "products.json");
      const sanjulianPath = path.join(process.cwd(), "public", "products-sanjulian.json");

      const impoteknoData = fs.existsSync(impoteknoPath)
        ? JSON.parse(fs.readFileSync(impoteknoPath, "utf-8"))
        : [];

      const sanjulianData = fs.existsSync(sanjulianPath)
        ? JSON.parse(fs.readFileSync(sanjulianPath, "utf-8"))
        : [];

      const allProducts = [
        ...impoteknoData.map((p: any) => ({ ...p, provider: "Impotekno" })),
        ...sanjulianData.map((p: any) => ({ ...p, provider: "San Julián" })),
      ];

      allProducts.forEach((product: any) => {
        const category = extractCategory(product.name);
        if (!categories[category]) {
          categories[category] = [];
        }
        categories[category].push(product);
      });
    }

    const allProducts = Object.values(categories).flat();

    return NextResponse.json({
      success: true,
      totalProducts: allProducts.length,
      totalCategories: Object.keys(categories).length,
      categories,
      products: allProducts,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Error desconocido" },
      { status: 500 }
    );
  }
}

function extractCategory(name: string): string {
  const nameUpper = name.toUpperCase();

  // Palabras clave primarias (productos principales) - peso alto
  const primaryKeywords: { [key: string]: string[] } = {
    "Audio & Parlantes": [
      "PARLANTE", "AURICULAR", "MICRÓFONO", "KARAOKE", "ALTAVOZ",
      "AUDIFONO", "SPEAKER", "RADIO", "VINCHA", "GATITO", "AUXILIAR"
    ],
    "Audio y Video": [
      "PROYECTOR", "VIDEO", "PANTALLA", "CINE", "TELEVISOR"
    ],
    "Soportes": [
      "SOPORTE", "SOPORTES", "HOLDER"
    ],
    "Pilas y Baterías": [
      "PILA", "PILAS", "BATERIA"
    ],
    "Cargadores": [
      "CARGADOR"
    ],
    "Cables & Adaptadores": [
      "CABLE", "ADAPTADOR", "USB", "HDMI", "CONECTOR"
    ],
    "Hogar & Cocina": [
      "JARRA", "TETERA", "FREIDORA", "ANAFE", "LICUADORA", "JUGUERA",
      "TERMO", "VASO", "ASPIRADORA", "BALANZA", "CAFETERA", "ESCURRIDOR",
      "HUMIDIFICADOR", "PAVA", "OLLA", "CUCHILLO", "SECAPLATOS",
      "CUCHILLOS", "PELA", "COPA", "MEZCLADORA", "TENDER",
      "AFILADOR", "EXPRIMIDOR", "CANILLA", "GRIFERIA"
    ],
    "Belleza & Cuidado": [
      "CEPILLO", "SECADOR", "BUCLERA", "RIZADORA", "PEINE", "ESPEJO"
    ],
    "Herramientas": [
      "LLAVE", "HERRAMIENTA", "DESTORNILLADOR", "MARTILLO"
    ],
    "Deportes & Bicicleta": [
      "BICICLETA", "BICI", "REJILLA", "MONOPATIN", "MONOPATÍN"
    ],
    "Niños & Juguetes": [
      "JUGUETE", "INFANTIL", "BEBÉ", "CÁMARA", "TRIPODE", "MUÑECA", "JUEGO"
    ],
    "Electrónica": [
      "ELECTRÓNICA", "COMPUTADORA", "LAPTOP", "MONITOR", "TECLADO",
      "MOUSE", "COMPONENTE", "PC", "ESCRITORIO"
    ],
    "Ropa & Accesorios": [
      "ROPA", "ZAPATO", "GAFAS", "LENTES", "BUFANDA", "GUANTE"
    ],
  };

  // Palabras clave secundarias (características) - peso bajo
  const secondaryKeywords: { [key: string]: string[] } = {
    "Iluminación": [
      "LED", "LINTERNA", "LUZ", "LÁMPARA", "FARO", "ILUMINACIÓN",
      "FOCO", "TIRA", "NEON", "RGB", "VELADOR"
    ],
    "Cargadores": [
      "FUENTE", "ALIMENTADOR", "RECARGABLE", "SOLAR"
    ],
    "Cables & Adaptadores": [
      "PUERTO", "DISPLAY PORT", "TIPO C"
    ],
    "Hogar & Cocina": [
      "COCINA", "BAZAR", "HOGAR"
    ],
    "Belleza & Cuidado": [
      "BELLEZA", "COSMÉTICA"
    ],
    "Audio & Parlantes": [
      "SONIDO", "AUDIO"
    ],
  };

  // Buscar primero en palabras clave primarias
  for (const [category, keywords] of Object.entries(primaryKeywords)) {
    if (keywords.some(keyword => nameUpper.includes(keyword))) {
      return category;
    }
  }

  // Si no hay coincidencia primaria, buscar en palabras clave secundarias
  for (const [category, keywords] of Object.entries(secondaryKeywords)) {
    if (keywords.some(keyword => nameUpper.includes(keyword))) {
      return category;
    }
  }

  return "Otros";
}
