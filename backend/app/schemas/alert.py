from datetime import datetime
from pydantic import BaseModel


class AlertCreate(BaseModel):
    ticker: str
    condition: str  # "ABOVE" or "BELOW"
    target_price: float


class AlertUpdate(BaseModel):
    target_price: float | None = None
    is_active: bool | None = None


class AlertResponse(BaseModel):
    id: str
    ticker: str
    condition: str
    target_price: float
    is_active: bool
    is_triggered: bool
    triggered_at: datetime | None
    triggered_price: float | None
    created_at: datetime
    current_price: float | None = None
    stock_name: str | None = None

    class Config:
        from_attributes = True


class AlertCheckResult(BaseModel):
    triggered_alerts: list[AlertResponse]
    total_checked: int
