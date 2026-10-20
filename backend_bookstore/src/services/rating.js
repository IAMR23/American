import { Book, Rating } from '../models/index.js';

export async function recalculateRating(bookId) {
  const [stats] = await Rating.aggregate([
    { $match: { book: bookId, status: 'published' } },
    { $group: { _id: '$book', average: { $avg: '$score' }, count: { $sum: 1 } } },
  ]);
  await Book.findByIdAndUpdate(bookId, { ratingAverage: stats?.average ?? 0, ratingsCount: stats?.count ?? 0 });
}
