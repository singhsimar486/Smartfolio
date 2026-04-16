import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AuthService } from './auth';
import { environment } from '../../environments/environment';

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
 * Interface for a transaction record
 */
export interface Transaction {
  id: string;
  holding_id: string;
  ticker: string;
  type: 'BUY' | 'SELL';
  quantity: number;
  price_per_unit: number;
  total_value: number;
  transaction_date: string;
  created_at: string;
}

/**
 * Interface for creating a transaction
 */
export interface TransactionCreate {
  ticker: string;
  type: 'BUY' | 'SELL';
  quantity: number;
  price_per_unit: number;
  transaction_date: string;
}

/**
 * Interface for gains summary
 */
export interface GainsSummary {
  unrealized_gains: number;
  unrealized_gains_percent: number;
  realized_gains: number;
  total_gains: number;
  holdings: HoldingGains[];
}

/**
 * Interface for per-holding gains
 */
export interface HoldingGains {
  ticker: string;
  name: string;
  unrealized: number;
  realized: number;
  cost_basis: number;
  current_value: number;
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
 * Interface for prediction data point
 */
export interface PredictionPoint {
  date: string;
  predicted_price: number;
  upper_bound: number;
  lower_bound: number;
}

/**
 * Interface for prediction summary
 */
export interface PredictionSummary {
  days_ahead: number;
  final_predicted_price: number;
  predicted_change: number;
  predicted_change_percent: number;
  confidence_score: number;
  volatility: number;
  rsi: number;
  trend_direction: string;
}

/**
 * Interface for stock prediction response
 */
export interface StockPrediction {
  ticker: string;
  current_price: number;
  predictions: PredictionPoint[];
  summary: PredictionSummary;
  disclaimer: string;
}

/**
 * Interface for password change
 */
export interface PasswordChange {
  current_password: string;
  new_password: string;
}

/**
 * Interface for subscription status
 */
export interface SubscriptionStatus {
  tier: string;
  status: string;
  ends_at: string | null;
  stripe_customer_id: string | null;
  referral_code: string | null;
  referral_count: number;
}

/**
 * Interface for checkout response
 */
export interface CheckoutResponse {
  checkout_url: string;
  session_id: string;
}

/**
 * Interface for portal response
 */
export interface PortalResponse {
  portal_url: string;
}

/**
 * Interface for referral info
 */
export interface ReferralInfo {
  referral_code: string;
  referral_count: number;
  referral_link: string;
}

// ============ COMPETITION INTERFACES ============

/**
 * Interface for a competition
 */
export interface Competition {
  id: string;
  name: string;
  description: string | null;
  type: 'weekly' | 'monthly' | 'special';
  status: 'upcoming' | 'active' | 'ended';
  starting_balance: number;
  max_participants: number | null;
  entry_fee: number;
  prize_description: string | null;
  start_date: string;
  end_date: string;
  created_at: string;
  participant_count: number;
  user_joined: boolean;
  user_rank: number | null;
}

/**
 * Interface for a virtual portfolio in a competition
 */
export interface VirtualPortfolio {
  id: string;
  user_id: string;
  competition_id: string;
  cash_balance: number;
  total_value: number;
  total_return: number;
  total_return_percent: number;
  current_rank: number | null;
  best_rank: number | null;
  trades_count: number;
  winning_trades: number;
  losing_trades: number;
  joined_at: string;
  last_trade_at: string | null;
  holdings: VirtualHolding[];
}

/**
 * Interface for a virtual holding
 */
export interface VirtualHolding {
  id: string;
  ticker: string;
  quantity: number;
  avg_cost: number;
  current_price: number | null;
  current_value: number | null;
  profit_loss: number | null;
  profit_loss_percent: number | null;
}

/**
 * Interface for a virtual trade
 */
export interface VirtualTrade {
  id: string;
  ticker: string;
  type: 'BUY' | 'SELL';
  quantity: number;
  price: number;
  total_value: number;
  realized_pl: number | null;
  executed_at: string;
}

/**
 * Interface for making a virtual trade
 */
export interface VirtualTradeCreate {
  ticker: string;
  type: 'BUY' | 'SELL';
  quantity: number;
}

/**
 * Interface for leaderboard entry
 */
export interface LeaderboardEntry {
  rank: number;
  user_id: string;
  username: string;
  total_value: number;
  total_return: number;
  total_return_percent: number;
  trades_count: number;
  is_current_user: boolean;
}

/**
 * Interface for achievement
 */
export interface Achievement {
  id: string;
  code: string;
  name: string;
  description: string;
  icon: string;
  type: 'trading' | 'competition' | 'streak' | 'milestone';
  progress: number;
  target: number;
  unlocked: boolean;
  unlocked_at: string | null;
}

/**
 * Interface for user competition stats
 */
export interface CompetitionStats {
  total_competitions: number;
  active_competitions: number;
  best_rank: number | null;
  total_trades: number;
  total_profit_loss: number;
  win_rate: number;
  achievements_unlocked: number;
  total_achievements: number;
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

// ============ RECURRING INVESTMENTS INTERFACES ============

/**
 * Interface for an upcoming investment
 */
export interface UpcomingInvestment {
  ticker: string;
  amount: number;
  date: string;
}

/**
 * Interface for a recurring investment plan
 */
export interface RecurringInvestment {
  id: string;
  user_id: string;
  ticker: string;
  stock_name: string | null;
  amount: number;
  frequency: string;
  is_active: boolean;
  start_date: string;
  next_investment_date: string;
  total_invested: number;
  total_shares: number;
  current_value: number | null;
  gain_loss: number | null;
  gain_loss_percent: number | null;
  executions_count: number;
  created_at: string;
  updated_at: string;
}

/**
 * Interface for recurring investment summary
 */
export interface RecurringSummary {
  active_plans: number;
  total_plans: number;
  total_monthly_investment: number;
  total_invested_all_time: number;
  upcoming_investments: UpcomingInvestment[];
}

/**
 * Interface for creating a recurring investment
 */
export interface RecurringCreate {
  ticker: string;
  amount: number;
  frequency: string;
  start_date: string;
}

/**
 * Interface for updating a recurring investment
 */
export interface RecurringUpdate {
  amount?: number;
  frequency?: string;
  is_active?: boolean;
}

// ============ ALLOCATION INTERFACES ============

/**
 * Interface for sector allocation
 */
export interface SectorAllocation {
  sector: string;
  value: number;
  percentage: number;
  holdings_count: number;
  tickers: string[];
}

/**
 * Interface for holding allocation
 */
export interface HoldingAllocation {
  ticker: string;
  name: string;
  sector: string | null;
  value: number;
  percentage: number;
}

/**
 * Interface for allocation response
 */
export interface AllocationResponse {
  total_value: number;
  by_sector: SectorAllocation[];
  by_holding: HoldingAllocation[];
  recommendations: string[];
}

@Injectable({
  providedIn: 'root'
})
export class ApiService {

