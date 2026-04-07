"""
Stock Price Prediction Service

This module provides a custom stock price prediction algorithm using an ensemble
of multiple models without requiring additional dependencies (uses numpy/pandas
from yfinance).

DISCLAIMER: Stock predictions are projections based on historical data.
They are NOT financial advice and should not be used for trading decisions.
Past performance does not guarantee future results.
"""

import numpy as np
from typing import Optional
from datetime import datetime, timedelta

from app.services.market_data import get_stock_history


def calculate_linear_regression(prices: np.ndarray) -> tuple[float, float]:
    """
    Calculate linear regression slope and intercept.

    Uses the least squares method to fit a line to the price data.

    Args:
        prices: Array of historical prices

    Returns:
        Tuple of (slope, intercept)
    """
    n = len(prices)
    x = np.arange(n)

    # Calculate means
    x_mean = np.mean(x)
    y_mean = np.mean(prices)

    # Calculate slope using least squares formula
    numerator = np.sum((x - x_mean) * (prices - y_mean))
    denominator = np.sum((x - x_mean) ** 2)

    if denominator == 0:
        return 0.0, y_mean

    slope = numerator / denominator
    intercept = y_mean - slope * x_mean

    return slope, intercept


def calculate_ema(prices: np.ndarray, span: int = 20) -> np.ndarray:
    """
    Calculate Exponential Moving Average.

    EMA gives more weight to recent prices, capturing momentum.

    Args:
        prices: Array of historical prices
        span: EMA period (default 20 days)

    Returns:
        Array of EMA values
    """
    alpha = 2 / (span + 1)
    ema = np.zeros(len(prices))
    ema[0] = prices[0]

    for i in range(1, len(prices)):
        ema[i] = alpha * prices[i] + (1 - alpha) * ema[i - 1]

    return ema


def calculate_volatility(prices: np.ndarray, window: int = 20) -> float:
    """
    Calculate historical volatility using standard deviation of returns.

    Args:
        prices: Array of historical prices
        window: Rolling window for calculation

    Returns:
        Annualized volatility as a decimal
    """
    if len(prices) < 2:
        return 0.05  # Default 5% volatility

    # Calculate daily returns
    returns = np.diff(prices) / prices[:-1]

    # Use recent returns for volatility
    recent_returns = returns[-min(window, len(returns)):]

    # Standard deviation of returns (daily)
    daily_vol = np.std(recent_returns)

    # Annualize (252 trading days)
    annual_vol = daily_vol * np.sqrt(252)

    return max(annual_vol, 0.01)  # Minimum 1% volatility


def calculate_rsi(prices: np.ndarray, period: int = 14) -> float:
    """
    Calculate Relative Strength Index.

    RSI measures momentum and identifies overbought/oversold conditions.

    Args:
        prices: Array of historical prices
        period: RSI period (default 14 days)

    Returns:
        RSI value (0-100)
    """
    if len(prices) < period + 1:
        return 50.0  # Neutral

    deltas = np.diff(prices)
    gains = np.where(deltas > 0, deltas, 0)
    losses = np.where(deltas < 0, -deltas, 0)

    # Calculate average gains and losses
    avg_gain = np.mean(gains[-period:])
    avg_loss = np.mean(losses[-period:])

    if avg_loss == 0:
        return 100.0

    rs = avg_gain / avg_loss
    rsi = 100 - (100 / (1 + rs))

    return rsi


