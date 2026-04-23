import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Subject, takeUntil, forkJoin, of, catchError } from 'rxjs';
import {
  ApiService,
  Competition,
  VirtualPortfolio,
  VirtualHolding,
  VirtualTrade,
  LeaderboardEntry,
  Achievement,
  CompetitionStats
} from '../../services/api';
import { ToastService } from '../../services/toast';

@Component({
  selector: 'app-arena',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './arena.html',
  styleUrls: ['./arena.css']
})
export class ArenaComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  // State
  competitions: Competition[] = [];
  activeCompetition: Competition | null = null;
  portfolio: VirtualPortfolio | null = null;
  leaderboard: LeaderboardEntry[] = [];
  trades: VirtualTrade[] = [];
  achievements: Achievement[] = [];
  stats: CompetitionStats | null = null;

  // UI State
  loading = true;
  joining = false;
  trading = false;
  activeTab: 'competitions' | 'portfolio' | 'leaderboard' | 'trades' | 'achievements' = 'competitions';
  statusFilter: 'all' | 'active' | 'upcoming' | 'ended' = 'active';

  // Trade Modal
  showTradeModal = false;
  tradeType: 'BUY' | 'SELL' = 'BUY';
  tradeTicker = '';
  tradeQuantity = 1;
  tradePrice: number | null = null;
  tradeLoading = false;
  tickerSearchResults: { symbol: string; name: string }[] = [];
  searchingTicker = false;

  constructor(
    private api: ApiService,
    private toast: ToastService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.loadData();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadData() {
    this.loading = true;
    console.log('[Arena] loadData started');

    // Use catchError for each observable to prevent forkJoin from failing completely
    forkJoin({
      competitions: this.api.getCompetitions().pipe(
        catchError(err => {
          console.error('[Arena] Failed to load competitions:', err);
          return of([] as Competition[]);
        })
      ),
      achievements: this.api.getAchievements().pipe(
        catchError(err => {
          console.error('[Arena] Failed to load achievements:', err);
          return of([] as Achievement[]);
        })
      ),
      stats: this.api.getCompetitionStats().pipe(
        catchError(err => {
          console.error('[Arena] Failed to load stats:', err);
          return of({
            total_competitions: 0,
            active_competitions: 0,
            best_rank: null,
            total_trades: 0,
            total_profit_loss: 0,
            win_rate: 0,
            achievements_unlocked: 0,
            total_achievements: 0
          } as CompetitionStats);
        })
      )
    })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => {
          console.log('[Arena] forkJoin completed with data:', data);
          this.competitions = data.competitions;
          this.achievements = data.achievements;
          this.stats = data.stats;

          console.log('[Arena] competitions:', this.competitions.length);
          console.log('[Arena] achievements:', this.achievements.length);
          console.log('[Arena] stats:', this.stats);

          // Auto-select first active competition the user has joined
          const joinedActive = this.competitions.find(c => c.status === 'active' && c.user_joined);
          if (joinedActive) {
            this.selectCompetition(joinedActive);
          }

          this.loading = false;
          console.log('[Arena] loading set to false');
          this.cdr.detectChanges();
        },
        error: (err) => {
          console.error('[Arena] loadData error:', err);
          this.toast.error('Failed to load arena data');
          this.loading = false;
          this.cdr.detectChanges();
        }
      });
  }

  selectCompetition(competition: Competition) {
    this.activeCompetition = competition;

    if (competition.user_joined) {
      this.loadCompetitionDetails(competition.id);
    }
  }

  loadCompetitionDetails(competitionId: string) {
    forkJoin({
      portfolio: this.api.getCompetitionPortfolio(competitionId),
      leaderboard: this.api.getLeaderboard(competitionId),
      trades: this.api.getCompetitionTrades(competitionId)
    })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => {
          this.portfolio = data.portfolio;
          this.leaderboard = data.leaderboard;
          this.trades = data.trades;
          this.activeTab = 'portfolio';
        },
        error: (err) => {
          this.toast.error('Failed to load competition details');
        }
      });
  }

  joinCompetition(competition: Competition) {
    this.joining = true;
    this.api.joinCompetition(competition.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (portfolio) => {
          this.toast.success(`Joined ${competition.name}!`);
          this.portfolio = portfolio;
          competition.user_joined = true;
          competition.participant_count++;
          this.activeCompetition = competition;
          this.loadCompetitionDetails(competition.id);
          this.joining = false;
        },
        error: (err) => {
          this.toast.error(err.error?.detail || 'Failed to join competition');
          this.joining = false;
        }
      });
  }

  openTradeModal(type: 'BUY' | 'SELL') {
    this.tradeType = type;
    this.tradeTicker = '';
    this.tradeQuantity = 1;
    this.tradePrice = null;
    this.tickerSearchResults = [];
    this.showTradeModal = true;
  }

  closeTradeModal() {
    this.showTradeModal = false;
  }

  searchTicker() {
    if (this.tradeTicker.length < 1) {
      this.tickerSearchResults = [];
      return;
    }

    this.searchingTicker = true;
    this.api.searchTickers(this.tradeTicker, 5)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          this.tickerSearchResults = res.results;
          this.searchingTicker = false;
        },
        error: () => {
          this.searchingTicker = false;
        }
      });
  }

  selectTicker(symbol: string) {
    this.tradeTicker = symbol;
    this.tickerSearchResults = [];
    this.loadTickerPrice();
  }

  loadTickerPrice() {
    if (!this.tradeTicker) return;

    this.api.getStockQuote(this.tradeTicker)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (quote) => {
          this.tradePrice = quote.current_price;
        },
        error: () => {
          this.toast.error('Failed to get stock price');
        }
      });
  }

  get tradeTotal(): number {
    if (!this.tradePrice || !this.tradeQuantity) return 0;
    return this.tradePrice * this.tradeQuantity;
  }

  get canExecuteTrade(): boolean {
    if (!this.portfolio || !this.tradePrice || !this.tradeTicker || this.tradeQuantity <= 0) {
      return false;
    }

    if (this.tradeType === 'BUY') {
      return this.tradeTotal <= this.portfolio.cash_balance;
    } else {
      const holding = this.portfolio.holdings.find(h => h.ticker === this.tradeTicker);
      return !!holding && holding.quantity >= this.tradeQuantity;
    }
  }

  executeTrade() {
    if (!this.activeCompetition || !this.canExecuteTrade) return;

    this.tradeLoading = true;
    this.api.makeVirtualTrade(this.activeCompetition.id, {
      ticker: this.tradeTicker,
      type: this.tradeType,
      quantity: this.tradeQuantity
    })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (result) => {
          this.portfolio = result.portfolio;
          this.trades.unshift(result.trade);
          this.toast.success(`${this.tradeType} order executed!`);
          this.closeTradeModal();
          this.tradeLoading = false;

          // Refresh leaderboard
          this.api.getLeaderboard(this.activeCompetition!.id)
            .pipe(takeUntil(this.destroy$))
            .subscribe(lb => this.leaderboard = lb);

          // Refresh achievements
          this.api.getAchievements()
            .pipe(takeUntil(this.destroy$))
            .subscribe(a => this.achievements = a);
        },
        error: (err) => {
          this.toast.error(err.error?.detail || 'Trade failed');
          this.tradeLoading = false;
        }
      });
  }

  getFilteredCompetitions(): Competition[] {
    if (this.statusFilter === 'all') {
      return this.competitions;
    }
    return this.competitions.filter(c => c.status === this.statusFilter);
  }

  getUnlockedAchievements(): Achievement[] {
    return this.achievements.filter(a => a.unlocked);
  }

  getLockedAchievements(): Achievement[] {
    return this.achievements.filter(a => !a.unlocked);
  }

  formatCurrency(value: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value);
  }

  formatPercent(value: number): string {
    const sign = value >= 0 ? '+' : '';
    return `${sign}${value.toFixed(2)}%`;
  }

  formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  }

  formatDateTime(dateStr: string): string {
    return new Date(dateStr).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    });
  }

  getStatusClass(status: string): string {
    switch (status) {
      case 'active': return 'status-active';
      case 'upcoming': return 'status-upcoming';
      case 'ended': return 'status-ended';
      default: return '';
    }
  }

  getTypeLabel(type: string): string {
    switch (type) {
      case 'weekly': return 'Weekly';
      case 'monthly': return 'Monthly';
      case 'special': return 'Special Event';
      default: return type;
    }
  }

  getRankBadge(rank: number): string {
    if (rank === 1) return '1st';
    if (rank === 2) return '2nd';
    if (rank === 3) return '3rd';
    return `${rank}th`;
  }

  getHoldingValue(holding: VirtualHolding): number {
    return holding.current_value || holding.quantity * holding.avg_cost;
  }
}
