import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

interface Product {
  sku: string;
  name: string;
  unit_price: number;
  units_per_package?: number;
  image_url?: string;
  markup?: number; // porcentaje de markup
  provider?: string;
}

const PRODUCTS_FILE = path.join(process.cwd(), "public", "products.json");

function getProducts(): Product[] {
  if (!fs.existsSync(PRODUCTS_FILE)) return [];
  try {
    return JSON.parse(fs.readFileSync(PRODUCTS_FILE, "utf-8"));
  } catch (err) {
    return [];
  }
}

function saveProducts(products: Product[]) {
  fs.writeFileSync(PRODUCTS_FILE, JSON.stringify(products, null, 2));
}

// GET - Obtener todos los productos
export async function GET(req: NextRequest) {
  try {
    const products = getProducts();
    return NextResponse.json({
      success: true,
      count: products.length,
      products,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// POST - Actualizar producto
export async function POST(req: NextRequest) {
  try {
    const { action, sku, data } = await req.json();

    if (!action || !sku) {
      return NextResponse.json({ error: "Faltan parámetros" }, { status: 400 });
    }

    const products = getProducts();
    const index = products.findIndex((p) => p.sku === sku);

    if (index === -1) {
      return NextResponse.json({ error: "Producto no encontrado" }, { status: 404 });
    }

    if (action === "update") {
      // Actualizar producto
      products[index] = {
        ...products[index],
        ...data,
      };
      saveProducts(products);

      return NextResponse.json({
        success: true,
        message: "Producto actualizado",
        product: products[index],
      });
    } else if (action === "delete") {
      // Eliminar producto
      const deleted = products.splice(index, 1)[0];
      saveProducts(products);

      return NextResponse.json({
        success: true,
        message: "Producto eliminado",
        deleted,
      });
    } else {
      return NextResponse.json({ error: "Acción no válida" }, { status: 400 });
    }
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// DELETE - Eliminar todos los productos de un proveedor
export async function DELETE(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const provider = searchParams.get("provider");

    if (!provider) {
      return NextResponse.json({ error: "Falta provider" }, { status: 400 });
    }

    const products = getProducts();
    const beforeCount = products.length;

    // Filtrar productos del proveedor especificado
    const filtered = products.filter((p) => p.provider !== provider);
    const deletedCount = beforeCount - filtered.length;

    saveProducts(filtered);

    return NextResponse.json({
      success: true,
      message: `${deletedCount} productos de ${provider} eliminados`,
      remaining: filtered.length,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
