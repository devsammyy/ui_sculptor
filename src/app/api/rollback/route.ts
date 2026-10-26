import { DiskFileSystemAdapter } from "@/infrastructure/adapters/file-system-adapters";
import { NextRequest, NextResponse } from "next/server";

/**
 * POST /api/rollback
 * Command undo trigger
 * Pops last command from history and reverses it
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { steps = 1 } = body;

    // In a real implementation, this would access a shared command history
    // For now, we'll simulate with a file-based approach
    const fileSystem = new DiskFileSystemAdapter(process.cwd());
    const historyPath = ".ui-sculptor/history.json";

    let history: Array<{
      filePath: string;
      oldCode: string;
      newCode: string;
      timestamp: number;
    }> = [];

    try {
      const historyContent = await fileSystem.readFile(historyPath);
      history = JSON.parse(historyContent);
    } catch {
      // No history file yet
    }

    if (history.length === 0) {
      return NextResponse.json(
        { success: false, error: "No commands to undo" },
        { status: 400 },
      );
    }

    const results = [];
    for (let i = 0; i < steps && history.length > 0; i++) {
      const lastCommand = history.pop()!;
      // Restore old code
      await fileSystem.writeFile(lastCommand.filePath, lastCommand.oldCode);
      results.push({
        filePath: lastCommand.filePath,
        restored: true,
      });
    }

    // Save updated history
    await fileSystem.writeFile(historyPath, JSON.stringify(history, null, 2));

    return NextResponse.json({
      success: true,
      data: {
        undoneSteps: results.length,
        results,
        remainingHistory: history.length,
      },
    });
  } catch (error) {
    console.error("Rollback error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Rollback failed",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
