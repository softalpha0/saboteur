export type Verdict = 'killed' | 'survived' | 'error' | 'invalid' | 'rejected';

/** One Kane suite run against one build. Every field comes from Kane's output or exit code. */
export type AttackRecord = {
  verdict: Verdict;
  reason: string;
  exitCode: number | null;
  executionId?: string;
  caughtBy: { file: string; message?: string; stepIndex?: number; detail?: string }[];
  links: string[];
  rawLog?: string;
  evidencePacks: string[];
  durationS: number;
  retried: boolean;
  suite: string[];
};

export type FillAttempt = {
  n: number;
  fileName?: string;
  invalid?: string[];
  clean?: {
    exitCode: number;
    overallStatus?: string;
    failureText?: string;
    shareUrl?: string;
    rawLog: string;
  };
  mutant?: {
    exitCode: number;
    overallStatus?: string;
    failureText?: string;
    summaryText?: string;
    shareUrl?: string;
    rawLog: string;
  };
  decision: 'accepted' | 'fails-on-clean' | 'passes-on-mutant' | 'invalid-file' | 'infra-error';
};

export type FillRecord = {
  attempts: number;
  accepted: boolean;
  testFile?: string;
  transcript: string;
  model?: string;
  history: FillAttempt[];
  error?: string;
};

export type MutantReport = {
  id: string;
  title: string;
  category: string;
  userImpact: string;
  verdictBefore: Verdict;
  verdictAfter: Verdict;
  before: AttackRecord;
  /** Present when the mutant was re-attacked with the grown suite. */
  after?: AttackRecord;
  /** How a survivor got closed: by a generated test already in the repo, or by this run's fill loop. */
  closedBy?: 'existing-generated-test' | 'fill';
  fill?: FillRecord;
};

export type Score = { killed: number; survived: number; errors: number; invalid: number; rejected: number };

export type Report = {
  runId: string;
  startedAt: string;
  finishedAt: string;
  mode: 'live' | 'replay' | 'attack-only';
  kaneCliVersion?: string;
  app: string;
  appUrl: string;
  suiteBefore: string[];
  suiteAfter: string[];
  baseline: {
    exitCode: number;
    executionId?: string;
    links: string[];
    rawLog: string;
    authored: number;
    durationS: number;
  };
  before: Score;
  after: Score;
  mutants: MutantReport[];
  generatedTests: string[];
  credits?: { before?: number; after?: number };
  evidenceDir: string;
};

export function score(verdicts: Verdict[]): Score {
  const s: Score = { killed: 0, survived: 0, errors: 0, invalid: 0, rejected: 0 };
  for (const v of verdicts) {
    if (v === 'killed') s.killed++;
    else if (v === 'survived') s.survived++;
    else if (v === 'error') s.errors++;
    else if (v === 'invalid') s.invalid++;
    else s.rejected++;
  }
  return s;
}

/** "6/10 caught". Errors, invalid and rejected mutants are excluded from the score (PRD §8). */
export function scoreText(s: Score): string {
  return `${s.killed}/${s.killed + s.survived} caught`;
}
