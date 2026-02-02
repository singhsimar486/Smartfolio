from enum import Enum
from datetime import datetime
from sqlalchemy import String, Float, Boolean, DateTime, ForeignKey, Enum as SQLEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship
import uuid
from app.database import Base


class AlertCondition(str, Enum):
    ABOVE = "ABOVE"
    BELOW = "BELOW"


class PriceAlert(Base):
    __tablename__ = "price_alerts"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id"), nullable=False)
    ticker: Mapped[str] = mapped_column(String(10), nullable=False)
    condition: Mapped[AlertCondition] = mapped_column(SQLEnum(AlertCondition), nullable=False)
    target_price: Mapped[float] = mapped_column(Float, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    is_triggered: Mapped[bool] = mapped_column(Boolean, default=False)
    triggered_at: Mapped[datetime] = mapped_column(DateTime, nullable=True)
    triggered_price: Mapped[float] = mapped_column(Float, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="alerts")
