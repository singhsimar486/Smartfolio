"""
Competition and Paper Trading Models

Models for virtual trading competitions, portfolios, trades, and achievements.
"""

from datetime import datetime
import uuid
import enum

from sqlalchemy import String, Float, Integer, DateTime, Boolean, Enum, ForeignKey, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class CompetitionStatus(enum.Enum):
    """Competition status enum."""
    UPCOMING = "upcoming"
    ACTIVE = "active"
    ENDED = "ended"


class CompetitionType(enum.Enum):
    """Competition type enum."""
    WEEKLY = "weekly"
    MONTHLY = "monthly"
    SPECIAL = "special"


class TradeType(enum.Enum):
    """Virtual trade type enum."""
    BUY = "BUY"
    SELL = "SELL"


class Competition(Base):
    """
    A trading competition that users can join.
    """
    __tablename__ = "competitions"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    type: Mapped[CompetitionType] = mapped_column(
        Enum(CompetitionType), default=CompetitionType.WEEKLY
    )
    status: Mapped[CompetitionStatus] = mapped_column(
        Enum(CompetitionStatus), default=CompetitionStatus.UPCOMING
    )

    # Competition settings
    starting_balance: Mapped[float] = mapped_column(Float, default=100000.0)  # $100K default
    max_participants: Mapped[int | None] = mapped_column(Integer, nullable=True)  # None = unlimited
    entry_fee: Mapped[float] = mapped_column(Float, default=0.0)  # For premium competitions
    prize_description: Mapped[str | None] = mapped_column(String(255), nullable=True)

    # Timing
    start_date: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    end_date: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    # Relationships
    portfolios = relationship("VirtualPortfolio", back_populates="competition")


class VirtualPortfolio(Base):
    """
    A user's virtual portfolio in a specific competition.
    """
    __tablename__ = "virtual_portfolios"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id"), nullable=False)
    competition_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("competitions.id"), nullable=False
    )

    # Portfolio state
    cash_balance: Mapped[float] = mapped_column(Float, default=100000.0)
    total_value: Mapped[float] = mapped_column(Float, default=100000.0)  # Cash + holdings
    total_return: Mapped[float] = mapped_column(Float, default=0.0)  # Dollar return
    total_return_percent: Mapped[float] = mapped_column(Float, default=0.0)

    # Rankings
    current_rank: Mapped[int | None] = mapped_column(Integer, nullable=True)
    best_rank: Mapped[int | None] = mapped_column(Integer, nullable=True)

    # Stats
    trades_count: Mapped[int] = mapped_column(Integer, default=0)
    winning_trades: Mapped[int] = mapped_column(Integer, default=0)
    losing_trades: Mapped[int] = mapped_column(Integer, default=0)

    # Timestamps
    joined_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    last_trade_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

    # Relationships
    competition = relationship("Competition", back_populates="portfolios")
    trades = relationship("VirtualTrade", back_populates="portfolio")
    holdings = relationship("VirtualHolding", back_populates="portfolio")


class VirtualHolding(Base):
    """
    A holding in a virtual portfolio.
    """
    __tablename__ = "virtual_holdings"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    portfolio_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("virtual_portfolios.id"), nullable=False
    )

    ticker: Mapped[str] = mapped_column(String(10), nullable=False)
    quantity: Mapped[float] = mapped_column(Float, nullable=False)
    avg_cost: Mapped[float] = mapped_column(Float, nullable=False)
    current_price: Mapped[float | None] = mapped_column(Float, nullable=True)
    current_value: Mapped[float | None] = mapped_column(Float, nullable=True)
    profit_loss: Mapped[float | None] = mapped_column(Float, nullable=True)
    profit_loss_percent: Mapped[float | None] = mapped_column(Float, nullable=True)

    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow
    )

    # Relationships
    portfolio = relationship("VirtualPortfolio", back_populates="holdings")


