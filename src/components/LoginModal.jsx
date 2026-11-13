import { useState } from 'react';
import { useStore } from '../store';

export default function LoginModal() {
  const loginModalOpen = useStore((s) => s.loginModalOpen);
  const setLoginModalOpen = useStore((s) => s.setLoginModalOpen);
  const setAuth = useStore((s) => s.setAuth);

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (!loginModalOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Error de autenticación');
      }
      setAuth(data.user, data.token);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={() => setLoginModalOpen(false)}>
      <div className="login-modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="login-modal-head">
          <div>
            <span className="eyebrow">ACCESO COMERCIAL & ADMINISTRATIVO</span>
            <h3>Prados de Terranova</h3>
          </div>
          <button
            type="button"
            className="modal-close-btn"
            onClick={() => setLoginModalOpen(false)}
          >
            ✕
          </button>
        </div>

        <p className="login-sub">
          Ingresa con tus credenciales conectadas a MySQL para gestionar la compra y financiación de lotes, abonos de cartera y el editor satelital del loteo en Yopal.
        </p>

        <form onSubmit={handleSubmit} className="login-form">
          <label>
            <span>Usuario o Correo Electrónico</span>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Usuario o correo electrónico"
              required
            />
          </label>

          <label>
            <span>Contraseña</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
          </label>

          {error && <div className="login-error">{error}</div>}

          <button type="submit" className="btn-primary full" disabled={loading}>
            {loading ? 'Verificando en MySQL...' : 'Ingresar al Panel de Control'}
          </button>
        </form>
      </div>
    </div>
  );
}
