#!/usr/bin/env bash
# One-time target-host provisioning for AI Caption Studio, following the
# jonsson-labs CI/CD-over-Tailscale-SSH runbook. Run as root on the LXC.
# Idempotent. See SELFHOST.md for the full sequence (LXC, Tailscale, DNS).
set -euo pipefail

APPDIR=/opt/caption-studio
SERVICE=caption-studio
DEPLOY_USER=deploy

[ "$(id -u)" -eq 0 ] || { echo "run as root" >&2; exit 1; }

mkdir -p "$APPDIR" "$APPDIR/data"

# sudo — needed so the deploy user can restart the root-owned service
command -v sudo >/dev/null || { apt-get update -qq && DEBIAN_FRONTEND=noninteractive apt-get install -y -qq sudo; }

# Imaging tools for the photo library / develop module:
#   darktable-cli  — high-quality raw demosaic (export)
#   libraw-bin     — dcraw_emu, fast half-size colour demosaic for thumbnails/proxies
#                    (~30x faster than darktable; required for snappy smart previews)
for pkg_bin in "darktable:darktable-cli" "libraw-bin:dcraw_emu"; do
  pkg="${pkg_bin%%:*}"; bin="${pkg_bin##*:}"
  command -v "$bin" >/dev/null || { apt-get update -qq && DEBIAN_FRONTEND=noninteractive apt-get install -y -qq "$pkg"; }
done

# deploy user — adopt the uid that already owns the code dir (if free) so it can
# write in place without a chown sweep
if ! id "$DEPLOY_USER" >/dev/null 2>&1; then
  APP_UID="$(stat -c %u "$APPDIR")"
  if getent passwd "$APP_UID" >/dev/null; then useradd -m -s /bin/bash "$DEPLOY_USER"
  else useradd -m -s /bin/bash -u "$APP_UID" "$DEPLOY_USER"; fi
fi

# narrow sudoers — deploy may ONLY manage this one unit (list /usr/bin AND /bin;
# usrmerge symlinks them but sudo matches by absolute path). The is-active argv
# below must match exactly what the CI deploy step runs (no extra flags).
cat >/etc/sudoers.d/deploy-$SERVICE <<SUDOERS
deploy ALL=(root) NOPASSWD: /usr/bin/systemctl restart $SERVICE, /bin/systemctl restart $SERVICE, /usr/bin/systemctl is-active $SERVICE, /bin/systemctl is-active $SERVICE, /usr/bin/journalctl -u $SERVICE *, /bin/journalctl -u $SERVICE *
SUDOERS
chmod 0440 /etc/sudoers.d/deploy-$SERVICE
visudo -cf /etc/sudoers.d/deploy-$SERVICE

# deploy owns the app code + node_modules so it can update them in place.
# .env and data/ are re-asserted root-owned below — secrets/state stay private.
chown -R "$DEPLOY_USER" "$APPDIR"
if [ -f "$APPDIR/.env" ]; then chown root:root "$APPDIR/.env"; chmod 600 "$APPDIR/.env"; fi
chown -R root:root "$APPDIR/data" 2>/dev/null || true

# Tailscale SSH server (the tailnet ACL must also permit runner -> deploy).
tailscale set --ssh=true || echo "WARN: 'tailscale set --ssh=true' failed — is tailscale up & is /dev/net/tun passed through?"

echo "Provisioned. Next: place .env in $APPDIR, install the systemd unit, then push to deploy."
