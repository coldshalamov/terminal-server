import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export interface SessionResponse {
  sessionId: string;
  webToken: string;
  connectorToken: string;
}

export interface ConnectResponse {
  success: boolean;
  serverUrl: string;
}

/**
 * Create a new session and get JWT tokens
 * Requires shared secret for authentication
 */
export async function createSession(sharedSecret: string): Promise<SessionResponse> {
  const response = await axios.post<SessionResponse>(
    `${API_BASE_URL}/api/session`,
    {},
    {
      headers: {
        Authorization: `Bearer ${sharedSecret}`,
      },
    }
  );
  return response.data;
}

/**
 * Validate an existing session token
 */
export async function validateSession(token: string): Promise<{ valid: boolean; sessionId: string }> {
  const response = await axios.get(`${API_BASE_URL}/api/session/validate`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  return response.data;
}

/**
 * Register a connector for a session
 */
export async function connectConnector(token: string): Promise<ConnectResponse> {
  const response = await axios.post<ConnectResponse>(
    `${API_BASE_URL}/api/connect`,
    {},
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );
  return response.data;
}
