import { Router } from 'express';
import multer from 'multer';
import slugify from 'slugify';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import { Author, Background, Book, Bookmark, Comment, CommentReaction, Favorite, Genre, Rating, ReadingEvent, ReadingProgress, SiteSetting, User } from '../models/index.js';
import { authenticate, requireAdmin } from '../middleware/auth.js';
import { processImage, removeImage } from '../services/images.js';
import { recalculateRating } from '../services/rating.js';
import { ApiError, asyncHandler, escapeRegex, pagination, pageMeta } from '../utils/api.js';

const router = Router();
router.use(authenticate, requireAdmin);
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: Number(process.env.MAX_IMAGE_MB ?? 10) * 1024 * 1024, files: 1 } });
const makeSlug = (value) => slugify(String(value), { lower: true, strict: true, locale: 'es' });

router.get('/dashboard', asyncHandler(async (_request, response) => {
  const [users, books, comments, ratings] = await Promise.all([User.countDocuments({ status: { $ne: 'deleted' } }), Book.countDocuments(), Comment.countDocuments(), Rating.countDocuments()]);
  response.json({ users, books, comments, ratings });
}));

router.get('/books', asyncHandler(async (request, response) => {
  const { page, limit, skip } = pagination(request.query, 20);
  const filter = {};
  if (request.query.status) filter.status = request.query.status;
  if (request.query.q) filter.title = new RegExp(escapeRegex(String(request.query.q)), 'i');
  if (request.query.author) {
    const authorIds = await Author.find({ name: new RegExp(escapeRegex(String(request.query.author)), 'i') }).distinct('_id');
    filter.authors = { $in: authorIds };
  }
  if (request.query.genre) {
    const genreIds = await Genre.find({ name: new RegExp(escapeRegex(String(request.query.genre)), 'i') }).distinct('_id');
    filter.genres = { $in: genreIds };
  }
  if (request.query.year !== undefined && String(request.query.year).trim() !== '') {
    const year = Number(request.query.year);
    if (!Number.isInteger(year) || year < 0 || year > 3000) throw new ApiError(400, 'El año de publicación no es válido.');
    filter.publicationYear = year;
  }
  const [items, total] = await Promise.all([Book.find(filter).select('+pdfRef').populate('authors', 'name').populate('genres', 'name').sort({ updatedAt: -1, _id: 1 }).skip(skip).limit(limit).lean(), Book.countDocuments(filter)]);
  response.json({ items, pagination: pageMeta(page, limit, total) });
}));
router.get('/books/:id', asyncHandler(async (request, response) => { const book = await Book.findById(request.params.id).select('+pdfRef'); if (!book) throw new ApiError(404, 'Libro no encontrado.'); response.json({ book }); }));
router.post('/books', upload.single('cover'), asyncHandler(async (request, response) => {
  const body = request.body;
  const authors = JSON.parse(body.authors ?? '[]'); const genres = JSON.parse(body.genres ?? '[]');
  if (!body.title || !body.synopsis || !authors.length || !genres.length) throw new ApiError(400, 'Título, sinopsis, autores y géneros son obligatorios.');
  const data = { title: body.title, slug: makeSlug(body.slug || body.title), synopsis: body.synopsis, authors, genres, pdfRef: body.pdfRef, publicationYear: body.publicationYear || undefined, status: body.status || 'draft' };
  if (request.file) data.cover = await processImage(request.file, 'cover');
  response.status(201).json({ book: await Book.create(data) });
}));
router.patch('/books/:id', upload.single('cover'), asyncHandler(async (request, response) => {
  const book = await Book.findById(request.params.id).select('+pdfRef'); if (!book) throw new ApiError(404, 'Libro no encontrado.');
  const allowed = ['title', 'synopsis', 'pdfRef', 'publicationYear', 'status'];
  for (const key of allowed) if (request.body[key] !== undefined) book[key] = request.body[key];
  if (request.body.slug || request.body.title) book.slug = makeSlug(request.body.slug || request.body.title);
  for (const key of ['authors', 'genres']) if (request.body[key] !== undefined) book[key] = JSON.parse(request.body[key]);
  if (request.file) { const old = book.cover?.toObject?.() ?? book.cover; book.cover = await processImage(request.file, 'cover'); await removeImage(old); }
  await book.save(); response.json({ book });
}));
router.delete('/books/:id', asyncHandler(async (request, response) => {
  const book = await Book.findByIdAndDelete(request.params.id); if (!book) throw new ApiError(404, 'Libro no encontrado.');
  const commentIds = await Comment.find({ book: book._id }).distinct('_id');
  await Promise.all([Rating.deleteMany({ book: book._id }), Comment.deleteMany({ book: book._id }), CommentReaction.deleteMany({ comment: { $in: commentIds } }), Favorite.deleteMany({ book: book._id }), Bookmark.deleteMany({ book: book._id }), ReadingProgress.deleteMany({ book: book._id }), ReadingEvent.deleteMany({ book: book._id }), removeImage(book.cover)]);
  response.status(204).end();
}));

