/**
 * PTY Manager - Handles spawning, killing, resizing, and I/O for PTY processes
 */

import * as pty from 'node-pty';

export interface PTYOptions {
  shell: string;
  env: Record<string, string>;
  cols: number;
  rows: number;
}

export interface PTYEvents {
  onData: (data: string) => void;
  onExit: (code: number, signal: number) => void;
}

export class PTYManager {
  private pty: pty.IPty | null = null;
  private events: PTYEvents;
  private shell: string;
  private env: Record<string, string>;

  constructor(shell: string, env: Record<string, string>, events: PTYEvents) {
    this.shell = shell;
    this.env = env;
    this.events = events;
  }

  /**
   * Spawn a new PTY process
   */
  spawn(cols: number = 80, rows: number = 24): void {
    if (this.pty) {
      throw new Error('PTY already exists');
    }

    try {
      this.pty = pty.spawn(this.shell, [], {
        name: 'xterm-256color',
        cols,
        rows,
        cwd: process.env.HOME || process.cwd(),
        env: this.env,
      });

      // Handle PTY output
      this.pty.onData((data: string) => {
        this.events.onData(data);
      });

      // Handle PTY exit
      this.pty.onExit(({ exitCode, signal }) => {
        // Check if PTY was already killed manually to avoid false crash reports
        if (this.pty === null) {
          return;
        }
        this.events.onExit(exitCode ?? -1, signal ?? -1);
        this.pty = null;
      });

      console.log(`[PTY] Spawned with shell: ${this.shell}`);
    } catch (error) {
      console.error('[PTY] Failed to spawn:', error);
      throw error;
    }
  }

  /**
   * Write data to the PTY
   */
  write(data: string): void {
    if (!this.pty) {
      throw new Error('PTY not running');
    }

    this.pty.write(data);
  }

  /**
   * Resize the PTY
   */
  resize(cols: number, rows: number): void {
    if (!this.pty) {
      throw new Error('PTY not running');
    }

    this.pty.resize(cols, rows);
    console.log(`[PTY] Resized to ${cols}x${rows}`);
  }

  /**
   * Kill the PTY
   */
  kill(): void {
    if (!this.pty) {
      return;
    }

    this.pty.kill();
    this.pty = null;
    console.log('[PTY] Killed');
  }

  /**
   * Check if PTY is running
   */
  isRunning(): boolean {
    return this.pty !== null;
  }

  /**
   * Get current PTY size
   */
  getSize(): { cols: number; rows: number } | null {
    if (!this.pty) {
      return null;
    }

    return { cols: this.pty.cols, rows: this.pty.rows };
  }
}
