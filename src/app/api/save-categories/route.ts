import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

interface ProductWithCategory {
  sku: string;
  name: string;
  unit_price: number;
  units_per_package: number;
  image_url: string;
  category: string;
}

export async function POST(req: NextRequest) {
  try {
    const { supplier, products } = await req.json() as {
      supplier: "impotekno" | "sanjulian";
      products: ProductWithCategory[];
    };

    if (!supplier || !products || !Array.isArray(products)) {
      return NextResponse.json(
        { error: "Datos inválidos" },
        { status: 400 }
      );
    }

    const filename = supplier === "impotekno" ? "products.json" : "products-sanjulian.json";
    const filePath = path.join(process.cwd(), "public", filename);

    // Guardar productos con categorías
    fs.writeFileSync(
      filePath,
      JSON.stringify(products, null, 2),
      "utf-8"
    );

    // Crear informe de categorización
    const categoryStats: Record<string, number> = {};
    products.forEach((p) => {
      categoryStats[p.category] = (categoryStats[p.category] || 0) + 1;
    });

    return NextResponse.json({
      success: true,
      message: `${products.length} productos categorizados exitosamente`,
      supplier,
      stats: categoryStats,
      productsCount: products.length,
    });
  } catch (error: any) {
    console.error("Error saving categories:", error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
