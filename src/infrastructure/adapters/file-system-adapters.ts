import * as fs from "fs/promises";
import * as path from "path";
import {
  FileSystemPort,
  VirtualFileNode,
  VirtualFileSystemPort,
  TelemetryPort,
  TelemetryEvent,
  TelemetryListener,
} from "../../core/ports/file-system.port";

/**
 * Disk File System Adapter - Uses Node.js fs/promises for local development
 * Implements FileSystemPort for local file operations
 */
export class DiskFileSystemAdapter implements FileSystemPort {
  private readonly rootDir: string;
  private snapshots: Map<
    string,
    { label: string; timestamp: number; files: Map<string, string> }
  > = new Map();

  constructor(rootDir: string = process.cwd()) {
    this.rootDir = rootDir;
  }

  private resolvePath(filePath: string): string {
    // Ensure path is relative and within root
    const normalized = path.normalize(filePath);
    if (path.isAbsolute(normalized)) {
      // If absolute, make it relative to root
      return path.join(this.rootDir, path.relative(this.rootDir, normalized));
    }
    return path.join(this.rootDir, normalized);
  }

  async readFile(filePath: string): Promise<string> {
    const fullPath = this.resolvePath(filePath);
    return fs.readFile(fullPath, "utf-8");
  }

  async writeFile(filePath: string, content: string): Promise<void> {
    const fullPath = this.resolvePath(filePath);
    const dir = path.dirname(fullPath);
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(fullPath, content, "utf-8");
  }

