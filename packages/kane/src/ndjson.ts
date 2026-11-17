import type { KaneEvent } from './types.ts';

/**
 * Line splitter for Kane's NDJSON stdout. Feeds arbitrary chunks, emits one parsed object per
 * complete line. Lines that are not JSON objects are reported as `null` so callers can log them.
 */
export class NdjsonSplitter {
  private buf = '';

  constructor(private readonly onLine: (event: KaneEvent | null, raw: string) => void) {}

  push(chunk: string): void {
    this.buf += chunk;
    let nl = this.buf.indexOf('\n');
    while (nl !== -1) {
      const line = this.buf.slice(0, nl).replace(/\r$/, '');
      this.buf = this.buf.slice(nl + 1);
      this.emit(line);
      nl = this.buf.indexOf('\n');
    }
  }

  /** Flush a trailing partial line (Kane may exit without a final newline). */
  end(): void {
    const rest = this.buf;
    this.buf = '';
    if (rest.trim()) this.emit(rest.replace(/\r$/, ''));
  }

  private emit(line: string): void {
    if (!line.trim()) return;
    this.onLine(parseLine(line), line);
  }
}

export function parseLine(line: string): KaneEvent | null {
  try {
    const value: unknown = JSON.parse(line);
    return value && typeof value === 'object' && !Array.isArray(value) ? (value as KaneEvent) : null;
  } catch {
    return null;
  }
}

export function parseAll(text: string): KaneEvent[] {
  const out: KaneEvent[] = [];
  const s = new NdjsonSplitter((e) => {
    if (e) out.push(e);
  });
  s.push(text);
  s.end();
  return out;
}
