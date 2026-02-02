from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func, extract

from app.database import get_db
from app.models import User
from app.models.dividend import Dividend
from app.schemas.dividend import DividendCreate, DividendResponse, DividendSummary
from app.services.auth import get_current_user
from app.services.market_data import get_stock_quote


router = APIRouter(prefix="/dividends", tags=["Dividends"])


@router.post("/", response_model=DividendResponse, status_code=status.HTTP_201_CREATED)
def add_dividend(
    dividend_data: DividendCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Record a dividend payment."""
    ticker = dividend_data.ticker.upper()

    # Validate ticker
    quote = get_stock_quote(ticker)
    if not quote:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid ticker symbol: {ticker}"
        )

    new_dividend = Dividend(
        user_id=current_user.id,
        ticker=ticker,
        amount=dividend_data.amount,
        shares=dividend_data.shares,
        per_share=dividend_data.per_share,
        payment_date=dividend_data.payment_date
    )

    db.add(new_dividend)
    db.commit()
    db.refresh(new_dividend)

    return DividendResponse(
        id=new_dividend.id,
        ticker=new_dividend.ticker,
        amount=new_dividend.amount,
        shares=new_dividend.shares,
        per_share=new_dividend.per_share,
        payment_date=new_dividend.payment_date,
        created_at=new_dividend.created_at,
        stock_name=quote.get("name")
    )


@router.get("/", response_model=list[DividendResponse])
def get_dividends(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get all dividend records."""
    dividends = db.query(Dividend).filter(
        Dividend.user_id == current_user.id
    ).order_by(Dividend.payment_date.desc()).all()

    result = []
    for div in dividends:
        quote = get_stock_quote(div.ticker)
        result.append(DividendResponse(
            id=div.id,
            ticker=div.ticker,
            amount=div.amount,
            shares=div.shares,
            per_share=div.per_share,
            payment_date=div.payment_date,
            created_at=div.created_at,
            stock_name=quote.get("name") if quote else None
        ))

    return result


@router.get("/summary", response_model=DividendSummary)
def get_dividend_summary(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get dividend summary with totals and breakdown."""
    now = datetime.utcnow()
    current_year = now.year
    current_month = now.month

    # Total all time
    total_all = db.query(func.sum(Dividend.amount)).filter(
        Dividend.user_id == current_user.id
    ).scalar() or 0

    # Total this year
    total_year = db.query(func.sum(Dividend.amount)).filter(
        Dividend.user_id == current_user.id,
        extract('year', Dividend.payment_date) == current_year
    ).scalar() or 0

    # Total this month
    total_month = db.query(func.sum(Dividend.amount)).filter(
        Dividend.user_id == current_user.id,
        extract('year', Dividend.payment_date) == current_year,
        extract('month', Dividend.payment_date) == current_month
    ).scalar() or 0

    # By ticker
    by_ticker_query = db.query(
        Dividend.ticker,
        func.sum(Dividend.amount).label('total')
    ).filter(
        Dividend.user_id == current_user.id
    ).group_by(Dividend.ticker).order_by(func.sum(Dividend.amount).desc()).all()

    by_ticker = []
    for ticker, total in by_ticker_query:
        quote = get_stock_quote(ticker)
        by_ticker.append({
            "ticker": ticker,
            "name": quote.get("name") if quote else ticker,
            "total": total
        })

    # Recent dividends
    recent = db.query(Dividend).filter(
        Dividend.user_id == current_user.id
    ).order_by(Dividend.payment_date.desc()).limit(5).all()

    recent_dividends = []
    for div in recent:
        quote = get_stock_quote(div.ticker)
        recent_dividends.append(DividendResponse(
            id=div.id,
            ticker=div.ticker,
            amount=div.amount,
            shares=div.shares,
            per_share=div.per_share,
            payment_date=div.payment_date,
            created_at=div.created_at,
            stock_name=quote.get("name") if quote else None
        ))

    return DividendSummary(
        total_dividends=total_all,
        total_this_year=total_year,
        total_this_month=total_month,
        by_ticker=by_ticker,
        recent_dividends=recent_dividends
    )


@router.delete("/{dividend_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_dividend(
    dividend_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete a dividend record."""
    dividend = db.query(Dividend).filter(Dividend.id == dividend_id).first()

    if not dividend:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Dividend not found")

    if dividend.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized")

    db.delete(dividend)
    db.commit()
    return None
