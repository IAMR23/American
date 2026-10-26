import { useEffect, useRef, useState } from 'react';
import { FiClipboard, FiEdit2, FiImage, FiSave, FiTrash2, FiX } from 'react-icons/fi';
import ConfirmDialog from '../components/ConfirmDialog.jsx';
import PasswordField from '../components/PasswordField.jsx';
import { api } from '../lib/api.js';

const sections = ['books', 'categories', 'home-sections', 'users', 'backgrounds', 'moderation'];
const labels = { books: 'Libros', 'upload-books': 'Subir Libros', categories: 'Categorías', 'home-sections': 'Subir sección de Inicio', users: 'Usuarios', backgrounds: 'Fondos', moderation: 'Moderación' };
const emptyFilters = { q: '', author: '', category: '', classification: '' };

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

function BookForm({ categories, onSubmit, initial, onCancel }) {
  const initialImages = initial?.images?.length ? initial.images : (initial?.imageUrl ? [{ url: initial.imageUrl, fit: 'cover', positionX: 50, positionY: 50 }] : []);
  const [images, setImages] = useState(initialImages);
  const [draftUrl, setDraftUrl] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const selectedImage = images[selectedIndex];
  const imageCount = images.filter(Boolean).length;
  const slotCount = Math.max(12, Math.ceil((images.length + 1) / 6) * 6);
  const addImage = () => {
    const url = draftUrl.trim();
    if (!url) return;
    const emptyIndex = images.findIndex((image) => !image);
    const nextIndex = selectedIndex >= 0 && !images[selectedIndex] ? selectedIndex : emptyIndex >= 0 ? emptyIndex : images.length;
    setImages((current) => { const next = [...current]; next[nextIndex] = { url, fit: 'cover', positionX: 50, positionY: 50 }; return next; });
    setSelectedIndex(nextIndex);
    setDraftUrl('');
  };
  const updateSelected = (changes) => setImages((current) => current.map((image, index) => index === selectedIndex ? { ...image, ...changes } : image));
  const removeImage = (index) => {
    setImages((current) => current.map((image, imageIndex) => imageIndex === index ? null : image));
  };

  return <form className={`admin-form admin-form-fields ${selectedIndex >= 0 ? 'image-panel-open' : ''}`} onSubmit={onSubmit}>
    <div className="form-heading"><h3>{initial ? 'Editar libro' : 'Nuevo libro'}</h3><p>Agrega los datos y las imágenes necesarias. La primera imagen será la portada principal.</p></div>
    <div className="image-url-row"><label>Link de imagen<input type="url" placeholder="https://ejemplo.com/portada.jpg" value={draftUrl} onChange={(event) => setDraftUrl(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); addImage(); } }} /></label><button type="button" onClick={addImage} disabled={!draftUrl.trim()}>Agregar imagen</button></div>
    <section className="book-image-editor wide">
      <input type="hidden" name="images" value={JSON.stringify(images)} />
      <div className="book-image-grid" aria-label="Imágenes del libro">
        {Array.from({ length: slotCount }, (_, index) => {
          const image = images[index];
          return <button type="button" className={`book-image-slot ${selectedIndex === index ? 'selected' : ''} ${image ? 'has-image' : ''}`} key={index} onClick={() => setSelectedIndex(index)} aria-label={image ? `Editar imagen ${index + 1}` : `Espacio de imagen ${index + 1}`}>
            {image ? <><img src={image.url} alt="" style={{ objectFit: image.fit, objectPosition: `${image.positionX}% ${image.positionY}%` }} onError={(event) => event.currentTarget.classList.add('invalid')} /><span>{index === 0 ? 'Portada' : `Imagen ${index + 1}`}</span></> : <><FiImage aria-hidden="true" /><span>{index + 1}</span></>}
          </button>;
        })}
      </div>
      {selectedImage && <div className="image-adjustments">
        <div><strong>Ajustar imagen {selectedIndex + 1}</strong><small>Encuadra la imagen dentro del recuadro.</small></div>
        <label>Ajuste<select value={selectedImage.fit} onChange={(event) => updateSelected({ fit: event.target.value })}><option value="cover">Llenar recuadro</option><option value="contain">Mostrar completa</option></select></label>
        <label>Horizontal<input type="range" min="0" max="100" value={selectedImage.positionX} onChange={(event) => updateSelected({ positionX: Number(event.target.value) })} /></label>
        <label>Vertical<input type="range" min="0" max="100" value={selectedImage.positionY} onChange={(event) => updateSelected({ positionY: Number(event.target.value) })} /></label>
        <button type="button" className="remove-image" onClick={() => removeImage(selectedIndex)}><FiTrash2 aria-hidden="true" /> Quitar</button>
      </div>}
      {!imageCount && <p className="image-help">Selecciona un recuadro para abrir el menú izquierdo y agregar su imagen.</p>}
    </section>
    <label>Título<input name="title" required maxLength="250" defaultValue={initial?.title || ''} /></label>
    <label>Link de libro<input name="pdfRef" type="url" required placeholder="https://www.dropbox.com/..." defaultValue={initial?.pdfRef || ''} /></label>
    <label>Categoría<select name="category" required defaultValue={initial?.category || initial?.genres?.[0]?.name || ''}><option value="" disabled>Selecciona una categoría</option>{categories.filter((category) => category.active).map((category) => <option key={category._id} value={category.name}>{category.name}</option>)}</select></label>
    <label>Autor<input name="author" required maxLength="200" defaultValue={initial?.author || initial?.authors?.map((value) => value.name).join(', ') || ''} /></label>
    <label>Clasificación<select name="classification" required defaultValue={initial?.classification || ''}><option value="" disabled>Selecciona una opción</option><option value="letras">Letras</option><option value="imagenes">Imágenes</option><option value="revistas">Revistas</option></select></label>
    <div className="form-actions wide"><button type="submit" disabled={!imageCount}><FiSave aria-hidden="true" /> {initial ? 'Guardar cambios' : 'Crear libro'}</button>{initial && <button type="button" className="secondary" onClick={onCancel}><FiX aria-hidden="true" /> Cancelar</button>}</div>
  </form>;
}

