import jwt from 'jsonwebtoken';
import { User } from '../models/index.js';
import { ApiError, asyncHandler } from '../utils/api.js';

function tokenFrom(request) {
  const bearer = request.headers.authorization?.startsWith('Bearer ') ? request.headers.authorization.slice(7) : null;
  return request.cookies?.session || bearer;
}

export const authenticate = asyncHandler(async (request, _response, next) => {
  const token = tokenFrom(request);
  if (!token) throw new ApiError(401, 'Debes iniciar sesión.');
  let payload;
  try { payload = jwt.verify(token, process.env.JWT_SECRET); } catch { throw new ApiError(401, 'Sesión inválida o vencida.'); }
  const user = await User.findById(payload.sub);
  if (!user || user.status !== 'active' || user.tokenVersion !== payload.version) throw new ApiError(401, 'Tu acceso ya no está activo.');
  request.user = user;
  next();
});

export const optionalAuth = asyncHandler(async (request, _response, next) => {
  const token = tokenFrom(request);
  if (!token) return next();
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(payload.sub);
    if (user?.status === 'active' && user.tokenVersion === payload.version) request.user = user;
  } catch { /* public request continues anonymously */ }
  next();
});

export function requireAdmin(request, _response, next) {
  if (request.user?.role !== 'admin') return next(new ApiError(403, 'Se requiere rol de administrador.'));
  next();
}
