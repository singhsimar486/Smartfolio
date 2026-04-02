from datetime import datetime
from pydantic import BaseModel, Field
from typing import Optional


class TransactionCreate(BaseModel):
    """Schema for creating a new transaction."""
    ticker: str = Field(..., min_length=1, max_length=10)
    type: str = Field(..., pattern="^(BUY|SELL)$")
    quantity: float = Field(..., gt=0)
    price_per_unit: float = Field(..., gt=0)
    transaction_date: datetime


class TransactionUpdate(BaseModel):
    """Schema for updating a transaction."""
    quantity: Optional[float] = Field(None, gt=0)
    price_per_unit: Optional[float] = Field(None, gt=0)
    transaction_date: Optional[datetime] = None


class TransactionResponse(BaseModel):
    """Schema for transaction response."""
    id: str
    holding_id: str
    ticker: str
    type: str
    quantity: float
    price_per_unit: float
    total_value: float
    transaction_date: datetime
    created_at: datetime

    model_config = {"from_attributes": True}

    @classmethod
    def from_transaction(cls, transaction, ticker: str):
        """Create response from transaction with ticker."""
        return cls(
            id=transaction.id,
            holding_id=transaction.holding_id,
            ticker=ticker,
            type=transaction.type.value,
            quantity=transaction.quantity,
            price_per_unit=transaction.price_per_unit,
            total_value=transaction.quantity * transaction.price_per_unit,
            transaction_date=transaction.transaction_date,
            created_at=transaction.created_at
        )
