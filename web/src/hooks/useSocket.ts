import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3000';

export interface TerminalDataEvent {
  data: Uint8Array | string;
}

export interface TerminalStatusEvent {
  status: 'connected' | 'disconnected' | 'error';
  message?: string;
}

export interface UseSocketReturn {
  socket: Socket | null;
  isConnected: boolean;
  status: string;
  lastMessage: string;
  connect: (token: string) => void;
  disconnect: () => void;
  sendData: (data: Uint8Array) => void;
  sendResize: (cols: number, rows: number) => void;
  onData: (callback: (data: Uint8Array | string) => void) => void;
}

export const useSocket = (): UseSocketReturn => {
  const [isConnected, setIsConnected] = useState(false);
  const [status, setStatus] = useState<string>('disconnected');
  const [lastMessage, setLastMessage] = useState<string>('');

  const socketRef = useRef<Socket | null>(null);
  const onDataCallbackRef = useRef<((data: Uint8Array | string) => void) | null>(null);

  const connect = useCallback((token: string) => {
    if (socketRef.current?.connected) {
      socketRef.current.disconnect();
    }

    const socket = io(SOCKET_URL, {
      auth: { token },
      transports: ['websocket'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: Infinity,
    });

    socket.on('connect', () => {
      setIsConnected(true);
      setStatus('connected');
    });

    socket.on('disconnect', (reason) => {
      setIsConnected(false);
      setStatus(`disconnected: ${reason}`);
    });

    socket.on('connect_error', (error) => {
      setIsConnected(false);
      setStatus(`error: ${error.message}`);
    });

    socket.on('terminal:data', (data: Uint8Array | string) => {
      if (onDataCallbackRef.current) {
        onDataCallbackRef.current(data);
      }
    });

    socket.on('terminal:status', (event: TerminalStatusEvent) => {
      setStatus(event.status);
      if (event.message) {
        setLastMessage(event.message);
      }
    });

    socketRef.current = socket;
  }, []);

  const disconnect = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
      setIsConnected(false);
      setStatus('disconnected');
    }
  }, []);

  const sendData = useCallback((data: Uint8Array) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('terminal:input', data);
    }
  }, []);

  const sendResize = useCallback((cols: number, rows: number) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('terminal:resize', { cols, rows });
    }
  }, []);

  // Register callback for terminal data
  const onData = useCallback((callback: (data: Uint8Array | string) => void) => {
    onDataCallbackRef.current = callback;
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  return {
    socket: socketRef.current,
    isConnected,
    status,
    lastMessage,
    connect,
    disconnect,
    sendData,
    sendResize,
    onData,
  };
};
