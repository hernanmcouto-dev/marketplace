import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { categorizeProduct } from "@/lib/product-categorizer";

interface Product {
  sku: string;
  name: string;
  unit_price: number;
  units_per_package: number;
  image_url: string;
}

export async function POST(req: NextRequest) {
  try {
    const { supplier } = await req.json() as { supplier: "impotekno" | "sanjulian" };

    const filename = supplier === "impotekno" ? "products.json" : "products-sanjulian.json";
    const filePath = path.join(process.cwd(), "public", filename);

    console.log(`[Recategorize] Reading ${supplier} products...`);
    const data = fs.readFileSync(filePath, "utf-8");
    const products: Product[] = JSON.parse(data);

    console.log(`[Recategorize] Processing ${products.length} products with FULL algorithm...`);

    // Categorizar con el algoritmo completo
    const categorized = products.map((product) => ({
      ...product,
      category: categorizeProduct(product.name).primary,
    }));

    // Guardar
    fs.writeFileSync(filePath, JSON.stringify(categorized, null, 2), "utf-8");

    // Estadísticas
    const stats: Record<string, number> = {};
    categorized.forEach((p) => {
      stats[p.category] = (stats[p.category] || 0) + 1;
    });

    console.log(`[Recategorize] ✅ ${supplier} done`);

    return NextResponse.json({
      success: true,
      message: `${products.length} products re-categorized with FULL algorithm`,
      supplier,
      productsCount: products.length,
      stats,
    });
  } catch (error: any) {
    console.error("[Recategorize] Error:", error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
