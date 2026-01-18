
import assert from 'assert';
import { EventEmitter } from 'events';
import { RoomManager } from './socket/rooms';

// Mock Socket
class MockSocket extends EventEmitter {
  id: string;
  emitted: { event: string, data: any }[] = [];

  constructor(id: string) {
    super();
    this.id = id;
  }

  emit(event: string, data?: any): boolean {
    this.emitted.push({ event, data });
    return true;
  }
}

const runTests = () => {
  console.log('Running RoomManager tests...');
  const manager = new RoomManager();

  // Test 1: Create Session
  const sessionId = 'test-session-1';
  const session = manager.createSession(sessionId);
  assert.ok(session, 'Session should be created');
  assert.strictEqual(session.sessionId, sessionId, 'Session ID should match');
  assert.strictEqual(manager.getSession(sessionId), session, 'Should retrieve session');
  console.log('✅ Create Session passed');

  // Test 2: Join Connector
  const connectorSocket = new MockSocket('connector-1') as any;
  const joinConnResult = manager.joinConnector(sessionId, connectorSocket);
  assert.strictEqual(joinConnResult, true, 'Connector should join successfully');
  assert.strictEqual(session.connector?.id, 'connector-1', 'Connector socket should be stored');
  console.log('✅ Join Connector passed');

  // Test 3: Buffer Data
  manager.addToBuffer(sessionId, 'line1');
  manager.addToBuffer(sessionId, 'line2');
  assert.strictEqual(session.terminalBuffer.length, 2, 'Buffer should have 2 items');
  assert.strictEqual(session.terminalBuffer[0], 'line1', 'First item should be line1');
  console.log('✅ Buffer Data passed');

  // Test 4: Buffer Limit
  // Buffer size is 100. Let's add 105 items.
  for (let i = 0; i < 105; i++) {
    manager.addToBuffer(sessionId, `data-${i}`);
  }
  assert.strictEqual(session.terminalBuffer.length, 100, 'Buffer should be capped at 100');
  assert.strictEqual(session.terminalBuffer[0], 'data-5', 'Buffer should shift old data');
  // Actually:
  // Added 'line1', 'line2' (2 items)
  // Then added 105 items. Total added: 107.
  // Buffer size 100.
  // Should contain the last 100 items.
  // The last item added was `data-104`.
  // The 100th item from the end is `data-5`.
  assert.strictEqual(session.terminalBuffer[session.terminalBuffer.length - 1], 'data-104', 'Last item should be data-104');
  console.log('✅ Buffer Limit passed');

  // Test 5: Join Web Client & Replay
  const webSocket = new MockSocket('web-1') as any;
  const joinWebResult = manager.joinWebClient(sessionId, webSocket);
  assert.strictEqual(joinWebResult, true, 'Web client should join successfully');
  assert.strictEqual(session.webClient?.id, 'web-1', 'Web socket should be stored');
  
  // Check replay
  // We expect 100 'terminal:data' events
  assert.strictEqual(webSocket.emitted.length, 100, 'Should replay 100 buffer items');
  assert.strictEqual(webSocket.emitted[0].event, 'terminal:data', 'Event should be terminal:data');
  console.log('✅ Join Web Client & Replay passed');

  // Test 6: Handle Disconnect
  manager.handleDisconnect(webSocket);
  assert.strictEqual(session.webClient, null, 'Web client should be null after disconnect');
  
  // Connector still there?
  assert.strictEqual(session.connector?.id, 'connector-1', 'Connector should still be connected');
  
  manager.handleDisconnect(connectorSocket);
  assert.strictEqual(session.connector, null, 'Connector should be null after disconnect');
  console.log('✅ Handle Disconnect passed');

  console.log('All tests passed!');
};

runTests();
