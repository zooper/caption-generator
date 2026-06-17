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

// Bump when the decode logic changes so stale proxies/thumbnails on disk are
// ignored (the cache key embeds it). v2: as-shot embedded preview by default,
// colour demosaic only on demand.
const CACHE_VERSION = 2;

function isRaw(p) {
    return RAW_EXTS.has(path.extname(p).slice(1).toLowerCase());
}

// Locate the largest embedded JPEG preview in a TIFF/DNG by walking the IFD
// chain (IFD0 + SubIFDs). Returns {off,len,w,h} or null. `buf` only needs to
// contain the IFD tables (the JPEG bytes are read separately by offset).
function locatePreview(buf) {
    if (buf.length < 8) return null;
    const le = buf.readUInt16LE(0) === 0x4949;
    const u16 = (o) => le ? buf.readUInt16LE(o) : buf.readUInt16BE(o);
    const u32 = (o) => le ? buf.readUInt32LE(o) : buf.readUInt32BE(o);
    if (u16(2) !== 42) return null;
    const ifds = [u32(4)]; const seen = new Set(); let best = null;
    const SZ = { 1: 1, 2: 1, 3: 2, 4: 4, 5: 8, 7: 1, 9: 4, 10: 8 };
    while (ifds.length) {
        const off = ifds.shift();
        if (!off || seen.has(off) || off + 2 > buf.length) continue;
        seen.add(off);
        const n = u16(off);
        if (off + 2 + n * 12 > buf.length) continue;
        const tags = {};
        for (let i = 0; i < n; i++) {
            const e = off + 2 + i * 12, tag = u16(e), type = u16(e + 2), cnt = u32(e + 4);
            const len = (SZ[type] || 1) * cnt, valOff = len <= 4 ? e + 8 : u32(e + 8);
            if (valOff + Math.min(len, 4) > buf.length) continue;
            tags[tag] = { type, cnt, valOff, val: type === 3 ? u16(valOff) : u32(valOff) };
        }
        const next = u32(off + 2 + n * 12); if (next) ifds.push(next);
        if (tags[0x014A]) { const s = tags[0x014A]; for (let i = 0; i < s.cnt; i++) ifds.push(s.cnt === 1 ? s.val : u32(s.valOff + i * 4)); }
        const comp = tags[0x0103] && tags[0x0103].val;
        const w = tags[0x0100] && tags[0x0100].val, h = tags[0x0101] && tags[0x0101].val;
        let jOff = null, jLen = null;
        if (tags[0x0201] && tags[0x0202]) { jOff = tags[0x0201].val; jLen = tags[0x0202].val; }
        else if ((comp === 7 || comp === 6) && tags[0x0111] && tags[0x0117] && tags[0x0111].cnt === 1) { jOff = tags[0x0111].val; jLen = tags[0x0117].val; }
        if (jOff && jLen) {
            const area = (w || 0) * (h || 0) || jLen;
            if (!best || area > best.area) best = { off: jOff, len: jLen, w: w || null, h: h || null, area };
        }
    }
    return best;
}

// EXIF/DNG Orientation (tag 0x0112) from IFD0.
function readOrientation(buf) {
    try {
        const le = buf.readUInt16LE(0) === 0x4949;
        const u16 = (o) => le ? buf.readUInt16LE(o) : buf.readUInt16BE(o);
        const u32 = (o) => le ? buf.readUInt32LE(o) : buf.readUInt32BE(o);
        if (u16(2) !== 42) return 1;
        const off = u32(4), n = u16(off);
        for (let i = 0; i < n; i++) { const e = off + 2 + i * 12; if (u16(e) === 0x0112) return u16(e + 8); }
    } catch { /* default */ }
    return 1;
}

// Apply an EXIF orientation (1–8) to a sharp pipeline. Embedded RAW previews
// carry no orientation of their own, so we apply the DNG's explicitly.
function applyOrientation(pipe, ori) {
    switch (ori) {
        case 2: return pipe.flop();
        case 3: return pipe.rotate(180);
        case 4: return pipe.flip();
        case 5: return pipe.rotate(90).flop();
        case 6: return pipe.rotate(90);
        case 7: return pipe.rotate(270).flop();
        case 8: return pipe.rotate(270);
        default: return pipe;
    }
}

