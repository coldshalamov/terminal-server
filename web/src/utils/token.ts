/**
 * Store JWT token in localStorage
 */
export const saveToken = (token: string): void => {
  localStorage.setItem('terminal_token', token);
};

/**
 * Retrieve JWT token from localStorage
 */
export const getToken = (): string | null => {
  return localStorage.getItem('terminal_token');
};

/**
 * Remove JWT token from localStorage
 */
export const clearToken = (): void => {
  localStorage.removeItem('terminal_token');
};

/**
 * Save session ID
 */
export const saveSessionId = (sessionId: string): void => {
  localStorage.setItem('terminal_session_id', sessionId);
};

/**
 * Retrieve session ID
 */
export const getSessionId = (): string | null => {
  return localStorage.getItem('terminal_session_id');
};

/**
 * Clear session data
 */
export const clearSession = (): void => {
  clearToken();
  localStorage.removeItem('terminal_session_id');
};
