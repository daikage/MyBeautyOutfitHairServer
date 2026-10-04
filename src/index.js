/**
 * My Beauty Outfit Hair - API server.
 *
 *   npm run dev   (from the server folder)  ->  http://localhost:4000
 *
 * Serves:
 *   /api/*       JSON API (styles, categories, services, testimonials, bookings, admin)
 *   /uploads/*   photos uploaded from the admin page
 *   /*           the built React app from client/dist (after `npm run build`)
 */
import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import cors from 'cors';
import express from 'express';
import { dbTarget, migrate, seedIfEmpty } from './db.js';
import { uploadsDir, usingCloudinary } from './lib/upload.js';
import { adminRouter } from './routes/admin.js';
import { bookingsRouter } from './routes/bookings.js';
import { catalogRouter } from './routes/catalog.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number.parseInt(process.env.PORT, 10) || 4000;

await migrate();
await seedIfEmpty();

const app = express();
app.disable('x-powered-by');
app.use(cors({ origin: true }));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

// Uploaded photos
app.use(
  '/uploads',
  express.static(uploadsDir, {
    maxAge: '7d',
    setHeaders: (res) => res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin'),
  })
);

// API
app.use('/api', catalogRouter);
app.use('/api', bookingsRouter);
app.use('/api', adminRouter);

app.use('/api', (req, res) => res.status(404).json({ error: 'Unknown API route.' }));

// Built React app (production). In development the Vite dev server handles this.
const clientDist = path.resolve(__dirname, '..', '..', 'client', 'dist');
if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.use((req, res, next) => {
    if (req.method !== 'GET' && req.method !== 'HEAD') return next();
    if (req.path.startsWith('/uploads/')) return next();
    res.sendFile(path.join(clientDist, 'index.html'));
  });
} else {
  app.use((req, res) => {
    res
      .status(200)
      .type('html')
      .send(
        `<pre style="font:15px/1.6 ui-monospace,monospace;padding:32px">My Beauty Outfit Hair API is running on port ${PORT}.

The React front end is not built yet. Start it with:

  npm run dev:web        (from the project root, hot reload on http://localhost:5173)

...or build it for production with:

  npm run build          (then this server will serve it here)</pre>`
      );
  });
}

// eslint-disable-next-line no-unused-vars
app.use((error, req, res, next) => {
  const status = error.status || error.statusCode || (error.code === 'LIMIT_FILE_SIZE' ? 413 : 500);
  const message =
    error.code === 'LIMIT_FILE_SIZE'
      ? 'That photo is larger than 8 MB. Please choose a smaller file.'
      : error.message || 'Something went wrong on the server.';
  if (status >= 500) console.error('[api] error:', error);
  res.status(status).json({ error: message });
});

app.listen(PORT, () => {
  console.log(`\n  My Beauty Outfit Hair API listening on http://localhost:${PORT}`);
  console.log(`  Database: ${dbTarget}`);

  if (!usingCloudinary) {
    console.warn('\n  ⚠  CLOUDINARY_URL is not set — uploaded photos are being saved to local disk.');
    console.warn('     On Render.com that disk is EPHEMERAL, so every image WILL disappear on the');
    console.warn('     next deploy, restart or spin-down. Set CLOUDINARY_URL in the environment');
    console.warn('     (Render -> Settings -> Environment) to store images in the cloud.\n');
  }

  if (!process.env.ADMIN_PASSCODE) {
    console.warn('  ⚠  ADMIN_PASSCODE is not set - using the default from middleware/adminAuth.js.');
    console.warn('     Copy server/.env.example to server/.env and choose your own passcode.\n');
  } else {
    console.log('  Admin panel: /admin (passcode protected)\n');
  }
});