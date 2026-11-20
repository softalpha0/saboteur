import fs from 'node:fs';
import type { Report, Verdict } from './schema.ts';

/**
 * Requirement coverage: which rules of the app's spec would break without any test noticing.
 * Each requirement lists the planted bugs that break it (mutations/requirements.json, next to the manifest).
 * A requirement is "silent" if any of its bugs slipped through, "guarded" if Kane caught all of them,
 * "unknown" if a verdict was an error, and "no bug planted" if no bug in the run targets it.
 */

export type Requirement = { id: string; text: string; source?: string; mutants: string[] };

export type CoverageStatus = 'silent' | 'guarded' | 'unknown' | 'untested';

export type RequirementRow = {
  id: string;
  text: string;
  source?: string;
  mutants: string[];
  before: CoverageStatus;
  after: CoverageStatus;
};

export function loadRequirements(file: string): Requirement[] | undefined {
  if (!fs.existsSync(file)) return undefined;
  const raw = JSON.parse(fs.readFileSync(file, 'utf8')) as { requirements?: Requirement[] };
  if (!Array.isArray(raw.requirements)) throw new Error(`${file}: "requirements" must be an array`);
  for (const r of raw.requirements) {
    if (!r.id || !r.text || !Array.isArray(r.mutants))
      throw new Error(`${file}: every requirement needs id, text and mutants[]`);
  }
  return raw.requirements;
}

function status(verdicts: Verdict[]): CoverageStatus {
  if (!verdicts.length) return 'untested';
  if (verdicts.includes('survived')) return 'silent';
  if (verdicts.every((v) => v === 'killed')) return 'guarded';
  return 'unknown';
}

export function requirementCoverage(report: Report, reqs: Requirement[]): RequirementRow[] {
  const byId = new Map(report.mutants.map((m) => [m.id, m]));
  return reqs.map((r) => {
    const ms = r.mutants.map((id) => byId.get(id)).filter((m) => m !== undefined);
    return {
      id: r.id,
      text: r.text,
      source: r.source,
      mutants: ms.map((m) => m.id),
      before: status(ms.map((m) => m.verdictBefore)),
      after: status(ms.map((m) => m.verdictAfter)),
    };
  });
}

export function coverageSummary(rows: RequirementRow[]) {
  const planted = rows.filter((r) => r.before !== 'untested');
  return {
    total: rows.length,
    planted: planted.length,
    silentBefore: planted.filter((r) => r.before === 'silent').length,
    silentAfter: planted.filter((r) => r.after === 'silent').length,
    untested: rows.length - planted.length,
  };
}
