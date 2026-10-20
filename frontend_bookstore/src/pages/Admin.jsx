import { useEffect, useRef, useState } from 'react';
import { FiClipboard, FiEdit2, FiSave, FiX } from 'react-icons/fi';
import ConfirmDialog from '../components/ConfirmDialog.jsx';
import PasswordField from '../components/PasswordField.jsx';
import { api } from '../lib/api.js';

const sections = ['books', 'authors', 'genres', 'users', 'backgrounds', 'moderation'];
const labels = { books: 'Libros', authors: 'Autores', genres: 'Géneros', users: 'Usuarios', backgrounds: 'Fondos', moderation: 'Moderación' };
const emptyFilters = { q: '', author: '', genre: '', year: '' };

function MultiSelector({ name, label, hint, options, initialSelected = [] }) {
  const [selected, setSelected] = useState(() => initialSelected.map((value) => value?._id || value));
  const selectedOptions = options.filter((option) => selected.includes(option._id));
  const toggle = (id) => setSelected((current) => current.includes(id) ? current.filter((value) => value !== id) : [...current, id]);

  return <div className="multi-field">
    <span className="field-label">{label}</span>
    <small>{hint}</small>
    <details className="multi-selector">
      <summary>{selectedOptions.length ? <span className="selected-tags">{selectedOptions.map((option) => <span key={option._id}>{option.name}</span>)}</span> : <span className="multi-placeholder">Selecciona uno o más</span>}</summary>
      <div className="multi-options">
        {options.length ? options.map((option) => <label key={option._id}><input type="checkbox" checked={selected.includes(option._id)} onChange={() => toggle(option._id)} /><span>{option.name}</span></label>) : <p>No hay opciones activas. Créelas primero en su sección.</p>}
      </div>
    </details>
    <input type="hidden" name={name} value={JSON.stringify(selected)} />
  </div>;
}

