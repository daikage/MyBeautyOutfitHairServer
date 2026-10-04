/**
 * Public catalogue routes: styles, categories, services, testimonials, content.
 */
import { Router } from 'express';
import { categorySummary, db, getSettings } from '../db.js';

export const catalogRouter = Router();

/** Turns a database row into the camelCase shape the React app expects. */
export function toStyle(row) {
  if (!row) return null;
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    category: row.category,
    description: row.description,
    priceFrom: row.price_from,
    durationMinutes: row.duration_minutes,
    imageUrl: row.image_url,
    featured: Boolean(row.featured),
    active: Boolean(row.active),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function toBooking(row) {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    phone: row.phone,
    styleId: row.style_id,
    styleName: row.style_name,
    preferredDate: row.preferred_date,
    preferredTime: row.preferred_time,
    notes: row.notes,
    status: row.status,
    createdAt: row.created_at,
  };
}

catalogRouter.get('/health', async (req, res) => {
  const styles = (await db.get('SELECT COUNT(*) AS n FROM styles')).n;
  res.json({ ok: true, styles, time: new Date().toISOString() });
});

catalogRouter.get('/styles', async (req, res) => {
  const { category, featured, q, limit } = req.query;
  const where = ['active = 1'];
  const params = {};

  if (category && category !== 'All') {
    where.push('category = @category');
    params.category = String(category);
  }
  if (featured === '1' || featured === 'true') {
    where.push('featured = 1');
  }
  if (q) {
    where.push('(name LIKE @q OR description LIKE @q OR category LIKE @q)');
    params.q = `%${String(q)}%`;
  }

  let sql = `SELECT * FROM styles WHERE ${where.join(' AND ')} ORDER BY sort_order ASC, name ASC`;
  const max = Number.parseInt(limit, 10);
  if (Number.isFinite(max) && max > 0) {
    sql += ' LIMIT @limit';
    params.limit = Math.min(max, 300);
  }

  const rows = await db.all(sql, params);
  res.json({ styles: rows.map(toStyle), total: rows.length });
});

catalogRouter.get('/styles/:idOrSlug', async (req, res) => {
  const { idOrSlug } = req.params;
  const row = /^\d+$/.test(idOrSlug)
    ? await db.get('SELECT * FROM styles WHERE id = ?', [Number(idOrSlug)])
    : await db.get('SELECT * FROM styles WHERE slug = ?', [idOrSlug]);

  if (!row) return res.status(404).json({ error: 'That style could not be found.' });
  return res.json({ style: toStyle(row) });
});

catalogRouter.get('/categories', async (req, res) => {
  res.json({ categories: await categorySummary() });
});

catalogRouter.get('/services', async (req, res) => {
  const rows = await db.all('SELECT * FROM services ORDER BY sort_order ASC, title ASC');
  res.json({
    services: rows.map((row) => ({
      id: row.id,
      title: row.title,
      description: row.description,
      icon: row.icon,
      priceFrom: row.price_from,
    })),
  });
});

catalogRouter.get('/testimonials', async (req, res) => {
  const rows = await db.all('SELECT * FROM testimonials ORDER BY id ASC');
  res.json({
    testimonials: rows.map((row) => ({
      id: row.id,
      author: row.author,
      location: row.location,
      quote: row.quote,
      rating: row.rating,
    })),
  });
});

/** Editable site text (hero copy + announcement bar), managed from /admin. */
catalogRouter.get('/content', async (req, res) => {
  const settings = await getSettings();
  res.json({
    content: {
      announcement: settings.announcement || '',
      heroEyebrow: settings.hero_eyebrow || '',
      heroTitle: settings.hero_title || '',
      heroSubtitle: settings.hero_subtitle || '',
    },
  });
});