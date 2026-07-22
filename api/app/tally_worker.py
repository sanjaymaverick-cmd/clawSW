"""Phase 5 — Tally bridge worker (its own compose service: `tally-bridge`).

Runs beside the API as a separate process so Tally sync never shares a
fate with request handling: each cycle pushes confirmed website orders as
Sales vouchers and polls Receipt vouchers for payment status. Every cycle
is fully guarded — a Tally or database hiccup is logged and retried on
the next tick, never fatal.

Run with:  python -m app.tally_worker
"""
import logging
import time

from . import audit  # noqa: F401 — registers the audit_log flush listener
from .config import settings
from .db import SessionLocal
from .tally import TallyClient, pull_payments, push_confirmed_orders

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def run_cycle(client: TallyClient) -> None:
    with SessionLocal() as db:
        pushed = push_confirmed_orders(db, client)
        payments = pull_payments(db, client)
    if pushed or payments:
        logger.info(
            "Sync cycle: %d push(es) (%d ok), %d payment(s) recorded",
            len(pushed),
            sum(1 for e in pushed if e.status == "success"),
            len(payments),
        )


def main() -> None:
    logger.info(
        "Tally bridge worker started — gateway %s, every %ds",
        settings.tally_url,
        settings.tally_sync_interval_seconds,
    )
    client = TallyClient()
    while True:
        try:
            run_cycle(client)
        except Exception:
            # e.g. database not migrated yet on first boot, or restarting.
            logger.exception("Sync cycle failed; retrying next interval")
        time.sleep(settings.tally_sync_interval_seconds)


if __name__ == "__main__":
    main()
