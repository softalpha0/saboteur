import fs from 'node:fs';
import path from 'node:path';

export const ALLOWED_KEYS = ['mode', 'url', 'tags', 'max_steps'] as const;
const NAME = /^[a-z0-9_]+_test\.md$/;
const CHECK_WORD = /\b(verify|verifies|assert|asserts|confirm|confirms|check|checks)\b/i;

export type ParsedAnswer = { fileName?: string; body?: string };

/** Pull "FILE: x_test.md" and the fenced ```markdown block out of Claude's answer. */
export function parseAnswer(text: string): ParsedAnswer {
  const fileName = text.match(/^\s*FILE:\s*`?([^\s`]+)`?\s*$/m)?.[1];
  const fence = text.match(/```(?:markdown|md)?[ \t]*\r?\n([\s\S]*?)\r?\n```/);
  return { fileName, body: fence?.[1] ? `${fence[1].trimEnd()}\n` : undefined };
}

export type Step = { heading: string; body: string };

export function splitFrontmatter(body: string): { keys: string[]; rest: string } {
  const m = body.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!m) return { keys: [], rest: body };
  const keys = (m[1] ?? '')
    .split(/\r?\n/)
    .map((l) => l.match(/^([A-Za-z_][\w-]*)\s*:/)?.[1])
    .filter((k): k is string => Boolean(k));
  return { keys, rest: m[2] ?? '' };
}

export function steps(body: string): Step[] {
  const { rest } = splitFrontmatter(body);
  const out: Step[] = [];
  let current: Step | null = null;
  for (const line of rest.split(/\r?\n/)) {
    const h = line.match(/^##\s+(.*)$/);
    if (h) {
      current = { heading: (h[1] ?? '').trim(), body: '' };
      out.push(current);
    } else if (current) {
      current.body += `${line}\n`;
    }
  }
  for (const s of out) s.body = s.body.trim();
  return out;
}

/**
 * Local validator, docs/06-AGENT-PROMPTS.md §5. Runs before any Kane credits are spent.
 * Returns a list of problems; empty means valid.
 */
export function validateTest(answer: ParsedAnswer, testsDir?: string): string[] {
  const problems: string[] = [];
  if (!answer.fileName) problems.push('No "FILE: <name>_test.md" line.');
  else if (!NAME.test(answer.fileName)) problems.push(`File name "${answer.fileName}" must match ${NAME.source}.`);
  if (!answer.body) {
    problems.push('No ```markdown fenced block with the file contents.');
    return problems;
  }

  const { keys } = splitFrontmatter(answer.body);
  const unknown = keys.filter((k) => !(ALLOWED_KEYS as readonly string[]).includes(k));
  if (unknown.length) problems.push(`Frontmatter keys not allowed: ${unknown.join(', ')}. Allowed: ${ALLOWED_KEYS.join(', ')}.`);

  const st = steps(answer.body);
  if (st.length < 2 || st.length > 6) problems.push(`Needs 2 to 6 "## " steps, found ${st.length}.`);
  const empty = st.filter((s) => !s.body);
  if (empty.length) problems.push(`Empty step body: ${empty.map((s) => `"${s.heading}"`).join(', ')}.`);
  if (st.some((s) => /@import\b/.test(s.body))) problems.push('A step uses @import; not allowed here.');
  const last = st[st.length - 1];
  if (last && !CHECK_WORD.test(last.body)) {
    problems.push('The last step has no check (use verify, assert, confirm or check).');
  }

  if (answer.fileName && testsDir && existsUnder(testsDir, answer.fileName)) {
    problems.push(`A test named ${answer.fileName} already exists under ${testsDir}. Pick a new name.`);
  }
  return problems;
}

function existsUnder(dir: string, name: string): boolean {
  if (!fs.existsSync(dir)) return false;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (entry.name.startsWith('output-') || entry.name === 'node_modules') continue;
      if (existsUnder(path.join(dir, entry.name), name)) return true;
    } else if (entry.name === name) {
      return true;
    }
  }
  return false;
}
