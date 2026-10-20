import { Router } from 'express';
import mongoose from 'mongoose';
import { Author, Background, Book, Comment, CommentReaction, Favorite, Genre, Rating, SiteSetting } from '../models/index.js';
import { authenticate, optionalAuth } from '../middleware/auth.js';
import { ApiError, asyncHandler, escapeRegex, pagination, pageMeta } from '../utils/api.js';

const router = Router();
const sortMap = {
  recent: { addedAt: -1, _id: 1 }, oldest: { addedAt: 1, _id: 1 }, title_asc: { title: 1, _id: 1 }, title_desc: { title: -1, _id: 1 }, rating_desc: { ratingsCount: -1, ratingAverage: -1, _id: 1 }, rating_asc: { ratingsCount: -1, ratingAverage: 1, _id: 1 }, reads: { readsCount: -1, _id: 1 },
};

function publicBookQuery() { return Book.find({ status: 'published' }).populate('authors', 'name').populate('genres', 'name slug'); }

router.get('/home', asyncHandler(async (_request, response) => {
  const [mostRead, bestRated, recent, genres, setting] = await Promise.all([
    publicBookQuery().sort(sortMap.reads).limit(8).lean(), publicBookQuery().sort(sortMap.rating_desc).limit(8).lean(), publicBookQuery().sort(sortMap.recent).limit(8).lean(), Genre.find({ active: true }).sort({ name: 1 }).lean(), SiteSetting.findOne({ key: 'homepage' }).lean(),
  ]);
  const byGenre = await Promise.all(genres.slice(0, 8).map(async (genre) => ({ genre, books: await publicBookQuery().where('genres').in([genre._id]).sort(sortMap.recent).limit(6).lean() })));
  let background = null;
  if (setting?.value?.backgroundId) background = await Background.findOne({ _id: setting.value.backgroundId, active: true }).lean();
  response.json({ mostRead, bestRated, recent, byGenre, background });
}));

router.get('/genres', asyncHandler(async (_request, response) => response.json({ items: await Genre.find({ active: true }).sort({ name: 1 }).lean() })));
router.get('/authors', asyncHandler(async (_request, response) => response.json({ items: await Author.find({ active: true }).select('name').sort({ name: 1 }).lean() })));
router.get('/home-config', optionalAuth, asyncHandler(async (request, response) => {
  const setting = await SiteSetting.findOne({ key: 'homepage' }).lean();
  let background = request.user?.preferredBackground ? await Background.findOne({ _id: request.user.preferredBackground, active: true }).lean() : null;
  if (!background && setting?.value?.backgroundId) background = await Background.findOne({ _id: setting.value.backgroundId, active: true }).lean();
  response.json({ background });
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
    if (!genre) return response.json({ items: [], pagination: pageMeta(page, limit, 0) });
    filter.genres = genre._id;
  }
  if (request.query.author) {
    if (!mongoose.isValidObjectId(request.query.author) || !await Author.exists({ _id: request.query.author, active: true })) return response.json({ items: [], pagination: pageMeta(page, limit, 0) });
    filter.authors = new mongoose.Types.ObjectId(request.query.author);
  }
  const term = String(request.query.q ?? '').trim();
  if (term) {
    const regex = new RegExp(escapeRegex(term), 'i');
    const authorIds = await Author.find({ name: regex }).distinct('_id');
    filter.$or = [{ title: regex }, { authors: { $in: authorIds } }];
  }
  const sortKey = String(request.query.sort ?? 'recent');
  const sort = sortMap[sortKey] ?? sortMap.recent;
  const totalPromise = Book.countDocuments(filter);
  const itemsPromise = sortKey === 'author'
    ? Book.aggregate([
      { $match: filter }, { $lookup: { from: 'authors', localField: 'authors', foreignField: '_id', as: 'authors' } },
      { $set: { sortAuthor: { $min: '$authors.name' } } }, { $sort: { sortAuthor: 1, title: 1, _id: 1 } }, { $skip: skip }, { $limit: limit },
      { $lookup: { from: 'genres', localField: 'genres', foreignField: '_id', as: 'genres' } }, { $unset: ['pdfRef', 'sortAuthor'] },
    ])
    : Book.find(filter).select('-pdfRef').populate('authors', 'name').populate('genres', 'name slug').sort(sort).skip(skip).limit(limit).lean();
  const [items, total] = await Promise.all([itemsPromise, totalPromise]);
  response.json({ items, pagination: pageMeta(page, limit, total) });
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
