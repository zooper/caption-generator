#!/usr/bin/env bash
# Migrate live data off Cloudflare into a local self-host data directory:
#   1. export the D1 database and load it into a SQLite file
#   2. download every R2 image referenced by the DB
# Produces $OUT/{caption-studio.sqlite,images/...} ready to copy to the host's
# DATA_DIR. Requires an authenticated wrangler (`wrangler login`).
#
# Usage: scripts/migrate-from-cloudflare.sh [output-dir]   (default ./migration-data)
set -euo pipefail

OUT="${1:-./migration-data}"
DB_NAME="ai-caption-studio-db"
BUCKET="ai-caption-studio-images"
DUMP="$OUT/dump.sql"
SQLITE="$OUT/caption-studio.sqlite"

mkdir -p "$OUT/images"

echo "==> Exporting D1 ($DB_NAME)…"
wrangler d1 export "$DB_NAME" --remote --output="$DUMP"

echo "==> Loading dump into $SQLITE (foreign keys deferred during bulk load)…"
rm -f "$SQLITE"
node -e "
const {DatabaseSync}=require('node:sqlite'); const fs=require('fs');
const db=new DatabaseSync('$SQLITE');
db.exec('PRAGMA foreign_keys=OFF;');
db.exec(fs.readFileSync('$DUMP','utf8'));
const v=db.prepare('PRAGMA foreign_key_check').all();
if (v.length) { console.error('FK violations:', v.length); process.exit(1); }
console.log('  loaded, schema_version', db.prepare('SELECT max(version) v FROM schema_version').get().v);
"

echo "==> Downloading R2 images referenced by the database…"
KEYS=$(node -e "
const {DatabaseSync}=require('node:sqlite');
const db=new DatabaseSync('$SQLITE');
for (const r of db.prepare(\"SELECT DISTINCT r2_key FROM uploaded_images WHERE r2_key IS NOT NULL AND r2_key<>''\").all()) console.log(r.r2_key);
")
n=0; fail=0
for key in $KEYS; do
  dest="$OUT/images/$key"
  mkdir -p "$(dirname "$dest")"
  if wrangler r2 object get "$BUCKET/$key" --file="$dest" --remote >/dev/null 2>&1; then
    n=$((n+1))
  else
    echo "  WARN: failed to fetch $key"; fail=$((fail+1))
  fi
done
echo "  downloaded $n image(s), $fail failure(s)"

cat <<EOF

Done. Migration data is in: $OUT
Copy it to the host's DATA_DIR (default /opt/caption-studio/data), e.g.:
  tar czf - -C "$OUT" caption-studio.sqlite images | ssh deploy@caption-studio 'tar xzf - -C /opt/caption-studio/data'
Then ensure the service can read it (data/ stays root-owned) and restart.
EOF
