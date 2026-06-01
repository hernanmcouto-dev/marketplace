import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export async function POST(req: NextRequest) {
  try {
    const { products, supplier } = await req.json();

    if (!products || !Array.isArray(products)) {
      return NextResponse.json({ error: "Invalid products array" }, { status: 400 });
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

    // Write updated products to file
    fs.writeFileSync(filePath, JSON.stringify(products, null, 2), "utf-8");

    return NextResponse.json({
      success: true,
      message: `Products updated for ${supplier}`,
      count: products.length,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
