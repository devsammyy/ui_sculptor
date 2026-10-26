import { DiskFileSystemAdapter } from "@/infrastructure/adapters/file-system-adapters";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const fs = new DiskFileSystemAdapter(process.cwd());
    const files = await fs.listFiles("src/components");
    // Filter to top-level .tsx component files
    const componentFiles = files
      .filter((f) => f.endsWith(".tsx") && !f.includes("/atoms/") && !f.includes("/molecules/") && !f.includes("/organisms/") && !f.includes("/templates/") && !f.includes("/pages/"))
      .map((f) => f.replace(/^src\/components\//, ""));

    return NextResponse.json({
      success: true,
      files: componentFiles,
    });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: "Failed to list component files" },
      { status: 500 },
    );
  }
}

