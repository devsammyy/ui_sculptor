import { FileSystemPort } from "../../ports/file-system.port";

/**
 * Base command interface for all sculpt operations
 * Implements the Command Pattern for undo/redo functionality
 */
export interface ICommand {
  readonly id: string;
  readonly timestamp: number;
  readonly targetFile: string;
  execute(): Promise<void>;
  undo(): Promise<void>;
}

/**
 * Command to mutate a component file
 * Stores before/after state for perfect rollback
 */
export class MutateComponentCommand implements ICommand {
  constructor(
    public readonly id: string,
    public readonly timestamp: number,
    public readonly targetFile: string,
    private readonly beforeCode: string,
    private readonly afterCode: string,
    private readonly fileSystem: FileSystemPort,
  ) {}

  async execute(): Promise<void> {
    await this.fileSystem.writeFile(this.targetFile, this.afterCode);
  }

  async undo(): Promise<void> {
    await this.fileSystem.writeFile(this.targetFile, this.beforeCode);
  }

  /**
   * Create a new command with updated afterCode (for chaining)
   */
  withUpdatedCode(newAfterCode: string): MutateComponentCommand {
    return new MutateComponentCommand(
      this.id,
      this.timestamp,
      this.targetFile,
      this.beforeCode,
      newAfterCode,
      this.fileSystem,
    );
  }
}

/**
 * Command to create a new file
 */
export class CreateFileCommand implements ICommand {
  constructor(
    public readonly id: string,
    public readonly timestamp: number,
    public readonly targetFile: string,
    private readonly content: string,
    private readonly fileSystem: FileSystemPort,
  ) {}

  async execute(): Promise<void> {
    await this.fileSystem.writeFile(this.targetFile, this.content);
  }

  async undo(): Promise<void> {
    await this.fileSystem.deleteFile(this.targetFile);
  }
}

/**
 * Command to delete a file
 */
export class DeleteFileCommand implements ICommand {
  constructor(
    public readonly id: string,
    public readonly timestamp: number,
    public readonly targetFile: string,
    private readonly deletedContent: string,
    private readonly fileSystem: FileSystemPort,
  ) {}

  async execute(): Promise<void> {
    await this.fileSystem.deleteFile(this.targetFile);
  }

  async undo(): Promise<void> {
    await this.fileSystem.writeFile(this.targetFile, this.deletedContent);
  }
}

/**
 * Composite command for batch operations
 */
export class CompositeCommand implements ICommand {
  public readonly id: string;
  public readonly timestamp: number;
  public readonly targetFile: string = "batch";

  constructor(private readonly commands: ICommand[]) {
    this.id = `batch-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    this.timestamp = Date.now();
  }

  async execute(): Promise<void> {
    for (const command of this.commands) {
      await command.execute();
    }
  }

  async undo(): Promise<void> {
    // Undo in reverse order
    for (const command of [...this.commands].reverse()) {
      await command.undo();
    }
  }
}

/**
 * Command history manager with ring buffer for checkpoints
 */
export class CommandHistory {
  private readonly maxSize: number;
  private history: ICommand[] = [];
  private currentIndex: number = -1;

  constructor(maxSize: number = 20) {
    this.maxSize = maxSize;
  }

  push(command: ICommand): void {
    // If we're not at the end, truncate future history
    if (this.currentIndex < this.history.length - 1) {
      this.history = this.history.slice(0, this.currentIndex + 1);
    }

    this.history.push(command);
    this.currentIndex = this.history.length - 1;

    // Enforce max size (ring buffer)
    if (this.history.length > this.maxSize) {
      this.history.shift();
      this.currentIndex--;
    }
  }

  canUndo(): boolean {
    return this.currentIndex >= 0;
  }

  canRedo(): boolean {
    return this.currentIndex < this.history.length - 1;
  }

  async undo(): Promise<ICommand | null> {
    if (!this.canUndo()) return null;

    const command = this.history[this.currentIndex];
    if (!command) return null;
    await command.undo();
    this.currentIndex--;
    return command;
  }

  async redo(): Promise<ICommand | null> {
    if (!this.canRedo()) return null;

    this.currentIndex++;
    const command = this.history[this.currentIndex];
    if (!command) return null;
    await command.execute();
    return command;
  }

  getHistory(): readonly ICommand[] {
    return this.history;
  }

  clear(): void {
    this.history = [];
    this.currentIndex = -1;
  }
}
