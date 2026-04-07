import { Component, OnInit, ChangeDetectorRef, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Subject, debounceTime, distinctUntilChanged, takeUntil } from 'rxjs';
import { BaseChartDirective } from 'ng2-charts';
import {
  Chart,
  ChartConfiguration,
  ChartData,
  LineController,
  LineElement,
  PointElement,
  CategoryScale,
  LinearScale,
  Filler,
  Legend,
  Tooltip
} from 'chart.js';
import { ApiService, StockQuote, TickerSearchResult, StockPrediction } from '../../services/api';
import { AuthService } from '../../services/auth';
import { ToastService } from '../../services/toast';
import { Navbar } from '../navbar/navbar';

Chart.register(LineController, LineElement, PointElement, CategoryScale, LinearScale, Filler, Legend, Tooltip);

interface PriceHistory {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

@Component({
  selector: 'app-stock-lookup',
  standalone: true,
  imports: [CommonModule, FormsModule, Navbar, BaseChartDirective],
  templateUrl: './stock-lookup.html',
  styleUrl: './stock-lookup.css',
})
export class StockLookup implements OnInit, OnDestroy {
  // Search
  searchQuery: string = '';
  searchResults: TickerSearchResult[] = [];
  showDropdown: boolean = false;
  isSearching: boolean = false;
  private searchSubject = new Subject<string>();
  private destroy$ = new Subject<void>();

  // Selected stock
  selectedTicker: string | null = null;
  stockQuote: StockQuote | null = null;
  isLoadingQuote: boolean = false;

  // Chart
  priceHistory: PriceHistory[] = [];
  isLoadingHistory: boolean = false;
  selectedPeriod: string = '1mo';

  // Prediction
  prediction: StockPrediction | null = null;
  isLoadingPrediction: boolean = false;
  showPrediction: boolean = true;

  // Chart configuration
  priceChartData: ChartData<'line'> = {
    labels: [],
    datasets: [{
      data: [],
      borderColor: '#38BDF8',
      backgroundColor: 'rgba(56, 189, 248, 0.1)',
      fill: true,
      tension: 0.4,
      pointRadius: 0,
      pointHoverRadius: 6,
      pointHoverBackgroundColor: '#38BDF8',
      pointHoverBorderColor: '#FFFFFF',
      pointHoverBorderWidth: 2
    }]
  };

  priceChartOptions: ChartConfiguration<'line'>['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      intersect: false,
      mode: 'index'
    },
    scales: {
      x: {
        display: true,
        grid: {
          color: 'rgba(255, 255, 255, 0.05)'
        },
        ticks: {
          color: '#A0A0A0',
          maxTicksLimit: 8
        }
      },
      y: {
        display: true,
        grid: {
          color: 'rgba(255, 255, 255, 0.05)'
        },
        ticks: {
          color: '#A0A0A0',
          callback: (value) => '$' + value
        }
      }
    },
    plugins: {
      legend: {
        display: true,
        position: 'top',
        align: 'end',
        labels: {
          color: '#A0A0A0',
          usePointStyle: true,
          pointStyle: 'line',
          padding: 12,
          font: {
            size: 11
          },
          filter: (item) => {
            return item.text !== 'Upper Bound' && item.text !== 'Lower Bound';
          }
        }
      },
      tooltip: {
        backgroundColor: '#242424',
        titleColor: '#FFFFFF',
        bodyColor: '#A0A0A0',
        borderColor: '#333',
        borderWidth: 1,
        padding: 12,
        filter: (item) => {
          return item.dataset.label !== 'Upper Bound' && item.dataset.label !== 'Lower Bound';
        },
        callbacks: {
          label: (context) => {
            const label = context.dataset.label || '';
            return `${label}: $${(context.parsed.y ?? 0).toFixed(2)}`;
          }
        }
      }
    }
  };

  constructor(
    private apiService: ApiService,
    private authService: AuthService,
    private toastService: ToastService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    if (!this.authService.isLoggedIn()) {
      this.router.navigate(['/login']);
      return;
    }
    this.setupSearch();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private setupSearch(): void {
    this.searchSubject.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      takeUntil(this.destroy$)
    ).subscribe(query => {
      if (query.length >= 1) {
        this.performSearch(query);
      } else {
        this.searchResults = [];
        this.showDropdown = false;
      }
    });
  }

