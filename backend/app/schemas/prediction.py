from pydantic import BaseModel
from typing import List


class PredictionPoint(BaseModel):
    """Single prediction data point"""
    date: str
    predicted_price: float
    upper_bound: float
    lower_bound: float


class PredictionSummary(BaseModel):
    """Summary of prediction metrics"""
    days_ahead: int
    final_predicted_price: float
    predicted_change: float
    predicted_change_percent: float
    confidence_score: float
    volatility: float
    rsi: float
    trend_direction: str


class PredictionResponse(BaseModel):
    """Complete prediction response"""
    ticker: str
    current_price: float
    predictions: List[PredictionPoint]
    summary: PredictionSummary
    disclaimer: str
