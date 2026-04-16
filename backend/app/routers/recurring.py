from datetime import datetime, timedelta
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import User
from app.models.recurring import RecurringInvestment, Frequency
from app.schemas.recurring import RecurringCreate, RecurringUpdate, RecurringResponse, RecurringSummary
from app.services.auth import get_current_user
from app.services.market_data import get_stock_quote


router = APIRouter(prefix="/recurring", tags=["Recurring Investments"])


def get_next_investment_date(current_date: datetime, frequency: Frequency) -> datetime:
    """Calculate the next investment date based on frequency."""
    if frequency == Frequency.DAILY:
        return current_date + timedelta(days=1)
    elif frequency == Frequency.WEEKLY:
        return current_date + timedelta(weeks=1)
    elif frequency == Frequency.BIWEEKLY:
        return current_date + timedelta(weeks=2)
    elif frequency == Frequency.MONTHLY:
        # Add one month
        month = current_date.month + 1
        year = current_date.year
        if month > 12:
            month = 1
            year += 1
        day = min(current_date.day, 28)  # Safe day for all months
        return current_date.replace(year=year, month=month, day=day)
    return current_date


def get_monthly_equivalent(amount: float, frequency: Frequency) -> float:
    """Convert investment amount to monthly equivalent."""
    if frequency == Frequency.DAILY:
        return amount * 30
    elif frequency == Frequency.WEEKLY:
        return amount * 4
    elif frequency == Frequency.BIWEEKLY:
        return amount * 2
    return amount


