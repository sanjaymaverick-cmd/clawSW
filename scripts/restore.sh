#!/bin/sh
# Phase 6 — restore an encrypted backup into the running Postgres.
#
#   docker compose run --rm backup /scripts/restore.sh /backups/clawsw-<stamp>.sql.gz.enc
#
# Restores into PGDATABASE using the same BACKUP_PASSPHRASE that encrypted
# the file. The dump is plain SQL: restore into an EMPTY database (e.g.
# after `docker compose down` + moving ./pgdata aside + `up db`), otherwise
# CREATE TABLE statements will collide with existing objects.
set -eu

FILE="${1:?usage: restore.sh /backups/<file>.sql.gz.enc}"
: "${BACKUP_PASSPHRASE:?BACKUP_PASSPHRASE not set}"
[ -f "${FILE}" ] || { echo "no such backup: ${FILE}" >&2; exit 1; }

echo "restoring ${FILE} into database '${PGDATABASE}' on ${PGHOST}…"
openssl enc -d -aes-256-cbc -pbkdf2 -iter 200000 \
    -pass env:BACKUP_PASSPHRASE -in "${FILE}" \
  | gunzip \
  | psql --set ON_ERROR_STOP=1 --quiet
echo "restore complete"
