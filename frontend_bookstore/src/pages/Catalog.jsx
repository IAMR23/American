import { useEffect, useState } from 'react';
import { FiArrowLeft, FiChevronDown } from 'react-icons/fi';
import { Link } from 'react-router-dom';
import { api } from '../lib/api.js';
import WelcomePanel from '../components/WelcomePanel.jsx';

const columns = [
  { key: 'genres', title: 'Géneros' },
  { key: 'radio', title: 'Radio novelas' },
  { key: 'audio', title: 'Audio libros' },
  { key: 'others', title: 'Otros' },
];

export default function Catalog() {
  const [genres, setGenres] = useState([]);
  const [background, setBackground] = useState(null);
  const [secondaryBackground, setSecondaryBackground] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([api('/catalog/genres'), api('/catalog/home-config')])
      .then(([genreData, config]) => { setGenres(genreData.items || []); setBackground(config.background); setSecondaryBackground(config.secondaryBackground); })
      .catch((loadError) => setError(loadError.message));
  }, []);

  const heroStyle = background?.image?.detail ? { backgroundImage: `linear-gradient(90deg,rgba(13,12,10,.94),rgba(13,12,10,.3)),url(${background.image.detail})` } : undefined;
  const secondaryStyle = secondaryBackground?.image?.detail ? { backgroundImage: `url(${secondaryBackground.image.detail})` } : undefined;

  return <main className="bookstore-home all-content-page">
    <section className="bookstore-hero-stage"><aside className="hero-side hero-side-left"><span>Otros enlaces</span><a href="https://www.american-karaoke.com/" target="_blank" rel="noreferrer" aria-label="Visitar American Karaoke"><img src="/american-karaoke-logo.png" alt="American Karaoke" /></a></aside><div className="hero catalog-hero" style={heroStyle}><div className="hero-copy"><p className="eyebrow">Biblioteca virtual</p><h1><span>Book</span>Store <small>Online</small></h1><p>Descubre todo el contenido disponible.</p></div></div><aside className="hero-side hero-side-right"><WelcomePanel /></aside></section>
    <div className="secondary-background" style={secondaryStyle}><section className="all-content container">
      <Link className="back-home" to="/"><FiArrowLeft aria-hidden="true" /> Regresar a inicio</Link>
      <h2>Todo el contenido</h2>
      {error && <p className="notice error">{error}</p>}
      <div className="content-columns">
        {columns.map((column) => <section className="content-column" key={column.key}>
          <header><h3>{column.title}</h3><FiChevronDown aria-hidden="true" /></header>
          {column.key === 'genres' && <div className="content-column-list">{genres.map((genre) => <Link to={`/generos/${encodeURIComponent(genre.slug)}`} key={genre._id}><span>{genre.name}</span><strong>{genre.booksCount ?? 0}</strong></Link>)}</div>}
        </section>)}
      </div>
    </section></div>
  </main>;
}
