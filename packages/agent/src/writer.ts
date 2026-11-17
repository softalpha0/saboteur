import Anthropic from '@anthropic-ai/sdk';
import { type FirstPromptInput, type Problem, firstPrompt, retryPrompt, systemPrompt } from './prompts.ts';
import { type ParsedAnswer, parseAnswer } from './validate.ts';

export type Turn = { role: 'user' | 'assistant'; content: string };

export type WriterReply = ParsedAnswer & { raw: string; prompt: string; model: string };

/** Model comes from ANTHROPIC_MODEL. Saboteur never hard-codes a model id. */
export function modelFromEnv(env: NodeJS.ProcessEnv = process.env): string {
  const model = env.ANTHROPIC_MODEL?.trim();
  if (!model) throw new Error('ANTHROPIC_MODEL is not set. Put a Claude model id you have access to in .env (see .env.example).');
  return model;
}

/**
 * One writer conversation per survivor. Each retry is appended to the same conversation, so Claude
 * sees its earlier file and Kane's verdict on it. Claude never sees the browser; Kane's text is
 * the only feedback.
 */
export class TestWriter {
  private readonly client: Anthropic;
  private readonly model: string;
  private readonly system: string;
  readonly turns: Turn[] = [];

  constructor(opts: { appUrl: string; client?: Anthropic; model?: string }) {
    this.client = opts.client ?? new Anthropic();
    this.model = opts.model ?? modelFromEnv();
    this.system = systemPrompt(opts.appUrl);
  }

  get systemText(): string {
    return this.system;
  }

  first(input: FirstPromptInput): Promise<WriterReply> {
    return this.ask(firstPrompt(input));
  }

  retry(problem: Problem, previousBody: string, kaneText: string): Promise<WriterReply> {
    return this.ask(retryPrompt(problem, previousBody, kaneText));
  }

  private async ask(prompt: string): Promise<WriterReply> {
    this.turns.push({ role: 'user', content: prompt });
    const response = await this.client.messages.create({
      model: this.model,
      max_tokens: 16000,
      system: this.system,
      messages: this.turns.map((t) => ({ role: t.role, content: t.content })),
    });
    if (response.stop_reason === 'refusal') {
      this.turns.pop();
      throw new Error(`Claude declined the request (stop_reason: refusal) on model ${this.model}`);
    }
    const raw = response.content
      .filter((b): b is Anthropic.TextBlock => b.type === 'text')
      .map((b) => b.text)
      .join('\n');
    this.turns.push({ role: 'assistant', content: raw });
    return { ...parseAnswer(raw), raw, prompt, model: this.model };
  }
}
