from pydantic import BaseModel
from typing import Optional


class StockQuote(BaseModel):
    """Schema for real-time stock quote data."""
    ticker: str
    name: str
    current_price: Optional[float]
    previous_close: Optional[float]
    day_change: Optional[float]
    day_change_percent: Optional[float]
    day_high: Optional[float]
    day_low: Optional[float]
    volume: Optional[int]
    market_cap: Optional[int]
    fifty_two_week_high: Optional[float]
    fifty_two_week_low: Optional[float]


class StockHistory(BaseModel):
    """Schema for a single day's price data."""
    date: str
    open: float
    high: float
    low: float
    close: float
    volume: int


class HoldingWithMarketData(BaseModel):
    """Schema for holding combined with current market data."""
    id: str
    ticker: str
    quantity: float
    avg_cost_basis: float
    current_price: Optional[float]
    current_value: Optional[float]
    total_cost: float
    profit_loss: Optional[float]
    profit_loss_percent: Optional[float]
    day_change: Optional[float]
    day_change_percent: Optional[float]

    class Config:
        from_attributes = True