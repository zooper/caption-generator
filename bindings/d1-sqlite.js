// D1-compatible adapter over Node's built-in node:sqlite.
//
// worker.js talks to the database exclusively through the Cloudflare D1
// interface: db.prepare(sql).bind(...args).run()/.first()/.all(). This class
// implements that same surface on top of a local SQLite file so the worker
// runs unchanged on Node. Result shapes mirror D1's:
//   run()  -> { success, changes, meta: { changes, last_row_id, duration } }
//   first()-> row object | null   (or a single column value if a name is given)
//   all()  -> { success, results: [...], meta: { ... } }
import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

// node:sqlite (like better-sqlite3) rejects undefined and booleans as bound
// values. The worker mostly normalises with `|| null`, but coerce defensively.
function sanitize(params) {
    return params.map((p) => {
        if (p === undefined) return null;
        if (typeof p === 'boolean') return p ? 1 : 0;
        return p;
    });
}

class Statement {
    constructor(db, sql, params = []) {
        this.db = db;
        this.sql = sql;
        this.params = params;
    }

    // D1's bind() returns a new bound statement; replicate that immutability.
    bind(...args) {
        return new Statement(this.db, this.sql, args);
    }

    _prepared() {
        return this.db._prepare(this.sql);
    }

    async run() {
        try {
            const info = this._prepared().run(...sanitize(this.params));
            const changes = Number(info.changes);
            return {
                success: true,
                changes,
                meta: {
                    changes,
                    last_row_id: Number(info.lastInsertRowid),
                    duration: 0,
                },
            };
        } catch (err) {
            // Multi-statement DDL can't be prepared; fall back to exec().
            if (this.params.length === 0 && /more than one statement|multiple statements/i.test(err.message)) {
                this.db._db.exec(this.sql);
                return { success: true, changes: 0, meta: { changes: 0, last_row_id: 0, duration: 0 } };
            }
            throw err;
        }
    }

    async first(column) {
        const row = this._prepared().get(...sanitize(this.params));
        if (row === undefined || row === null) return null;
        return column ? (row[column] ?? null) : row;
    }

    async all() {
        const results = this._prepared().all(...sanitize(this.params));
        return {
            success: true,
            results,
            meta: { changes: 0, last_row_id: 0, duration: 0 },
        };
    }
}

export class D1SQLite {
    constructor(filePath) {
        mkdirSync(dirname(filePath), { recursive: true });
        this._db = new DatabaseSync(filePath);
        // Sensible defaults for a server workload.
        this._db.exec('PRAGMA journal_mode = WAL');
        this._db.exec('PRAGMA foreign_keys = ON');
        this._db.exec('PRAGMA busy_timeout = 5000');
        this._stmtCache = new Map();
    }

    // Cache prepared statements by SQL text — the worker reuses the same
    // queries heavily (152 distinct ones, hit on every request/cron tick).
    _prepare(sql) {
        let stmt = this._stmtCache.get(sql);
        if (!stmt) {
            stmt = this._db.prepare(sql);
            this._stmtCache.set(sql, stmt);
        }
        return stmt;
    }

    prepare(sql) {
        return new Statement(this, sql);
    }
}
