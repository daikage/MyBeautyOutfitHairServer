/**
 * Database layer for the salon site - Supabase / PostgreSQL via `pg`.
 *
 * Bookings and styles live in a Postgres database (Supabase) so they SURVIVE
 * Render.com restarts, redeploys and free-tier spin-downs (Render's own
 * filesystem is ephemeral).
 *
 * Configure the connection with DATABASE_URL (Supabase -> Project Settings ->
 * Database -> Connection string -> URI). On Render use the "Connection pooling"
 * (Session mode, port 5432) string. A local PostgreSQL works too.
 *
 * On first run the schema is created and the catalogue is seeded from
 * `seed-data.js`, together with elegant SVG artwork referenced as
 * `/art/<slug>.svg`.
 */
import pg from 'pg';
import { CATEGORIES, servicesSeed, styleSeed, testimonialsSeed } from './seed-data.js';

const { Pool, types } = pg;

// Postgres returns COUNT(*) (int8) as a string to avoid precision loss - parse
// it back to a number so `count === 0` checks and the admin counters work.
types.setTypeParser(20, (value) => (value === null ? null : Number.parseInt(value, 10)));

/* ---------------------------------------------------------------- connection */

function resolveConnection() {
  const connectionString =
    process.env.DATABASE_URL || process.env.SUPABASE_DB_URL || process.env.POSTGRES_URL || '';
  if (!connectionString) {
    throw new Error(
      'DATABASE_URL is not set. Copy your Supabase connection string into server/.env ' +
        '(Project Settings -> Database -> Connection string -> URI).'
    );
  }
  return connectionString;
}

const connectionString = resolveConnection();

/** Supabase (and most hosted Postgres) require SSL; a local server does not. */
function sslFor(url) {
  if (process.env.PGSSLMODE === 'disable') return false;
  const isLocal = /@(localhost|127\.0\.0\.1|\[::1\])[:/]/.test(url);
  return isLocal ? false : { rejectUnauthorized: false };
}

/** Host/database summary that is safe to log (never the password). */
export const dbTarget = (() => {
  try {
    const parsed = new URL(connectionString);
    return `${parsed.hostname}:${parsed.port || 5432}${parsed.pathname}`;
  } catch {
    return '(postgres)';
  }
})();
export const dbFilePath = dbTarget; // kept so older log lines keep working
export const usingRemoteDatabase = true;

export const pool = new Pool({
  connectionString,
  ssl: sslFor(connectionString),
  max: Number.parseInt(process.env.PGPOOL_MAX, 10) || 5,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 15_000,
});

pool.on('error', (err) => console.error('[db] idle client error:', err.message));

/* ------------------------------------------------------------ query helpers */

/**
 * Converts the app's SQL into Postgres form:
 * - Arrays bind left-to-right to `?` placeholders   -> `$1, $2, ...`
 * - Plain objects bind to `@name` placeholders       -> `$1, $2, ...`
 * Returns `{ text, values }` ready for `pool.query`.
 */
function bind(sql, args) {
  if (args === undefined || args === null) return { text: sql, values: [] };

  if (Array.isArray(args)) {
    let index = 0;
    const text = sql.replace(/\?/g, () => `$${++index}`);
    return { text, values: args };
  }

  let index = 0;
  const values = [];
  const text = sql.replace(/@([a-zA-Z_][a-zA-Z0-9_]*)/g, (_match, name) => {
    values.push(args[name] ?? null);
    return `$${++index}`;
  });
  return { text, values };
}

async function query(sql, args, mode) {
  const { text, values } = bind(sql, args);
  const result = await pool.query(text, values);
  if (mode === 'run') return { rowsAffected: result.rowCount, rows: result.rows };
  return mode === 'get' ? result.rows[0] : result.rows;
}

/** Promise-based façade over the Postgres pool (get / all / run / exec / batch). */
export const db = {
  all: (sql, args) => query(sql, args, 'all'),
  get: (sql, args) => query(sql, args, 'get'),
  run: (sql, args) => query(sql, args, 'run'),
  /** Runs a multi-statement script (schema creation, etc.). */
  exec: (sql) => pool.query(sql),
  /** Runs several statements inside one transaction (used by the seeder). */
  async batch(statements) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      for (const statement of statements) {
        await client.query(statement.text, statement.values);
      }
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  },
};

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
  id               SERIAL PRIMARY KEY,
  slug             TEXT    NOT NULL UNIQUE,
  name             TEXT    NOT NULL,
  category         TEXT    NOT NULL,
  description      TEXT    NOT NULL DEFAULT '',
  price_from       DOUBLE PRECISION,
  duration_minutes INTEGER,
  image_url        TEXT,
  featured         INTEGER NOT NULL DEFAULT 0,
  active           INTEGER NOT NULL DEFAULT 1,
  sort_order       INTEGER NOT NULL DEFAULT 0,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_styles_category ON styles(category);
