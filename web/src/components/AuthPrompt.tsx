import React, { useState } from 'react';
import { createSession } from '../utils/api';
import { saveToken, saveSessionId, getToken, getSessionId } from '../utils/token';

export interface AuthPromptProps {
  onConnect: (token: string, sessionId: string, connectorToken?: string) => void;
  isLoading?: boolean;
}

export const AuthPrompt: React.FC<AuthPromptProps> = ({ onConnect, isLoading }) => {
  const [sessionIdInput, setSessionIdInput] = useState('');
  const [tokenInput, setTokenInput] = useState('');
  const [sharedSecretInput, setSharedSecretInput] = useState('');
  const [useExisting, setUseExisting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [creatingSession, setCreatingSession] = useState(false);
  const [connectorInfo, setConnectorInfo] = useState<{ sessionId: string; connectorToken: string } | null>(null);

  // Check for existing session on mount
  React.useEffect(() => {
    const existingToken = getToken();
    const existingSessionId = getSessionId();
    if (existingToken && existingSessionId) {
      setTokenInput(existingToken);
      setSessionIdInput(existingSessionId);
      setUseExisting(true);
    }
  }, []);

  const handleCreateSession = async () => {
    if (!sharedSecretInput) {
      setError('Please enter the shared secret');
      return;
    }
    try {
      setError(null);
      setCreatingSession(true);
      const { webToken, sessionId, connectorToken } = await createSession(sharedSecretInput);
      saveToken(webToken);
      saveSessionId(sessionId);
      // Show connector info for user to run on their home machine
      setConnectorInfo({ sessionId, connectorToken });
      onConnect(webToken, sessionId, connectorToken);
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'response' in err) {
        const axiosError = err as { response?: { status: number } };
        if (axiosError.response?.status === 401) {
          setError('Invalid shared secret. Please check and try again.');
        } else {
          setError('Failed to create session. Please try again.');
        }
      } else {
        setError('Failed to create session. Please try again.');
      }
      console.error('Session creation error:', err);
    } finally {
      setCreatingSession(false);
    }
  };

  const handleConnectExisting = () => {
    if (!tokenInput || !sessionIdInput) {
      setError('Please enter both Session ID and Token');
      return;
    }
    saveToken(tokenInput);
    saveSessionId(sessionIdInput);
    onConnect(tokenInput, sessionIdInput);
  };

  // If we just created a session, show connector command
  if (connectorInfo) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="max-w-2xl w-full mx-4">
          <div className="bg-gray-800 rounded-lg shadow-xl p-8">
            <h1 className="text-2xl font-bold text-green-400 mb-2">Session Created!</h1>
            <p className="text-gray-400 mb-6">
              Now run this command on your home computer to connect:
            </p>
            
            <div className="bg-gray-900 rounded-lg p-4 mb-6">
              <code className="text-sm text-green-300 break-all">
                terminal-connector --url {window.location.origin} --token {connectorInfo.connectorToken}
              </code>
            </div>
            
            <p className="text-sm text-gray-500 mb-4">
              The terminal will appear here once your home computer connects.
            </p>

            <div className="flex space-x-4">
              <button
                onClick={() => navigator.clipboard.writeText(
                  `terminal-connector --url ${window.location.origin} --token ${connectorInfo.connectorToken}`
                )}
                className="flex-1 bg-gray-700 hover:bg-gray-600 text-white font-medium py-2 px-4 rounded-lg transition-colors"
              >
                Copy Command
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900">
      <div className="max-w-md w-full mx-4">
        <div className="bg-gray-800 rounded-lg shadow-xl p-8">
          <h1 className="text-3xl font-bold text-white mb-2">Terminal Server</h1>
          <p className="text-gray-400 mb-8">
            Connect to a remote terminal from anywhere
          </p>

          {!useExisting ? (
            <>
              <div className="space-y-4">
                <div>
                  <label htmlFor="sharedSecret" className="block text-sm font-medium text-gray-300 mb-2">
                    Shared Secret
                  </label>
                  <input
                    id="sharedSecret"
                    type="password"
                    value={sharedSecretInput}
                    onChange={(e) => setSharedSecretInput(e.target.value)}
                    placeholder="Enter your shared secret"
                    className="w-full bg-gray-700 text-white border border-gray-600 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    This is the SHARED_SECRET you configured on your server
                  </p>
                </div>

                <button
                  onClick={handleCreateSession}
                  disabled={creatingSession || isLoading}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-lg transition-colors disabled:bg-gray-600 disabled:cursor-not-allowed"
                >
                  {creatingSession ? 'Creating Session...' : 'Create New Session'}
                </button>

                <button
                  onClick={() => setUseExisting(true)}
                  className="w-full bg-gray-700 hover:bg-gray-600 text-white font-medium py-3 px-4 rounded-lg transition-colors"
                >
                  Connect to Existing Session
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="space-y-4">
                <div>
                  <label htmlFor="sessionId" className="block text-sm font-medium text-gray-300 mb-2">
                    Session ID
                  </label>
                  <input
                    id="sessionId"
                    type="text"
                    value={sessionIdInput}
                    onChange={(e) => setSessionIdInput(e.target.value)}
                    placeholder="Enter session ID"
                    className="w-full bg-gray-700 text-white border border-gray-600 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label htmlFor="token" className="block text-sm font-medium text-gray-300 mb-2">
                    Token
                  </label>
                  <textarea
                    id="token"
                    value={tokenInput}
                    onChange={(e) => setTokenInput(e.target.value)}
                    placeholder="Enter JWT token"
                    rows={4}
                    className="w-full bg-gray-700 text-white border border-gray-600 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  />
                </div>

                <button
                  onClick={handleConnectExisting}
                  disabled={isLoading}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-lg transition-colors disabled:bg-gray-600 disabled:cursor-not-allowed"
                >
                  {isLoading ? 'Connecting...' : 'Connect'}
                </button>

                <button
                  onClick={() => setUseExisting(false)}
                  className="w-full bg-gray-700 hover:bg-gray-600 text-white font-medium py-3 px-4 rounded-lg transition-colors"
                >
                  Back
                </button>
              </div>
            </>
          )}

          {error && (
            <div className="mt-4 bg-red-900/50 border border-red-700 text-red-300 px-4 py-3 rounded-lg">
              {error}
            </div>
          )}
        </div>

        <div className="mt-6 text-center text-sm text-gray-500">
          <p>Run the local connector on your machine to use this terminal</p>
        </div>
      </div>
    </div>
  );
};
