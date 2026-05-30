import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

interface SupplierConfig {
  id: string;
  name: string;
  exchange_rate: number;
  currency?: string;
  [key: string]: any;
}

const configPath = path.join(process.cwd(), "suppliers-config.json");

function getConfig(): SupplierConfig[] {
  try {
    if (fs.existsSync(configPath)) {
      return JSON.parse(fs.readFileSync(configPath, "utf-8"));
    }
  } catch (err) {
    console.error("Error reading config:", err);
  }
  return [];
}

function saveConfig(config: SupplierConfig[]) {
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
}

export async function GET(req: NextRequest) {
  try {
    const config = getConfig();
    const suppliers = config.map((s) => ({
      id: s.id,
      name: s.name,
      exchange_rate: s.exchange_rate,
      currency: s.currency || "USD",
    }));

    return NextResponse.json({ suppliers });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { supplierId, exchange_rate } = body;

    if (!supplierId || !exchange_rate || exchange_rate <= 0) {
      return NextResponse.json(
        { error: "Invalid supplierId or exchange_rate" },
        { status: 400 }
      );
    }

    const config = getConfig();
    const supplier = config.find((s) => s.id === supplierId);

    if (!supplier) {
      return NextResponse.json(
        { error: "Supplier not found" },
        { status: 404 }
      );
    }

    supplier.exchange_rate = exchange_rate;
    saveConfig(config);

    return NextResponse.json({
      success: true,
      supplier: {
        id: supplier.id,
        name: supplier.name,
        exchange_rate: supplier.exchange_rate,
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message },
      { status: 500 }
    );
  }
}
