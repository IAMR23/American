import { useEffect, useState } from 'react';
import { FiHeart, FiMessageCircle, FiThumbsDown } from 'react-icons/fi';
import { Link, useLocation, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { api, assetUrl } from '../lib/api.js';

function CommentCard({ item, user, replyingTo, replyText, setReplyText, onReply, onCancelReply, onPublishReply, onReact, nested = false }) {
  return <article className={`conversation-comment ${nested ? 'reply' : ''}`}>
    <div className="comment-avatar" aria-hidden="true">{item.user?.name?.charAt(0)?.toUpperCase() || '?'}</div>
    <div className="comment-body">
      <div className="comment-heading"><strong>{item.user?.name || 'Usuario'}</strong><time dateTime={item.createdAt}>{item.createdAt ? new Date(item.createdAt).toLocaleDateString('es-EC', { day: 'numeric', month: 'short', year: 'numeric' }) : ''}</time></div>
      <p>{item.content}</p>
      <div className="comment-actions">
        <button type="button" className={item.userReaction === 'love' ? 'active love' : ''} disabled={!user} onClick={() => onReact(item, 'love')} aria-label="Me encanta"><FiHeart aria-hidden="true" /><span>{item.reactions?.love || 0}</span></button>
        <button type="button" className={item.userReaction === 'dislike' ? 'active dislike' : ''} disabled={!user} onClick={() => onReact(item, 'dislike')} aria-label="No me gusta"><FiThumbsDown aria-hidden="true" /><span>{item.reactions?.dislike || 0}</span></button>
        {user && <button type="button" className="reply-action" onClick={() => onReply(item)}><FiMessageCircle aria-hidden="true" /> Responder</button>}
      </div>
      {replyingTo === item._id && <form className="reply-form" onSubmit={(event) => onPublishReply(event, item._id)}><textarea required maxLength="3000" value={replyText} onChange={(event) => setReplyText(event.target.value)} placeholder={`Responder a ${item.user?.name || 'este usuario'}…`} autoFocus /><div><button type="button" onClick={onCancelReply}>Cancelar</button><button type="submit">Publicar respuesta</button></div></form>}
      {!nested && item.replies?.length > 0 && <div className="comment-replies">{item.replies.map((reply) => <CommentCard key={reply._id} item={reply} user={user} replyingTo={replyingTo} replyText={replyText} setReplyText={setReplyText} onReply={onReply} onCancelReply={onCancelReply} onPublishReply={onPublishReply} onReact={onReact} nested />)}</div>}
    </div>
  </article>;
}

export default function BookDetail() {
  const { slug } = useParams();
  const { user } = useAuth();
  const location = useLocation();
  const [book, setBook] = useState(null);
  const [isFavorite, setIsFavorite] = useState(false);
  const [ratings, setRatings] = useState([]);
  const [comments, setComments] = useState([]);
  const [replyingTo, setReplyingTo] = useState('');
  const [replyText, setReplyText] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  async function loadComments(bookId) {
    const data = await api(`/catalog/books/${bookId}/comments`);
    setComments(data.items);
  }

  useEffect(() => {
    api(`/catalog/books/${slug}`).then(({ book: value, isFavorite: saved }) => {
      setBook(value); setIsFavorite(Boolean(saved));
      return Promise.all([api(`/catalog/books/${value._id}/ratings`), api(`/catalog/books/${value._id}/comments`)]);
    }).then(([ratingData, commentData]) => { setRatings(ratingData.items); setComments(commentData.items); }).catch((loadError) => setError(loadError.message));
  }, [slug]);

  if (error) return <main className="state error">{error}</main>;
  if (!book) return <main className="state">Abriendo ficha…</main>;

  const protectedLink = (label, to) => user ? <Link className="button" to={to}>{label}</Link> : <Link className="button" to="/acceso" state={{ from: location.pathname }}>Inicia sesión para {label.toLowerCase()}</Link>;

  async function favorite() {
    try {
      const nextFavorite = !isFavorite;
      await api(`/me/books/${book._id}/favorite`, { method: nextFavorite ? 'PUT' : 'DELETE' });
      setIsFavorite(nextFavorite);
      setMessage(nextFavorite ? 'Guardado en tus favoritos.' : 'Eliminado de tus favoritos.');
    } catch (favoriteError) { setMessage(favoriteError.message); }
  }

  async function rate(event) {
    event.preventDefault();
    const values = Object.fromEntries(new FormData(event.currentTarget));
    try {
      await api(`/me/books/${book._id}/rating`, { method: 'PUT', body: values });
      setMessage('Tu valoración se guardó.');
      const data = await api(`/catalog/books/${book._id}/ratings`);
      setRatings(data.items);
    } catch (ratingError) { setMessage(ratingError.message); }
  }

  async function publishComment(event) {
    event.preventDefault();
    const form = event.currentTarget;
    try {
      await api(`/me/books/${book._id}/comments`, { method: 'POST', body: Object.fromEntries(new FormData(form)) });
      form.reset(); setMessage('Comentario publicado.'); await loadComments(book._id);
    } catch (commentError) { setMessage(commentError.message); }
  }

  async function publishReply(event, parentId) {
    event.preventDefault();
    try {
      await api(`/me/books/${book._id}/comments`, { method: 'POST', body: { content: replyText, parentId } });
      setReplyingTo(''); setReplyText(''); setMessage('Respuesta publicada.'); await loadComments(book._id);
    } catch (commentError) { setMessage(commentError.message); }
  }

  async function reactToComment(item, type) {
    try {
      const removing = item.userReaction === type;
      await api(`/me/comments/${item._id}/reaction`, { method: removing ? 'DELETE' : 'PUT', ...(!removing && { body: { type } }) });
      await loadComments(book._id);
    } catch (reactionError) { setMessage(reactionError.message); }
  }

  function startReply(item) { setReplyingTo(item._id); setReplyText(''); }
  function cancelReply() { setReplyingTo(''); setReplyText(''); }

  return <main className="container page">
    <section className="book-hero"><img src={assetUrl(book.cover?.detail || book.imageUrl)} width="800" height="1200" alt={`Portada de ${book.title}`} /><div><p className="eyebrow">{book.category || book.genres?.map((genre) => genre.name).join(' · ')}</p><h1>{book.title}</h1><p className="book-authors">por {book.author || book.authors?.map((author) => author.name).join(', ') || 'Autor desconocido'}</p><p className="rating large"><span>★</span> {book.ratingsCount ? book.ratingAverage.toFixed(1) : 'Sin valorar'} <small>{book.ratingsCount} valoraciones</small></p>{book.synopsis && <p className="synopsis">{book.synopsis}</p>}<div className="actions">{protectedLink('Leer ahora', `/leer/${book._id}`)}{user && <button className={`secondary favorite-button ${isFavorite ? 'active' : ''}`} onClick={favorite} aria-pressed={isFavorite} title={isFavorite ? 'Eliminar de favoritos' : 'Agregar a favoritos'}><FiHeart aria-hidden="true" /> {isFavorite ? 'Guardado' : 'Guardar'}</button>}</div>{message && <p className="notice">{message}</p>}</div></section>
    <div className="discussion"><section><h2>Reseñas</h2>{user && <form className="inline-form" onSubmit={rate}><select name="score" defaultValue="5">{[5, 4, 3, 2, 1].map((number) => <option key={number} value={number}>{number} estrellas</option>)}</select><textarea name="review" placeholder="Tu reseña (opcional)" /><button>Publicar</button></form>}{ratings.length ? ratings.map((rating) => <article className="entry" key={rating._id}><strong>{rating.user?.name}</strong><span className="rating">{'★'.repeat(rating.score)}</span><p>{rating.review || 'Sin texto.'}</p></article>) : <p className="muted">Aún no hay reseñas.</p>}</section>
      <section className="conversation"><div className="conversation-heading"><div><p className="eyebrow">Comunidad</p><h2>Conversación</h2></div><span>{comments.reduce((total, item) => total + 1 + (item.replies?.length || 0), 0)} mensajes</span></div>{user ? <form className="inline-form conversation-form" onSubmit={publishComment}><textarea required name="content" maxLength="3000" placeholder="Comparte una idea o inicia una conversación" /><button>Comentar</button></form> : <p className="muted">Inicia sesión para participar en la conversación.</p>}<div className="conversation-list">{comments.length ? comments.map((item) => <CommentCard key={item._id} item={item} user={user} replyingTo={replyingTo} replyText={replyText} setReplyText={setReplyText} onReply={startReply} onCancelReply={cancelReply} onPublishReply={publishReply} onReact={reactToComment} />) : <p className="muted">Aún no hay comentarios. Sé la primera persona en conversar.</p>}</div></section>
    </div>
  </main>;
}
