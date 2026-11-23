import Anthropic from '@anthropic-ai/sdk';
import { modelFromEnv } from './writer.ts';

/**
 * Claude writes a launch post about a Saboteur run, from a fixed list of facts taken from report.json.
 * The post is checked before it is accepted: every number in it must appear in the facts, and the
 * house style (no em dashes, no hype words) must hold. One retry with the problems listed; the caller
 * falls back to the template post if it still fails.
 */

const HYPE = [
  'revolutionary',
  'seamless',
  'leverage',
  'unlock',
  'game-changer',
  'game changer',
  'cutting-edge',
];

export function postProblems(post: string, facts: string): string[] {
  const allowed = new Set((facts.match(/\d+(?:\.\d+)?/g) ?? []).map(String));
  const problems: string[] = [];
  const nums = new Set(post.match(/\d+(?:\.\d+)?/g) ?? []);
  const unknown = [...nums].filter((n) => !allowed.has(n));
  if (unknown.length) problems.push(`numbers not in the facts: ${unknown.join(', ')}`);
  if (post.includes('—')) problems.push('contains an em dash');
  const hype = HYPE.filter((w) => post.toLowerCase().includes(w));
  if (hype.length) problems.push(`hype words: ${hype.join(', ')}`);
  if (post.trim().length < 400) problems.push('too short');
  return problems;
}

const SYSTEM = `You write a short developer blog post (Markdown, 300 to 500 words) about a tool run.
Rules:
- Use ONLY the facts given. Do not add numbers, results, users, dates or claims that are not in the facts.
- Every number you write must appear in the facts exactly as written.
- Plain words, short sentences, written like a developer explaining it to a friend.
- No em dashes. No hype words (revolutionary, seamless, leverage, unlock, game-changer, cutting-edge).
- Start with a title line beginning with "# ". End with the links from the facts.
Answer with the post only.`;

export class PostWriter {
  private client: Anthropic;
  readonly model: string;
  constructor(opts: { client?: Anthropic; model?: string } = {}) {
    this.client = opts.client ?? new Anthropic();
    this.model = opts.model ?? modelFromEnv();
  }

  private async ask(user: string): Promise<string> {
    const r = await this.client.messages.create({
      model: this.model,
      max_tokens: 1500,
      system: SYSTEM,
      messages: [{ role: 'user', content: user }],
    });
    return r.content
      .filter((b) => b.type === 'text')
      .map((b) => (b as { text: string }).text)
      .join('')
      .trim();
  }

  /** Returns the accepted post, or the last attempt and its problems. */
  async write(facts: string): Promise<{ post: string; problems: string[]; attempts: number }> {
    let post = await this.ask(`FACTS:\n${facts}`);
    let problems = postProblems(post, facts);
    if (!problems.length) return { post, problems, attempts: 1 };
    post = await this.ask(
      `FACTS:\n${facts}\n\nYour last post broke these rules: ${problems.join('; ')}. Rewrite it so it follows every rule.`,
    );
    problems = postProblems(post, facts);
    return { post, problems, attempts: 2 };
  }
}
