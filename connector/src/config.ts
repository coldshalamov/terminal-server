/**
 * Configuration for the local connector
 */

export interface ConnectorConfig {
  serverUrl: string;
  token: string;
  shell: string;
  env: Record<string, string>;
  reconnectInterval: number;
  maxReconnectAttempts: number;
}

export function getDefaultConfig(): Partial<ConnectorConfig> {
  return {
    shell: process.env.SHELL || '/bin/bash',
    env: {
      TERM: process.env.TERM || 'xterm-256color',
      LANG: process.env.LANG || 'en_US.UTF-8',
      HOME: process.env.HOME || '/',
      PATH: process.env.PATH || '/usr/local/bin:/usr/bin:/bin',
    },
    reconnectInterval: 2000,
    maxReconnectAttempts: 10,
  };
}

export function parseEnvVars(envStrings: string[]): Record<string, string> {
  const env: Record<string, string> = {};

  for (const envStr of envStrings) {
    const eqIndex = envStr.indexOf('=');
    if (eqIndex > 0) {
      const key = envStr.substring(0, eqIndex);
      const value = envStr.substring(eqIndex + 1);
      env[key] = value;
    }
  }

  return env;
}
