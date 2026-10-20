import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { api } from '../lib/api.js';

const AuthContext = createContext(null);
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null); const [loading, setLoading] = useState(true);
  useEffect(() => { api('/auth/me').then((data) => setUser(data.user)).catch(() => setUser(null)).finally(() => setLoading(false)); }, []);
  const value = useMemo(() => ({ user, loading, async login(payload) { const data = await api('/auth/login', { method: 'POST', body: payload }); setUser(data.user); }, async register(payload) { const data = await api('/auth/register', { method: 'POST', body: payload }); setUser(data.user); }, async logout() { await api('/auth/logout', { method: 'POST' }); setUser(null); } }), [user, loading]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
export const useAuth = () => useContext(AuthContext);
