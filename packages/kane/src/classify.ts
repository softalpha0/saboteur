import type { MutantVerdict, SuiteRun } from './types.ts';

export type Classification = {
  verdict: MutantVerdict;
  reason: string;
  /** Members that failed (Kane caught the bug), with Kane's failure.message. */
  caughtBy: { file: string; message?: string; stepIndex?: number; detail?: string }[];
  /** True when the rules say "re-run once" (only broken / interrupted members). */
  retry: boolean;
};

/** Verdict rules from docs/01-PRD.md §8. */
export function classifyMutant(
  run: Pick<SuiteRun, 'exitCode' | 'members' | 'totals' | 'killed' | 'planValid'>,
): Classification {
  const infra = run.members.filter((m) => m.status === 'failed' && isInfraFailure(m.failure?.message));
  const caughtBy = run.members
    .filter((m) => m.status === 'failed' && !isInfraFailure(m.failure?.message))
    .map((m) => ({
      file: m.file,
      message: m.failure?.message,
      stepIndex: m.failure?.stepIndex,
      detail: m.failure?.detail,
    }));

  const authored = (run.totals?.authored ?? 0) + run.members.filter((m) => m.authored).length;
  if (authored > 0) {
    return {
      verdict: 'invalid',
      reason: 'a test was authored against the bugged build; the baseline must record every test first',
      caughtBy,
      retry: false,
    };
  }

  if (run.killed)
    return {
      verdict: 'error',
      reason: 'Saboteur hard timeout hit; Kane was stopped',
      caughtBy,
      retry: false,
    };

  switch (run.exitCode) {
    case 0:
      return {
        verdict: 'survived',
        reason: 'every test passed on the bugged build',
        caughtBy: [],
        retry: false,
      };
    case 1:
      if (infra.length > 0) {
        // Never score a bug as caught while the browser or the machine was failing in the same run.
        return {
          verdict: 'error',
          reason:
            `Kane's browser failed, not the app: ${infra[0]?.file}: ${infra[0]?.failure?.message ?? ''}`.slice(
              0,
              400,
            ),
          caughtBy,
          retry: true,
        };
      }
      if (caughtBy.length > 0) {
        return {
          verdict: 'killed',
          reason: `${caughtBy.length} test(s) failed on the bugged build`,
          caughtBy,
          retry: false,
        };
      }
      return {
        verdict: 'error',
        reason: 'Kane exited 1 but no member failed (only broken or interrupted members)',
        caughtBy,
        retry: true,
      };
    case 2:
      return {
        verdict: 'error',
        reason: 'Kane exit 2: usage, invalid plan or auth error; nothing ran',
        caughtBy,
        retry: false,
      };
    case 3:
      return { verdict: 'error', reason: 'Kane exit 3: cancelled or timed out', caughtBy, retry: false };
    default:
      return {
        verdict: 'error',
        reason: `unexpected Kane exit code ${run.exitCode}`,
        caughtBy,
        retry: false,
      };
  }
}

/**
 * Failures that come from the test machine, not from the app under test: the browser crashed or
 * disconnected, the disk is full, Chrome could not start. Kane can report these as `failed`.
 */
export function isInfraFailure(message: string | undefined): boolean {
  if (!message) return false;
  return /browser_disconnected|ENOSPC|No space left on device|Target (page, context or browser|closed)|chrome (failed|crashed)|ECONNREFUSED/i.test(
    message,
  );
}
