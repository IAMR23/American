import { Router } from 'express';
import mongoose from 'mongoose';
import { Author, Background, Book, Comment, CommentReaction, Favorite, Genre, Rating, SiteSetting } from '../models/index.js';
import { authenticate, optionalAuth } from '../middleware/auth.js';
import { ApiError, asyncHandler, escapeRegex, pagination, pageMeta } from '../utils/api.js';

const router = Router();
const sortMap = {
  recent: { addedAt: -1, _id: 1 }, oldest: { addedAt: 1, _id: 1 }, title_asc: { title: 1, _id: 1 }, title_desc: { title: -1, _id: 1 }, rating_desc: { ratingsCount: -1, ratingAverage: -1, _id: 1 }, rating_asc: { ratingsCount: -1, ratingAverage: 1, _id: 1 }, reads: { readsCount: -1, _id: 1 },
};

function publicBookQuery(filter = {}) { return Book.find({ status: 'published', ...filter }).populate('authors', 'name').populate('genres', 'name slug'); }

router.get('/home', asyncHandler(async (_request, response) => {
  const setting = await SiteSetting.findOne({ key: 'homepage' }).lean();
  const selectedGenreIds = (setting?.value?.genreIds || []).filter((id) => mongoose.isValidObjectId(id));
  const genreFilter = selectedGenreIds.length ? { _id: { $in: selectedGenreIds }, active: true } : { active: true };
  const genres = await Genre.find(genreFilter).sort({ name: 1 }).lean();
  const selectedOrder = new Map(selectedGenreIds.map((id, index) => [String(id), index]));
  if (selectedGenreIds.length) genres.sort((left, right) => selectedOrder.get(String(left._id)) - selectedOrder.get(String(right._id)));
  const byGenre = await Promise.all(genres.slice(0, selectedGenreIds.length || 4).map(async (genre) => ({
    genre,
    books: await publicBookQuery({ $or: [{ genres: genre._id }, { category: new RegExp(`^${escapeRegex(genre.name)}$`, 'i') }] }).sort(sortMap.recent).limit(20).lean(),
  })));
  let background = null;
  let secondaryBackground = null;
  if (setting?.value?.backgroundId) background = await Background.findOne({ _id: setting.value.backgroundId, active: true }).lean();
  if (setting?.value?.secondaryBackgroundId) secondaryBackground = await Background.findOne({ _id: setting.value.secondaryBackgroundId, active: true }).lean();
  response.json({ byGenre: byGenre.filter((section) => section.books.length), background, secondaryBackground });
}));

router.get('/genres', asyncHandler(async (_request, response) => {
  const [legacy, categories] = await Promise.all([Genre.find({ active: true }).sort({ name: 1 }).lean(), Book.distinct('category', { status: 'published', category: { $nin: [null, ''] } })]);
  const known = new Set(legacy.map((item) => item.name.toLocaleLowerCase('es')));
  const baseItems = [...legacy, ...categories.filter((name) => !known.has(name.toLocaleLowerCase('es'))).map((name) => ({ _id: `category:${name}`, name, slug: name }))];
  const items = await Promise.all(baseItems.map(async (item) => {
    const byName = { category: new RegExp(`^${escapeRegex(item.name)}$`, 'i') };
    const filter = { status: 'published', $or: [byName] };
    if (mongoose.isValidObjectId(item._id)) filter.$or.push({ genres: item._id });
    return { ...item, booksCount: await Book.countDocuments(filter) };
  }));
  response.json({ items });
}));
router.get('/authors', asyncHandler(async (_request, response) => {
  const [legacy, names] = await Promise.all([Author.find({ active: true }).select('name').sort({ name: 1 }).lean(), Book.distinct('author', { status: 'published', author: { $nin: [null, ''] } })]);
  const known = new Set(legacy.map((item) => item.name.toLocaleLowerCase('es')));
  const items = [...legacy, ...names.filter((name) => !known.has(name.toLocaleLowerCase('es'))).map((name) => ({ _id: name, name }))];
  response.json({ items });
}));
router.get('/home-config', optionalAuth, asyncHandler(async (request, response) => {
  const setting = await SiteSetting.findOne({ key: 'homepage' }).lean();
  let background = request.user?.preferredBackground ? await Background.findOne({ _id: request.user.preferredBackground, active: true }).lean() : null;
  if (!background && setting?.value?.backgroundId) background = await Background.findOne({ _id: setting.value.backgroundId, active: true }).lean();
  const secondaryBackground = setting?.value?.secondaryBackgroundId ? await Background.findOne({ _id: setting.value.secondaryBackgroundId, active: true }).lean() : null;
  response.json({ background, secondaryBackground, selectedGenreIds: (setting?.value?.genreIds || []).map(String) });
}));
router.get('/backgrounds', authenticate, asyncHandler(async (request, response) => {
  const items = await Background.find({ active: true }).sort({ name: 1 }).lean();
  response.json({ items, selectedId: request.user.preferredBackground || null });
}));
router.put('/backgrounds/:id/select', authenticate, asyncHandler(async (request, response) => {
  const background = await Background.findOne({ _id: request.params.id, active: true }).lean();
  if (!background) throw new ApiError(404, 'Fondo no encontrado.');
  request.user.preferredBackground = background._id;
  await request.user.save();
  response.json({ background, selectedId: background._id });
}));
router.get('/books', asyncHandler(async (request, response) => {
  const { page, limit, skip } = pagination(request.query);
  const filter = { status: 'published' };
  if (request.query.genre) {
    const genre = mongoose.isValidObjectId(request.query.genre) ? await Genre.findById(request.query.genre) : await Genre.findOne({ slug: request.query.genre });
    filter.$or = [{ category: new RegExp(`^${escapeRegex(String(request.query.genre))}$`, 'i') }];
    if (genre) filter.$or.push({ genres: genre._id });
  }
  if (request.query.author) {
    const authorFilter = [{ author: new RegExp(`^${escapeRegex(String(request.query.author))}$`, 'i') }];
    if (mongoose.isValidObjectId(request.query.author) && await Author.exists({ _id: request.query.author, active: true })) authorFilter.push({ authors: new mongoose.Types.ObjectId(request.query.author) });
    filter.$and = [{ $or: authorFilter }];
  }
  const term = String(request.query.q ?? '').trim();
  if (term) {
    const regex = new RegExp(escapeRegex(term), 'i');
    const authorIds = await Author.find({ name: regex }).distinct('_id');
    const searchFilter = [{ title: regex }, { author: regex }, { category: regex }, { authors: { $in: authorIds } }];
    if (filter.$or) filter.$and = [...(filter.$and || []), { $or: filter.$or }, { $or: searchFilter }], delete filter.$or;
    else filter.$and = [...(filter.$and || []), { $or: searchFilter }];
  }
  const sortKey = String(request.query.sort ?? 'recent');
  const sort = sortMap[sortKey] ?? sortMap.recent;
  const totalPromise = Book.countDocuments(filter);
  const itemsPromise = sortKey === 'author'
    ? Book.find(filter).select('-pdfRef').populate('authors', 'name').populate('genres', 'name slug').sort({ author: 1, title: 1, _id: 1 }).skip(skip).limit(limit).lean()
    : Book.find(filter).select('-pdfRef').populate('authors', 'name').populate('genres', 'name slug').sort(sort).skip(skip).limit(limit).lean();
  const [items, total] = await Promise.all([itemsPromise, totalPromise]);
  response.json({ items, pagination: pageMeta(page, limit, total) });
}));

