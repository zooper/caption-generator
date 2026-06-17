// Filesystem-backed photo library, rooted at LIBRARY_DIR (e.g. a NAS mount).
//
// Node-only binding injected as c.env.LIBRARY (like R2_BUCKET / DB). worker.js
// routes treat it as optional so they no-op on Cloudflare Workers. Original
// images are READ-ONLY — the only thing this binding ever writes is the .xmp
// sidecar next to a file (see writeSidecar/deleteSidecar); originals are never
// modified.
//
// Surface used by worker.js:  enabled, absPath(rel), readFile(rel), rescan(),
//                             readSidecar(rel), writeSidecar(rel), deleteSidecar(rel)
// Indexing (scanLibrary) walks the tree and upserts rows into `library_files`.
import { promises as fs } from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import exifr from 'exifr';

export const RAW_EXTS = new Set([
    'dng', 'cr2', 'cr3', 'crw', 'nef', 'nrw', 'arw', 'sr2', 'srf', 'raf', 'rw2',
    'rwl', 'pef', 'orf', '3fr', 'fff', 'iiq', 'mrw', 'mef', 'x3f', 'dcr', 'kdc',
    'erf', 'raw',
]);
export const IMG_EXTS = new Set([
    'jpg', 'jpeg', 'png', 'webp', 'gif', 'tif', 'tiff', 'heic', 'heif', 'avif', 'bmp',
]);

export function classify(name) {
    const ext = path.extname(name).slice(1).toLowerCase();
    if (RAW_EXTS.has(ext)) return { ext, format: 'raw' };
    if (IMG_EXTS.has(ext)) return { ext, format: 'image' };
    return null;
}

// Deterministic, stable id from the relative path so proxies/edits key consistently.
export function fileId(relPath) {
    return crypto.createHash('sha1').update(relPath).digest('hex').slice(0, 16);
}

export class LibraryFS {
    constructor(rootDir) {
        this.root = rootDir ? path.resolve(rootDir) : null;
        this.rescan = null; // wired up by server-node so the rescan route can call it
    }

    get enabled() { return !!this.root; }

    // Resolve a relative library path to absolute, guarding against traversal.
    absPath(relPath) {
        if (!this.root) throw new Error('LIBRARY_DIR not configured');
        const full = path.resolve(this.root, relPath || '.');
        if (full !== this.root && !full.startsWith(this.root + path.sep)) {
            throw new Error('Invalid library path (traversal): ' + relPath);
        }
        return full;
    }

    async readFile(relPath) {
        return fs.readFile(this.absPath(relPath));
    }

    // Sidecar path for an image, using the appended convention (darktable style):
    // L1041238.DNG -> L1041238.DNG.xmp. Resolved through absPath so traversal is
    // still guarded.
    sidecarPath(relPath) {
        return this.absPath(relPath) + '.xmp';
    }

    // Read a sidecar's XMP text. Tries the appended form first, then the
    // replaced-extension form (Lightroom style: L1041238.xmp). Returns null if
    // neither exists.
    async readSidecar(relPath) {
        const appended = this.sidecarPath(relPath);
        const replaced = appended.replace(/\.[^./\\]+\.xmp$/, '.xmp');
        const candidates = replaced === appended ? [appended] : [appended, replaced];
        for (const p of candidates) {
            try {
                return await fs.readFile(p, 'utf8');
            } catch { /* try next */ }
        }
        return null;
    }

    // Write the sidecar. This is the ONLY write LibraryFS performs into the
    // library root, and it only ever touches the .xmp file — never the original.
    async writeSidecar(relPath, xml) {
        await fs.writeFile(this.sidecarPath(relPath), xml, 'utf8');
    }

    // Remove the sidecar (used on edit reset). Best-effort; missing file is fine.
    async deleteSidecar(relPath) {
        await fs.rm(this.sidecarPath(relPath), { force: true });
    }

    // Recursively yield image/raw files (skips dotfiles and unsupported types).
    async *walk(relDir = '') {
        const absDir = this.absPath(relDir || '.');
        let entries;
        try {
            entries = await fs.readdir(absDir, { withFileTypes: true });
        } catch {
            return;
        }
        for (const e of entries) {
            if (e.name.startsWith('.')) continue;
            const rel = relDir ? path.posix.join(relDir, e.name) : e.name;
            if (e.isDirectory()) {
                yield* this.walk(rel);
            } else if (e.isFile()) {
                const c = classify(e.name);
                if (!c) continue;
                const st = await fs.stat(this.absPath(rel)).catch(() => null);
                if (!st) continue;
                yield {
                    relPath: rel,
                    dir: path.posix.dirname(rel) === '.' ? '' : path.posix.dirname(rel),
                    name: e.name,
                    ext: c.ext,
                    format: c.format,
                    size: st.size,
                    mtimeMs: Math.round(st.mtimeMs),
                };
            }
        }
    }
}

