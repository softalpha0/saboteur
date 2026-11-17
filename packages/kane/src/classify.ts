import type { MutantVerdict, SuiteRun } from './types.ts';

export type Classification = {
  verdict: MutantVerdict;
  reason: string;
  /** Members that failed (Kane caught the bug), with Kane's failure.message. */
  caughtBy: { file: string; message?: string; stepIndex?: number }[];
  /** True when the rules say "re-run once" (only broken / interrupted members). */
  retry: boolean;
};

/** Verdict rules from docs/01-PRD.md §8. */
export function classifyMutant(run: Pick<SuiteRun, 'exitCode' | 'members' | 'totals' | 'killed' | 'planValid'>): Classification {
  const caughtBy = run.members
    .filter((m) => m.status === 'failed')
    .map((m) => ({ file: m.file, message: m.failure?.message, stepIndex: m.failure?.stepIndex }));

  const authored = (run.totals?.authored ?? 0) + run.members.filter((m) => m.authored).length;
  if (authored > 0) {
    return {
      verdict: 'invalid',
      reason: 'a test was authored against the bugged build; the baseline must record every test first',
      caughtBy,
      retry: false,
    };
  }

  if (run.killed) return { verdict: 'error', reason: 'Saboteur hard timeout hit; Kane was stopped', caughtBy, retry: false };

  switch (run.exitCode) {
    case 0:
      return { verdict: 'survived', reason: 'every test passed on the bugged build', caughtBy: [], retry: false };
    case 1:
      if (caughtBy.length > 0) {
        return { verdict: 'killed', reason: `${caughtBy.length} test(s) failed on the bugged build`, caughtBy, retry: false };
      }
      return {
        verdict: 'error',
        reason: 'Kane exited 1 but no member failed (only broken or interrupted members)',
        caughtBy,
        retry: true,
      };
    case 2:
      return { verdict: 'error', reason: 'Kane exit 2: usage, invalid plan or auth error; nothing ran', caughtBy, retry: false };
    case 3:
      return { verdict: 'error', reason: 'Kane exit 3: cancelled or timed out', caughtBy, retry: false };
    default:
      return { verdict: 'error', reason: `unexpected Kane exit code ${run.exitCode}`, caughtBy, retry: false };
  }
}
