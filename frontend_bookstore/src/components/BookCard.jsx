import { Link } from 'react-router-dom';
import { assetUrl } from '../lib/api.js';

export default function BookCard({ book }) {
  const author = book.author || book.authors?.map((value) => value.name).join(', ') || 'Autor desconocido';
  return <article className="book-card"><Link to={`/leer/${book._id}`}><div className="book-cover-hover"><img src={assetUrl(book.cover?.thumbnail || book.imageUrl)} width="320" height="480" loading="lazy" alt={`Portada de ${book.title}`} /><div className="book-mirror-copy"><strong>{book.title}</strong><span>{author}</span></div></div><div className="book-card-copy"><p className="eyebrow">{book.category || book.genres?.[0]?.name || 'Colección'}</p><p className="rating"><span>★</span> {book.ratingsCount ? book.ratingAverage.toFixed(1) : 'Sin valorar'} <small>({book.ratingsCount})</small></p></div></Link></article>;
}
