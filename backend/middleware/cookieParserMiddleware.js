function parseCookieHeader(cookieHeader = "") {
  return cookieHeader.split(";").reduce((cookies, pair) => {
    const separatorIndex = pair.indexOf("=");
    if (separatorIndex === -1) return cookies;

    const key = pair.slice(0, separatorIndex).trim();
    const value = pair.slice(separatorIndex + 1).trim();

    if (key) {
      cookies[key] = decodeURIComponent(value);
    }

    return cookies;
  }, {});
}

let cookieParserMiddleware;

try {
  // Usa cookie-parser cuando la dependencia este instalada en el servidor.
  cookieParserMiddleware = require("cookie-parser")();
} catch {
  // Fallback local para no romper el arranque si aun no se instalo cookie-parser.
  cookieParserMiddleware = (req, _res, next) => {
    req.cookies = parseCookieHeader(req.headers.cookie);
    next();
  };
}

module.exports = cookieParserMiddleware;
