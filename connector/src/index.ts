#!/usr/bin/env node
/**
 * Terminal Connector - Main entry point
 * PTY bridge that connects to Render server via WebSocket
 */

import { parseArgs } from './cli/args';
import { getDefaultConfig, parseEnvVars } from './config';
import { PTYManager } from './pty/manager';
import { SocketClient } from './socket/client';

class TerminalConnector {
  private pty: PTYManager | null = null;
  private socket: SocketClient | null = null;
  private isShuttingDown: boolean = false;

  async run(): Promise<void> {
    try {
      // Parse CLI arguments
      const args = parseArgs();

      console.log('=================================');
      console.log('  Terminal Connector v1.0.0');
      console.log('=================================');
      console.log(`Server: ${args.url}`);
      console.log(`Shell: ${args.shell}`);

      // Merge environment variables
      const defaults = getDefaultConfig();
      const env = {
        ...defaults.env,
        ...parseEnvVars(args.env),
      };

      // Initialize Socket client
      this.socket = new SocketClient(
        {
          url: args.url,
          token: args.token,
          reconnectInterval: defaults.reconnectInterval!,
          maxReconnectAttempts: defaults.maxReconnectAttempts!,
        },
        {
          onConnected: () => this.onSocketConnected(),
          onDisconnected: () => this.onSocketDisconnected(),
          onInput: (data) => this.onSocketInput(data),
          onResize: (cols, rows) => this.onSocketResize(cols, rows),
          onClose: () => this.onSocketClose(),
          onError: (error) => this.onSocketError(error),
        }
      );

      // Initialize PTY manager
      this.pty = new PTYManager(args.shell, env, {
        onData: (data) => this.onPTYData(data),
        onExit: (code, signal) => this.onPTYExit(code, signal),
      });

      // Connect to server
      this.socket.connect();

      // Setup graceful shutdown
      this.setupShutdownHandlers();

      console.log('\n[Connector] Running. Press Ctrl+C to stop.\n');

    } catch (error) {
      console.error('[Connector] Fatal error:', error);
      process.exit(1);
    }
  }

  /**
   * Socket connected event handler
   */
  private onSocketConnected(): void {
    console.log('[Connector] Connected to server');

    // Spawn PTY when connected
    if (!this.pty?.isRunning()) {
      this.pty?.spawn(80, 24);
      this.socket?.emitStatus('ready', 'PTY spawned and ready');
    }
  }

  /**
   * Socket disconnected event handler
   */
  private onSocketDisconnected(): void {
    console.log('[Connector] Disconnected from server');

    // Optionally keep PTY running for reconnection
    // or kill it: this.pty?.kill();
  }

  /**
   * Socket input event handler - data from web client
   */
  private onSocketInput(data: string): void {
    if (!this.isShuttingDown) {
      this.pty?.write(data);
    }
  }

  /**
   * Socket resize event handler
   */
  private onSocketResize(cols: number, rows: number): void {
    if (!this.isShuttingDown) {
      this.pty?.resize(cols, rows);
    }
  }

  /**
   * Socket close event handler
   */
  private onSocketClose(): void {
    console.log('[Connector] Close request from server');
    this.shutdown(0);
  }

  /**
   * Socket error event handler
   */
  private onSocketError(error: string): void {
    console.error('[Connector] Socket error:', error);
    if (error === 'Max reconnection attempts reached') {
      console.error('[Connector] Giving up reconnection');
      this.shutdown(1);
    }
  }

  /**
   * PTY data event handler - output from PTY
   */
  private onPTYData(data: string): void {
    // Forward PTY output to server
    this.socket?.emitData(data);
  }

  /**
   * PTY exit event handler
   */
  private onPTYExit(code: number, signal: number): void {
    console.log(`[Connector] PTY exited with code ${code}, signal ${signal}`);
    this.socket?.emitStatus('closed', `PTY exited (code: ${code})`);

    // If PTY exits unexpectedly, shutdown
    if (!this.isShuttingDown) {
      console.log('[Connector] PTY exited unexpectedly, shutting down...');
      this.shutdown(code);
    }
  }

  /**
   * Setup graceful shutdown handlers
   */
  private setupShutdownHandlers(): void {
    const shutdownHandler = (signal: string) => {
      console.log(`\n[Connector] Received ${signal}, shutting down...`);
      this.shutdown(0);
    };

    process.on('SIGINT', () => shutdownHandler('SIGINT'));
    process.on('SIGTERM', () => shutdownHandler('SIGTERM'));
    process.on('exit', () => {
      console.log('[Connector] Process exited');
    });
  }

  /**
   * Graceful shutdown
   */
  private shutdown(exitCode: number): void {
    if (this.isShuttingDown) {
      return;
    }

    this.isShuttingDown = true;

    // Notify server
    this.socket?.emitStatus('closed', 'Connector shutting down');

    // Disconnect socket
    this.socket?.disconnect();

    // Kill PTY
    this.pty?.kill();

    console.log('[Connector] Shutdown complete');

    // Exit after a short delay to allow cleanup
    setTimeout(() => {
      process.exit(exitCode);
    }, 100);
  }
}

// Main entry point
if (require.main === module) {
  const connector = new TerminalConnector();
  connector.run();
}

export { TerminalConnector };
