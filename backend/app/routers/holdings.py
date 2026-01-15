from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import User, Holding
from app.schemas import HoldingCreate, HoldingUpdate, HoldingResponse
from app.services.auth import get_current_user


router = APIRouter(prefix="/holdings", tags=["Holdings"])


@router.post("/", response_model=HoldingResponse, status_code=status.HTTP_201_CREATED)
def create_holding(
    holding_data: HoldingCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Create a new holding for the logged-in user.
    
    This endpoint:
    1. Takes the holding data (ticker, quantity, avg_cost_basis)
    2. Gets the current user from JWT token
    3. Creates a new holding linked to that user
    4. Returns the created holding
    """
    
    # Check if user already has this ticker
    existing_holding = db.query(Holding).filter(
        Holding.user_id == current_user.id,
        Holding.ticker == holding_data.ticker.upper()
    ).first()
    
    if existing_holding:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"You already have a holding for {holding_data.ticker.upper()}. Use PUT to update it."
        )
    
    # Create the holding
    new_holding = Holding(
        user_id=current_user.id,
        ticker=holding_data.ticker.upper(),  # Normalize to uppercase
        quantity=holding_data.quantity,
        avg_cost_basis=holding_data.avg_cost_basis
    )
    
    db.add(new_holding)
    db.commit()
    db.refresh(new_holding)
    
    return new_holding


@router.get("/", response_model=list[HoldingResponse])
def get_holdings(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get all holdings for the logged-in user.
    
    This endpoint:
    1. Gets the current user from JWT token
    2. Queries all holdings where user_id matches
    3. Returns the list (empty list if no holdings)
    """
    
    holdings = db.query(Holding).filter(Holding.user_id == current_user.id).all()
    return holdings


@router.get("/{holding_id}", response_model=HoldingResponse)
def get_holding(
    holding_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get a specific holding by ID.
    
    This endpoint:
    1. Takes the holding ID from the URL path
    2. Finds the holding
    3. Verifies it belongs to the current user (security!)
    4. Returns it or 404 if not found
    """
    
    holding = db.query(Holding).filter(Holding.id == holding_id).first()
    
    if not holding:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Holding not found"
        )
    
    # Security check: make sure this holding belongs to the current user
    if holding.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to access this holding"
        )
    
    return holding


@router.put("/{holding_id}", response_model=HoldingResponse)
def update_holding(
    holding_id: str,
    holding_data: HoldingUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Update a holding.
    
    This endpoint:
    1. Finds the holding by ID
    2. Verifies ownership
    3. Updates only the fields that were provided
    4. Returns the updated holding
    """
    
    holding = db.query(Holding).filter(Holding.id == holding_id).first()
    
    if not holding:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Holding not found"
        )
    
    if holding.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to update this holding"
        )
    
    # Update only provided fields (partial update)
    if holding_data.ticker is not None:
        holding.ticker = holding_data.ticker.upper()
    if holding_data.quantity is not None:
        holding.quantity = holding_data.quantity
    if holding_data.avg_cost_basis is not None:
        holding.avg_cost_basis = holding_data.avg_cost_basis
    
    db.commit()
    db.refresh(holding)
    
    return holding


@router.delete("/{holding_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_holding(
    holding_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Delete a holding.
    
    This endpoint:
    1. Finds the holding by ID
    2. Verifies ownership
    3. Deletes it
    4. Returns 204 No Content (success, nothing to return)
    """
    
    holding = db.query(Holding).filter(Holding.id == holding_id).first()
    
    if not holding:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Holding not found"
        )
    
    if holding.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to delete this holding"
        )
    
    db.delete(holding)
    db.commit()
    
    return None