import { Router } from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';
import rateLimit from 'express-rate-limit';
import { PasswordResetToken, User } from '../models/index.js';
import { authenticate } from '../middleware/auth.js';
import { sendPasswordResetEmail } from '../services/email.js';
import { ApiError, asyncHandler } from '../utils/api.js';

const router = Router();
const limiter = rateLimit({ windowMs: 15 * 60_000, limit: Number(process.env.AUTH_RATE_LIMIT ?? 20), standardHeaders: 'draft-8', legacyHeaders: false });
const cookieOptions = () => ({ httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production' && process.env.COOKIE_SECURE !== 'false', maxAge: Number(process.env.JWT_EXPIRES_HOURS ?? 12) * 3_600_000, path: '/' });
const sign = (user) => jwt.sign({ sub: user.id, role: user.role, version: user.tokenVersion }, process.env.JWT_SECRET, { expiresIn: `${Number(process.env.JWT_EXPIRES_HOURS ?? 12)}h` });
const validEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

router.post('/register', limiter, asyncHandler(async (request, response) => {
  const name = String(request.body.name ?? '').trim();
  const username = String(request.body.username ?? '').trim().toLowerCase();
  const email = String(request.body.email ?? '').trim().toLowerCase();
  const password = String(request.body.password ?? '');
  if (name.length < 2 || !/^[a-z0-9._-]{3,30}$/.test(username) || !validEmail(email) || password.length < 10) throw new ApiError(400, 'Nombre, alias válido, correo válido y contraseña de al menos 10 caracteres son obligatorios.');
  const duplicate = await User.findOne({ $or: [{ email }, { username }] }).select('email username').lean();
  if (duplicate) throw new ApiError(409, duplicate.email === email ? 'El correo ya está registrado.' : 'El alias ya está registrado.');
  const user = await User.create({ name, username, email, passwordHash: await bcrypt.hash(password, 12), role: 'user' });
  response.cookie('session', sign(user), cookieOptions()).status(201).json({ user: user.toPublicJSON() });
}));

router.post('/login', limiter, asyncHandler(async (request, response) => {
  const identifier = String(request.body.identifier ?? request.body.email ?? '').trim().toLowerCase();
  const user = await User.findOne({ $or: [{ email: identifier }, { username: identifier }] }).select('+passwordHash');
  if (!user || !(await user.verifyPassword(String(request.body.password ?? '')))) throw new ApiError(401, 'Credenciales incorrectas.');
  if (user.status !== 'active') throw new ApiError(403, 'La cuenta no está activa.');
  response.cookie('session', sign(user), cookieOptions()).json({ user: user.toPublicJSON() });
}));

router.post('/logout', (_request, response) => response.clearCookie('session', { path: '/' }).status(204).end());
router.get('/me', authenticate, (request, response) => response.json({ user: request.user.toPublicJSON() }));

router.post('/forgot-password', limiter, asyncHandler(async (request, response) => {
  const identifier = String(request.body.identifier ?? '').trim().toLowerCase();
  const genericMessage = 'Si existe una cuenta activa con esos datos, recibirás un enlace para recuperar tu contraseña.';
  if (!identifier) throw new ApiError(400, 'Ingresa tu alias o correo.');
  const user = await User.findOne({ status: 'active', $or: [{ email: identifier }, { username: identifier }] });
  if (user) {
    const token = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    await PasswordResetToken.deleteMany({ user: user._id });
    await PasswordResetToken.create({ user: user._id, tokenHash, expiresAt: new Date(Date.now() + 30 * 60_000) });
    const frontendUrl = (process.env.FRONTEND_URL ?? 'http://localhost:5173').replace(/\/$/, '');
    try {
      await sendPasswordResetEmail({ email: user.email, name: user.name, resetUrl: `${frontendUrl}/restablecer-contrasena?token=${token}` });
    } catch (error) {
      console.error('No se pudo enviar el correo de recuperación:', error.message);
    }
  }
  response.json({ message: genericMessage });
}));

router.post('/reset-password', limiter, asyncHandler(async (request, response) => {
  const token = String(request.body.token ?? '');
  const password = String(request.body.password ?? '');
  if (!token || password.length < 10) throw new ApiError(400, 'El enlace y una contraseña de al menos 10 caracteres son obligatorios.');
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  const resetToken = await PasswordResetToken.findOne({ tokenHash, expiresAt: { $gt: new Date() } });
  if (!resetToken) throw new ApiError(400, 'El enlace de recuperación es inválido o ya venció.');
  const user = await User.findOne({ _id: resetToken.user, status: 'active' });
  if (!user) throw new ApiError(400, 'El enlace de recuperación es inválido o ya venció.');
  user.passwordHash = await bcrypt.hash(password, 12);
  user.tokenVersion += 1;
  await user.save();
  await PasswordResetToken.deleteMany({ user: user._id });
  response.clearCookie('session', { path: '/' }).json({ message: 'Tu contraseña fue actualizada. Ya puedes iniciar sesión.' });
}));
export default router;
