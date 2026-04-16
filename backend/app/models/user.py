from datetime import datetime
import uuid

from sqlalchemy import String, Boolean, DateTime, text
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

    # Subscription fields
    subscription_tier: Mapped[str | None] = mapped_column(
        String(20), default="free", server_default=text("'free'"), nullable=True
    )  # free, pro, pro_plus
    stripe_customer_id: Mapped[str | None] = mapped_column(String(255), nullable=True)
    stripe_subscription_id: Mapped[str | None] = mapped_column(String(255), nullable=True)
    subscription_status: Mapped[str | None] = mapped_column(
        String(20), default="active", server_default=text("'active'"), nullable=True
    )  # active, canceled, past_due, trialing
    subscription_ends_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

    # Referral fields
    referral_code: Mapped[str | None] = mapped_column(String(20), unique=True, nullable=True)
    referred_by: Mapped[str | None] = mapped_column(String(36), nullable=True)
    referral_count: Mapped[int | None] = mapped_column(default=0, server_default=text("0"), nullable=True)

    # Relationships
    holdings = relationship("Holding", back_populates="user")
    watchlist = relationship("WatchlistItem", back_populates="user")
    alerts = relationship("PriceAlert", back_populates="user")
    insights = relationship("Insight", back_populates="user")
    chat_messages = relationship("ChatMessage", back_populates="user")
    weekly_digests = relationship("WeeklyDigest", back_populates="user")
    goals = relationship("PortfolioGoal", back_populates="user")
    dividends = relationship("Dividend", back_populates="user")
    recurring_investments = relationship("RecurringInvestment", back_populates="user")