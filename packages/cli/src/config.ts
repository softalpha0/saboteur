import fs from 'node:fs';
import path from 'node:path';

export type SaboteurConfig = {
  app: { dir: string; build: string; serve: string; url: string; routes?: string };
  tests: { dir: string; generatedDir: string };
  mutations: { manifest: string };
  kane: { parallel: number; suiteTimeoutMin: number; minCredits: number; failFast?: boolean };
  agent: { maxAttempts: number };
  workDir?: string;
};

/** Config with every path made absolute. `root` is the folder that holds saboteur.config.json; Kane runs there. */
export type Resolved = SaboteurConfig & {
  root: string;
  configPath: string;
  abs: { app: string; tests: string; generated: string; manifest: string; routes?: string };
};

const DEFAULTS: SaboteurConfig = {
  app: {
    dir: 'apps/shop',
    build: 'vite build',
    serve: 'vite preview --port 4173 --strictPort',
    url: 'http://localhost:4173',
  },
  tests: { dir: 'tests/kane', generatedDir: 'tests/kane/generated' },
  mutations: { manifest: 'apps/shop/mutations/manifest.json' },
  kane: { parallel: 1, suiteTimeoutMin: 15, minCredits: 200 },
  agent: { maxAttempts: 3 },
};

export function loadConfig(configPath = 'saboteur.config.json'): Resolved {
  const abs = path.resolve(configPath);
  if (!fs.existsSync(abs)) throw new Error(`config not found: ${abs}`);
  const raw = JSON.parse(fs.readFileSync(abs, 'utf8')) as Partial<SaboteurConfig>;
  const cfg: SaboteurConfig = {
    app: { ...DEFAULTS.app, ...raw.app },
    tests: { ...DEFAULTS.tests, ...raw.tests },
    mutations: { ...DEFAULTS.mutations, ...raw.mutations },
    kane: { ...DEFAULTS.kane, ...raw.kane },
    agent: { ...DEFAULTS.agent, ...raw.agent },
    workDir: raw.workDir,
  };
  const root = path.dirname(abs);
  const r = (p: string) => path.resolve(root, p);
  return {
    ...cfg,
    root,
    configPath: abs,
    abs: {
      app: r(cfg.app.dir),
      tests: r(cfg.tests.dir),
      generated: r(cfg.tests.generatedDir),
      manifest: r(cfg.mutations.manifest),
      routes: cfg.app.routes ? r(cfg.app.routes) : undefined,
    },
  };
}

/** Minimal .env loader (KEY=VALUE, # comments, optional quotes). Never overrides variables already set. */
export function loadDotEnv(file: string): void {
  if (!fs.existsSync(file)) return;
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/);
    if (!m?.[1] || line.trim().startsWith('#')) continue;
    let value = m[2] ?? '';
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'")))
      value = value.slice(1, -1);
    if (process.env[m[1]] === undefined && value !== '') process.env[m[1]] = value;
  }
}
