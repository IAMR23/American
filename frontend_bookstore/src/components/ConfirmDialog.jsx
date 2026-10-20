import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { FiAlertTriangle, FiTrash2, FiX } from 'react-icons/fi';

export default function ConfirmDialog({ open, title = '¿Deseas eliminar este elemento?', itemName = '', onCancel, onConfirm, busy = false }) {
  useEffect(() => {
    if (!open) return undefined;
    const closeWithEscape = (event) => { if (event.key === 'Escape' && !busy) onCancel(); };
    document.addEventListener('keydown', closeWithEscape);
    return () => document.removeEventListener('keydown', closeWithEscape);
  }, [busy, onCancel, open]);

  if (!open) return null;

  return createPortal(<div className="confirm-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !busy) onCancel(); }}>
    <section className="confirm-dialog" role="alertdialog" aria-modal="true" aria-labelledby="confirm-dialog-title" aria-describedby="confirm-dialog-description">
      <button type="button" className="confirm-close" onClick={onCancel} disabled={busy} aria-label="Cerrar"><FiX aria-hidden="true" /></button>
      <div className="confirm-icon"><FiAlertTriangle aria-hidden="true" /></div>
      <p className="eyebrow">Confirmar eliminación</p>
      <h2 id="confirm-dialog-title">{title}</h2>
      {itemName && <strong className="confirm-item">{itemName}</strong>}
      <p id="confirm-dialog-description">Esta acción ya no se puede deshacer.</p>
      <div className="confirm-actions">
        <button type="button" className="secondary" onClick={onCancel} disabled={busy} autoFocus>Cancelar</button>
        <button type="button" className="confirm-danger" onClick={onConfirm} disabled={busy}><FiTrash2 aria-hidden="true" /> {busy ? 'Eliminando…' : 'Sí, eliminar'}</button>
      </div>
    </section>
  </div>, document.body);
}
