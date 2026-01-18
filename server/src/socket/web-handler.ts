import { Socket } from 'socket.io';
import { roomManager } from './rooms';
import { verifyToken } from '../auth/jwt';

export const handleWebConnection = (socket: Socket) => {
  const token = socket.handshake.auth.token;
  if (!token) {
    socket.disconnect(true);
    return;
  }

  const payload = verifyToken(token);
  if (!payload || payload.type !== 'web') {
    socket.disconnect(true);
    return;
  }

  const { sessionId } = payload;
  const joined = roomManager.joinWebClient(sessionId, socket);

  if (!joined) {
    socket.emit('error', 'Session not found');
    socket.disconnect(true);
    return;
  }

  socket.join(sessionId);
  console.log(`Web client joined session: ${sessionId}`);

  // Handle input from web terminal
  socket.on('terminal:input', (data: string) => {
    const session = roomManager.getSession(sessionId);
    if (session && session.connector) {
      session.connector.emit('terminal:input', data);
    }
  });

  // Handle resize events
  socket.on('terminal:resize', (size: { cols: number; rows: number }) => {
    const session = roomManager.getSession(sessionId);
    if (session && session.connector) {
      session.connector.emit('terminal:resize', size);
    }
  });

  socket.on('disconnect', () => {
    console.log(`Web client disconnected: ${sessionId}`);
    roomManager.handleDisconnect(socket);
  });
};
