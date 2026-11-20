import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { Header } from './components/Header';
import { Account } from './pages/Account';
import { Cart } from './pages/Cart';
import { Checkout } from './pages/Checkout';
import { Home } from './pages/Home';
import { Login } from './pages/Login';
import { OrderConfirmed } from './pages/OrderConfirmed';
import { Product } from './pages/Product';
import { AuthProvider } from './state/auth';
import { CartProvider } from './state/cart';
import './styles.css';

const root = document.getElementById('root');
if (!root) throw new Error('missing #root');

createRoot(root).render(
  <StrictMode>
    {/* BASE_URL is "/" locally; the live demo on GitHub Pages serves each build from a sub-path. */}
    <BrowserRouter basename={import.meta.env.BASE_URL.replace(/\/$/, '') || '/'}>
      <AuthProvider>
        <CartProvider>
          <Header />
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/product/:slug" element={<Product />} />
            <Route path="/cart" element={<Cart />} />
            <Route path="/checkout" element={<Checkout />} />
            <Route path="/order/:id" element={<OrderConfirmed />} />
            <Route path="/login" element={<Login />} />
            <Route path="/account" element={<Account />} />
            <Route
              path="*"
              element={
                <main>
                  <h1>Page not found</h1>
                </main>
              }
            />
          </Routes>
        </CartProvider>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
);
