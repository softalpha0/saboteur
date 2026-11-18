import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import Anthropic from '@anthropic-ai/sdk';
import { fill } from './prompts.ts';
import { modelFromEnv } from './writer.ts';

const promptsDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../prompts');
const read = (n: string) => fs.readFileSync(path.join(promptsDir, n), 'utf8');

export type Proposal = {
  title: string;
  category: string;
  userImpact: string;
  file: string;
  find: string;
  replace: string;
  kaneCheck: string;
};

export type ProposeInput = {
  appUrl: string;
  routes: string;
  files: { path: string; content: string }[];
  existing: { id: string; title: string; where: string }[];
  count: number;
};

export function proposePrompt(input: ProposeInput): { system: string; user: string } {
  return {
    system: fill(read('propose-mutants.system.md'), { appUrl: input.appUrl }),
    user: fill(read('propose-mutants.user.md'), {
      count: String(input.count),
      routes: input.routes.trim(),
      existing: input.existing.length
        ? input.existing.map((m) => `- ${m.id} ${m.title} (${m.where})`).join('\n')
        : '(none)',
      files: input.files.map((f) => `--- ${f.path} ---\n${f.content}`).join('\n\n'),
    }),
  };
}

/** Pull the JSON out of Claude's answer and keep only well-formed proposals. */
export function parseProposals(text: string): { proposals: Proposal[]; problems: string[] } {
  const body = text.match(/```(?:json)?\s*\n([\s\S]*?)\n```/)?.[1] ?? text;
  let raw: unknown;
  try {
    raw = JSON.parse(body);
  } catch (err) {
    return { proposals: [], problems: [`answer is not valid JSON: ${(err as Error).message}`] };
  }
  const list = (raw as { mutants?: unknown }).mutants;
  if (!Array.isArray(list)) return { proposals: [], problems: ['JSON has no "mutants" array'] };
  const proposals: Proposal[] = [];
  const problems: string[] = [];
  const keys: (keyof Proposal)[] = [
    'title',
    'category',
    'userImpact',
    'file',
    'find',
    'replace',
    'kaneCheck',
  ];
  list.forEach((m, i) => {
    const missing = keys.filter(
      (k) => typeof (m as Record<string, unknown>)?.[k] !== 'string' || !(m as Record<string, string>)[k],
    );
    if (missing.length) problems.push(`mutant ${i + 1}: missing ${missing.join(', ')}`);
    else proposals.push(m as Proposal);
  });
  return { proposals, problems };
}

/**
 * Checks that need no build and no Kane: the file exists, "find" occurs exactly once, the edit
 * changes something and is small. Returns a reason when the proposal must be dropped.
 */
export function checkProposal(p: Proposal, appDir: string): string | undefined {
  if (path.isAbsolute(p.file) || p.file.split(/[\\/]/).includes('..'))
    return `file must be a path inside the app: ${p.file}`;
  const abs = path.join(appDir, p.file);
  if (!fs.existsSync(abs)) return `file not found: ${p.file}`;
  const src = fs.readFileSync(abs, 'utf8').replace(/\r\n/g, '\n');
  const find = p.find.replace(/\r\n/g, '\n');
  const n = src.split(find).length - 1;
  if (n !== 1) return `"find" must occur exactly once in ${p.file}, found ${n}`;
  if (find === p.replace.replace(/\r\n/g, '\n')) return 'replace is the same as find';
  const changed = Math.max(find.split('\n').length, p.replace.split('\n').length);
  if (changed > 10) return `edit too large (${changed} lines); keep bugs small`;
  return undefined;
}

export class MutantProposer {
  private readonly client: Anthropic;
  readonly model: string;

  constructor(opts: { client?: Anthropic; model?: string } = {}) {
    this.client = opts.client ?? new Anthropic();
    this.model = opts.model ?? modelFromEnv();
  }

  async propose(
    input: ProposeInput,
  ): Promise<{ raw: string; prompt: string; proposals: Proposal[]; problems: string[] }> {
    const { system, user } = proposePrompt(input);
    const response = await this.client.messages.create({
      model: this.model,
      max_tokens: 16000,
      system,
      messages: [{ role: 'user', content: user }],
    });
    if (response.stop_reason === 'refusal')
      throw new Error(`Claude declined the request (stop_reason: refusal) on model ${this.model}`);
    const raw = response.content
      .filter((b): b is Anthropic.TextBlock => b.type === 'text')
      .map((b) => b.text)
      .join('\n');
    return { raw, prompt: user, ...parseProposals(raw) };
  }
}
