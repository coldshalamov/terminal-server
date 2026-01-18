# Server Component Review & Test Report

## 1. Code Analysis Findings

### Security
- **`src/auth/jwt.ts`**:
  - **Token Expiry**: Hardcoded to '24h'. This might be too long for a sensitive terminal session. Recommendation: Make it configurable via environment variables.
  - **Error Handling**: `verifyToken` swallows all errors (returns `null`). It would be better to distinguish between "expired" and "invalid" tokens for better client feedback/logging.
  - **Secret Management**: Relies on `config.jwtSecret`. Ensure this is not a default value in production.

### Logic & Stability
- **`src/socket/rooms.ts` (Critical)**:
  - **Memory Leak**: The `sessions` Map grows indefinitely. There is no mechanism to remove sessions. Over time, this will consume all available memory.
    - *Fix*: Implement a cleanup interval or remove sessions after a timeout when both clients disconnect.
  - **Performance**: `handleDisconnect` iterates through all sessions (O(N)) to find the disconnected socket.
    - *Fix*: Maintain a reverse mapping `Map<SocketId, SessionId>` for O(1) lookups.
  - **Buffering**: The circular buffer logic (keep last 100 items) is implemented correctly.

### Event Routing
- **`src/socket/web-handler.ts` & `connector-handler.ts`**:
  - Event routing logic is sound.
  - Correctly checks for the existence of the counterpart (connector/webClient) before emitting events, preventing crashes.

## 2. Verification (Test Script)

A standalone test script was created at `server/src/test-logic.ts`.

**Test Coverage:**
1.  **Session Creation**: Verified `createSession` initializes session correctly.
2.  **Joining**: Verified `joinConnector` and `joinWebClient` update session state.
3.  **Buffering**: Verified `addToBuffer` stores data.
4.  **Buffer Limit**: Verified buffer caps at 100 items and shifts old data correctly (Circular Buffer).
5.  **Replay**: Verified that joining a web client triggers a replay of buffered data.
6.  **Disconnect**: Verified `handleDisconnect` clears socket references.

**Results:**
```
Running RoomManager tests...
✅ Create Session passed
✅ Join Connector passed
✅ Buffer Data passed
✅ Buffer Limit passed
✅ Join Web Client & Replay passed
✅ Handle Disconnect passed
All tests passed!
```

## 3. Recommendations

1.  **Fix Memory Leak**: Add a `removeSession` call or a TTL mechanism.
2.  **Optimize Disconnect**: Add a `socketId -> sessionId` map to `RoomManager`.
3.  **Improve Testing**: Keep `RoomManager` exported (as modified during this review) to allow for unit testing.
