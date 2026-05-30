import { NextRequest, NextResponse } from "next/server";

const CREDENTIALS = {
  cliente: "1234",
  admin: "0007",
};

export async function POST(req: NextRequest) {
  try {
    const { password, userType } = await req.json();

    if (!password || !userType || (userType !== "cliente" && userType !== "admin")) {
      return NextResponse.json(
        { error: "Datos inválidos" },
        { status: 400 }
      );
    }

    const correctPassword = CREDENTIALS[userType as keyof typeof CREDENTIALS];

    if (password !== correctPassword) {
      return NextResponse.json(
        { error: "Contraseña incorrecta" },
        { status: 401 }
      );
    }

    const response = NextResponse.json(
      { success: true, userType },
      { status: 200 }
    );

    // Set cookie for authentication
    response.cookies.set({
      name: "auth",
      value: JSON.stringify({ userType, loginTime: Date.now() }),
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });

    return response;
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Error al procesar la solicitud" },
      { status: 500 }
    );
  }
}
