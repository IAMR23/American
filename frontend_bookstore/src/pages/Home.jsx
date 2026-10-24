import { useEffect, useState } from 'react';
import { FiSearch, FiSliders, FiX } from 'react-icons/fi';
import { Link, useSearchParams } from 'react-router-dom';
import { api, assetUrl } from '../lib/api.js';

function CoverGallery({ books }) {
  if (!books.length) return <div className="empty catalog-empty">No encontramos libros que coincidan con estos filtros.</div>;
  return <div className="cover-gallery">{books.map((book) => <Link className="cover-tile" to={`/libros/${book.slug}`} key={book._id} aria-label={`Ver ${book.title}`}>
    <img src={assetUrl(book.cover?.thumbnail || book.imageUrl)} width="320" height="480" loading="lazy" alt={`Portada de ${book.title}`} />
    <div className="cover-overlay"><p>{book.category || book.genres?.map((genre) => genre.name).join(' · ')}</p><h2>{book.title}</h2><span>{book.author || book.authors?.map((author) => author.name).join(', ')}</span><small>★ {book.ratingsCount ? book.ratingAverage.toFixed(1) : 'Sin valorar'}</small></div>
  </Link>)}</div>;
}

export default function Home() {
  const [params, setParams] = useSearchParams();
  const [books, setBooks] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [authors, setAuthors] = useState([]);
  const [genres, setGenres] = useState([]);
  const [background, setBackground] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([api('/catalog/authors'), api('/catalog/genres'), api('/catalog/home-config')])
      .then(([authorData, genreData, config]) => { setAuthors(authorData.items); setGenres(genreData.items); setBackground(config.background); })
      .catch((loadError) => setError(loadError.message));
    const updateBackground = (event) => setBackground(event.detail || null);
    window.addEventListener('book-store-background-changed', updateBackground);
    return () => window.removeEventListener('book-store-background-changed', updateBackground);
  }, []);

  useEffect(() => {
    const query = new URLSearchParams(params);
    if (!query.has('sort')) query.set('sort', 'title_asc');
    query.set('limit', '24');
    const controller = new AbortController();
    setLoading(true); setError('');
    api(`/catalog/books?${query}`, { signal: controller.signal }).then((data) => { setBooks(data.items); setPagination(data.pagination); }).catch((loadError) => { if (loadError.name !== 'AbortError') setError(loadError.message); }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [params]);

  function update(key, value) {
    const next = new URLSearchParams(params);
    value ? next.set(key, value) : next.delete(key);
    if (key !== 'page') next.set('page', '1');
    setParams(next, { replace: key === 'q' });
  }

  function clearFilters() { setParams({ sort: 'title_asc' }); }
  const hasFilters = Boolean(params.get('q') || params.get('genre') || params.get('author') || (params.get('sort') && params.get('sort') !== 'title_asc'));
  const heroStyle = background?.image?.detail ? { backgroundImage: `linear-gradient(90deg,rgba(13,12,10,.94),rgba(13,12,10,.3)),url(${background.image.detail})` } : undefined;

  return <main>
    <section className="hero catalog-hero" style={heroStyle}><div className="hero-copy"><p className="eyebrow">Biblioteca virtual</p><h1>Encuentra tu próxima historia.</h1><p>Combina búsqueda, autor, género y orden para explorar toda la colección en una sola vista.</p></div></section>
    <section className="container unified-catalog">
      <div className="catalog-heading"><div><p className="eyebrow">Todos los libros</p><h2>Explora la colección</h2></div>{pagination && <span>{pagination.total} coincidencias</span>}</div>
      <div className="catalog-filter-panel">
        <div className="filter-title"><FiSliders aria-hidden="true" /><strong>Filtros</strong>{hasFilters && <button type="button" onClick={clearFilters}><FiX aria-hidden="true" /> Limpiar</button>}</div>
        <label className="search-control"><span>Buscar por título o autor</span><div><FiSearch aria-hidden="true" /><input type="search" value={params.get('q') ?? ''} onChange={(event) => update('q', event.target.value)} placeholder="Escribe un nombre…" /></div></label>
        <label><span>Género</span><select value={params.get('genre') ?? ''} onChange={(event) => update('genre', event.target.value)}><option value="">Todos los géneros</option>{genres.map((genre) => <option value={genre.slug} key={genre._id}>{genre.name}</option>)}</select></label>
        <label><span>Autor</span><select value={params.get('author') ?? ''} onChange={(event) => update('author', event.target.value)}><option value="">Todos los autores</option>{authors.map((author) => <option value={author._id} key={author._id}>{author.name}</option>)}</select></label>
        <label><span>Ordenar</span><select value={params.get('sort') ?? 'title_asc'} onChange={(event) => update('sort', event.target.value)}><option value="title_asc">Título A–Z</option><option value="title_desc">Título Z–A</option><option value="author">Autor A–Z</option><option value="recent">Más recientes</option><option value="oldest">Más antiguos</option><option value="rating_desc">Mejor valorados</option><option value="reads">Más leídos</option></select></label>
      </div>
      {error ? <div className="state error">{error}</div> : loading ? <div className="state catalog-loading">Buscando coincidencias…</div> : <CoverGallery books={books} />}
      {pagination && pagination.totalPages > 1 && <div className="pager"><button disabled={pagination.page <= 1} onClick={() => update('page', String(pagination.page - 1))}>Anterior</button><span>Página {pagination.page} de {pagination.totalPages}</span><button disabled={pagination.page >= pagination.totalPages} onClick={() => update('page', String(pagination.page + 1))}>Siguiente</button></div>}
    </section>
  </main>;
}
