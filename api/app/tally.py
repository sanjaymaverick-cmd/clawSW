"""Phase 5 — Tally XML bridge.

Tally Prime stays the accounting/invoicing system of record. This module
talks to its local XML-over-HTTP gateway (blueprint section 6): confirmed
website orders are pushed as Sales voucher XML, and Receipt vouchers are
polled back so payment status lands in `tally_sync_log`.

Everything here is deliberately isolated: callers (the /tally router and
the tally_worker service) treat every gateway call as fallible, log the
outcome to `tally_sync_log`, and never let a Tally outage block inventory
or service operations.

Tally-side prerequisites (set up in a SANDBOX company file first):
- "Enable ODBC/XML Server" turned on (gateway on TALLY_URL, default :9000)
- ledgers named by TALLY_SALES_LEDGER / TALLY_PARTY_LEDGER exist
- stock items named exactly like `items.name` exist (for inventory lines)
"""
import logging
import uuid
import xml.etree.ElementTree as ET
from dataclasses import dataclass
from datetime import datetime, timezone

import httpx
from sqlalchemy import select
from sqlalchemy.orm import Session

from .config import settings
from .models import Item, TallySyncLog, WebsiteOrder, WebsiteOrderItem

logger = logging.getLogger(__name__)


def voucher_number(order: WebsiteOrder) -> str:
    """Stable, human-readable voucher number derived from the order id,
    so re-pushes are detectable as duplicates on the Tally side."""
    return f"WEB-{order.id.hex[:12].upper()}"


def _el(parent: ET.Element, tag: str, text: str | None = None) -> ET.Element:
    child = ET.SubElement(parent, tag)
    if text is not None:
        child.text = text
    return child


def build_sales_voucher_xml(db: Session, order: WebsiteOrder) -> str:
    """Sales (item invoice) voucher for a confirmed website order.

    Party ledger is debited for the total; each order line becomes an
    inventory entry allocated to the sales ledger. ElementTree handles all
    escaping, so customer-supplied text is safe in the payload.
    """
    lines = db.execute(
        select(WebsiteOrderItem, Item)
        .join(Item, WebsiteOrderItem.item_id == Item.id)
        .where(WebsiteOrderItem.order_id == order.id)
    ).all()
    total = sum(l.quantity * l.price_at_order for l, _ in lines)

    envelope = ET.Element("ENVELOPE")
    header = _el(envelope, "HEADER")
    _el(header, "TALLYREQUEST", "Import Data")
    body = _el(envelope, "BODY")
    importdata = _el(body, "IMPORTDATA")
    requestdesc = _el(importdata, "REQUESTDESC")
    _el(requestdesc, "REPORTNAME", "Vouchers")
    if settings.tally_company:
        staticvars = _el(requestdesc, "STATICVARIABLES")
        _el(staticvars, "SVCURRENTCOMPANY", settings.tally_company)
    requestdata = _el(importdata, "REQUESTDATA")
    message = _el(requestdata, "TALLYMESSAGE")
    message.set("xmlns:UDF", "TallyUDF")

    voucher = _el(message, "VOUCHER")
    voucher.set("VCHTYPE", "Sales")
    voucher.set("ACTION", "Create")
    vch_date = order.created_at.strftime("%Y%m%d")
    _el(voucher, "DATE", vch_date)
    _el(voucher, "EFFECTIVEDATE", vch_date)
    _el(voucher, "VOUCHERTYPENAME", "Sales")
    _el(voucher, "VOUCHERNUMBER", voucher_number(order))
    _el(voucher, "REFERENCE", voucher_number(order))
    _el(voucher, "PARTYLEDGERNAME", settings.tally_party_ledger)
    _el(voucher, "BASICBUYERNAME", order.customer_name)
    _el(voucher, "ISINVOICE", "Yes")
    _el(
        voucher,
        "NARRATION",
        f"clawSW website order {order.id} — {order.customer_name}"
        f" <{order.email}>" + (f" {order.phone}" if order.phone else ""),
    )

    # Party ledger debit for the invoice total.
    party = _el(voucher, "LEDGERENTRIES.LIST")
    _el(party, "LEDGERNAME", settings.tally_party_ledger)
    _el(party, "ISDEEMEDPOSITIVE", "Yes")
    _el(party, "AMOUNT", f"{-total:.2f}")

    # One inventory entry per order line, allocated to the sales ledger.
    for line, item in lines:
        unit = item.unit or "Nos"
        amount = line.quantity * line.price_at_order
        entry = _el(voucher, "ALLINVENTORYENTRIES.LIST")
        _el(entry, "STOCKITEMNAME", item.name)
        _el(entry, "ISDEEMEDPOSITIVE", "No")
        _el(entry, "RATE", f"{line.price_at_order:.2f}/{unit}")
        _el(entry, "ACTUALQTY", f"{line.quantity:g} {unit}")
        _el(entry, "BILLEDQTY", f"{line.quantity:g} {unit}")
        _el(entry, "AMOUNT", f"{amount:.2f}")
        allocation = _el(entry, "ACCOUNTINGALLOCATIONS.LIST")
        _el(allocation, "LEDGERNAME", settings.tally_sales_ledger)
        _el(allocation, "ISDEEMEDPOSITIVE", "No")
        _el(allocation, "AMOUNT", f"{amount:.2f}")

    return ET.tostring(envelope, encoding="unicode")


