"""
Competition and Paper Trading Router

Endpoints for virtual trading competitions, leaderboards, and achievements.
"""

from datetime import datetime, timedelta
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, desc
from pydantic import BaseModel

from app.database import get_db
from app.models.user import User
from app.models.competition import (
    Competition, VirtualPortfolio, VirtualHolding, VirtualTrade,
    Achievement, CompetitionStatus, CompetitionType, TradeType,
    ACHIEVEMENT_DEFINITIONS, AchievementType
)
from app.routers.auth import get_current_user
from app.services.market_data import get_stock_quote


router = APIRouter(prefix="/competitions", tags=["Competitions"])


# ============ Schemas ============

class CompetitionResponse(BaseModel):
    id: str
    name: str
    description: Optional[str]
    type: str
    status: str
    starting_balance: float
    max_participants: Optional[int]
    entry_fee: float
    prize_description: Optional[str]
    start_date: datetime
    end_date: datetime
    participant_count: int
    user_joined: bool
    user_rank: Optional[int]

    class Config:
        from_attributes = True


class VirtualHoldingResponse(BaseModel):
    id: str
    ticker: str
    quantity: float
    avg_cost: float
    current_price: Optional[float]
    current_value: Optional[float]
    profit_loss: Optional[float]
    profit_loss_percent: Optional[float]

    class Config:
        from_attributes = True


class VirtualPortfolioResponse(BaseModel):
    id: str
    competition_id: str
    cash_balance: float
    total_value: float
    total_return: float
    total_return_percent: float
    current_rank: Optional[int]
    trades_count: int
    winning_trades: int
    losing_trades: int
    holdings: List[VirtualHoldingResponse]

    class Config:
        from_attributes = True


class VirtualTradeCreate(BaseModel):
    ticker: str
    type: str  # BUY or SELL
    quantity: float


class VirtualTradeResponse(BaseModel):
    id: str
    ticker: str
    type: str
    quantity: float
    price: float
    total_value: float
    realized_pl: Optional[float]
    executed_at: datetime

    class Config:
        from_attributes = True


class LeaderboardEntry(BaseModel):
    rank: int
    user_id: str
    username: str
    total_value: float
    total_return: float
    total_return_percent: float
    trades_count: int
    is_current_user: bool


class AchievementResponse(BaseModel):
    code: str
    name: str
    description: str
    icon: str
    type: str
    progress: int
    target: int
    unlocked: bool
    unlocked_at: Optional[datetime]

    class Config:
        from_attributes = True


# ============ Helper Functions ============

def update_portfolio_values(portfolio: VirtualPortfolio, db: Session) -> None:
    """Update portfolio total value based on current prices."""
    total_holdings_value = 0.0

    for holding in portfolio.holdings:
        quote = get_stock_quote(holding.ticker)
        if quote:
            holding.current_price = quote.get("current_price", 0)
            holding.current_value = holding.quantity * holding.current_price
            holding.profit_loss = holding.current_value - (holding.quantity * holding.avg_cost)
            holding.profit_loss_percent = (
                (holding.profit_loss / (holding.quantity * holding.avg_cost)) * 100
                if holding.avg_cost > 0 else 0
            )
            total_holdings_value += holding.current_value

    starting_balance = 100000.0  # Default starting balance
    portfolio.total_value = portfolio.cash_balance + total_holdings_value
    portfolio.total_return = portfolio.total_value - starting_balance
    portfolio.total_return_percent = (portfolio.total_return / starting_balance) * 100

    db.commit()


def update_rankings(competition_id: str, db: Session) -> None:
    """Update rankings for all portfolios in a competition."""
    portfolios = db.query(VirtualPortfolio).filter(
        VirtualPortfolio.competition_id == competition_id
    ).order_by(desc(VirtualPortfolio.total_return_percent)).all()

    for i, portfolio in enumerate(portfolios, 1):
        portfolio.current_rank = i
        if portfolio.best_rank is None or i < portfolio.best_rank:
            portfolio.best_rank = i

    db.commit()