@router.post("/", response_model=RecurringResponse, status_code=status.HTTP_201_CREATED)
def create_recurring_investment(
    data: RecurringCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a new recurring investment plan."""
    ticker = data.ticker.upper()

    # Validate ticker
    quote = get_stock_quote(ticker)
    if not quote:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid ticker symbol: {ticker}"
        )

    frequency = Frequency(data.frequency)
    next_date = data.start_date if data.start_date > datetime.utcnow() else get_next_investment_date(datetime.utcnow(), frequency)

    new_plan = RecurringInvestment(
        user_id=current_user.id,
        ticker=ticker,
        amount=data.amount,
        frequency=frequency,
        start_date=data.start_date,
        next_investment_date=next_date
    )

    db.add(new_plan)
    db.commit()
    db.refresh(new_plan)

    return RecurringResponse(
        id=new_plan.id,
        ticker=new_plan.ticker,
        amount=new_plan.amount,
        frequency=new_plan.frequency.value,
        is_active=new_plan.is_active,
        start_date=new_plan.start_date,
        next_investment_date=new_plan.next_investment_date,
        total_invested=new_plan.total_invested,
        total_shares=new_plan.total_shares,
        investment_count=new_plan.investment_count,
        created_at=new_plan.created_at,
        stock_name=quote.get("name"),
        current_price=quote.get("current_price"),
        current_value=new_plan.total_shares * quote.get("current_price", 0) if new_plan.total_shares > 0 else 0
    )


@router.get("/", response_model=list[RecurringResponse])
def get_recurring_investments(
    active_only: bool = Query(False),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get all recurring investment plans."""
    query = db.query(RecurringInvestment).filter(RecurringInvestment.user_id == current_user.id)

    if active_only:
        query = query.filter(RecurringInvestment.is_active == True)

    plans = query.order_by(RecurringInvestment.next_investment_date.asc()).all()

    result = []
    for plan in plans:
        quote = get_stock_quote(plan.ticker)
        current_price = quote.get("current_price", 0) if quote else 0
        current_value = plan.total_shares * current_price
        avg_price = plan.total_invested / plan.total_shares if plan.total_shares > 0 else 0
        gain_loss = current_value - plan.total_invested if plan.total_shares > 0 else 0
        gain_loss_pct = (gain_loss / plan.total_invested * 100) if plan.total_invested > 0 else 0

        result.append(RecurringResponse(
            id=plan.id,
            ticker=plan.ticker,
            amount=plan.amount,
            frequency=plan.frequency.value,
            is_active=plan.is_active,
            start_date=plan.start_date,
            next_investment_date=plan.next_investment_date,
            total_invested=plan.total_invested,
            total_shares=plan.total_shares,
            investment_count=plan.investment_count,
            created_at=plan.created_at,
            stock_name=quote.get("name") if quote else None,
            current_price=current_price,
            current_value=current_value,
            average_price=avg_price,
            gain_loss=gain_loss,
            gain_loss_percent=gain_loss_pct
        ))

    return result


@router.get("/summary", response_model=RecurringSummary)
def get_recurring_summary(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get summary of all recurring investment plans."""
    plans = db.query(RecurringInvestment).filter(
        RecurringInvestment.user_id == current_user.id
    ).all()

    active_plans = [p for p in plans if p.is_active]
    total_monthly = sum(get_monthly_equivalent(p.amount, p.frequency) for p in active_plans)
    total_invested = sum(p.total_invested for p in plans)

    # Get upcoming investments (next 7 days)
    week_from_now = datetime.utcnow() + timedelta(days=7)
    upcoming = []
    for plan in active_plans:
        if plan.next_investment_date <= week_from_now:
            quote = get_stock_quote(plan.ticker)
            upcoming.append({
                "ticker": plan.ticker,
                "name": quote.get("name") if quote else plan.ticker,
                "amount": plan.amount,
                "date": plan.next_investment_date.isoformat()
            })

    return RecurringSummary(
        total_plans=len(plans),
        active_plans=len(active_plans),
        total_monthly_investment=total_monthly,
        total_invested_all_time=total_invested,
        upcoming_investments=sorted(upcoming, key=lambda x: x["date"])
    )


@router.put("/{plan_id}", response_model=RecurringResponse)
def update_recurring_investment(
    plan_id: str,
    data: RecurringUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update a recurring investment plan."""
    plan = db.query(RecurringInvestment).filter(RecurringInvestment.id == plan_id).first()

    if not plan:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Plan not found")

    if plan.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized")

    if data.amount is not None:
        plan.amount = data.amount
    if data.frequency is not None:
        plan.frequency = Frequency(data.frequency)
    if data.is_active is not None:
        plan.is_active = data.is_active

    db.commit()
    db.refresh(plan)

    quote = get_stock_quote(plan.ticker)

    return RecurringResponse(
        id=plan.id,
        ticker=plan.ticker,
        amount=plan.amount,
        frequency=plan.frequency.value,
        is_active=plan.is_active,
        start_date=plan.start_date,
        next_investment_date=plan.next_investment_date,
        total_invested=plan.total_invested,
        total_shares=plan.total_shares,
        investment_count=plan.investment_count,
        created_at=plan.created_at,
        stock_name=quote.get("name") if quote else None
    )


@router.post("/{plan_id}/execute", response_model=RecurringResponse)
def execute_recurring_investment(
    plan_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Manually execute a recurring investment (record that it was done)."""
    plan = db.query(RecurringInvestment).filter(RecurringInvestment.id == plan_id).first()

    if not plan:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Plan not found")

    if plan.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized")

    quote = get_stock_quote(plan.ticker)
    if not quote:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Could not get stock price")

    current_price = quote.get("current_price", 0)
    shares_bought = plan.amount / current_price if current_price > 0 else 0

    # Update plan
    plan.total_invested += plan.amount
    plan.total_shares += shares_bought
    plan.investment_count += 1
    plan.next_investment_date = get_next_investment_date(datetime.utcnow(), plan.frequency)

    db.commit()
    db.refresh(plan)

    current_value = plan.total_shares * current_price
    avg_price = plan.total_invested / plan.total_shares if plan.total_shares > 0 else 0
    gain_loss = current_value - plan.total_invested
    gain_loss_pct = (gain_loss / plan.total_invested * 100) if plan.total_invested > 0 else 0

    return RecurringResponse(
        id=plan.id,
        ticker=plan.ticker,
        amount=plan.amount,
        frequency=plan.frequency.value,
        is_active=plan.is_active,
        start_date=plan.start_date,
        next_investment_date=plan.next_investment_date,
        total_invested=plan.total_invested,
        total_shares=plan.total_shares,
        investment_count=plan.investment_count,
        created_at=plan.created_at,
        stock_name=quote.get("name"),
        current_price=current_price,
        current_value=current_value,
        average_price=avg_price,
        gain_loss=gain_loss,
        gain_loss_percent=gain_loss_pct
    )


@router.delete("/{plan_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_recurring_investment(
    plan_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete a recurring investment plan."""
    plan = db.query(RecurringInvestment).filter(RecurringInvestment.id == plan_id).first()

    if not plan:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Plan not found")

    if plan.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized")

    db.delete(plan)
    db.commit()
    return None
