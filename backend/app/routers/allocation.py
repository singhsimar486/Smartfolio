from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import User
from app.models.holding import Holding
from app.schemas.allocation import AllocationResponse, SectorAllocation, HoldingAllocation
from app.services.auth import get_current_user
from app.services.market_data import get_stock_quote


router = APIRouter(prefix="/allocation", tags=["Allocation"])


# Recommended sector allocations for a balanced portfolio
BALANCED_ALLOCATION = {
    "Technology": 25,
    "Healthcare": 15,
    "Financial Services": 15,
    "Consumer Cyclical": 10,
    "Communication Services": 10,
    "Industrials": 10,
    "Consumer Defensive": 5,
    "Energy": 5,
    "Utilities": 3,
    "Real Estate": 2
}


def generate_recommendations(by_sector: list[SectorAllocation], total_value: float) -> list[str]:
    """Generate rebalancing recommendations based on allocation."""
    recommendations = []

    if not by_sector or total_value == 0:
        return ["Add holdings to see allocation recommendations"]

    sector_pcts = {s.sector: s.percentage for s in by_sector}

    # Check for over-concentration
    for sector in by_sector:
        if sector.percentage > 40:
            recommendations.append(
                f"⚠️ High concentration in {sector.sector} ({sector.percentage:.1f}%). Consider diversifying."
            )
        elif sector.percentage > 30:
            recommendations.append(
                f"📊 {sector.sector} is {sector.percentage:.1f}% of your portfolio. Monitor for over-exposure."
            )

    # Check for missing sectors
    present_sectors = set(sector_pcts.keys())
    recommended_sectors = {"Technology", "Healthcare", "Financial Services", "Consumer Cyclical"}
    missing = recommended_sectors - present_sectors
    if missing:
        recommendations.append(
            f"💡 Consider adding exposure to: {', '.join(missing)}"
        )

    # Check for under-diversification
    if len(by_sector) < 3:
        recommendations.append(
            "📈 Your portfolio has limited sector diversification. Consider adding 2-3 more sectors."
        )

    # Check single holding concentration
    # (handled separately in holdings section if needed)

    if not recommendations:
        recommendations.append("✅ Your portfolio appears well-diversified across sectors.")

    return recommendations


@router.get("/", response_model=AllocationResponse)
def get_allocation(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get portfolio allocation by sector and holding."""
    holdings = db.query(Holding).filter(Holding.user_id == current_user.id).all()

    if not holdings:
        return AllocationResponse(
            total_value=0,
            by_sector=[],
            by_holding=[],
            recommendations=["Add holdings to see allocation analysis"]
        )

    # Calculate values and gather sector data
    holding_data = []
    sector_data = {}
    total_value = 0

    for holding in holdings:
        quote = get_stock_quote(holding.ticker)
        if not quote:
            continue

        current_price = quote.get("current_price", 0)
        value = holding.quantity * current_price
        sector = quote.get("sector", "Unknown")
        name = quote.get("name", holding.ticker)

        total_value += value

        holding_data.append({
            "ticker": holding.ticker,
            "name": name,
            "value": value,
            "sector": sector
        })

        if sector not in sector_data:
            sector_data[sector] = {
                "value": 0,
                "holdings_count": 0,
                "tickers": []
            }
        sector_data[sector]["value"] += value
        sector_data[sector]["holdings_count"] += 1
        sector_data[sector]["tickers"].append(holding.ticker)

    # Build sector allocations
    by_sector = []
    for sector, data in sorted(sector_data.items(), key=lambda x: x[1]["value"], reverse=True):
        pct = (data["value"] / total_value * 100) if total_value > 0 else 0
        by_sector.append(SectorAllocation(
            sector=sector,
            value=data["value"],
            percentage=pct,
            holdings_count=data["holdings_count"],
            tickers=data["tickers"]
        ))

    # Build holding allocations
    by_holding = []
    for h in sorted(holding_data, key=lambda x: x["value"], reverse=True):
        pct = (h["value"] / total_value * 100) if total_value > 0 else 0
        by_holding.append(HoldingAllocation(
            ticker=h["ticker"],
            name=h["name"],
            value=h["value"],
            percentage=pct,
            sector=h["sector"]
        ))

    recommendations = generate_recommendations(by_sector, total_value)

    return AllocationResponse(
        total_value=total_value,
        by_sector=by_sector,
        by_holding=by_holding,
        recommendations=recommendations
    )


@router.get("/sectors")
def get_sector_breakdown(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get detailed sector breakdown for charts."""
    holdings = db.query(Holding).filter(Holding.user_id == current_user.id).all()

    sectors = {}
    total_value = 0

    for holding in holdings:
        quote = get_stock_quote(holding.ticker)
        if not quote:
            continue

        current_price = quote.get("current_price", 0)
        value = holding.quantity * current_price
        sector = quote.get("sector", "Unknown")

        total_value += value

        if sector not in sectors:
            sectors[sector] = 0
        sectors[sector] += value

    # Convert to chart-friendly format
    chart_data = [
        {
            "name": sector,
            "value": round(value, 2),
            "percentage": round(value / total_value * 100, 2) if total_value > 0 else 0
        }
        for sector, value in sorted(sectors.items(), key=lambda x: x[1], reverse=True)
    ]

    return {
        "total_value": total_value,
        "sectors": chart_data
    }
