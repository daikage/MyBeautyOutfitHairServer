/**
 * SQLite database for the salon site (better-sqlite3).
 *
 * The file lives in `server/data/salon.sqlite` by default (override with the
 * DB_FILE env var). On first run the schema is created and the catalogue is
 * seeded from `seed-data.js`, together with elegant SVG artwork that is
 * referenced as `/art/<slug>.svg`.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import Database from 'better-sqlite3';
import { CATEGORIES, servicesSeed, styleSeed, testimonialsSeed } from './seed-data.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.resolve(__dirname, '..', 'data');
fs.mkdirSync(dataDir, { recursive: true });

const dbFile = process.env.DB_FILE
  ? path.resolve(process.cwd(), process.env.DB_FILE)
  : path.join(dataDir, 'salon.sqlite');

export const db = new Database(dbFile);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

export function slugify(value) {
  const cleaned = String(value || '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
  return cleaned || 'style';
}

const SCHEMA = `
CREATE TABLE IF NOT EXISTS styles (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  slug             TEXT    NOT NULL UNIQUE,
  name             TEXT    NOT NULL,
  category         TEXT    NOT NULL,
  description      TEXT    NOT NULL DEFAULT '',
  price_from       REAL,
  duration_minutes INTEGER,
  image_url        TEXT,
  featured         INTEGER NOT NULL DEFAULT 0,
  active           INTEGER NOT NULL DEFAULT 1,
  sort_order       INTEGER NOT NULL DEFAULT 0,
  created_at       TEXT    NOT NULL DEFAULT (datetime('now')),
  updated_at       TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_styles_category ON styles(category);
CREATE INDEX IF NOT EXISTS idx_styles_featured ON styles(featured);

CREATE TABLE IF NOT EXISTS services (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  title       TEXT NOT NULL UNIQUE,
  description TEXT NOT NULL DEFAULT '',
  icon        TEXT,
  price_from  REAL,
  sort_order  INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS testimonials (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  author     TEXT NOT NULL,
  location   TEXT,
  quote      TEXT NOT NULL,
  rating     INTEGER NOT NULL DEFAULT 5,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS bookings (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  name           TEXT NOT NULL,
  email          TEXT,
  phone          TEXT,
  style_id       INTEGER REFERENCES styles(id) ON DELETE SET NULL,
  style_name     TEXT,
  preferred_date TEXT,
  preferred_time TEXT,
  notes          TEXT,
  status         TEXT NOT NULL DEFAULT 'new',
  created_at     TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS settings (
  key   TEXT PRIMARY KEY,
  value TEXT
);
`;

export function migrate() {
  db.exec(SCHEMA);
}

/** Inserts the starter catalogue the first time the database is created. */
export function seedIfEmpty({ force = false } = {}) {
  const styleCount = db.prepare('SELECT COUNT(*) AS n FROM styles').get().n;

  if (styleCount === 0 || force) {
    const insertStyle = db.prepare(`
      INSERT INTO styles (slug, name, category, description, price_from, duration_minutes, image_url, featured, active, sort_order)
      VALUES (@slug, @name, @category, @description, @price_from, @duration_minutes, @image_url, @featured, 1, @sort_order)
      ON CONFLICT(slug) DO UPDATE SET
        name = excluded.name,
        category = excluded.category,
        description = excluded.description,
        price_from = excluded.price_from,
        duration_minutes = excluded.duration_minutes,
        image_url = excluded.image_url
    `);

    const insertService = db.prepare(`
      INSERT INTO services (title, description, icon, price_from, sort_order)
      VALUES (@title, @description, @icon, @price_from, @sort_order)
      ON CONFLICT(title) DO NOTHING
    `);

    const insertTestimonial = db.prepare(`
      INSERT INTO testimonials (author, location, quote, rating)
      VALUES (@author, @location, @quote, @rating)
    `);

    const run = db.transaction(() => {
      styleSeed.forEach((style, index) => {
        const slug = slugify(style.name);
        insertStyle.run({
          ...style,
          slug,
          image_url: style.image_url || `/art/${slug}.svg`,
          sort_order: index + 1,
        });
      });

      servicesSeed.forEach((service) => insertService.run(service));

      const testimonialCount = db
        .prepare('SELECT COUNT(*) AS n FROM testimonials')
        .get().n;
      if (testimonialCount === 0 || force) {
        if (force) db.prepare('DELETE FROM testimonials').run();
        testimonialsSeed.forEach((entry) => insertTestimonial.run(entry));
      }
    });

    run();
    console.log(
      `[db] seeded ${styleSeed.length} styles, ${servicesSeed.length} services, ${testimonialsSeed.length} testimonials`
    );
  }

  const settings = [
    ['announcement', 'Private studio appointments in Texas - booking now for the season.'],
    ['hero_eyebrow', 'Texas · Luxury Hair Studio'],
    ['hero_title', 'Where your crown is treated like art'],
    [
      'hero_subtitle',
      'Braids, locs, weaves, silk presses and bridal hair - crafted slowly, carefully and beautifully for Black women who deserve the very best.',
    ],
  ];
  const insertSetting = db.prepare(
    'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO NOTHING'
  );
  settings.forEach(([key, value]) => insertSetting.run(key, value));
}

export function getSettings() {
  const rows = db.prepare('SELECT key, value FROM settings').all();
  return Object.fromEntries(rows.map((row) => [row.key, row.value]));
}

export function setSetting(key, value) {
  db.prepare(
    `INSERT INTO settings (key, value) VALUES (?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value`
  ).run(key, value ?? '');
}

export function categorySummary() {
  const counts = db
    .prepare('SELECT category, COUNT(*) AS count FROM styles WHERE active = 1 GROUP BY category')
    .all();
  const countMap = new Map(counts.map((row) => [row.category, row.count]));

  // Keep a stable, curated order for the client.
  const ordered = CATEGORIES.map((category) => ({
    name: category.name,
    blurb: category.blurb,
    count: countMap.get(category.name) || 0,
  }));
  counts.forEach(({ category, count }) => {
    if (!ordered.some((entry) => entry.name === category)) {
      ordered.push({ name: category, blurb: '', count });
    }
  });

  return ordered;
}

export function uniqueSlug(name, ignoreId = null) {
  const base = slugify(name);
  let candidate = base;
  let n = 2;
  const sql = ignoreId
    ? 'SELECT id FROM styles WHERE slug = ? AND id <> ?'
    : 'SELECT id FROM styles WHERE slug = ?';
  const stmt = db.prepare(sql);
  const taken = (value) => (ignoreId ? stmt.get(value, ignoreId) : stmt.get(value));
  while (taken(candidate)) {
    candidate = `${base}-${n}`;
    n += 1;
  }
  return candidate;
}

export const dbFilePath = dbFile;
export default db;