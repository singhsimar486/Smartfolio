from datetime import datetime
from sqlalchemy import String, Float, DateTime, ForeignKey, Date
from sqlalchemy.orm import Mapped, mapped_column, relationship
import uuid
from app.database import Base


class Dividend(Base):
    """Track dividend payments received."""
    __tablename__ = "dividends"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id"), nullable=False)
    ticker: Mapped[str] = mapped_column(String(10), nullable=False)
    amount: Mapped[float] = mapped_column(Float, nullable=False)  # Total dividend received
    shares: Mapped[float] = mapped_column(Float, nullable=False)  # Shares held at time
    per_share: Mapped[float] = mapped_column(Float, nullable=False)  # Dividend per share
    payment_date: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="dividends")