  private performSearch(query: string): void {
    this.isSearching = true;
    this.apiService.searchTickers(query).subscribe({
      next: (response) => {
        this.searchResults = response.results;
        this.showDropdown = this.searchResults.length > 0;
        this.isSearching = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.searchResults = [];
        this.showDropdown = false;
        this.isSearching = false;
        this.cdr.detectChanges();
      }
    });
  }

  onSearchInput(): void {
    this.searchSubject.next(this.searchQuery);
  }

  selectTicker(result: TickerSearchResult): void {
    this.searchQuery = result.symbol;
    this.showDropdown = false;
    this.searchResults = [];
    this.loadStock(result.symbol);
  }

  hideDropdown(): void {
    setTimeout(() => {
      this.showDropdown = false;
    }, 200);
  }

  searchStock(): void {
    if (this.searchQuery.trim()) {
      this.loadStock(this.searchQuery.trim().toUpperCase());
    }
  }

  loadStock(ticker: string): void {
    this.selectedTicker = ticker;
    this.stockQuote = null;
    this.prediction = null;
    this.isLoadingQuote = true;

    this.apiService.getStockQuote(ticker).subscribe({
      next: (quote) => {
        this.stockQuote = quote;
        this.isLoadingQuote = false;
        this.loadPriceHistory(ticker, this.selectedPeriod);
        this.cdr.detectChanges();
      },
      error: () => {
        this.isLoadingQuote = false;
        this.toastService.showError('Not Found', `Could not find stock "${ticker}"`);
        this.selectedTicker = null;
        this.cdr.detectChanges();
      }
    });
  }

  loadPriceHistory(ticker: string, period: string): void {
    this.isLoadingHistory = true;
    this.prediction = null;

    this.apiService.getStockHistory(ticker, period).subscribe({
      next: (data: PriceHistory[]) => {
        this.priceHistory = data;
        this.updatePriceChart(data);
        this.isLoadingHistory = false;
        this.cdr.detectChanges();

        if (this.showPrediction) {
          this.loadPrediction(ticker);
        }
      },
      error: () => {
        this.isLoadingHistory = false;
        this.cdr.detectChanges();
      }
    });
  }

  loadPrediction(ticker: string): void {
    this.isLoadingPrediction = true;

    this.apiService.getStockPrediction(ticker, 30).subscribe({
      next: (data: StockPrediction) => {
        this.prediction = data;
        this.addPredictionToChart(data);
        this.isLoadingPrediction = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.isLoadingPrediction = false;
        this.prediction = null;
        this.cdr.detectChanges();
      }
    });
  }

  changePeriod(period: string): void {
    this.selectedPeriod = period;
    if (this.selectedTicker) {
      this.loadPriceHistory(this.selectedTicker, period);
    }
  }

  togglePrediction(): void {
    this.showPrediction = !this.showPrediction;
    if (this.selectedTicker) {
      if (this.showPrediction && !this.prediction) {
        this.loadPrediction(this.selectedTicker);
      } else if (!this.showPrediction && this.prediction) {
        this.updatePriceChart(this.priceHistory);
      }
    }
  }

  updatePriceChart(history: PriceHistory[]): void {
    if (history.length === 0) return;

    const isPositive = history[history.length - 1].close >= history[0].close;
    const color = isPositive ? '#00FF88' : '#FF4444';

    this.priceChartData = {
      labels: history.map(h => this.formatChartDate(h.date)),
      datasets: [{
        label: 'Price',
        data: history.map(h => h.close),
        borderColor: color,
        backgroundColor: isPositive ? 'rgba(0, 255, 136, 0.1)' : 'rgba(255, 68, 68, 0.1)',
        fill: true,
        tension: 0.4,
        pointRadius: 0,
        pointHoverRadius: 6,
        pointHoverBackgroundColor: color,
        pointHoverBorderColor: '#FFFFFF',
        pointHoverBorderWidth: 2
      }]
    };
  }

