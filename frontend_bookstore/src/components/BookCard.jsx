import { Link } from 'react-router-dom';
import { assetUrl } from '../lib/api.js';

export default function BookCard({ book }) {
  return <article className="book-card"><Link to={`/libros/${book.slug}`}><img src={assetUrl(book.cover?.thumbnail || book.imageUrl)} width="320" height="480" loading="lazy" alt={`Portada de ${book.title}`} /><div className="book-card-copy"><p className="eyebrow">{book.category || book.genres?.[0]?.name || 'Colección'}</p><h3>{book.title}</h3><p className="muted clamp">{book.author || book.authors?.map((a) => a.name).join(', ') || 'Autor desconocido'}</p><p className="rating"><span>★</span> {book.ratingsCount ? book.ratingAverage.toFixed(1) : 'Sin valorar'} <small>({book.ratingsCount})</small></p></div></Link></article>;
}
