import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

export default function WelcomePanel() {
  const { user } = useAuth();
  if (!user) return null;
  return <Link className="karaoke-welcome" to="/biblioteca" aria-label={`Abrir el área personal de ${user.name}`}><span>Bienvenido</span><strong>{user.name}</strong></Link>;
}
