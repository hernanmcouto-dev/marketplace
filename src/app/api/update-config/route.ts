import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { usdToArs } = body;

    if (!usdToArs || isNaN(parseFloat(usdToArs))) {
      return NextResponse.json(
        { error: "usdToArs inválido" },
        { status: 400 }
      );
    }

    const configPath = path.join(process.cwd(), "public/config-nodo.json");
    const config = {
      usd_to_ars: parseFloat(usdToArs),
      margin_percentage: 15,
      last_updated: new Date().toISOString(),
    };

    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));

    return NextResponse.json({
      success: true,
      message: `Tipo de cambio actualizado a: 1 USD = ${usdToArs} ARS`,
      config,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Error al actualizar config" },
      { status: 500 }
    );
  }
}
