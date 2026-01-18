import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Terminal } from './components/Terminal';
import { AuthPrompt } from './components/AuthPrompt';
import { StatusIndicator } from './components/StatusIndicator';
import { useSocket } from './hooks/useSocket';
import { clearSession } from './utils/token';

export type AppState = 'prompt' | 'connecting' | 'connected' | 'disconnected';

export const App: React.FC = () => {
  const [appState, setAppState] = useState<AppState>('prompt');
  const [sessionId, setSessionId] = useState<string>('');
  const terminalMethodsRef = useRef<any>(null);

  const {
    isConnected,
    status,
    lastMessage,
    connect,
    disconnect,
    sendData,
    sendResize,
    onData,
  } = useSocket();

  // Handle connection to session
  const handleConnect = useCallback((token: string, sessionId: string) => {
    setSessionId(sessionId);
    setAppState('connecting');
    connect(token);
  }, [connect]);

  // Handle disconnect
  const handleDisconnect = useCallback(() => {
    disconnect();
    clearSession();
    setAppState('prompt');
  }, [disconnect]);

  // Handle terminal data from xterm.js
  const handleTerminalData = useCallback((data: string) => {
    const encoder = new TextEncoder();
    sendData(encoder.encode(data));
  }, [sendData]);

  // Handle terminal resize
  const handleTerminalResize = useCallback((cols: number, rows: number) => {
    sendResize(cols, rows);
  }, [sendResize]);

  // Handle terminal methods ready
  const handleTerminalMethodsReady = useCallback((methods: any) => {
    terminalMethodsRef.current = methods;
  }, []);

  // Update app state based on socket connection
  useEffect(() => {
    if (isConnected) {
      setAppState('connected');
    } else if (appState === 'connecting') {
      setAppState('connecting');
    } else if (appState === 'connected' && !isConnected) {
      setAppState('disconnected');
    }
  }, [isConnected, appState]);

  // Register callback for WebSocket data and write to terminal
  useEffect(() => {
    const handleData = (data: Uint8Array | string) => {
      if (terminalMethodsRef.current && terminalMethodsRef.current.write) {
        terminalMethodsRef.current.write(data);
      }
    };

    onData(handleData);
  }, [onData]);

  // Render appropriate UI based on app state
  const renderContent = () => {
    if (appState === 'prompt') {
      return (
        <AuthPrompt
          onConnect={handleConnect}
          isLoading={false}
        />
      );
    }

    return (
      <div className="terminal-container">
        <StatusIndicator
          status={status}
          isConnected={isConnected}
          message={lastMessage || `Session: ${sessionId}`}
        />

        {appState === 'disconnected' && (
          <div className="flex-1 flex items-center justify-center bg-gray-900">
            <div className="text-center">
              <div className="text-red-500 text-6xl mb-4">⚠️</div>
              <h2 className="text-2xl font-bold text-white mb-2">Connection Lost</h2>
              <p className="text-gray-400 mb-6">
                {status || 'The connection to the terminal has been lost'}
              </p>
              <div className="space-x-4">
                <button
                  onClick={() => {
                    const token = localStorage.getItem('terminal_token');
                    if (token) {
                      handleConnect(token, sessionId);
                    }
                  }}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-6 rounded-lg transition-colors"
                >
                  Reconnect
                </button>
                <button
                  onClick={handleDisconnect}
                  className="bg-gray-700 hover:bg-gray-600 text-white font-medium py-2 px-6 rounded-lg transition-colors"
                >
                  Back to Home
                </button>
              </div>
            </div>
          </div>
        )}

        {(appState === 'connected' || appState === 'connecting') && (
          <div className="flex-1 bg-gray-900 overflow-hidden">
            {appState === 'connecting' && (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                  <p className="text-gray-300">Connecting to terminal...</p>
                  <p className="text-gray-500 text-sm mt-2">Waiting for connector to join</p>
                </div>
              </div>
            )}
            <Terminal
              onData={handleTerminalData}
              onResize={handleTerminalResize}
              isActive={appState === 'connected'}
              onMethodsReady={handleTerminalMethodsReady}
            />
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="w-full h-screen bg-gray-900">
      {renderContent()}
    </div>
  );
};

export default App;
