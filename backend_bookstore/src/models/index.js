import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const { Schema, model } = mongoose;
const timestamps = { timestamps: true };

const userSchema = new Schema({
  name: { type: String, required: true, trim: true, maxlength: 100 },
  username: { type: String, required: true, unique: true, lowercase: true, trim: true, minlength: 3, maxlength: 30, match: /^[a-z0-9._-]+$/, index: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
  passwordHash: { type: String, required: true, select: false },
  role: { type: String, enum: ['admin', 'user'], default: 'user', index: true },
  status: { type: String, enum: ['active', 'suspended', 'deleted'], default: 'active', index: true },
  preferredBackground: { type: Schema.Types.ObjectId, ref: 'Background', default: null },
  tokenVersion: { type: Number, default: 0 },
}, timestamps);
userSchema.methods.verifyPassword = function verifyPassword(value) { return bcrypt.compare(value, this.passwordHash); };
userSchema.methods.toPublicJSON = function toPublicJSON() {
  return { id: this.id, name: this.status === 'deleted' ? 'Usuario eliminado' : this.name, username: this.username, email: this.email, role: this.role, status: this.status, createdAt: this.createdAt };
};

const authorSchema = new Schema({
  name: { type: String, required: true, trim: true }, biography: { type: String, trim: true, maxlength: 5000 }, active: { type: Boolean, default: true, index: true },
}, timestamps);
authorSchema.index({ name: 1 }, { unique: true, collation: { locale: 'es', strength: 2 } });

const genreSchema = new Schema({
  name: { type: String, required: true, trim: true }, slug: { type: String, required: true, unique: true, lowercase: true, trim: true }, description: { type: String, trim: true, maxlength: 2000 }, active: { type: Boolean, default: true, index: true },
}, timestamps);
genreSchema.index({ name: 1 }, { unique: true, collation: { locale: 'es', strength: 2 } });

const imageSchema = new Schema({ original: String, detail: String, thumbnail: String, width: Number, height: Number, size: Number }, { _id: false });
const bookSchema = new Schema({
  title: { type: String, required: true, trim: true, maxlength: 250 }, slug: { type: String, required: true, unique: true, lowercase: true, index: true },
  author: { type: String, trim: true, maxlength: 200 }, category: { type: String, trim: true, maxlength: 120, index: true },
  classification: { type: String, enum: ['letras', 'imagenes', 'revistas'], index: true }, imageUrl: { type: String, trim: true },
  images: [{
    url: { type: String, required: true, trim: true },
    fit: { type: String, enum: ['cover', 'contain'], default: 'cover' },
    positionX: { type: Number, min: 0, max: 100, default: 50 },
    positionY: { type: Number, min: 0, max: 100, default: 50 },
  }],
  synopsis: { type: String, trim: true, maxlength: 10000 }, authors: [{ type: Schema.Types.ObjectId, ref: 'Author' }], genres: [{ type: Schema.Types.ObjectId, ref: 'Genre' }],
  cover: imageSchema, pdfRef: { type: String, select: false }, publicationYear: { type: Number, min: 0, max: 3000 }, addedAt: { type: Date, default: Date.now, index: true },
  status: { type: String, enum: ['draft', 'published', 'archived'], default: 'draft', index: true }, readsCount: { type: Number, default: 0, index: true }, ratingAverage: { type: Number, default: 0, index: true }, ratingsCount: { type: Number, default: 0, index: true },
}, timestamps);
bookSchema.index({ title: 'text' });
bookSchema.index({ status: 1, genres: 1, addedAt: -1, _id: 1 });
bookSchema.index({ status: 1, ratingAverage: -1, ratingsCount: -1, _id: 1 });
bookSchema.index({ status: 1, readsCount: -1, _id: 1 });

const ratingSchema = new Schema({ user: { type: Schema.Types.ObjectId, ref: 'User', required: true }, book: { type: Schema.Types.ObjectId, ref: 'Book', required: true }, score: { type: Number, min: 1, max: 5, required: true }, review: { type: String, trim: true, maxlength: 5000 }, status: { type: String, enum: ['published', 'hidden'], default: 'published', index: true } }, timestamps);
ratingSchema.index({ user: 1, book: 1 }, { unique: true });
ratingSchema.index({ book: 1, status: 1, createdAt: -1 });

const commentSchema = new Schema({ user: { type: Schema.Types.ObjectId, ref: 'User', required: true }, book: { type: Schema.Types.ObjectId, ref: 'Book', required: true }, parent: { type: Schema.Types.ObjectId, ref: 'Comment', default: null, index: true }, content: { type: String, required: true, trim: true, maxlength: 3000 }, status: { type: String, enum: ['pending', 'published', 'hidden'], default: 'published', index: true } }, timestamps);
commentSchema.index({ book: 1, parent: 1, status: 1, createdAt: -1 });

const commentReactionSchema = new Schema({ user: { type: Schema.Types.ObjectId, ref: 'User', required: true }, comment: { type: Schema.Types.ObjectId, ref: 'Comment', required: true }, type: { type: String, enum: ['love', 'dislike'], required: true } }, timestamps);
commentReactionSchema.index({ user: 1, comment: 1 }, { unique: true });
commentReactionSchema.index({ comment: 1, type: 1 });

const favoriteSchema = new Schema({ user: { type: Schema.Types.ObjectId, ref: 'User', required: true }, book: { type: Schema.Types.ObjectId, ref: 'Book', required: true } }, { timestamps: { createdAt: true, updatedAt: false } });
favoriteSchema.index({ user: 1, book: 1 }, { unique: true });

const bookmarkSchema = new Schema({ user: { type: Schema.Types.ObjectId, ref: 'User', required: true }, book: { type: Schema.Types.ObjectId, ref: 'Book', required: true }, page: { type: Number, required: true, min: 1 }, name: { type: String, trim: true, maxlength: 200 }, note: { type: String, trim: true, maxlength: 1000 } }, { timestamps: { createdAt: true, updatedAt: false } });
bookmarkSchema.index({ user: 1, book: 1, page: 1 }, { unique: true });

const progressSchema = new Schema({ user: { type: Schema.Types.ObjectId, ref: 'User', required: true }, book: { type: Schema.Types.ObjectId, ref: 'Book', required: true }, lastPage: { type: Number, min: 1, default: 1 }, lastAccessAt: { type: Date, default: Date.now } }, timestamps);
progressSchema.index({ user: 1, book: 1 }, { unique: true });

const readingEventSchema = new Schema({ user: { type: Schema.Types.ObjectId, ref: 'User', required: true }, book: { type: Schema.Types.ObjectId, ref: 'Book', required: true }, windowKey: { type: String, required: true }, openedAt: { type: Date, default: Date.now, expires: Number(process.env.READING_EVENT_RETENTION_SECONDS ?? 7776000) } }, { timestamps: false });
readingEventSchema.index({ user: 1, book: 1, windowKey: 1 }, { unique: true });

const backgroundSchema = new Schema({ name: { type: String, required: true, trim: true }, image: { type: imageSchema, required: true }, active: { type: Boolean, default: true, index: true } }, timestamps);
const homeSectionSchema = new Schema({
  name: { type: String, required: true, trim: true, maxlength: 150, index: true },
  imageUrl: { type: String, required: true, trim: true },
  active: { type: Boolean, default: true, index: true },
}, timestamps);
const settingSchema = new Schema({ key: { type: String, required: true, unique: true }, value: Schema.Types.Mixed }, timestamps);
const passwordResetTokenSchema = new Schema({
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  tokenHash: { type: String, required: true, unique: true },
  expiresAt: { type: Date, required: true, expires: 0 },
}, { timestamps: { createdAt: true, updatedAt: false } });

export const User = model('User', userSchema);
export const Author = model('Author', authorSchema);
export const Genre = model('Genre', genreSchema);
export const Book = model('Book', bookSchema);
export const Rating = model('Rating', ratingSchema);
export const Comment = model('Comment', commentSchema);
export const CommentReaction = model('CommentReaction', commentReactionSchema);
export const Favorite = model('Favorite', favoriteSchema);
export const Bookmark = model('Bookmark', bookmarkSchema);
export const ReadingProgress = model('ReadingProgress', progressSchema);
export const ReadingEvent = model('ReadingEvent', readingEventSchema);
export const Background = model('Background', backgroundSchema);
export const HomeSection = model('HomeSection', homeSectionSchema);
export const SiteSetting = model('SiteSetting', settingSchema);
export const PasswordResetToken = model('PasswordResetToken', passwordResetTokenSchema);
