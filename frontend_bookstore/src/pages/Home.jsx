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
    <div className="shelf-rail-wrap"><button type="button" className="rail-arrow previous" onClick={() => move(-1)} aria-label={`Ver libros anteriores de ${title}`}><FiChevronLeft /></button><div className="shelf-rail" ref={railRef}>{books.map((book) => <Link className="shelf-book" to={`/leer/${book._id}`} key={book._id}><div className="book-cover-hover"><img src={assetUrl(book.cover?.thumbnail || book.imageUrl)} width="220" height="330" loading="lazy" alt={`Portada de ${book.title}`} /><div className="book-mirror-copy"><strong>{book.title}</strong><span>{book.author || book.authors?.map((author) => author.name).join(', ') || 'Autor desconocido'}</span></div></div></Link>)}</div><button type="button" className="rail-arrow next" onClick={() => move(1)} aria-label={`Ver más libros de ${title}`}><FiChevronRight /></button></div>
  </section>;
}

export default function Home() {
  const [params, setParams] = useSearchParams();
  const [books, setBooks] = useState([]);
  const [shelves, setShelves] = useState([]);
  const [genres, setGenres] = useState([]);
  const [background, setBackground] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([api('/catalog/genres'), api('/catalog/home-config')])
      .then(([genreData, config]) => { setGenres(genreData.items); setBackground(config.background); })
      .catch((loadError) => setError(loadError.message));
    const updateBackground = (event) => setBackground(event.detail || null);
    window.addEventListener('book-store-background-changed', updateBackground);
    return () => window.removeEventListener('book-store-background-changed', updateBackground);
  }, []);

  useEffect(() => {
    const query = new URLSearchParams(params);
    const controller = new AbortController();
    setLoading(true); setError('');
    const filtered = Boolean(query.get('q') || query.get('genre') || query.get('author'));
    const request = filtered
      ? (query.set('sort', 'recent'), query.set('limit', '20'), query.set('page', '1'), api(`/catalog/books?${query}`, { signal: controller.signal }))
      : api('/catalog/home', { signal: controller.signal });
    request.then((data) => {
      if (filtered) { setBooks(data.items.slice(0, 20)); setShelves([]); }
      else { setBooks([]); setShelves(data.byGenre || []); if (data.background) setBackground(data.background); }
    }).catch((loadError) => { if (loadError.name !== 'AbortError') setError(loadError.message); }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [params]);

  function update(key, value) {
    const next = new URLSearchParams(params);
    value ? next.set(key, value) : next.delete(key);
    next.delete('page');
    setParams(next, { replace: key === 'q' });
  }

  function clearFilters() { setParams({}); }
  const hasFilters = Boolean(params.get('q') || params.get('genre') || params.get('author'));
  const heroStyle = background?.image?.detail ? { backgroundImage: `linear-gradient(90deg,rgba(13,12,10,.94),rgba(13,12,10,.3)),url(${background.image.detail})` } : undefined;

  return <main className="bookstore-home">
    <section className="bookstore-hero-stage"><aside className="hero-side hero-side-left"><span>Otros enlaces</span><a href="https://www.american-karaoke.com/" target="_blank" rel="noreferrer" aria-label="Visitar American Karaoke"><img src="/american-karaoke-logo.png" alt="American Karaoke" /></a></aside><div className="hero catalog-hero" style={heroStyle}><div className="hero-copy"><p className="eyebrow">Biblioteca virtual</p><h1><span>Book</span>Store <small>Online</small></h1><p>Descubre historias, autores y colecciones para leer donde quieras.</p></div></div><aside className="hero-side hero-side-right"><WelcomePanel /></aside></section>
    <nav className="book-sections" aria-label="Géneros de Bookstore">{genres.slice(0, 8).map((genre) => <Link key={genre._id} to={`/?genre=${encodeURIComponent(genre.slug)}`}>{genre.name}</Link>)}<Link to="/catalogo">Todos los géneros</Link></nav>
    <section className="home-search container"><label htmlFor="home-search">Buscador</label><div><FiSearch aria-hidden="true" /><input id="home-search" type="search" value={params.get('q') ?? ''} onChange={(event) => update('q', event.target.value)} placeholder="Busca por título o autor" />{hasFilters && <button type="button" onClick={clearFilters} aria-label="Limpiar búsqueda"><FiX /></button>}</div></section>
    <section className="container home-catalog">
      {error && !books.length && !shelves.length ? <div className="state error">{error}</div> : loading && !books.length && !shelves.length ? <div className="state">Cargando libros…</div> : hasFilters && books.length ? <BookShelf title="Resultados" books={books} /> : !hasFilters && shelves.length ? shelves.map((shelf) => <BookShelf key={shelf.genre._id} title={shelf.genre.name} books={shelf.books} />) : <div className="state">No encontramos libros.</div>}
    </section>
  </main>;
}