def check_and_award_achievements(user_id: str, portfolio: VirtualPortfolio, db: Session) -> List[Achievement]:
    """Check and award any new achievements."""
    new_achievements = []

    # Get existing achievements for user
    existing = {a.code: a for a in db.query(Achievement).filter(
        Achievement.user_id == user_id
    ).all()}

    # Check each achievement
    for defn in ACHIEVEMENT_DEFINITIONS:
        code = defn["code"]

        if code in existing and existing[code].unlocked:
            continue

        unlocked = False
        progress = 0

        # Trading achievements
        if code == "first_trade":
            progress = min(portfolio.trades_count, 1)
            unlocked = portfolio.trades_count >= 1

        elif code == "trader_10":
            progress = min(portfolio.trades_count, 10)
            unlocked = portfolio.trades_count >= 10

        elif code == "trader_100":
            progress = min(portfolio.trades_count, 100)
            unlocked = portfolio.trades_count >= 100

        elif code == "first_profit":
            progress = min(portfolio.winning_trades, 1)
            unlocked = portfolio.winning_trades >= 1

        elif code == "profit_1000":
            progress = int(min(max(portfolio.total_return, 0), 1000))
            unlocked = portfolio.total_return >= 1000

        elif code == "profit_10000":
            progress = int(min(max(portfolio.total_return, 0), 10000))
            unlocked = portfolio.total_return >= 10000

        elif code == "competition_join":
            progress = 1
            unlocked = True

        elif code == "competition_top10":
            if portfolio.current_rank and portfolio.current_rank <= 10:
                # Check if competition ended
                comp = db.query(Competition).filter(
                    Competition.id == portfolio.competition_id
                ).first()
                if comp and comp.status == CompetitionStatus.ENDED:
                    progress = 1
                    unlocked = True

        elif code == "competition_winner":
            if portfolio.current_rank == 1:
                comp = db.query(Competition).filter(
                    Competition.id == portfolio.competition_id
                ).first()
                if comp and comp.status == CompetitionStatus.ENDED:
                    progress = 1
                    unlocked = True

        elif code == "diversified":
            holdings_count = len(portfolio.holdings)
            progress = min(holdings_count, 5)
            unlocked = holdings_count >= 5

        # Create or update achievement
        if code not in existing:
            achievement = Achievement(
                user_id=user_id,
                code=code,
                name=defn["name"],
                description=defn["description"],
                icon=defn["icon"],
                type=defn["type"],
                progress=progress,
                target=defn["target"],
                unlocked=unlocked,
                unlocked_at=datetime.utcnow() if unlocked else None
            )
            db.add(achievement)
            if unlocked:
                new_achievements.append(achievement)
        else:
            existing[code].progress = progress
            if unlocked and not existing[code].unlocked:
                existing[code].unlocked = True
                existing[code].unlocked_at = datetime.utcnow()
                new_achievements.append(existing[code])

    db.commit()
    return new_achievements


def create_default_competition(db: Session) -> Competition:
    """Create a default weekly competition if none exist."""
    now = datetime.utcnow()

    # Find start of current week (Monday)
    days_since_monday = now.weekday()
    week_start = now - timedelta(days=days_since_monday)
    week_start = week_start.replace(hour=0, minute=0, second=0, microsecond=0)
    week_end = week_start + timedelta(days=7)

    # Check if there's already an active competition
    existing = db.query(Competition).filter(
        Competition.status == CompetitionStatus.ACTIVE
    ).first()

    if existing:
        return existing

    # Create new weekly competition
    competition = Competition(
        name=f"Weekly Challenge - Week {now.isocalendar()[1]}",
        description="Compete with other traders to achieve the highest returns this week. Start with $100,000 virtual cash and prove your trading skills!",
        type=CompetitionType.WEEKLY,
        status=CompetitionStatus.ACTIVE,
        starting_balance=100000.0,
        prize_description="Top 3 get featured on the leaderboard + exclusive badges",
        start_date=week_start,
        end_date=week_end
    )

    db.add(competition)
    db.commit()
    db.refresh(competition)

    return competition


# ============ Endpoints ============

# NOTE: Static routes must come BEFORE parameterized routes like /{competition_id}
# Otherwise FastAPI will match "/achievements/me" as competition_id="achievements"

