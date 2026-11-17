import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, describe, expect, it } from 'vitest';
import {
  NdjsonSplitter,
  type SuiteRun,
  authArgs,
  baseName,
  classifyMutant,
  digestTestmd,
  digestTestrun,
  parseAll,
  parseCredits,
  redactArgs,
  runSuite,
  runTestFile,
} from '../src/index.ts';

const here = path.dirname(fileURLToPath(import.meta.url));
const fixture = (name: string) => path.join(here, 'fixtures', name);
const read = (name: string) => fs.readFileSync(fixture(name), 'utf8');

describe('NdjsonSplitter', () => {
  it('handles chunks split mid-line, CRLF, blank and non-JSON lines', () => {
    const got: (string | null)[] = [];
    const s = new NdjsonSplitter((e, raw) => got.push(e ? String(e.type) : `RAW:${raw}`));
    s.push('{"type":"a"}\r\n{"ty');
    s.push('pe":"b"}\n\nnot json\n{"type":"c"}');
    expect(got).toEqual(['a', 'b', 'RAW:not json']);
    s.end();
    expect(got).toEqual(['a', 'b', 'RAW:not json', 'c']);
  });
});

describe('digestTestrun', () => {
  it('reads members, totals, execution id, links and version; matches by file name', () => {
    const d = digestTestrun(parseAll(read('testrun-killed.ndjson')));
    expect(d.done).toBe(true);
    expect(d.cliVersion).toBe('0.10.5');
    expect(d.executionId).toBe('exec-123');
    expect(d.overallStatus).toBe('failed');
    expect(d.totals?.failed).toBe(1);
    expect(d.members.map((m) => [m.file, m.status])).toEqual([
      ['browse_add_to_cart_test.md', 'passed'],
      ['cart_shows_item_test.md', 'failed'],
    ]);
    const failed = d.members.find((m) => m.status === 'failed');
    expect(failed?.failure?.message).toContain('Final verification failed');
    expect(failed?.failure?.stepIndex).toBe(1);
    expect(d.links).toContain('https://example.invalid/test-manager/exec-123');
  });

  it('ignores unknown event types and reports invalid plans', () => {
    const d = digestTestrun([
      { type: 'something_new', foo: 1 },
      {
        type: 'testrun_plan',
        valid: false,
        members: [{ path: 'x_test.md', failure: 'unknown config key: auth' }],
      },
    ]);
    expect(d.planValid).toBe(false);
    expect(d.planFailures).toEqual(['x_test.md: unknown config key: auth']);
    expect(d.members).toEqual([]);
  });

  it('marks authored members', () => {
    const d = digestTestrun([
      { type: 'testrun_authored_member_end', path: 'fail_test.md', status: 'failed', duration_s: 41 },
    ]);
    expect(d.members[0]?.authored).toBe(true);
  });
});

describe('baseName', () => {
  it('works on POSIX, Windows and bare names', () => {
    expect(baseName('/a/b/x_test.md')).toBe('x_test.md');
    expect(baseName('tests\\kane\\x_test.md')).toBe('x_test.md');
    expect(baseName('x_test.md')).toBe('x_test.md');
  });
});

describe('digestTestmd', () => {
  it('keeps Kane failure text verbatim and finds the share url', () => {
    const d = digestTestmd(parseAll(read('testmd-failed.ndjson')));
    expect(d.done).toBe(true);
    expect(d.overallStatus).toBe('failed');
    expect(d.failureText).toBe('Final verification failed: "the order total shows $53.98"');
    expect(d.failureStepIndex).toBe(2);
    expect(d.shareUrl).toBe('https://example.invalid/share/tm-1');
    expect(d.summaryText).toContain('the total shown was $59.38');
  });
});

