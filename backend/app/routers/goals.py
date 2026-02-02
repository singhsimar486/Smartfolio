from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import User
from app.models.goal import PortfolioGoal
from app.models.holding import Holding
from app.schemas.goal import GoalCreate, GoalUpdate, GoalResponse
from app.services.auth import get_current_user
from app.services.market_data import get_stock_quote


router = APIRouter(prefix="/goals", tags=["Goals"])


def calculate_goal_progress(goal: PortfolioGoal, current_portfolio_value: float) -> GoalResponse:
    """Calculate progress towards a goal."""
    progress_percent = (current_portfolio_value / goal.target_amount * 100) if goal.target_amount > 0 else 0
    amount_remaining = max(0, goal.target_amount - current_portfolio_value)

    days_remaining = None
    on_track = False

    if goal.target_date:
        days_remaining = (goal.target_date - datetime.utcnow()).days
        if days_remaining > 0 and progress_percent > 0:
            # Calculate if on track based on time elapsed vs progress made
            total_days = (goal.target_date - goal.created_at).days
            days_elapsed = total_days - days_remaining
            expected_progress = (days_elapsed / total_days * 100) if total_days > 0 else 0
            on_track = progress_percent >= expected_progress

    return GoalResponse(
        id=goal.id,
        name=goal.name,
        target_amount=goal.target_amount,
        target_date=goal.target_date,
        description=goal.description,
        created_at=goal.created_at,
        current_amount=current_portfolio_value,
        progress_percent=min(100, progress_percent),
        amount_remaining=amount_remaining,
        days_remaining=days_remaining,
        on_track=on_track
    )


def get_portfolio_value(user_id: str, db: Session) -> float:
    """Calculate total portfolio value."""
    holdings = db.query(Holding).filter(Holding.user_id == user_id).all()
    total = 0
    for holding in holdings:
        quote = get_stock_quote(holding.ticker)
        if quote and quote.get("current_price"):
            total += holding.quantity * quote["current_price"]
    return total


@router.post("/", response_model=GoalResponse, status_code=status.HTTP_201_CREATED)
def create_goal(
    goal_data: GoalCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a new portfolio goal."""
    if goal_data.target_amount <= 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Target amount must be greater than 0"
        )

    new_goal = PortfolioGoal(
        user_id=current_user.id,
        name=goal_data.name,
        target_amount=goal_data.target_amount,
        target_date=goal_data.target_date,
        description=goal_data.description
    )

    db.add(new_goal)
    db.commit()
    db.refresh(new_goal)

    current_value = get_portfolio_value(current_user.id, db)
    return calculate_goal_progress(new_goal, current_value)


@router.get("/", response_model=list[GoalResponse])
def get_goals(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get all goals for the current user."""
    goals = db.query(PortfolioGoal).filter(
        PortfolioGoal.user_id == current_user.id
    ).order_by(PortfolioGoal.target_date.asc().nullsfirst()).all()

    current_value = get_portfolio_value(current_user.id, db)
    return [calculate_goal_progress(goal, current_value) for goal in goals]


@router.get("/{goal_id}", response_model=GoalResponse)
def get_goal(
    goal_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get a specific goal."""
    goal = db.query(PortfolioGoal).filter(PortfolioGoal.id == goal_id).first()

    if not goal:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Goal not found")

    if goal.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized")

    current_value = get_portfolio_value(current_user.id, db)
    return calculate_goal_progress(goal, current_value)


@router.put("/{goal_id}", response_model=GoalResponse)
def update_goal(
    goal_id: str,
    goal_data: GoalUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update a goal."""
    goal = db.query(PortfolioGoal).filter(PortfolioGoal.id == goal_id).first()

    if not goal:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Goal not found")

    if goal.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized")

    if goal_data.name is not None:
        goal.name = goal_data.name
    if goal_data.target_amount is not None:
        if goal_data.target_amount <= 0:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Target must be > 0")
        goal.target_amount = goal_data.target_amount
    if goal_data.target_date is not None:
        goal.target_date = goal_data.target_date
    if goal_data.description is not None:
        goal.description = goal_data.description

    db.commit()
    db.refresh(goal)

    current_value = get_portfolio_value(current_user.id, db)
    return calculate_goal_progress(goal, current_value)


@router.delete("/{goal_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_goal(
    goal_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete a goal."""
    goal = db.query(PortfolioGoal).filter(PortfolioGoal.id == goal_id).first()

    if not goal:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Goal not found")

    if goal.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized")

    db.delete(goal)
    db.commit()
    return None
