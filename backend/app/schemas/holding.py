from datetime import datetime

from pydantic import BaseModel


class HoldingCreate(BaseModel):
    """Schema for creating a new holding."""
    ticker: str
    quantity: float
    avg_cost_basis: float


class HoldingUpdate(BaseModel):
    """Schema for updating a holding."""
    ticker: str | None = None
    quantity: float | None = None
    avg_cost_basis: float | None = None


class HoldingResponse(BaseModel):
    """Schema for returning holding data."""
    id: str
    user_id: str
    ticker: str
    quantity: float
    avg_cost_basis: float
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True