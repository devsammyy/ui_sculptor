import { DiskFileSystemAdapter } from "@/infrastructure/adapters/file-system-adapters";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const fs = new DiskFileSystemAdapter(process.cwd());
    const files = await fs.listFiles("src/components");
    const componentFiles = files
      .filter((f) => {
        if (!f.endsWith(".tsx")) return false;
        if (
          f.includes("/atoms/") ||
          f.includes("/molecules/") ||
          f.includes("/templates/") ||
          f.includes("/pages/")
        ) {
          return false;
        }
        const rel = f.replace(/^src\/components\//, "");
        return !rel.includes("/") || rel === "organisms/Scene3DTarget.tsx";
      })
      .map((f) => f.replace(/^src\/components\/(organisms\/)?/, ""));

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