@router.get("/achievements/me", response_model=List[AchievementResponse])
def get_my_achievements(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get current user's achievements."""
    achievements = db.query(Achievement).filter(
        Achievement.user_id == current_user.id
    ).order_by(desc(Achievement.unlocked), desc(Achievement.unlocked_at)).all()

    # Add any missing achievement definitions
    existing_codes = {a.code for a in achievements}

    for defn in ACHIEVEMENT_DEFINITIONS:
        if defn["code"] not in existing_codes:
            new_achievement = Achievement(
                user_id=current_user.id,
                code=defn["code"],
                name=defn["name"],
                description=defn["description"],
                icon=defn["icon"],
                type=defn["type"],
                progress=0,
                target=defn["target"],
                unlocked=False
            )
            db.add(new_achievement)
            achievements.append(new_achievement)

    db.commit()

    return [
        AchievementResponse(
            code=a.code,
            name=a.name,
            description=a.description,
            icon=a.icon,
            type=a.type.value if isinstance(a.type, AchievementType) else a.type,
            progress=a.progress,
            target=a.target,
            unlocked=a.unlocked,
            unlocked_at=a.unlocked_at
        ) for a in achievements
    ]


@router.get("/stats/me")
def get_my_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get current user's overall competition stats."""
    portfolios = db.query(VirtualPortfolio).filter(
        VirtualPortfolio.user_id == current_user.id
    ).all()

    total_trades = sum(p.trades_count for p in portfolios)
    total_wins = sum(p.winning_trades for p in portfolios)
    total_losses = sum(p.losing_trades for p in portfolios)
    competitions_joined = len(portfolios)

    # Best placement
    best_rank = None
    for p in portfolios:
        if p.best_rank:
            if best_rank is None or p.best_rank < best_rank:
                best_rank = p.best_rank

    # Unlocked achievements
    unlocked_count = db.query(func.count(Achievement.id)).filter(
        Achievement.user_id == current_user.id,
        Achievement.unlocked == True
    ).scalar()

    total_achievements = len(ACHIEVEMENT_DEFINITIONS)

    return {
        "competitions_joined": competitions_joined,
        "total_trades": total_trades,
        "winning_trades": total_wins,
        "losing_trades": total_losses,
        "win_rate": (total_wins / total_trades * 100) if total_trades > 0 else 0,
        "best_rank": best_rank,
        "achievements_unlocked": unlocked_count,
        "achievements_total": total_achievements
    }


@router.get("/", response_model=List[CompetitionResponse])
def list_competitions(
    status: Optional[str] = Query(None, description="Filter by status"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """List all competitions."""
    # Ensure there's at least one active competition
    create_default_competition(db)

    query = db.query(Competition)

    if status:
        try:
            status_enum = CompetitionStatus(status)
            query = query.filter(Competition.status == status_enum)
        except ValueError:
            pass

    competitions = query.order_by(desc(Competition.start_date)).all()

    result = []
    for comp in competitions:
        # Count participants
        participant_count = db.query(func.count(VirtualPortfolio.id)).filter(
            VirtualPortfolio.competition_id == comp.id
        ).scalar()

        # Check if user joined
        user_portfolio = db.query(VirtualPortfolio).filter(
            VirtualPortfolio.competition_id == comp.id,
            VirtualPortfolio.user_id == current_user.id
        ).first()

        result.append(CompetitionResponse(
            id=comp.id,
            name=comp.name,
            description=comp.description,
            type=comp.type.value,
            status=comp.status.value,
            starting_balance=comp.starting_balance,
            max_participants=comp.max_participants,
            entry_fee=comp.entry_fee,
            prize_description=comp.prize_description,
            start_date=comp.start_date,
            end_date=comp.end_date,
            participant_count=participant_count,
            user_joined=user_portfolio is not None,
            user_rank=user_portfolio.current_rank if user_portfolio else None
        ))

    return result


@router.get("/{competition_id}", response_model=CompetitionResponse)
def get_competition(
    competition_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get a specific competition."""
    comp = db.query(Competition).filter(Competition.id == competition_id).first()

    if not comp:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Competition not found"
        )

    participant_count = db.query(func.count(VirtualPortfolio.id)).filter(
        VirtualPortfolio.competition_id == comp.id
    ).scalar()

    user_portfolio = db.query(VirtualPortfolio).filter(
        VirtualPortfolio.competition_id == comp.id,
        VirtualPortfolio.user_id == current_user.id
    ).first()

    return CompetitionResponse(
        id=comp.id,
        name=comp.name,
        description=comp.description,
        type=comp.type.value,
        status=comp.status.value,
        starting_balance=comp.starting_balance,
        max_participants=comp.max_participants,
        entry_fee=comp.entry_fee,
        prize_description=comp.prize_description,
        start_date=comp.start_date,
        end_date=comp.end_date,
        participant_count=participant_count,
        user_joined=user_portfolio is not None,
        user_rank=user_portfolio.current_rank if user_portfolio else None
    )


@router.post("/{competition_id}/join", response_model=VirtualPortfolioResponse)
def join_competition(
    competition_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Join a competition."""
    comp = db.query(Competition).filter(Competition.id == competition_id).first()

    if not comp:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Competition not found"
        )

    if comp.status != CompetitionStatus.ACTIVE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Competition is not active"
        )

    # Check if already joined
    existing = db.query(VirtualPortfolio).filter(
        VirtualPortfolio.competition_id == competition_id,
        VirtualPortfolio.user_id == current_user.id
    ).first()

    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You have already joined this competition"
        )

    # Check max participants
    if comp.max_participants:
        count = db.query(func.count(VirtualPortfolio.id)).filter(
            VirtualPortfolio.competition_id == competition_id
        ).scalar()
        if count >= comp.max_participants:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Competition is full"
            )

    # Create portfolio
    portfolio = VirtualPortfolio(
        user_id=current_user.id,
        competition_id=competition_id,
        cash_balance=comp.starting_balance,
        total_value=comp.starting_balance
    )

    db.add(portfolio)
    db.commit()
    db.refresh(portfolio)

    # Award achievement
    check_and_award_achievements(current_user.id, portfolio, db)

    # Update rankings
    update_rankings(competition_id, db)

    return VirtualPortfolioResponse(
        id=portfolio.id,
        competition_id=portfolio.competition_id,
        cash_balance=portfolio.cash_balance,
        total_value=portfolio.total_value,
        total_return=portfolio.total_return,
        total_return_percent=portfolio.total_return_percent,
        current_rank=portfolio.current_rank,
        trades_count=portfolio.trades_count,
        winning_trades=portfolio.winning_trades,
        losing_trades=portfolio.losing_trades,
        holdings=[]
    )


