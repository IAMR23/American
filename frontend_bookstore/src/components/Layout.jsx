import { useEffect, useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import BackgroundPicker from './BackgroundPicker.jsx';
import WhatsAppButton from './WhatsAppButton.jsx';

export default function Layout() {
  const { user, logout } = useAuth();
  const [theme, setTheme] = useState(() => document.documentElement.dataset.theme || 'dark');

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme;
    localStorage.setItem('book-store-theme', theme);
  }, [theme]);

  const toggleTheme = () => setTheme((current) => current === 'dark' ? 'light' : 'dark');

  return <div className="app-shell">
    <header className="site-header bookstore-header"><nav className="primary-actions">{user?.role === 'admin' && <NavLink className="admin-link" to="/admin">Administración</NavLink>}<NavLink to="/catalogo">Ver todo</NavLink>{user?.role === 'admin' && <NavLink to="/subir-libros">Sugerir libro</NavLink>}</nav><NavLink to="/" className="brand"><span>Book</span>Store</NavLink><div className="session">{user?.role === 'user' && <BackgroundPicker />}<button className="theme-toggle" onClick={toggleTheme} aria-label={`Activar modo ${theme === 'dark' ? 'claro' : 'oscuro'}`} title={`Modo ${theme === 'dark' ? 'claro' : 'oscuro'}`}><span aria-hidden="true">{theme === 'dark' ? '☀' : '☾'}</span><span className="theme-label">{theme === 'dark' ? 'Claro' : 'Oscuro'}</span></button>{user ? <button className="ghost" onClick={logout}>Salir</button> : <><NavLink className="login-link" to="/acceso">Entrar</NavLink><NavLink className="register-link" to="/acceso">Registrar</NavLink></>}</div></header>
    <Outlet />
    <WhatsAppButton />
    <footer><span>Book Store · Biblioteca virtual</span><span>Lectura privada para miembros</span></footer>
  </div>;
}
