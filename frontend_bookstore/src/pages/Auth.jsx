import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import PasswordField from '../components/PasswordField.jsx';

export default function Auth() {
  const { user, login, register } = useAuth();
  const [mode, setMode] = useState('login');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  if (user) return <Navigate to="/" replace />;

  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setError('');
    const payload = Object.fromEntries(new FormData(event.currentTarget));
    try {
      await (mode === 'login' ? login(payload) : register(payload));
      navigate(location.state?.from || '/');
    } catch (submitError) {
      setError(submitError.message);
    } finally {
      setBusy(false);
    }
  }

  return <main className="auth-page">
    <section className="auth-card">
      <p className="eyebrow">Tu pase de lectura</p>
      <h1>{mode === 'login' ? 'Bienvenido de vuelta' : 'Crea tu cuenta'}</h1>
      <p className="muted">El acceso es gratuito. Tu progreso, favoritos y notas quedan contigo.</p>
      <form onSubmit={submit}>
        {mode === 'register' && <>
          <label>Nombre<input name="name" required minLength="2" autoComplete="name" /></label>
          <label>Alias<input name="username" required minLength="3" maxLength="30" pattern="[a-zA-Z0-9._-]+" autoComplete="username" placeholder="lector_01" /></label>
          <label>Correo<input name="email" type="email" required autoComplete="email" /></label>
        </>}
        {mode === 'login' && <label>Alias o correo<input name="identifier" required autoComplete="username" /></label>}
        <PasswordField autoComplete={mode === 'login' ? 'current-password' : 'new-password'} />
        {mode === 'login' && <Link className="forgot-link" to="/recuperar-contrasena">¿Olvidaste tu contraseña?</Link>}
        {error && <p className="form-error">{error}</p>}
        <button className="button" disabled={busy}>{busy ? 'Un momento…' : mode === 'login' ? 'Iniciar sesión' : 'Registrarme'}</button>
      </form>
      <button className="text-button" onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(''); }}>
        {mode === 'login' ? '¿Aún no tienes cuenta? Regístrate' : 'Ya tengo una cuenta'}
      </button>
    </section>
  </main>;
}
