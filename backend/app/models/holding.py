from datetime import datetime
import uuid

from sqlalchemy import String, Float, DateTime, ForeignKey, text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Holding(Base):
    __tablename__ = "holdings"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    user_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("users.id"), nullable=False
    )
    ticker: Mapped[str] = mapped_column(String(10), nullable=False)
    quantity: Mapped[float] = mapped_column(Float, nullable=False)
    avg_cost_basis: Mapped[float] = mapped_column(Float, nullable=False)
    realized_gains: Mapped[float | None] = mapped_column(Float, default=0.0, server_default=text('0.0'), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow
    )

    # Relationship to User
    user = relationship("User", back_populates="holdings")
    transactions = relationship("Transaction", back_populates="holding")