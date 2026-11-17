import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { QtyStepper } from '../components/QtyStepper';
import { findProduct } from '../data/products';
import { formatMoney } from '../lib/money';
import { useCart } from '../state/cart';

export function Product() {
  const { slug = '' } = useParams();
  const product = findProduct(slug);
  const { add } = useCart();
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);

  if (!product) {
    return (
      <main>
        <h1>Product not found</h1>
        <Link to="/">Back to products</Link>
      </main>
    );
  }

  return (
    <main className="product">
      <h1>{product.name}</h1>
      <p className="price">{formatMoney(product.priceCents)}</p>
      <p className="stock">{product.inStock ? 'In stock' : 'Out of stock'}</p>
      <p>{product.blurb}</p>
      <QtyStepper value={qty} onChange={setQty} label={product.name} />
      <button
        type="button"
        disabled={!product.inStock}
        onClick={() => {
          add(product.slug, qty);
          setAdded(true);
        }}
      >
        Add to cart
      </button>
      {added && <p role="status">Added to cart</p>}
    </main>
  );
}
