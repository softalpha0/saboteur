import { type FormEvent, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { findProduct } from '../data/products';
import { totals } from '../lib/cart';
import { formatMoney } from '../lib/money';
import { isValidEmail } from '../lib/validate';
import { useCart } from '../state/cart';
import { newOrderId, saveOrder } from '../state/orders';

export function Checkout() {
  const cart = useCart();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [errors, setErrors] = useState<string[]>([]);

  if (cart.lines.length === 0) {
    return (
      <main>
        <h1>Checkout</h1>
        <p>Your cart is empty</p>
        <Link to="/">Back to products</Link>
      </main>
    );
  }

  const t = totals(cart.lines, cart.code);

  function placeOrder(e: FormEvent) {
    e.preventDefault();
    const found: string[] = [];
    if (!name.trim()) found.push('Enter your full name');
    if (!isValidEmail(email)) found.push('Enter a valid email address');
    if (!address.trim()) found.push('Enter your address');
    setErrors(found);
    if (found.length > 0) return;

    const id = newOrderId();
    saveOrder({ id, name, email, address, lines: cart.lines, code: cart.code, totals: t });
    cart.clear();
    navigate(`/order/${id}`);
  }

  return (
    <main className="checkout">
      <h1>Checkout</h1>
      <form onSubmit={placeOrder} noValidate>
        <label>
          Full name <input value={name} onChange={(e) => setName(e.target.value)} />
        </label>
        <label>
          Email <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </label>
        <label>
          Address <input value={address} onChange={(e) => setAddress(e.target.value)} />
        </label>
        {errors.length > 0 && (
          <ul className="errors" role="alert">
            {errors.map((msg) => (
              <li key={msg}>{msg}</li>
            ))}
          </ul>
        )}
        <button type="submit" className="primary">
          Place order
        </button>
      </form>

      <section className="order-summary">
        <h2>Order summary</h2>
        <ul>
          {cart.lines.map((l) => (
            <li key={l.slug}>
              {l.qty} × {findProduct(l.slug)?.name}
            </li>
          ))}
        </ul>
        <p className="total">Total: {formatMoney(t.total)}</p>
      </section>
    </main>
  );
}
