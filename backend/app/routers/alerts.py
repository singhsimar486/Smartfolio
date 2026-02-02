from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import User
from app.models.alert import PriceAlert, AlertCondition
from app.schemas.alert import AlertCreate, AlertUpdate, AlertResponse, AlertCheckResult
from app.services.auth import get_current_user
from app.services.market_data import get_stock_quote


router = APIRouter(prefix="/alerts", tags=["Alerts"])


def enrich_alert_with_market_data(alert: PriceAlert) -> AlertResponse:
    """Add current price and stock name to alert response."""
    quote = get_stock_quote(alert.ticker)
    return AlertResponse(
        id=alert.id,
        ticker=alert.ticker,
        condition=alert.condition.value,
        target_price=alert.target_price,
        is_active=alert.is_active,
        is_triggered=alert.is_triggered,
        triggered_at=alert.triggered_at,
        triggered_price=alert.triggered_price,
        created_at=alert.created_at,
        current_price=quote.get("current_price") if quote else None,
        stock_name=quote.get("name") if quote else None
    )


@router.post("/", response_model=AlertResponse, status_code=status.HTTP_201_CREATED)
def create_alert(
    alert_data: AlertCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a new price alert."""
    ticker = alert_data.ticker.upper()

    # Validate ticker exists
    quote = get_stock_quote(ticker)
    if not quote:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid ticker symbol: {ticker}"
        )

    # Validate condition
    if alert_data.condition.upper() not in ["ABOVE", "BELOW"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Condition must be 'ABOVE' or 'BELOW'"
        )

    # Validate target price
    if alert_data.target_price <= 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Target price must be greater than 0"
        )

    # Create alert
    new_alert = PriceAlert(
        user_id=current_user.id,
        ticker=ticker,
        condition=AlertCondition(alert_data.condition.upper()),
        target_price=alert_data.target_price,
        is_active=True,
        is_triggered=False
    )

    db.add(new_alert)
    db.commit()
    db.refresh(new_alert)

    return enrich_alert_with_market_data(new_alert)


@router.get("/", response_model=list[AlertResponse])
def get_alerts(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get all alerts for the current user with current prices."""
    alerts = db.query(PriceAlert).filter(
        PriceAlert.user_id == current_user.id
    ).order_by(PriceAlert.created_at.desc()).all()

    return [enrich_alert_with_market_data(alert) for alert in alerts]


@router.get("/check", response_model=AlertCheckResult)
def check_alerts(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Check all active alerts and return newly triggered ones."""
    # Get all active, non-triggered alerts
    alerts = db.query(PriceAlert).filter(
        PriceAlert.user_id == current_user.id,
        PriceAlert.is_active == True,
        PriceAlert.is_triggered == False
    ).all()

    triggered_alerts = []

    for alert in alerts:
        quote = get_stock_quote(alert.ticker)
        if not quote or quote.get("current_price") is None:
            continue

        current_price = quote["current_price"]
        should_trigger = False

        if alert.condition == AlertCondition.ABOVE and current_price >= alert.target_price:
            should_trigger = True
        elif alert.condition == AlertCondition.BELOW and current_price <= alert.target_price:
            should_trigger = True

        if should_trigger:
            alert.is_triggered = True
            alert.triggered_at = datetime.utcnow()
            alert.triggered_price = current_price

            triggered_alerts.append(AlertResponse(
                id=alert.id,
                ticker=alert.ticker,
                condition=alert.condition.value,
                target_price=alert.target_price,
                is_active=alert.is_active,
                is_triggered=alert.is_triggered,
                triggered_at=alert.triggered_at,
                triggered_price=alert.triggered_price,
                created_at=alert.created_at,
                current_price=current_price,
                stock_name=quote.get("name")
            ))

    db.commit()

    return AlertCheckResult(
        triggered_alerts=triggered_alerts,
        total_checked=len(alerts)
    )


@router.put("/{alert_id}", response_model=AlertResponse)
def update_alert(
    alert_id: str,
    alert_data: AlertUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update an alert's target price or active status."""
    alert = db.query(PriceAlert).filter(PriceAlert.id == alert_id).first()

    if not alert:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Alert not found"
        )

    if alert.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to update this alert"
        )

    if alert_data.target_price is not None:
        if alert_data.target_price <= 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Target price must be greater than 0"
            )
        alert.target_price = alert_data.target_price

    if alert_data.is_active is not None:
        alert.is_active = alert_data.is_active

    db.commit()
    db.refresh(alert)

    return enrich_alert_with_market_data(alert)


@router.delete("/{alert_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_alert(
    alert_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete an alert."""
    alert = db.query(PriceAlert).filter(PriceAlert.id == alert_id).first()

    if not alert:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Alert not found"
        )

    if alert.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to delete this alert"
        )

    db.delete(alert)
    db.commit()

    return None


@router.post("/{alert_id}/reset", response_model=AlertResponse)
def reset_alert(
    alert_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Reset a triggered alert back to active state."""
    alert = db.query(PriceAlert).filter(PriceAlert.id == alert_id).first()

    if not alert:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Alert not found"
        )

    if alert.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to reset this alert"
        )

    alert.is_triggered = False
    alert.triggered_at = None
    alert.triggered_price = None
    alert.is_active = True

    db.commit()
    db.refresh(alert)

    return enrich_alert_with_market_data(alert)