  addPredictionToChart(prediction: StockPrediction): void {
    if (!this.priceChartData.labels || !this.priceChartData.datasets[0]) return;

    const existingLabels = this.priceChartData.labels as string[];
    const existingData = this.priceChartData.datasets[0].data as number[];

    const predictionLabels = prediction.predictions.map(p => this.formatChartDate(p.date));
    const predictionPrices = prediction.predictions.map(p => p.predicted_price);
    const upperBound = prediction.predictions.map(p => p.upper_bound);
    const lowerBound = prediction.predictions.map(p => p.lower_bound);

    const allLabels = [...existingLabels, ...predictionLabels];
    const historicalPadded = [...existingData, ...Array(predictionLabels.length).fill(null)];
    const predictionPadded = [...Array(existingLabels.length - 1).fill(null), existingData[existingData.length - 1], ...predictionPrices];
    const upperPadded = [...Array(existingLabels.length - 1).fill(null), existingData[existingData.length - 1], ...upperBound];
    const lowerPadded = [...Array(existingLabels.length - 1).fill(null), existingData[existingData.length - 1], ...lowerBound];

    const isPositive = existingData.length > 1 && existingData[existingData.length - 1] >= existingData[0];
    const color = isPositive ? '#00FF88' : '#FF4444';

    this.priceChartData = {
      labels: allLabels,
      datasets: [
        {
          label: 'Historical',
          data: historicalPadded,
          borderColor: color,
          backgroundColor: isPositive ? 'rgba(0, 255, 136, 0.1)' : 'rgba(255, 68, 68, 0.1)',
          fill: true,
          tension: 0.4,
          pointRadius: 0,
          pointHoverRadius: 6,
          pointHoverBackgroundColor: color,
          pointHoverBorderColor: '#FFFFFF',
          pointHoverBorderWidth: 2
        },
        {
          label: 'Prediction',
          data: predictionPadded,
          borderColor: '#38BDF8',
          borderDash: [8, 4],
          backgroundColor: 'transparent',
          fill: false,
          tension: 0.4,
          pointRadius: 0,
          pointHoverRadius: 6,
          pointHoverBackgroundColor: '#38BDF8',
          pointHoverBorderColor: '#FFFFFF',
          pointHoverBorderWidth: 2
        },
        {
          label: 'Upper Bound',
          data: upperPadded,
          borderColor: 'rgba(56, 189, 248, 0.3)',
          borderDash: [4, 4],
          backgroundColor: 'rgba(56, 189, 248, 0.05)',
          fill: '+1',
          tension: 0.4,
          pointRadius: 0,
          pointHoverRadius: 0
        },
        {
          label: 'Lower Bound',
          data: lowerPadded,
          borderColor: 'rgba(56, 189, 248, 0.3)',
          borderDash: [4, 4],
          backgroundColor: 'transparent',
          fill: false,
          tension: 0.4,
          pointRadius: 0,
          pointHoverRadius: 0
        }
      ]
    };
  }

  formatChartDate(dateStr: string): string {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }

  formatCurrency(value: number | null): string {
    if (value === null) return '--';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(value);
  }

  formatPercent(value: number | null): string {
    if (value === null) return '--';
    const sign = value >= 0 ? '+' : '';
    return `${sign}${value.toFixed(2)}%`;
  }

  formatLargeNumber(value: number | null): string {
    if (value === null) return '--';
    if (value >= 1e12) return `$${(value / 1e12).toFixed(2)}T`;
    if (value >= 1e9) return `$${(value / 1e9).toFixed(2)}B`;
    if (value >= 1e6) return `$${(value / 1e6).toFixed(2)}M`;
    return this.formatCurrency(value);
  }

  formatVolume(value: number | null): string {
    if (value === null) return '--';
    if (value >= 1e9) return `${(value / 1e9).toFixed(2)}B`;
    if (value >= 1e6) return `${(value / 1e6).toFixed(2)}M`;
    if (value >= 1e3) return `${(value / 1e3).toFixed(2)}K`;
    return value.toString();
  }

  getProfitLossClass(value: number | null): string {
    if (value === null) return 'text-text-secondary';
    return value >= 0 ? 'text-profit' : 'text-loss';
  }

  addToWatchlist(): void {
    if (!this.selectedTicker) return;

    this.apiService.addToWatchlist(this.selectedTicker).subscribe({
      next: () => {
        this.toastService.showSuccess('Added', `${this.selectedTicker} added to watchlist`);
      },
      error: (err) => {
        if (err.status === 400) {
          this.toastService.showError('Already Added', `${this.selectedTicker} is already in your watchlist`);
        } else {
          this.toastService.showError('Error', 'Failed to add to watchlist');
        }
      }
    });
  }
}