def predict_prices(
    ticker: str,
    days_ahead: int = 30,
    history_period: str = "6mo"
) -> Optional[dict]:
    """
    Generate stock price predictions using ensemble of models.

    This algorithm combines:
    1. Linear Regression - Captures overall trend
    2. Exponential Moving Average - Captures momentum
    3. Mean Reversion - Adjusts for extreme moves
    4. Volatility-based confidence bands

    Args:
        ticker: Stock symbol
        days_ahead: Number of days to predict (default 30)
        history_period: Historical data period for analysis

    Returns:
        Dictionary with predictions and confidence bands
    """
    # Fetch historical data
    history = get_stock_history(ticker.upper(), history_period)

    if not history or len(history) < 30:
        return None

    # Extract closing prices
    prices = np.array([day["close"] for day in history])
    dates = [day["date"] for day in history]

    n = len(prices)
    current_price = prices[-1]

    # === Model 1: Linear Regression (Trend) ===
    slope, intercept = calculate_linear_regression(prices)

    # Project trend forward
    trend_predictions = []
    for i in range(days_ahead):
        pred = intercept + slope * (n + i)
        trend_predictions.append(pred)

    # === Model 2: Exponential Moving Average (Momentum) ===
    ema_20 = calculate_ema(prices, span=20)
    ema_50 = calculate_ema(prices, span=min(50, n))

    # EMA momentum factor
    ema_momentum = (ema_20[-1] - ema_50[-1]) / ema_50[-1] if ema_50[-1] != 0 else 0

    # Project momentum forward (decaying)
    momentum_predictions = []
    for i in range(days_ahead):
        # Momentum decays over time
        decay = np.exp(-0.03 * i)  # 3% daily decay
        momentum_effect = current_price * ema_momentum * decay
        momentum_predictions.append(current_price + momentum_effect * (i + 1) / days_ahead)

    # === Model 3: Mean Reversion ===
    mean_price = np.mean(prices[-60:]) if n >= 60 else np.mean(prices)
    deviation = (current_price - mean_price) / mean_price

    # RSI-based reversion strength
    rsi = calculate_rsi(prices)

    # Stronger reversion if RSI is extreme
    if rsi > 70:
        reversion_strength = 0.3  # Overbought - stronger pull down
    elif rsi < 30:
        reversion_strength = 0.3  # Oversold - stronger pull up
    else:
        reversion_strength = 0.1  # Normal - mild reversion

    reversion_predictions = []
    for i in range(days_ahead):
        # Gradually revert toward mean
        reversion = deviation * (1 - reversion_strength * (i + 1) / days_ahead)
        pred = mean_price * (1 + reversion)
        reversion_predictions.append(pred)

    # === Ensemble Combination ===
    # Weights based on market conditions
    trend_weight = 0.4
    momentum_weight = 0.35
    reversion_weight = 0.25

    # Adjust weights based on trend strength
    trend_strength = abs(slope * n / current_price)
    if trend_strength > 0.2:  # Strong trend
        trend_weight = 0.5
        momentum_weight = 0.35
        reversion_weight = 0.15

    # Combine predictions
    final_predictions = []
    for i in range(days_ahead):
        pred = (
            trend_weight * trend_predictions[i] +
            momentum_weight * momentum_predictions[i] +
            reversion_weight * reversion_predictions[i]
        )
        # Ensure positive price
        final_predictions.append(max(pred, current_price * 0.5))

    # === Confidence Bands ===
    volatility = calculate_volatility(prices)

    upper_band = []
    lower_band = []

    for i, pred in enumerate(final_predictions):
        # Confidence widens over time (square root of time)
        time_factor = np.sqrt((i + 1) / 252)  # Annualized
        confidence_width = pred * volatility * time_factor * 1.96  # 95% CI

        upper_band.append(round(pred + confidence_width, 2))
        lower_band.append(round(max(pred - confidence_width, 0.01), 2))

    # Round final predictions
    final_predictions = [round(p, 2) for p in final_predictions]

    # Generate future dates
    last_date = datetime.strptime(dates[-1], "%Y-%m-%d")
    prediction_dates = []

    business_days_added = 0
    current_date = last_date
    while business_days_added < days_ahead:
        current_date += timedelta(days=1)
        # Skip weekends
        if current_date.weekday() < 5:
            prediction_dates.append(current_date.strftime("%Y-%m-%d"))
            business_days_added += 1

    # Calculate prediction confidence score (0-100)
    # Based on R-squared of linear regression
    y_pred_hist = intercept + slope * np.arange(n)
    ss_res = np.sum((prices - y_pred_hist) ** 2)
    ss_tot = np.sum((prices - np.mean(prices)) ** 2)
    r_squared = 1 - (ss_res / ss_tot) if ss_tot != 0 else 0

    confidence_score = min(max(r_squared * 100, 20), 80)  # Clamp between 20-80%

    # Predicted change
    predicted_change = final_predictions[-1] - current_price
    predicted_change_percent = (predicted_change / current_price) * 100

    return {
        "ticker": ticker.upper(),
        "current_price": round(current_price, 2),
        "predictions": [
            {
                "date": prediction_dates[i],
                "predicted_price": final_predictions[i],
                "upper_bound": upper_band[i],
                "lower_bound": lower_band[i]
            }
            for i in range(days_ahead)
        ],
        "summary": {
            "days_ahead": days_ahead,
            "final_predicted_price": final_predictions[-1],
            "predicted_change": round(predicted_change, 2),
            "predicted_change_percent": round(predicted_change_percent, 2),
            "confidence_score": round(confidence_score, 1),
            "volatility": round(volatility * 100, 2),
            "rsi": round(rsi, 1),
            "trend_direction": "bullish" if slope > 0 else "bearish"
        },
        "disclaimer": (
            "This prediction is a mathematical projection based on historical data. "
            "It is NOT financial advice. Stock prices are inherently unpredictable "
            "and past performance does not guarantee future results. "
            "Always do your own research before making investment decisions."
        )
    }
