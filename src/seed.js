/**
 * Re-seeds the catalogue:  npm run seed        (keeps your uploaded styles/bookings)
 * Forces a refresh:        npm run seed -- --force
 */
import 'dotenv/config';
import { dbFilePath, migrate, seedIfEmpty } from './db.js';

const force = process.argv.includes('--force');

migrate();
seedIfEmpty({ force });

console.log(`[seed] database ready at ${dbFilePath}${force ? ' (forced refresh)' : ''}`);