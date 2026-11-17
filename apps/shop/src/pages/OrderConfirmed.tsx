import { Link, useParams } from 'react-router-dom';
import { findProduct } from '../data/products';
import { formatMoney } from '../lib/money';
import { getOrder } from '../state/orders';

export function OrderConfirmed() {
  const { id = '' } = useParams();
  const order = getOrder(id);

  if (!order) {
    return (
      <main>
        <h1>Order not found</h1>
        <Link to="/">Back to products</Link>
      </main>
    );
  }

  return (
    <main className="confirmed">
      <h1>Thank you for your order</h1>
      <p className="order-number">Order number: {order.id}</p>
      <ul>
        {order.lines.map((l) => (
          <li key={l.slug}>
            {l.qty} × {findProduct(l.slug)?.name}
          </li>
        ))}
      </ul>
      <p className="total">Total paid: {formatMoney(order.totals.total)}</p>
      <Link to="/">Continue shopping</Link>
    </main>
  );
}
