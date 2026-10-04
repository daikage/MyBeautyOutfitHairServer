/**
 * Re-seeds the catalogue:  npm run seed        (keeps your uploaded styles/bookings)
 * Forces a refresh:        npm run seed -- --force
 */
import 'dotenv/config';
import { dbTarget, migrate, seedIfEmpty } from './db.js';

const force = process.argv.includes('--force');

await migrate();
await seedIfEmpty({ force });

console.log(`[seed] database ready at ${dbTarget}${force ? ' (forced refresh)' : ''}`);