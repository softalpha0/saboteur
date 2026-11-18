import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type Anthropic from '@anthropic-ai/sdk';
import { describe, expect, it } from 'vitest';
import {
  TestWriter,
  checkProposal,
  fill,
  firstPrompt,
  modelFromEnv,
  parseAnswer,
  parseProposals,
  proposePrompt,
  retryPrompt,
  validateTest,
} from '../src/index.ts';

const GOOD = `FILE: discount_save10_total_test.md
\`\`\`markdown
---
mode: testing
url: http://localhost:4173
tags: [generated, maths]
max_steps: 30
---

# SAVE10 takes 10% off

## Fill the cart
Open the home page and add the Canvas Tote and the Linen Apron to the cart.
Verify the cart badge in the header shows 2.

## Apply the code
Open the cart page and apply the discount code SAVE10.
Verify the Total shows $53.98.
\`\`\``;

describe('parseAnswer', () => {
  it('finds the FILE line and the fenced body', () => {
    const a = parseAnswer(`Here you go.\n${GOOD}\nGood luck.`);
    expect(a.fileName).toBe('discount_save10_total_test.md');
    expect(a.body?.startsWith('---\nmode: testing')).toBe(true);
    expect(a.body?.endsWith('$53.98.\n')).toBe(true);
  });
});

describe('validateTest (06 §5)', () => {
  const v = (text: string, dir?: string) => validateTest(parseAnswer(text), dir);

  it('accepts a good file', () => {
    expect(v(GOOD)).toEqual([]);
  });
  it('1: rejects missing FILE line and bad names', () => {
    expect(v(GOOD.replace(/^FILE:.*$/m, ''))[0]).toMatch(/No "FILE/);
    expect(v(GOOD.replace('discount_save10_total_test.md', 'Discount-Test.md'))[0]).toMatch(/must match/);
  });
  it('2: rejects unknown frontmatter keys', () => {
    expect(v(GOOD.replace('max_steps: 30', 'max_steps: 30\nusername: x')).join()).toMatch(
      /not allowed: username/,
    );
  });
  it('3: rejects fewer than 2 or more than 6 steps, and empty steps', () => {
    const one = GOOD.replace(/## Fill the cart[\s\S]*?(?=## Apply)/, '');
    expect(v(one).join()).toMatch(/2 to 6/);
    const many = GOOD.replace(/\n```$/, `${'\n\n## Extra\nVerify the page shows Total.'.repeat(5)}\n\`\`\``);
    expect(v(many).join()).toMatch(/found 7/);
    expect(
      v(
        GOOD.replace(
          'Open the cart page and apply the discount code SAVE10.\nVerify the Total shows $53.98.',
          '',
        ),
      ).join(),
    ).toMatch(/Empty step body/);
  });
  it('4: rejects @import', () => {
    expect(
      v(GOOD.replace('Open the home page', '@import helpers/login.md\nOpen the home page')).join(),
    ).toMatch(/@import/);
  });
  it('5: rejects a last step with no check word', () => {
    expect(v(GOOD.replace('Verify the Total shows $53.98.', 'The total is lower.')).join()).toMatch(
      /no check/,
    );
  });
  it('6: rejects a name that already exists in the tests dir', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'saboteur-agent-'));
    fs.mkdirSync(path.join(dir, 'starter'));
    fs.writeFileSync(path.join(dir, 'starter', 'discount_save10_total_test.md'), 'x');
    expect(v(GOOD, dir).join()).toMatch(/already exists/);
  });
});

describe('prompts', () => {
  const input = {
    mutant: { id: 'M03', title: 'SAVE10 takes 1%', userImpact: 'Smaller discount', category: 'maths' },
    diff: '-  SAVE10: 10,\n+  SAVE10: 1,',
    routes: '# Routes\nTotal costs $53.98',
    existingTests: [{ file: 'login_test.md', body: '## Sign in\nVerify it.' }],
  };

  it('first prompt includes the diff, routes and existing tests verbatim', () => {
    const p = firstPrompt(input);
    expect(p).toContain('id: M03');
    expect(p).toContain(input.diff);
    expect(p).toContain('Total costs $53.98');
    expect(p).toContain('--- login_test.md ---\n## Sign in\nVerify it.');
  });

  it('retry prompts carry Kane text verbatim, including $ signs', () => {
    const kane = 'Final verification failed: "the order total shows $53.98" $& $1';
    const a = retryPrompt('fails-on-clean', 'BODY', kane);
    expect(a).toContain(`Kane said: ${kane}`);
    expect(a).toContain('FAILED on the CORRECT shop');
    const b = retryPrompt('passes-on-mutant', 'BODY', kane);
    expect(b).toContain('PASSED on the BUGGED shop');
    expect(b).toContain(kane);
  });

  it('fill leaves unknown keys alone', () => {
    expect(fill('{{a}} {{b}}', { a: '$1' })).toBe('$1 {{b}}');
  });
});

