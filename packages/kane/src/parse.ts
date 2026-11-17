import path from 'node:path';
import type { KaneEvent, MemberResult, MemberStatus, SuiteTotals } from './types.ts';

const STATUSES: MemberStatus[] = ['passed', 'failed', 'broken', 'interrupted'];

const str = (v: unknown): string | undefined => (typeof v === 'string' && v.length > 0 ? v : undefined);
const num = (v: unknown): number | undefined => (typeof v === 'number' && Number.isFinite(v) ? v : undefined);

/** Basename that works for both POSIX and Windows paths, whatever OS we run on. */
export function baseName(p: string): string {
  return path.win32.basename(path.posix.basename(p));
}

export function memberFromEvent(e: KaneEvent): MemberResult | null {
  if (e.type !== 'testrun_member_end' && e.type !== 'testrun_authored_member_end') return null;
  const p = str(e.path);
  const status = e.status as MemberStatus;
  if (!p || !STATUSES.includes(status)) return null;
  const failureRaw = e.failure as { message?: unknown; step_index?: unknown } | undefined;
  const message = failureRaw ? str(failureRaw.message) : undefined;
  return {
    file: baseName(p),
    path: p,
    testId: str(e.test_id),
    status,
    durationS: num(e.duration_s) ?? 0,
    sessionId: str(e.session_id),
    logPath: str(e.log_path),
    authored: e.type === 'testrun_authored_member_end',
    failure: message ? { message, stepIndex: num(failureRaw?.step_index) } : undefined,
  };
}

/** Collect every http(s) URL anywhere inside a value (used for upload / Test Manager links). */
export function findLinks(value: unknown, out: Set<string> = new Set()): Set<string> {
  if (typeof value === 'string') {
    if (/^https?:\/\//.test(value)) out.add(value);
  } else if (Array.isArray(value)) {
    for (const v of value) findLinks(v, out);
  } else if (value && typeof value === 'object') {
    for (const v of Object.values(value)) findLinks(v, out);
  }
  return out;
}

export type TestrunDigest = {
  executionId?: string;
  overallStatus?: 'passed' | 'failed' | 'cancelled';
  planValid?: boolean;
  planFailures: string[];
  members: MemberResult[];
  totals?: SuiteTotals;
  cliVersion?: string;
  links: string[];
  done: boolean;
};

/** Reduce a `kane-cli testrun run --agent` event stream to what Saboteur needs. Unknown types are ignored. */
export function digestTestrun(events: KaneEvent[]): TestrunDigest {
  const d: TestrunDigest = { planFailures: [], members: [], links: [], done: false };
  const links = new Set<string>();
  const byFile = new Map<string, MemberResult>();

  for (const e of events) {
    switch (e.type) {
      case 'stream_start':
        d.cliVersion = str(e.cli_version) ?? d.cliVersion;
        break;
      case 'testrun_plan': {
        if (typeof e.valid === 'boolean') d.planValid = e.valid;
        const members = Array.isArray(e.members) ? (e.members as Record<string, unknown>[]) : [];
        for (const m of members) {
          const f = m.failure;
          if (f)
            d.planFailures.push(`${str(m.path) ?? '?'}: ${typeof f === 'string' ? f : JSON.stringify(f)}`);
        }
        break;
      }
      case 'testrun_start':
        d.executionId = str(e.execution_id) ?? d.executionId;
        break;
      case 'testrun_member_end':
      case 'testrun_authored_member_end': {
        const m = memberFromEvent(e);
        // A later end event for the same file (authored after a replay) replaces the earlier one.
        if (m) byFile.set(m.file, m);
        break;
      }
      case 'testrun_summary': {
        const t = e.totals as Partial<SuiteTotals> | undefined;
        if (t) {
          d.totals = {
            tests: t.tests ?? 0,
            passed: t.passed ?? 0,
            failed: t.failed ?? 0,
            broken: t.broken ?? 0,
            skipped: t.skipped ?? 0,
            authored: t.authored ?? 0,
          };
        }
        findLinks(e.upload, links);
        findLinks(e.execution, links);
        const exec = e.execution as { id?: unknown } | undefined;
        d.executionId = str(exec?.id) ?? d.executionId;
        break;
      }
      case 'testrun_done': {
        d.done = true;
        d.executionId = str(e.execution_id) ?? d.executionId;
        const s = e.overall_status;
        if (s === 'passed' || s === 'failed' || s === 'cancelled') d.overallStatus = s;
        findLinks(e, links);
        break;
      }
      default:
        break;
    }
  }
  d.members = [...byFile.values()];
  d.links = [...links];
  return d;
}

export type TestmdDigest = {
  overallStatus?: string;
  durationS?: number;
  sessionId?: string;
  shareUrl?: string;
  cliVersion?: string;
  failureText?: string;
  failureStepIndex?: number;
  summaryText?: string;
  links: string[];
  done: boolean;
};

/**
 * Reduce a `kane-cli testmd run --agent` stream. Completion is `test_md_done`; embedded `run_end`
 * events finish single steps. Failure and summary text are kept exactly as Kane wrote them.
 */
export function digestTestmd(events: KaneEvent[]): TestmdDigest {
  const d: TestmdDigest = { links: [], done: false };
  const links = new Set<string>();
  let lastFailure: { message: string; stepIndex?: number } | undefined;
  let lastFailedRunEnd: string | undefined;
  const summaries: string[] = [];

  for (const e of events) {
    const f = e.failure as { message?: unknown; step_index?: unknown } | undefined;
    if (f && str(f.message))
      lastFailure = { message: str(f.message) as string, stepIndex: num(f.step_index) };

    if (e.type === 'stream_start') d.cliVersion = str(e.cli_version) ?? d.cliVersion;
    if (e.type === 'run_end') {
      const text = [str(e.one_liner), str(e.reason)].filter(Boolean).join(' | ');
      const summary = str(e.summary) ?? str(e.one_liner);
      if (summary) summaries.push(summary);
      if (e.status === 'failed' && text) lastFailedRunEnd = text;
      const url = str(e.test_url);
      if (url) links.add(url);
    }
    if (e.type === 'test_md_done') {
      d.done = true;
      d.overallStatus = str(e.overall_status);
      d.durationS = num(e.duration_s);
      d.sessionId = str(e.session_id);
      d.shareUrl = str(e.share_url);
      findLinks(e, links);
    }
  }

  if (lastFailure) {
    d.failureText = lastFailure.message;
    d.failureStepIndex = lastFailure.stepIndex;
  } else if (lastFailedRunEnd) {
    d.failureText = lastFailedRunEnd;
  }
  if (summaries.length) d.summaryText = summaries.join('\n');
  d.links = [...links];
  return d;
}
