import { type FormEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../state/auth';

export function Login() {
  const auth = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  function submit(e: FormEvent) {
    e.preventDefault();
    if (auth.signIn(email, password)) {
      navigate('/account');
    } else {
      setError('Email or password is incorrect');
    }
  }

  return (
    <main className="login">
      <h1>Sign in</h1>
      <p className="hint">Test account: demo@saboteur.shop / sabotage123</p>
      <form onSubmit={submit} noValidate>
        <label>
          Email <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </label>
        <label>
          Password <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
        </label>
        {error && <p role="alert">{error}</p>}
        <button type="submit" className="primary">
          Sign in
        </button>
      </form>
    </main>
  );
}
