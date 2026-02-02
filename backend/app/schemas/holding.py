from datetime import datetime

from pydantic import BaseModel


class HoldingCreate(BaseModel):
    """Schema for creating a new holding."""
    ticker: str
    quantity: float
    avg_cost_basis: float


class HoldingImportItem(BaseModel):
    """Schema for a single holding in import preview."""
    ticker: str
    quantity: float
    avg_cost_basis: float
    status: str  # 'new', 'update', 'skip'
    message: str | None = None


class HoldingImportPreview(BaseModel):
    """Schema for CSV import preview response."""
    holdings: list[HoldingImportItem]
    errors: list[str]
    total_new: int
    total_update: int
    total_skip: int


class HoldingImportResult(BaseModel):
    """Schema for CSV import result response."""
    imported: int
    updated: int
    skipped: int
    errors: list[str]


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