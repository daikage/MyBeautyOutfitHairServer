/**
 * Photo upload handling for new styles (multer -> disk storage).
 * Uploaded files are served back at /uploads/<filename>.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import multer from 'multer';
import { slugify } from '../db.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const uploadsDir = path.resolve(__dirname, '..', '..', 'uploads');
fs.mkdirSync(uploadsDir, { recursive: true });

/** Accepted mime types -> canonical file extension. */
export const IMAGE_TYPES = {
  'image/jpeg': '.jpg',
  'image/pjpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/avif': '.avif',
  'image/gif': '.gif',
};

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const ext = IMAGE_TYPES[file.mimetype] || '.jpg';
    const base = slugify(req.body?.name || file.originalname.replace(/\.[^.]+$/, ''));
    cb(null, `${base}-${Date.now().toString(36)}${ext}`);
  },
});

export const upload = multer({
  storage,
  limits: { fileSize: 8 * 1024 * 1024, files: 1 },
  fileFilter: (req, file, cb) => {
    if (IMAGE_TYPES[file.mimetype]) return cb(null, true);
    const error = new Error('Please upload a JPG, PNG, WEBP, AVIF or GIF image.');
    error.status = 400;
    return cb(error);
  },
});

/** Deletes a previously uploaded photo (never touches /art placeholders). */
export function removeUploadedFile(imageUrl) {
  if (!imageUrl || typeof imageUrl !== 'string') return;
  if (!imageUrl.startsWith('/uploads/')) return;
  const filename = path.basename(imageUrl);
  const target = path.join(uploadsDir, filename);
  if (!target.startsWith(uploadsDir)) return;
  fs.promises.unlink(target).catch(() => {});
}