import { execFile } from 'child_process';
import { promisify } from 'util';
import { access } from 'fs/promises';

const execFileAsync = promisify(execFile);

const DEFAULT_TIMEOUT = 30000; // 30 seconds

/**
 * Wrapper class for GNU binutils commands
 */
export class Binutils {
  private prefix: string;

  constructor(prefix?: string) {
    this.prefix = prefix ?? process.env.BINDIFF_TOOLCHAIN_PREFIX ?? '';
  }

  /**
   * Get the full command name with optional toolchain prefix
   */
  private cmd(tool: string): string {
    return `${this.prefix}${tool}`;
  }

  /**
   * Execute a binutils command
   */
  private async exec(tool: string, args: string[]): Promise<string> {
    const command = this.cmd(tool);
    try {
      const { stdout } = await execFileAsync(command, args, {
        timeout: DEFAULT_TIMEOUT,
        maxBuffer: 50 * 1024 * 1024, // 50MB buffer for large binaries
      });
      return stdout;
    } catch (error) {
      const err = error as NodeJS.ErrnoException & { stderr?: string };
      if (err.code === 'ENOENT') {
        throw new Error(`Command not found: ${command}. Ensure GNU binutils is installed and in PATH.`);
      }
      if (err.code === 'ETIMEDOUT') {
        throw new Error(`Command timed out: ${command} ${args.join(' ')}`);
      }
      if (err.stderr) {
        throw new Error(`${command} error: ${err.stderr}`);
      }
      throw error;
    }
  }

  /**
   * Run nm command to list symbols
   * @param binary Path to the binary file
   * @param args Additional arguments for nm
   */
  async nm(binary: string, args: string[] = []): Promise<string> {
    await this.validateFile(binary);
    return this.exec('nm', [...args, binary]);
  }

  /**
   * Run objdump command for disassembly and more
   * @param binary Path to the binary file
   * @param args Additional arguments for objdump
   */
  async objdump(binary: string, args: string[] = []): Promise<string> {
    await this.validateFile(binary);
    return this.exec('objdump', [...args, binary]);
  }

  /**
   * Run readelf command for ELF file analysis
   * @param binary Path to the binary file
   * @param args Additional arguments for readelf
   */
  async readelf(binary: string, args: string[] = []): Promise<string> {
    await this.validateFile(binary);
    return this.exec('readelf', [...args, binary]);
  }

  /**
   * Run size command for section size summary
   * @param binary Path to the binary file
   * @param args Additional arguments for size
   */
  async size(binary: string, args: string[] = []): Promise<string> {
    await this.validateFile(binary);
    return this.exec('size', [...args, binary]);
  }

  /**
   * Validate that a file exists and is accessible
   */
  private async validateFile(filepath: string): Promise<void> {
    try {
      await access(filepath);
    } catch {
      throw new Error(`File not found or not accessible: ${filepath}`);
    }
  }

  /**
   * Check if binutils commands are available
   * Returns list of available and missing tools
   */
  async checkAvailability(): Promise<{ available: string[]; missing: string[] }> {
    const tools = ['nm', 'objdump', 'readelf', 'size'];
    const available: string[] = [];
    const missing: string[] = [];

    for (const tool of tools) {
      try {
        await execFileAsync(this.cmd(tool), ['--version'], { timeout: 5000 });
        available.push(tool);
      } catch {
        missing.push(tool);
      }
    }

    return { available, missing };
  }
}
