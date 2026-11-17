import pc from 'picocolors';

export const ui = {
  title(s: string) {
    console.log(`\n${pc.bold(pc.magenta('▌'))} ${pc.bold(s)}`);
  },
  info(s: string) {
    console.log(`  ${s}`);
  },
  dim(s: string) {
    console.log(pc.dim(`  ${s}`));
  },
  ok(s: string) {
    console.log(`  ${pc.green('✔')} ${s}`);
  },
  warn(s: string) {
    console.log(`  ${pc.yellow('!')} ${s}`);
  },
  fail(s: string) {
    console.log(`  ${pc.red('✖')} ${s}`);
  },
};

export function verdictBadge(v: string): string {
  switch (v) {
    case 'killed':
      return pc.green('CAUGHT  ');
    case 'survived':
      return pc.red('SLIPPED ');
    case 'error':
      return pc.yellow('ERROR   ');
    case 'invalid':
      return pc.yellow('INVALID ');
    case 'rejected':
      return pc.dim('REJECTED');
    default:
      return v;
  }
}

/** One row of the live attack table, printed as soon as Kane's verdict is in. */
export function attackRow(id: string, title: string, verdict: string, detail: string): void {
  const t = title.length > 46 ? `${title.slice(0, 45)}…` : title.padEnd(46);
  console.log(`  ${pc.bold(id.padEnd(4))} ${t} ${verdictBadge(verdict)} ${pc.dim(detail)}`);
}

export function attackHeader(): void {
  console.log(pc.dim(`  ${'ID'.padEnd(4)} ${'Bug'.padEnd(46)} ${'Kane'.padEnd(8)} Detail`));
}

export function short(s: string | undefined, n = 110): string {
  if (!s) return '';
  const one = s.replace(/\s+/g, ' ').trim();
  return one.length > n ? `${one.slice(0, n - 1)}…` : one;
}
