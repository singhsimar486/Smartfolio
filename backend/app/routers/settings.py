import csv
import io
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import User
from app.models.holding import Holding
from app.models.watchlist import WatchlistItem
from app.models.alert import PriceAlert
from app.models.goal import PortfolioGoal
from app.models.dividend import Dividend
from app.models.insight import ChatMessage, WeeklyDigest, Insight
from app.schemas.settings import PasswordChange, PasswordChangeResponse, AccountDeleteRequest
from app.services.auth import get_current_user, get_password_hash, verify_password
from app.services.market_data import get_stock_quote


router = APIRouter(prefix="/settings", tags=["Settings"])


@router.post("/change-password", response_model=PasswordChangeResponse)
def change_password(
    password_data: PasswordChange,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Change user password."""
    # Verify current password
    if not verify_password(password_data.current_password, current_user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current password is incorrect"
        )

    # Validate new password
    if len(password_data.new_password) < 6:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="New password must be at least 6 characters"
        )

    # Update password
    current_user.password_hash = get_password_hash(password_data.new_password)
    db.commit()

    return PasswordChangeResponse(message="Password changed successfully")


@router.delete("/account")
def delete_account(
    delete_request: AccountDeleteRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete user account and all associated data."""
    # Verify password
    if not verify_password(delete_request.password, current_user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password is incorrect"
        )

    # Delete all user data
    db.query(Holding).filter(Holding.user_id == current_user.id).delete()
    db.query(WatchlistItem).filter(WatchlistItem.user_id == current_user.id).delete()
    db.query(PriceAlert).filter(PriceAlert.user_id == current_user.id).delete()
    db.query(PortfolioGoal).filter(PortfolioGoal.user_id == current_user.id).delete()
    db.query(Dividend).filter(Dividend.user_id == current_user.id).delete()
    db.query(ChatMessage).filter(ChatMessage.user_id == current_user.id).delete()
    db.query(WeeklyDigest).filter(WeeklyDigest.user_id == current_user.id).delete()
    db.query(Insight).filter(Insight.user_id == current_user.id).delete()

    # Delete user
    db.delete(current_user)
    db.commit()

    return {"message": "Account deleted successfully"}


@router.get("/export/holdings")
def export_holdings(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Export holdings to CSV."""
    holdings = db.query(Holding).filter(Holding.user_id == current_user.id).all()

    output = io.StringIO()
    writer = csv.writer(output)

    # Header
    writer.writerow([
        'Ticker', 'Name', 'Quantity', 'Avg Cost Basis', 'Total Cost',
        'Current Price', 'Current Value', 'Profit/Loss', 'Profit/Loss %'
    ])

    for holding in holdings:
        quote = get_stock_quote(holding.ticker)
        current_price = quote.get("current_price", 0) if quote else 0
        current_value = holding.quantity * current_price
        total_cost = holding.quantity * holding.avg_cost_basis
        profit_loss = current_value - total_cost
        profit_loss_pct = (profit_loss / total_cost * 100) if total_cost > 0 else 0

        writer.writerow([
            holding.ticker,
            quote.get("name", "") if quote else "",
            holding.quantity,
            round(holding.avg_cost_basis, 2),
            round(total_cost, 2),
            round(current_price, 2),
            round(current_value, 2),
            round(profit_loss, 2),
            round(profit_loss_pct, 2)
        ])

    output.seek(0)

    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={
            "Content-Disposition": f"attachment; filename=holdings_{datetime.now().strftime('%Y%m%d')}.csv"
        }
    )


@router.get("/export/dividends")
def export_dividends(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Export dividends to CSV."""
    dividends = db.query(Dividend).filter(
        Dividend.user_id == current_user.id
    ).order_by(Dividend.payment_date.desc()).all()

    output = io.StringIO()
    writer = csv.writer(output)

    # Header
    writer.writerow(['Date', 'Ticker', 'Shares', 'Per Share', 'Total Amount'])

    for div in dividends:
        writer.writerow([
            div.payment_date.strftime('%Y-%m-%d'),
            div.ticker,
            div.shares,
            round(div.per_share, 4),
            round(div.amount, 2)
        ])

    output.seek(0)

    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={
            "Content-Disposition": f"attachment; filename=dividends_{datetime.now().strftime('%Y%m%d')}.csv"
        }
    )


@router.get("/export/portfolio")
def export_full_portfolio(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Export full portfolio summary to CSV."""
    holdings = db.query(Holding).filter(Holding.user_id == current_user.id).all()

    output = io.StringIO()
    writer = csv.writer(output)

    # Portfolio Summary Section
    writer.writerow(['=== PORTFOLIO SUMMARY ==='])
    writer.writerow([])

    total_value = 0
    total_cost = 0

    writer.writerow([
        'Ticker', 'Name', 'Quantity', 'Avg Cost', 'Current Price',
        'Total Cost', 'Current Value', 'P/L', 'P/L %', 'Day Change %'
    ])

    for holding in holdings:
        quote = get_stock_quote(holding.ticker)
        current_price = quote.get("current_price", 0) if quote else 0
        current_value = holding.quantity * current_price
        cost = holding.quantity * holding.avg_cost_basis
        profit_loss = current_value - cost
        profit_loss_pct = (profit_loss / cost * 100) if cost > 0 else 0
        day_change_pct = quote.get("day_change_percent", 0) if quote else 0

        total_value += current_value
        total_cost += cost

        writer.writerow([
            holding.ticker,
            quote.get("name", "") if quote else "",
            holding.quantity,
            round(holding.avg_cost_basis, 2),
            round(current_price, 2),
            round(cost, 2),
            round(current_value, 2),
            round(profit_loss, 2),
            round(profit_loss_pct, 2),
            round(day_change_pct, 2)
        ])

    writer.writerow([])
    writer.writerow(['Total', '', '', '', '', round(total_cost, 2), round(total_value, 2),
                    round(total_value - total_cost, 2),
                    round((total_value - total_cost) / total_cost * 100, 2) if total_cost > 0 else 0, ''])

    output.seek(0)

    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={
            "Content-Disposition": f"attachment; filename=portfolio_{datetime.now().strftime('%Y%m%d')}.csv"
        }
    )