// Read the embedded preview JPEG from a RAW (two-phase: parse IFD tables from the
// head, then read just the JPEG byte range). ~10–200ms vs ~9s for a darktable
// demosaic. Returns { jpeg, ori } where ori is the DNG orientation to apply.
async function extractRawPreview(absPath) {
    let fh;
    try {
        fh = await fs.open(absPath, 'r');
        const size = (await fh.stat()).size;
        const headLen = Math.min(1 << 20, size);
        const head = Buffer.alloc(headLen);
        await fh.read(head, 0, headLen, 0);

        // Fujifilm RAF isn't TIFF, so locatePreview() can't see its preview and
        // the file would fall through to a slow darktable demosaic. The embedded
        // full-size JPEG's offset/length live in the RAF header at 0x54/0x58
        // (big-endian). That JPEG carries its own EXIF orientation, so return
        // ori 0 and let sharp auto-rotate.
        if (head.toString('latin1', 0, 15) === 'FUJIFILMCCD-RAW') {
            const off = head.readUInt32BE(0x54), len = head.readUInt32BE(0x58);
            if (off > 0 && len > 0 && off + len <= size) {
                const jpeg = Buffer.alloc(len);
                await fh.read(jpeg, 0, len, off);
                if (jpeg[0] === 0xFF && jpeg[1] === 0xD8) return { jpeg, ori: 0 };
            }
            return null;
        }

        let loc = locatePreview(head), parsed = head;
        if (!loc && size > headLen) { const all = Buffer.alloc(size); await fh.read(all, 0, size, 0); loc = locatePreview(all); parsed = all; }
        if (!loc || loc.off + loc.len > size) return null;
        const jpeg = Buffer.alloc(loc.len);
        await fh.read(jpeg, 0, loc.len, loc.off);
        if (jpeg[0] !== 0xFF || jpeg[1] !== 0xD8) return null; // JPEG SOI
        return { jpeg, ori: readOrientation(parsed) };
    } catch { return null; }
    finally { if (fh) await fh.close().catch(() => {}); }
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
    constructor({ proxyDir, exportDir, darktableBin = 'darktable-cli', dcrawEmuBin = 'dcraw_emu', maxConcurrent = 2, maxRawConcurrent = 4 } = {}) {
        this.proxyDir = proxyDir || null;
        this.exportDir = exportDir || null;
        this.darktable = darktableBin;
        this.dcrawEmu = dcrawEmuBin;
        this.limiter = new Limiter(maxConcurrent);          // darktable (heavy, export quality)
        this.rawLimiter = new Limiter(maxRawConcurrent);    // dcraw_emu (light, fast color demosaic)
    }

    get enabled() { return true; }

    // Grid thumbnail from the camera's embedded JPEG preview. Cached persistently
    // on disk (PROXY_DIR/thumbs/, keyed by id+mtime+size) so the library grid
    // never has to rebuild thumbnails — they're generated once per file and live
    // in their own subdir, untouched by the proxy-cache eviction.
    _thumbCachePath(cacheId, mtimeMs, size, longEdge, color) {
        if (!this.proxyDir || !cacheId) return null;
        const tag = `v${CACHE_VERSION}${color ? 'c' : ''}`;
        return path.join(this.proxyDir, 'thumbs', `${String(cacheId).replace(/[^\w-]/g, '')}_${mtimeMs}_${size}_${longEdge}_${tag}.jpg`);
    }
    async embeddedThumb(absPath, { longEdge = 480, cacheId, mtimeMs = 0, size = 0, color = false } = {}) {
        const cachePath = this._thumbCachePath(cacheId, mtimeMs, size, longEdge, color);
        if (cachePath) { try { return await fs.readFile(cachePath); } catch { /* miss */ } }

        let out = null;
        // `color` forces a colour demosaic (Reset path); otherwise use the as-shot
        // embedded preview.
        const src = color ? null : await this._previewJpeg(absPath);
        if (src) {
            try {
                let pipe = sharp(src.buf, { failOn: 'none' });
                pipe = src.ori ? applyOrientation(pipe, src.ori) : pipe.rotate(); // RAW: explicit; else auto-from-EXIF
                out = await pipe.resize(longEdge, longEdge, { fit: 'inside', withoutEnlargement: true })
                    .jpeg({ quality: 80 }).toBuffer();
            } catch { /* fall through */ }
        }
        if (!out && isRaw(absPath)) out = await this.decodeProxy(absPath, { longEdge, color });
        if (out && cachePath) {
            await fs.mkdir(path.dirname(cachePath), { recursive: true }).catch(() => {});
            await fs.writeFile(cachePath, out).catch(() => {});
        }
        return out;
    }

    // Source to develop from + how to orient it: the camera's embedded preview
    // for RAW (the as-shot rendering — kept even when it's a monochrome film sim,
    // so opening a B&W shot stays B&W and is instant), the file itself otherwise.
    // Colour from the raw sensor is available on demand via the `color` decode
    // path (see decodeProxy/embeddedThumb), e.g. when the user Resets. null if a
    // RAW has no usable embedded preview, so the caller demosaics instead.
    async _previewJpeg(absPath) {
        if (isRaw(absPath)) {
            const p = await extractRawPreview(absPath);
            if (p) return { buf: p.jpeg, ori: p.ori };
            try { const t = await exifr.thumbnail(absPath); if (t && t.byteLength) return { buf: Buffer.from(t), ori: 1 }; } catch { /* none */ }
            return null;
        }
        try { return { buf: await fs.readFile(absPath), ori: 0 }; } catch { return null; }
    }

    _cachePath(cacheId, longEdge, mtimeMs, size, color) {
        if (!this.proxyDir) return null;
        const tag = `v${CACHE_VERSION}${color ? 'c' : ''}`;
        return path.join(this.proxyDir, `${cacheId}_${mtimeMs}_${size}_${longEdge}_${tag}.jpg`);
    }

    // Editing/preview/export proxy: a quality JPEG at `longEdge`, cached on disk.
    // Default uses the as-shot embedded preview for RAW (instant). `color` forces
    // a colour demosaic of the raw sensor (the Reset path); darktable is the
    // fallback when dcraw_emu can't handle the file.
    async decodeProxy(absPath, { longEdge = 2048, mtimeMs = 0, size = 0, cacheId, color = false } = {}) {
        const id = cacheId || crypto.createHash('sha1').update(absPath).digest('hex').slice(0, 16);
        const cachePath = this._cachePath(id, longEdge, mtimeMs, size, color);
        if (cachePath) { try { return await fs.readFile(cachePath); } catch { /* miss */ } }

        let buf;
        const src = color ? null : await this._previewJpeg(absPath);
        if (src) {
            let pipe = sharp(src.buf, { failOn: 'none' });
            pipe = src.ori ? applyOrientation(pipe, src.ori) : pipe.rotate();
            buf = await pipe.resize(longEdge, longEdge, { fit: 'inside', withoutEnlargement: true })
                .jpeg({ quality: 88 }).toBuffer();
        } else if (isRaw(absPath)) {
            // Colour requested, or no embedded preview: demosaic the raw sensor.
            // dcraw_emu (libraw) is ~30x faster than darktable; darktable is fallback.
            try { buf = await this._decodeRawFast(absPath, longEdge); }
            catch { buf = await this._decodeRaw(absPath, longEdge); }
        } else {
            throw new Error('cannot decode ' + absPath);
        }

        if (cachePath) {
            await fs.mkdir(this.proxyDir, { recursive: true }).catch(() => {});
            await fs.writeFile(cachePath, buf).catch(() => {});
        }
        return buf;
    }

    // Edited thumbnail (a small JPEG from the client canvas, reflecting the
    // current develop) cached under PROXY_DIR/edited/<id>.jpg; served by /thumb.
    _editedThumbPath(id) { return this.proxyDir ? path.join(this.proxyDir, 'edited', String(id).replace(/[^\w-]/g, '') + '.jpg') : null; }
    async saveEditedThumb(id, buffer) {
        const p = this._editedThumbPath(id); if (!p) return;
        await fs.mkdir(path.dirname(p), { recursive: true }).catch(() => {});
        // normalize size so the grid stays light
        const out = await sharp(buffer).resize(480, 480, { fit: 'inside', withoutEnlargement: true }).jpeg({ quality: 82 }).toBuffer();
        await fs.writeFile(p, out);
    }
    async getEditedThumb(id) { const p = this._editedThumbPath(id); if (!p) return null; try { return await fs.readFile(p); } catch { return null; } }
    async deleteEditedThumb(id) { const p = this._editedThumbPath(id); if (!p) return; await fs.unlink(p).catch(() => {}); }

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

    // Fast colour demosaic via libraw's dcraw_emu (~1-4s, half-size). Output is
    // already oriented and sRGB, so sharp just resizes/encodes. Used for grid
    // thumbnails and develop proxies; darktable is reserved for export quality.
    async _decodeRawFast(absPath, longEdge) {
        return this.rawLimiter.run(async () => {
            const tmp = path.join(os.tmpdir(), 'le_' + crypto.randomBytes(7).toString('hex') + '.tiff');
            try {
                await this._dcrawEmu(absPath, tmp);
                const decoded = await fs.readFile(tmp);
                return await sharp(decoded, { failOn: 'none' })
                    .resize(longEdge, longEdge, { fit: 'inside', withoutEnlargement: true })
                    .jpeg({ quality: 88 }).toBuffer();
            } finally {
                fs.unlink(tmp).catch(() => {});
            }
        });
    }

    _dcrawEmu(src, dst) {
        return new Promise((resolve, reject) => {
            // -h half-size (fast), -w camera white balance, -o 1 sRGB, -T TIFF, -Z out
            const args = ['-h', '-w', '-o', '1', '-T', '-Z', dst, src];
            const ps = spawn(this.dcrawEmu, args, { stdio: ['ignore', 'ignore', 'pipe'] });
            let err = '';
            ps.stderr.on('data', (d) => { err += d.toString(); });
            ps.on('error', reject);
            ps.on('close', (code) => code === 0
                ? resolve()
                : reject(new Error(`dcraw_emu exit ${code}: ${err.slice(-300)}`)));
        });
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

// Smart previews: pre-generate grid thumbnails in the background so browsing is
// instant and the first-touch demosaic never blocks the UI. Idempotent —
// embeddedThumb returns the cached file when present, so re-runs only fill gaps
// (new/changed files). Newest files first, since that's what the user opens.
export async function warmLibrary(library, db, imaging, { log = () => {}, longEdge = 480, concurrency = 4 } = {}) {
    if (!library?.enabled || !imaging) return { warmed: 0, failed: 0, total: 0 };
    const rows = (await db.prepare(
        'SELECT id, rel_path, mtime, size FROM library_files ORDER BY mtime DESC'
    ).all().catch(() => ({ results: [] }))).results || [];
    let warmed = 0, failed = 0, i = 0;
    async function worker() {
        while (i < rows.length) {
            const r = rows[i++];
            try {
                await imaging.embeddedThumb(library.absPath(r.rel_path), { cacheId: r.id, mtimeMs: r.mtime, size: r.size, longEdge });
                warmed++;
            } catch { failed++; }
            const done = warmed + failed;
            if (done % 250 === 0) log(`thumbnail warm: ${done}/${rows.length}`);
        }
    }
    await Promise.all(Array.from({ length: Math.max(1, concurrency) }, () => worker()));
    log(`thumbnail warm done: ${warmed} ok, ${failed} failed of ${rows.length}`);
    return { warmed, failed, total: rows.length };
}
