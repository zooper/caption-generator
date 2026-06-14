// R2-compatible adapter backed by the local filesystem.
//
// worker.js uses three R2 operations: put(key, body, {httpMetadata,
// customMetadata}), get(key) -> object|null, and delete(key). Object content
// is stored under <root>/<key>; the httpMetadata/customMetadata sidecar lives
// under <root>/.r2meta/<key>.json so it never collides with content keys.
import { promises as fs } from 'node:fs';
import path from 'node:path';

function guessContentType(key) {
    const ext = path.extname(key).toLowerCase();
    return {
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.png': 'image/png',
        '.gif': 'image/gif',
        '.webp': 'image/webp',
        '.zip': 'application/zip',
    }[ext] || 'application/octet-stream';
}

function toBytes(body) {
    if (body == null) return Buffer.alloc(0);
    if (Buffer.isBuffer(body)) return body;
    if (body instanceof ArrayBuffer) return Buffer.from(body);
    if (ArrayBuffer.isView(body)) return Buffer.from(body.buffer, body.byteOffset, body.byteLength);
    if (typeof body === 'string') return Buffer.from(body, 'utf8');
    throw new TypeError('Unsupported R2 put body type: ' + typeof body);
}

export class R2FS {
    constructor(rootDir) {
        this.root = path.resolve(rootDir);
        this.metaRoot = path.join(this.root, '.r2meta');
    }

    // Resolve a key to an absolute path and guard against traversal.
    _resolve(base, key) {
        const full = path.resolve(base, key);
        if (full !== base && !full.startsWith(base + path.sep)) {
            throw new Error('Invalid R2 key (path traversal): ' + key);
        }
        return full;
    }

    async put(key, body, options = {}) {
        const bytes = toBytes(body);
        const filePath = this._resolve(this.root, key);
        await fs.mkdir(path.dirname(filePath), { recursive: true });
        await fs.writeFile(filePath, bytes);

        const metaPath = this._resolve(this.metaRoot, key) + '.json';
        await fs.mkdir(path.dirname(metaPath), { recursive: true });
        await fs.writeFile(metaPath, JSON.stringify({
            httpMetadata: options.httpMetadata || {},
            customMetadata: options.customMetadata || {},
            size: bytes.length,
            uploaded: new Date().toISOString(),
        }));
        return { key, size: bytes.length };
    }

    async get(key) {
        const filePath = this._resolve(this.root, key);
        let bytes;
        try {
            bytes = await fs.readFile(filePath);
        } catch (err) {
            if (err.code === 'ENOENT') return null; // R2 returns null on miss
            throw err;
        }

        let meta = {};
        try {
            meta = JSON.parse(await fs.readFile(this._resolve(this.metaRoot, key) + '.json', 'utf8'));
        } catch { /* sidecar optional */ }

        const httpMetadata = meta.httpMetadata && meta.httpMetadata.contentType
            ? meta.httpMetadata
            : { ...meta.httpMetadata, contentType: guessContentType(key) };
        const body = new Uint8Array(bytes.buffer, bytes.byteOffset, bytes.byteLength);

        return {
            key,
            size: bytes.length,
            body, // accepted directly by `new Response(...)`
            httpMetadata,
            customMetadata: meta.customMetadata || {},
            async arrayBuffer() {
                return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
            },
            async text() {
                return bytes.toString('utf8');
            },
        };
    }

    async delete(key) {
        for (const p of [this._resolve(this.root, key), this._resolve(this.metaRoot, key) + '.json']) {
            try {
                await fs.unlink(p);
            } catch (err) {
                if (err.code !== 'ENOENT') throw err;
            }
        }
    }
}
