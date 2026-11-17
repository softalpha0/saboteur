const CODES: Record<string, number> = {
  SAVE10: 10,
};

export function discountPercent(code: string | null): number | null {
  if (!code) return null;
  const percent = CODES[code.trim().toUpperCase()];
  return percent === undefined ? null : percent;
}

/** Percent off, rounded to the cent, half up. */
export function discountCents(subtotalCents: number, code: string | null): number {
  const percent = discountPercent(code);
  if (percent === null) return 0;
  return Math.floor((subtotalCents * percent + 50) / 100);
}
