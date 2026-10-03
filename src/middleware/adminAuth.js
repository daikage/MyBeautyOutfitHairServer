/**
 * Very small session gate for the /admin area.
 *
 * The passcode lives in `server/.env` (ADMIN_PASSCODE). A correct passcode
 * returns an in-memory bearer token that the browser keeps in localStorage
 * and sends back in the `Authorization: Bearer <token>` header.
 */
import crypto from 'node:crypto';

const TOKEN_TTL_MS = 12 * 60 * 60 * 1000; // 12 hours
const sessions = new Map();

const DEFAULT_PASSCODE = 'change-me-glam2026';

export function adminPasscode() {
  return process.env.ADMIN_PASSCODE || DEFAULT_PASSCODE;
}

export function isUsingDefaultPasscode() {
  return adminPasscode() === DEFAULT_PASSCODE;
}

function sha256(value) {
  return crypto.createHash('sha256').update(String(value || '')).digest();
}

export function passcodeMatches(candidate) {
  try {
    return crypto.timingSafeEqual(sha256(candidate), sha256(adminPasscode()));
  } catch {
    return false;
  }
}

export function createSession() {
  const token = crypto.randomBytes(24).toString('hex');
  sessions.set(token, Date.now() + TOKEN_TTL_MS);
  return token;
}

export function destroySession(token) {
  sessions.delete(token);
}

function sessionIsValid(token) {
  if (!token) return false;
  const expiresAt = sessions.get(token);
  if (!expiresAt) return false;
  if (Date.now() > expiresAt) {
    sessions.delete(token);
    return false;
  }
  return true;
}

function tokenFromRequest(req) {
  const header = req.get('authorization') || '';
  if (/^bearer\s+/i.test(header)) return header.replace(/^bearer\s+/i, '').trim();
  return req.get('x-admin-token') || '';
}

export function requireAdmin(req, res, next) {
  if (!sessionIsValid(tokenFromRequest(req))) {
    return res.status(401).json({ error: 'Your admin session has expired. Please sign in again.' });
  }
  return next();
}

export { tokenFromRequest };