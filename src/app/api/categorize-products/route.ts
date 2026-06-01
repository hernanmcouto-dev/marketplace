import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { categorizeProduct } from "@/lib/product-categorizer";

export async function POST(req: NextRequest) {
  try {
    const { supplier } = await req.json();

    if (!supplier) {
      return NextResponse.json({ error: "Supplier required" }, { status: 400 });
    }

    const supplierMap: Record<string, string> = {
      impotekno: "products.json",
      sanjulian: "products-sanjulian.json",
      nextcell: "products-nextcell.json",
    };

    const filename = supplierMap[supplier];
    if (!filename) {
      return NextResponse.json({ error: "Invalid supplier" }, { status: 400 });
    }

    const filePath = path.join(process.cwd(), "public", filename);

    // Read products
    if (!fs.existsSync(filePath)) {
      return NextResponse.json({ error: "Products file not found" }, { status: 404 });
    }

    const products = JSON.parse(fs.readFileSync(filePath, "utf-8"));

    // Categorize products without category
    let categorizedCount = 0;
    const updatedProducts = products.map((p: any) => {
      if (!p.category || p.category === "Sin categorizar") {
        const categorization = categorizeProduct(p.name);
        categorizedCount++;
        return {
          ...p,
          category: categorization.category,
        };
      }
      return p;
    });

    // Write back to file
    fs.writeFileSync(filePath, JSON.stringify(updatedProducts, null, 2), "utf-8");

    return NextResponse.json({
      success: true,
      supplier,
      total: updatedProducts.length,
      categorized: categorizedCount,
      message: `${categorizedCount} productos categorizados`,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
