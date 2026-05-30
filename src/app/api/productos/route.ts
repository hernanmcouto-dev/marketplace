import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "50");
    const search = searchParams.get("search") || searchParams.get("q") || "";
    const offset = (page - 1) * limit;

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

    // Cargar NextCell
    const nextcellPath = path.join(process.cwd(), "public", "products-nextcell.json");
    if (fs.existsSync(nextcellPath)) {
      const data = JSON.parse(fs.readFileSync(nextcellPath, "utf-8"));
      if (Array.isArray(data)) {
        allProducts.push(...data);
      }
    }

    // Filtrar por búsqueda
    let filteredProducts = allProducts;
    if (search) {
      const searchLower = search.toLowerCase();
      filteredProducts = allProducts.filter(
        (p) =>
          p.name?.toLowerCase().includes(searchLower) ||
          p.sku?.toLowerCase().includes(searchLower)
      );
    }

    // Aplicar paginación
    const paginatedProducts = filteredProducts.slice(offset, offset + limit);

    return NextResponse.json(
      {
        success: true,
        count: filteredProducts.length,
        total: allProducts.length,
        page,
        limit,
        pages: Math.ceil(filteredProducts.length / limit),
        search: search || null,
        products: paginatedProducts,
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
