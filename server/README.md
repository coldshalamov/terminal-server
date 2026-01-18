# Terminal Server Backend

Backend server for the Terminal Server project. Handles WebSocket relaying between web clients and local connectors.

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Create a `.env` file (optional, defaults provided):
   ```
   PORT=3000
   JWT_SECRET=your-secret-key
   ```

3. Build:
   ```bash
   npm run build
   ```

4. Start:
   ```bash
   npm start
   ```

## API Endpoints

- `POST /api/session`: Create a new session. Returns `{ sessionId, webToken, connectorToken }`.
- `POST /api/connect`: Verify connector token.

## WebSocket Events

- `terminal:data`: Binary terminal output.
- `terminal:input`: Binary terminal input.
- `terminal:resize`: Terminal resize event.
- `terminal:status`: Connection status updates.