@router.get("/{competition_id}/portfolio", response_model=VirtualPortfolioResponse)
def get_portfolio(
    competition_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get user's portfolio in a competition."""
    portfolio = db.query(VirtualPortfolio).filter(
        VirtualPortfolio.competition_id == competition_id,
        VirtualPortfolio.user_id == current_user.id
    ).first()

    if not portfolio:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="You haven't joined this competition"
        )

    # Update values with current prices
    update_portfolio_values(portfolio, db)
    update_rankings(competition_id, db)

    holdings = [
        VirtualHoldingResponse(
            id=h.id,
            ticker=h.ticker,
            quantity=h.quantity,
            avg_cost=h.avg_cost,
            current_price=h.current_price,
            current_value=h.current_value,
            profit_loss=h.profit_loss,
            profit_loss_percent=h.profit_loss_percent
        ) for h in portfolio.holdings
    ]

    return VirtualPortfolioResponse(
        id=portfolio.id,
        competition_id=portfolio.competition_id,
        cash_balance=portfolio.cash_balance,
        total_value=portfolio.total_value,
        total_return=portfolio.total_return,
        total_return_percent=portfolio.total_return_percent,
        current_rank=portfolio.current_rank,
        trades_count=portfolio.trades_count,
        winning_trades=portfolio.winning_trades,
        losing_trades=portfolio.losing_trades,
        holdings=holdings
    )