describe('classifyMutant (PRD §8)', () => {
  const base = (
    over: Partial<SuiteRun>,
  ): Pick<SuiteRun, 'exitCode' | 'members' | 'totals' | 'killed' | 'planValid'> => ({
    exitCode: 0,
    members: [],
    killed: false,
    ...over,
  });
  const member = (status: 'passed' | 'failed' | 'broken' | 'interrupted', authored = false) => ({
    file: `${status}_test.md`,
    path: `${status}_test.md`,
    status,
    durationS: 1,
    authored,
    failure: status === 'failed' ? { message: 'Final verification failed: x' } : undefined,
  });

  it('exit 1 + failed member => killed, with the failure message', () => {
    const c = classifyMutant(base({ exitCode: 1, members: [member('passed'), member('failed')] }));
    expect(c.verdict).toBe('killed');
    expect(c.caughtBy).toEqual([
      { file: 'failed_test.md', message: 'Final verification failed: x', stepIndex: undefined },
    ]);
  });
  it('exit 0 => survived', () => {
    expect(classifyMutant(base({ exitCode: 0, members: [member('passed')] })).verdict).toBe('survived');
  });
  it('exit 1 with only broken/interrupted => error, retry once', () => {
    const c = classifyMutant(base({ exitCode: 1, members: [member('broken'), member('interrupted')] }));
    expect(c.verdict).toBe('error');
    expect(c.retry).toBe(true);
  });
  it('exit 2 and 3 => error, no retry', () => {
    expect(classifyMutant(base({ exitCode: 2 })).verdict).toBe('error');
    expect(classifyMutant(base({ exitCode: 3 })).retry).toBe(false);
  });
  it('authored > 0 => invalid, even when a test failed', () => {
    const t = { tests: 1, passed: 0, failed: 1, broken: 0, skipped: 0, authored: 1 };
    expect(classifyMutant(base({ exitCode: 1, members: [member('failed')], totals: t })).verdict).toBe(
      'invalid',
    );
    expect(classifyMutant(base({ exitCode: 1, members: [member('failed', true)] })).verdict).toBe('invalid');
  });
  it('hard timeout => error', () => {
    expect(classifyMutant(base({ exitCode: 3, killed: true })).verdict).toBe('error');
  });
});

describe('auth + credits helpers', () => {
  it('adds basic auth only when both env vars are set, and redacts the key', () => {
    expect(authArgs({})).toEqual([]);
    expect(authArgs({ LT_USERNAME: 'u' })).toEqual([]);
    const a = authArgs({ LT_USERNAME: 'u', LT_ACCESS_KEY: 'k' });
    expect(a).toEqual(['--username', 'u', '--access-key', 'k']);
    expect(redactArgs(a)).toEqual(['--username', 'u', '--access-key', '***']);
  });
  it('parses the first number from balance output', () => {
    expect(parseCredits('Credits remaining: 9,812.5')).toBe(9812.5);
    expect(parseCredits('\u001b[32m120\u001b[0m credits')).toBe(120);
    expect(parseCredits('Not authenticated')).toBeUndefined();
  });
});

describe('spawn wrapper (stand-in binary, no credits)', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'saboteur-kane-'));
  const saved = { ...process.env };
  afterEach(() => {
    process.env = { ...saved };
  });

  it('runSuite passes explicit paths + flags, parses events, keeps exit code and logs', async () => {
    process.env.KANE_CLI_BIN = fixture('fake-kane.mjs');
    process.env.FAKE_KANE_FIXTURE = fixture('testrun-killed.ndjson');
    process.env.FAKE_KANE_EXIT = '1';
    const ends: string[] = [];
    const run = await runSuite({
      files: ['tests/kane/starter/a_test.md', 'tests/kane/starter/b_test.md'],
      noHeal: true,
      cwd: tmp,
      logDir: path.join(tmp, 'logs'),
      label: 'M01',
      onMemberEnd: (m) => ends.push(m.file),
    });
    expect(run.exitCode).toBe(1);
    expect(ends).toEqual(['browse_add_to_cart_test.md', 'cart_shows_item_test.md']);
    expect(classifyMutant(run).verdict).toBe('killed');
    const progress = fs.readFileSync(run.progressLogPath, 'utf8');
    expect(progress).toContain(
      'argv: testrun run tests/kane/starter/a_test.md tests/kane/starter/b_test.md --agent --headless --no-adaptive-heal',
    );
    expect(fs.readFileSync(run.rawLogPath, 'utf8').trim().split('\n')).toHaveLength(11);
  });

  it('runTestFile omits --no-adaptive-heal on clean runs', async () => {
    process.env.KANE_CLI_BIN = fixture('fake-kane.mjs');
    process.env.FAKE_KANE_FIXTURE = fixture('testmd-failed.ndjson');
    process.env.FAKE_KANE_EXIT = '1';
    const run = await runTestFile({
      file: 'x_test.md',
      noHeal: false,
      cwd: tmp,
      logDir: path.join(tmp, 'logs'),
      label: 'a1',
    });
    expect(run.exitCode).toBe(1);
    expect(run.failureText).toContain('$53.98');
    expect(fs.readFileSync(run.progressLogPath, 'utf8')).toContain(
      'argv: testmd run x_test.md --agent --headless\n',
    );
  });

  it('missing binary => exit 2 with an install hint', async () => {
    process.env.KANE_CLI_BIN = path.join(tmp, 'does-not-exist-kane');
    const run = await runTestFile({
      file: 'x_test.md',
      noHeal: true,
      cwd: tmp,
      logDir: path.join(tmp, 'logs'),
      label: 'm',
    });
    expect(run.exitCode).toBe(2);
  });
});
