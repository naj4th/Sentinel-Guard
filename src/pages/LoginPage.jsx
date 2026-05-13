import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { signIn } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) { setError('Please enter email and password.'); return; }
    setError(''); setLoading(true);
    try {
      await signIn(email, password);
      navigate('/dashboard');
    } catch {
      setError('Invalid credentials. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-wrap">
      <div className="login-card">
        <div className="login-logo">
          <img src="/logo.png" alt="Sentinel Guard" style={{ width: 64, height: 64, objectFit: 'contain', flexShrink: 0 }} />
          <span className="login-logo-name">Sentinel Guard</span>
        </div>
        <div className="login-title">Sign in</div>
        <div className="login-sub">Access the IoT security dashboard</div>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Email address</label>
            <input className="form-input" type="email" value={email}
              onChange={e => setEmail(e.target.value)} placeholder="your@email.com" />
          </div>
          <div className="form-group">
            <label className="form-label">Password</label>
            <input className="form-input" type="password" value={password}
              onChange={e => setPassword(e.target.value)} placeholder="••••••••" />
          </div>
          {error && <div className="form-error">{error}</div>}
          <button className="form-btn" type="submit" disabled={loading}>
            {loading ? 'Signing in…' : 'Sign in with Firebase Auth'}
          </button>
        </form>
        <div className="form-note">Role assigned automatically on authentication</div>
      </div>
    </div>
  );
}
