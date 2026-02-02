from datetime import datetime
from sqlalchemy import String, Text, Boolean, DateTime, ForeignKey, Integer
from sqlalchemy.orm import Mapped, mapped_column, relationship
import uuid
from app.database import Base


class Insight(Base):
    """Stores generated AI insights for users."""
    __tablename__ = "insights"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id"), nullable=False)
    insight_type: Mapped[str] = mapped_column(String(20), nullable=False)  # success, warning, alert, info
    title: Mapped[str] = mapped_column(String(100), nullable=False)
    message: Mapped[str] = mapped_column(Text, nullable=False)
    action: Mapped[str] = mapped_column(Text, nullable=True)
    is_dismissed: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="insights")


class ChatMessage(Base):
    """Stores AI chat history for users."""
    __tablename__ = "chat_messages"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id"), nullable=False)
    role: Mapped[str] = mapped_column(String(20), nullable=False)  # user, assistant
    content: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="chat_messages")


class WeeklyDigest(Base):
    """Stores weekly portfolio digests."""
    __tablename__ = "weekly_digests"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id"), nullable=False)
    week_start: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    week_end: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    summary: Mapped[str] = mapped_column(Text, nullable=False)
    health_score: Mapped[int] = mapped_column(Integer, nullable=False)
    health_label: Mapped[str] = mapped_column(String(50), nullable=False)
    highlights: Mapped[str] = mapped_column(Text, nullable=False)  # JSON array as string
    recommendations: Mapped[str] = mapped_column(Text, nullable=False)  # JSON array as string
    outlook: Mapped[str] = mapped_column(Text, nullable=False)
    portfolio_value: Mapped[float] = mapped_column(nullable=False)
    weekly_change: Mapped[float] = mapped_column(nullable=False)
    weekly_change_pct: Mapped[float] = mapped_column(nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="weekly_digests")
