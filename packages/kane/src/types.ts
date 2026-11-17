// Field names follow docs/03-KANE-INTEGRATION.md §3 (Kane CLI testrun / testmd / run NDJSON).

export type KaneEvent = { type?: string; [key: string]: unknown };

export type MemberStatus = 'passed' | 'failed' | 'broken' | 'interrupted';

export type MemberResult = {
  /** Basename, e.g. "checkout_happy_path_test.md". Kane paths can be relative or absolute, so we match by name. */
  file: string;
  path: string;
  testId?: string;
  status: MemberStatus;
  durationS: number;
  sessionId?: string;
  logPath?: string;
  authored: boolean;
  failure?: { message: string; stepIndex?: number };
};

export type SuiteTotals = {
  tests: number;
  passed: number;
  failed: number;
  broken: number;
  skipped: number;
  authored: number;
};

export type SuiteRun = {
  exitCode: number;
  /** True when Saboteur had to kill Kane after the hard timeout. */
  killed: boolean;
  executionId?: string;
  overallStatus?: 'passed' | 'failed' | 'cancelled';
  planValid?: boolean;
  planFailures: string[];
  members: MemberResult[];
  totals?: SuiteTotals;
  cliVersion?: string;
  /** Any http(s) links Kane reported for this run (upload / Test Manager). */
  links: string[];
  evidencePacks: string[];
  durationS: number;
  rawLogPath: string;
  progressLogPath: string;
  stderrTail: string;
};

export type TestFileRun = {
  exitCode: number;
  killed: boolean;
  overallStatus?: string;
  durationS: number;
  sessionId?: string;
  shareUrl?: string;
  links: string[];
  cliVersion?: string;
  /** Kane's own words about why the run failed (failure.message / run_end reason). Never rewritten. */
  failureText?: string;
  failureStepIndex?: number;
  /** Kane's own summary of what happened (run_end summary / one_liner), used when a test passes on a mutant. */
  summaryText?: string;
  evidencePacks: string[];
  rawLogPath: string;
  progressLogPath: string;
  stderrTail: string;
};

export type MutantVerdict = 'killed' | 'survived' | 'error' | 'invalid';
