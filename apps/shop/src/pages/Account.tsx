import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../state/auth';

export function Account() {
  const auth = useAuth();
  const navigate = useNavigate();

  if (!auth.email) {
    return (
      <main>
        <h1>My account</h1>
        <p>You are not signed in.</p>
        <Link to="/login">Sign in</Link>
      </main>
    );
  }

  return (
    <main>
      <h1>My account</h1>
      <p>Signed in as {auth.email}</p>
      <button
        type="button"
        onClick={() => {
          auth.signOut();
          navigate('/');
        }}
      >
        Sign out
      </button>
    </main>
  );
}
