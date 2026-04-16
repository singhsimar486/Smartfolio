from datetime import datetime
from pydantic import BaseModel
from typing import Optional


class RecurringCreate(BaseModel):
    ticker: str
    amount: float
    frequency: str  # "DAILY", "WEEKLY", "BIWEEKLY", "MONTHLY"
    start_date: datetime


class RecurringUpdate(BaseModel):
    amount: Optional[float] = None
    frequency: Optional[str] = None
    is_active: Optional[bool] = None


class RecurringResponse(BaseModel):
    id: str
    ticker: str
    amount: float
    frequency: str
    is_active: bool
    start_date: datetime
    next_investment_date: datetime
    total_invested: float
    total_shares: float
    investment_count: int
    created_at: datetime
    stock_name: Optional[str] = None
    current_price: Optional[float] = None
    current_value: Optional[float] = None
    average_price: Optional[float] = None
    gain_loss: Optional[float] = None
    gain_loss_percent: Optional[float] = None

    class Config:
        from_attributes = True


class RecurringSummary(BaseModel):
    total_plans: int
    active_plans: int
    total_monthly_investment: float
    total_invested_all_time: float
    upcoming_investments: list[dict]
