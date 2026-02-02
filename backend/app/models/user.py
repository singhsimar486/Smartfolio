from datetime import datetime
import uuid

from sqlalchemy import String, Boolean, DateTime
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class User(Base):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow
    )

    # Relationships
    holdings = relationship("Holding", back_populates="user")
    watchlist = relationship("WatchlistItem", back_populates="user")
    alerts = relationship("PriceAlert", back_populates="user")
    insights = relationship("Insight", back_populates="user")
    chat_messages = relationship("ChatMessage", back_populates="user")
    weekly_digests = relationship("WeeklyDigest", back_populates="user")
    goals = relationship("PortfolioGoal", back_populates="user")
    dividends = relationship("Dividend", back_populates="user")