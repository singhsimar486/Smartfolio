from fastapi import APIRouter, HTTPException, status, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import User, Holding
from app.services.auth import get_current_user
from app.services.sentiment import get_stock_sentiment


router = APIRouter(prefix="/news", tags=["News & Sentiment"])


@router.get("/sentiment/{ticker}")
def get_sentiment(ticker: str):
    """
    Get news sentiment analysis for a single stock.
    
    This endpoint:
    1. Fetches recent news from Yahoo Finance RSS
    2. Analyzes sentiment of each headline using TextBlob
    3. Calculates aggregate sentiment statistics
    4. Returns articles with sentiment scores
    
    This is a public endpoint — anyone can check sentiment for any stock.
    
    Args:
        ticker: Stock symbol (e.g., "AAPL", "GOOGL", "TSLA")
    
    Returns:
        Sentiment analysis with overall score and per-article breakdown
    """
    
    result = get_stock_sentiment(ticker.upper())
    
    if not result:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Could not fetch news for ticker '{ticker.upper()}'"
        )
    
    return result


@router.get("/portfolio-sentiment")
def get_portfolio_sentiment(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get news sentiment for all stocks in user's portfolio.
    
    This endpoint:
    1. Gets all holdings for the logged-in user
    2. Fetches and analyzes sentiment for each stock
    3. Returns combined sentiment data for the entire portfolio
    
    This is a protected endpoint — requires authentication.
    
    Returns:
        Sentiment analysis for each holding plus portfolio-wide summary
    """
    
    # Get user's holdings
    holdings = db.query(Holding).filter(Holding.user_id == current_user.id).all()
    
    if not holdings:
        return {
            "portfolio_sentiment": "neutral",
            "holdings_analyzed": 0,
            "holdings": []
        }
    
    # Analyze sentiment for each holding
    holdings_sentiment = []
    total_polarity = 0
    total_articles = 0
    
    for holding in holdings:
        sentiment_data = get_stock_sentiment(holding.ticker, limit=5)  # 5 articles per stock
        
        if sentiment_data:
            holdings_sentiment.append({
                "ticker": holding.ticker,
                "overall_sentiment": sentiment_data["overall_sentiment"],
                "average_polarity": sentiment_data["average_polarity"],
                "article_count": sentiment_data["article_count"],
                "sentiment_breakdown": sentiment_data["sentiment_breakdown"],
                "top_articles": sentiment_data["articles"][:3]  # Top 3 articles only
            })
            
            total_polarity += sentiment_data["average_polarity"]
            total_articles += sentiment_data["article_count"]
    
    # Calculate portfolio-wide sentiment
    num_holdings = len(holdings_sentiment)
    portfolio_avg_polarity = total_polarity / num_holdings if num_holdings > 0 else 0
    
    if portfolio_avg_polarity > 0.1:
        portfolio_sentiment = "positive"
    elif portfolio_avg_polarity < -0.1:
        portfolio_sentiment = "negative"
    else:
        portfolio_sentiment = "neutral"
    
    return {
        "portfolio_sentiment": portfolio_sentiment,
        "portfolio_average_polarity": round(portfolio_avg_polarity, 3),
        "holdings_analyzed": num_holdings,
        "total_articles_analyzed": total_articles,
        "holdings": holdings_sentiment
    }