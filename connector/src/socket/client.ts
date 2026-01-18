/**
 * Socket.io Client - Handles WebSocket connection to Render server
 */

import { io, Socket } from 'socket.io-client';

export interface SocketClientConfig {
  url: string;
  token: string;
  reconnectInterval: number;
  maxReconnectAttempts: number;
}

export interface SocketClientEvents {
  onConnected: () => void;
  onDisconnected: () => void;
  onInput: (data: string) => void;
  onResize: (cols: number, rows: number) => void;
  onClose: () => void;
  onError: (error: string) => void;
}

export class SocketClient {
  private socket: Socket | null = null;
  private config: SocketClientConfig;
  private events: SocketClientEvents;
  private reconnectAttempts: number = 0;

  constructor(config: SocketClientConfig, events: SocketClientEvents) {
    this.config = config;
    this.events = events;
  }

  /**
   * Connect to the Render server
   */
  connect(): void {
    if (this.socket?.connected) {
      console.log('[Socket] Already connected');
      return;
    }

    console.log(`[Socket] Connecting to ${this.config.url}...`);

    // Parse URL to ensure it has protocol
    let url = this.config.url;
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = `https://${url}`;
    }

    this.socket = io(url, {
      auth: {
        token: this.config.token,
      },
      transports: ['websocket'],
      reconnection: true,
      reconnectionDelay: this.config.reconnectInterval,
      reconnectionAttempts: this.config.maxReconnectAttempts,
    });

    this.setupEventListeners();
  }

  /**
   * Setup Socket.io event listeners
   */
  private setupEventListeners(): void {
    if (!this.socket) return;

    // Connection established
    this.socket.on('connect', () => {
      console.log(`[Socket] Connected with ID: ${this.socket!.id}`);
      this.reconnectAttempts = 0;
      this.events.onConnected();
    });

    // Connection lost
    this.socket.on('disconnect', (reason) => {
      console.log(`[Socket] Disconnected: ${reason}`);
      this.events.onDisconnected();
    });

    // Connection error
    this.socket.on('connect_error', (error) => {
      this.reconnectAttempts++;
      console.error(`[Socket] Connection error (attempt ${this.reconnectAttempts}):`, error.message);

      if (this.reconnectAttempts >= this.config.maxReconnectAttempts) {
        this.events.onError('Max reconnection attempts reached');
      }
    });

    // Server error
    this.socket.on('error', (error) => {
      console.error('[Socket] Server error:', error);
      this.events.onError(error.message || 'Unknown server error');
    });

    // Input from web client
    this.socket.on('terminal:input', (data: string) => {
      this.events.onInput(data);
    });

    // Resize request from web client
    this.socket.on('terminal:resize', (size: { cols: number; rows: number }) => {
      console.log(`[Socket] Resize request: ${size.cols}x${size.rows}`);
      this.events.onResize(size.cols, size.rows);
    });

    // Close request from web client
    this.socket.on('terminal:close', () => {
      console.log('[Socket] Close request received');
      this.events.onClose();
    });
  }

  /**
   * Emit PTY output to server
   */
  emitData(data: string): void {
    if (!this.socket?.connected) {
      console.warn('[Socket] Not connected, skipping data emit');
      return;
    }

    this.socket.emit('terminal:data', data);
  }

  /**
   * Emit status to server
   */
  emitStatus(status: 'ready' | 'closed' | 'error', message?: string): void {
    if (!this.socket?.connected) {
      console.warn('[Socket] Not connected, skipping status emit');
      return;
    }

    this.socket.emit('terminal:status', { status, message });
  }

  /**
   * Disconnect from server
   */
  disconnect(): void {
    if (!this.socket) {
      return;
    }

    console.log('[Socket] Disconnecting...');
    this.socket.disconnect();
    this.socket = null;
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.socket?.connected ?? false;
  }
}
