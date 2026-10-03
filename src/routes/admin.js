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
import { removeUploadedFile, upload } from '../lib/upload.js';
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

adminRouter.get('/admin/styles', requireAdmin, (req, res) => {
  const rows = db.prepare('SELECT * FROM styles ORDER BY sort_order ASC, name ASC').all();
  res.json({
    styles: rows.map(toStyle),
    counts: {
      total: rows.length,
      active: rows.filter((row) => row.active).length,
      featured: rows.filter((row) => row.featured).length,
    },
  });
});

adminRouter.post('/admin/styles', requireAdmin, upload.single('image'), (req, res) => {
  const body = req.body || {};
  const name = text(body.name, 140);
  const category = text(body.category, 80) || 'Braids & Twists';

  if (name.length < 2) {
    if (req.file) removeUploadedFile(`/uploads/${req.file.filename}`);
    return res.status(400).json({ error: 'Give the style a name (at least 2 characters).' });
  }

  const slug = uniqueSlug(name);
  const imageUrl = req.file
    ? `/uploads/${req.file.filename}`
    : text(body.imageUrl, 400) || `/art/${slug}.svg`;

  const nextOrder = (db.prepare('SELECT MAX(sort_order) AS max FROM styles').get().max || 0) + 1;

  const result = db
    .prepare(
      `INSERT INTO styles (slug, name, category, description, price_from, duration_minutes, image_url, featured, active, sort_order)
       VALUES (@slug, @name, @category, @description, @price_from, @duration_minutes, @image_url, @featured, @active, @sort_order)`
    )
    .run({
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
    });

  const created = db.prepare('SELECT * FROM styles WHERE id = ?').get(result.lastInsertRowid);
  return res.status(201).json({ ok: true, style: toStyle(created) });
});

adminRouter.patch('/admin/styles/:id', requireAdmin, upload.single('image'), (req, res) => {
  const id = Number.parseInt(req.params.id, 10);
  const existing = db.prepare('SELECT * FROM styles WHERE id = ?').get(id);
  if (!existing) {
    if (req.file) removeUploadedFile(`/uploads/${req.file.filename}`);
    return res.status(404).json({ error: 'That style no longer exists.' });
  }

  const body = req.body || {};
  const name = body.name === undefined ? existing.name : text(body.name, 140) || existing.name;
  const slug = name === existing.name ? existing.slug : uniqueSlug(name, id);

  let imageUrl = existing.image_url;
  if (req.file) {
    imageUrl = `/uploads/${req.file.filename}`;
    removeUploadedFile(existing.image_url);
  } else if (body.imageUrl !== undefined && text(body.imageUrl, 400)) {
    imageUrl = text(body.imageUrl, 400);
    if (imageUrl !== existing.image_url) removeUploadedFile(existing.image_url);
  }

  db.prepare(
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
       updated_at = datetime('now')
     WHERE id = @id`
  ).run({
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
  });

  const updated = db.prepare('SELECT * FROM styles WHERE id = ?').get(id);
  return res.json({ ok: true, style: toStyle(updated) });
});

adminRouter.delete('/admin/styles/:id', requireAdmin, (req, res) => {
  const id = Number.parseInt(req.params.id, 10);
  const existing = db.prepare('SELECT * FROM styles WHERE id = ?').get(id);
  if (!existing) return res.status(404).json({ error: 'That style no longer exists.' });

  db.prepare('DELETE FROM styles WHERE id = ?').run(id);
  removeUploadedFile(existing.image_url);
  return res.json({ ok: true, id });
});
/* ------------------------------------------------------------------ bookings */

adminRouter.get('/admin/bookings', requireAdmin, (req, res) => {
  const rows = db
    .prepare('SELECT * FROM bookings ORDER BY datetime(created_at) DESC, id DESC')
    .all();
  res.json({
    bookings: rows.map(toBooking),
    counts: STATUSES.reduce((acc, status) => {
      acc[status] = rows.filter((row) => row.status === status).length;
      return acc;
    }, {}),
  });
});

adminRouter.patch('/admin/bookings/:id', requireAdmin, (req, res) => {
  const id = Number.parseInt(req.params.id, 10);
  const existing = db.prepare('SELECT * FROM bookings WHERE id = ?').get(id);
  if (!existing) return res.status(404).json({ error: 'That request no longer exists.' });

  const status = text(req.body?.status, 20);
  if (!STATUSES.includes(status)) {
    return res.status(400).json({ error: `Status must be one of: ${STATUSES.join(', ')}.` });
  }

  db.prepare('UPDATE bookings SET status = ? WHERE id = ?').run(status, id);
  const updated = db.prepare('SELECT * FROM bookings WHERE id = ?').get(id);
  return res.json({ ok: true, booking: toBooking(updated) });
});

adminRouter.delete('/admin/bookings/:id', requireAdmin, (req, res) => {
  const id = Number.parseInt(req.params.id, 10);
  db.prepare('DELETE FROM bookings WHERE id = ?').run(id);
  res.json({ ok: true, id });
});

/* ------------------------------------------------------------------- content */

adminRouter.patch('/admin/content', requireAdmin, (req, res) => {
  const body = req.body || {};
  const map = {
    announcement: ['announcement', 240],
    heroEyebrow: ['hero_eyebrow', 120],
    heroTitle: ['hero_title', 160],
    heroSubtitle: ['hero_subtitle', 400],
  };
  Object.entries(map).forEach(([field, [key, max]]) => {
    if (body[field] !== undefined) setSetting(key, text(body[field], max));
  });
  res.json({ ok: true });
});