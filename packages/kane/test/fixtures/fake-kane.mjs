// Test-only stand-in for kane-cli (see README.md). Usage via env:
//   FAKE_KANE_FIXTURE=<ndjson file>  FAKE_KANE_EXIT=<code>
// Writes the fixture in two uneven chunks (to exercise partial-line handling), echoes argv to stderr.
import fs from 'node:fs';

const text = fs.readFileSync(process.env.FAKE_KANE_FIXTURE, 'utf8');
process.stderr.write(`argv: ${process.argv.slice(2).join(' ')}\n`);
const cut = Math.floor(text.length / 3);
process.stdout.write(text.slice(0, cut));
setTimeout(() => {
  process.stdout.write(text.slice(cut));
  process.exitCode = Number(process.env.FAKE_KANE_EXIT ?? '0');
}, 20);