  async deleteFile(filePath: string): Promise<void> {
    const fullPath = this.resolvePath(filePath);
    try {
      await fs.unlink(fullPath);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
        throw error;
      }
    }
  }

  async exists(filePath: string): Promise<boolean> {
    const fullPath = this.resolvePath(filePath);
    try {
      await fs.access(fullPath);
      return true;
    } catch {
      return false;
    }
  }

  async listFiles(dirPath: string): Promise<string[]> {
    const fullPath = this.resolvePath(dirPath);
    const entries = await fs.readdir(fullPath, { withFileTypes: true });
    const files: string[] = [];

    for (const entry of entries) {
      const entryPath = path.join(dirPath, entry.name);
      if (entry.isDirectory()) {
        files.push(...(await this.listFiles(entryPath)));
      } else {
        files.push(entryPath);
      }
    }

    return files;
  }

  async readFiles(paths: string[]): Promise<Map<string, string>> {
    const result = new Map<string, string>();
    await Promise.all(
      paths.map(async (p) => {
        try {
          result.set(p, await this.readFile(p));
        } catch {
          // Skip files that don't exist
        }
      }),
    );
    return result;
  }

  async createSnapshot(label?: string): Promise<string> {
    const snapshotId = `snap-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    const files = new Map<string, string>();

    // Capture all project files (excluding node_modules, .git, etc.)
    const allFiles = await this.listFiles(".");
    const projectFiles = allFiles.filter(
      (f) =>
        !f.includes("node_modules") &&
        !f.includes(".git") &&
        !f.includes(".next") &&
        !f.includes("dist") &&
        !f.includes("build"),
    );

    for (const file of projectFiles) {
      try {
        files.set(file, await this.readFile(file));
      } catch {
        // Skip unreadable files
      }
    }

    this.snapshots.set(snapshotId, {
      label: label || `Snapshot ${this.snapshots.size + 1}`,
      timestamp: Date.now(),
      files,
    });

    return snapshotId;
  }

  async restoreSnapshot(snapshotId: string): Promise<void> {
    const snapshot = this.snapshots.get(snapshotId);
    if (!snapshot) {
      throw new Error(`Snapshot not found: ${snapshotId}`);
    }

    // Write all files from snapshot
    for (const [filePath, content] of snapshot.files) {
      await this.writeFile(filePath, content);
    }
  }

  async listSnapshots(): Promise<
    Array<{ id: string; label: string; timestamp: number }>
  > {
    return Array.from(this.snapshots.entries())
      .map(([id, data]) => ({
        id,
        label: data.label,
        timestamp: data.timestamp,
      }))
      .sort((a, b) => b.timestamp - a.timestamp);
  }
}

/**
 * Memory Virtual File System Adapter - In-memory file tree for cloud sandbox demos
 * Implements VirtualFileSystemPort for zero-disk-write cloud demos
 */
export class MemoryFileSystemAdapter implements VirtualFileSystemPort {
  private fileTree: VirtualFileNode = {
    name: "root",
    type: "directory",
    children: new Map(),
  };
  private snapshots: Map<
    string,
    { label: string; timestamp: number; tree: VirtualFileNode }
  > = new Map();

  private getNode(
    filePath: string,
    createMissing: boolean = false,
  ): { parent: VirtualFileNode; name: string; node?: VirtualFileNode } {
    const parts = filePath.split("/").filter((p) => p.length > 0);
    let current = this.fileTree;

    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i];
      let child = current.children?.get(part);

      if (!child) {
        if (!createMissing) {
          throw new Error(`Directory not found: ${part}`);
        }
        child = { name: part, type: "directory", children: new Map() };
        current.children!.set(part, child);
      }

      if (child.type !== "directory") {
        throw new Error(`Not a directory: ${part}`);
      }
      current = child;
    }

    const name = parts[parts.length - 1];
    const node = current.children?.get(name);
    return { parent: current, name, node };
  }

  async readFile(filePath: string): Promise<string> {
    const { node } = this.getNode(filePath);
    if (!node || node.type !== "file") {
      throw new Error(`File not found: ${filePath}`);
    }
    return node.content || "";
  }

  async writeFile(filePath: string, content: string): Promise<void> {
    const { parent, name } = this.getNode(filePath, true);
    if (!parent.children) {
      parent.children = new Map();
    }
    parent.children.set(name, { name, type: "file", content });
  }

  async deleteFile(filePath: string): Promise<void> {
    const { parent, name } = this.getNode(filePath);
    if (!parent.children?.has(name)) {
      throw new Error(`File not found: ${filePath}`);
    }
    parent.children.delete(name);
  }

  async exists(filePath: string): Promise<boolean> {
    try {
      const { node } = this.getNode(filePath);
      return !!node;
    } catch {
      return false;
    }
  }

  async listFiles(dirPath: string): Promise<string[]> {
    const { node } = this.getNode(dirPath);
    if (!node || node.type !== "directory" || !node.children) {
      return [];
    }

    const files: string[] = [];
    const collectFiles = (node: VirtualFileNode, currentPath: string) => {
      if (node.type === "file") {
        files.push(currentPath);
      } else if (node.children) {
        for (const [name, child] of node.children) {
          collectFiles(child, currentPath ? `${currentPath}/${name}` : name);
        }
      }
    };

    const basePrefix = dirPath && dirPath !== "." ? dirPath.replace(/\/+$/, "") : "";
    for (const [name, child] of node.children) {
      const childPath = basePrefix ? `${basePrefix}/${name}` : name;
      collectFiles(child, childPath);
    }

    return files;
  }

  async readFiles(paths: string[]): Promise<Map<string, string>> {
    const result = new Map<string, string>();
    for (const p of paths) {
      try {
        result.set(p, await this.readFile(p));
      } catch {
        // Skip missing files
      }
    }
    return result;
  }

  async createSnapshot(label?: string): Promise<string> {
    const snapshotId = `snap-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    // Deep clone the file tree
    const clonedTree = this.cloneNode(this.fileTree);
    this.snapshots.set(snapshotId, {
      label: label || `Snapshot ${this.snapshots.size + 1}`,
      timestamp: Date.now(),
      tree: clonedTree,
    });
    return snapshotId;
  }

  async restoreSnapshot(snapshotId: string): Promise<void> {
    const snapshot = this.snapshots.get(snapshotId);
    if (!snapshot) {
      throw new Error(`Snapshot not found: ${snapshotId}`);
    }
    this.fileTree = this.cloneNode(snapshot.tree);
  }

  async listSnapshots(): Promise<
    Array<{ id: string; label: string; timestamp: number }>
  > {
    return Array.from(this.snapshots.entries())
      .map(([id, data]) => ({
        id,
        label: data.label,
        timestamp: data.timestamp,
      }))
      .sort((a, b) => b.timestamp - a.timestamp);
  }

  async getFileTree(): Promise<VirtualFileNode> {
    return this.cloneNode(this.fileTree);
  }

  async setFileTree(tree: VirtualFileNode): Promise<void> {
    this.fileTree = this.cloneNode(tree);
  }

  private cloneNode(node: VirtualFileNode): VirtualFileNode {
    const cloned: VirtualFileNode = {
      name: node.name,
      type: node.type,
    };

    if (node.type === "file") {
      cloned.content = node.content;
    } else if (node.children) {
      cloned.children = new Map();
      for (const [name, child] of node.children) {
        cloned.children.set(name, this.cloneNode(child));
      }
    }

    return cloned;
  }

  /**
   * Initialize with a project structure (for demos)
   */
  async initializeWithProject(files: Record<string, string>): Promise<void> {
    for (const [filePath, content] of Object.entries(files)) {
      await this.writeFile(filePath, content);
    }
  }
}

/**
 * Console and pub-sub Telemetry Adapter
 */
export class ConsoleTelemetryAdapter implements TelemetryPort {
  private listeners: Set<TelemetryListener> = new Set();

  emit(event: TelemetryEvent): void {
    if (process.env.NODE_ENV !== "test") {
      console.log(`[Telemetry][${event.step}] ${event.status}`, event.metadata || "");
    }
    this.listeners.forEach((listener) => {
      try {
        listener(event);
      } catch (err) {
        console.error("Telemetry listener error:", err);
      }
    });
  }

  subscribe(listener: TelemetryListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }
}
