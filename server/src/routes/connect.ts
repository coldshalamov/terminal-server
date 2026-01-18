import { Router, Request, Response } from 'express';
import { verifyToken } from '../auth/jwt';
import { roomManager } from '../socket/rooms';

const router = Router();

router.post('/', (req: Request, res: Response) => {
  const { token } = req.body;

  if (!token) {
    return res.status(400).json({ error: 'Token is required' });
  }

  const payload = verifyToken(token);
  if (!payload || payload.type !== 'connector') {
    return res.status(401).json({ error: 'Invalid connector token' });
  }

  const session = roomManager.getSession(payload.sessionId);
  if (!session) {
    return res.status(404).json({ error: 'Session not found' });
  }

  // Return success and potentially the websocket URL if it differs
  res.json({
    success: true,
    sessionId: payload.sessionId,
    message: 'Ready to connect via WebSocket'
  });
});

export default router;
