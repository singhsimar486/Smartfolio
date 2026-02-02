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

/**
 * Interface for watchlist item
 */
export interface WatchlistItem {
  id: string;
  ticker: string;
  name: string;
  current_price: number | null;
  day_change: number | null;
  day_change_percent: number | null;
  created_at: string;
}

/**
 * Interface for creating a watchlist item
 */
export interface WatchlistCreate {
  ticker: string;
}

/**
 * Interface for a price alert
 */
export interface PriceAlert {
  id: string;
  ticker: string;
  condition: string;
  target_price: number;
  is_active: boolean;
  is_triggered: boolean;
  triggered_at: string | null;
  triggered_price: number | null;
  created_at: string;
  current_price: number | null;
  stock_name: string | null;
}

/**
 * Interface for creating a price alert
 */
export interface AlertCreate {
  ticker: string;
  condition: string;
  target_price: number;
}

/**
 * Interface for updating a price alert
 */
export interface AlertUpdate {
  target_price?: number;
  is_active?: boolean;
}

/**
 * Interface for alert check result
 */
export interface AlertCheckResult {
  triggered_alerts: PriceAlert[];
  total_checked: number;
}

/**
 * Interface for AI insight
 */
export interface AIInsight {
  id: string;
  type: 'success' | 'warning' | 'alert' | 'info';
  title: string;
  message: string;
  action: string | null;
  is_dismissed: boolean;
  created_at: string;
}

/**
 * Interface for insights overview
 */
export interface InsightsOverview {
  insights: AIInsight[];
  has_new_digest: boolean;
  digest_summary: string | null;
}

/**
 * Interface for chat message
 */
export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
}

/**
 * Interface for chat response
 */
export interface ChatResponse {
  response: string;
  message_id: string;
}

/**
 * Interface for weekly digest
 */
export interface WeeklyDigest {
  id: string;
  summary: string;
  health_score: number;
  health_label: string;
  highlights: string[];
  recommendations: string[];
  outlook: string;
  portfolio_value: number;
  weekly_change: number;
  weekly_change_pct: number;
  week_start: string;
  week_end: string;
  generated_at: string;
}

/**
 * Interface for portfolio goal
 */
export interface PortfolioGoal {
  id: string;
  name: string;
  target_amount: number;
  target_date: string | null;
  description: string | null;
  created_at: string;
  current_amount: number;
  progress_percent: number;
  amount_remaining: number;
  days_remaining: number | null;
  on_track: boolean;
}

/**
 * Interface for creating a goal
 */
export interface GoalCreate {
  name: string;
  target_amount: number;
  target_date?: string;
  description?: string;
}

/**
 * Interface for dividend record
 */
export interface DividendRecord {
  id: string;
  ticker: string;
  amount: number;
  shares: number;
  per_share: number;
  payment_date: string;
  created_at: string;
  stock_name: string | null;
}

/**
 * Interface for dividend summary
 */
export interface DividendSummary {
  total_dividends: number;
  total_this_year: number;
  total_this_month: number;
  by_ticker: { ticker: string; name: string; total: number }[];
  recent_dividends: DividendRecord[];
}

/**
 * Interface for creating a dividend
 */
export interface DividendCreate {
  ticker: string;
  amount: number;
  shares: number;
  per_share: number;
  payment_date: string;
}

/**
 * Interface for stock comparison data
 */
export interface StockCompareData {
  ticker: string;
  name: string;
  current_price: number;
  day_change: number | null;
  day_change_percent: number | null;
  market_cap: number | null;
  volume: number | null;
  fifty_two_week_high: number | null;
  fifty_two_week_low: number | null;
  history: { date: string; close: number }[];
}

/**
 * Interface for password change
 */
export interface PasswordChange {
  current_password: string;
  new_password: string;
}

/**
 * Interface for portfolio performance data point
 */
export interface PerformanceDataPoint {
  date: string;
  value: number;
}

/**
 * Interface for portfolio performance response
 */
export interface PortfolioPerformance {
  period: string;
  data: PerformanceDataPoint[];
  total_cost: number;
  start_value: number;
  end_value: number;
  total_return: number;
  total_return_percent: number;
  period_return: number;
  period_return_percent: number;
}

/**
 * Interface for ticker search result
 */
export interface TickerSearchResult {
  symbol: string;
  name: string;
  exchange: string;
  type: string;
}

/**
 * Interface for ticker search response
 */
export interface TickerSearchResponse {
  results: TickerSearchResult[];
}

/**
 * Interface for CSV import preview item
 */
export interface HoldingImportItem {
  ticker: string;
  quantity: number;
  avg_cost_basis: number;
  status: 'new' | 'update' | 'skip';
  message: string | null;
}

/**
 * Interface for CSV import preview response
 */
