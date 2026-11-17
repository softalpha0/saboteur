import { Link } from 'react-router-dom';
import { itemCount } from '../lib/cart';
import { useAuth } from '../state/auth';
import { useCart } from '../state/cart';

export function Header() {
  const { lines } = useCart();
  const { email } = useAuth();
  const count = itemCount(lines);

  return (
    <header className="header">
      <Link to="/" className="brand">
        Saboteur Shop
      </Link>
      <nav className="nav">
        {email ? (
          <Link to="/account" className="who">
            Signed in as {email}
          </Link>
        ) : (
          <Link to="/login">Sign in</Link>
        )}
        <Link to="/cart" className="cart-link" aria-label={`Cart, ${count} items`}>
          Cart <span className="badge">{count}</span>
        </Link>
      </nav>
    </header>
  );
}