class VirtualTrade(Base):
    """
    A trade made in a virtual portfolio.
    """
    __tablename__ = "virtual_trades"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    portfolio_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("virtual_portfolios.id"), nullable=False
    )

    ticker: Mapped[str] = mapped_column(String(10), nullable=False)
    type: Mapped[TradeType] = mapped_column(Enum(TradeType), nullable=False)
    quantity: Mapped[float] = mapped_column(Float, nullable=False)
    price: Mapped[float] = mapped_column(Float, nullable=False)  # Price at execution
    total_value: Mapped[float] = mapped_column(Float, nullable=False)

    # For tracking P/L on sells
    realized_pl: Mapped[float | None] = mapped_column(Float, nullable=True)

    executed_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    # Relationships
    portfolio = relationship("VirtualPortfolio", back_populates="trades")


class AchievementType(enum.Enum):
    """Achievement categories."""
    TRADING = "trading"
    COMPETITION = "competition"
    STREAK = "streak"
    MILESTONE = "milestone"


class Achievement(Base):
    """
    Achievement/badge earned by a user.
    """
    __tablename__ = "achievements"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id"), nullable=False)

    code: Mapped[str] = mapped_column(String(50), nullable=False)  # e.g., "first_trade"
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    description: Mapped[str] = mapped_column(String(255), nullable=False)
    icon: Mapped[str] = mapped_column(String(50), nullable=False)  # emoji or icon name
    type: Mapped[AchievementType] = mapped_column(Enum(AchievementType), nullable=False)

    # For progress-based achievements
    progress: Mapped[int] = mapped_column(Integer, default=0)
    target: Mapped[int] = mapped_column(Integer, default=1)

    unlocked: Mapped[bool] = mapped_column(Boolean, default=False)
    unlocked_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


# Achievement definitions
ACHIEVEMENT_DEFINITIONS = [
    {
        "code": "first_trade",
        "name": "First Steps",
        "description": "Make your first virtual trade",
        "icon": "🚀",
        "type": AchievementType.TRADING,
        "target": 1
    },
    {
        "code": "trader_10",
        "name": "Active Trader",
        "description": "Complete 10 trades",
        "icon": "📈",
        "type": AchievementType.TRADING,
        "target": 10
    },
    {
        "code": "trader_100",
        "name": "Trading Master",
        "description": "Complete 100 trades",
        "icon": "🏆",
        "type": AchievementType.TRADING,
        "target": 100
    },
    {
        "code": "first_profit",
        "name": "In The Green",
        "description": "Close your first profitable trade",
        "icon": "💚",
        "type": AchievementType.TRADING,
        "target": 1
    },
    {
        "code": "profit_1000",
        "name": "Grand Profit",
        "description": "Earn $1,000 in virtual profits",
        "icon": "💰",
        "type": AchievementType.MILESTONE,
        "target": 1000
    },
    {
        "code": "profit_10000",
        "name": "Legendary Gains",
        "description": "Earn $10,000 in virtual profits",
        "icon": "🤑",
        "type": AchievementType.MILESTONE,
        "target": 10000
    },
    {
        "code": "competition_join",
        "name": "Competitor",
        "description": "Join your first competition",
        "icon": "🎮",
        "type": AchievementType.COMPETITION,
        "target": 1
    },
    {
        "code": "competition_top10",
        "name": "Top 10",
        "description": "Finish in the top 10 of a competition",
        "icon": "🥇",
        "type": AchievementType.COMPETITION,
        "target": 1
    },
    {
        "code": "competition_winner",
        "name": "Champion",
        "description": "Win a competition",
        "icon": "👑",
        "type": AchievementType.COMPETITION,
        "target": 1
    },
    {
        "code": "win_streak_3",
        "name": "Hot Streak",
        "description": "3 winning trades in a row",
        "icon": "🔥",
        "type": AchievementType.STREAK,
        "target": 3
    },
    {
        "code": "win_streak_5",
        "name": "On Fire",
        "description": "5 winning trades in a row",
        "icon": "⚡",
        "type": AchievementType.STREAK,
        "target": 5
    },
    {
        "code": "diversified",
        "name": "Diversified",
        "description": "Hold 5 different stocks at once",
        "icon": "🎯",
        "type": AchievementType.TRADING,
        "target": 5
    },
]
