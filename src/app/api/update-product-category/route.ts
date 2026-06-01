import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export async function POST(req: NextRequest) {
  try {
    const { sku, category, supplier } = await req.json();

    if (!sku || !category || !supplier) {
      return NextResponse.json(
        { error: "sku, category, and supplier required" },
        { status: 400 }
      );
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

    if (!fs.existsSync(filePath)) {
      return NextResponse.json({ error: "Products file not found" }, { status: 404 });
    }

    const products = JSON.parse(fs.readFileSync(filePath, "utf-8"));

    const productIndex = products.findIndex((p: any) => p.sku === sku);
    if (productIndex === -1) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    const oldCategory = products[productIndex].category;
    products[productIndex].category = category;

    fs.writeFileSync(filePath, JSON.stringify(products, null, 2), "utf-8");

    return NextResponse.json({
      success: true,
      sku,
      oldCategory,
      newCategory: category,
      message: `Categoría actualizada: ${oldCategory} → ${category}`,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
