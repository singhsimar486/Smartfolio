from fastapi import APIRouter, HTTPException, status

from app.services.market_data import get_stock_quote, get_stock_history
from app.schemas import StockQuote, StockHistory


router = APIRouter(prefix="/market", tags=["Market Data"])


@router.get("/quote/{ticker}", response_model=StockQuote)
def get_quote(ticker: str):
    """
    Get real-time quote for a stock.
    
    This endpoint:
    1. Takes a ticker symbol from the URL
    2. Fetches live data from Yahoo Finance
    3. Returns current price, daily change, and other metrics
    
    Args:
        ticker: Stock symbol (e.g., "AAPL", "GOOGL", "TSLA")
    
    Returns:
        Real-time stock data
    
    Note:
        This endpoint is public (no auth required) because
        market data isn't user-specific.
    """
    quote = get_stock_quote(ticker.upper())
    
    if not quote:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Could not find stock with ticker '{ticker.upper()}'"
        )
    
    return quote


@router.get("/history/{ticker}", response_model=list[StockHistory])
def get_history(ticker: str, period: str = "1mo"):
    """
    Get historical price data for a stock.
    
    This endpoint:
    1. Takes a ticker symbol and optional time period
    2. Fetches historical daily prices
    3. Returns list of OHLCV data (Open, High, Low, Close, Volume)
    
    Args:
        ticker: Stock symbol
        period: Time period - "1d", "5d", "1mo", "3mo", "6mo", "1y", "5y"
                Defaults to "1mo" (one month)
    
    Returns:
        List of daily price data for charting
    """
    # Validate period
    valid_periods = ["1d", "5d", "1mo", "3mo", "6mo", "1y", "5y"]
    if period not in valid_periods:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid period '{period}'. Must be one of: {valid_periods}"
        )
    
    history = get_stock_history(ticker.upper(), period)
    
    if not history:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Could not find history for ticker '{ticker.upper()}'"
        )
    
    return history