describe('TestWriter (stub client, no network)', () => {
  it('keeps one conversation across retries and reads the model from env only', async () => {
    const seen: unknown[] = [];
    const stub = {
      messages: {
        create: async (body: unknown) => {
          seen.push(structuredClone(body));
          return { stop_reason: 'end_turn', content: [{ type: 'text', text: GOOD }] };
        },
      },
    } as unknown as Anthropic;
    expect(() => modelFromEnv({})).toThrow(/ANTHROPIC_MODEL/);
    const w = new TestWriter({
      appUrl: 'http://localhost:4173',
      client: stub,
      model: modelFromEnv({ ANTHROPIC_MODEL: 'test-model' }),
    });
    const first = await w.first({
      mutant: { id: 'M03', title: 't', userImpact: 'u', category: 'maths' },
      diff: 'd',
      routes: 'r',
      existingTests: [],
    });
    expect(first.fileName).toBe('discount_save10_total_test.md');
    await w.retry('fails-on-clean', first.body ?? '', 'Kane said no');
    const last = seen[1] as { model: string; system: string; messages: { role: string; content: string }[] };
    expect(last.model).toBe('test-model');
    expect(last.system).toContain('http://localhost:4173');
    expect(last.messages.map((m) => m.role)).toEqual(['user', 'assistant', 'user']);
    expect(last.messages[2]?.content).toContain('Kane said: Kane said no');
  });
});

describe('mutate --ai proposals', () => {
  const shop = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../apps/shop');
  const good = {
    title: 'Mug price typo',
    category: 'display',
    userImpact: 'Mug shows the wrong price',
    file: 'src/data/products.ts',
    find: 'priceCents: 1450',
    replace: 'priceCents: 1540',
    kaneCheck: 'Open the home page and verify the Ceramic Mug shows $15.40',
  };

  it('parseProposals keeps complete entries and reports broken ones', () => {
    const text = `\`\`\`json\n${JSON.stringify({ mutants: [good, { title: 'x' }] })}\n\`\`\``;
    const r = parseProposals(text);
    expect(r.proposals).toHaveLength(1);
    expect(r.problems[0]).toMatch(/mutant 2: missing/);
    expect(parseProposals('not json').problems[0]).toMatch(/not valid JSON/);
  });

  it('checkProposal: exactly-once find, file inside the app, small edit', () => {
    expect(checkProposal(good, shop)).toBeUndefined();
    expect(checkProposal({ ...good, find: 'inStock: true' }, shop)).toMatch(/exactly once/);
    expect(checkProposal({ ...good, file: '../package.json' }, shop)).toMatch(/inside the app/);
    expect(checkProposal({ ...good, file: 'src/nope.ts' }, shop)).toMatch(/not found/);
    expect(checkProposal({ ...good, replace: good.find }, shop)).toMatch(/same as find/);
  });

  it('proposePrompt includes routes, existing bugs and source files', () => {
    const p = proposePrompt({
      appUrl: 'http://localhost:4173',
      routes: 'ROUTES',
      files: [{ path: 'src/a.ts', content: 'const a = 1;' }],
      existing: [{ id: 'M01', title: 'Total skips last', where: 'src/lib/cart.ts' }],
      count: 3,
    });
    expect(p.system).toContain('http://localhost:4173');
    expect(p.user).toContain('Propose 3 new bugs');
    expect(p.user).toContain('- M01 Total skips last (src/lib/cart.ts)');
    expect(p.user).toContain('--- src/a.ts ---\nconst a = 1;');
  });
});