CREATE INDEX IF NOT EXISTS idx_styles_featured ON styles(featured);

CREATE TABLE IF NOT EXISTS services (
  id          SERIAL PRIMARY KEY,
  title       TEXT NOT NULL UNIQUE,
  description TEXT NOT NULL DEFAULT '',
  icon        TEXT,
  price_from  DOUBLE PRECISION,
  sort_order  INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS testimonials (
  id         SERIAL PRIMARY KEY,
  author     TEXT NOT NULL,
  location   TEXT,
  quote      TEXT NOT NULL,
  rating     INTEGER NOT NULL DEFAULT 5,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS bookings (
  id             SERIAL PRIMARY KEY,
  name           TEXT NOT NULL,
  email          TEXT,
  phone          TEXT,
  style_id       INTEGER REFERENCES styles(id) ON DELETE SET NULL,
  style_name     TEXT,
  preferred_date TEXT,
  preferred_time TEXT,
  notes          TEXT,
  status         TEXT NOT NULL DEFAULT 'new',
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS settings (
  key   TEXT PRIMARY KEY,
  value TEXT
);
`;

export async function migrate() {
  await db.exec(SCHEMA);
}

/** Inserts the starter catalogue the first time the database is created. */
export async function seedIfEmpty({ force = false } = {}) {
  const styleCount = (await db.get('SELECT COUNT(*) AS n FROM styles')).n;

  if (styleCount === 0 || force) {
    if (force) {
      await db.run('DELETE FROM styles');
      await db.run('DELETE FROM testimonials');
    }

    const statements = [];

    styleSeed.forEach((style, index) => {
      const slug = slugify(style.name);
      statements.push(
        bind(
          `INSERT INTO styles (slug, name, category, description, price_from, duration_minutes, image_url, featured, active, sort_order)
           VALUES (@slug, @name, @category, @description, @price_from, @duration_minutes, @image_url, @featured, 1, @sort_order)
           ON CONFLICT(slug) DO UPDATE SET
             name = excluded.name,
             category = excluded.category,
             description = excluded.description,
             price_from = excluded.price_from,
             duration_minutes = excluded.duration_minutes,
             image_url = excluded.image_url`,
          {
            ...style,
            slug,
            image_url: style.image_url || `/art/${slug}.svg`,
            sort_order: index + 1,
          }
        )
      );
    });

    servicesSeed.forEach((service) => {
      statements.push(
        bind(
          `INSERT INTO services (title, description, icon, price_from, sort_order)
           VALUES (@title, @description, @icon, @price_from, @sort_order)
           ON CONFLICT(title) DO NOTHING`,
          service
        )
      );
    });

    const testimonialCount = (await db.get('SELECT COUNT(*) AS n FROM testimonials')).n;
    if (testimonialCount === 0 || force) {
      testimonialsSeed.forEach((entry) => {
        statements.push(
          bind(
            `INSERT INTO testimonials (author, location, quote, rating)
             VALUES (@author, @location, @quote, @rating)`,
            entry
          )
        );
      });
    }

    if (statements.length > 0) await db.batch(statements);

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
  for (const [key, value] of settings) {
    await db.run(
      'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO NOTHING',
      [key, value]
    );
  }
}

export async function getSettings() {
  const rows = await db.all('SELECT key, value FROM settings');
  return Object.fromEntries(rows.map((row) => [row.key, row.value]));
}

export async function setSetting(key, value) {
  await db.run(
    `INSERT INTO settings (key, value) VALUES (?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
    [key, value ?? '']
  );
}

export async function categorySummary() {
  const counts = await db.all(
    'SELECT category, COUNT(*) AS count FROM styles WHERE active = 1 GROUP BY category'
  );
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

export async function uniqueSlug(name, ignoreId = null) {
  const base = slugify(name);
  let candidate = base;
  let n = 2;
  const sql = ignoreId
    ? 'SELECT id FROM styles WHERE slug = ? AND id <> ?'
    : 'SELECT id FROM styles WHERE slug = ?';
  const exists = async (value) =>
    (await db.get(sql, ignoreId ? [value, ignoreId] : [value])) !== undefined;
  while (await exists(candidate)) {
    candidate = `${base}-${n}`;
    n += 1;
  }
  return candidate;
}

export default db;