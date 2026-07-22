"""Phase 7 — AI query layer: sanitization boundary + Claude API call.

This module is the ONLY place where data leaves the local server for the
Claude API (blueprint section 1: "Any query that hits the Claude API must
go through a clearly marked boundary"). The boundary is `sanitize_question`,
a pure-ish, directly testable function that:

1. classifies which resource(s) the natural-language question touches,
2. pulls only the minimum aggregated data needed to answer it — counts,
   sums, groupings — NEVER raw rows,
3. returns a payload whose queries never even SELECT a PII column
   (customer_name, email, phone) — so no code path can leak them, and
4. gates the financial section behind role == 'owner' AND an explicit
   per-request opt-in flag, per the blueprint's Phase 7 note.

Even with owner + opt-in, only financial *aggregates* (values, totals) are
sent — customer PII never leaves the building under any flag, because no
aggregate here reads those columns. Staff names are likewise excluded;
only counts are transmitted.

What was sent is recorded to audit_log (via audit.record_event) by the
router BEFORE the network call, so the outbound payload is always
reconstructable even if the call itself fails.
"""
import json
import re
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone

import anthropic
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from .config import settings
from .models import (
    CompletedProject,
    DemoBooking,
    Item,
    JobPartUsed,
    Machinery,
    ServiceJob,
    StockLevel,
    StockMove,
    Warehouse,
    WebsiteOrder,
    WebsiteOrderItem,
)


class AiQueryNotConfigured(Exception):
    """ANTHROPIC_API_KEY is not set — the AI layer is optional (blueprint)."""


class AiQueryFailed(Exception):
    """The Claude API returned no usable answer."""


# Which aggregate sections a question can pull in, by keyword. 'financial'
# is special: matching it is not enough — see sanitize_question. A keyword
# matches when it is a case-insensitive prefix of any word, so "stocked"
# hits "stock" but "reorder" does not hit "order".
RESOURCE_KEYWORDS: dict[str, tuple[str, ...]] = {
    "inventory": (
        "stock", "inventory", "item", "warehouse", "spare", "tool",
        "reorder", "sku", "quantity",
    ),
    "service_jobs": (
        "service", "job", "technician", "repair", "maintenance", "machine",
    ),
    "website": (
        "order", "website", "booking", "demo", "customer", "lead",
        "project", "catalog",
    ),
    "financial": (
        "revenue", "invoice", "billed", "billing", "sales", "value",
        "price", "cost", "financial", "money", "worth", "profit",
    ),
}

# Sections every role with ai_query access may receive.
NON_FINANCIAL_RESOURCES = ("inventory", "service_jobs", "website")


@dataclass
class SanitizedQuery:
    """What may be sent to the Claude API, and nothing else."""

    resources: list[str]  # sections included in `payload`, for transparency
    payload: dict         # aggregates only — no rows, no PII, no names
    financial_included: bool


def classify_question(question: str) -> list[str]:
    """Step 1: decide which table groups the question touches.

    A question that matches nothing gets the full non-financial overview —
    better a slightly larger aggregate payload than a wrong "no data"
    answer; financial is never included by fallback.
    """
    words = re.findall(r"[a-z]+", question.lower())
    matched = [
        resource
        for resource, keywords in RESOURCE_KEYWORDS.items()
        if any(word.startswith(keyword) for keyword in keywords for word in words)
    ]
    if not any(r in NON_FINANCIAL_RESOURCES for r in matched):
        matched = [r for r in NON_FINANCIAL_RESOURCES] + [
            r for r in matched if r == "financial"
        ]
    return matched


def _inventory_aggregate(db: Session) -> dict:
    week_ago = datetime.now(timezone.utc) - timedelta(days=7)
    low_stock = db.execute(
        select(func.count())
        .select_from(
            select(Item.id)
            .outerjoin(StockLevel, StockLevel.item_id == Item.id)
            .where(Item.reorder_level > 0)
            .group_by(Item.id, Item.reorder_level)
            .having(
                func.coalesce(func.sum(StockLevel.quantity), 0)
                <= Item.reorder_level
            )
            .subquery()
        )
    ).scalar_one()
    by_category = {
        (category or "uncategorized"): count
        for category, count in db.execute(
            select(Item.category, func.count(Item.id)).group_by(Item.category)
        )
    }
    return {
        "total_items": db.execute(select(func.count(Item.id))).scalar_one(),
        "total_warehouses": db.execute(
            select(func.count(Warehouse.id))
        ).scalar_one(),
        "total_stock_units": float(
            db.execute(
                select(func.coalesce(func.sum(StockLevel.quantity), 0))
            ).scalar_one()
        ),
        "items_by_category": by_category,
        "items_at_or_below_reorder_level": low_stock,
        "stock_moves_last_7_days": db.execute(
            select(func.count(StockMove.id)).where(
                StockMove.created_at >= week_ago
            )
        ).scalar_one(),
    }


