import { type ReactNode, createContext, useContext, useEffect, useState } from 'react';
import { type CartLine, clampQty } from '../lib/cart';
import { load, save } from '../lib/storage';

const KEY = 'saboteur.cart';

type CartState = { lines: CartLine[]; code: string | null };

type CartApi = CartState & {
  add(slug: string, qty?: number): void;
  setQty(slug: string, qty: number): void;
  remove(slug: string): void;
  applyCode(code: string | null): void;
  clear(): void;
};

const CartContext = createContext<CartApi | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<CartState>(() => load<CartState>(KEY, { lines: [], code: null }));

  useEffect(() => {
    save(KEY, state);
  }, [state]);

  const api: CartApi = {
    ...state,
    add(slug, qty = 1) {
      setState((s) => {
        const existing = s.lines.find((l) => l.slug === slug);
        const lines = existing
          ? s.lines.map((l) => (l.slug === slug ? { ...l, qty: clampQty(l.qty + qty) } : l))
          : [...s.lines, { slug, qty: clampQty(qty) }];
        return { ...s, lines };
      });
    },
    setQty(slug, qty) {
      setState((s) => ({
        ...s,
        lines: s.lines.map((l) => (l.slug === slug ? { ...l, qty: clampQty(qty) } : l)),
      }));
    },
    remove(slug) {
      setState((s) => ({ ...s, lines: s.lines.filter((l) => l.slug !== slug) }));
    },
    applyCode(code) {
      setState((s) => ({ ...s, code }));
    },
    clear() {
      setState({ lines: [], code: null });
    },
  };

  return <CartContext.Provider value={api}>{children}</CartContext.Provider>;
}

export function useCart(): CartApi {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used inside CartProvider');
  return ctx;
}