function BookSlotWorkspace({ books, categories, onSubmit }) {
  const [selectedIndex, setSelectedIndex] = useState(null);
  const selectedBook = selectedIndex === null ? null : books[selectedIndex] || null;
  const slotCount = Math.max(12, Math.ceil((books.length + 1) / 6) * 6);
  const initialImage = selectedBook?.images?.[0]?.url || selectedBook?.imageUrl || '';
  const [imageUrl, setImageUrl] = useState('');

  useEffect(() => { setImageUrl(initialImage); }, [selectedIndex, initialImage]);

  return <div className="book-slot-workspace">
    <aside className="book-slot-panel">
      {selectedIndex === null ? <div className="book-slot-instructions"><FiImage aria-hidden="true" /><h3>Selecciona un recuadro</h3><p>Elige un libro para editarlo o un espacio vacío para crear uno nuevo.</p></div> : <form key={selectedBook?._id || `new-${selectedIndex}`} className="book-slot-form" onSubmit={(event) => onSubmit(event, selectedBook)}>
        <div className="form-heading"><p className="eyebrow">{selectedBook ? 'Editar libro' : 'Nuevo libro'}</p><h3>{selectedBook ? selectedBook.title : 'Nuevo libro'}</h3></div>
        <label>Link de imagen<input name="imageUrl" type="url" required placeholder="https://ejemplo.com/portada.jpg" value={imageUrl} onChange={(event) => setImageUrl(event.target.value)} /></label>
        <label>Título<input name="title" required maxLength="250" defaultValue={selectedBook?.title || ''} /></label>
        <label>Link de libro<input name="pdfRef" type="url" required placeholder="https://www.dropbox.com/..." defaultValue={selectedBook?.pdfRef || ''} /></label>
        <label>Categoría<select name="category" required defaultValue={selectedBook?.category || selectedBook?.genres?.[0]?.name || ''}><option value="" disabled>Selecciona una categoría</option>{categories.filter((category) => category.active).map((category) => <option key={category._id} value={category.name}>{category.name}</option>)}</select></label>
        <label>Autor<input name="author" required maxLength="200" defaultValue={selectedBook?.author || selectedBook?.authors?.map((author) => author.name).join(', ') || ''} /></label>
        <label>Clasificación<select name="classification" required defaultValue={selectedBook?.classification || ''}><option value="" disabled>Selecciona una opción</option><option value="letras">Letras</option><option value="imagenes">Imágenes</option><option value="revistas">Revistas</option></select></label>
        <button type="submit"><FiSave aria-hidden="true" /> {selectedBook ? 'Guardar cambios' : 'Crear libro'}</button>
      </form>}
    </aside>
    <section className="book-slots-area">
      <div className="book-slots-grid">
        {Array.from({ length: slotCount }, (_, index) => {
          const book = books[index];
          const previewUrl = selectedIndex === index && imageUrl.trim() ? imageUrl.trim() : book?.images?.[0]?.url || book?.imageUrl;
          return <button type="button" className={`book-record-slot ${selectedIndex === index ? 'selected' : ''} ${book ? 'has-book occupied' : 'available'} ${previewUrl ? 'has-preview' : ''}`} key={book?._id || `slot-${index}`} onClick={() => setSelectedIndex(index)}>
            {previewUrl ? <img src={previewUrl} alt={book ? `Portada de ${book.title}` : 'Vista previa de la nueva portada'} /> : <FiImage aria-hidden="true" />}
            {book ? <><em>Ocupado</em><div className="book-slot-info"><strong>{book.title || 'Libro sin título'}</strong><small>{[book.author, book.category].filter(Boolean).join(' · ') || 'Información guardada'}</small></div></> : <div className="book-slot-info"><strong>{previewUrl ? 'Nueva portada' : 'Disponible'}</strong><small>Crear libro</small></div>}
          </button>;
        })}
      </div>
      <p className="image-help">Al completar los espacios disponibles se agregará automáticamente una fila nueva.</p>
    </section>
  </div>;
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

function CategoryForm({ onSubmit, initial, onCancel }) {
  return <form className="admin-form admin-form-fields" onSubmit={onSubmit}>
    <div className="form-heading"><h3>{initial ? 'Editar categoría' : 'Nueva categoría'}</h3><p>Organiza el catálogo en categorías fáciles de explorar.</p></div>
    <label>Nombre<input name="name" required maxLength="120" defaultValue={initial?.name || ''} /></label>
    <label>Slug <small>Opcional; se genera desde el nombre</small><input name="slug" defaultValue={initial?.slug || ''} /></label>
    <label>Estado<select name="active" defaultValue={String(initial?.active ?? true)}><option value="true">Activo</option><option value="false">Inactivo</option></select></label>
    <label className="wide">Descripción <small>Opcional</small><textarea name="description" rows="4" maxLength="2000" defaultValue={initial?.description || ''} /></label>
    <div className="form-actions wide"><button type="submit"><FiSave aria-hidden="true" /> {initial ? 'Guardar cambios' : 'Crear categoría'}</button>{initial && <button type="button" className="secondary" onClick={onCancel}><FiX aria-hidden="true" /> Cancelar</button>}</div>
  </form>;
}

function HomeSectionForm({ onSubmit, initial, onCancel }) {
  return <form className="admin-form admin-form-fields" onSubmit={onSubmit}>
    <div className="form-heading"><h3>{initial ? 'Editar sección de Inicio' : 'Subir sección de Inicio'}</h3><p>Registra el nombre y el enlace de la imagen que identificará esta sección.</p></div>
    <label>Nombre<input name="name" required maxLength="150" defaultValue={initial?.name || ''} /></label>
    <label>Link de la imagen<input name="imageUrl" type="url" required placeholder="https://ejemplo.com/imagen.jpg" defaultValue={initial?.imageUrl || ''} /></label>
    <div className="form-actions wide"><button type="submit"><FiSave aria-hidden="true" /> {initial ? 'Guardar cambios' : 'Guardar sección'}</button>{initial && <button type="button" className="secondary" onClick={onCancel}><FiX aria-hidden="true" /> Cancelar</button>}</div>
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

export default function Admin({ initialSection = 'books', standalone = false }) {
  const [section, setSection] = useState(initialSection);
  const [data, setData] = useState([]);
  const [message, setMessage] = useState('');
  const [categories, setCategories] = useState([]);
  const [moderationType, setModerationType] = useState('comments');
  const [loading, setLoading] = useState(true);
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
      if (section === 'upload-books') {
        const [categoryData, bookData] = await Promise.all([api('/admin/categories?limit=100'), api('/admin/books?limit=100')]);
        setCategories(categoryData.items || []); setData(bookData.items || []); setPagination(bookData.pagination || { page: 1, limit: 100, total: bookData.items?.length || 0, totalPages: 1 });
        return;
      }
      const params = new URLSearchParams({ page: String(page), limit: '10' });
      if (section === 'moderation') params.set('type', moderationType);
      if (['books', 'categories', 'home-sections', 'users'].includes(section) && filters.q) params.set('q', filters.q);
      if (section === 'books') {
        if (filters.author) params.set('author', filters.author);
        if (filters.category) params.set('category', filters.category);
        if (filters.classification) params.set('classification', filters.classification);
      }
      const endpoint = `/admin/${section === 'moderation' ? 'moderation' : section}?${params}`;
      const result = await api(endpoint);
      setData(result.items || []);
      if (section === 'backgrounds') setActiveBackgroundId(String(result.setting?.value?.backgroundId?._id || result.setting?.value?.backgroundId || ''));
      const nextPagination = result.pagination || { page: 1, limit: 10, total: result.items?.length || 0, totalPages: 1 };
      setPagination(nextPagination);
      const lastPage = Math.max(1, nextPagination.totalPages || 1);
      if (page > lastPage) setPage(lastPage);
      if (section === 'categories') setCategories(result.items || []);
      if (section === 'books') {
        const categoryData = await api('/admin/categories?limit=100');
        setCategories(categoryData.items || []);
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
    setFormVersion((current) => current + 1);
  }

  function startEditing(item) {
    setEditing(item);
    setFormVersion((current) => current + 1);
  }

  function selectSection(key) {
    setSection(key); setMessage(''); setEditing(null); setBackgroundFile(null); setPage(1);
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
      const resource = section === 'upload-books' ? 'books' : section;
      const endpoint = target ? `/admin/${resource}/${target._id}` : `/admin/${resource}`;
      if (section === 'backgrounds') {
        const body = new FormData(form);
        if (!backgroundFile) throw new Error('Selecciona o pega una imagen para el fondo.');
        body.set('image', backgroundFile, backgroundFile.name || `fondo-${Date.now()}.png`);
        await api(endpoint, { method, body });
      } else {
        const body = Object.fromEntries(new FormData(form));
        if (resource === 'books' && body.imageUrl && !body.images) body.images = JSON.stringify([{ url: body.imageUrl, fit: 'cover', positionX: 50, positionY: 50 }]);
        if (resource === 'books' && !JSON.parse(body.images || '[]').filter(Boolean).length) throw new Error('Ingresa al menos un link de imagen.');
        if (body.active !== undefined) body.active = body.active === 'true';
        await api(endpoint, { method, body });
      }
      const wasEditing = Boolean(target);
      form.reset(); setEditing(null); setBackgroundFile(null); setFormVersion((current) => current + 1); setMessage(wasEditing ? 'Registro actualizado correctamente.' : 'Registro creado correctamente.'); await load();
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
      const authorName = item.author || item.authors?.map((author) => author.name).join(', ');
      const categoryName = item.category || item.genres?.map((genre) => genre.name).join(', ');
      return [authorName, categoryName, item.classification].filter(Boolean).join(' · ');
    }
    if (item.email) return `${item.username ? `@${item.username} · ` : ''}${item.email}`;
    return item.book?.title || item.status || item.content || item.review || (item.active ? 'Activo' : 'Inactivo');
  }

  return <main className={`admin ${standalone ? 'standalone-book-upload' : ''}`}>
    {!standalone && <aside><p className="eyebrow">Panel editorial</p><h1>Administración</h1>{sections.map((key) => <button className={section === key ? 'active' : ''} key={key} onClick={() => selectSection(key)}>{labels[key]}</button>)}</aside>}
    <section className="admin-content">
      <div className="section-heading"><div><p className="eyebrow">Gestión de contenido</p><h2>{labels[section]}</h2></div><span>{pagination.total} registros</span></div>
      {message && <p className="notice">{message}</p>}
      {section === 'upload-books' && <BookSlotWorkspace books={data} categories={categories} onSubmit={save} />}
      {section === 'categories' && <CategoryForm key={`create-${formVersion}`} onSubmit={(event) => save(event, null)} />}
      {section === 'home-sections' && <HomeSectionForm key={`create-${formVersion}`} onSubmit={(event) => save(event, null)} />}
      {section === 'users' && <UserForm onSubmit={(event) => save(event, null)} />}
      {section === 'backgrounds' && <BackgroundForm key={`background-${formVersion}`} imageFile={backgroundFile} setImageFile={setBackgroundFile} onSubmit={(event) => save(event, null)} />}
      {section === 'moderation' && <form className="admin-form admin-form-fields moderation-form" onSubmit={(event) => event.preventDefault()}><div className="form-heading"><h3>Contenido a moderar</h3><p>Selecciona el tipo de contenido que deseas revisar.</p></div><label>Tipo de contenido<select value={moderationType} onChange={(event) => setModerationType(event.target.value)}><option value="comments">Comentarios</option><option value="ratings">Reseñas</option></select></label></form>}

      {section !== 'upload-books' && <><div className="admin-list-heading"><h3>Registros existentes</h3>{loading && <span>Cargando…</span>}</div>
      {['books', 'categories', 'home-sections'].includes(section) && <form className="admin-list-filters" onSubmit={applyFilters}>
        <label>{section === 'books' ? 'Nombre del libro' : section === 'categories' ? 'Nombre de la categoría' : 'Nombre de la sección'}<input value={filterDraft.q} onChange={(event) => setFilterDraft((current) => ({ ...current, q: event.target.value }))} placeholder="Escribe un nombre" /></label>
        {section === 'books' && <><label>Autor<input value={filterDraft.author} onChange={(event) => setFilterDraft((current) => ({ ...current, author: event.target.value }))} placeholder="Nombre del autor" /></label><label>Categoría<input value={filterDraft.category} onChange={(event) => setFilterDraft((current) => ({ ...current, category: event.target.value }))} placeholder="Nombre de categoría" /></label><label>Clasificación<select value={filterDraft.classification} onChange={(event) => setFilterDraft((current) => ({ ...current, classification: event.target.value }))}><option value="">Todas</option><option value="letras">Letras</option><option value="imagenes">Imágenes</option><option value="revistas">Revistas</option></select></label></>}
        <div className="admin-filter-actions"><button type="submit">Buscar</button><button type="button" className="secondary" onClick={clearFilters}>Limpiar</button></div>
      </form>}
      <div className="admin-list">{!loading && !data.length && <div className="empty">No hay registros en esta sección.</div>}{data.map((item) => <article key={item._id}>
        <div className="admin-record-summary">{section === 'backgrounds' && item.image?.thumbnail && <img className="background-record-preview" src={item.image.thumbnail} alt={`Vista previa de ${item.name}`} />}{section === 'home-sections' && item.imageUrl && <img className="background-record-preview" src={item.imageUrl} alt={`Vista previa de ${item.name}`} />}<div><strong>{item.title || item.name || item.user?.name || 'Registro'}</strong><small>{section === 'backgrounds' ? (String(item._id) === activeBackgroundId ? 'Activo · Fondo seleccionado actualmente' : 'Disponible para seleccionar') : itemDetails(item)}</small></div></div>
        <div className="row-actions">
          {['books', 'categories', 'home-sections'].includes(section) && <button type="button" onClick={() => startEditing(item)}><FiEdit2 aria-hidden="true" /> Editar</button>}
          {['categories', 'home-sections'].includes(section) && <button type="button" onClick={() => updateItem(item._id, { active: !item.active })}>{item.active ? 'Desactivar' : 'Activar'}</button>}
          {section === 'users' && <><label>Rol<select value={item.role} onChange={(event) => updateItem(item._id, { role: event.target.value })}><option value="user">Usuario</option><option value="admin">Administrador</option></select></label><label>Estado<select value={item.status} onChange={(event) => updateItem(item._id, { status: event.target.value })}><option value="active">Activo</option><option value="suspended">Suspendido</option><option value="deleted">Eliminado</option></select></label></>}
          {section === 'moderation' && <button type="button" onClick={() => updateItem(item._id, { status: item.status === 'hidden' ? 'published' : 'hidden' })}>{item.status === 'hidden' ? 'Publicar' : 'Ocultar'}</button>}
          {section === 'backgrounds' && <button type="button" className={String(item._id) === activeBackgroundId ? 'active-background' : ''} disabled={String(item._id) === activeBackgroundId} onClick={() => selectBackground(item._id)}>{String(item._id) === activeBackgroundId ? 'Activo' : 'Seleccionar fondo'}</button>}
          <button type="button" className="danger" onClick={() => setPendingDelete(item)}>Eliminar</button>
        </div>
      </article>)}</div>
      {pagination.totalPages > 1 && <nav className="admin-pagination" aria-label="Paginación de registros"><button type="button" disabled={page <= 1 || loading} onClick={() => setPage((current) => current - 1)}>Anterior</button><span>Página {page} de {pagination.totalPages}</span><button type="button" disabled={page >= pagination.totalPages || loading} onClick={() => setPage((current) => current + 1)}>Siguiente</button></nav>}</>}
    </section>
    {editing && ['books', 'categories', 'home-sections'].includes(section) && <div className="admin-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) cancelEditing(); }}><section className="admin-modal" role="dialog" aria-modal="true" aria-label={`Editar ${editing.title || editing.name}`}><button type="button" className="admin-modal-close" onClick={cancelEditing} aria-label="Cerrar modal" autoFocus><FiX aria-hidden="true" /></button>{section === 'books' && <BookForm key={`edit-${formVersion}`} categories={categories} onSubmit={save} initial={editing} onCancel={cancelEditing} />}{section === 'categories' && <CategoryForm key={`edit-${formVersion}`} onSubmit={save} initial={editing} onCancel={cancelEditing} />}{section === 'home-sections' && <HomeSectionForm key={`edit-${formVersion}`} onSubmit={save} initial={editing} onCancel={cancelEditing} />}</section></div>}
    <ConfirmDialog open={Boolean(pendingDelete)} itemName={pendingDelete?.title || pendingDelete?.name || pendingDelete?.user?.name || pendingDelete?.content || pendingDelete?.review || 'Registro seleccionado'} busy={deleting} onCancel={() => setPendingDelete(null)} onConfirm={confirmRemove} />
  </main>;
}