def build_receipts_export_xml() -> str:
    """Export request for Receipt vouchers (payment status pull)."""
    envelope = ET.Element("ENVELOPE")
    header = _el(envelope, "HEADER")
    _el(header, "TALLYREQUEST", "Export Data")
    body = _el(envelope, "BODY")
    exportdata = _el(body, "EXPORTDATA")
    requestdesc = _el(exportdata, "REQUESTDESC")
    _el(requestdesc, "REPORTNAME", "Voucher Register")
    staticvars = _el(requestdesc, "STATICVARIABLES")
    _el(staticvars, "SVEXPORTFORMAT", "$$SysName:XML")
    _el(staticvars, "VOUCHERTYPENAME", "Receipt")
    if settings.tally_company:
        _el(staticvars, "SVCURRENTCOMPANY", settings.tally_company)
    return ET.tostring(envelope, encoding="unicode")


@dataclass
class ImportResult:
    ok: bool
    error: str | None = None


def parse_import_response(text: str) -> ImportResult:
    """Tally's import reply carries CREATED/ALTERED/ERRORS counters and,
    on failure, a LINEERROR message."""
    try:
        root = ET.fromstring(text)
    except ET.ParseError:
        return ImportResult(ok=False, error=f"Unparseable Tally response: {text[:200]}")

    def _int(tag: str) -> int:
        el = root.find(f".//{tag}")
        try:
            return int(el.text.strip()) if el is not None and el.text else 0
        except ValueError:
            return 0

    errors = _int("ERRORS")
    created = _int("CREATED") + _int("ALTERED")
    if errors == 0 and created > 0:
        return ImportResult(ok=True)
    line_error = root.find(".//LINEERROR")
    detail = (
        line_error.text.strip()
        if line_error is not None and line_error.text
        else f"Tally reported created={created} errors={errors}"
    )
    return ImportResult(ok=False, error=detail)


class TallyClient:
    """Thin HTTP wrapper around the Tally gateway. A custom transport can
    be injected for tests; every call has a hard timeout so a hung Tally
    never hangs a caller."""

    def __init__(self, transport: httpx.BaseTransport | None = None):
        self._client = httpx.Client(
            base_url=settings.tally_url,
            timeout=settings.tally_timeout_seconds,
            transport=transport,
        )

    def request(self, xml: str) -> str:
        resp = self._client.post(
            "/", content=xml.encode(), headers={"Content-Type": "text/xml"}
        )
        resp.raise_for_status()
        return resp.text

    def is_reachable(self) -> bool:
        try:
            self._client.get("/")
            return True
        except httpx.HTTPError:
            return False

    def close(self) -> None:
        self._client.close()


