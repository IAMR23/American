import { useEffect, useRef, useState } from 'react';
import { FiArrowLeft, FiBookmark, FiChevronLeft, FiChevronRight, FiMinus, FiPlus, FiTrash2 } from 'react-icons/fi';
import { Link, useParams } from 'react-router-dom';
import * as pdfjsLib from 'pdfjs-dist';
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import ConfirmDialog from '../components/ConfirmDialog.jsx';
import { api } from '../lib/api.js';

pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl;

export default function Reader() {
  const { id } = useParams();
  const leftCanvasRef = useRef(null);
  const rightCanvasRef = useRef(null);
  const documentRef = useRef(null);
  const saveTimer = useRef(null);
  const renderTasks = useRef([]);
  const turnTimers = useRef([]);
  const turningRef = useRef(false);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(0);
  const [zoom, setZoom] = useState(1.15);
  const [bookmarks, setBookmarks] = useState([]);
  const [bookmarkName, setBookmarkName] = useState('');
  const [background, setBackground] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [compact, setCompact] = useState(() => window.matchMedia('(max-width: 850px)').matches);
  const [turnSheet, setTurnSheet] = useState(null);
  const [pendingDelete, setPendingDelete] = useState(null);
  const [deletingBookmark, setDeletingBookmark] = useState(false);

  useEffect(() => {
    const media = window.matchMedia('(max-width: 850px)');
    const updateLayout = () => setCompact(media.matches);
    media.addEventListener('change', updateLayout);
    return () => media.removeEventListener('change', updateLayout);
  }, []);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      api(`/me/books/${id}/progress`),
      api(`/me/books/${id}/bookmarks`),
      api('/catalog/home-config').catch(() => ({ background: null })),
      pdfjsLib.getDocument({ url: `/api/me/books/${id}/read`, withCredentials: true }).promise,
    ]).then(([progress, marks, config, pdf]) => {
      if (cancelled) return;
      documentRef.current = pdf;
      setPages(pdf.numPages);
      setBookmarks(marks.items);
      setBackground(config.background);
      setPage(Math.min(progress.progress?.lastPage || 1, pdf.numPages));
      setLoading(false);
    }).catch((loadError) => { if (!cancelled) { setError(loadError.message); setLoading(false); } });
    return () => {
      cancelled = true;
      clearTimeout(saveTimer.current);
      turnTimers.current.forEach((timer) => clearTimeout(timer));
      renderTasks.current.forEach((task) => task.cancel());
    };
  }, [id]);

  useEffect(() => {
    if (!documentRef.current) return undefined;
    renderTasks.current.forEach((task) => task.cancel());
    renderTasks.current = [];
    let active = true;

    async function renderPage(pageNumber, canvas) {
      if (!canvas || pageNumber > pages) return;
      const pdfPage = await documentRef.current.getPage(pageNumber);
      if (!active) return;
      const viewport = pdfPage.getViewport({ scale: zoom });
      const context = canvas.getContext('2d');
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      const task = pdfPage.render({ canvasContext: context, viewport });
      renderTasks.current.push(task);
      await task.promise;
    }

    Promise.all([
      renderPage(page, leftCanvasRef.current),
      compact ? Promise.resolve() : renderPage(page + 1, rightCanvasRef.current),
    ]).catch((renderError) => {
      if (renderError?.name !== 'RenderingCancelledException' && active) setError(renderError.message);
    });

    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => api(`/me/books/${id}/progress`, { method: 'PUT', body: { lastPage: page } }).catch(() => {}), 700);
    return () => { active = false; renderTasks.current.forEach((task) => task.cancel()); };
  }, [compact, id, page, pages, zoom]);

  const step = compact ? 1 : 2;

  function goToPage(nextPage) {
    const safePage = Math.min(pages || 1, Math.max(1, Number(nextPage) || 1));
    if (safePage === page || turningRef.current) return;
    const direction = safePage > page ? 'next' : 'previous';
    const sourceCanvas = direction === 'next' && !compact ? rightCanvasRef.current : leftCanvasRef.current;
    let image = '';
    try { image = sourceCanvas?.toDataURL('image/jpeg', .92) ?? ''; } catch { image = ''; }

    turningRef.current = true;
    setTurnSheet({ direction, image });
    turnTimers.current.forEach((timer) => clearTimeout(timer));
    turnTimers.current = [
      window.setTimeout(() => setPage(safePage), 310),
      window.setTimeout(() => { setTurnSheet(null); turningRef.current = false; }, 720),
    ];
  }

  useEffect(() => {
    const navigateWithKeyboard = (event) => {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(event.target.tagName)) return;
      if (event.key === 'ArrowLeft') goToPage(page - step);
      if (event.key === 'ArrowRight') goToPage(page + step);
    };
    document.addEventListener('keydown', navigateWithKeyboard);
    return () => document.removeEventListener('keydown', navigateWithKeyboard);
  }, [page, pages, step]);

  async function addBookmark(event) {
    event.preventDefault();
    const name = bookmarkName.trim();
    if (!name) return;
    try {
      const data = await api(`/me/books/${id}/bookmarks`, { method: 'POST', body: { page, name } });
      setBookmarks((current) => [...current.filter((bookmark) => bookmark.page !== page), data.bookmark].sort((a, b) => a.page - b.page));
      setBookmarkName('');
    } catch (bookmarkError) { setError(bookmarkError.message); }
  }

  async function removeBookmark(mark) {
    setDeletingBookmark(true);
    try {
      await api(`/me/bookmarks/${mark._id}`, { method: 'DELETE' });
      setBookmarks((current) => current.filter((bookmark) => bookmark._id !== mark._id));
      setPendingDelete(null);
    } catch (bookmarkError) { setError(bookmarkError.message); }
    finally { setDeletingBookmark(false); }
  }

  const readerStyle = background?.image?.detail ? { backgroundImage: `linear-gradient(#0b0907b8,#0b0907d9),url(${background.image.detail})` } : undefined;
  if (error) return <main className="state error">{error}</main>;

  return <main className="reader book-reader" style={readerStyle}>
    <aside className={sidebarOpen ? 'open' : ''}>
      <div className="reader-side-heading"><div><p className="eyebrow">Tu lectura</p><h2>Marcadores</h2></div><button type="button" onClick={() => setSidebarOpen(false)} aria-label="Cerrar marcadores">×</button></div>
      <form className="bookmark-form" onSubmit={addBookmark}>
        <label>Nombre del marcador<input required maxLength="200" value={bookmarkName} onChange={(event) => setBookmarkName(event.target.value)} placeholder="Ej. Capítulo favorito" /></label>
        <button type="submit"><FiBookmark aria-hidden="true" /> Guardar página {page}</button>
      </form>
      <div className="bookmark-list">{bookmarks.map((mark) => <article className={mark.page === page ? 'current' : ''} key={mark._id}><button type="button" onClick={() => { goToPage(mark.page); if (compact) setSidebarOpen(false); }}><strong>{mark.name || `Página ${mark.page}`}</strong><span>Página {mark.page}</span></button><button type="button" aria-label={`Eliminar marcador ${mark.name || mark.page}`} onClick={() => setPendingDelete(mark)}><FiTrash2 aria-hidden="true" /></button></article>)}{!bookmarks.length && <p className="reader-empty">Aún no guardaste marcadores.</p>}</div>
    </aside>
    {sidebarOpen && <button className="reader-sidebar-scrim" type="button" aria-label="Cerrar marcadores" onClick={() => setSidebarOpen(false)} />}
    <section className="viewer">
      <div className="reader-toolbar">
        <Link to="/biblioteca" aria-label="Volver a mi biblioteca"><FiArrowLeft aria-hidden="true" /></Link>
        <button type="button" className="bookmark-toggle" onClick={() => setSidebarOpen(true)}><FiBookmark aria-hidden="true" /><span>Marcadores</span></button>
        <div className="reader-page-controls"><button type="button" disabled={page <= 1} onClick={() => goToPage(page - step)} aria-label="Páginas anteriores"><FiChevronLeft aria-hidden="true" /></button><label>Página <input type="number" min="1" max={pages} value={page} onChange={(event) => goToPage(event.target.value)} /> de {pages || '…'}</label><button type="button" disabled={page + step > pages} onClick={() => goToPage(page + step)} aria-label="Páginas siguientes"><FiChevronRight aria-hidden="true" /></button></div>
        <div className="reader-zoom"><button type="button" onClick={() => setZoom(Math.max(.6, zoom - .15))} aria-label="Alejar"><FiMinus aria-hidden="true" /></button><span>{Math.round(zoom * 100)}%</span><button type="button" onClick={() => setZoom(Math.min(2.4, zoom + .15))} aria-label="Acercar"><FiPlus aria-hidden="true" /></button></div>
      </div>
      <div className="canvas-wrap">{loading ? <div className="reader-loading">Preparando las páginas…</div> : <div className={`book-spread ${compact ? 'compact' : ''}`} style={{ '--reader-mobile-width': `${(zoom / 1.15) * 100}%` }}>
        <section className="paper-page left-page"><canvas ref={leftCanvasRef} /><span>{page}</span></section>
        {!compact && <section className={`paper-page right-page ${page + 1 > pages ? 'blank' : ''}`}>{page + 1 <= pages && <canvas ref={rightCanvasRef} />}{page + 1 <= pages && <span>{page + 1}</span>}</section>}
        {turnSheet && <div className={`page-turn-sheet turn-${turnSheet.direction}`} aria-hidden="true">
          <div className="page-turn-face page-turn-front">{turnSheet.image && <img src={turnSheet.image} alt="" />}</div>
          <div className="page-turn-face page-turn-back" />
        </div>}
      </div>}</div>
    </section>
    <ConfirmDialog open={Boolean(pendingDelete)} title="¿Deseas eliminar este marcador?" itemName={pendingDelete?.name || `Página ${pendingDelete?.page || ''}`} busy={deletingBookmark} onCancel={() => setPendingDelete(null)} onConfirm={() => removeBookmark(pendingDelete)} />
  </main>;
}
