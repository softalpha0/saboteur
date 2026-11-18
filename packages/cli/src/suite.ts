import fs from 'node:fs';
import path from 'node:path';

/** Every *_test.md under `dir` (recursive), skipping Kane's output-<stem>/ recordings. Sorted, absolute. */
export function findTests(dir: string): string[] {
  const out: string[] = [];
  const walk = (d: string) => {
    if (!fs.existsSync(d)) return;
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) {
        if (
          e.name.startsWith('output-') ||
          e.name === 'node_modules' ||
          e.name === 'quarantine' ||
          e.name.startsWith('.')
        )
          continue;
        walk(p);
      } else if (e.name.endsWith('_test.md')) {
        out.push(p);
      }
    }
  };
  walk(dir);
  return out.sort();
}

const inside = (child: string, parent: string) => {
  const rel = path.relative(parent, child);
  return rel !== '' && !rel.startsWith('..') && !path.isAbsolute(rel);
};

export type Suites = { base: string[]; generated: string[]; all: string[] };

/** "base" = the suite being scored (everything except generated tests). "all" adds generated tests. */
export function suites(testsDir: string, generatedDir: string): Suites {
  const all = findTests(testsDir);
  const extraGenerated = inside(generatedDir, testsDir) ? [] : findTests(generatedDir);
  const generated = [...all.filter((f) => inside(f, generatedDir)), ...extraGenerated];
  const base = all.filter((f) => !inside(f, generatedDir));
  return { base, generated, all: [...base, ...generated] };
}

/** Paths as passed to Kane: relative to the repo root (Kane runs there). */
export function relPaths(root: string, files: string[]): string[] {
  return files.map((f) => path.relative(root, f));
}

export function readTests(files: string[], root: string): { file: string; body: string }[] {
  return files.map((f) => ({
    file: path.relative(root, f).split(path.sep).join('/'),
    body: fs.readFileSync(f, 'utf8'),
  }));
}
