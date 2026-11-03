import { useEffect, useRef, useState } from 'react';
import { FiChevronLeft, FiChevronRight, FiSearch, FiX } from 'react-icons/fi';
import { Link, useSearchParams } from 'react-router-dom';
import { api, assetUrl } from '../lib/api.js';
import WelcomePanel from '../components/WelcomePanel.jsx';

function BookShelf({ title, books }) {
  const railRef = useRef(null);
  const move = (direction) => railRef.current?.scrollBy({ left: direction * Math.max(railRef.current.clientWidth * .8, 260), behavior: 'smooth' });
  return <section className="home-shelf">
    <div className="home-shelf-heading"><h2>{title}</h2><span>{books.length} libros</span></div>
    <div className="shelf-rail-wrap"><button type="button" className="rail-arrow previous" onClick={() => move(-1)} aria-label={`Ver libros anteriores de ${title}`}><FiChevronLeft /></button><div className="shelf-rail" ref={railRef}>{books.map((book) => <Link className="shelf-book" to={`/leer/${book._id}`} key={book._id}><img src={assetUrl(book.cover?.thumbnail || book.imageUrl)} width="220" height="330" loading="lazy" alt={`Portada de ${book.title}`} /><strong>{book.title}</strong><span>{book.author || book.authors?.map((author) => author.name).join(', ')}</span></Link>)}</div><button type="button" className="rail-arrow next" onClick={() => move(1)} aria-label={`Ver más libros de ${title}`}><FiChevronRight /></button></div>
  </section>;
}

export default function Home() {
  const [params, setParams] = useSearchParams();
  const [books, setBooks] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [genres, setGenres] = useState([]);
  const [background, setBackground] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const loadMoreRef = useRef(null);

  useEffect(() => {
    Promise.all([api('/catalog/genres'), api('/catalog/home-config')])
      .then(([genreData, config]) => { setGenres(genreData.items); setBackground(config.background); })
      .catch((loadError) => setError(loadError.message));
    const updateBackground = (event) => setBackground(event.detail || null);
    window.addEventListener('book-store-background-changed', updateBackground);
    return () => window.removeEventListener('book-store-background-changed', updateBackground);
  }, []);

  useEffect(() => { setPage(1); setBooks([]); }, [params]);

  useEffect(() => {
    const query = new URLSearchParams(params);
    if (!query.has('sort')) query.set('sort', 'title_asc');
    query.set('limit', '32');
    query.set('page', String(page));
    const controller = new AbortController();
    setLoading(true); setError('');
    api(`/catalog/books?${query}`, { signal: controller.signal }).then((data) => { setBooks((current) => page === 1 ? data.items : [...current, ...data.items]); setPagination(data.pagination); }).catch((loadError) => { if (loadError.name !== 'AbortError') setError(loadError.message); }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [params, page]);

  useEffect(() => {
    const target = loadMoreRef.current;
    if (!target || loading || !pagination || pagination.page >= pagination.totalPages) return undefined;
    const observer = new IntersectionObserver(([entry]) => { if (entry.isIntersecting) setPage((current) => current + 1); }, { rootMargin: '320px' });
    observer.observe(target);
    return () => observer.disconnect();
  }, [loading, pagination]);

  function update(key, value) {
    const next = new URLSearchParams(params);
    value ? next.set(key, value) : next.delete(key);
    next.delete('page');
    setParams(next, { replace: key === 'q' });
  }

  function clearFilters() { setParams({ sort: 'title_asc' }); }
  const hasFilters = Boolean(params.get('q') || params.get('genre') || params.get('author') || (params.get('sort') && params.get('sort') !== 'title_asc'));
  const heroStyle = background?.image?.detail ? { backgroundImage: `linear-gradient(90deg,rgba(13,12,10,.94),rgba(13,12,10,.3)),url(${background.image.detail})` } : undefined;
  const shelves = genres.map((genre) => ({ ...genre, books: books.filter((book) => book.genres?.some((item) => item._id === genre._id || item.slug === genre.slug) || book.category === genre.name) })).filter((genre) => genre.books.length).slice(0, 4);

  return <main className="bookstore-home">
    <section className="bookstore-hero-stage"><aside className="hero-side hero-side-left"><span>Otros enlaces</span><a href="https://www.american-karaoke.com/" target="_blank" rel="noreferrer" aria-label="Visitar American Karaoke"><img src="/american-karaoke-logo.png" alt="American Karaoke" /></a></aside><div className="hero catalog-hero" style={heroStyle}><div className="hero-copy"><p className="eyebrow">Biblioteca virtual</p><h1><span>Book</span>Store <small>Online</small></h1><p>Descubre historias, autores y colecciones para leer donde quieras.</p></div></div><aside className="hero-side hero-side-right"><WelcomePanel /></aside></section>
    <nav className="book-sections" aria-label="Géneros de Bookstore">{genres.slice(0, 8).map((genre) => <Link key={genre._id} to={`/?genre=${encodeURIComponent(genre.slug)}`}>{genre.name}</Link>)}<Link to="/catalogo">Todos los géneros</Link></nav>
    <section className="home-search container"><label htmlFor="home-search">Buscador</label><div><FiSearch aria-hidden="true" /><input id="home-search" type="search" value={params.get('q') ?? ''} onChange={(event) => update('q', event.target.value)} placeholder="Busca por título o autor" />{hasFilters && <button type="button" onClick={clearFilters} aria-label="Limpiar búsqueda"><FiX /></button>}</div></section>
    <section className="container home-catalog">
      {error && !books.length ? <div className="state error">{error}</div> : loading && !books.length ? <div className="state">Cargando libros…</div> : shelves.length ? shelves.map((shelf) => <BookShelf key={shelf._id} title={shelf.name} books={shelf.books} />) : <><BookShelf title={params.get('q') ? 'Resultados' : 'Todos los libros'} books={books} /></>}
      <div ref={loadMoreRef} className="catalog-scroll-state">{loading ? 'Cargando más libros…' : pagination?.page < pagination?.totalPages ? 'Desliza para ver más' : books.length ? 'Has llegado al final de la colección' : 'No encontramos libros.'}</div>
    </section>
  </main>;
}
