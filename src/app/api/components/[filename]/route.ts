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
    const filePath = `src/components/${filename}`;
    const code = await fs.readFile(filePath);

    return NextResponse.json({
      success: true,
      filename,
      filePath,
      code,
    });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: "File not found" },
      { status: 404 },
    );
  }
}

