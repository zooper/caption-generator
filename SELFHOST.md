# Self-hosting AI Caption Studio

This app was ported off Cloudflare Workers to run as a plain Node.js service on
a homelab LXC. Deployment follows the
[jonsson-labs CI/CD-over-Tailscale-SSH runbook](https://code.linuxburken.se/jonsson-labs/documentation/src/branch/main/guides/ci-cd-deployment.md).

## Architecture after the port

The same Hono app (`worker.js`) runs unchanged; `server-node.js` injects Node
implementations of the two Cloudflare bindings and serves static files:

| Cloudflare | Self-hosted | Where |
|---|---|---|
| D1 (SQLite) | `node:sqlite` file | `bindings/d1-sqlite.js` → `DATA_DIR/caption-studio.sqlite` |
| R2 bucket | local filesystem | `bindings/r2-fs.js` → `DATA_DIR/images/` |
| Workers Assets | `@hono/node-server` serveStatic | `public/` |
| `scheduled` cron | `node-cron` | `server-node.js` (every-minute posts, daily IG refresh) |
| Secrets / vars | `.env` (dotenv) | `/opt/caption-studio/.env` |

Run locally: `cp .env.example .env`, set at least `JWT_SECRET`, then `npm start`.

## One-time setup

### 1. Create the LXC (Proxmox)
Debian/Ubuntu unprivileged container. **Pass through `/dev/net/tun`** before
Tailscale will start (see the runbook's "Proxmox LXC" section):
```
# /etc/pve/lxc/<ctid>.conf  (on the Proxmox host), then: pct stop/start <ctid>
lxc.cgroup2.devices.allow: c 10:200 rwm
lxc.mount.entry: /dev/net/tun dev/net/tun none bind,create=file
```
Install Node 24+ (`node:sqlite` is unflagged on 24+) and Caddy. Bring up
Tailscale **tagged** so the deploy ACL matches:
`tailscale up --advertise-tags=tag:server --ssh --hostname=caption-studio`.

### 2. Provision the deploy user
Copy the repo to `/opt/caption-studio` (or let the first deploy populate it) and run:
```
sudo bash scripts/provision-deploy.sh
```
Creates the `deploy` user, a narrow sudoers rule (restart this unit only), and
enables Tailscale SSH.

### 3. Secrets + service
```
sudo cp .env.example /opt/caption-studio/.env   # fill it in; chmod 600, root-owned
sudo cp deploy/caption-studio.service /etc/systemd/system/
sudo systemctl daemon-reload && sudo systemctl enable --now caption-studio
```
Set `PUBLIC_ORIGIN`/`RP_ID` to your real domain — **passkeys are bound to
`RP_ID`**, so existing Cloudflare passkeys won't carry over; users re-register.

### 4. TLS / ingress
Point DNS at the host, set `deploy/Caddyfile`'s hostname to match
`PUBLIC_ORIGIN`, install it at `/etc/caddy/Caddyfile`, `systemctl reload caddy`.

### 5. Tailnet ACL (for CI deploys)
In `zooper/tailscale-acl`, add an `ssh` rule allowing the runner tag → the
target tag as user `deploy` (see runbook Step 2). Set `DEPLOY_TARGET` in
`.forgejo/workflows/ci.yml` to the target's MagicDNS name.

## Migrate existing data

With wrangler authenticated (`wrangler login`):
```
scripts/migrate-from-cloudflare.sh           # -> ./migration-data/{caption-studio.sqlite,images/}
```
This exports D1, loads it into SQLite, and downloads every R2 image referenced
by the DB. Copy the result into the host's `DATA_DIR`:
```
tar czf - -C migration-data caption-studio.sqlite images \
  | ssh deploy@caption-studio 'tar xzf - -C /opt/caption-studio/data'
sudo chown -R root:root /opt/caption-studio/data
sudo systemctl restart caption-studio
```

## CI/CD

`.forgejo/workflows/ci.yml`: every push/PR runs `check` (syntax gate); a green
push to `main` runs `deploy`, which tars **code only** to the host over
Tailscale SSH, `npm install --omit=dev`, and restarts the service. `.env`,
`data/`, and `node_modules` live on the host and are never shipped, so runtime
state survives deploys.

## Notes / gotchas
- **Service runs as root** to read the root-owned `.env` (matches the deploy
  model where `deploy` ships code but can't read secrets). Harden with a
  dedicated user + group-readable `.env` if desired.
- A **fresh** (empty) DB is bootstrapped from `schema.sql` (regenerated from the
  live v15 D1 schema) and lands at schema version 15; default tiers/settings are
  created by the app on first use.
- `node:sqlite` requires **Node 24+** unflagged. The CI and systemd target 24.
- Backups: `DATA_DIR/caption-studio.sqlite` (+ `images/`) is the whole state.
  Snapshot it (Litestream is a good streaming-backup option for the SQLite file).

## Photo library / editor (NAS-backed)

The app can browse and non-destructively develop a directory of RAW/JPEG files
in place (no upload), then caption/post the result. This is **self-host only**
(Node), provided as injected bindings (`LibraryFS`/`Imaging`) — it no-ops on
Cloudflare. Originals are **read-only**; edits are stored as JSON edit stacks in
the DB and exports are written to a separate folder.

Requirements on the LXC:
- **`darktable-cli`** on `PATH` (RAW demosaic). `sharp` (bundled libvips) handles
  JPEG/PNG/HEIC + proxy resizing and is an npm dependency.
- Mount the NAS photo directory into the container (read-only is fine).

Env vars (all optional — unset `LIBRARY_DIR` keeps the editor dormant):

| Var | Default | Purpose |
|-----|---------|---------|
| `LIBRARY_DIR` | _(unset)_ | NAS mount to index/browse. Editor is off when unset. |
| `PROXY_DIR` | `DATA_DIR/proxies` | Cached decode/resize JPEGs. |
| `EXPORT_DIR` | `DATA_DIR/exports` | Where developed exports are written. |
| `DARKTABLE_BIN` | `darktable-cli` | Override the darktable binary path. |
| `LIBRARY_RESCAN_MINUTES` | `10` | Background re-index interval (0 = off). |
| `PROXY_CACHE_MB` | `1024` | Proxy cache size cap before oldest are evicted. |

The catalog indexes into `library_files` (schema v16); edit stacks live in
`edit_stacks` (v17). Both are created by the normal migration path.

### Mounting the NAS photo share

Point `LIBRARY_DIR` at an NFS mount of the photo directory. Example for a share
at `192.168.0.44:/var/nfs/shared/Photos`:

```bash
# one-off (lost on reboot):
sudo mount -t nfs 192.168.0.44:/var/nfs/shared/Photos /mnt

# persistent — add to /etc/fstab (read-only matches "originals are read-only"):
192.168.0.44:/var/nfs/shared/Photos  /mnt  nfs  ro,_netdev,nofail  0 0
```

Then set `LIBRARY_DIR=/mnt` in `/opt/caption-studio/.env` and
`systemctl restart caption-studio`. The bundled unit has
`RequiresMountsFor=/mnt` so the service waits for the mount before its startup
scan (adjust the path if `LIBRARY_DIR` differs).

**Unprivileged LXC:** the kernel usually blocks in-container NFS mounts. Either
make the CT privileged, or mount the NFS on the Proxmox host and bind it in via
`lxc.cgroup`/`lxc.mount.entry` (e.g. `lxc.mount.entry: /mnt/photos mnt none bind,create=dir`).
