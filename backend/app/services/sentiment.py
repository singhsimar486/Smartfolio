import feedparser
from textblob import TextBlob
from typing import Optional


import feedparser
from textblob import TextBlob
from typing import Optional
import urllib.request


def fetch_news(ticker: str, limit: int = 10) -> list[dict]:
    """
    Fetch recent news headlines for a stock from Yahoo Finance RSS.
    
    How this works:
    1. Yahoo Finance provides RSS feeds for each stock
    2. We fetch the feed for the given ticker
    3. feedparser converts the RSS XML into Python objects
    4. We extract the title, link, and publication date
    
    Args:
        ticker: Stock symbol (e.g., "AAPL", "GOOGL")
        limit: Maximum number of articles to return (default 10)
    
    Returns:
        List of dictionaries with title, link, and published date
    """
    
    # Yahoo Finance RSS URL for a specific stock
    url = f"https://feeds.finance.yahoo.com/rss/2.0/headline?s={ticker}&region=US&lang=en-US"
    
    try:
        # Some sites block requests without a User-Agent header
        request = urllib.request.Request(
            url,
            headers={'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)'}
        )
        response = urllib.request.urlopen(request, timeout=10)
        feed_content = response.read()
        
        # Parse the RSS feed
        feed = feedparser.parse(feed_content)
        
        articles = []
        for entry in feed.entries[:limit]:
            articles.append({
                "title": entry.title,
                "link": entry.link,
                "published": entry.get("published", "Unknown")
            })
        
        return articles
        
    except Exception as e:
        print(f"Error fetching news for {ticker}: {e}")
        return []


def analyze_sentiment(text: str) -> dict:
    """
    Analyze the sentiment of a piece of text using TextBlob.
    
    How TextBlob sentiment works:
    1. It breaks the text into words (tokenization)
    2. Each word has a pre-calculated sentiment score from training data
    3. Words like "great", "surge", "profit" are positive
    4. Words like "crash", "loss", "terrible" are negative
    5. The scores are combined into an overall polarity
    
    Polarity ranges from -1 (very negative) to +1 (very positive)
    Subjectivity ranges from 0 (factual) to 1 (opinion-based)
    
    Args:
        text: The text to analyze (headline or article)
    
    Returns:
        Dictionary with polarity, subjectivity, and classification
    """
    
    # Create a TextBlob object from the text
    blob = TextBlob(text)
    
    # Get sentiment scores
    polarity = blob.sentiment.polarity        # -1 to 1
    subjectivity = blob.sentiment.subjectivity # 0 to 1
    
    # Classify based on polarity thresholds
    if polarity > 0.1:
        classification = "positive"
    elif polarity < -0.1:
        classification = "negative"
    else:
        classification = "neutral"
    
    return {
        "polarity": round(polarity, 3),
        "subjectivity": round(subjectivity, 3),
        "classification": classification
    }


def get_stock_sentiment(ticker: str, limit: int = 10) -> Optional[dict]:
    """
    Get news and sentiment analysis for a stock.
    
    This is the main function that ties everything together:
    1. Fetch recent news headlines for the ticker
    2. Analyze sentiment of each headline
    3. Calculate aggregate sentiment statistics
    4. Return everything in a structured format
    
    Args:
        ticker: Stock symbol (e.g., "AAPL")
        limit: Number of articles to analyze
    
    Returns:
        Dictionary with articles, sentiments, and aggregate stats
    """
    
    # Fetch news articles
    articles = fetch_news(ticker.upper(), limit)
    
    if not articles:
        return None
    
    # Analyze each article
    analyzed_articles = []
    total_polarity = 0
    sentiment_counts = {"positive": 0, "negative": 0, "neutral": 0}
    
    for article in articles:
        # Get sentiment for this headline
        sentiment = analyze_sentiment(article["title"])
        
        # Add to running totals
        total_polarity += sentiment["polarity"]
        sentiment_counts[sentiment["classification"]] += 1
        
        # Store article with its sentiment
        analyzed_articles.append({
            "title": article["title"],
            "link": article["link"],
            "published": article["published"],
            "sentiment": sentiment["classification"],
            "polarity": sentiment["polarity"]
        })
    
    # Calculate aggregate statistics
    num_articles = len(analyzed_articles)
    average_polarity = total_polarity / num_articles if num_articles > 0 else 0
    
    # Determine overall sentiment
    if average_polarity > 0.1:
        overall_sentiment = "positive"
    elif average_polarity < -0.1:
        overall_sentiment = "negative"
    else:
        overall_sentiment = "neutral"
    
    # Calculate percentages
    positive_percent = (sentiment_counts["positive"] / num_articles) * 100 if num_articles > 0 else 0
    negative_percent = (sentiment_counts["negative"] / num_articles) * 100 if num_articles > 0 else 0
    neutral_percent = (sentiment_counts["neutral"] / num_articles) * 100 if num_articles > 0 else 0
    
    return {
        "ticker": ticker.upper(),
        "overall_sentiment": overall_sentiment,
        "average_polarity": round(average_polarity, 3),
        "article_count": num_articles,
        "sentiment_breakdown": {
            "positive": sentiment_counts["positive"],
            "negative": sentiment_counts["negative"],
            "neutral": sentiment_counts["neutral"],
            "positive_percent": round(positive_percent, 1),
            "negative_percent": round(negative_percent, 1),
            "neutral_percent": round(neutral_percent, 1)
        },
        "articles": analyzed_articles
    }