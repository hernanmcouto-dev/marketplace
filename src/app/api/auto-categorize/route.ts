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

interface ProductWithCategory extends Product {
  category: string;
}

export async function POST(req: NextRequest) {
  try {
    const { supplier } = await req.json() as { supplier: "impotekno" | "sanjulian" };

    const filename = supplier === "impotekno" ? "products.json" : "products-sanjulian.json";
    const filePath = path.join(process.cwd(), "public", filename);

    // Read products
    const data = fs.readFileSync(filePath, "utf-8");
    const products: Product[] = JSON.parse(data);

    console.log(`[Auto-Categorize] Processing ${products.length} products from ${supplier}...`);

    // Categorize each product
    const categorized: ProductWithCategory[] = products.map((product) => ({
      ...product,
      category: categorizeProduct(product.name).primary,
    }));

    // Save back
    fs.writeFileSync(filePath, JSON.stringify(categorized, null, 2), "utf-8");

    // Calculate stats
    const stats: Record<string, number> = {};
    categorized.forEach((p) => {
      stats[p.category] = (stats[p.category] || 0) + 1;
    });

    console.log(`[Auto-Categorize] ✅ ${supplier} done`);

    return NextResponse.json({
      success: true,
      message: `${products.length} products auto-categorized`,
      supplier,
      productsCount: products.length,
      stats,
    });
  } catch (error: any) {
    console.error("[Auto-Categorize] Error:", error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
