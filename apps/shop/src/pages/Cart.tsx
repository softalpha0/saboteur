import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { QtyStepper } from '../components/QtyStepper';
import { findProduct } from '../data/products';
import { lineTotal, totals } from '../lib/cart';
import { discountPercent } from '../lib/discount';
import { formatMoney } from '../lib/money';
import { useCart } from '../state/cart';

export function Cart() {
  const cart = useCart();
  const navigate = useNavigate();
  const [codeInput, setCodeInput] = useState(cart.code ?? '');
  const [codeMessage, setCodeMessage] = useState<string | null>(null);

  if (cart.lines.length === 0) {
    return (
      <main>
        <h1>Your cart</h1>
        <p>Your cart is empty</p>
        <Link to="/">Back to products</Link>
      </main>
    );
  }

  const t = totals(cart.lines, cart.code);

  function apply() {
    const code = codeInput.trim().toUpperCase();
    if (discountPercent(code) === null) {
      cart.applyCode(null);
      setCodeMessage('Code not recognised');
    } else {
      cart.applyCode(code);
      setCodeMessage(`${code} applied`);
    }
  }

  return (
    <main>
      <h1>Your cart</h1>
      <table className="lines">
        <thead>
          <tr>
            <th>Item</th>
            <th>Unit price</th>
            <th>Quantity</th>
            <th>Line total</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {cart.lines.map((line) => {
            const p = findProduct(line.slug);
            if (!p) return null;
            return (
              <tr key={line.slug}>
                <td>{p.name}</td>
                <td>{formatMoney(p.priceCents)}</td>
                <td>
                  <QtyStepper value={line.qty} onChange={(n) => cart.setQty(line.slug, n)} label={p.name} />
                </td>
                <td>{formatMoney(lineTotal(line))}</td>
                <td>
                  <button type="button" onClick={() => cart.remove(line.slug)} aria-label={`Remove ${p.name}`}>
                    Remove
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <form
        className="discount"
        onSubmit={(e) => {
          e.preventDefault();
          apply();
        }}
      >
        <label>
          Discount code <input value={codeInput} onChange={(e) => setCodeInput(e.target.value)} />
        </label>
        <button type="submit">Apply</button>
        {codeMessage && <p role="status">{codeMessage}</p>}
      </form>

      <dl className="summary">
        <dt>Subtotal</dt>
        <dd>{formatMoney(t.subtotal)}</dd>
        <dt>Discount</dt>
        <dd>{t.discount > 0 ? `−${formatMoney(t.discount)}` : '—'}</dd>
        <dt>Shipping</dt>
        <dd>{t.shipping > 0 ? formatMoney(t.shipping) : 'Free'}</dd>
        <dt className="total">Total</dt>
        <dd className="total">{formatMoney(t.total)}</dd>
      </dl>

      <button type="button" className="primary" onClick={() => navigate('/checkout')}>
        Checkout
      </button>
    </main>
  );
}
