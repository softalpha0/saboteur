import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const promptsDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../prompts');

export type Problem = 'fails-on-clean' | 'passes-on-mutant' | 'invalid-file';

export type MutantInfo = { id: string; title: string; userImpact: string; category: string };

export type FirstPromptInput = {
  mutant: MutantInfo;
  diff: string;
  routes: string;
  existingTests: { file: string; body: string }[];
};

function readPrompt(name: string): string {
  return fs.readFileSync(path.join(promptsDir, name), 'utf8');
}

/** {{key}} substitution. Values are inserted verbatim (a function replacer, so "$" in values is safe). */
export function fill(template: string, values: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (whole, key: string) =>
    key in values ? (values[key] as string) : whole,
  );
}

export function systemPrompt(appUrl: string): string {
  return fill(readPrompt('write-test.system.md'), { appUrl });
}

export function formatExistingTests(tests: { file: string; body: string }[]): string {
  if (tests.length === 0) return '(none)';
  return tests.map((t) => `--- ${t.file} ---\n${t.body.trim()}`).join('\n\n');
}

export function firstPrompt(input: FirstPromptInput): string {
  return fill(readPrompt('write-test.first.md'), {
    id: input.mutant.id,
    title: input.mutant.title,
    userImpact: input.mutant.userImpact,
    diff: input.diff.trim(),
    routes: input.routes.trim(),
    existingTests: formatExistingTests(input.existingTests),
  });
}

/** Retry prompt. `kaneText` is Kane's own words (or the local validator's list); never rewritten here. */
export function retryPrompt(problem: Problem, testBody: string, kaneText: string): string {
  return fill(readPrompt(`write-test.retry-${problem}.md`), {
    testBody: testBody.trim(),
    kaneText: kaneText.trim(),
  });
}
