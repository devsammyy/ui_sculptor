import { DiskFileSystemAdapter } from "@/infrastructure/adapters/file-system-adapters";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  request: NextRequest,
  { params }: { params: { filename: string } },
) {
  try {
    const filename = params.filename;
    if (!filename || filename.includes("..")) {
      return NextResponse.json(
        { success: false, error: "Invalid filename" },
        { status: 400 },
      );
    }

    const fs = new DiskFileSystemAdapter(process.cwd());
    let targetPath = `src/components/${filename}`;
    if (!(await fs.exists(targetPath))) {
      if (await fs.exists(`src/components/organisms/${filename}`)) {
        targetPath = `src/components/organisms/${filename}`;
      }
    }
    const code = await fs.readFile(targetPath);

    return NextResponse.json({
      success: true,
      filename,
      filePath: targetPath,
      code,
    });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: "File not found" },
      { status: 404 },
    );
  }
}

