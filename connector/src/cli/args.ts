#!/usr/bin/env node
/**
 * CLI argument parsing for terminal-connector
 */

import { Command } from 'commander';
import { getDefaultConfig, parseEnvVars } from '../config';

export interface CLIArgs {
  url: string;
  token: string;
  shell: string;
  env: string[];
}

export function parseArgs(): CLIArgs {
  const program = new Command();

  const defaults = getDefaultConfig();

  program
    .name('terminal-connector')
    .description('Local connector for Terminal Server - PTY bridge with WebSocket support')
    .version('1.0.0')
    .requiredOption('-u, --url <server-url>', 'Render server URL (e.g., https://your-app.onrender.com)')
    .requiredOption('-t, --token <jwt-token>', 'JWT token for authentication')
    .option('-s, --shell <shell-path>', 'Shell to spawn (default: SHELL env var or /bin/bash)', defaults.shell as string)
    .option('-e, --env <key=value>', 'Environment variables (can be used multiple times)', (value: string, previous: string[] = []) => {
      return [...previous, value];
    })
    .parse(process.argv);

  const options = program.opts();

  return {
    url: options.url,
    token: options.token,
    shell: options.shell,
    env: options.env,
  };
}

export function printHelp(): void {
  const program = new Command();
  program.name('terminal-connector')
    .description('Local connector for Terminal Server - PTY bridge with WebSocket support')
    .version('1.0.0')
    .requiredOption('-u, --url <server-url>', 'Render server URL')
    .requiredOption('-t, --token <jwt-token>', 'JWT token for authentication')
    .option('-s, --shell <shell-path>', 'Shell to spawn')
    .option('-e, --env <key=value>', 'Environment variables')
    .addHelpText('after', `
Examples:
  $ terminal-connector --url https://your-app.onrender.com --token eyJhbGci...
  $ terminal-connector --url https://your-app.onrender.com --token eyJhbGci... --shell /bin/zsh
  $ terminal-connector --url https://your-app.onrender.com --token eyJhbGci... --env "TERM=xterm-256color"
`);

  program.help();
}
