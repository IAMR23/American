import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import { ApiError } from '../utils/api.js';

const root = path.resolve(process.env.UPLOAD_DIR ?? 'uploads');
const publicBase = (process.env.UPLOAD_BASE_URL ?? '/uploads').replace(/\/$/, '');

export async function processImage(file, kind) {
  if (!file) throw new ApiError(400, 'Debes adjuntar una imagen.');
  let metadata;
  try { metadata = await sharp(file.buffer).metadata(); } catch { throw new ApiError(415, 'El archivo no es una imagen válida.'); }
  if (!['jpeg', 'png', 'webp', 'avif'].includes(metadata.format)) throw new ApiError(415, 'Formato de imagen no permitido.');
  const folder = kind === 'background' ? 'backgrounds' : 'covers';
  const id = crypto.randomUUID();
  await fs.mkdir(path.join(root, folder), { recursive: true });
  const specs = kind === 'background' ? [['detail', 1920, 1080], ['thumbnail', 480, 270]] : [['detail', 800, 1200], ['thumbnail', 320, 480]];
  const result = { width: metadata.width, height: metadata.height, size: file.size };
  for (const [name, width, height] of specs) {
    const filename = `${id}-${name}.webp`;
    await sharp(file.buffer).rotate().resize(width, height, { fit: 'inside', withoutEnlargement: true }).webp({ quality: 82 }).toFile(path.join(root, folder, filename));
    result[name] = `${publicBase}/${folder}/${filename}`;
  }
  result.original = result.detail;
  return result;
}

export async function removeImage(image) {
  for (const url of new Set([image?.original, image?.detail, image?.thumbnail].filter(Boolean))) {
    const relative = url.replace(publicBase, '').replace(/^[/\\]+/, '');
    const target = path.resolve(root, relative);
    if (target.startsWith(root)) await fs.rm(target, { force: true });
  }
}
