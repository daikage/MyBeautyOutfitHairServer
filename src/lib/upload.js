/**
 * Photo upload handling for new styles.
 *
 * When CLOUDINARY_URL is set (recommended for production on Render.com),
 * images are uploaded to Cloudinary and served from their CDN. This means
 * images survive deploys and Render's ephemeral filesystem wipes.
 *
 * When CLOUDINARY_URL is NOT set (local development), images are saved to
 * the local `server/uploads/` folder via multer disk storage, just like
 * before.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import multer from 'multer';
import { v2 as cloudinary } from 'cloudinary';
import { slugify } from '../db.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/* ---------------------------------------------------------------- config */

export const uploadsDir = process.env.UPLOADS_DIR
  ? path.resolve(process.cwd(), process.env.UPLOADS_DIR)
  : path.resolve(__dirname, '..', '..', 'uploads');
fs.mkdirSync(uploadsDir, { recursive: true });

/**
 * When CLOUDINARY_URL is set (e.g. cloudinary://API_KEY:API_SECRET@CLOUD_NAME),
 * the SDK auto-configures itself from the environment variable.
 */
const useCloudinary = Boolean(process.env.CLOUDINARY_URL);

if (useCloudinary) {
  // cloudinary auto-configures from CLOUDINARY_URL env var
  console.log('[upload] Cloudinary enabled — images will persist in the cloud.');
} else {
  console.log('[upload] Cloudinary not configured — using local disk storage.');
  console.log('         Set CLOUDINARY_URL in .env to enable cloud storage.');
}

/* --------------------------------------------------------- accepted types */

/** Accepted mime types → canonical file extension. */
export const IMAGE_TYPES = {
  'image/jpeg': '.jpg',
  'image/pjpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/avif': '.avif',
  'image/gif': '.gif',
};

/* ---------------------------------------------------------- multer setup */

/**
 * When using Cloudinary we store uploads temporarily in memory (Buffer) so
 * we can stream them to Cloudinary without leaving files on the ephemeral
 * disk. When using local storage we write straight to disk.
 */
const storage = useCloudinary
  ? multer.memoryStorage()
  : multer.diskStorage({
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

/* ------------------------------------------------------- Cloudinary helpers */

/**
 * Upload a multer memory-buffered file to Cloudinary.
 * Returns the secure URL of the uploaded image.
 *
 * @param {object} file  The multer file object (with .buffer, .mimetype, etc.)
 * @param {string} name  A human-readable name used to create the public ID.
 * @returns {Promise<string>} The Cloudinary secure URL.
 */
export async function uploadToCloudinary(file, name) {
  const base = slugify(name || file.originalname?.replace(/\.[^.]+$/, '') || 'style');
  const publicId = `mybeautyoutfithair/styles/${base}-${Date.now().toString(36)}`;

  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        public_id: publicId,
        folder: '', // public_id already includes the folder path
        resource_type: 'image',
        overwrite: true,
        transformation: [
          { quality: 'auto', fetch_format: 'auto' }, // auto-optimize
        ],
      },
      (error, result) => {
        if (error) return reject(error);
        resolve(result.secure_url);
      }
    );
    stream.end(file.buffer);
  });
}

/**
 * Process the uploaded file after multer has received it.
 * - If Cloudinary is enabled: uploads the buffer to Cloudinary, returns the CDN URL.
 * - If local storage: returns the /uploads/<filename> path (file already on disk).
 *
 * @param {object} file  The multer file object from req.file
 * @param {string} name  A readable name for the image
 * @returns {Promise<string>} The image URL to store in the database.
 */
export async function processUploadedFile(file, name) {
  if (!file) return null;

  if (useCloudinary) {
    return uploadToCloudinary(file, name);
  }

  // Local disk — multer already saved it
  return `/uploads/${file.filename}`;
}

/* --------------------------------------------------------- delete helpers */

/**
 * Deletes a previously uploaded photo.
 * - For Cloudinary URLs: extracts the public_id and destroys the resource.
 * - For local /uploads/ paths: removes the file from disk.
 * - Never touches /art/ placeholder paths.
 */
export function removeUploadedFile(imageUrl) {
  if (!imageUrl || typeof imageUrl !== 'string') return;

  // Cloudinary URL — extract public_id and delete
  if (imageUrl.includes('cloudinary.com') || imageUrl.includes('res.cloudinary')) {
    try {
      // URL pattern: .../upload/v1234567890/mybeautyoutfithair/styles/name-abc123.jpg
      const parts = imageUrl.split('/upload/');
      if (parts.length >= 2) {
        const afterUpload = parts[1];
        // Remove version prefix (v1234567890/) and file extension
        const withoutVersion = afterUpload.replace(/^v\d+\//, '');
        const publicId = withoutVersion.replace(/\.[^.]+$/, '');
        cloudinary.uploader.destroy(publicId).catch((err) => {
          console.warn('[upload] Failed to delete from Cloudinary:', publicId, err.message);
        });
      }
    } catch (err) {
      console.warn('[upload] Error parsing Cloudinary URL for deletion:', err.message);
    }
    return;
  }

  // Local /uploads/ path — delete from disk
  if (!imageUrl.startsWith('/uploads/')) return;
  const filename = path.basename(imageUrl);
  const target = path.join(uploadsDir, filename);
  if (!target.startsWith(uploadsDir)) return;
  fs.promises.unlink(target).catch(() => {});
}