def get_tally_client():
    """FastAPI dependency; overridden in tests with a mock transport."""
    client = TallyClient()
    try:
        yield client
    finally:
        client.close()


def _log(
    db: Session,
    *,
    direction: str,
    entity_type: str,
    entity_id: uuid.UUID,
    status: str,
    error_message: str | None = None,
) -> TallySyncLog:
    entry = TallySyncLog(
        direction=direction,
        entity_type=entity_type,
        entity_id=entity_id,
        status=status,
        error_message=error_message,
        synced_at=datetime.now(timezone.utc),
    )
    db.add(entry)
    return entry


def push_order(db: Session, client: TallyClient, order: WebsiteOrder) -> TallySyncLog:
    """Push one confirmed order to Tally as a Sales voucher.

    On success the order flips 'confirmed' → 'synced_to_tally'; either way
    the outcome is committed to tally_sync_log. Never raises on gateway
    trouble — the log row is the result.
    """
    xml = build_sales_voucher_xml(db, order)
    try:
        result = parse_import_response(client.request(xml))
    except httpx.HTTPError as exc:
        result = ImportResult(ok=False, error=f"Tally gateway unreachable: {exc}")

    if result.ok:
        order.status = "synced_to_tally"
        entry = _log(
            db,
            direction="to_tally",
            entity_type="website_order",
            entity_id=order.id,
            status="success",
        )
        logger.info("Pushed order %s to Tally as %s", order.id, voucher_number(order))
    else:
        entry = _log(
            db,
            direction="to_tally",
            entity_type="website_order",
            entity_id=order.id,
            status="failed",
            error_message=(result.error or "unknown error")[:2000],
        )
        logger.warning("Tally push failed for order %s: %s", order.id, result.error)
    db.commit()
    db.refresh(entry)
    return entry


def push_confirmed_orders(db: Session, client: TallyClient) -> list[TallySyncLog]:
    """Worker entrypoint: push every order awaiting sync. Failures stay
    'confirmed' and are retried on the next cycle."""
    orders = list(
        db.execute(
            select(WebsiteOrder)
            .where(WebsiteOrder.status == "confirmed")
            .order_by(WebsiteOrder.created_at)
        ).scalars()
    )
    return [push_order(db, client, order) for order in orders]


def pull_payments(db: Session, client: TallyClient) -> list[TallySyncLog]:
    """Poll Tally's Receipt vouchers and record payment status.

    A synced order counts as paid when any receipt voucher mentions its
    voucher number (Tally keeps the WEB-... reference we pushed). Each
    payment is logged once — re-polls never duplicate rows.
    """
    synced = list(
        db.execute(
            select(WebsiteOrder).where(WebsiteOrder.status == "synced_to_tally")
        ).scalars()
    )
    if not synced:
        return []

    try:
        text = client.request(build_receipts_export_xml())
        root = ET.fromstring(text)
    except (httpx.HTTPError, ET.ParseError) as exc:
        logger.warning("Tally payment pull failed: %s", exc)
        return []

    receipt_text = " ".join(
        el.text for voucher in root.iter("VOUCHER") for el in voucher.iter() if el.text
    )

    already_paid = {
        row
        for row in db.execute(
            select(TallySyncLog.entity_id).where(
                TallySyncLog.direction == "from_tally",
                TallySyncLog.status == "payment_received",
            )
        ).scalars()
    }

    entries = []
    for order in synced:
        if order.id in already_paid:
            continue
        if voucher_number(order) in receipt_text:
            entries.append(
                _log(
                    db,
                    direction="from_tally",
                    entity_type="website_order",
                    entity_id=order.id,
                    status="payment_received",
                )
            )
            logger.info("Payment received in Tally for order %s", order.id)
    if entries:
        db.commit()
    return entries
