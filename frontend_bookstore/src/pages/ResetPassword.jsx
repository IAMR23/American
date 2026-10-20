import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import PasswordField from '../components/PasswordField.jsx';
import { api } from '../lib/api.js';

export default function ResetPassword() {
  const [params] = useSearchParams(); const token = params.get('token') ?? '';
  const [message, setMessage] = useState(''); const [error, setError] = useState(''); const [busy, setBusy] = useState(false);
  async function submit(event) {
    event.preventDefault(); setBusy(true); setError('');
    const values = Object.fromEntries(new FormData(event.currentTarget));
    if (values.password !== values.confirmPassword) { setError('Las contraseñas no coinciden.'); setBusy(false); return; }
    try { const data = await api('/auth/reset-password', { method: 'POST', body: { token, password: values.password } }); setMessage(data.message); }
    catch (submitError) { setError(submitError.message); }
    finally { setBusy(false); }
  }
  return <main className="auth-page"><section className="auth-card"><p className="eyebrow">Nueva contraseña</p><h1>Protege tu cuenta</h1>{!token ? <p className="form-error">El enlace de recuperación está incompleto.</p> : message ? <><p className="notice">{message}</p><Link className="button" to="/acceso">Iniciar sesión</Link></> : <form onSubmit={submit}><PasswordField label="Nueva contraseña" autoComplete="new-password" /><PasswordField label="Confirmar contraseña" name="confirmPassword" autoComplete="new-password" />{error && <p className="form-error">{error}</p>}<button className="button" disabled={busy}>{busy ? 'Actualizando…' : 'Guardar contraseña'}</button></form>}</section></main>;
}