router.get('/books/id/:id', optionalAuth, asyncHandler(async (request, response) => {
  const book = await Book.findOne({ _id: request.params.id, status: 'published' }).select('title slug cover imageUrl images').lean();
  if (!book) throw new ApiError(404, 'Libro no encontrado.');
  response.json({ book });
}));
router.get('/books/:slug', optionalAuth, asyncHandler(async (request, response) => {
  const book = await Book.findOne({ slug: request.params.slug, status: 'published' }).select('-pdfRef').populate('authors', 'name biography').populate('genres', 'name slug').lean();
  if (!book) throw new ApiError(404, 'Libro no encontrado.');
  const isFavorite = request.user ? Boolean(await Favorite.exists({ user: request.user._id, book: book._id })) : false;
  response.json({ book, isFavorite });
}));

router.get('/books/:id/ratings', asyncHandler(async (request, response) => {
  const { page, limit, skip } = pagination(request.query, 10);
  const filter = { book: request.params.id, status: 'published' };
  const [items, total] = await Promise.all([Rating.find(filter).populate('user', 'name status').sort({ createdAt: -1, _id: 1 }).skip(skip).limit(limit).lean(), Rating.countDocuments(filter)]);
  response.json({ items: items.map((item) => ({ ...item, user: { ...item.user, name: item.user?.status === 'deleted' ? 'Usuario eliminado' : item.user?.name } })), pagination: pageMeta(page, limit, total) });
}));

router.get('/books/:id/comments', optionalAuth, asyncHandler(async (request, response) => {
  const { page, limit, skip } = pagination(request.query, 10);
  const filter = { book: request.params.id, parent: null, status: 'published' };
  const [roots, total] = await Promise.all([Comment.find(filter).populate('user', 'name status').sort({ createdAt: -1, _id: 1 }).skip(skip).limit(limit).lean(), Comment.countDocuments(filter)]);
  const rootIds = roots.map((item) => item._id);
  const replies = rootIds.length ? await Comment.find({ parent: { $in: rootIds }, status: 'published' }).populate('user', 'name status').sort({ createdAt: 1, _id: 1 }).lean() : [];
  const allComments = [...roots, ...replies];
  const commentIds = allComments.map((item) => item._id);
  const [counts, ownReactions] = await Promise.all([
    commentIds.length ? CommentReaction.aggregate([{ $match: { comment: { $in: commentIds } } }, { $group: { _id: { comment: '$comment', type: '$type' }, count: { $sum: 1 } } }]) : [],
    request.user && commentIds.length ? CommentReaction.find({ user: request.user._id, comment: { $in: commentIds } }).lean() : [],
  ]);
  const countMap = new Map(counts.map((item) => [`${item._id.comment}:${item._id.type}`, item.count]));
  const ownMap = new Map(ownReactions.map((item) => [String(item.comment), item.type]));
  const decorate = (item) => ({ ...item, user: { ...item.user, name: item.user?.status === 'deleted' ? 'Usuario eliminado' : item.user?.name }, reactions: { love: countMap.get(`${item._id}:love`) || 0, dislike: countMap.get(`${item._id}:dislike`) || 0 }, userReaction: ownMap.get(String(item._id)) || null });
  const replyMap = new Map(rootIds.map((rootId) => [String(rootId), []]));
  replies.forEach((reply) => replyMap.get(String(reply.parent))?.push(decorate(reply)));
  response.json({ items: roots.map((item) => ({ ...decorate(item), replies: replyMap.get(String(item._id)) || [] })), pagination: pageMeta(page, limit, total) });
}));
export default router;
