import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ui } from './ui.ts';

/** The Saboteur agent skill (skills/saboteur/SKILL.md) and where Claude Code looks for project skills. */
export const SKILL_SOURCE = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../../skills/saboteur/SKILL.md',
);

export function installSkill(projectDir: string): string {
  const dest = path.join(projectDir, '.claude', 'skills', 'saboteur', 'SKILL.md');
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(SKILL_SOURCE, dest);
  return dest;
}

export async function cmdSkill(opts: { install?: boolean; dir?: string }): Promise<number> {
  if (!opts.install) {
    ui.title('Saboteur skill');
    ui.info(`Skill file: ${SKILL_SOURCE}`);
    ui.info('Install it into a project for Claude Code: pnpm saboteur skill --install [--dir <project>]');
    ui.info('Other agents that read SKILL.md files can use the same file: copy it into their skills folder.');
    return 0;
  }
  const dest = installSkill(path.resolve(opts.dir ?? process.cwd()));
  ui.ok(`installed ${dest}`);
  ui.info('In Claude Code, ask: "use saboteur to check how good my tests are".');
  return 0;
}