function fmtShutter(et) {
    if (!et) return null;
    return et >= 1 ? `${et}s` : `1/${Math.round(1 / et)}s`;
}

// Walk the library and upsert each file into `library_files`. EXIF is only
// (re)read when the file is new or its mtime/size changed, so rescans are cheap.
// `db` is the raw D1-style binding (db.prepare(...).bind(...).run()/.first()).
export async function scanLibrary(library, db, { log = () => {} } = {}) {
    if (!library?.enabled) return { scanned: 0, indexed: 0, skipped: 0 };
    let scanned = 0, indexed = 0, skipped = 0;
    for await (const f of library.walk()) {
        scanned++;
        const id = fileId(f.relPath);
        const existing = await db.prepare(
            'SELECT mtime, size FROM library_files WHERE id = ?'
        ).bind(id).first().catch(() => null);

        if (existing && existing.mtime === f.mtimeMs && existing.size === f.size) {
            skipped++;
            continue;
        }

        // (Re)extract metadata for new/changed files.
        let ex = {}, gps = null, width = null, height = null;
        try {
            const abs = library.absPath(f.relPath);
            ex = (await exifr.parse(abs, { tiff: true, exif: true, ifd0: true, gps: false }).catch(() => null)) || {};
            gps = await exifr.gps(abs).catch(() => null);
            width = ex.ImageWidth || ex.ExifImageWidth || null;
            height = ex.ImageHeight || ex.ExifImageHeight || null;
        } catch { /* metadata best-effort */ }

        const camera = [ex.Make, ex.Model && (!ex.Make || !String(ex.Model).includes(ex.Make)) ? ex.Model : null]
            .filter(Boolean).join(' ').trim() || null;

        await db.prepare(`
            INSERT INTO library_files
                (id, rel_path, dir, filename, ext, format, size, mtime, width, height,
                 camera_model, lens, iso, aperture, shutter_speed, focal_length, date_time,
                 lat, lon, indexed_at)
            VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,CURRENT_TIMESTAMP)
            ON CONFLICT(id) DO UPDATE SET
                rel_path=excluded.rel_path, dir=excluded.dir, filename=excluded.filename,
                ext=excluded.ext, format=excluded.format, size=excluded.size, mtime=excluded.mtime,
                width=excluded.width, height=excluded.height, camera_model=excluded.camera_model,
                lens=excluded.lens, iso=excluded.iso, aperture=excluded.aperture,
                shutter_speed=excluded.shutter_speed, focal_length=excluded.focal_length,
                date_time=excluded.date_time, lat=excluded.lat, lon=excluded.lon,
                indexed_at=CURRENT_TIMESTAMP
        `).bind(
            id, f.relPath, f.dir, f.name, f.ext, f.format, f.size, f.mtimeMs, width, height,
            camera, ex.LensModel || null, ex.ISO != null ? String(ex.ISO) : null,
            ex.FNumber != null ? String(ex.FNumber) : null, fmtShutter(ex.ExposureTime),
            ex.FocalLength != null ? `${Math.round(ex.FocalLength)}mm` : null,
            (ex.DateTimeOriginal || ex.CreateDate || ex.ModifyDate || null)?.toString?.() || null,
            gps?.latitude ?? null, gps?.longitude ?? null,
        ).run();
        indexed++;
    }
    // Prune rows whose files vanished from disk.
    let pruned = 0;
    const rows = await db.prepare('SELECT id, rel_path FROM library_files').all().catch(() => ({ results: [] }));
    for (const r of (rows.results || [])) {
        try { await library.readFile(r.rel_path); }
        catch { await db.prepare('DELETE FROM library_files WHERE id = ?').bind(r.id).run(); pruned++; }
    }
    log(`library scan: ${scanned} files, ${indexed} indexed, ${skipped} unchanged, ${pruned} pruned`);
    return { scanned, indexed, skipped, pruned };
}
