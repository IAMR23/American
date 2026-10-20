import { useEffect, useState } from 'react';
import { FiCheck, FiImage } from 'react-icons/fi';
import { api } from '../lib/api.js';

export default function BackgroundPicker() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState([]);
  const [selectedId, setSelectedId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return undefined;
    let active = true;
    setLoading(true); setError('');
    api('/catalog/backgrounds')
      .then((data) => { if (active) { setItems(data.items || []); setSelectedId(String(data.selectedId || '')); } })
      .catch((loadError) => { if (active) setError(loadError.message); })
      .finally(() => { if (active) setLoading(false); });
    const closeOnEscape = (event) => { if (event.key === 'Escape') setOpen(false); };
    document.addEventListener('keydown', closeOnEscape);
    return () => { active = false; document.removeEventListener('keydown', closeOnEscape); };
  }, [open]);

  async function selectBackground(id) {
    try {
      setError('');
      const data = await api(`/catalog/backgrounds/${id}/select`, { method: 'PUT' });
      setSelectedId(String(data.selectedId));
      window.dispatchEvent(new CustomEvent('book-store-background-changed', { detail: data.background }));
    } catch (selectError) { setError(selectError.message); }
  }

  return <>
    <button type="button" className="background-picker-trigger" onClick={() => setOpen(true)} aria-label="Cambiar fondo" title="Cambiar fondo"><FiImage aria-hidden="true" /><span>Fondo</span></button>
    {open && <div className="background-picker-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setOpen(false); }}>
      <section className="background-picker-modal" role="dialog" aria-modal="true" aria-labelledby="background-picker-title">
        <button type="button" className="background-picker-close" onClick={() => setOpen(false)} aria-label="Cerrar selector de fondos" title="Cerrar" autoFocus><span aria-hidden="true">×</span></button>
        <div className="background-picker-heading"><div><p className="eyebrow">Preferencia personal</p><h2 id="background-picker-title">Elige tu fondo</h2></div></div>
        <p>Este cambio se guardará únicamente para tu cuenta.</p>
        {error && <p className="form-error">{error}</p>}
        {loading ? <div className="background-picker-state">Cargando fondos…</div> : <div className="background-picker-grid">{items.map((item) => {
          const selected = String(item._id) === selectedId;
          return <button type="button" className={selected ? 'selected' : ''} key={item._id} onClick={() => selectBackground(item._id)} disabled={selected}><img src={item.image?.thumbnail || item.image?.detail} alt={`Fondo ${item.name}`} /><span>{item.name}</span>{selected && <strong><FiCheck aria-hidden="true" /> Activo</strong>}</button>;
        })}{!items.length && <div className="background-picker-state">Todavía no hay fondos disponibles.</div>}</div>}
        <div className="background-picker-footer"><button type="button" onClick={() => setOpen(false)}>Cerrar</button></div>
      </section>
    </div>}
  </>;
}