function BookForm({ authors, genres, coverFile, setCoverFile, onSubmit, initial, onCancel }) {
  const [preview, setPreview] = useState('');
  const coverInputRef = useRef(null);

  useEffect(() => {
    if (!coverFile) { setPreview(''); return undefined; }
    const objectUrl = URL.createObjectURL(coverFile);
    setPreview(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [coverFile]);

  useEffect(() => {
    const pasteImage = (event) => {
      const item = [...(event.clipboardData?.items ?? [])].find((clipboardItem) => clipboardItem.type.startsWith('image/'));
      if (!item) return;
      const image = item.getAsFile();
      if (image) { event.preventDefault(); setCoverFile(image); }
    };
    document.addEventListener('paste', pasteImage);
    return () => document.removeEventListener('paste', pasteImage);
  }, [setCoverFile]);

  return <form className="admin-form admin-form-fields" onSubmit={onSubmit}>
    <div className="form-heading"><h3>{initial ? 'Editar libro' : 'Nuevo libro'}</h3><p>Completa la información editorial y los archivos del libro.</p></div>
    <label>Título<input name="title" required maxLength="250" defaultValue={initial?.title || ''} /></label>
    <label>Slug <small>Opcional; se genera desde el título</small><input name="slug" defaultValue={initial?.slug || ''} /></label>
    <label className="wide">Sinopsis<textarea name="synopsis" required rows="5" maxLength="10000" defaultValue={initial?.synopsis || ''} /></label>
    <MultiSelector name="authors" label="Autores" hint="Selecciona uno o varios autores registrados." options={authors.filter((author) => author.active || initial?.authors?.some((value) => (value?._id || value) === author._id))} initialSelected={initial?.authors} />
    <MultiSelector name="genres" label="Géneros" hint="Selecciona uno o varios géneros registrados." options={genres.filter((genre) => genre.active || initial?.genres?.some((value) => (value?._id || value) === genre._id))} initialSelected={initial?.genres} />
    <label>Año de publicación<input name="publicationYear" type="number" min="0" max="3000" defaultValue={initial?.publicationYear || ''} /></label>
    <label>Estado<select name="status" defaultValue={initial?.status || 'draft'}><option value="draft">Borrador</option><option value="published">Publicado</option><option value="archived">Archivado</option></select></label>
    <label className="wide">Enlace del PDF en Dropbox<input name="pdfRef" type="url" placeholder="https://www.dropbox.com/..." defaultValue={initial?.pdfRef || ''} /></label>
    <label className="wide">Portada <small>Selecciona un archivo o copia una imagen y presiona Ctrl+V</small><input ref={coverInputRef} name="cover" type="file" accept="image/png,image/jpeg,image/webp,image/avif" onChange={(event) => setCoverFile(event.target.files?.[0] ?? null)} /></label>
    <div className={`cover-paste-zone wide ${preview ? 'has-image' : ''}`} tabIndex="0" role="button" aria-label="Pega aquí una portada desde el portapapeles">
      {preview ? <><img src={preview} alt="Previsualización de la portada" /><div><strong>Portada lista</strong><span>{coverFile.name || 'Imagen pegada desde el portapapeles'}</span></div><button type="button" onClick={() => { setCoverFile(null); if (coverInputRef.current) coverInputRef.current.value = ''; }} aria-label="Quitar portada"><FiX aria-hidden="true" /></button></> : <><FiClipboard aria-hidden="true" /><div><strong>Pega la portada aquí</strong><span>Copia una imagen y presiona Ctrl+V</span></div></>}
    </div>
    {initial?.cover?.thumbnail && !preview && <p className="wide current-file">La portada actual se conservará salvo que selecciones o pegues otra.</p>}
    <div className="form-actions wide"><button type="submit"><FiSave aria-hidden="true" /> {initial ? 'Guardar cambios' : 'Crear libro'}</button>{initial && <button type="button" className="secondary" onClick={onCancel}><FiX aria-hidden="true" /> Cancelar</button>}</div>
  </form>;
}

function AuthorForm({ onSubmit, initial, onCancel }) {
  return <form className="admin-form admin-form-fields" onSubmit={onSubmit}>
    <div className="form-heading"><h3>{initial ? 'Editar autor' : 'Nuevo autor'}</h3><p>Registra los datos que aparecerán en la ficha del libro.</p></div>
    <label>Nombre completo<input name="name" required maxLength="200" defaultValue={initial?.name || ''} /></label>
    <label>Estado<select name="active" defaultValue={String(initial?.active ?? true)}><option value="true">Activo</option><option value="false">Inactivo</option></select></label>
    <label className="wide">Biografía <small>Opcional</small><textarea name="biography" rows="5" maxLength="5000" defaultValue={initial?.biography || ''} /></label>
    <div className="form-actions wide"><button type="submit"><FiSave aria-hidden="true" /> {initial ? 'Guardar cambios' : 'Crear autor'}</button>{initial && <button type="button" className="secondary" onClick={onCancel}><FiX aria-hidden="true" /> Cancelar</button>}</div>
  </form>;
}

function GenreForm({ onSubmit, initial, onCancel }) {
  return <form className="admin-form admin-form-fields" onSubmit={onSubmit}>
    <div className="form-heading"><h3>{initial ? 'Editar género' : 'Nuevo género'}</h3><p>Organiza el catálogo en categorías fáciles de explorar.</p></div>
    <label>Nombre<input name="name" required maxLength="120" defaultValue={initial?.name || ''} /></label>
    <label>Slug <small>Opcional; se genera desde el nombre</small><input name="slug" defaultValue={initial?.slug || ''} /></label>
    <label>Estado<select name="active" defaultValue={String(initial?.active ?? true)}><option value="true">Activo</option><option value="false">Inactivo</option></select></label>
    <label className="wide">Descripción <small>Opcional</small><textarea name="description" rows="4" maxLength="2000" defaultValue={initial?.description || ''} /></label>
    <div className="form-actions wide"><button type="submit"><FiSave aria-hidden="true" /> {initial ? 'Guardar cambios' : 'Crear género'}</button>{initial && <button type="button" className="secondary" onClick={onCancel}><FiX aria-hidden="true" /> Cancelar</button>}</div>
  </form>;
}

function UserForm({ onSubmit }) {
  return <form className="admin-form admin-form-fields" onSubmit={onSubmit}>
    <div className="form-heading"><h3>Nuevo usuario</h3><p>Solo un administrador puede crear otra cuenta con rol de administrador.</p></div>
    <label>Nombre completo<input name="name" required minLength="2" maxLength="100" autoComplete="name" /></label>
    <label>Alias<input name="username" required minLength="3" maxLength="30" pattern="[a-zA-Z0-9._-]+" autoComplete="username" /></label>
    <label>Correo electrónico<input name="email" type="email" required autoComplete="email" /></label>
    <PasswordField autoComplete="new-password" />
    <label>Rol<select name="role" defaultValue="user"><option value="user">Usuario</option><option value="admin">Administrador</option></select></label>
    <label>Estado<select name="status" defaultValue="active"><option value="active">Activo</option><option value="suspended">Suspendido</option></select></label>
    <div className="form-actions wide"><button type="submit">Crear usuario</button></div>
  </form>;
}

function BackgroundForm({ onSubmit, imageFile, setImageFile }) {
  const [preview, setPreview] = useState('');
  const imageInputRef = useRef(null);

  useEffect(() => {
    if (!imageFile) { setPreview(''); return undefined; }
    const objectUrl = URL.createObjectURL(imageFile);
    setPreview(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [imageFile]);

  useEffect(() => {
    const pasteImage = (event) => {
      const item = [...(event.clipboardData?.items ?? [])].find((clipboardItem) => clipboardItem.type.startsWith('image/'));
      if (!item) return;
      const image = item.getAsFile();
      if (image) { event.preventDefault(); setImageFile(image); }
    };
    document.addEventListener('paste', pasteImage);
    return () => document.removeEventListener('paste', pasteImage);
  }, [setImageFile]);

  return <form className="admin-form admin-form-fields" onSubmit={onSubmit}>
    <div className="form-heading"><h3>Nuevo fondo</h3><p>La imagen se convertirá a WebP y se optimizará automáticamente.</p></div>
    <label>Nombre del fondo<input name="name" required maxLength="150" /></label>
    <label>Imagen <small>Selecciona un archivo o pega una imagen con Ctrl+V</small><input ref={imageInputRef} name="image" type="file" accept="image/png,image/jpeg,image/webp,image/avif" onChange={(event) => setImageFile(event.target.files?.[0] ?? null)} /></label>
    <div className={`cover-paste-zone background-paste-zone wide ${preview ? 'has-image' : ''}`} tabIndex="0" role="button" aria-label="Pega aquí el fondo desde el portapapeles">
      {preview ? <><img src={preview} alt="Previsualización del fondo" /><div><strong>Fondo listo para subir</strong><span>{imageFile.name || 'Imagen pegada desde el portapapeles'}</span></div><button type="button" onClick={() => { setImageFile(null); if (imageInputRef.current) imageInputRef.current.value = ''; }} aria-label="Quitar fondo"><FiX aria-hidden="true" /></button></> : <><FiClipboard aria-hidden="true" /><div><strong>Pega el fondo aquí</strong><span>Copia una imagen y presiona Ctrl+V para previsualizarla</span></div></>}
    </div>
    <div className="form-actions wide"><button type="submit">Subir fondo</button></div>
  </form>;
}

export default function Admin() {
  const [section, setSection] = useState('books');
  const [data, setData] = useState([]);
  const [message, setMessage] = useState('');
  const [authors, setAuthors] = useState([]);
  const [genres, setGenres] = useState([]);
  const [moderationType, setModerationType] = useState('comments');
  const [loading, setLoading] = useState(true);
  const [bookCover, setBookCover] = useState(null);
  const [backgroundFile, setBackgroundFile] = useState(null);
  const [formVersion, setFormVersion] = useState(0);
  const [editing, setEditing] = useState(null);
  const [filterDraft, setFilterDraft] = useState(emptyFilters);
  const [filters, setFilters] = useState(emptyFilters);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 1 });
  const [activeBackgroundId, setActiveBackgroundId] = useState('');
  const [pendingDelete, setPendingDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: '10' });
      if (section === 'moderation') params.set('type', moderationType);
      if (['books', 'authors', 'genres', 'users'].includes(section) && filters.q) params.set('q', filters.q);
      if (section === 'books') {
        if (filters.author) params.set('author', filters.author);
        if (filters.genre) params.set('genre', filters.genre);
        if (filters.year) params.set('year', filters.year);
      }
      const endpoint = `/admin/${section === 'moderation' ? 'moderation' : section}?${params}`;
      const result = await api(endpoint);
      setData(result.items || []);
      if (section === 'backgrounds') setActiveBackgroundId(String(result.setting?.value?.backgroundId?._id || result.setting?.value?.backgroundId || ''));
      const nextPagination = result.pagination || { page: 1, limit: 10, total: result.items?.length || 0, totalPages: 1 };
      setPagination(nextPagination);
      const lastPage = Math.max(1, nextPagination.totalPages || 1);
      if (page > lastPage) setPage(lastPage);
      if (section === 'books') {
        const [authorData, genreData] = await Promise.all([api('/admin/authors?limit=100'), api('/admin/genres?limit=100')]);
        setAuthors(authorData.items); setGenres(genreData.items);
      }
    } catch (error) { setMessage(error.message); }
    finally { setLoading(false); }
  }

  useEffect(() => { load(); }, [section, moderationType, page, filters]);

  useEffect(() => {
    if (!editing) return undefined;
    const previousOverflow = document.body.style.overflow;
    const closeOnEscape = (event) => { if (event.key === 'Escape') cancelEditing(); };
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', closeOnEscape);
    return () => { document.body.style.overflow = previousOverflow; document.removeEventListener('keydown', closeOnEscape); };
  }, [editing]);

  function cancelEditing() {
    setEditing(null);
    setBookCover(null);
    setFormVersion((current) => current + 1);
  }

  function startEditing(item) {
    setEditing(item);
    setBookCover(null);
    setFormVersion((current) => current + 1);
  }

  function selectSection(key) {
    setSection(key); setMessage(''); setEditing(null); setBookCover(null); setBackgroundFile(null); setPage(1);
    setFilterDraft({ ...emptyFilters }); setFilters({ ...emptyFilters });
    setPagination({ page: 1, limit: 10, total: 0, totalPages: 1 });
    setFormVersion((current) => current + 1);
  }

  function applyFilters(event) {
    event.preventDefault();
    setPage(1);
    setFilters({ ...filterDraft });
  }

  function clearFilters() {
    setFilterDraft({ ...emptyFilters });
    setFilters({ ...emptyFilters });
    setPage(1);
  }

  async function save(event, target = editing) {
    event.preventDefault(); setMessage('');
    const form = event.currentTarget;
    try {
      const method = target ? 'PATCH' : 'POST';
      const endpoint = target ? `/admin/${section}/${target._id}` : `/admin/${section}`;
      if (section === 'books' || section === 'backgrounds') {
        const body = new FormData(form);
        if (section === 'books') {
          const selectedAuthors = JSON.parse(form.elements.authors.value);
          const selectedGenres = JSON.parse(form.elements.genres.value);
          if (!selectedAuthors.length || !selectedGenres.length) throw new Error('Selecciona al menos un autor y un género.');
          body.set('authors', JSON.stringify(selectedAuthors));
          body.set('genres', JSON.stringify(selectedGenres));
          if (bookCover) body.set('cover', bookCover, bookCover.name || `portada-${Date.now()}.png`);
        }
        if (section === 'backgrounds') {
          if (!backgroundFile) throw new Error('Selecciona o pega una imagen para el fondo.');
          body.set('image', backgroundFile, backgroundFile.name || `fondo-${Date.now()}.png`);
        }
        await api(endpoint, { method, body });
      } else {
        const body = Object.fromEntries(new FormData(form));
        if (body.active !== undefined) body.active = body.active === 'true';
        await api(endpoint, { method, body });
      }
      const wasEditing = Boolean(target);
      form.reset(); setEditing(null); setBookCover(null); setBackgroundFile(null); setFormVersion((current) => current + 1); setMessage(wasEditing ? 'Registro actualizado correctamente.' : 'Registro creado correctamente.'); await load();
    } catch (error) { setMessage(error.message); }
  }

  async function updateItem(id, changes) {
    try {
      const url = section === 'moderation' ? `/admin/moderation/${moderationType}/${id}` : `/admin/${section}/${id}`;
      await api(url, { method: 'PATCH', body: changes }); await load();
    } catch (error) { setMessage(error.message); }
  }

  async function confirmRemove() {
    if (!pendingDelete) return;
    setDeleting(true);
    try {
      const id = pendingDelete._id;
      if (section === 'users') await api(`/admin/users/${id}`, { method: 'PATCH', body: { status: 'deleted' } });
      else await api(section === 'moderation' ? `/admin/moderation/${moderationType}/${id}` : `/admin/${section}/${id}`, { method: 'DELETE' });
      setPendingDelete(null);
      setMessage('Registro eliminado correctamente.');
      await load();
    } catch (error) { setMessage(error.message); }
    finally { setDeleting(false); }
  }

  async function selectBackground(id) {
    try {
      await api(`/admin/backgrounds/${id}/select`, { method: 'PUT' });
      setActiveBackgroundId(String(id));
      setMessage('Fondo principal actualizado.');
    } catch (error) { setMessage(error.message); }
  }

  function itemDetails(item) {
    if (section === 'books') {
      const authorNames = item.authors?.map((author) => author.name).join(', ');
      const genreNames = item.genres?.map((genre) => genre.name).join(', ');
      return [authorNames, genreNames, item.publicationYear].filter((value) => value !== undefined && value !== '').join(' · ');
    }
    if (item.email) return `${item.username ? `@${item.username} · ` : ''}${item.email}`;
    return item.book?.title || item.status || item.content || item.review || (item.active ? 'Activo' : 'Inactivo');
  }

  return <main className="admin">
    <aside><p className="eyebrow">Panel editorial</p><h1>Administración</h1>{sections.map((key) => <button className={section === key ? 'active' : ''} key={key} onClick={() => selectSection(key)}>{labels[key]}</button>)}</aside>
    <section className="admin-content">
      <div className="section-heading"><div><p className="eyebrow">Gestión de contenido</p><h2>{labels[section]}</h2></div><span>{pagination.total} registros</span></div>
      {message && <p className="notice">{message}</p>}
      {section === 'books' && <BookForm key={`create-${formVersion}`} authors={authors} genres={genres} coverFile={bookCover} setCoverFile={setBookCover} onSubmit={(event) => save(event, null)} />}
      {section === 'authors' && <AuthorForm key={`create-${formVersion}`} onSubmit={(event) => save(event, null)} />}
      {section === 'genres' && <GenreForm key={`create-${formVersion}`} onSubmit={(event) => save(event, null)} />}
      {section === 'users' && <UserForm onSubmit={(event) => save(event, null)} />}
      {section === 'backgrounds' && <BackgroundForm key={`background-${formVersion}`} imageFile={backgroundFile} setImageFile={setBackgroundFile} onSubmit={(event) => save(event, null)} />}
      {section === 'moderation' && <form className="admin-form admin-form-fields moderation-form" onSubmit={(event) => event.preventDefault()}><div className="form-heading"><h3>Contenido a moderar</h3><p>Selecciona el tipo de contenido que deseas revisar.</p></div><label>Tipo de contenido<select value={moderationType} onChange={(event) => setModerationType(event.target.value)}><option value="comments">Comentarios</option><option value="ratings">Reseñas</option></select></label></form>}

      <div className="admin-list-heading"><h3>Registros existentes</h3>{loading && <span>Cargando…</span>}</div>
      {['books', 'authors', 'genres'].includes(section) && <form className="admin-list-filters" onSubmit={applyFilters}>
        <label>{section === 'books' ? 'Nombre del libro' : `Nombre del ${section === 'authors' ? 'autor' : 'género'}`}<input value={filterDraft.q} onChange={(event) => setFilterDraft((current) => ({ ...current, q: event.target.value }))} placeholder="Escribe un nombre" /></label>
        {section === 'books' && <><label>Autor<select value={filterDraft.author} onChange={(event) => setFilterDraft((current) => ({ ...current, author: event.target.value }))}><option value="">Todos los autores</option>{authors.map((author) => <option key={author._id} value={author.name}>{author.name}{author.active ? '' : ' (inactivo)'}</option>)}</select></label><label>Género<select value={filterDraft.genre} onChange={(event) => setFilterDraft((current) => ({ ...current, genre: event.target.value }))}><option value="">Todos los géneros</option>{genres.map((genre) => <option key={genre._id} value={genre.name}>{genre.name}{genre.active ? '' : ' (inactivo)'}</option>)}</select></label><label>Año<input type="number" min="0" max="3000" value={filterDraft.year} onChange={(event) => setFilterDraft((current) => ({ ...current, year: event.target.value }))} placeholder="Ej. 1967" /></label></>}
        <div className="admin-filter-actions"><button type="submit">Buscar</button><button type="button" className="secondary" onClick={clearFilters}>Limpiar</button></div>
      </form>}
      <div className="admin-list">{!loading && !data.length && <div className="empty">No hay registros en esta sección.</div>}{data.map((item) => <article key={item._id}>
        <div className="admin-record-summary">{section === 'backgrounds' && item.image?.thumbnail && <img className="background-record-preview" src={item.image.thumbnail} alt={`Vista previa de ${item.name}`} />}<div><strong>{item.title || item.name || item.user?.name || 'Registro'}</strong><small>{section === 'backgrounds' ? (String(item._id) === activeBackgroundId ? 'Activo · Fondo seleccionado actualmente' : 'Disponible para seleccionar') : itemDetails(item)}</small></div></div>
        <div className="row-actions">
          {['books', 'authors', 'genres'].includes(section) && <button type="button" onClick={() => startEditing(item)}><FiEdit2 aria-hidden="true" /> Editar</button>}
          {section === 'books' && <label>Estado<select value={item.status} onChange={(event) => updateItem(item._id, { status: event.target.value })}><option value="draft">Borrador</option><option value="published">Publicado</option><option value="archived">Archivado</option></select></label>}
          {['authors', 'genres'].includes(section) && <button type="button" onClick={() => updateItem(item._id, { active: !item.active })}>{item.active ? 'Desactivar' : 'Activar'}</button>}
          {section === 'users' && <><label>Rol<select value={item.role} onChange={(event) => updateItem(item._id, { role: event.target.value })}><option value="user">Usuario</option><option value="admin">Administrador</option></select></label><label>Estado<select value={item.status} onChange={(event) => updateItem(item._id, { status: event.target.value })}><option value="active">Activo</option><option value="suspended">Suspendido</option><option value="deleted">Eliminado</option></select></label></>}
          {section === 'moderation' && <button type="button" onClick={() => updateItem(item._id, { status: item.status === 'hidden' ? 'published' : 'hidden' })}>{item.status === 'hidden' ? 'Publicar' : 'Ocultar'}</button>}
          {section === 'backgrounds' && <button type="button" className={String(item._id) === activeBackgroundId ? 'active-background' : ''} disabled={String(item._id) === activeBackgroundId} onClick={() => selectBackground(item._id)}>{String(item._id) === activeBackgroundId ? 'Activo' : 'Seleccionar fondo'}</button>}
          <button type="button" className="danger" onClick={() => setPendingDelete(item)}>Eliminar</button>
        </div>
      </article>)}</div>
      {pagination.totalPages > 1 && <nav className="admin-pagination" aria-label="Paginación de registros"><button type="button" disabled={page <= 1 || loading} onClick={() => setPage((current) => current - 1)}>Anterior</button><span>Página {page} de {pagination.totalPages}</span><button type="button" disabled={page >= pagination.totalPages || loading} onClick={() => setPage((current) => current + 1)}>Siguiente</button></nav>}
    </section>
    {editing && ['books', 'authors', 'genres'].includes(section) && <div className="admin-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) cancelEditing(); }}><section className="admin-modal" role="dialog" aria-modal="true" aria-label={`Editar ${editing.title || editing.name}`}><button type="button" className="admin-modal-close" onClick={cancelEditing} aria-label="Cerrar modal" autoFocus><FiX aria-hidden="true" /></button>{section === 'books' && <BookForm key={`edit-${formVersion}`} authors={authors} genres={genres} coverFile={bookCover} setCoverFile={setBookCover} onSubmit={save} initial={editing} onCancel={cancelEditing} />}{section === 'authors' && <AuthorForm key={`edit-${formVersion}`} onSubmit={save} initial={editing} onCancel={cancelEditing} />}{section === 'genres' && <GenreForm key={`edit-${formVersion}`} onSubmit={save} initial={editing} onCancel={cancelEditing} />}</section></div>}
    <ConfirmDialog open={Boolean(pendingDelete)} itemName={pendingDelete?.title || pendingDelete?.name || pendingDelete?.user?.name || pendingDelete?.content || pendingDelete?.review || 'Registro seleccionado'} busy={deleting} onCancel={() => setPendingDelete(null)} onConfirm={confirmRemove} />
  </main>;
}
