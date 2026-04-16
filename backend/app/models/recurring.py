from datetime import datetime
from enum import Enum
from sqlalchemy import String, Float, DateTime, ForeignKey, Enum as SQLEnum, Boolean, Integer
from sqlalchemy.orm import Mapped, mapped_column, relationship
import uuid
from app.database import Base


class Frequency(str, Enum):
    DAILY = "DAILY"
    WEEKLY = "WEEKLY"
    BIWEEKLY = "BIWEEKLY"
    MONTHLY = "MONTHLY"


class RecurringInvestment(Base):
    """Track recurring/DCA investment plans."""
    __tablename__ = "recurring_investments"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id"), nullable=False)
    ticker: Mapped[str] = mapped_column(String(10), nullable=False)
    amount: Mapped[float] = mapped_column(Float, nullable=False)
    frequency: Mapped[Frequency] = mapped_column(SQLEnum(Frequency), nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    start_date: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    next_investment_date: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    total_invested: Mapped[float] = mapped_column(Float, default=0)
    total_shares: Mapped[float] = mapped_column(Float, default=0)
    investment_count: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="recurring_investments")
