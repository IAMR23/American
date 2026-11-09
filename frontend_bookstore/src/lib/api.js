export const apiBaseUrl = import.meta.env.VITE_API_URL ?? '/api';

export async function api(path, options = {}) {
  const headers = { ...options.headers };
  if (options.body && !(options.body instanceof FormData)) headers['Content-Type'] = 'application/json';
  const response = await fetch(`${apiBaseUrl}${path}`, { credentials: 'include', ...options, headers, body: options.body && !(options.body instanceof FormData) ? JSON.stringify(options.body) : options.body });
  if (response.status === 204) return null;
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || 'No se pudo completar la solicitud.');
  return data;
}

const fallbackCover = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="320" height="480"%3E%3Crect width="100%25" height="100%25" fill="%231b1a17"/%3E%3Ctext x="50%25" y="50%25" fill="%23c7a96b" text-anchor="middle" font-size="24"%3ESin portada%3C/text%3E%3C/svg%3E';

export const isPrivateDropboxPreview = (value) => /^https?:\/\/previews\.dropbox\.com\//i.test(String(value || '').trim());

export function assetUrl(value) {
  if (!value) return fallbackCover;
  if (isPrivateDropboxPreview(value)) return fallbackCover;
  try {
    const url = new URL(value);
    if (url.hostname === 'dropbox.com' || url.hostname === 'www.dropbox.com') {
      url.searchParams.delete('dl');
      url.searchParams.set('raw', '1');
      return url.toString();
    }
  } catch { return value; }
  return value;
}
