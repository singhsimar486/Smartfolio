import json
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import User
from app.models.insight import Insight, ChatMessage, WeeklyDigest
from app.schemas.insight import (
    InsightResponse, ChatMessageCreate, ChatMessageResponse,
    ChatResponse, WeeklyDigestResponse, InsightsOverview
)
from app.services.auth import get_current_user
from app.services.ai_advisor import generate_insights, ask_ai_question, generate_weekly_digest
from app.services.market_data import get_stock_quote


router = APIRouter(prefix="/insights", tags=["AI Insights"])


def get_portfolio_data(user_id: str, db: Session) -> tuple[dict, list]:
    """Get portfolio summary and holdings with market data."""
    from app.models.holding import Holding

    holdings = db.query(Holding).filter(Holding.user_id == user_id).all()

    holdings_with_data = []
    total_value = 0
    total_cost = 0
    day_change = 0

    for holding in holdings:
        quote = get_stock_quote(holding.ticker)
        if quote:
            current_price = quote.get("current_price", 0)
            current_value = holding.quantity * current_price
            total_cost_for_holding = holding.quantity * holding.avg_cost_basis
            profit_loss = current_value - total_cost_for_holding
            profit_loss_percent = (profit_loss / total_cost_for_holding * 100) if total_cost_for_holding > 0 else 0

            holdings_with_data.append({
                "ticker": holding.ticker,
                "name": quote.get("name", holding.ticker),
                "quantity": holding.quantity,
                "avg_cost_basis": holding.avg_cost_basis,
                "current_price": current_price,
                "current_value": current_value,
                "total_cost": total_cost_for_holding,
                "profit_loss": profit_loss,
                "profit_loss_percent": profit_loss_percent,
                "day_change": quote.get("day_change"),
                "day_change_percent": quote.get("day_change_percent")
            })

            total_value += current_value
            total_cost += total_cost_for_holding
            if quote.get("day_change_percent"):
                day_change += (current_value * quote.get("day_change_percent", 0) / 100)

    portfolio_summary = {
        "total_value": total_value,
        "total_cost": total_cost,
        "total_profit_loss": total_value - total_cost,
        "total_profit_loss_percent": ((total_value - total_cost) / total_cost * 100) if total_cost > 0 else 0,
        "day_change": day_change,
        "day_change_percent": (day_change / total_value * 100) if total_value > 0 else 0,
        "holdings_count": len(holdings_with_data)
    }

    return portfolio_summary, holdings_with_data


