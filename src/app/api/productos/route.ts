import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export async function GET(req: NextRequest) {
  try {
    const filePath = path.join(process.cwd(), "public", "products.json");

    if (!fs.existsSync(filePath)) {
      return NextResponse.json(
        { error: "No hay productos cargados", products: [] },
        { status: 200 }
      );
    }

    const data = fs.readFileSync(filePath, "utf-8");
    const products = JSON.parse(data);

    return NextResponse.json(
      {
        success: true,
        count: products.length,
        products: Array.isArray(products) ? products : [],
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
