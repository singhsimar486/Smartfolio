import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AuthService } from './auth';

/**
 * Interface for a stock holding
 */
export interface Holding {
  id: string;
  user_id: string;
  ticker: string;
  quantity: number;
  avg_cost_basis: number;
  created_at: string;
  updated_at: string;
}

/**
 * Interface for creating a new holding
 */
export interface HoldingCreate {
  ticker: string;
  quantity: number;
  avg_cost_basis: number;
}

/**
 * Interface for portfolio summary
 */
export interface PortfolioSummary {
  total_value: number;
  total_cost: number;
  total_profit_loss: number;
  total_profit_loss_percent: number;
  day_change: number;
  day_change_percent: number;
  holdings_count: number;
  holdings: HoldingWithMarketData[];
}

/**
 * Interface for holding with live market data
 */
export interface HoldingWithMarketData {
  id: string;
  ticker: string;
  name: string;
  quantity: number;
  avg_cost_basis: number;
  current_price: number | null;
  current_value: number | null;
  total_cost: number;
  profit_loss: number | null;
  profit_loss_percent: number | null;
  day_change: number | null;
  day_change_percent: number | null;
}

/**
 * Interface for stock quote
 */
export interface StockQuote {
  ticker: string;
  name: string;
  current_price: number;
  previous_close: number;
  day_change: number;
  day_change_percent: number;
  day_high: number;
  day_low: number;
  volume: number;
  market_cap: number;
  fifty_two_week_high: number;
  fifty_two_week_low: number;
}

/**
 * Interface for sentiment analysis
 */
export interface SentimentAnalysis {
  ticker: string;
  overall_sentiment: string;
  average_polarity: number;
  article_count: number;
  sentiment_breakdown: {
    positive: number;
    negative: number;
    neutral: number;
    positive_percent: number;
    negative_percent: number;
    neutral_percent: number;
  };
  articles: SentimentArticle[];
}

/**
 * Interface for a news article with sentiment
 */
export interface SentimentArticle {
  title: string;
  link: string;
  published: string;
  sentiment: string;
  polarity: number;
}

/**
 * Interface for portfolio sentiment
 */
export interface PortfolioSentiment {
  portfolio_sentiment: string;
  portfolio_average_polarity: number;
  holdings_analyzed: number;
  total_articles_analyzed: number;
  holdings: HoldingSentiment[];
}

/**
 * Interface for individual holding sentiment
 */
export interface HoldingSentiment {
  ticker: string;
  overall_sentiment: string;
  average_polarity: number;
  article_count: number;
  sentiment_breakdown: {
    positive: number;
    negative: number;
    neutral: number;
    positive_percent: number;
    negative_percent: number;
    neutral_percent: number;
  };
  top_articles: SentimentArticle[];
}

@Injectable({
  providedIn: 'root'
})
export class ApiService {

  private apiUrl = 'http://127.0.0.1:8000';

  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) {}

  /**
   * Get headers with auth token
   */
  private getAuthHeaders(): HttpHeaders {
    const token = this.authService.getToken();
    return new HttpHeaders({
      'Authorization': `Bearer ${token}`
    });
  }

  // ============ HOLDINGS ============

  /**
   * Get all holdings for current user
   */
  getHoldings(): Observable<Holding[]> {
    return this.http.get<Holding[]>(
      `${this.apiUrl}/holdings/`,
      { headers: this.getAuthHeaders() }
    );
  }

  /**
   * Create a new holding
   */
  createHolding(holding: HoldingCreate): Observable<Holding> {
    return this.http.post<Holding>(
      `${this.apiUrl}/holdings/`,
      holding,
      { headers: this.getAuthHeaders() }
    );
  }

  /**
   * Update a holding
   */
  updateHolding(id: string, holding: Partial<HoldingCreate>): Observable<Holding> {
    return this.http.put<Holding>(
      `${this.apiUrl}/holdings/${id}`,
      holding,
      { headers: this.getAuthHeaders() }
    );
  }

  /**
   * Delete a holding
   */
  deleteHolding(id: string): Observable<void> {
    return this.http.delete<void>(
      `${this.apiUrl}/holdings/${id}`,
      { headers: this.getAuthHeaders() }
    );
  }

  // ============ PORTFOLIO ============

  /**
   * Get portfolio summary with live market data
   */
  getPortfolioSummary(): Observable<PortfolioSummary> {
    return this.http.get<PortfolioSummary>(
      `${this.apiUrl}/portfolio/summary`,
      { headers: this.getAuthHeaders() }
    );
  }

  /**
   * Get portfolio allocation
   */
  getPortfolioAllocation(): Observable<any> {
    return this.http.get(
      `${this.apiUrl}/portfolio/allocation`,
      { headers: this.getAuthHeaders() }
    );
  }

  // ============ MARKET DATA ============

  /**
   * Get stock quote (public endpoint)
   */
  getStockQuote(ticker: string): Observable<StockQuote> {
    return this.http.get<StockQuote>(
      `${this.apiUrl}/market/quote/${ticker}`
    );
  }

  /**
   * Get stock history (public endpoint)
   */
  getStockHistory(ticker: string, period: string = '1mo'): Observable<any[]> {
    return this.http.get<any[]>(
      `${this.apiUrl}/market/history/${ticker}?period=${period}`
    );
  }

  // ============ SENTIMENT ============

  /**
   * Get sentiment for a single stock (public endpoint)
   */
  getStockSentiment(ticker: string): Observable<SentimentAnalysis> {
    return this.http.get<SentimentAnalysis>(
      `${this.apiUrl}/news/sentiment/${ticker}`
    );
  }

  /**
   * Get sentiment for entire portfolio
   */
  getPortfolioSentiment(): Observable<PortfolioSentiment> {
    return this.http.get<PortfolioSentiment>(
      `${this.apiUrl}/news/portfolio-sentiment`,
      { headers: this.getAuthHeaders() }
    );
  }
}