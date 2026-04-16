from pydantic import BaseModel
from typing import Optional


class SectorAllocation(BaseModel):
    sector: str
    value: float
    percentage: float
    holdings_count: int
    tickers: list[str]


class HoldingAllocation(BaseModel):
    ticker: str
    name: str
    value: float
    percentage: float
    sector: Optional[str]


class AllocationResponse(BaseModel):
    total_value: float
    by_sector: list[SectorAllocation]
    by_holding: list[HoldingAllocation]
    recommendations: list[str]


class RebalanceRecommendation(BaseModel):
    ticker: str
    current_percent: float
    target_percent: float
    action: str  # "BUY" or "SELL"
    amount: float
    reason: str
