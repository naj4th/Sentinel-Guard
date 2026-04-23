import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function LoginPage() {
  const [email, setEmail] = useState('najath@sg.app');
  const [password, setPassword] = useState('password');
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
          <div className="login-logo-icon">
            <svg viewBox="0 0 14 14" style={{width:18,height:18,fill:'var(--accent)'}}>
              <path d="M7 1L1 4v4c0 3 2.5 5 6 6 3.5-1 6-3 6-6V4L7 1z"/>
            </svg>
          </div>
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
        <div style={{marginTop:16, padding:12, background:'var(--bg3)', borderRadius:7, fontSize:11, fontFamily:'var(--mono)', color:'var(--text3)'}}>
          Mock: admin = najath@sg.app | standard = ravindu@sg.app
        </div>
      </div>
    </div>
  );
}
