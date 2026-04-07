from fastapi import APIRouter, HTTPException, Query, status

from app.services.market_data import get_stock_quote, get_stock_history, search_tickers
from app.services.prediction import predict_prices
from app.schemas import StockQuote, StockHistory, PredictionResponse


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


@router.get("/search")
def search_stocks(
    q: str = Query(..., min_length=1, description="Search query"),
    limit: int = Query(10, ge=1, le=20, description="Maximum results to return")
):
    """
    Search for stocks by ticker or company name.

    This endpoint:
    1. Takes a search query string
    2. Searches Yahoo Finance for matching stocks
    3. Returns list of matching tickers with company names

    Args:
        q: Search query (e.g., "AAPL", "Apple", "tech")
        limit: Maximum number of results (1-20, default 10)

    Returns:
        List of matching stocks with symbol, name, exchange, and type
    """
    results = search_tickers(q, limit)
    return {"results": results}


@router.get("/predict/{ticker}", response_model=PredictionResponse)
def get_prediction(
    ticker: str,
    days: int = Query(30, ge=7, le=90, description="Days to predict ahead")
):
    """
    Get stock price prediction using ensemble algorithm.

    This endpoint:
    1. Fetches 6 months of historical data
    2. Applies ensemble of prediction models:
       - Linear Regression (trend)
       - Exponential Moving Average (momentum)
       - Mean Reversion (equilibrium)
    3. Calculates confidence bands based on volatility

    Args:
        ticker: Stock symbol (e.g., "AAPL", "GOOGL")
        days: Number of days to predict (7-90, default 30)

    Returns:
        Predicted prices with upper/lower confidence bounds

    DISCLAIMER: Predictions are mathematical projections based on
    historical data. They are NOT financial advice.
    """
    prediction = predict_prices(ticker.upper(), days_ahead=days)

    if not prediction:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Could not generate prediction for '{ticker.upper()}'. Insufficient historical data."
        )

    return prediction