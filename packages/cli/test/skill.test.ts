import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { SKILL_SOURCE, installSkill } from '../src/skill.ts';

describe('saboteur skill', () => {
  const body = fs.readFileSync(SKILL_SOURCE, 'utf8');

  it('has the frontmatter coding agents need', () => {
    expect(body.startsWith('---\nname: saboteur\ndescription: ')).toBe(true);
    expect(body).toContain('pnpm saboteur doctor');
    expect(body).toContain('Never invent or estimate numbers');
  });

  it('installs into a project for Claude Code', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'saboteur-skill-'));
    const dest = installSkill(dir);
    expect(dest).toBe(path.join(dir, '.claude/skills/saboteur/SKILL.md'));
    expect(fs.readFileSync(dest, 'utf8')).toBe(body);
  });

  it('the copy this repo ships for Claude Code matches the source', () => {
    const repoCopy = path.resolve(path.dirname(SKILL_SOURCE), '../../.claude/skills/saboteur/SKILL.md');
    expect(fs.readFileSync(repoCopy, 'utf8')).toBe(body);
  });
});
