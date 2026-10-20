export class ApiError extends Error {
  constructor(status, message, details) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

export const asyncHandler = (handler) => (request, response, next) =>
  Promise.resolve(handler(request, response, next)).catch(next);

export function pagination(query, defaultLimit = 24) {
  const page = Math.max(1, Number.parseInt(query.page, 10) || 1);
  const max = Number(process.env.MAX_PAGE_SIZE ?? 100);
  const limit = Math.min(max, Math.max(1, Number.parseInt(query.limit, 10) || defaultLimit));
  return { page, limit, skip: (page - 1) * limit };
}

export function pageMeta(page, limit, total) {
  return { page, limit, total, totalPages: Math.ceil(total / limit) };
}

export function escapeRegex(value = '') {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
