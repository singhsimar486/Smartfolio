from datetime import datetime
from enum import Enum
import uuid

from sqlalchemy import String, Float, DateTime, ForeignKey, Enum as SQLEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class TransactionType(str, Enum):
    BUY = "BUY"
    SELL = "SELL"


class Transaction(Base):
    __tablename__ = "transactions"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    holding_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("holdings.id"), nullable=False
    )
    type: Mapped[TransactionType] = mapped_column(
        SQLEnum(TransactionType), nullable=False
    )
    quantity: Mapped[float] = mapped_column(Float, nullable=False)
    price_per_unit: Mapped[float] = mapped_column(Float, nullable=False)
    transaction_date: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    # Relationship to Holding
    holding = relationship("Holding", back_populates="transactions")