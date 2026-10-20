import { useState } from 'react';
import { FiEye, FiEyeOff } from 'react-icons/fi';

export default function PasswordField({ label = 'Contraseña', name = 'password', autoComplete = 'current-password', minLength = 10 }) {
  const [visible, setVisible] = useState(false);
  return <label>{label}<span className="password-field"><input name={name} type={visible ? 'text' : 'password'} required minLength={minLength} autoComplete={autoComplete} /><button type="button" onClick={() => setVisible((current) => !current)} aria-label={visible ? 'Ocultar contraseña' : 'Mostrar contraseña'} title={visible ? 'Ocultar contraseña' : 'Mostrar contraseña'}>{visible ? <FiEyeOff aria-hidden="true" /> : <FiEye aria-hidden="true" />}</button></span></label>;
}
