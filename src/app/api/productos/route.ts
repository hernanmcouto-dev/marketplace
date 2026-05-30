import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export async function GET(req: NextRequest) {
  try {
    const allProducts: any[] = [];

    // Cargar Impotekno
    const impoteknoPath = path.join(process.cwd(), "public", "products.json");
    if (fs.existsSync(impoteknoPath)) {
      const data = JSON.parse(fs.readFileSync(impoteknoPath, "utf-8"));
      if (Array.isArray(data)) {
        allProducts.push(...data);
      }
    }

    // Cargar San Julián
    const sanjulianPath = path.join(process.cwd(), "public", "products-sanjulian.json");
    if (fs.existsSync(sanjulianPath)) {
      const data = JSON.parse(fs.readFileSync(sanjulianPath, "utf-8"));
      if (Array.isArray(data)) {
        allProducts.push(...data);
      }
    }

    return NextResponse.json(
      {
        success: true,
        count: allProducts.length,
        products: allProducts,
      },
      { status: 200 }
    );
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message, products: [] },
      { status: 500 }
    );
  }
}
