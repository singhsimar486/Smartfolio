from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import User
from app.models.watchlist import WatchlistItem
from app.schemas.watchlist import WatchlistCreate, WatchlistResponse, WatchlistWithMarketData
from app.services.auth import get_current_user
from app.services.market_data import get_stock_quote


router = APIRouter(prefix="/watchlist", tags=["Watchlist"])


@router.post("/", response_model=WatchlistResponse, status_code=status.HTTP_201_CREATED)
def add_to_watchlist(
    item_data: WatchlistCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Add a stock to the user's watchlist."""

    ticker = item_data.ticker.upper()

    # Check if already in watchlist
    existing = db.query(WatchlistItem).filter(
        WatchlistItem.user_id == current_user.id,
        WatchlistItem.ticker == ticker
    ).first()

    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"{ticker} is already in your watchlist"
        )

    # Validate ticker exists by trying to get quote
    quote = get_stock_quote(ticker)
    if not quote:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid ticker symbol: {ticker}"
        )

    # Create watchlist item
    new_item = WatchlistItem(
        user_id=current_user.id,
        ticker=ticker
    )

    db.add(new_item)
    db.commit()
    db.refresh(new_item)

    return new_item


@router.get("/", response_model=list[WatchlistWithMarketData])
def get_watchlist(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get user's watchlist with live market data."""

    items = db.query(WatchlistItem).filter(
        WatchlistItem.user_id == current_user.id
    ).order_by(WatchlistItem.created_at.desc()).all()

    result = []
    for item in items:
        quote = get_stock_quote(item.ticker)

        result.append(WatchlistWithMarketData(
            id=item.id,
            ticker=item.ticker,
            name=quote.get("name", item.ticker) if quote else item.ticker,
            current_price=quote.get("current_price") if quote else None,
            day_change=quote.get("day_change") if quote else None,
            day_change_percent=quote.get("day_change_percent") if quote else None,
            created_at=item.created_at
        ))

    return result


@router.delete("/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_from_watchlist(
    item_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Remove a stock from the watchlist."""

    item = db.query(WatchlistItem).filter(WatchlistItem.id == item_id).first()

    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Watchlist item not found"
        )

    if item.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to remove this item"
        )

    db.delete(item)
    db.commit()

    return None
