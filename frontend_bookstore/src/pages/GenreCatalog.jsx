import { useEffect, useState } from 'react';
import { FiArrowLeft } from 'react-icons/fi';
import { Link, useParams } from 'react-router-dom';
import { api, assetUrl } from '../lib/api.js';
import WelcomePanel from '../components/WelcomePanel.jsx';

export default function GenreCatalog() {
  const { slug } = useParams();
  const [genreName, setGenreName] = useState('Género');
  const [books, setBooks] = useState([]);
  const [background, setBackground] = useState(null);
  const [secondaryBackground, setSecondaryBackground] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true); setError('');
      try {
        const [genreData, config, firstPage] = await Promise.all([api('/catalog/genres'), api('/catalog/home-config'), api(`/catalog/books?genre=${encodeURIComponent(slug)}&limit=100&page=1&sort=title_asc`)]);
        const selected = (genreData.items || []).find((genre) => String(genre.slug).toLocaleLowerCase('es') === String(slug).toLocaleLowerCase('es'));
        const remainingPages = Array.from({ length: Math.max(0, firstPage.pagination.totalPages - 1) }, (_, index) => index + 2);
        const remaining = await Promise.all(remainingPages.map((page) => api(`/catalog/books?genre=${encodeURIComponent(slug)}&limit=${firstPage.pagination.limit}&page=${page}&sort=title_asc`)));
        if (!active) return;
        setGenreName(selected?.name || slug.replaceAll('-', ' '));
        setBackground(config.background);
        setSecondaryBackground(config.secondaryBackground);
        setBooks([...(firstPage.items || []), ...remaining.flatMap((page) => page.items || [])]);
      } catch (loadError) { if (active) setError(loadError.message); }
      finally { if (active) setLoading(false); }
    }
    load();
    return () => { active = false; };
  }, [slug]);

  const heroStyle = background?.image?.detail ? { backgroundImage: `linear-gradient(90deg,rgba(13,12,10,.94),rgba(13,12,10,.3)),url(${background.image.detail})` } : undefined;
  const secondaryStyle = secondaryBackground?.image?.detail ? { backgroundImage: `url(${secondaryBackground.image.detail})` } : undefined;

  return <main className="bookstore-home genre-books-page">
    <section className="bookstore-hero-stage"><aside className="hero-side hero-side-left"><span>Otros enlaces</span><a href="https://www.american-karaoke.com/" target="_blank" rel="noreferrer" aria-label="Visitar American Karaoke"><img src="/american-karaoke-logo.png" alt="American Karaoke" /></a></aside><div className="hero catalog-hero" style={heroStyle}><div className="hero-copy"><p className="eyebrow">Biblioteca virtual</p><h1><span>Book</span>Store <small>Online</small></h1><p>Explora todos los libros de este género.</p></div></div><aside className="hero-side hero-side-right"><WelcomePanel /></aside></section>
    <div className="secondary-background" style={secondaryStyle}><section className="genre-books-content container">
      <Link className="back-home" to="/"><FiArrowLeft aria-hidden="true" /> Regresar a inicio</Link>
      <h2>Libros {genreName}</h2>
      {error ? <div className="state error">{error}</div> : loading ? <div className="state genre-loading">Cargando libros…</div> : books.length ? <div className="genre-six-grid">{books.map((book) => <Link className="genre-cover" to={`/leer/${book._id}`} key={book._id} aria-label={`Leer ${book.title}`} title={book.title}><img src={assetUrl(book.cover?.thumbnail || book.imageUrl)} width="220" height="330" loading="lazy" alt={`Portada de ${book.title}`} /></Link>)}</div> : <div className="empty">No hay libros disponibles en este género.</div>}
    </section></div>
  </main>;
}
