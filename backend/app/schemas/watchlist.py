from datetime import datetime

from pydantic import BaseModel


class WatchlistCreate(BaseModel):
    """Schema for adding a stock to watchlist."""
    ticker: str


class WatchlistResponse(BaseModel):
    """Schema for returning watchlist item data."""
    id: str
    user_id: str
    ticker: str
    created_at: datetime

    class Config:
        from_attributes = True


class WatchlistWithMarketData(BaseModel):
    """Schema for watchlist item with live market data."""
    id: str
    ticker: str
    name: str
    current_price: float | None
    day_change: float | None
    day_change_percent: float | None
    created_at: datetime
