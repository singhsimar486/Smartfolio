from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel

from app.services.market_data import get_stock_quote, get_stock_history


router = APIRouter(prefix="/compare", tags=["Stock Comparison"])


class StockCompareRequest(BaseModel):
    tickers: list[str]


class StockCompareData(BaseModel):
    ticker: str
    name: str
    current_price: float
    day_change: float | None
    day_change_percent: float | None
    market_cap: float | None
    volume: float | None
    fifty_two_week_high: float | None
    fifty_two_week_low: float | None
    pe_ratio: float | None = None
    history: list[dict] = []


class StockCompareResponse(BaseModel):
    stocks: list[StockCompareData]


@router.post("/", response_model=StockCompareResponse)
def compare_stocks(request: StockCompareRequest):
    """Compare multiple stocks side by side."""
    if len(request.tickers) < 2:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Please provide at least 2 tickers to compare"
        )

    if len(request.tickers) > 5:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Maximum 5 tickers allowed for comparison"
        )

    stocks = []

    for ticker in request.tickers:
        ticker = ticker.upper().strip()
        quote = get_stock_quote(ticker)

        if not quote:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid ticker symbol: {ticker}"
            )

        # Get price history for chart
        history = get_stock_history(ticker, "3mo") or []

        stocks.append(StockCompareData(
            ticker=ticker,
            name=quote.get("name", ticker),
            current_price=quote.get("current_price", 0),
            day_change=quote.get("day_change"),
            day_change_percent=quote.get("day_change_percent"),
            market_cap=quote.get("market_cap"),
            volume=quote.get("volume"),
            fifty_two_week_high=quote.get("fifty_two_week_high"),
            fifty_two_week_low=quote.get("fifty_two_week_low"),
            history=history
        ))

    return StockCompareResponse(stocks=stocks)


@router.get("/quick/{ticker1}/{ticker2}")
def quick_compare(ticker1: str, ticker2: str):
    """Quick comparison of two stocks."""
    tickers = [ticker1.upper(), ticker2.upper()]

    result = []
    for ticker in tickers:
        quote = get_stock_quote(ticker)
        if not quote:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid ticker: {ticker}"
            )

        history = get_stock_history(ticker, "1mo") or []

        # Calculate monthly return
        monthly_return = 0
        if len(history) >= 2:
            start_price = history[0].get("close", 0)
            end_price = history[-1].get("close", 0)
            if start_price > 0:
                monthly_return = ((end_price - start_price) / start_price) * 100

        result.append({
            "ticker": ticker,
            "name": quote.get("name", ticker),
            "price": quote.get("current_price", 0),
            "day_change_percent": quote.get("day_change_percent", 0),
            "monthly_return": round(monthly_return, 2),
            "market_cap": quote.get("market_cap"),
            "volume": quote.get("volume"),
            "52w_high": quote.get("fifty_two_week_high"),
            "52w_low": quote.get("fifty_two_week_low"),
        })

    return {"comparison": result}
