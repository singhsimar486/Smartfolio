import yfinance as yf
from typing import Optional


def get_stock_quote(ticker: str) -> Optional[dict]:
    """
    Fetch current stock data for a single ticker.
    
    This function:
    1. Creates a Ticker object from yfinance
    2. Fetches the current price and daily change
    3. Returns a dictionary with the data
    4. Returns None if the ticker is invalid
    
    Args:
        ticker: Stock symbol (e.g., "AAPL", "GOOGL")
    
    Returns:
        Dictionary with price data or None if not found
    """
    try:
        stock = yf.Ticker(ticker)
        info = stock.info
        
        # Check if we got valid data
        if not info or info.get("regularMarketPrice") is None:
            return None
        
        return {
            "ticker": ticker.upper(),
            "name": info.get("shortName", "Unknown"),
            "current_price": info.get("regularMarketPrice"),
            "previous_close": info.get("previousClose"),
            "day_change": info.get("regularMarketChange"),
            "day_change_percent": info.get("regularMarketChangePercent"),
            "day_high": info.get("dayHigh"),
            "day_low": info.get("dayLow"),
            "volume": info.get("volume"),
            "market_cap": info.get("marketCap"),
            "fifty_two_week_high": info.get("fiftyTwoWeekHigh"),
            "fifty_two_week_low": info.get("fiftyTwoWeekLow"),
        }
    except Exception as e:
        print(f"Error fetching data for {ticker}: {e}")
        return None


def get_multiple_quotes(tickers: list[str]) -> dict[str, dict]:
    """
    Fetch current stock data for multiple tickers.
    
    This function:
    1. Takes a list of ticker symbols
    2. Fetches data for each one
    3. Returns a dictionary mapping ticker -> data
    
    Args:
        tickers: List of stock symbols
    
    Returns:
        Dictionary mapping ticker symbols to their data
    """
    results = {}
    for ticker in tickers:
        quote = get_stock_quote(ticker)
        if quote:
            results[ticker.upper()] = quote
    return results


def get_stock_history(ticker: str, period: str = "1mo") -> Optional[list[dict]]:
    """
    Fetch historical price data for a stock.
    
    This function:
    1. Gets historical data for the specified period
    2. Returns a list of daily price points
    
    Args:
        ticker: Stock symbol
        period: Time period ("1d", "5d", "1mo", "3mo", "6mo", "1y", "5y")
    
    Returns:
        List of price data dictionaries or None if not found
    """
    try:
        stock = yf.Ticker(ticker)
        history = stock.history(period=period)
        
        if history.empty:
            return None
        
        # Convert DataFrame to list of dictionaries
        result = []
        for date, row in history.iterrows():
            result.append({
                "date": date.strftime("%Y-%m-%d"),
                "open": round(row["Open"], 2),
                "high": round(row["High"], 2),
                "low": round(row["Low"], 2),
                "close": round(row["Close"], 2),
                "volume": int(row["Volume"])
            })
        
        return result
    except Exception as e:
        print(f"Error fetching history for {ticker}: {e}")
        return None