export interface HoldingImportPreview {
  holdings: HoldingImportItem[];
  errors: string[];
  total_new: number;
  total_update: number;
  total_skip: number;
}

/**
 * Interface for CSV import result
 */
export interface HoldingImportResult {
  imported: number;
  updated: number;
  skipped: number;
  errors: string[];
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

  /**
   * Preview CSV import
   */
  previewImport(file: File): Observable<HoldingImportPreview> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<HoldingImportPreview>(
      `${this.apiUrl}/holdings/import/preview`,
      formData,
      { headers: this.getAuthHeaders() }
    );
  }

  /**
   * Import holdings from CSV
   */
  importHoldings(file: File): Observable<HoldingImportResult> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<HoldingImportResult>(
      `${this.apiUrl}/holdings/import`,
      formData,
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

  /**
   * Get portfolio performance over time
   */
  getPortfolioPerformance(period: string = '1mo'): Observable<PortfolioPerformance> {
    return this.http.get<PortfolioPerformance>(
      `${this.apiUrl}/portfolio/performance?period=${period}`,
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

  /**
   * Search for tickers by query (public endpoint)
   */
  searchTickers(query: string, limit: number = 10): Observable<TickerSearchResponse> {
    return this.http.get<TickerSearchResponse>(
      `${this.apiUrl}/market/search?q=${encodeURIComponent(query)}&limit=${limit}`
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

  // ============ WATCHLIST ============

  /**
   * Get user's watchlist with market data
   */
  getWatchlist(): Observable<WatchlistItem[]> {
    return this.http.get<WatchlistItem[]>(
      `${this.apiUrl}/watchlist/`,
      { headers: this.getAuthHeaders() }
    );
  }

  /**
   * Add a stock to the watchlist
   */
  addToWatchlist(ticker: string): Observable<WatchlistItem> {
    return this.http.post<WatchlistItem>(
      `${this.apiUrl}/watchlist/`,
      { ticker },
      { headers: this.getAuthHeaders() }
    );
  }

  /**
   * Remove a stock from the watchlist
   */
  removeFromWatchlist(id: string): Observable<void> {
    return this.http.delete<void>(
      `${this.apiUrl}/watchlist/${id}`,
      { headers: this.getAuthHeaders() }
    );
  }

  // ============ ALERTS ============

  /**
   * Get all price alerts for current user
   */
  getAlerts(): Observable<PriceAlert[]> {
    return this.http.get<PriceAlert[]>(
      `${this.apiUrl}/alerts/`,
      { headers: this.getAuthHeaders() }
    );
  }

  /**
   * Create a new price alert
   */
  createAlert(alert: AlertCreate): Observable<PriceAlert> {
    return this.http.post<PriceAlert>(
      `${this.apiUrl}/alerts/`,
      alert,
      { headers: this.getAuthHeaders() }
    );
  }

  /**
   * Update a price alert
   */
  updateAlert(id: string, data: AlertUpdate): Observable<PriceAlert> {
    return this.http.put<PriceAlert>(
      `${this.apiUrl}/alerts/${id}`,
      data,
      { headers: this.getAuthHeaders() }
    );
  }

  /**
   * Delete a price alert
   */
  deleteAlert(id: string): Observable<void> {
    return this.http.delete<void>(
      `${this.apiUrl}/alerts/${id}`,
      { headers: this.getAuthHeaders() }
    );
  }

  /**
   * Check alerts and return triggered ones
   */
  checkAlerts(): Observable<AlertCheckResult> {
    return this.http.get<AlertCheckResult>(
      `${this.apiUrl}/alerts/check`,
      { headers: this.getAuthHeaders() }
    );
  }

  /**
   * Reset a triggered alert back to active
   */
  resetAlert(id: string): Observable<PriceAlert> {
    return this.http.post<PriceAlert>(
      `${this.apiUrl}/alerts/${id}/reset`,
      {},
      { headers: this.getAuthHeaders() }
    );
  }

  // ============ AI INSIGHTS ============

  /**
   * Get AI-generated insights for the portfolio
   */
  getInsights(): Observable<InsightsOverview> {
    return this.http.get<InsightsOverview>(
      `${this.apiUrl}/insights/`,
      { headers: this.getAuthHeaders() }
    );
  }

  /**
   * Ask the AI a question about the portfolio
   */
  askAI(message: string): Observable<ChatResponse> {
    return this.http.post<ChatResponse>(
      `${this.apiUrl}/insights/ask`,
      { message },
      { headers: this.getAuthHeaders() }
    );
  }

  /**
   * Get chat history with the AI
   */
  getChatHistory(limit: number = 50): Observable<ChatMessage[]> {
    return this.http.get<ChatMessage[]>(
      `${this.apiUrl}/insights/chat/history?limit=${limit}`,
      { headers: this.getAuthHeaders() }
    );
  }

  /**
   * Clear chat history
   */
  clearChatHistory(): Observable<void> {
    return this.http.delete<void>(
      `${this.apiUrl}/insights/chat/history`,
      { headers: this.getAuthHeaders() }
    );
  }

  /**
   * Get weekly portfolio digest
   */
  getWeeklyDigest(): Observable<WeeklyDigest> {
    return this.http.get<WeeklyDigest>(
      `${this.apiUrl}/insights/digest`,
      { headers: this.getAuthHeaders() }
    );
  }

  /**
   * Refresh weekly digest
   */
  refreshWeeklyDigest(): Observable<WeeklyDigest> {
    return this.http.post<WeeklyDigest>(
      `${this.apiUrl}/insights/digest/refresh`,
      {},
      { headers: this.getAuthHeaders() }
    );
  }

  // ============ GOALS ============

  /**
   * Get all portfolio goals
   */
  getGoals(): Observable<PortfolioGoal[]> {
    return this.http.get<PortfolioGoal[]>(
      `${this.apiUrl}/goals/`,
      { headers: this.getAuthHeaders() }
    );
  }

  /**
   * Create a new goal
   */
  createGoal(goal: GoalCreate): Observable<PortfolioGoal> {
    return this.http.post<PortfolioGoal>(
      `${this.apiUrl}/goals/`,
      goal,
      { headers: this.getAuthHeaders() }
    );
  }

  /**
   * Update a goal
   */
  updateGoal(id: string, goal: Partial<GoalCreate>): Observable<PortfolioGoal> {
    return this.http.put<PortfolioGoal>(
      `${this.apiUrl}/goals/${id}`,
      goal,
      { headers: this.getAuthHeaders() }
    );
  }

  /**
   * Delete a goal
   */
  deleteGoal(id: string): Observable<void> {
    return this.http.delete<void>(
      `${this.apiUrl}/goals/${id}`,
      { headers: this.getAuthHeaders() }
    );
  }

  // ============ DIVIDENDS ============

  /**
   * Get dividend summary
   */
  getDividendSummary(): Observable<DividendSummary> {
    return this.http.get<DividendSummary>(
      `${this.apiUrl}/dividends/summary`,
      { headers: this.getAuthHeaders() }
    );
  }

  /**
   * Get all dividends
   */
  getDividends(): Observable<DividendRecord[]> {
    return this.http.get<DividendRecord[]>(
      `${this.apiUrl}/dividends/`,
      { headers: this.getAuthHeaders() }
    );
  }

  /**
   * Add a dividend record
   */
  addDividend(dividend: DividendCreate): Observable<DividendRecord> {
    return this.http.post<DividendRecord>(
      `${this.apiUrl}/dividends/`,
      dividend,
      { headers: this.getAuthHeaders() }
    );
  }

  /**
   * Delete a dividend record
   */
  deleteDividend(id: string): Observable<void> {
    return this.http.delete<void>(
      `${this.apiUrl}/dividends/${id}`,
      { headers: this.getAuthHeaders() }
    );
  }

  // ============ STOCK COMPARISON ============

  /**
   * Compare multiple stocks
   */
  compareStocks(tickers: string[]): Observable<{ stocks: StockCompareData[] }> {
    return this.http.post<{ stocks: StockCompareData[] }>(
      `${this.apiUrl}/compare/`,
      { tickers },
      { headers: this.getAuthHeaders() }
    );
  }

  // ============ SETTINGS ============

  /**
   * Change password
   */
  changePassword(data: PasswordChange): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(
      `${this.apiUrl}/settings/change-password`,
      data,
      { headers: this.getAuthHeaders() }
    );
  }

  /**
   * Delete account
   */
  deleteAccount(password: string): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(
      `${this.apiUrl}/settings/account`,
      {
        headers: this.getAuthHeaders(),
        body: { password }
      }
    );
  }

  /**
   * Export holdings to CSV
   */
  exportHoldings(): Observable<Blob> {
    return this.http.get(
      `${this.apiUrl}/settings/export/holdings`,
      {
        headers: this.getAuthHeaders(),
        responseType: 'blob'
      }
    );
  }

  /**
   * Export dividends to CSV
   */
  exportDividends(): Observable<Blob> {
    return this.http.get(
      `${this.apiUrl}/settings/export/dividends`,
      {
        headers: this.getAuthHeaders(),
        responseType: 'blob'
      }
    );
  }

  /**
   * Export full portfolio to CSV
   */
  exportPortfolio(): Observable<Blob> {
    return this.http.get(
      `${this.apiUrl}/settings/export/portfolio`,
      {
        headers: this.getAuthHeaders(),
        responseType: 'blob'
      }
    );
  }
}