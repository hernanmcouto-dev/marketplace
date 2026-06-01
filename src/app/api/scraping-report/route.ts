import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const supplier = searchParams.get("supplier") || "impotekno";

    const reportFileMap: Record<string, string> = {
      impotekno: ".scraping-report-impotekno.json",
      sanjulian: ".scraping-report-sanjulian.json",
      nextcell: ".scraping-report-nextcell.json",
    };

    const reportFile = reportFileMap[supplier];
    if (!reportFile) {
      return NextResponse.json({ error: "Invalid supplier" }, { status: 400 });
    }

    const reportPath = path.join(process.cwd(), "public", reportFile);

    if (!fs.existsSync(reportPath)) {
      return NextResponse.json(
        { error: "No scraping report available yet", message: "Run scraper first" },
        { status: 404 }
      );
    }

    const reportData = JSON.parse(fs.readFileSync(reportPath, "utf-8"));

    return NextResponse.json(reportData);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
