// Test-only stand-in for kane-cli, used through KANE_CLI_BIN by Vitest. Never used for a real verdict.
// SCRIPTED_KANE=<script.json>: { "steps": [ { "exit": 0, "lines": [ {...event...} ] } ] }
// Each test/suite command consumes the next step. `--version` and `balance` answer directly.
// Every argv is appended to <script.json>.argv.log so tests can assert on the flags Saboteur passed.
import fs from 'node:fs';

const script = process.env.SCRIPTED_KANE;
const argv = process.argv.slice(2);
fs.appendFileSync(`${script}.argv.log`, `${argv.join(' ')}\n`);

if (argv[0] === '--version') {
  process.stdout.write('0.10.5\n');
  process.exit(0);
}
if (argv[0] === 'balance') {
  process.stdout.write('Credits: 5000\n');
  process.exit(0);
}

const { steps } = JSON.parse(fs.readFileSync(script, 'utf8'));
const idxFile = `${script}.idx`;
const idx = fs.existsSync(idxFile) ? Number(fs.readFileSync(idxFile, 'utf8')) : 0;
fs.writeFileSync(idxFile, String(idx + 1));
const step = steps[idx];
if (!step) {
  process.stderr.write(`scripted-kane: no step ${idx} for: ${argv.join(' ')}\n`);
  process.exit(2);
}
for (const line of step.lines ?? []) process.stdout.write(`${JSON.stringify(line)}\n`);
process.exit(step.exit);