@router.post("/{competition_id}/trade", response_model=VirtualTradeResponse)
def make_trade(
    competition_id: str,
    trade_data: VirtualTradeCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Make a virtual trade."""
    # Get portfolio
    portfolio = db.query(VirtualPortfolio).filter(
        VirtualPortfolio.competition_id == competition_id,
        VirtualPortfolio.user_id == current_user.id
    ).first()

    if not portfolio:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="You haven't joined this competition"
        )

    # Check competition is active
    comp = db.query(Competition).filter(Competition.id == competition_id).first()
    if comp.status != CompetitionStatus.ACTIVE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Competition is not active"
        )

    # Validate trade type
    trade_type = trade_data.type.upper()
    if trade_type not in ["BUY", "SELL"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Trade type must be BUY or SELL"
        )

    ticker = trade_data.ticker.upper()
    quantity = trade_data.quantity

    if quantity <= 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Quantity must be positive"
        )

    # Get current price
    quote = get_stock_quote(ticker)
    if not quote:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid ticker: {ticker}"
        )

    current_price = quote.get("current_price", 0)
    total_value = current_price * quantity
    realized_pl = None

    if trade_type == "BUY":
        # Check sufficient cash
        if total_value > portfolio.cash_balance:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Insufficient cash. Need ${total_value:.2f}, have ${portfolio.cash_balance:.2f}"
            )

        # Deduct cash
        portfolio.cash_balance -= total_value

        # Update or create holding
        holding = db.query(VirtualHolding).filter(
            VirtualHolding.portfolio_id == portfolio.id,
            VirtualHolding.ticker == ticker
        ).first()

        if holding:
            # Update avg cost (weighted average)
            total_cost = (holding.quantity * holding.avg_cost) + total_value
            holding.quantity += quantity
            holding.avg_cost = total_cost / holding.quantity
        else:
            holding = VirtualHolding(
                portfolio_id=portfolio.id,
                ticker=ticker,
                quantity=quantity,
                avg_cost=current_price
            )
            db.add(holding)

    else:  # SELL
        # Check holding exists
        holding = db.query(VirtualHolding).filter(
            VirtualHolding.portfolio_id == portfolio.id,
            VirtualHolding.ticker == ticker
        ).first()

        if not holding:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"You don't own any {ticker}"
            )

        if quantity > holding.quantity:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Insufficient shares. Own {holding.quantity}, trying to sell {quantity}"
            )

        # Calculate P/L
        cost_basis = holding.avg_cost * quantity
        realized_pl = total_value - cost_basis

        # Update winning/losing trades
        if realized_pl > 0:
            portfolio.winning_trades += 1
        elif realized_pl < 0:
            portfolio.losing_trades += 1

        # Add cash
        portfolio.cash_balance += total_value

        # Update holding
        holding.quantity -= quantity
        if holding.quantity <= 0.0001:  # Effectively zero
            db.delete(holding)

    # Create trade record
    trade = VirtualTrade(
        portfolio_id=portfolio.id,
        ticker=ticker,
        type=TradeType(trade_type),
        quantity=quantity,
        price=current_price,
        total_value=total_value,
        realized_pl=realized_pl
    )

    db.add(trade)
    portfolio.trades_count += 1
    portfolio.last_trade_at = datetime.utcnow()

    db.commit()
    db.refresh(trade)

    # Update portfolio values and rankings
    update_portfolio_values(portfolio, db)
    update_rankings(competition_id, db)

    # Check achievements
    check_and_award_achievements(current_user.id, portfolio, db)

    return VirtualTradeResponse(
        id=trade.id,
        ticker=trade.ticker,
        type=trade.type.value,
        quantity=trade.quantity,
        price=trade.price,
        total_value=trade.total_value,
        realized_pl=trade.realized_pl,
        executed_at=trade.executed_at
    )


@router.get("/{competition_id}/trades", response_model=List[VirtualTradeResponse])
def get_trades(
    competition_id: str,
    limit: int = Query(50, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get user's trade history in a competition."""
    portfolio = db.query(VirtualPortfolio).filter(
        VirtualPortfolio.competition_id == competition_id,
        VirtualPortfolio.user_id == current_user.id
    ).first()

    if not portfolio:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="You haven't joined this competition"
        )

    trades = db.query(VirtualTrade).filter(
        VirtualTrade.portfolio_id == portfolio.id
    ).order_by(desc(VirtualTrade.executed_at)).limit(limit).all()

    return [
        VirtualTradeResponse(
            id=t.id,
            ticker=t.ticker,
            type=t.type.value,
            quantity=t.quantity,
            price=t.price,
            total_value=t.total_value,
            realized_pl=t.realized_pl,
            executed_at=t.executed_at
        ) for t in trades
    ]


@router.get("/{competition_id}/leaderboard", response_model=List[LeaderboardEntry])
def get_leaderboard(
    competition_id: str,
    limit: int = Query(50, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get competition leaderboard."""
    comp = db.query(Competition).filter(Competition.id == competition_id).first()

    if not comp:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Competition not found"
        )

    # Update all portfolio values first
    portfolios = db.query(VirtualPortfolio).filter(
        VirtualPortfolio.competition_id == competition_id
    ).all()

    for p in portfolios:
        update_portfolio_values(p, db)

    update_rankings(competition_id, db)

    # Get top portfolios
    top_portfolios = db.query(VirtualPortfolio).filter(
        VirtualPortfolio.competition_id == competition_id
    ).order_by(desc(VirtualPortfolio.total_return_percent)).limit(limit).all()

    result = []
    for p in top_portfolios:
        user = db.query(User).filter(User.id == p.user_id).first()
        username = user.email.split("@")[0] if user else "Unknown"

        result.append(LeaderboardEntry(
            rank=p.current_rank or 0,
            user_id=p.user_id,
            username=username,
            total_value=p.total_value,
            total_return=p.total_return,
            total_return_percent=p.total_return_percent,
            trades_count=p.trades_count,
            is_current_user=p.user_id == current_user.id
        ))

    return result
