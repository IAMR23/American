import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api.js';

export default function ForgotPassword() {
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(event) {
    event.preventDefault(); setBusy(true); setError('');
    try {
      const data = await api('/auth/forgot-password', { method: 'POST', body: Object.fromEntries(new FormData(event.currentTarget)) });
      setMessage(data.message);
    } catch (submitError) { setError(submitError.message); }
    finally { setBusy(false); }
  }

  return <main className="auth-page"><section className="auth-card">
    <p className="eyebrow">Recuperación segura</p><h1>Recupera tu acceso</h1>
    <p className="muted">Ingresa tu alias o correo. Enviaremos un enlace temporal al correo asociado con tu cuenta.</p>
    {message ? <><p className="notice">{message}</p><Link className="button" to="/acceso">Volver al acceso</Link></> : <form onSubmit={submit}><label>Alias o correo<input name="identifier" required autoComplete="username" /></label>{error && <p className="form-error">{error}</p>}<button className="button" disabled={busy}>{busy ? 'Enviando…' : 'Enviar enlace'}</button></form>}
  </section></main>;
}
