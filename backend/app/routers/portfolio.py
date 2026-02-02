from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from collections import defaultdict

from app.database import get_db
from app.models import User, Holding
from app.services.auth import get_current_user
from app.services.market_data import get_multiple_quotes, get_multiple_histories


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


@router.get("/performance")
def get_portfolio_performance(
    period: str = "1mo",
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get portfolio performance over time.

    This endpoint:
    1. Fetches historical data for all holdings
    2. Calculates portfolio value at each date point
    3. Returns time series data for charting

    Args:
        period: Time period ("1mo", "3mo", "6mo", "1y")

    Returns:
        List of data points with date and portfolio value
    """

    # Validate period
    valid_periods = ["1mo", "3mo", "6mo", "1y"]
    if period not in valid_periods:
        period = "1mo"

    # Get user's holdings
    holdings = db.query(Holding).filter(Holding.user_id == current_user.id).all()

    if not holdings:
        return {
            "period": period,
            "data": [],
            "total_cost": 0,
            "start_value": 0,
            "end_value": 0,
            "total_return": 0,
            "total_return_percent": 0
        }

    # Get historical data for all tickers
    tickers = [h.ticker for h in holdings]
    histories = get_multiple_histories(tickers, period)

    # Build a mapping of holdings by ticker for quick lookup
    holdings_map = {h.ticker: h for h in holdings}

    # Calculate portfolio value for each date
    # First, collect all unique dates across all tickers
    all_dates = set()
    for ticker_history in histories.values():
        for point in ticker_history:
            all_dates.add(point["date"])

    # Sort dates
    sorted_dates = sorted(all_dates)

    # For each date, calculate total portfolio value
    portfolio_data = []
    last_prices = {}  # Track last known price for each ticker

    for date in sorted_dates:
        daily_value = 0
        has_data = False

        for ticker, history in histories.items():
            holding = holdings_map.get(ticker)
            if not holding:
                continue

            # Find price for this date
            price_for_date = None
            for point in history:
                if point["date"] == date:
                    price_for_date = point["close"]
                    last_prices[ticker] = price_for_date
                    break

            # Use last known price if no data for this date
            if price_for_date is None:
                price_for_date = last_prices.get(ticker)

            if price_for_date is not None:
                daily_value += holding.quantity * price_for_date
                has_data = True

        if has_data:
            portfolio_data.append({
                "date": date,
                "value": round(daily_value, 2)
            })

    # Calculate total cost and returns
    total_cost = sum(h.quantity * h.avg_cost_basis for h in holdings)
    start_value = portfolio_data[0]["value"] if portfolio_data else 0
    end_value = portfolio_data[-1]["value"] if portfolio_data else 0
    total_return = end_value - total_cost
    total_return_percent = (total_return / total_cost * 100) if total_cost > 0 else 0

    # Calculate period return (from start of period to end)
    period_return = end_value - start_value
    period_return_percent = (period_return / start_value * 100) if start_value > 0 else 0

    return {
        "period": period,
        "data": portfolio_data,
        "total_cost": round(total_cost, 2),
        "start_value": round(start_value, 2),
        "end_value": round(end_value, 2),
        "total_return": round(total_return, 2),
        "total_return_percent": round(total_return_percent, 2),
        "period_return": round(period_return, 2),
        "period_return_percent": round(period_return_percent, 2)
    }