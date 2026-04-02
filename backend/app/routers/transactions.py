from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import Optional

from app.database import get_db
from app.models import User, Holding
from app.models.transaction import Transaction, TransactionType
from app.schemas.transaction import TransactionCreate, TransactionResponse
from app.services.auth import get_current_user


router = APIRouter(prefix="/transactions", tags=["Transactions"])


def calculate_weighted_avg_cost(
    current_quantity: float,
    current_avg_cost: float,
    new_quantity: float,
    new_price: float
) -> float:
    """Calculate new weighted average cost basis after a buy."""
    total_cost = (current_quantity * current_avg_cost) + (new_quantity * new_price)
    total_quantity = current_quantity + new_quantity
    return total_cost / total_quantity if total_quantity > 0 else 0


@router.post("/", response_model=TransactionResponse, status_code=status.HTTP_201_CREATED)
def create_transaction(
    transaction_data: TransactionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Create a new transaction and update the holding accordingly.

    - BUY: Creates holding if doesn't exist, or updates quantity and avg_cost_basis
    - SELL: Decreases quantity and calculates realized gain
    """
    ticker = transaction_data.ticker.upper()
    tx_type = TransactionType(transaction_data.type)

    # Find or create holding
    holding = db.query(Holding).filter(
        Holding.user_id == current_user.id,
        Holding.ticker == ticker
    ).first()

    if tx_type == TransactionType.BUY:
        if holding:
            # Update existing holding with weighted average
            new_avg_cost = calculate_weighted_avg_cost(
                holding.quantity,
                holding.avg_cost_basis,
                transaction_data.quantity,
                transaction_data.price_per_unit
            )
            holding.quantity += transaction_data.quantity
            holding.avg_cost_basis = new_avg_cost
        else:
            # Create new holding
            holding = Holding(
                user_id=current_user.id,
                ticker=ticker,
                quantity=transaction_data.quantity,
                avg_cost_basis=transaction_data.price_per_unit
            )
            db.add(holding)
            db.flush()  # Get the holding ID

    elif tx_type == TransactionType.SELL:
        if not holding:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Cannot sell {ticker}: no existing holding found"
            )

        if holding.quantity < transaction_data.quantity:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Cannot sell {transaction_data.quantity} shares: only {holding.quantity} available"
            )

        # Calculate realized gain
        realized_gain = (transaction_data.price_per_unit - holding.avg_cost_basis) * transaction_data.quantity

        # Update holding's realized gains
        if not hasattr(holding, 'realized_gains') or holding.realized_gains is None:
            holding.realized_gains = 0.0
        holding.realized_gains += realized_gain

        # Decrease quantity
        holding.quantity -= transaction_data.quantity

        # If quantity is 0, keep the holding for history (don't delete)

    # Create transaction record
    new_transaction = Transaction(
        holding_id=holding.id,
        type=tx_type,
        quantity=transaction_data.quantity,
        price_per_unit=transaction_data.price_per_unit,
        transaction_date=transaction_data.transaction_date
    )

    db.add(new_transaction)
    db.commit()
    db.refresh(new_transaction)

    return TransactionResponse.from_transaction(new_transaction, ticker)


@router.get("/", response_model=list[TransactionResponse])
def get_transactions(
    ticker: Optional[str] = Query(None, description="Filter by ticker"),
    type: Optional[str] = Query(None, pattern="^(BUY|SELL)$", description="Filter by type"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get all transactions for the current user with optional filters."""
    # Get user's holdings
    user_holdings = db.query(Holding).filter(
        Holding.user_id == current_user.id
    ).all()

    holding_ids = [h.id for h in user_holdings]
    ticker_map = {h.id: h.ticker for h in user_holdings}

    if not holding_ids:
        return []

    # Build query
    query = db.query(Transaction).filter(Transaction.holding_id.in_(holding_ids))

    if ticker:
        ticker_upper = ticker.upper()
        filtered_holdings = [h.id for h in user_holdings if h.ticker == ticker_upper]
        query = query.filter(Transaction.holding_id.in_(filtered_holdings))

    if type:
        query = query.filter(Transaction.type == TransactionType(type))

    transactions = query.order_by(Transaction.transaction_date.desc()).all()

    return [
        TransactionResponse.from_transaction(tx, ticker_map[tx.holding_id])
        for tx in transactions
    ]


@router.get("/{transaction_id}", response_model=TransactionResponse)
def get_transaction(
    transaction_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get a specific transaction by ID."""
    transaction = db.query(Transaction).filter(Transaction.id == transaction_id).first()

    if not transaction:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Transaction not found"
        )

    # Verify ownership
    holding = db.query(Holding).filter(Holding.id == transaction.holding_id).first()
    if not holding or holding.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to access this transaction"
        )

    return TransactionResponse.from_transaction(transaction, holding.ticker)


@router.delete("/{transaction_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_transaction(
    transaction_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Delete a transaction and recalculate the holding.

    Note: This reverses the effect of the transaction on the holding.
    """
    transaction = db.query(Transaction).filter(Transaction.id == transaction_id).first()

    if not transaction:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Transaction not found"
        )

    # Verify ownership
    holding = db.query(Holding).filter(Holding.id == transaction.holding_id).first()
    if not holding or holding.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to delete this transaction"
        )

    # Reverse the transaction effect
    if transaction.type == TransactionType.BUY:
        # Reverse a buy: decrease quantity
        # Recalculate avg_cost_basis from remaining transactions
        holding.quantity -= transaction.quantity

        if holding.quantity <= 0:
            holding.quantity = 0
            holding.avg_cost_basis = 0
        else:
            # Recalculate average from all remaining BUY transactions
            remaining_buys = db.query(Transaction).filter(
                Transaction.holding_id == holding.id,
                Transaction.type == TransactionType.BUY,
                Transaction.id != transaction_id
            ).all()

            if remaining_buys:
                total_cost = sum(tx.quantity * tx.price_per_unit for tx in remaining_buys)
                total_qty = sum(tx.quantity for tx in remaining_buys)
                holding.avg_cost_basis = total_cost / total_qty if total_qty > 0 else 0

    elif transaction.type == TransactionType.SELL:
        # Reverse a sell: increase quantity and reverse realized gain
        holding.quantity += transaction.quantity

        # Reverse the realized gain
        realized_gain = (transaction.price_per_unit - holding.avg_cost_basis) * transaction.quantity
        if hasattr(holding, 'realized_gains') and holding.realized_gains is not None:
            holding.realized_gains -= realized_gain

    db.delete(transaction)
    db.commit()

    return None
