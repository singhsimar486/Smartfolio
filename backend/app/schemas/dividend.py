from datetime import datetime
from pydantic import BaseModel


class DividendCreate(BaseModel):
    ticker: str
    amount: float
    shares: float
    per_share: float
    payment_date: datetime


class DividendResponse(BaseModel):
    id: str
    ticker: str
    amount: float
    shares: float
    per_share: float
    payment_date: datetime
    created_at: datetime
    stock_name: str | None = None

    class Config:
        from_attributes = True


class DividendSummary(BaseModel):
    total_dividends: float
    total_this_year: float
    total_this_month: float
    by_ticker: list[dict]
    recent_dividends: list[DividendResponse]
