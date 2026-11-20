import fs from 'node:fs';
import path from 'node:path';
import { type Report, loadRequirements, requirementCoverage } from '@saboteur/report';

/** Add requirement coverage to a report from the first requirements.json that exists (no-op if none). */
export function attachRequirements(report: Report, candidates: string[]): Report {
  const file = candidates.find((f) => fs.existsSync(f));
  const reqs = file ? loadRequirements(file) : undefined;
  return reqs ? { ...report, requirements: requirementCoverage(report, reqs) } : report;
}

/** Where an older report's requirements.json lives: next to the app's mutation manifest. */
export function requirementsCandidates(root: string, report: Report): string[] {
  return [
    path.resolve(root, report.app, 'mutations', 'requirements.json'),
    path.resolve(root, 'apps', path.basename(report.app), 'mutations', 'requirements.json'),
  ];
}
