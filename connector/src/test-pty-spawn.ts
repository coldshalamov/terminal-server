
import * as pty from 'node-pty';
import * as os from 'os';

const shell = os.platform() === 'win32' ? 'powershell.exe' : 'bash';

console.log(`[Test] Spawning ${shell}...`);

const ptyProcess = pty.spawn(shell, [], {
  name: 'xterm-color',
  cols: 80,
  rows: 30,
  cwd: process.cwd(),
  env: process.env
});

ptyProcess.onData((data) => {
  console.log(`[PTY Output]: ${JSON.stringify(data)}`);
  if (data.includes('test-verification')) {
    console.log('[Test] Verification string received! Success.');
    process.exit(0);
  }
});

// Wait a bit for the shell to initialize
setTimeout(() => {
  console.log('[Test] Writing command...');
  // Add a newline to ensure the command executes
  ptyProcess.write('echo "test-verification"\r');
}, 1000);

// Timeout if no output received
setTimeout(() => {
  console.error('[Test] Timeout: No output received.');
  process.exit(1);
}, 5000);
