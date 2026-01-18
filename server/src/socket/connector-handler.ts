import { Socket } from 'socket.io';
import { roomManager } from './rooms';
import { verifyToken } from '../auth/jwt';

export const handleConnectorConnection = (socket: Socket) => {
  const token = socket.handshake.auth.token;
  if (!token) {
    socket.disconnect(true);
    return;
  }

  const payload = verifyToken(token);
  if (!payload || payload.type !== 'connector') {
    socket.disconnect(true);
    return;
  }

  const { sessionId } = payload;
  
  // In a real scenario, we might want to verify if the session is expecting a connector
  // For now, we assume if the token is valid, they can join
  const session = roomManager.getSession(sessionId);
  if (!session) {
      // If session doesn't exist (maybe server restarted), we might want to recreate it 
      // or reject. For security, we should probably reject if it wasn't created via API.
      // But for robustness, if we have a valid signed token, we could potentially recreate.
      // Let's stick to strict mode: Session must exist.
      socket.emit('error', 'Session not found');
      socket.disconnect(true);
      return;
  }

  roomManager.joinConnector(sessionId, socket);
  socket.join(sessionId);
  console.log(`Connector joined session: ${sessionId}`);

  // Notify web client that connector is ready
  if (session.webClient) {
    session.webClient.emit('terminal:status', { status: 'connected', message: 'Terminal ready' });
  }

  // Handle PTY data from connector
  socket.on('terminal:data', (data: any) => {
    const session = roomManager.getSession(sessionId);
    if (session) {
      // Buffer data for reconnection
      roomManager.addToBuffer(sessionId, data);
      
      // Forward to web client
      if (session.webClient) {
        session.webClient.emit('terminal:data', data);
      }
    }
  });

  // Handle status updates
  socket.on('terminal:status', (status: any) => {
    const session = roomManager.getSession(sessionId);
    if (session && session.webClient) {
      session.webClient.emit('terminal:status', status);
    }
  });

  socket.on('disconnect', () => {
    console.log(`Connector disconnected: ${sessionId}`);
    roomManager.handleDisconnect(socket);
  });
};
