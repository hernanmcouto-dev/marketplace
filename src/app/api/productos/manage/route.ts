import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export const revalidate = 0;

export async function POST(req: NextRequest) {
  try {
    const { action, category, product } = await req.json();

    const categorizedPath = path.join(process.cwd(), "products-categorized.json");
    let categories: { [key: string]: any[] } = {};

    if (fs.existsSync(categorizedPath)) {
      categories = JSON.parse(fs.readFileSync(categorizedPath, "utf-8"));
    }

    // Asegurarse que existen las categorías manuales
    if (!categories["Liquidación"]) categories["Liquidación"] = [];
    if (!categories["Próximos Ingresos"]) categories["Próximos Ingresos"] = [];

    if (action === "add") {
      // Agregar un producto a una categoría manual
      if (!category || !product) {
        return NextResponse.json(
          { error: "Falta category o product" },
          { status: 400 }
        );
      }

      // Si el producto tiene SKU, buscarlo y copiarlo
      if (product.sku) {
        let found = false;
        for (const [cat, prods] of Object.entries(categories)) {
          const existing = prods.find((p: any) => p.sku === product.sku);
          if (existing) {
            // Remover de la categoría anterior
            categories[cat] = prods.filter((p: any) => p.sku !== product.sku);
            found = true;
            break;
          }
        }

        // Agregar a la nueva categoría
        if (!categories[category]) categories[category] = [];
        categories[category].push(product);
      } else {
        // Crear un producto manual
        if (!product.name || !product.unit_price) {
          return NextResponse.json(
            { error: "Producto manual requiere name y unit_price" },
            { status: 400 }
          );
        }
        const newProduct = {
          sku: product.sku || `MANUAL-${Date.now()}`,
          name: product.name,
          unit_price: product.unit_price,
          units_per_package: product.units_per_package || 1,
          image_url: product.image_url || "",
          provider: product.provider || "Manual",
        };
        if (!categories[category]) categories[category] = [];
        categories[category].push(newProduct);
      }

      fs.writeFileSync(categorizedPath, JSON.stringify(categories, null, 2));

      return NextResponse.json({
        success: true,
        message: `Producto agregado a ${category}`,
        category,
        productCount: categories[category].length,
      });
    } else if (action === "remove") {
      // Remover un producto
      if (!category || !product?.sku) {
        return NextResponse.json(
          { error: "Falta category o sku" },
          { status: 400 }
        );
      }

      if (categories[category]) {
        categories[category] = categories[category].filter(
          (p: any) => p.sku !== product.sku
        );
        fs.writeFileSync(categorizedPath, JSON.stringify(categories, null, 2));
      }

      return NextResponse.json({
        success: true,
        message: `Producto removido de ${category}`,
      });
    } else if (action === "list") {
      // Listar productos de una categoría
      const categoryName = category || "Liquidación";
      const products = categories[categoryName] || [];

      return NextResponse.json({
        success: true,
        category: categoryName,
        count: products.length,
        products,
      });
    }

    return NextResponse.json({ error: "Acción no válida" }, { status: 400 });
  } catch (err: any) {
    console.error("[manage-api] Error:", err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
