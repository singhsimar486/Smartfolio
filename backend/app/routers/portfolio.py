from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import User, Holding
from app.services.auth import get_current_user
from app.services.market_data import get_multiple_quotes


router = APIRouter(prefix="/portfolio", tags=["Portfolio"])


@router.get("/summary")
def get_portfolio_summary(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get complete portfolio summary with real-time market data.
    
    This endpoint:
    1. Fetches all holdings for the logged-in user
    2. Gets live market prices for each holding
    3. Calculates current values, profit/loss, and totals
    4. Returns a comprehensive portfolio overview
    
    This is the main dashboard endpoint — it powers the portfolio view.
    """
    
    # Get user's holdings from database
    holdings = db.query(Holding).filter(Holding.user_id == current_user.id).all()
    
    if not holdings:
        return {
            "total_value": 0,
            "total_cost": 0,
            "total_profit_loss": 0,
            "total_profit_loss_percent": 0,
            "day_change": 0,
            "day_change_percent": 0,
            "holdings": []
        }
    
    # Get all tickers and fetch market data in one batch
    tickers = [h.ticker for h in holdings]
    market_data = get_multiple_quotes(tickers)
    
    # Calculate values for each holding
    holdings_with_data = []
    total_value = 0
    total_cost = 0
    total_day_change = 0
    
    for holding in holdings:
        quote = market_data.get(holding.ticker)
        
        # Calculate base values
        cost_basis = holding.quantity * holding.avg_cost_basis
        total_cost += cost_basis
        
        if quote and quote.get("current_price"):
            current_price = quote["current_price"]
            current_value = holding.quantity * current_price
            profit_loss = current_value - cost_basis
            profit_loss_percent = (profit_loss / cost_basis) * 100 if cost_basis > 0 else 0
            
            # Daily change for this holding
            day_change_per_share = quote.get("day_change", 0) or 0
            holding_day_change = holding.quantity * day_change_per_share
            total_day_change += holding_day_change
            
            total_value += current_value
            
            holdings_with_data.append({
                "id": holding.id,
                "ticker": holding.ticker,
                "name": quote.get("name", "Unknown"),
                "quantity": holding.quantity,
                "avg_cost_basis": round(holding.avg_cost_basis, 2),
                "current_price": round(current_price, 2),
                "current_value": round(current_value, 2),
                "total_cost": round(cost_basis, 2),
                "profit_loss": round(profit_loss, 2),
                "profit_loss_percent": round(profit_loss_percent, 2),
                "day_change": round(holding_day_change, 2),
                "day_change_percent": round(quote.get("day_change_percent", 0) or 0, 2),
            })
        else:
            # No market data available — show what we have
            holdings_with_data.append({
                "id": holding.id,
                "ticker": holding.ticker,
                "name": "Unknown",
                "quantity": holding.quantity,
                "avg_cost_basis": round(holding.avg_cost_basis, 2),
                "current_price": None,
                "current_value": None,
                "total_cost": round(cost_basis, 2),
                "profit_loss": None,
                "profit_loss_percent": None,
                "day_change": None,
                "day_change_percent": None,
            })
    
    # Calculate total profit/loss
    total_profit_loss = total_value - total_cost
    total_profit_loss_percent = (total_profit_loss / total_cost) * 100 if total_cost > 0 else 0
    total_day_change_percent = (total_day_change / (total_value - total_day_change)) * 100 if total_value > total_day_change else 0
    
    return {
        "total_value": round(total_value, 2),
        "total_cost": round(total_cost, 2),
        "total_profit_loss": round(total_profit_loss, 2),
        "total_profit_loss_percent": round(total_profit_loss_percent, 2),
        "day_change": round(total_day_change, 2),
        "day_change_percent": round(total_day_change_percent, 2),
        "holdings_count": len(holdings),
        "holdings": holdings_with_data
    }


@router.get("/allocation")
def get_portfolio_allocation(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get portfolio allocation breakdown.
    
    This endpoint:
    1. Calculates what percentage each holding represents
    2. Returns data formatted for pie charts
    
    Used for the allocation pie chart on the dashboard.
    """
    
    # Get user's holdings
    holdings = db.query(Holding).filter(Holding.user_id == current_user.id).all()
    
    if not holdings:
        return {"allocations": [], "total_value": 0}
    
    # Get market data
    tickers = [h.ticker for h in holdings]
    market_data = get_multiple_quotes(tickers)
    
    # Calculate current values
    allocations = []
    total_value = 0
    
    for holding in holdings:
        quote = market_data.get(holding.ticker)
        if quote and quote.get("current_price"):
            current_value = holding.quantity * quote["current_price"]
            total_value += current_value
            allocations.append({
                "ticker": holding.ticker,
                "name": quote.get("name", "Unknown"),
                "value": round(current_value, 2)
            })
    
    # Calculate percentages
    for allocation in allocations:
        allocation["percentage"] = round((allocation["value"] / total_value) * 100, 2) if total_value > 0 else 0
    
    # Sort by value descending
    allocations.sort(key=lambda x: x["value"], reverse=True)
    
    return {
        "allocations": allocations,
        "total_value": round(total_value, 2)
    }