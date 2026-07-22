#!/bin/sh
# Phase 6 — the `backup` service's entrypoint: a basic backup cron.
# Takes one backup immediately on start (so a fresh deployment is covered
# from minute one), then one every BACKUP_INTERVAL_SECONDS (default daily).
# A failed run logs and retries next interval — it never kills the loop.
set -u

INTERVAL="${BACKUP_INTERVAL_SECONDS:-86400}"
echo "backup cron started — every ${INTERVAL}s, retention ${BACKUP_RETENTION_DAYS:-30} days"
while true; do
  if ! /scripts/backup.sh; then
    echo "backup FAILED — will retry in ${INTERVAL}s" >&2
  fi
  sleep "${INTERVAL}"
done
