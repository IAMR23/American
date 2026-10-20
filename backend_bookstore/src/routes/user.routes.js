import { Router } from 'express';
import mongoose from 'mongoose';
import { Bookmark, Book, Comment, CommentReaction, Favorite, Rating, ReadingEvent, ReadingProgress } from '../models/index.js';
import { authenticate } from '../middleware/auth.js';
import { recalculateRating } from '../services/rating.js';
import { ApiError, asyncHandler } from '../utils/api.js';

const router = Router();
router.use(authenticate);
const PDF_CONTENT_TYPES = new Set(['application/pdf', 'application/octet-stream', 'application/binary', 'application/x-download']);

function isAllowedPdfHost(hostname, allowedHosts) {
  return allowedHosts.includes(hostname) || hostname === 'dropboxusercontent.com' || hostname.endsWith('.dropboxusercontent.com');
}

function isPdfResponse(upstream) {
  const contentType = (upstream.headers.get('content-type') ?? '').split(';', 1)[0].trim().toLowerCase();
  const disposition = upstream.headers.get('content-disposition') ?? '';
  return PDF_CONTENT_TYPES.has(contentType) || /filename\*?=[^;]*\.pdf(?:["']|$)/i.test(disposition);
}

const publishedBook = async (id, includePdf = false) => {
  const query = Book.findOne({ _id: id, status: 'published' });
  if (includePdf) query.select('+pdfRef');
  const book = await query;
  if (!book) throw new ApiError(404, 'Libro no encontrado o no publicado.');
  return book;
};

router.get('/library', asyncHandler(async (request, response) => {
  const [favorites, progress] = await Promise.all([Favorite.find({ user: request.user._id }).populate({ path: 'book', select: '-pdfRef', populate: { path: 'authors', select: 'name' } }).sort({ createdAt: -1 }).lean(), ReadingProgress.find({ user: request.user._id }).populate({ path: 'book', select: '-pdfRef', populate: { path: 'authors', select: 'name' } }).sort({ lastAccessAt: -1 }).lean()]);
  response.json({ favorites, progress });
}));

router.put('/books/:id/favorite', asyncHandler(async (request, response) => {
  await publishedBook(request.params.id);
  const item = await Favorite.findOneAndUpdate({ user: request.user._id, book: request.params.id }, { $setOnInsert: { user: request.user._id, book: request.params.id } }, { new: true, upsert: true });
  response.status(201).json({ favorite: item });
}));
router.delete('/books/:id/favorite', asyncHandler(async (request, response) => { await Favorite.deleteOne({ user: request.user._id, book: request.params.id }); response.status(204).end(); }));

router.get('/books/:id/bookmarks', asyncHandler(async (request, response) => response.json({ items: await Bookmark.find({ user: request.user._id, book: request.params.id }).sort({ page: 1 }).lean() })));
router.post('/books/:id/bookmarks', asyncHandler(async (request, response) => {
  await publishedBook(request.params.id);
  const page = Number(request.body.page);
  if (!Number.isInteger(page) || page < 1) throw new ApiError(400, 'La página debe ser un entero positivo.');
  const item = await Bookmark.findOneAndUpdate({ user: request.user._id, book: request.params.id, page }, { name: String(request.body.name ?? '').trim(), note: String(request.body.note ?? '').trim() }, { new: true, upsert: true, runValidators: true });
  response.status(201).json({ bookmark: item });
}));
router.delete('/bookmarks/:id', asyncHandler(async (request, response) => { await Bookmark.deleteOne({ _id: request.params.id, user: request.user._id }); response.status(204).end(); }));

router.get('/books/:id/progress', asyncHandler(async (request, response) => response.json({ progress: await ReadingProgress.findOne({ user: request.user._id, book: request.params.id }).lean() })));
router.put('/books/:id/progress', asyncHandler(async (request, response) => {
  const lastPage = Number(request.body.lastPage);
  if (!Number.isInteger(lastPage) || lastPage < 1) throw new ApiError(400, 'Página inválida.');
  const progress = await ReadingProgress.findOneAndUpdate({ user: request.user._id, book: request.params.id }, { lastPage, lastAccessAt: new Date() }, { new: true, upsert: true, runValidators: true });
  response.json({ progress });
}));

router.put('/books/:id/rating', asyncHandler(async (request, response) => {
  await publishedBook(request.params.id);
  const score = Number(request.body.score);
  if (!Number.isInteger(score) || score < 1 || score > 5) throw new ApiError(400, 'La puntuación debe estar entre 1 y 5.');
  const rating = await Rating.findOneAndUpdate({ user: request.user._id, book: request.params.id }, { score, review: String(request.body.review ?? '').trim(), status: 'published' }, { new: true, upsert: true, runValidators: true });
  await recalculateRating(new mongoose.Types.ObjectId(request.params.id));
  response.json({ rating });
}));
router.delete('/books/:id/rating', asyncHandler(async (request, response) => { await Rating.deleteOne({ user: request.user._id, book: request.params.id }); await recalculateRating(new mongoose.Types.ObjectId(request.params.id)); response.status(204).end(); }));

router.post('/books/:id/comments', asyncHandler(async (request, response) => {
  await publishedBook(request.params.id);
  const content = String(request.body.content ?? '').trim();
  if (!content) throw new ApiError(400, 'El comentario no puede estar vacío.');
  let parent = null;
  if (request.body.parentId) {
    const parentComment = await Comment.findOne({ _id: request.body.parentId, book: request.params.id, status: 'published' });
    if (!parentComment) throw new ApiError(404, 'El comentario al que intentas responder no existe.');
    parent = parentComment.parent || parentComment._id;
  }
  response.status(201).json({ comment: await Comment.create({ user: request.user._id, book: request.params.id, parent, content }) });
}));
router.put('/comments/:id/reaction', asyncHandler(async (request, response) => {
  const type = String(request.body.type ?? '');
  if (!['love', 'dislike'].includes(type)) throw new ApiError(400, 'Reacción no válida.');
  if (!await Comment.exists({ _id: request.params.id, status: 'published' })) throw new ApiError(404, 'Comentario no encontrado.');
  const reaction = await CommentReaction.findOneAndUpdate({ user: request.user._id, comment: request.params.id }, { type }, { new: true, upsert: true, runValidators: true });
  response.json({ reaction });
}));
router.delete('/comments/:id/reaction', asyncHandler(async (request, response) => { await CommentReaction.deleteOne({ user: request.user._id, comment: request.params.id }); response.status(204).end(); }));
router.patch('/comments/:id', asyncHandler(async (request, response) => {
  const content = String(request.body.content ?? '').trim();
  const comment = await Comment.findOneAndUpdate({ _id: request.params.id, user: request.user._id }, { content }, { new: true, runValidators: true });
  if (!comment) throw new ApiError(404, 'Comentario no encontrado.');
  response.json({ comment });
}));
router.delete('/comments/:id', asyncHandler(async (request, response) => { const result = await Comment.deleteOne({ _id: request.params.id, user: request.user._id }); if (!result.deletedCount) throw new ApiError(404, 'Comentario no encontrado.'); await CommentReaction.deleteMany({ comment: request.params.id }); response.status(204).end(); }));

async function countReading(userId, bookId) {
  const hours = Math.max(1, Number(process.env.READING_WINDOW_HOURS ?? 24));
  const windowKey = String(Math.floor(Date.now() / (hours * 3_600_000)));
  try {
    await ReadingEvent.create({ user: userId, book: bookId, windowKey });
    await Book.updateOne({ _id: bookId }, { $inc: { readsCount: 1 } });
    return true;
  } catch (error) {
    if (error.code === 11000) return false;
    throw error;
  }
}

router.get('/books/:id/read', asyncHandler(async (request, response) => {
  const book = await publishedBook(request.params.id, true);
  if (!book.pdfRef) throw new ApiError(404, 'Este libro todavía no tiene PDF.');
  let url;
  try { url = new URL(book.pdfRef); } catch { throw new ApiError(500, 'Referencia de PDF inválida.'); }
  const allowed = (process.env.PDF_ALLOWED_HOSTS ?? 'dropbox.com,www.dropbox.com,dl.dropboxusercontent.com').split(',').map((value) => value.trim());
  if (url.protocol !== 'https:' || !allowed.includes(url.hostname)) throw new ApiError(403, 'El origen del PDF no está permitido.');
  if (url.hostname.endsWith('dropbox.com')) { url.searchParams.set('dl', '1'); url.searchParams.delete('raw'); }
  const headers = {};
  if (request.headers.range) headers.Range = request.headers.range;
  const upstream = await fetch(url, { headers, redirect: 'follow' });
  if (!upstream.ok && upstream.status !== 206) throw new ApiError(502, 'No se pudo obtener el PDF desde Dropbox.');
  if (upstream.url) {
    let finalUrl;
    try { finalUrl = new URL(upstream.url); } catch { throw new ApiError(502, 'Dropbox devolvió una redirección inválida.'); }
    if (finalUrl.protocol !== 'https:' || !isAllowedPdfHost(finalUrl.hostname, allowed)) throw new ApiError(502, 'Dropbox redirigió a un origen no permitido.');
  }
  if (!isPdfResponse(upstream)) throw new ApiError(502, 'Dropbox no devolvió un PDF.');
  await countReading(request.user._id, book._id);
  response.setHeader('content-type', 'application/pdf');
  response.setHeader('x-content-type-options', 'nosniff');
  for (const name of ['content-length', 'content-range', 'accept-ranges', 'etag']) { const value = upstream.headers.get(name); if (value) response.setHeader(name, value); }
  response.status(upstream.status);
  const { Readable } = await import('node:stream');
  Readable.fromWeb(upstream.body).pipe(response);
}));
export default router;
