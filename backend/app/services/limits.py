"""
Subscription limits service.

Checks and enforces usage limits based on user's subscription tier.
"""

from datetime import datetime, date
from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.models.user import User
from app.models.holding import Holding
from app.models.alert import PriceAlert


# Define limits for each tier
TIER_LIMITS = {
    "free": {
        "max_holdings": 10,
        "max_alerts": 1,
        "max_lookups_per_day": 5,
        "ai_insights": False,
        "predictions": False,
        "gains_tracking": False,
        "email_notifications": False,
        "csv_export": False,
    },
    "pro": {
        "max_holdings": None,  # Unlimited
        "max_alerts": None,  # Unlimited
        "max_lookups_per_day": None,  # Unlimited
        "ai_insights": True,
        "predictions": True,
        "predictions_days": 30,
        "gains_tracking": True,
        "email_notifications": True,
        "csv_export": True,
    },
    "pro_plus": {
        "max_holdings": None,
        "max_alerts": None,
        "max_lookups_per_day": None,
        "ai_insights": True,
        "predictions": True,
        "predictions_days": 90,
        "gains_tracking": True,
        "email_notifications": True,
        "csv_export": True,
        "api_access": True,
        "multiple_portfolios": True,
    }
}


def get_user_limits(user: User) -> dict:
    """Get limits for a user based on their subscription tier."""
    tier = user.subscription_tier or "free"

    # Check if subscription is active
    if tier != "free":
        if user.subscription_status not in ["active", "trialing"]:
            tier = "free"
        elif user.subscription_ends_at and user.subscription_ends_at < datetime.utcnow():
            tier = "free"

    return TIER_LIMITS.get(tier, TIER_LIMITS["free"])


def check_holdings_limit(user: User, db: Session) -> None:
    """Check if user can add more holdings."""
    limits = get_user_limits(user)
    max_holdings = limits.get("max_holdings")

    if max_holdings is not None:
        current_count = db.query(func.count(Holding.id)).filter(
            Holding.user_id == user.id
        ).scalar()

        if current_count >= max_holdings:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Free tier is limited to {max_holdings} holdings. Upgrade to Pro for unlimited holdings."
            )


def check_alerts_limit(user: User, db: Session) -> None:
    """Check if user can add more alerts."""
    limits = get_user_limits(user)
    max_alerts = limits.get("max_alerts")

    if max_alerts is not None:
        current_count = db.query(func.count(PriceAlert.id)).filter(
            PriceAlert.user_id == user.id,
            PriceAlert.is_active == True
        ).scalar()

        if current_count >= max_alerts:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Free tier is limited to {max_alerts} active alert. Upgrade to Pro for unlimited alerts."
            )


def check_feature_access(user: User, feature: str) -> None:
    """Check if user has access to a specific feature."""
    limits = get_user_limits(user)

    feature_map = {
        "ai_insights": "AI Insights",
        "predictions": "Price Predictions",
        "gains_tracking": "Gains Tracking",
        "email_notifications": "Email Notifications",
        "csv_export": "CSV Export",
        "api_access": "API Access",
        "multiple_portfolios": "Multiple Portfolios"
    }

    if not limits.get(feature, False):
        feature_name = feature_map.get(feature, feature)
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"{feature_name} is a Pro feature. Upgrade to access this feature."
        )


def get_prediction_days(user: User) -> int:
    """Get number of prediction days allowed for user."""
    limits = get_user_limits(user)
    return limits.get("predictions_days", 30)


def get_usage_summary(user: User, db: Session) -> dict:
    """Get usage summary for user."""
    limits = get_user_limits(user)
    tier = user.subscription_tier or "free"

    holdings_count = db.query(func.count(Holding.id)).filter(
        Holding.user_id == user.id
    ).scalar()

    alerts_count = db.query(func.count(PriceAlert.id)).filter(
        PriceAlert.user_id == user.id,
        PriceAlert.is_active == True
    ).scalar()

    return {
        "tier": tier,
        "holdings": {
            "used": holdings_count,
            "limit": limits.get("max_holdings"),
            "unlimited": limits.get("max_holdings") is None
        },
        "alerts": {
            "used": alerts_count,
            "limit": limits.get("max_alerts"),
            "unlimited": limits.get("max_alerts") is None
        },
        "features": {
            "ai_insights": limits.get("ai_insights", False),
            "predictions": limits.get("predictions", False),
            "gains_tracking": limits.get("gains_tracking", False),
            "email_notifications": limits.get("email_notifications", False),
            "csv_export": limits.get("csv_export", False),
        }
    }