function crudRoutes(path, Model, hasSlug = false) {
  router.get(`/${path}`, asyncHandler(async (request, response) => { const { page, limit, skip } = pagination(request.query, 50); const filter = request.query.q ? { name: new RegExp(escapeRegex(String(request.query.q)), 'i') } : {}; const [items, total] = await Promise.all([Model.find(filter).sort({ name: 1 }).skip(skip).limit(limit).lean(), Model.countDocuments(filter)]); response.json({ items, pagination: pageMeta(page, limit, total) }); }));
  router.post(`/${path}`, asyncHandler(async (request, response) => { const data = { ...request.body }; if (hasSlug) data.slug = makeSlug(data.slug || data.name); response.status(201).json({ item: await Model.create(data) }); }));
  router.patch(`/${path}/:id`, asyncHandler(async (request, response) => { const data = { ...request.body }; if (hasSlug && (data.slug || data.name)) data.slug = makeSlug(data.slug || data.name); const item = await Model.findByIdAndUpdate(request.params.id, data, { new: true, runValidators: true }); if (!item) throw new ApiError(404, 'Registro no encontrado.'); response.json({ item }); }));
  router.delete(`/${path}/:id`, asyncHandler(async (request, response) => { if (await Book.exists({ [path === 'authors' ? 'authors' : 'genres']: request.params.id })) throw new ApiError(409, 'No se puede eliminar porque tiene libros asociados; desactívalo o reasigna los libros.'); const result = await Model.deleteOne({ _id: request.params.id }); if (!result.deletedCount) throw new ApiError(404, 'Registro no encontrado.'); response.status(204).end(); }));
}
crudRoutes('authors', Author); crudRoutes('genres', Genre, true);

router.get('/users', asyncHandler(async (request, response) => { const { page, limit, skip } = pagination(request.query, 20); const filter = request.query.q ? { $or: [{ name: new RegExp(escapeRegex(String(request.query.q)), 'i') }, { username: new RegExp(escapeRegex(String(request.query.q)), 'i') }, { email: new RegExp(escapeRegex(String(request.query.q)), 'i') }] } : {}; const [items, total] = await Promise.all([User.find(filter).sort({ createdAt: -1, _id: 1 }).skip(skip).limit(limit).lean(), User.countDocuments(filter)]); response.json({ items, pagination: pageMeta(page, limit, total) }); }));
router.post('/users', asyncHandler(async (request, response) => {
  const name = String(request.body.name ?? '').trim();
  const username = String(request.body.username ?? '').trim().toLowerCase();
  const email = String(request.body.email ?? '').trim().toLowerCase();
  const password = String(request.body.password ?? '');
  const role = request.body.role === 'admin' ? 'admin' : 'user';
  const status = ['active', 'suspended'].includes(request.body.status) ? request.body.status : 'active';
  if (name.length < 2 || !/^[a-z0-9._-]{3,30}$/.test(username) || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || password.length < 10) throw new ApiError(400, 'Nombre, alias, correo válido y contraseña de al menos 10 caracteres son obligatorios.');
  if (await User.exists({ $or: [{ username }, { email }] })) throw new ApiError(409, 'El alias o correo ya pertenece a otra cuenta.');
  const user = await User.create({ name, username, email, passwordHash: await bcrypt.hash(password, 12), role, status });
  response.status(201).json({ user: user.toPublicJSON() });
}));
router.patch('/users/:id', asyncHandler(async (request, response) => {
  const user = await User.findById(request.params.id); if (!user) throw new ApiError(404, 'Usuario no encontrado.');
  const nextRole = request.body.role ?? user.role; const nextStatus = request.body.status ?? user.status;
  const losingActiveAdmin = user.role === 'admin' && user.status === 'active' && (nextRole !== 'admin' || nextStatus !== 'active');
  if (losingActiveAdmin && await User.countDocuments({ role: 'admin', status: 'active' }) <= 1) throw new ApiError(409, 'No se puede suspender, eliminar ni degradar al último administrador activo.');
  if (request.body.name !== undefined) user.name = request.body.name;
  if (request.body.username !== undefined) user.username = String(request.body.username).trim().toLowerCase();
  user.role = nextRole; user.status = nextStatus;
  if (request.body.password) user.passwordHash = await bcrypt.hash(String(request.body.password), 12);
  if (user.isModified('status') || user.isModified('role') || request.body.password) user.tokenVersion += 1;
  await user.save(); response.json({ user: user.toPublicJSON() });
}));

