"""Phase 7 — the /ai-query endpoint.

Gated on the ('ai_query', 'read') permission rows — the same DB-driven
enforcement as every other module, not a special case. The order of
operations is deliberate:

1. sanitize (app/ai_query.py builds the aggregate-only payload),
2. audit — the question + exactly what will be sent is committed to
   audit_log BEFORE the network call, so what left the building is
   reconstructable even when the call fails,
3. call the Claude API,
4. return the answer plus which resources/aggregations were used, so the
   dashboard can show e.g. "this used aggregated inventory + service_jobs
   data" for transparency.
"""
import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from ..ai_query import AiQueryFailed, AiQueryNotConfigured, ask_claude, sanitize_question
from ..audit import record_event
from ..db import get_db
from ..deps import require_permission
from ..models import User
from ..schemas import AiQueryRequest, AiQueryResponse

router = APIRouter(prefix="/ai-query", tags=["ai query"])


@router.post("", response_model=AiQueryResponse)
def ai_query(
    body: AiQueryRequest,
    db: Session = Depends(get_db),
    user: User = Depends(require_permission("ai_query", "read")),
):
    sanitized = sanitize_question(
        db,
        question=body.question,
        role_name=user.role.name,
        include_financial=body.include_financial,
    )
    record_event(
        db,
        action="ai_query",
        resource="ai_query",
        resource_id=uuid.uuid4(),
        payload_snapshot={
            "question": body.question,
            "resources": sanitized.resources,
            "financial_included": sanitized.financial_included,
            # The aggregated payload itself, NOT the Claude response — the
            # log records what was sent out, not what came back.
            "payload": sanitized.payload,
        },
    )
    db.commit()

    try:
        answer = ask_claude(body.question, sanitized)
    except AiQueryNotConfigured:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="AI queries are not configured (ANTHROPIC_API_KEY unset)",
        )
    except AiQueryFailed as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY, detail=str(exc)
        )

    return AiQueryResponse(
        answer=answer,
        resources_used=sanitized.resources,
        financial_included=sanitized.financial_included,
    )
