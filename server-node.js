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
import { LibraryFS, scanLibrary } from './bindings/library-fs.js';
import { Imaging, warmLibrary } from './bindings/imaging.js';

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

// Photo library (NAS mount). Optional — if LIBRARY_DIR is unset the editor's
// library features stay dormant and the app behaves exactly as before.
const LIBRARY_DIR = process.env.LIBRARY_DIR || '';
const PROXY_DIR = process.env.PROXY_DIR || path.join(DATA_DIR, 'proxies');
const EXPORT_DIR = process.env.EXPORT_DIR || path.join(DATA_DIR, 'exports');
const DARKTABLE_BIN = process.env.DARKTABLE_BIN || 'darktable-cli';
const DCRAW_EMU_BIN = process.env.DCRAW_EMU_BIN || 'dcraw_emu'; // libraw fast colour demosaic (libraw-bin)

if (!process.env.JWT_SECRET) {
    console.error('FATAL: JWT_SECRET is not set. Refusing to start. Add it to your .env.');
    process.exit(1);
}

const DB = new D1SQLite(DB_PATH);
const R2_BUCKET = new R2FS(IMAGES_DIR);
const LIBRARY = new LibraryFS(LIBRARY_DIR);
const IMAGING = new Imaging({ proxyDir: PROXY_DIR, exportDir: EXPORT_DIR, darktableBin: DARKTABLE_BIN, dcrawEmuBin: DCRAW_EMU_BIN });

await bootstrapDatabase(DB);

// The binding object passed to Hono as `env` (second arg to app.fetch), mirroring
// the Cloudflare Workers env. process.env supplies all secrets/vars.
const ENV = { ...process.env, DB, R2_BUCKET, LIBRARY, IMAGING };

// Index the photo library on startup, then periodically. `rescan` is exposed on
// the binding so the POST /api/library/rescan route can trigger it on demand.
if (LIBRARY.enabled) {
    // The photo-editing module is per-user. The NAS scan/warm is global, so it
    // runs only when at least one user still has Photo-editing enabled (default
    // on; a fresh DB with no users counts as enabled so a new box still indexes).
    // When everyone has flipped to caption-only, the NAS work idles.
    const developInUse = async () => {
        try {
            const r = await DB.prepare(`
                SELECT (SELECT COUNT(*) FROM users) AS users,
                       EXISTS(
                           SELECT 1 FROM users u
                           WHERE NOT EXISTS (
                               SELECT 1 FROM user_settings s
                               WHERE s.user_id = u.id AND s.integration_type = 'modules'
                                 AND s.setting_key = 'develop' AND s.setting_value = '0'
                           )
                       ) AS any_dev
            `).first();
            if (!r) return true;
            return Number(r.users) === 0 ? true : !!r.any_dev;
        } catch {
            return true; // never block indexing on a query/schema hiccup
        }
    };
    // Pre-generate grid thumbnails in the background after each scan so browsing
    // is instant; idempotent, so it only fills gaps for new/changed files.
    const warm = () => warmLibrary(LIBRARY, DB, IMAGING, { log: (m) => console.log(m) })
        .catch((e) => console.error('Thumbnail warm failed:', e));
    LIBRARY.rescan = () => scanLibrary(LIBRARY, DB, { log: (m) => console.log(m) });
    const cycle = async () => {
        if (!(await developInUse())) {
            console.log('Library scan skipped: Photo-editing module disabled for all users');
            return;
        }
        await LIBRARY.rescan();
        await warm();
    };
    cycle().catch((e) => console.error('Initial library scan failed:', e));
    const everyMin = Number(process.env.LIBRARY_RESCAN_MINUTES || 10);
    if (everyMin > 0) {
        setInterval(() => cycle().catch((e) => console.error('Library rescan failed:', e)),
            everyMin * 60 * 1000).unref();
    }
    // Keep the proxy cache bounded.
    const cacheMb = Number(process.env.PROXY_CACHE_MB || 1024);
    const prune = () => IMAGING.pruneProxyCache(cacheMb * 1024 * 1024)
        .then((n) => { if (n) console.log(`proxy cache: evicted ${n} stale proxies`); })
        .catch(() => {});
    prune();
    setInterval(prune, 30 * 60 * 1000).unref();
}

// Serve static assets from /public. Registered after all worker routes are
// imported, so it acts as the final fallback — API/UI routes match first, and
// only unmatched paths (index.html, styles.css, /templates/*, …) hit the disk.
app.use('/*', serveStatic({ root: './public' }));

serve({ fetch: (request) => app.fetch(request, ENV), port: PORT }, (info) => {
    console.log(`AI Caption Studio listening on http://localhost:${info.port}`);
    console.log(`  DB:     ${path.resolve(DB_PATH)}`);
    console.log(`  Images: ${path.resolve(IMAGES_DIR)}`);
    console.log(`  Library:${LIBRARY.enabled ? ' ' + path.resolve(LIBRARY_DIR) : ' (disabled — set LIBRARY_DIR)'}`);
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
