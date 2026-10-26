import test, { after, before, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import request from 'supertest';
import sharp from 'sharp';
import { MongoMemoryServer } from 'mongodb-memory-server';

process.env.NODE_ENV = 'test'; process.env.JWT_SECRET = 'test-secret-with-more-than-thirty-two-characters'; process.env.COOKIE_SECURE = 'false';
process.env.AUTH_RATE_LIMIT = '1000';
process.env.UPLOAD_DIR = await fs.mkdtemp(path.join(os.tmpdir(), 'book-store-test-')); process.env.UPLOAD_BASE_URL = '/uploads';
const [{ default: app }, models, { processImage }] = await Promise.all([import('../app.js'), import('../models/index.js'), import('../services/images.js')]);
const { User, Author, Genre, Book, Favorite, Rating, CommentReaction, Bookmark, ReadingProgress, PasswordResetToken, Background } = models;
let mongo; let userAgent; let adminAgent; let book; let secondUser; let author;

before(async () => { mongo = await MongoMemoryServer.create(); await mongoose.connect(mongo.getUri()); });
after(async () => { await mongoose.disconnect(); await mongo.stop(); await fs.rm(process.env.UPLOAD_DIR, { recursive: true, force: true }); });
beforeEach(async () => {
  await mongoose.connection.dropDatabase(); await Promise.all(Object.values(mongoose.models).map((model) => model.syncIndexes()));
  const passwordHash = await bcrypt.hash('Password-123!', 4);
  const [user, admin] = await User.create([{ name: 'Lector', username: 'lector', email: 'reader@example.com', passwordHash }, { name: 'Admin', username: 'admin', email: 'admin@example.com', passwordHash, role: 'admin' }]);
  secondUser = await User.create({ name: 'Otra', username: 'otra', email: 'other@example.com', passwordHash });
  author = await Author.create({ name: 'Borges' }); const genre = await Genre.create({ name: 'Ficción', slug: 'ficcion' });
  book = await Book.create({ title: 'El Aleph', slug: 'el-aleph', synopsis: 'Relatos', authors: [author._id], genres: [genre._id], publicationYear: 1949, status: 'published', pdfRef: 'https://www.dropbox.com/s/test/book.pdf?dl=0' });
  userAgent = request.agent(app); adminAgent = request.agent(app);
  await userAgent.post('/api/auth/login').send({ identifier: user.username, password: 'Password-123!' }).expect(200);
  await adminAgent.post('/api/auth/login').send({ identifier: admin.email, password: 'Password-123!' }).expect(200);
});

test('alias y correo no se pueden repetir', async () => {
  await request(app).post('/api/auth/register').send({ name: 'Duplicado', username: 'lector', email: 'nuevo@example.com', password: 'Password-123!' }).expect(409);
  await request(app).post('/api/auth/register').send({ name: 'Duplicado', username: 'nuevo', email: 'reader@example.com', password: 'Password-123!' }).expect(409);
});

test('el restablecimiento usa un token temporal una sola vez', async () => {
  const user = await User.findOne({ username: 'lector' });
  const token = crypto.randomBytes(32).toString('hex');
  await PasswordResetToken.create({ user: user._id, tokenHash: crypto.createHash('sha256').update(token).digest('hex'), expiresAt: new Date(Date.now() + 60_000) });
  await request(app).post('/api/auth/reset-password').send({ token, password: 'Nueva-clave-123!' }).expect(200);
  await request(app).post('/api/auth/reset-password').send({ token, password: 'Otra-clave-123!' }).expect(400);
  await request(app).post('/api/auth/login').send({ identifier: 'lector', password: 'Password-123!' }).expect(401);
  await request(app).post('/api/auth/login').send({ identifier: 'lector', password: 'Nueva-clave-123!' }).expect(200);
});

test('el PDF exige sesión y los endpoints admin exigen rol', async () => {
  await request(app).get(`/api/me/books/${book.id}/read`).expect(401);
  await userAgent.get('/api/admin/users').expect(403);
  await adminAgent.get('/api/admin/users').expect(200);
  const newAdmin = { name: 'Segundo Admin', username: 'admin2', email: 'admin2@example.com', password: 'Password-123!', role: 'admin', status: 'active' };
  await userAgent.post('/api/admin/users').send(newAdmin).expect(403);
  const response = await adminAgent.post('/api/admin/users').send(newAdmin).expect(201);
  assert.equal(response.body.user.role, 'admin');
});

test('favoritos y valoraciones son únicos por usuario y libro', async () => {
  await userAgent.put(`/api/me/books/${book.id}/favorite`).expect(201); await userAgent.put(`/api/me/books/${book.id}/favorite`).expect(201);
  assert.equal(await Favorite.countDocuments(), 1);
  assert.equal((await userAgent.get(`/api/catalog/books/${book.slug}`).expect(200)).body.isFavorite, true);
  assert.equal((await request(app).get(`/api/catalog/books/${book.slug}`).expect(200)).body.isFavorite, false);
  await userAgent.delete(`/api/me/books/${book.id}/favorite`).expect(204);
  assert.equal((await userAgent.get(`/api/catalog/books/${book.slug}`).expect(200)).body.isFavorite, false);
  await userAgent.put(`/api/me/books/${book.id}/rating`).send({ score: 4 }).expect(200); await userAgent.put(`/api/me/books/${book.id}/rating`).send({ score: 5 }).expect(200);
  assert.equal(await Rating.countDocuments(), 1); assert.equal((await Book.findById(book.id)).ratingAverage, 5);
});

test('marcadores y progreso permanecen separados por usuario', async () => {
  await Bookmark.create([{ user: secondUser._id, book: book._id, page: 8 }, { user: (await User.findOne({ email: 'reader@example.com' }))._id, book: book._id, page: 8 }]);
  await ReadingProgress.create([{ user: secondUser._id, book: book._id, lastPage: 10 }, { user: (await User.findOne({ email: 'reader@example.com' }))._id, book: book._id, lastPage: 2 }]);
  assert.equal(await Bookmark.countDocuments({ book: book._id }), 2); assert.equal((await userAgent.get(`/api/me/books/${book.id}/progress`)).body.progress.lastPage, 2);
  await userAgent.post(`/api/me/books/${book.id}/bookmarks`).send({ page: 14, name: 'Capítulo importante' }).expect(201);
  const marks = await userAgent.get(`/api/me/books/${book.id}/bookmarks`).expect(200);
  assert.equal(marks.body.items.find((item) => item.page === 14).name, 'Capítulo importante');
});

test('una lectura se cuenta una vez por ventana', async () => {
  const originalFetch = global.fetch; global.fetch = async () => new Response(Buffer.from('%PDF-1.4\n%%EOF'), { headers: { 'content-type': 'application/binary', 'content-disposition': 'attachment; filename="book.pdf"' } });
  try {
    const response = await userAgent.get(`/api/me/books/${book.id}/read`).expect('content-type', /application\/pdf/).expect(200);
    assert.match(response.body.toString(), /^%PDF-/);
    await userAgent.get(`/api/me/books/${book.id}/read`).expect(200);
    assert.equal((await Book.findById(book.id)).readsCount, 1);
  } finally { global.fetch = originalFetch; }
});

test('búsqueda, filtro y paginación se ejecutan en backend', async () => {
  const response = await request(app).get(`/api/catalog/books?q=aleph&genre=ficcion&author=${author.id}&limit=1&page=1&sort=author`).expect(200);
  assert.equal(response.body.items.length, 1); assert.deepEqual(response.body.pagination, { page: 1, limit: 1, total: 1, totalPages: 1 });
});

test('administración filtra libros y ya no expone el CRUD de autores', async () => {
  const response = await adminAgent.get('/api/admin/books?q=aleph&author=borg&genre=fic&year=1949&limit=1&page=1').expect(200);
  assert.equal(response.body.items.length, 1);
  assert.equal(response.body.items[0].title, 'El Aleph');
  assert.deepEqual(response.body.pagination, { page: 1, limit: 1, total: 1, totalPages: 1 });
  await adminAgent.get('/api/admin/authors?q=borg&limit=10&page=1').expect(404);
  assert.equal((await adminAgent.get('/api/admin/categories?q=fic&limit=10&page=1').expect(200)).body.items[0].name, 'Ficción');
});

test('un usuario normal puede guardar y aplicar su fondo personal', async () => {
  const background = await Background.create({ name: 'Biblioteca azul', active: true, image: { detail: '/uploads/backgrounds/blue.webp', thumbnail: '/uploads/backgrounds/blue-thumb.webp' } });
  await request(app).put(`/api/catalog/backgrounds/${background.id}/select`).expect(401);
  const list = await userAgent.get('/api/catalog/backgrounds').expect(200);
  assert.equal(list.body.items[0].name, 'Biblioteca azul');
  await userAgent.put(`/api/catalog/backgrounds/${background.id}/select`).expect(200);
  const config = await userAgent.get('/api/catalog/home-config').expect(200);
  assert.equal(config.body.background.name, 'Biblioteca azul');
  assert.equal(String((await User.findOne({ username: 'lector' })).preferredBackground), background.id);
});

test('los usuarios pueden responder y reaccionar a comentarios', async () => {
  const root = (await userAgent.post(`/api/me/books/${book.id}/comments`).send({ content: '¿Qué opinan de este cuento?' }).expect(201)).body.comment;
  await adminAgent.post(`/api/me/books/${book.id}/comments`).send({ content: 'Me encantó el final.', parentId: root._id }).expect(201);
  await userAgent.put(`/api/me/comments/${root._id}/reaction`).send({ type: 'love' }).expect(200);
  await adminAgent.put(`/api/me/comments/${root._id}/reaction`).send({ type: 'dislike' }).expect(200);
  const thread = (await userAgent.get(`/api/catalog/books/${book.id}/comments`).expect(200)).body.items[0];
  assert.equal(thread.replies[0].content, 'Me encantó el final.');
  assert.deepEqual(thread.reactions, { love: 1, dislike: 1 });
  assert.equal(thread.userReaction, 'love');
  await userAgent.delete(`/api/me/comments/${root._id}/reaction`).expect(204);
  assert.equal(await CommentReaction.countDocuments({ comment: root._id }), 1);
});

test('las imágenes reales se convierten y persisten como WebP', async () => {
  const buffer = await sharp({ create: { width: 20, height: 30, channels: 3, background: '#aa2222' } }).png().toBuffer();
  const image = await processImage({ buffer, size: buffer.length }, 'cover');
  assert.match(image.thumbnail, /\.webp$/); await fs.access(path.join(process.env.UPLOAD_DIR, image.thumbnail.replace('/uploads/', '')));
});