@router.get("/", response_model=InsightsOverview)
async def get_insights(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get AI-generated insights for the user's portfolio."""

    portfolio_summary, holdings_with_data = get_portfolio_data(current_user.id, db)

    # Generate new insights
    raw_insights = await generate_insights(portfolio_summary, holdings_with_data)

    insights = []
    for idx, insight in enumerate(raw_insights):
        insights.append(InsightResponse(
            id=f"insight-{idx}",
            type=insight.get("type", "info"),
            title=insight.get("title", "Insight"),
            message=insight.get("message", ""),
            action=insight.get("action"),
            is_dismissed=False,
            created_at=datetime.utcnow()
        ))

    # Check for recent digest
    week_ago = datetime.utcnow() - timedelta(days=7)
    recent_digest = db.query(WeeklyDigest).filter(
        WeeklyDigest.user_id == current_user.id,
        WeeklyDigest.created_at >= week_ago
    ).first()

    return InsightsOverview(
        insights=insights,
        has_new_digest=recent_digest is not None,
        digest_summary=recent_digest.summary if recent_digest else None
    )


@router.post("/ask", response_model=ChatResponse)
async def ask_question(
    chat_input: ChatMessageCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Ask the AI a question about your portfolio."""

    if not chat_input.message.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Message cannot be empty"
        )

    portfolio_summary, holdings_with_data = get_portfolio_data(current_user.id, db)

    # Save user message
    user_message = ChatMessage(
        user_id=current_user.id,
        role="user",
        content=chat_input.message
    )
    db.add(user_message)

    # Get AI response
    response = await ask_ai_question(chat_input.message, portfolio_summary, holdings_with_data)

    # Save assistant message
    assistant_message = ChatMessage(
        user_id=current_user.id,
        role="assistant",
        content=response
    )
    db.add(assistant_message)
    db.commit()
    db.refresh(assistant_message)

    return ChatResponse(
        response=response,
        message_id=assistant_message.id
    )


@router.get("/chat/history", response_model=list[ChatMessageResponse])
def get_chat_history(
    limit: int = 50,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get chat history with the AI advisor."""

    messages = db.query(ChatMessage).filter(
        ChatMessage.user_id == current_user.id
    ).order_by(ChatMessage.created_at.desc()).limit(limit).all()

    # Reverse to get chronological order
    return list(reversed(messages))


@router.delete("/chat/history", status_code=status.HTTP_204_NO_CONTENT)
def clear_chat_history(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Clear all chat history."""

    db.query(ChatMessage).filter(
        ChatMessage.user_id == current_user.id
    ).delete()
    db.commit()

    return None


@router.get("/digest", response_model=WeeklyDigestResponse)
async def get_weekly_digest(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get or generate weekly portfolio digest."""

    # Check for existing recent digest (within last 7 days)
    week_ago = datetime.utcnow() - timedelta(days=7)
    existing_digest = db.query(WeeklyDigest).filter(
        WeeklyDigest.user_id == current_user.id,
        WeeklyDigest.created_at >= week_ago
    ).order_by(WeeklyDigest.created_at.desc()).first()

    if existing_digest:
        return WeeklyDigestResponse(
            id=existing_digest.id,
            summary=existing_digest.summary,
            health_score=existing_digest.health_score,
            health_label=existing_digest.health_label,
            highlights=json.loads(existing_digest.highlights),
            recommendations=json.loads(existing_digest.recommendations),
            outlook=existing_digest.outlook,
            portfolio_value=existing_digest.portfolio_value,
            weekly_change=existing_digest.weekly_change,
            weekly_change_pct=existing_digest.weekly_change_pct,
            week_start=existing_digest.week_start,
            week_end=existing_digest.week_end,
            generated_at=existing_digest.created_at
        )

    # Generate new digest
    portfolio_summary, holdings_with_data = get_portfolio_data(current_user.id, db)
    digest_data = await generate_weekly_digest(portfolio_summary, holdings_with_data)

    # Save digest
    now = datetime.utcnow()
    week_start = now - timedelta(days=7)

    new_digest = WeeklyDigest(
        user_id=current_user.id,
        week_start=week_start,
        week_end=now,
        summary=digest_data.get("summary", ""),
        health_score=digest_data.get("health_score", 50),
        health_label=digest_data.get("health_label", "Fair"),
        highlights=json.dumps(digest_data.get("highlights", [])),
        recommendations=json.dumps(digest_data.get("recommendations", [])),
        outlook=digest_data.get("outlook", ""),
        portfolio_value=digest_data.get("portfolio_value", 0),
        weekly_change=digest_data.get("weekly_change", 0),
        weekly_change_pct=digest_data.get("weekly_change_pct", 0)
    )

    db.add(new_digest)
    db.commit()
    db.refresh(new_digest)

    return WeeklyDigestResponse(
        id=new_digest.id,
        summary=new_digest.summary,
        health_score=new_digest.health_score,
        health_label=new_digest.health_label,
        highlights=json.loads(new_digest.highlights),
        recommendations=json.loads(new_digest.recommendations),
        outlook=new_digest.outlook,
        portfolio_value=new_digest.portfolio_value,
        weekly_change=new_digest.weekly_change,
        weekly_change_pct=new_digest.weekly_change_pct,
        week_start=new_digest.week_start,
        week_end=new_digest.week_end,
        generated_at=new_digest.created_at
    )


@router.post("/digest/refresh", response_model=WeeklyDigestResponse)
async def refresh_weekly_digest(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Force refresh the weekly digest."""

    portfolio_summary, holdings_with_data = get_portfolio_data(current_user.id, db)
    digest_data = await generate_weekly_digest(portfolio_summary, holdings_with_data)

    now = datetime.utcnow()
    week_start = now - timedelta(days=7)

    new_digest = WeeklyDigest(
        user_id=current_user.id,
        week_start=week_start,
        week_end=now,
        summary=digest_data.get("summary", ""),
        health_score=digest_data.get("health_score", 50),
        health_label=digest_data.get("health_label", "Fair"),
        highlights=json.dumps(digest_data.get("highlights", [])),
        recommendations=json.dumps(digest_data.get("recommendations", [])),
        outlook=digest_data.get("outlook", ""),
        portfolio_value=digest_data.get("portfolio_value", 0),
        weekly_change=digest_data.get("weekly_change", 0),
        weekly_change_pct=digest_data.get("weekly_change_pct", 0)
    )

    db.add(new_digest)
    db.commit()
    db.refresh(new_digest)

    return WeeklyDigestResponse(
        id=new_digest.id,
        summary=new_digest.summary,
        health_score=new_digest.health_score,
        health_label=new_digest.health_label,
        highlights=json.loads(new_digest.highlights),
        recommendations=json.loads(new_digest.recommendations),
        outlook=new_digest.outlook,
        portfolio_value=new_digest.portfolio_value,
        weekly_change=new_digest.weekly_change,
        weekly_change_pct=new_digest.weekly_change_pct,
        week_start=new_digest.week_start,
        week_end=new_digest.week_end,
        generated_at=new_digest.created_at
    )
