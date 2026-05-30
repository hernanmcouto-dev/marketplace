import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

interface Product {
  sku: string;
  name: string;
  unit_price: number;
  units_per_package?: number;
  image_url?: string;
  provider?: string;
}

export async function POST(req: NextRequest) {
  try {
    const { products, provider } = await req.json();

    if (!Array.isArray(products) || !provider) {
      return NextResponse.json(
        { error: "Se requieren 'products' (array) y 'provider' (string)" },
        { status: 400 }
      );
    }

    // Validar estructura de productos
    const validProducts: Product[] = products
      .filter((p: any) => p.sku && p.name && p.unit_price)
      .map((p: any) => ({
        sku: p.sku,
        name: p.name,
        unit_price: parseInt(p.unit_price),
        units_per_package: p.units_per_package || 1,
        image_url: p.image_url || "",
        provider,
      }));

    if (validProducts.length === 0) {
      return NextResponse.json(
        { error: "No hay productos válidos para importar" },
        { status: 400 }
      );
    }

    // Determinar archivo según proveedor
    const providerMap: Record<string, string> = {
      "Impotekno": "products.json",
      "San Julián": "products-sanjulian.json",
      "NextCell": "products-nextcell.json",
    };
    const fileName = providerMap[provider] || `products-${provider.toLowerCase()}.json`;

    const filePath = path.join(process.cwd(), "public", fileName);
    fs.writeFileSync(filePath, JSON.stringify(validProducts, null, 2), "utf-8");

    return NextResponse.json({
      success: true,
      imported: validProducts.length,
      provider,
      file: fileName,
      message: `${validProducts.length} productos de ${provider} importados correctamente`,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Error al procesar la solicitud" },
      { status: 500 }
    );
  }
}
