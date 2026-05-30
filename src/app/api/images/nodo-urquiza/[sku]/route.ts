import { NextResponse } from "next/server";

export async function GET(
  req: any,
  { params }: { params: any }
) {
  const { sku } = params;

  const colors = [
    "3B82F6", "EC4899", "8B5CF6", "14B8A6", "F59E0B",
    "EF4444", "10B981", "F97316", "6366F1", "06B6D4"
  ];

  const hash = (sku || "").split("").reduce((acc: number, char: string) => acc + char.charCodeAt(0), 0);
  const color = colors[hash % colors.length];

  return NextResponse.redirect(
    `https://placehold.co/300x300/${color}/FFFFFF?text=${encodeURIComponent(sku || "")}`,
    { status: 307 }
  );
}
