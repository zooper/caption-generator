// Node.js entrypoint for self-hosting AI Caption Studio.
//
// Reuses the exact Hono app from worker.js (no logic duplicated) and injects
// Node-side implementations of the Cloudflare bindings:
//   - c.env.DB         -> SQLite (node:sqlite) via D1SQLite
//   - c.env.R2_BUCKET  -> local filesystem via R2FS
//   - c.env.<SECRET>   -> process.env (.env file)
// Static files are served from /public, and the worker's two cron jobs run via
// node-cron by reusing the same scheduled() dispatch.
import 'dotenv/config';
import path from 'node:path';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { serve } from '@hono/node-server';
import { serveStatic } from '@hono/node-server/serve-static';
import cron from 'node-cron';
import worker, { app, D1Database } from './worker.js';
import { D1SQLite } from './bindings/d1-sqlite.js';
import { R2FS } from './bindings/r2-fs.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// On Cloudflare the D1 database is pre-provisioned: schema.sql (base tables,
// schema v8) is applied out-of-band and the app's migrations bring it to v15.
// Self-hosted, we must do both deterministically at startup: apply the base
// schema if the DB is empty, then run the in-app migrations up to v15. Both
// steps are idempotent, so this is a no-op for an already-migrated DB.
async function bootstrapDatabase(db) {
    const hasUsers = db._db
        .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='users'")
        .get();
    if (!hasUsers) {
        console.log('Empty database — applying base schema from schema.sql');
        db._db.exec(readFileSync(path.join(__dirname, 'schema.sql'), 'utf8'));
    }
    // Run the worker's own migrations (v9..v15) on top of the base schema.
    await new D1Database(db).ensureInitialized();
}

const DATA_DIR = process.env.DATA_DIR || './data';
const DB_PATH = process.env.DB_PATH || path.join(DATA_DIR, 'caption-studio.sqlite');
const IMAGES_DIR = process.env.IMAGES_DIR || path.join(DATA_DIR, 'images');
const PORT = Number(process.env.PORT || 3000);

if (!process.env.JWT_SECRET) {
    console.error('FATAL: JWT_SECRET is not set. Refusing to start. Add it to your .env.');
    process.exit(1);
}

const DB = new D1SQLite(DB_PATH);
const R2_BUCKET = new R2FS(IMAGES_DIR);

await bootstrapDatabase(DB);

// The binding object passed to Hono as `env` (second arg to app.fetch), mirroring
// the Cloudflare Workers env. process.env supplies all secrets/vars.
const ENV = { ...process.env, DB, R2_BUCKET };

// Serve static assets from /public. Registered after all worker routes are
// imported, so it acts as the final fallback — API/UI routes match first, and
// only unmatched paths (index.html, styles.css, /templates/*, …) hit the disk.
app.use('/*', serveStatic({ root: './public' }));

serve({ fetch: (request) => app.fetch(request, ENV), port: PORT }, (info) => {
    console.log(`AI Caption Studio listening on http://localhost:${info.port}`);
    console.log(`  DB:     ${path.resolve(DB_PATH)}`);
    console.log(`  Images: ${path.resolve(IMAGES_DIR)}`);
    console.log(`  Origin: ${process.env.PUBLIC_ORIGIN || '(derived from request)'}`);
});

// Reuse the worker's scheduled() dispatch for the two cron triggers from
// wrangler.toml. waitUntil just needs to swallow/await the promise here.
const ctx = {
    waitUntil: (p) => Promise.resolve(p).catch((e) => console.error('Scheduled task failed:', e)),
    passThroughOnException: () => {},
};
cron.schedule('* * * * *', () => worker.scheduled({ cron: '*/1 * * * *' }, ENV, ctx));
cron.schedule('0 6 * * *', () => worker.scheduled({ cron: '0 6 * * *' }, ENV, ctx));