def _service_aggregate(db: Session) -> dict:
    by_status = {
        status: count
        for status, count in db.execute(
            select(ServiceJob.status, func.count(ServiceJob.id)).group_by(
                ServiceJob.status
            )
        )
    }
    durations = db.execute(
        select(ServiceJob.created_at, ServiceJob.completed_at).where(
            ServiceJob.completed_at.is_not(None)
        )
    ).all()
    avg_hours = None
    if durations:
        total_seconds = sum(
            (done - started).total_seconds() for started, done in durations
        )
        avg_hours = round(total_seconds / len(durations) / 3600, 2)
    # Technicians as a count only — no staff names cross the boundary.
    active_technicians = db.execute(
        select(func.count(func.distinct(ServiceJob.assigned_technician_id))).where(
            ServiceJob.status.in_(("open", "in_progress"))
        )
    ).scalar_one()
    return {
        "jobs_by_status": by_status,
        "technicians_with_open_jobs": active_technicians,
        "avg_completion_hours": avg_hours,
    }


def _website_aggregate(db: Session) -> dict:
    orders_by_status = {
        status: count
        for status, count in db.execute(
            select(WebsiteOrder.status, func.count(WebsiteOrder.id)).group_by(
                WebsiteOrder.status
            )
        )
    }
    bookings_by_status = {
        status: count
        for status, count in db.execute(
            select(DemoBooking.status, func.count(DemoBooking.id)).group_by(
                DemoBooking.status
            )
        )
    }
    return {
        "orders_by_status": orders_by_status,
        "demo_bookings_by_status": bookings_by_status,
        "machinery_catalog_count": db.execute(
            select(func.count(Machinery.id))
        ).scalar_one(),
        "completed_projects_count": db.execute(
            select(func.count(CompletedProject.id))
        ).scalar_one(),
    }


def _financial_aggregate(db: Session) -> dict:
    """Owner + opt-in only. Still aggregates: totals and sums, no invoice
    or order rows, and no customer identification of any kind."""
    stock_value = float(
        db.execute(
            select(func.coalesce(func.sum(StockLevel.quantity * Item.price), 0))
            .join(Item, StockLevel.item_id == Item.id)
        ).scalar_one()
    )
    billed_parts_value = float(
        db.execute(
            select(func.coalesce(func.sum(JobPartUsed.quantity * Item.price), 0))
            .join(Item, JobPartUsed.item_id == Item.id)
            .join(ServiceJob, JobPartUsed.job_id == ServiceJob.id)
            .where(ServiceJob.status == "billed")
        ).scalar_one()
    )
    order_value_by_status = {
        status: float(total)
        for status, total in db.execute(
            select(
                WebsiteOrder.status,
                func.coalesce(
                    func.sum(
                        WebsiteOrderItem.quantity
                        * WebsiteOrderItem.price_at_order
                    ),
                    0,
                ),
            )
            .join(WebsiteOrderItem, WebsiteOrderItem.order_id == WebsiteOrder.id)
            .group_by(WebsiteOrder.status)
        )
    }
    return {
        "stock_value": stock_value,
        "billed_jobs": db.execute(
            select(func.count(ServiceJob.id)).where(
                ServiceJob.status == "billed"
            )
        ).scalar_one(),
        "billed_parts_value": billed_parts_value,
        "website_order_value_by_status": order_value_by_status,
    }


_AGGREGATORS = {
    "inventory": _inventory_aggregate,
    "service_jobs": _service_aggregate,
    "website": _website_aggregate,
}


def sanitize_question(
    db: Session, question: str, role_name: str, include_financial: bool
) -> SanitizedQuery:
    """The sanitization boundary. Everything the Claude API will ever see
    about the database is the payload built here."""
    matched = classify_question(question)
    financial_included = (
        "financial" in matched and role_name == "owner" and include_financial
    )
    resources = [r for r in matched if r in _AGGREGATORS]
    payload = {resource: _AGGREGATORS[resource](db) for resource in resources}
    if financial_included:
        resources.append("financial")
        payload["financial"] = _financial_aggregate(db)
    return SanitizedQuery(
        resources=resources,
        payload=payload,
        financial_included=financial_included,
    )


_SYSTEM_PROMPT = (
    "You are the analytics assistant inside clawSW, an internal ERP for a "
    "machinery sales and service business. Answer the user's question using "
    "ONLY the aggregated data provided in the message. The data is "
    "intentionally limited to counts, sums, and groupings; if it cannot "
    "answer the question, say so plainly and name what is missing rather "
    "than guessing. Be concise and answer in plain business language."
)


def _anthropic_client() -> anthropic.Anthropic:
    # Separate function so tests can stub the client without a network call.
    return anthropic.Anthropic(api_key=settings.anthropic_api_key)


def ask_claude(question: str, sanitized: SanitizedQuery) -> str:
    """Send the sanitized payload + question to the Claude API.

    The API key comes from settings (env var), server-side only — it is
    never exposed through any endpoint, so it cannot reach the dashboard
    or website bundles.
    """
    if not settings.anthropic_api_key:
        raise AiQueryNotConfigured()
    response = _anthropic_client().messages.create(
        model=settings.anthropic_model,
        max_tokens=settings.anthropic_max_tokens,
        system=_SYSTEM_PROMPT,
        messages=[
            {
                "role": "user",
                "content": (
                    "Aggregated business data (sections: "
                    + ", ".join(sanitized.resources)
                    + "):\n"
                    + json.dumps(sanitized.payload, sort_keys=True)
                    + "\n\nQuestion: "
                    + question
                ),
            }
        ],
    )
    if response.stop_reason == "refusal":
        raise AiQueryFailed("The model declined to answer this question")
    texts = [block.text for block in response.content if block.type == "text"]
    if not texts:
        raise AiQueryFailed("The model returned no text answer")
    return "\n".join(texts)
