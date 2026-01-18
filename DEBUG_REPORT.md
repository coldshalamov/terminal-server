# Terminal Server Debug & Review Report

**Date:** 2026-01-18
**Status:** Review Complete - Critical Issues Found

## Executive Summary
The codebase is functional but contains **critical stability and memory issues** that must be addressed before production deployment. The Server has a memory leak in session management, and the Web frontend has a high risk of infinite render loops and memory leaks. The Connector is mostly stable but needs minor logic fixes for robustness.

---

## 1. Server Component (`server/src`)

### 🔴 Critical Issues
*   **Memory Leak (`src/socket/rooms.ts`)**: The `sessions` Map grows indefinitely. There is no mechanism to remove old or inactive sessions.
    *   *Impact*: Server will eventually crash under load.
    *   *Fix*: Implement a session timeout or cleanup interval.

### ⚠️ High Priority
*   **Performance (`src/socket/rooms.ts`)**: `handleDisconnect` performs an O(N) search through all sessions to find the socket.
    *   *Fix*: Maintain a reverse mapping `socketId -> sessionId` for O(1) lookups.
*   **Security (`src/auth/jwt.ts`)**: JWT expiration is hardcoded to 24h, and verification errors are swallowed without logging.

### ✅ Verification
*   **Logic Tests**: Passed. Buffering (last 100 messages), routing, and session creation work as expected.

---

## 2. Web Component (`web/src`)

### 🔴 Critical Issues
*   **Infinite Loop Risk (`src/hooks/useTerminal.ts`)**: The `useEffect` depends on `onResize` and calls it immediately. If the parent component passes an unstable callback (e.g., inline arrow function), this causes an infinite re-render loop.
    *   *Fix*: Use `useRef` for the callback or remove it from the dependency array.

### ⚠️ High Priority
*   **Memory Leak (`src/hooks/useTerminal.ts`)**: The cleanup function for `terminal.onData` is incorrect (`terminal.onData(() => {})`). This adds a *new* listener instead of removing the old one.
    *   *Fix*: Use the `IDisposable` returned by `onData` to call `.dispose()`.

---

## 3. Connector Component (`connector/src`)

### ⚠️ High Priority
*   **False Crash Reports (`src/pty/manager.ts`)**: Calling `kill()` triggers the `onExit` event, which the system interprets as a crash.
    *   *Fix*: Suppress `onExit` events when the kill was initiated manually.
*   **Reconnection Logic (`src/socket/client.ts`)**: Exponential backoff lacks a maximum delay cap (`reconnectionDelayMax`).
    *   *Fix*: Set a reasonable cap (e.g., 30s) to prevent excessive delays.

### ✅ Verification
*   **PTY Spawning**: Verified working on Windows (powershell.exe). Bidirectional communication confirmed.

---

## Recommended Action Plan

1.  **Fix Web Hooks**: Prioritize `useTerminal.ts` to prevent client-side crashes.
2.  **Fix Server Memory Leak**: Implement session cleanup in `RoomManager`.
3.  **Harden Connector**: Fix the kill signal logic and reconnection backoff.
4.  **Optimize Server**: Add reverse socket mapping for performance.
