import { findProduct } from '../data/products';
import { discountCents } from './discount';

export type CartLine = { slug: string; qty: number };

export const MIN_QTY = 1;
export const MAX_QTY = 9;
export const SHIPPING_CENTS = 500;
export const FREE_SHIPPING_FROM_CENTS = 5000;

export type Totals = {
  subtotal: number;
  discount: number;
  shipping: number;
  total: number;
};

export function lineTotal(line: CartLine): number {
  const product = findProduct(line.slug);
  return product ? product.priceCents * line.qty : 0;
}

export function subtotal(lines: CartLine[]): number {
  let sum = 0;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line) sum += lineTotal(line);
  }
  return sum;
}

export function shipping(afterDiscountCents: number, hasItems: boolean): number {
  if (!hasItems) return 0;
  return afterDiscountCents < FREE_SHIPPING_FROM_CENTS ? SHIPPING_CENTS : 0;
}

export function totals(lines: CartLine[], code: string | null): Totals {
  const sub = subtotal(lines);
  const discount = discountCents(sub, code);
  const ship = shipping(sub - discount, lines.length > 0);
  return { subtotal: sub, discount, shipping: ship, total: sub - discount + ship };
}

export function itemCount(lines: CartLine[]): number {
  return lines.reduce((n, l) => n + l.qty, 0);
}

export function clampQty(qty: number): number {
  return Math.min(MAX_QTY, Math.max(MIN_QTY, qty));
}
