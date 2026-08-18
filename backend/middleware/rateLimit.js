const DEFAULT_WINDOW_MS = 15 * 60 * 1000;
const DEFAULT_MAX = 30;
const buckets = new Map();

const getClientIp = (req) => {
  const forwardedFor = req.headers["x-forwarded-for"];
  if (typeof forwardedFor === "string" && forwardedFor.trim()) {
    return forwardedFor.split(",")[0].trim();
  }

  return req.ip || req.socket?.remoteAddress || "unknown";
};

const cleanupExpiredBuckets = (now) => {
  for (const [key, bucket] of buckets.entries()) {
    if (bucket.resetAt <= now) {
      buckets.delete(key);
    }
  }
};

const createRateLimiter = ({
  keyPrefix,
  windowMs = DEFAULT_WINDOW_MS,
  max = DEFAULT_MAX,
  message = "Demasiados intentos. Intenta nuevamente más tarde.",
} = {}) => {
  if (!keyPrefix) {
    throw new Error("createRateLimiter requiere keyPrefix");
  }

  return (req, res, next) => {
    const now = Date.now();
    const key = `${keyPrefix}:${getClientIp(req)}`;
    let bucket = buckets.get(key);

    if (!bucket || bucket.resetAt <= now) {
      bucket = { count: 0, resetAt: now + windowMs };
      buckets.set(key, bucket);
    }

    bucket.count += 1;

    if (buckets.size > 10000) {
      cleanupExpiredBuckets(now);
    }

    if (bucket.count > max) {
      const retryAfterSeconds = Math.ceil((bucket.resetAt - now) / 1000);
      res.set("Retry-After", String(retryAfterSeconds));
      return res.status(429).json({ message });
    }

    return next();
  };
};

module.exports = {
  createRateLimiter,
};
