// Test-only: behaves like a hung kane-cli. Prints one event, starts a child that also holds stdout,
// then never exits. Saboteur must kill the whole tree and carry on.
import { spawn } from 'node:child_process';
process.stdout.write(`${JSON.stringify({ type: 'stream_start', cli_version: '0.10.5' })}\n`);
spawn(process.execPath, ['-e', 'setInterval(() => {}, 1000)'], { stdio: ['ignore', 'inherit', 'inherit'] });
setInterval(() => {}, 1000);
