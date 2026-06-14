// Server-side imaging for the photo library (Node-only binding c.env.IMAGING).
//
//   embeddedThumb(absPath)        -> Buffer|null  fast EXIF-embedded JPEG preview
//   decodeProxy(absPath, opts)    -> Buffer       downsized JPEG for editing/preview
//   renderExport(absPath, stack)  -> Buffer       (M4) full-res developed render
//
// RAW files are demosaiced by darktable-cli (already on the host); everything
// else goes through sharp (libvips). Proxies are cached on disk under proxyDir,
// keyed by file id + mtime + size so they invalidate when the original changes.
import { spawn } from 'node:child_process';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import sharp from 'sharp';
import exifr from 'exifr';
import { RAW_EXTS } from './library-fs.js';

function isRaw(p) {
    return RAW_EXTS.has(path.extname(p).slice(1).toLowerCase());
}

// Minimal async concurrency limiter (darktable-cli is heavy; don't fork dozens).
class Limiter {
    constructor(n) { this.max = n; this.active = 0; this.queue = []; }
    async run(fn) {
        if (this.active >= this.max) await new Promise((r) => this.queue.push(r));
        this.active++;
        try { return await fn(); }
        finally { this.active--; const next = this.queue.shift(); if (next) next(); }
    }
}

export class Imaging {
    constructor({ proxyDir, exportDir, darktableBin = 'darktable-cli', maxConcurrent = 2 } = {}) {
        this.proxyDir = proxyDir || null;
        this.exportDir = exportDir || null;
        this.darktable = darktableBin;
        this.limiter = new Limiter(maxConcurrent);
    }

    get enabled() { return true; }

    // Fast path for grid thumbnails: pull the JPEG embedded in EXIF (RAW + most
    // camera JPEGs have one). Falls back to a small sharp resize for files without.
    async embeddedThumb(absPath, { longEdge = 480 } = {}) {
        try {
            const thumb = await exifr.thumbnail(absPath);
            if (thumb && thumb.byteLength) {
                return await sharp(Buffer.from(thumb)).rotate()
                    .resize(longEdge, longEdge, { fit: 'inside', withoutEnlargement: true })
                    .jpeg({ quality: 80 }).toBuffer();
            }
        } catch { /* fall through */ }
        if (isRaw(absPath)) return this.decodeProxy(absPath, { longEdge });
        try {
            return await sharp(absPath, { failOn: 'none' }).rotate()
                .resize(longEdge, longEdge, { fit: 'inside', withoutEnlargement: true })
                .jpeg({ quality: 80 }).toBuffer();
        } catch { return null; }
    }

    _cachePath(cacheId, longEdge, mtimeMs, size) {
        if (!this.proxyDir) return null;
        return path.join(this.proxyDir, `${cacheId}_${mtimeMs}_${size}_${longEdge}.jpg`);
    }

    // Editing/preview proxy: a quality JPEG at `longEdge`, cached on disk.
    async decodeProxy(absPath, { longEdge = 2048, mtimeMs = 0, size = 0, cacheId } = {}) {
        const id = cacheId || crypto.createHash('sha1').update(absPath).digest('hex').slice(0, 16);
        const cachePath = this._cachePath(id, longEdge, mtimeMs, size);
        if (cachePath) { try { return await fs.readFile(cachePath); } catch { /* miss */ } }

        let buf;
        if (isRaw(absPath)) buf = await this._decodeRaw(absPath, longEdge);
        else buf = await sharp(absPath, { failOn: 'none' }).rotate()
            .resize(longEdge, longEdge, { fit: 'inside', withoutEnlargement: true })
            .jpeg({ quality: 88 }).toBuffer();

        if (cachePath) {
            await fs.mkdir(this.proxyDir, { recursive: true }).catch(() => {});
            await fs.writeFile(cachePath, buf).catch(() => {});
        }
        return buf;
    }

    // Write developed pixels (a JPEG buffer from the client canvas) into EXPORT_DIR,
    // named after the original. Originals on the NAS are never touched.
    async saveExport(originalName, buffer) {
        if (!this.exportDir) throw new Error('EXPORT_DIR not configured');
        await fs.mkdir(this.exportDir, { recursive: true });
        const stem = path.basename(originalName || 'export', path.extname(originalName || '')).replace(/[^\w.-]+/g, '_');
        const name = `${stem}_edited.jpg`;
        await fs.writeFile(path.join(this.exportDir, name), buffer);
        return name;
    }

    // Evict oldest cached proxies once the cache exceeds maxBytes (keeps a NAS
    // library with thousands of RAWs from filling the disk with proxies).
    async pruneProxyCache(maxBytes) {
        if (!this.proxyDir) return;
        let names;
        try { names = await fs.readdir(this.proxyDir); } catch { return; }
        const stats = [];
        let total = 0;
        for (const n of names) {
            try {
                const st = await fs.stat(path.join(this.proxyDir, n));
                if (st.isFile()) { stats.push({ n, size: st.size, mtime: st.mtimeMs }); total += st.size; }
            } catch { /* skip */ }
        }
        if (total <= maxBytes) return 0;
        stats.sort((a, b) => a.mtime - b.mtime); // oldest first
        let removed = 0;
        for (const s of stats) {
            if (total <= maxBytes) break;
            try { await fs.unlink(path.join(this.proxyDir, s.n)); total -= s.size; removed++; } catch { /* skip */ }
        }
        return removed;
    }

    async _decodeRaw(absPath, longEdge) {
        return this.limiter.run(async () => {
            const tmp = path.join(os.tmpdir(), 'dr_' + crypto.randomBytes(7).toString('hex') + '.jpg');
            try {
                await this._darktable(absPath, tmp, longEdge);
                const decoded = await fs.readFile(tmp);
                // Normalize size/encoding regardless of darktable's output dims.
                return await sharp(decoded).resize(longEdge, longEdge, { fit: 'inside', withoutEnlargement: true })
                    .jpeg({ quality: 88 }).toBuffer();
            } finally {
                fs.unlink(tmp).catch(() => {});
            }
        });
    }

    _darktable(src, dst, longEdge) {
        return new Promise((resolve, reject) => {
            // darktable-cli <in> [<xmp>] <out> [opts] --core <dt opts>
            // :memory: library avoids the on-disk lock so concurrent runs don't clash.
            const args = [
                src, dst,
                '--width', String(longEdge), '--height', String(longEdge),
                '--hq', 'false', '--apply-custom-presets', 'false',
                '--core', '--library', ':memory:',
                '--conf', 'plugins/imageio/format/jpeg/quality=90',
            ];
            const ps = spawn(this.darktable, args, { stdio: ['ignore', 'ignore', 'pipe'] });
            let err = '';
            ps.stderr.on('data', (d) => { err += d.toString(); });
            ps.on('error', reject);
            ps.on('close', (code) => code === 0
                ? resolve()
                : reject(new Error(`darktable-cli exit ${code}: ${err.slice(-400)}`)));
        });
    }
}