  private apiUrl = environment.apiUrl;

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

  /**
   * Get stock price prediction (public endpoint)
   */
  getStockPrediction(ticker: string, days: number = 30): Observable<StockPrediction> {
    return this.http.get<StockPrediction>(
      `${this.apiUrl}/market/predict/${ticker}?days=${days}`
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

  // ============ TRANSACTIONS ============

  /**
   * Get all transactions for current user
   */
  getTransactions(ticker?: string, type?: string): Observable<Transaction[]> {
    let url = `${this.apiUrl}/transactions/`;
    const params: string[] = [];
    if (ticker) params.push(`ticker=${ticker}`);
    if (type) params.push(`type=${type}`);
    if (params.length > 0) url += `?${params.join('&')}`;

    return this.http.get<Transaction[]>(url, { headers: this.getAuthHeaders() });
  }

  /**
   * Create a new transaction
   */
  createTransaction(transaction: TransactionCreate): Observable<Transaction> {
    return this.http.post<Transaction>(
      `${this.apiUrl}/transactions/`,
      transaction,
      { headers: this.getAuthHeaders() }
    );
  }

  /**
   * Delete a transaction
   */
  deleteTransaction(id: string): Observable<void> {
    return this.http.delete<void>(
      `${this.apiUrl}/transactions/${id}`,
      { headers: this.getAuthHeaders() }
    );
  }

  // ============ GAINS ============

  /**
   * Get gains summary (realized and unrealized)
   */
  getGainsSummary(): Observable<GainsSummary> {
    return this.http.get<GainsSummary>(
      `${this.apiUrl}/portfolio/gains`,
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

  // ============ SUBSCRIPTIONS ============

  /**
   * Get subscription status
   */
  getSubscriptionStatus(): Observable<SubscriptionStatus> {
    return this.http.get<SubscriptionStatus>(
      `${this.apiUrl}/subscriptions/status`,
      { headers: this.getAuthHeaders() }
    );
  }

  /**
   * Create checkout session for subscription
   */
  createCheckout(plan: string): Observable<CheckoutResponse> {
    return this.http.post<CheckoutResponse>(
      `${this.apiUrl}/subscriptions/checkout?plan=${plan}`,
      {},
      { headers: this.getAuthHeaders() }
    );
  }

  /**
   * Create customer portal session
   */
  createPortalSession(): Observable<PortalResponse> {
    return this.http.post<PortalResponse>(
      `${this.apiUrl}/subscriptions/portal`,
      {},
      { headers: this.getAuthHeaders() }
    );
  }

  /**
   * Cancel subscription
   */
  cancelSubscription(): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(
      `${this.apiUrl}/subscriptions/cancel`,
      {},
      { headers: this.getAuthHeaders() }
    );
  }

  /**
   * Get referral code
   */
  getReferralCode(): Observable<ReferralInfo> {
    return this.http.get<ReferralInfo>(
      `${this.apiUrl}/subscriptions/referral-code`,
      { headers: this.getAuthHeaders() }
    );
  }

  /**
   * Apply referral code
   */
  applyReferralCode(code: string): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(
      `${this.apiUrl}/subscriptions/apply-referral?code=${code}`,
      {},
      { headers: this.getAuthHeaders() }
    );
  }

  // ============ COMPETITIONS ============

  /**
   * Get list of competitions
   */
  getCompetitions(status?: string): Observable<Competition[]> {
    let url = `${this.apiUrl}/competitions/`;
    if (status) url += `?status=${status}`;
    return this.http.get<Competition[]>(url, { headers: this.getAuthHeaders() });
  }

  /**
   * Get a single competition
   */
  getCompetition(id: string): Observable<Competition> {
    return this.http.get<Competition>(
      `${this.apiUrl}/competitions/${id}`,
      { headers: this.getAuthHeaders() }
    );
  }

  /**
   * Join a competition
   */
  joinCompetition(competitionId: string): Observable<VirtualPortfolio> {
    return this.http.post<VirtualPortfolio>(
      `${this.apiUrl}/competitions/${competitionId}/join`,
      {},
      { headers: this.getAuthHeaders() }
    );
  }

  /**
   * Get user's portfolio for a competition
   */
  getCompetitionPortfolio(competitionId: string): Observable<VirtualPortfolio> {
    return this.http.get<VirtualPortfolio>(
      `${this.apiUrl}/competitions/${competitionId}/portfolio`,
      { headers: this.getAuthHeaders() }
    );
  }

  /**
   * Make a virtual trade
   */
  makeVirtualTrade(competitionId: string, trade: VirtualTradeCreate): Observable<{ trade: VirtualTrade; portfolio: VirtualPortfolio }> {
    return this.http.post<{ trade: VirtualTrade; portfolio: VirtualPortfolio }>(
      `${this.apiUrl}/competitions/${competitionId}/trade`,
      trade,
      { headers: this.getAuthHeaders() }
    );
  }

  /**
   * Get trade history for a competition
   */
  getCompetitionTrades(competitionId: string): Observable<VirtualTrade[]> {
    return this.http.get<VirtualTrade[]>(
      `${this.apiUrl}/competitions/${competitionId}/trades`,
      { headers: this.getAuthHeaders() }
    );
  }

  /**
   * Get competition leaderboard
   */
  getLeaderboard(competitionId: string, limit: number = 50): Observable<LeaderboardEntry[]> {
    return this.http.get<LeaderboardEntry[]>(
      `${this.apiUrl}/competitions/${competitionId}/leaderboard?limit=${limit}`,
      { headers: this.getAuthHeaders() }
    );
  }

  /**
   * Get user's achievements
   */
  getAchievements(): Observable<Achievement[]> {
    return this.http.get<Achievement[]>(
      `${this.apiUrl}/competitions/achievements/me`,
      { headers: this.getAuthHeaders() }
    );
  }

  /**
   * Get user's competition stats
   */
  getCompetitionStats(): Observable<CompetitionStats> {
    return this.http.get<CompetitionStats>(
      `${this.apiUrl}/competitions/stats/me`,
      { headers: this.getAuthHeaders() }
    );
  }

  // ============ RECURRING INVESTMENTS ============

  /**
   * Get all recurring investments
   */
  getRecurringInvestments(): Observable<RecurringInvestment[]> {
    return this.http.get<RecurringInvestment[]>(
      `${this.apiUrl}/recurring/`,
      { headers: this.getAuthHeaders() }
    );
  }

  /**
   * Get recurring investments summary
   */
  getRecurringSummary(): Observable<RecurringSummary> {
    return this.http.get<RecurringSummary>(
      `${this.apiUrl}/recurring/summary`,
      { headers: this.getAuthHeaders() }
    );
  }

  /**
   * Create a new recurring investment
   */
  createRecurringInvestment(data: RecurringCreate): Observable<RecurringInvestment> {
    return this.http.post<RecurringInvestment>(
      `${this.apiUrl}/recurring/`,
      data,
      { headers: this.getAuthHeaders() }
    );
  }

  /**
   * Update a recurring investment
   */
  updateRecurringInvestment(id: string, data: RecurringUpdate): Observable<RecurringInvestment> {
    return this.http.put<RecurringInvestment>(
      `${this.apiUrl}/recurring/${id}`,
      data,
      { headers: this.getAuthHeaders() }
    );
  }

  /**
   * Execute a recurring investment manually
   */
  executeRecurringInvestment(id: string): Observable<RecurringInvestment> {
    return this.http.post<RecurringInvestment>(
      `${this.apiUrl}/recurring/${id}/execute`,
      {},
      { headers: this.getAuthHeaders() }
    );
  }

  /**
   * Delete a recurring investment
   */
  deleteRecurringInvestment(id: string): Observable<void> {
    return this.http.delete<void>(
      `${this.apiUrl}/recurring/${id}`,
      { headers: this.getAuthHeaders() }
    );
  }

  // ============ ALLOCATION ============

  /**
   * Get portfolio allocation analysis
   */
  getAllocation(): Observable<AllocationResponse> {
    return this.http.get<AllocationResponse>(
      `${this.apiUrl}/portfolio/allocation`,
      { headers: this.getAuthHeaders() }
    );
  }
}