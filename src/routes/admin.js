/**
 * Admin routes - this is the "place to upload styles later".
 *
 * Sign in with the passcode from server/.env, then upload photos + details for
 * new styles, edit or retire existing ones, read the booking inbox and update
 * the hero text shown on the home page.
 */
import { Router } from 'express';
import { db, setSetting, uniqueSlug } from '../db.js';
import {
  createSession,
  destroySession,
  isUsingDefaultPasscode,
  passcodeMatches,
  requireAdmin,
  tokenFromRequest,
} from '../middleware/adminAuth.js';
import { processUploadedFile, removeUploadedFile, upload } from '../lib/upload.js';
import { toBooking, toStyle } from './catalog.js';

export const adminRouter = Router();

/* ------------------------------------------------------------------ helpers */

const text = (value, max = 1500) =>
  typeof value === 'string' ? value.trim().slice(0, max) : '';

const num = (value) => {
  if (value === '' || value === null || value === undefined) return null;
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const bool = (value) =>
  value === true || value === 'true' || value === '1' || value === 'on' || value === 'yes';

const STATUSES = ['new', 'contacted', 'confirmed', 'completed', 'cancelled'];

/* --------------------------------------------------------------------- auth */

adminRouter.post('/admin/login', (req, res) => {
  const { passcode } = req.body || {};
  if (!passcodeMatches(passcode)) {
    return res.status(401).json({ error: 'That passcode was not recognised. Try again.' });
  }
  return res.json({
    ok: true,
    token: createSession(),
    expiresInHours: 12,
    usingDefaultPasscode: isUsingDefaultPasscode(),
  });
});

adminRouter.post('/admin/logout', (req, res) => {
  destroySession(tokenFromRequest(req));
  res.json({ ok: true });
});

adminRouter.get('/admin/session', requireAdmin, (req, res) => {
  res.json({ ok: true, usingDefaultPasscode: isUsingDefaultPasscode() });
});

/* ------------------------------------------------------------------- styles */

adminRouter.get('/admin/styles', requireAdmin, async (req, res) => {
  const rows = await db.all('SELECT * FROM styles ORDER BY sort_order ASC, name ASC');
  res.json({
    styles: rows.map(toStyle),
    counts: {
      total: rows.length,
      active: rows.filter((row) => row.active).length,
      featured: rows.filter((row) => row.featured).length,
    },
  });
});

adminRouter.post('/admin/styles', requireAdmin, upload.single('image'), async (req, res, next) => {
  try {
    const body = req.body || {};
    const name = text(body.name, 140);
    const category = text(body.category, 80) || 'Braids & Twists';

    if (name.length < 2) {
      return res.status(400).json({ error: 'Give the style a name (at least 2 characters).' });
    }

    const slug = await uniqueSlug(name);

    // Upload to Cloudinary (or local disk) if a file was provided
    const uploadedUrl = await processUploadedFile(req.file, name);
    const imageUrl = uploadedUrl || text(body.imageUrl, 400) || `/art/${slug}.svg`;

    const nextOrder = ((await db.get('SELECT MAX(sort_order) AS max FROM styles')).max || 0) + 1;

    const created = await db.get(
      `INSERT INTO styles (slug, name, category, description, price_from, duration_minutes, image_url, featured, active, sort_order)
       VALUES (@slug, @name, @category, @description, @price_from, @duration_minutes, @image_url, @featured, @active, @sort_order)
       RETURNING *`,
      {
        slug,
        name,
        category,
        description: text(body.description, 1200),
        price_from: num(body.priceFrom),
        duration_minutes: num(body.durationMinutes),
        image_url: imageUrl,
        featured: bool(body.featured) ? 1 : 0,
        active: body.active === undefined ? 1 : bool(body.active) ? 1 : 0,
        sort_order: nextOrder,
      }
    );
    return res.status(201).json({ ok: true, style: toStyle(created) });
  } catch (err) {
    return next(err);
  }
});

adminRouter.patch('/admin/styles/:id', requireAdmin, upload.single('image'), async (req, res, next) => {
  try {
    const id = Number.parseInt(req.params.id, 10);
    const existing = await db.get('SELECT * FROM styles WHERE id = ?', [id]);
    if (!existing) {
      return res.status(404).json({ error: 'That style no longer exists.' });
    }

    const body = req.body || {};
    const name = body.name === undefined ? existing.name : text(body.name, 140) || existing.name;
    const slug = name === existing.name ? existing.slug : await uniqueSlug(name, id);

    let imageUrl = existing.image_url;
    if (req.file) {
      // Upload new image to Cloudinary (or local disk)
      imageUrl = await processUploadedFile(req.file, name);
      // Delete the old image
      removeUploadedFile(existing.image_url);
    } else if (body.imageUrl !== undefined && text(body.imageUrl, 400)) {
      imageUrl = text(body.imageUrl, 400);
      if (imageUrl !== existing.image_url) removeUploadedFile(existing.image_url);
    }

    await db.run(
      `UPDATE styles SET
         slug = @slug,
         name = @name,
         category = @category,
         description = @description,
         price_from = @price_from,
         duration_minutes = @duration_minutes,
         image_url = @image_url,
         featured = @featured,
         active = @active,
         updated_at = now()
       WHERE id = @id`,
      {
        id,
        slug,
        name,
        category:
          body.category === undefined ? existing.category : text(body.category, 80) || existing.category,
        description:
          body.description === undefined ? existing.description : text(body.description, 1200),
        price_from: body.priceFrom === undefined ? existing.price_from : num(body.priceFrom),
        duration_minutes:
          body.durationMinutes === undefined ? existing.duration_minutes : num(body.durationMinutes),
        image_url: imageUrl,
        featured: body.featured === undefined ? existing.featured : bool(body.featured) ? 1 : 0,
        active: body.active === undefined ? existing.active : bool(body.active) ? 1 : 0,
      }
    );

    const updated = await db.get('SELECT * FROM styles WHERE id = ?', [id]);
    return res.json({ ok: true, style: toStyle(updated) });
  } catch (err) {
    return next(err);
  }
});

adminRouter.delete('/admin/styles/:id', requireAdmin, async (req, res) => {
  const id = Number.parseInt(req.params.id, 10);
  const existing = await db.get('SELECT * FROM styles WHERE id = ?', [id]);
  if (!existing) return res.status(404).json({ error: 'That style no longer exists.' });

  await db.run('DELETE FROM styles WHERE id = ?', [id]);
  removeUploadedFile(existing.image_url);
  return res.json({ ok: true, id });
});
/* ------------------------------------------------------------------ bookings */

adminRouter.get('/admin/bookings', requireAdmin, async (req, res) => {
  const rows = await db.all('SELECT * FROM bookings ORDER BY created_at DESC, id DESC');
  res.json({
    bookings: rows.map(toBooking),
    counts: STATUSES.reduce((acc, status) => {
      acc[status] = rows.filter((row) => row.status === status).length;
      return acc;
    }, {}),
  });
});

adminRouter.patch('/admin/bookings/:id', requireAdmin, async (req, res) => {
  const id = Number.parseInt(req.params.id, 10);
  const existing = await db.get('SELECT * FROM bookings WHERE id = ?', [id]);
  if (!existing) return res.status(404).json({ error: 'That request no longer exists.' });

  const status = text(req.body?.status, 20);
  if (!STATUSES.includes(status)) {
    return res.status(400).json({ error: `Status must be one of: ${STATUSES.join(', ')}.` });
  }

  await db.run('UPDATE bookings SET status = ? WHERE id = ?', [status, id]);
  const updated = await db.get('SELECT * FROM bookings WHERE id = ?', [id]);
  return res.json({ ok: true, booking: toBooking(updated) });
});

adminRouter.delete('/admin/bookings/:id', requireAdmin, async (req, res) => {
  const id = Number.parseInt(req.params.id, 10);
  await db.run('DELETE FROM bookings WHERE id = ?', [id]);
  res.json({ ok: true, id });
});

/* ------------------------------------------------------------------- content */

adminRouter.patch('/admin/content', requireAdmin, async (req, res) => {
  const body = req.body || {};
  const map = {
    announcement: ['announcement', 240],
    heroEyebrow: ['hero_eyebrow', 120],
    heroTitle: ['hero_title', 160],
    heroSubtitle: ['hero_subtitle', 400],
  };
  for (const [field, [key, max]] of Object.entries(map)) {
    if (body[field] !== undefined) await setSetting(key, text(body[field], max));
  }
  res.json({ ok: true });
});