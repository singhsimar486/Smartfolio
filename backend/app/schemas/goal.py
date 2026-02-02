from datetime import datetime
from pydantic import BaseModel


class GoalCreate(BaseModel):
    name: str
    target_amount: float
    target_date: datetime | None = None
    description: str | None = None


class GoalUpdate(BaseModel):
    name: str | None = None
    target_amount: float | None = None
    target_date: datetime | None = None
    description: str | None = None


class GoalResponse(BaseModel):
    id: str
    name: str
    target_amount: float
    target_date: datetime | None
    description: str | None
    created_at: datetime
    # Computed fields
    current_amount: float = 0
    progress_percent: float = 0
    amount_remaining: float = 0
    days_remaining: int | None = None
    on_track: bool = False

    class Config:
        from_attributes = True
