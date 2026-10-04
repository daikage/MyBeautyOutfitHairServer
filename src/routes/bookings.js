/**
 * Public appointment requests. Everything lands in the `bookings` table and
 * appears in the /admin inbox.
 */
import { Router } from 'express';
import { db } from '../db.js';
import { toBooking } from './catalog.js';

export const bookingsRouter = Router();

const clean = (value, max = 800) =>
  typeof value === 'string' ? value.replace(/\s+/g, ' ').trim().slice(0, max) : '';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

bookingsRouter.post('/bookings', async (req, res) => {
  const body = req.body || {};
  const name = clean(body.name, 120);
  const email = clean(body.email, 160);
  const phone = clean(body.phone, 40);
  const notes = clean(body.notes, 1500);
  const preferredDate = clean(body.preferredDate, 20);
  const preferredTime = clean(body.preferredTime, 20);
  const styleId = Number.parseInt(body.styleId, 10);

  const errors = {};
  if (name.length < 2) errors.name = 'Please tell us your name.';
  if (!email && !phone) errors.contact = 'Add a phone number or an email so we can confirm.';
  if (email && !EMAIL_RE.test(email)) errors.email = 'That email does not look right.';
  if (Object.keys(errors).length > 0) {
    return res.status(400).json({ error: 'Please check the highlighted fields.', errors });
  }

  const style = Number.isFinite(styleId)
    ? await db.get('SELECT id, name FROM styles WHERE id = ?', [styleId])
    : null;

  const booking = await db.get(
    `INSERT INTO bookings (name, email, phone, style_id, style_name, preferred_date, preferred_time, notes)
     VALUES (@name, @email, @phone, @style_id, @style_name, @preferred_date, @preferred_time, @notes)
     RETURNING *`,
    {
      name,
      email: email || null,
      phone: phone || null,
      style_id: style?.id ?? null,
      style_name: style?.name || clean(body.styleName, 160) || null,
      preferred_date: preferredDate || null,
      preferred_time: preferredTime || null,
      notes: notes || null,
    }
  );
  return res.status(201).json({
    ok: true,
    message: 'Thank you! Your request is in - you will hear back within 24 hours.',
    booking: toBooking(booking),
  });
});