import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { generateToken } from '../auth/jwt';
import { roomManager } from '../socket/rooms';
import { config } from '../config';

const router = Router();

// Create a new session - requires shared secret authentication
router.post('/', (req: Request, res: Response) => {
  try {
    // Validate shared secret from Authorization header
    const authHeader = req.headers.authorization;
    const providedSecret = authHeader?.startsWith('Bearer ') 
      ? authHeader.slice(7) 
      : req.body.secret;

    if (!providedSecret || providedSecret !== config.sharedSecret) {
      res.status(401).json({ error: 'Invalid or missing authentication' });
      return;
    }

    const sessionId = uuidv4();
    
    // Create session in room manager
    roomManager.createSession(sessionId);

    // Generate tokens
    const webToken = generateToken(sessionId, 'web');
    const connectorToken = generateToken(sessionId, 'connector');

    res.json({
      sessionId,
      webToken,
      connectorToken,
      // Note: In production, you might want to display this on your home computer
      // and not send it over the network. For simplicity, we return both.
    });
  } catch (error) {
    console.error('Session creation error:', error);
    res.status(500).json({ error: 'Failed to create session' });
  }
});

export default router;
