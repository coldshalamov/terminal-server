import { Socket } from 'socket.io';

export interface Session {
  sessionId: string;
  webClient: Socket | null;
  connector: Socket | null;
  createdAt: number;
  lastActivity: number;
  terminalBuffer: Buffer[]; // Store recent output for reconnection
}

export class RoomManager {
  private sessions: Map<string, Session> = new Map();
  private readonly BUFFER_SIZE = 100; // Keep last 100 chunks
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor() {
    // Start cleanup interval - run every hour
    this.cleanupInterval = setInterval(() => {
      this.cleanupInactiveSessions(24 * 60 * 60 * 1000); // 24 hours
    }, 60 * 60 * 1000); // Every hour
  }

  destroy() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }

  createSession(sessionId: string): Session {
    const session: Session = {
      sessionId,
      webClient: null,
      connector: null,
      createdAt: Date.now(),
      lastActivity: Date.now(),
      terminalBuffer: [],
    };
    this.sessions.set(sessionId, session);
    return session;
  }

  getSession(sessionId: string): Session | undefined {
    return this.sessions.get(sessionId);
  }

  joinWebClient(sessionId: string, socket: Socket): boolean {
    const session = this.sessions.get(sessionId);
    if (!session) return false;

    // If there was an old connection, disconnect it or just replace reference
    // Ideally we might want to allow multiple web clients, but architecture says 1:1 for now
    session.webClient = socket;
    session.lastActivity = Date.now();
    
    // Replay buffer to new client
    if (session.terminalBuffer.length > 0) {
      session.terminalBuffer.forEach(data => {
        socket.emit('terminal:data', data);
      });
    }

    return true;
  }

  joinConnector(sessionId: string, socket: Socket): boolean {
    const session = this.sessions.get(sessionId);
    if (!session) return false;

    session.connector = socket;
    session.lastActivity = Date.now();
    return true;
  }

  handleDisconnect(socket: Socket) {
    // Find session with this socket
    for (const session of this.sessions.values()) {
      if (session.webClient?.id === socket.id) {
        session.webClient = null;
        // Notify connector?
      }
      if (session.connector?.id === socket.id) {
        session.connector = null;
        // Notify web client
        session.webClient?.emit('terminal:status', { status: 'disconnected', message: 'Connector disconnected' });
      }
    }
  }

  addToBuffer(sessionId: string, data: any) {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.terminalBuffer.push(data);
      if (session.terminalBuffer.length > this.BUFFER_SIZE) {
        session.terminalBuffer.shift();
      }
      session.lastActivity = Date.now();
    }
  }

  removeSession(sessionId: string) {
    this.sessions.delete(sessionId);
  }

  cleanupInactiveSessions(maxAge: number) {
    const now = Date.now();
    const toRemove: string[] = [];

    for (const [sessionId, session] of this.sessions) {
      if (now - session.lastActivity > maxAge) {
        toRemove.push(sessionId);
      }
    }

    toRemove.forEach(sessionId => {
      this.sessions.delete(sessionId);
      console.log(`[RoomManager] Cleaned up inactive session: ${sessionId}`);
    });

    if (toRemove.length > 0) {
      console.log(`[RoomManager] Cleaned up ${toRemove.length} inactive sessions`);
    }
  }
}

export const roomManager = new RoomManager();
