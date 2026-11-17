import { describe, expect, it } from 'vitest';
import { type CartLine, totals } from '../src/lib/cart';
import { formatMoney } from '../src/lib/money';
import { isValidEmail } from '../src/lib/validate';

// The "Worked examples" table in apps/shop/ROUTES.md. If this fails, the app and ROUTES.md disagree.
const cases: { cart: CartLine[]; code: string | null; sub: string; disc: number; ship: string; total: string }[] = [
  { cart: [{ slug: 'canvas-tote', qty: 1 }], code: null, sub: '$24.99', disc: 0, ship: '$5.00', total: '$29.99' },
  {
    cart: [
      { slug: 'canvas-tote', qty: 1 },
      { slug: 'ceramic-mug', qty: 1 },
    ],
    code: null,
    sub: '$39.49',
    disc: 0,
    ship: '$5.00',
    total: '$44.49',
  },
  {
    cart: [
      { slug: 'canvas-tote', qty: 1 },
      { slug: 'linen-apron', qty: 1 },
    ],
    code: null,
    sub: '$59.98',
    disc: 0,
    ship: 'Free',
    total: '$59.98',
  },
  {
    cart: [
      { slug: 'canvas-tote', qty: 1 },
      { slug: 'linen-apron', qty: 1 },
    ],
    code: 'SAVE10',
    sub: '$59.98',
    disc: 600,
    ship: 'Free',
    total: '$53.98',
  },
  { cart: [{ slug: 'canvas-tote', qty: 2 }], code: null, sub: '$49.98', disc: 0, ship: '$5.00', total: '$54.98' },
];

describe('ROUTES.md worked examples', () => {
  for (const c of cases) {
    it(`${c.cart.map((l) => `${l.qty}x ${l.slug}`).join(' + ')} ${c.code ?? ''}`, () => {
      const t = totals(c.cart, c.code);
      expect(formatMoney(t.subtotal)).toBe(c.sub);
      expect(t.discount).toBe(c.disc);
      expect(t.shipping === 0 ? 'Free' : formatMoney(t.shipping)).toBe(c.ship);
      expect(formatMoney(t.total)).toBe(c.total);
    });
  }

  it('email rule', () => {
    expect(isValidEmail('name@domain.tld')).toBe(true);
    expect(isValidEmail('a@')).toBe(false);
    expect(isValidEmail('a@b')).toBe(false);
  });
});