router.get('/backgrounds', asyncHandler(async (_request, response) => response.json({ items: await Background.find().sort({ createdAt: -1 }).lean(), setting: await SiteSetting.findOne({ key: 'homepage' }).lean() })));
router.post('/backgrounds', upload.single('image'), asyncHandler(async (request, response) => { const image = await processImage(request.file, 'background'); response.status(201).json({ background: await Background.create({ name: String(request.body.name ?? 'Fondo'), image }) }); }));
router.put('/backgrounds/:id/select', asyncHandler(async (request, response) => { if (!await Background.exists({ _id: request.params.id, active: true })) throw new ApiError(404, 'Fondo no encontrado.'); const setting = await SiteSetting.findOneAndUpdate({ key: 'homepage' }, { value: { backgroundId: request.params.id } }, { new: true, upsert: true }); response.json({ setting }); }));
router.delete('/backgrounds/:id', asyncHandler(async (request, response) => { const background = await Background.findByIdAndDelete(request.params.id); if (!background) throw new ApiError(404, 'Fondo no encontrado.'); await removeImage(background.image); await SiteSetting.updateOne({ key: 'homepage', 'value.backgroundId': background._id }, { $set: { value: { backgroundId: null } } }); response.status(204).end(); }));

router.get('/moderation', asyncHandler(async (request, response) => { const type = request.query.type === 'ratings' ? 'ratings' : 'comments'; const Model = type === 'ratings' ? Rating : Comment; const { page, limit, skip } = pagination(request.query, 20); const [items, total] = await Promise.all([Model.find().populate('user', 'name email status').populate('book', 'title').sort({ createdAt: -1 }).skip(skip).limit(limit).lean(), Model.countDocuments()]); response.json({ type, items, pagination: pageMeta(page, limit, total) }); }));
router.patch('/moderation/:type/:id', asyncHandler(async (request, response) => { const Model = request.params.type === 'ratings' ? Rating : Comment; const item = await Model.findByIdAndUpdate(request.params.id, { status: request.body.status }, { new: true, runValidators: true }); if (!item) throw new ApiError(404, 'Elemento no encontrado.'); if (Model === Rating) await recalculateRating(item.book); response.json({ item }); }));
router.delete('/moderation/:type/:id', asyncHandler(async (request, response) => { const Model = request.params.type === 'ratings' ? Rating : Comment; const item = await Model.findByIdAndDelete(request.params.id); if (!item) throw new ApiError(404, 'Elemento no encontrado.'); if (Model === Rating) await recalculateRating(item.book); else { const replyIds = await Comment.find({ parent: item._id }).distinct('_id'); await Promise.all([Comment.deleteMany({ _id: { $in: replyIds } }), CommentReaction.deleteMany({ comment: { $in: [item._id, ...replyIds] } })]); } response.status(204).end(); }));
export default router;
