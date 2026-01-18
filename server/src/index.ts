import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import path from 'path';
import { config } from './config';
import sessionRouter from './routes/session';
import connectRouter from './routes/connect';
import { handleWebConnection } from './socket/web-handler';
import { handleConnectorConnection } from './socket/connector-handler';

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: config.corsOrigin,
    methods: ['GET', 'POST'],
  },
});

// Middleware
app.use(cors({ origin: config.corsOrigin }));
app.use(express.json());

// API Routes
app.use('/api/session', sessionRouter);
app.use('/api/connect', connectRouter);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Serve static frontend files (in both development and production)
const staticPath = path.join(__dirname, '../../web/dist');
app.use(express.static(staticPath));

// Serve index.html for all non-API routes (SPA support)
app.get('*', (req, res) => {
  if (!req.path.startsWith('/api') && !req.path.startsWith('/socket.io')) {
    res.sendFile(path.join(staticPath, 'index.html'));
  }
});

// Socket.io
io.on('connection', (socket) => {
  const token = socket.handshake.auth.token;
  // We can't easily distinguish here without parsing the token, 
  // but the handlers will do that.
  // Alternatively, we could use a query param or header to route to the right handler immediately.
  // For now, let's try to detect based on the token payload in the handlers, 
  // or we can just pass it to both and let them decide (not efficient).
  
  // Better approach: Check token type here
  try {
    const jwt = require('./auth/jwt');
    const payload = jwt.verifyToken(token);
    
    if (payload) {
      if (payload.type === 'web') {
        handleWebConnection(socket);
      } else if (payload.type === 'connector') {
        handleConnectorConnection(socket);
      } else {
        socket.disconnect(true);
      }
    } else {
      socket.disconnect(true);
    }
  } catch (e) {
    socket.disconnect(true);
  }
});

// Start server
httpServer.listen(config.port, () => {
  console.log(`Server running on port ${config.port}`);
  console.log(`Environment: ${config.nodeEnv}`);
});
