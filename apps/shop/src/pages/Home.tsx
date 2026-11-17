import { Link } from 'react-router-dom';
import { PRODUCTS } from '../data/products';
import { formatMoney } from '../lib/money';
import { useCart } from '../state/cart';

export function Home() {
  const { add } = useCart();

  return (
    <main>
      <h1>Products</h1>
      <ul className="grid">
        {PRODUCTS.map((p) => (
          <li key={p.slug} className="card">
            <Link to={`/product/${p.slug}`} className="card-name">
              {p.name}
            </Link>
            <p className="price">{formatMoney(p.priceCents)}</p>
            {p.inStock ? (
              <button type="button" onClick={() => add(p.slug)} aria-label={`Add ${p.name} to cart`}>
                Add to cart
              </button>
            ) : (
              <>
                <p className="oos">Out of stock</p>
                <button type="button" disabled aria-label={`${p.name} is out of stock`}>
                  Add to cart
                </button>
              </>
            )}
          </li>
        ))}
      </ul>
    </main>
  );
}
