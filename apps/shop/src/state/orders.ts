import type { CartLine, Totals } from '../lib/cart';
import { load, save } from '../lib/storage';

const KEY = 'saboteur.orders';

export type Order = {
  id: string;
  name: string;
  email: string;
  address: string;
  lines: CartLine[];
  code: string | null;
  totals: Totals;
};

export function newOrderId(): string {
  const digits = Math.floor(Math.random() * 1_000_000)
    .toString()
    .padStart(6, '0');
  return `SAB-${digits}`;
}

export function saveOrder(order: Order): void {
  const all = load<Record<string, Order>>(KEY, {});
  all[order.id] = order;
  save(KEY, all);
}

export function getOrder(id: string): Order | undefined {
  return load<Record<string, Order>>(KEY, {})[id];
}
