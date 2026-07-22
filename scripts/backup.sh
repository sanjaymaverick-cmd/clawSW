#!/bin/sh
# Phase 6 — one encrypted Postgres backup (run inside the `backup` service).
#
# pg_dump | gzip | AES-256 (openssl, passphrase from BACKUP_PASSPHRASE) into
# /backups, which docker-compose.yml mounts from BACKUP_DIR on the host —
# point that at a SECOND local disk (e.g. /mnt/backup-disk/clawsw) so a
# failure of the primary SSD doesn't take the backups with it.
# Backups older than BACKUP_RETENTION_DAYS are pruned after each success.
set -eu

: "${PGHOST:?PGHOST not set}"
: "${PGUSER:?PGUSER not set}"
: "${PGPASSWORD:?PGPASSWORD not set}"
: "${PGDATABASE:?PGDATABASE not set}"
: "${BACKUP_PASSPHRASE:?BACKUP_PASSPHRASE not set — refusing to write an unencrypted backup}"

BACKUP_ROOT="/backups"
RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-30}"
STAMP="$(date -u +%Y%m%d-%H%M%S)"
OUT="${BACKUP_ROOT}/clawsw-${STAMP}.sql.gz.enc"
TMP="${OUT}.partial"

# -pass env: keeps the passphrase out of the process list and the archive.
pg_dump --no-owner --no-privileges \
  | gzip \
  | openssl enc -aes-256-cbc -pbkdf2 -iter 200000 -salt \
      -pass env:BACKUP_PASSPHRASE -out "${TMP}"

# A dump this small can never legitimately be empty; treat it as a failure.
[ -s "${TMP}" ] || { echo "backup produced an empty file" >&2; rm -f "${TMP}"; exit 1; }
mv "${TMP}" "${OUT}"
echo "backup written: ${OUT} ($(du -h "${OUT}" | cut -f1))"

find "${BACKUP_ROOT}" -name 'clawsw-*.sql.gz.enc' -type f \
  -mtime +"${RETENTION_DAYS}" -print -delete | sed 's/^/pruned: /' || true
