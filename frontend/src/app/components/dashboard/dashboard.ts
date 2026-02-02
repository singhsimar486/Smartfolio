import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, Router } from '@angular/router';
import { BaseChartDirective } from 'ng2-charts';
import {
  Chart,
  ChartConfiguration,
  ChartData,
  ArcElement,
  Tooltip,
  Legend,
  DoughnutController,
  LineController,
  LineElement,
  PointElement,
  CategoryScale,
  LinearScale,
  Filler
} from 'chart.js';
import { ApiService, PortfolioSummary, HoldingWithMarketData, PortfolioPerformance } from '../../services/api';
import { AuthService } from '../../services/auth';
import { ToastService } from '../../services/toast';
import { Navbar } from '../navbar/navbar';
import { AIInsights } from '../ai-insights/ai-insights';
import { WeeklyDigestComponent } from '../weekly-digest/weekly-digest';

// Register Chart.js components
Chart.register(
  ArcElement, Tooltip, Legend, DoughnutController,
  LineController, LineElement, PointElement, CategoryScale, LinearScale, Filler
);

interface PriceHistory {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink, Navbar, BaseChartDirective, AIInsights, WeeklyDigestComponent],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css',
})
export class Dashboard implements OnInit {
  portfolio: PortfolioSummary | null = null;
  isLoading: boolean = true;
  errorMessage: string = '';

  // Stock detail modal
  selectedStock: HoldingWithMarketData | null = null;
  showStockModal: boolean = false;
  isLoadingHistory: boolean = false;
  selectedPeriod: string = '1mo';

  // Portfolio performance
  performanceData: PortfolioPerformance | null = null;
  isLoadingPerformance: boolean = false;
  performancePeriod: string = '1mo';

  // AI Features
  showDigest: boolean = false;

  // Pie chart for allocation
  allocationChartData: ChartData<'doughnut'> = {
    labels: [],
    datasets: [{
      data: [],
      backgroundColor: [],
      borderColor: '#0D0D0D',
      borderWidth: 2,
      hoverOffset: 8
    }]
  };

  allocationChartOptions: ChartConfiguration<'doughnut'>['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '65%',
    plugins: {
      legend: {
        display: false
      },
      tooltip: {
        backgroundColor: '#242424',
        titleColor: '#FFFFFF',
        bodyColor: '#A0A0A0',
        borderColor: '#333',
        borderWidth: 1,
        padding: 12,
        callbacks: {
          label: (context) => {
            const value = context.parsed;
            const total = context.dataset.data.reduce((a: number, b: number) => a + b, 0);
            const percentage = ((value / total) * 100).toFixed(1);
            return `${percentage}% ($${value.toLocaleString()})`;
          }
        }
      }
    }
  };

  // Line chart for price history
  priceChartData: ChartData<'line'> = {
    labels: [],
    datasets: [{
      data: [],
      borderColor: '#00D4FF',
      backgroundColor: 'rgba(0, 212, 255, 0.1)',
      fill: true,
      tension: 0.4,
      pointRadius: 0,
      pointHoverRadius: 6,
      pointHoverBackgroundColor: '#00D4FF',
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
          maxTicksLimit: 6
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
        display: false
      },
      tooltip: {
        backgroundColor: '#242424',
        titleColor: '#FFFFFF',
        bodyColor: '#A0A0A0',
        borderColor: '#333',
        borderWidth: 1,
        padding: 12,
        callbacks: {
          label: (context) => `$${(context.parsed.y ?? 0).toFixed(2)}`
        }
      }
    }
  };

  // Portfolio performance chart
  performanceChartData: ChartData<'line'> = {
    labels: [],
    datasets: [{
      data: [],
      borderColor: '#00D4FF',
      backgroundColor: 'rgba(0, 212, 255, 0.1)',
      fill: true,
      tension: 0.4,
      pointRadius: 0,
      pointHoverRadius: 6,
      pointHoverBackgroundColor: '#00D4FF',
      pointHoverBorderColor: '#FFFFFF',
      pointHoverBorderWidth: 2
    }]
  };

  performanceChartOptions: ChartConfiguration<'line'>['options'] = {
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
          callback: (value) => '$' + Number(value).toLocaleString()
        }
      }
    },
    plugins: {
      legend: {
        display: false
      },
      tooltip: {
        backgroundColor: '#242424',
        titleColor: '#FFFFFF',
        bodyColor: '#A0A0A0',
        borderColor: '#333',
        borderWidth: 1,
        padding: 12,
        callbacks: {
          label: (context) => `Portfolio Value: $${(context.parsed.y ?? 0).toLocaleString()}`
        }
      }
    }
  };

  // Color palette for chart
  private chartColors = [
    '#00D4FF', '#00FF88', '#FF4444', '#FFB800', '#A855F7',
    '#EC4899', '#14B8A6', '#F97316', '#8B5CF6', '#06B6D4'
  ];

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
    this.loadPortfolio();
    this.checkAlerts();
  }

  checkAlerts(): void {
    this.apiService.checkAlerts().subscribe({
      next: (result) => {
        for (const alert of result.triggered_alerts) {
          this.toastService.showAlert(
            alert.ticker,
            alert.condition,
            alert.target_price,
            alert.triggered_price || alert.current_price || 0
          );
        }
      },
      error: () => {
        // Silently ignore alert check errors
      }
    });
  }

  loadPortfolio(): void {
    this.isLoading = true;
    this.errorMessage = '';

    this.apiService.getPortfolioSummary().subscribe({
      next: (data) => {
        this.portfolio = data;
        this.updateAllocationChart(data.holdings);
        this.isLoading = false;
        this.cdr.detectChanges();
        // Load performance data after portfolio loads
        this.loadPerformance(this.performancePeriod);
      },
      error: (error) => {
        this.isLoading = false;
        if (error.status === 401) {
          this.router.navigate(['/login']);
        } else {
          this.errorMessage = 'Failed to load portfolio data';
        }
        this.cdr.detectChanges();
      }
    });
  }

  loadPerformance(period: string): void {
    this.isLoadingPerformance = true;

    this.apiService.getPortfolioPerformance(period).subscribe({
      next: (data) => {
        this.performanceData = data;
        this.updatePerformanceChart(data);
        this.isLoadingPerformance = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.isLoadingPerformance = false;
        this.cdr.detectChanges();
      }
    });
  }

  changePerformancePeriod(period: string): void {
    this.performancePeriod = period;
    this.loadPerformance(period);
  }

  updatePerformanceChart(data: PortfolioPerformance): void {
    const isPositive = data.period_return >= 0;
    const color = isPositive ? '#00FF88' : '#FF4444';

    this.performanceChartData = {
      labels: data.data.map(d => this.formatChartDate(d.date)),
      datasets: [{
        data: data.data.map(d => d.value),
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

  updateAllocationChart(holdings: HoldingWithMarketData[]): void {
    const validHoldings = holdings.filter(h => h.current_value && h.current_value > 0);

    this.allocationChartData = {
      labels: validHoldings.map(h => h.ticker),
      datasets: [{
        data: validHoldings.map(h => Math.round(h.current_value || 0)),
        backgroundColor: this.chartColors.slice(0, validHoldings.length),
        borderColor: '#0D0D0D',
        borderWidth: 2,
        hoverOffset: 8
      }]
    };
  }

  // Stock detail modal
  openStockDetail(holding: HoldingWithMarketData): void {
    this.selectedStock = holding;
    this.showStockModal = true;
    this.loadPriceHistory(holding.ticker, this.selectedPeriod);
  }

  closeStockModal(): void {
    this.showStockModal = false;
    this.selectedStock = null;
  }

  changePeriod(period: string): void {
    this.selectedPeriod = period;
    if (this.selectedStock) {
      this.loadPriceHistory(this.selectedStock.ticker, period);
    }
  }

  loadPriceHistory(ticker: string, period: string): void {
    this.isLoadingHistory = true;

    this.apiService.getStockHistory(ticker, period).subscribe({
      next: (data: PriceHistory[]) => {
        this.updatePriceChart(data);
        this.isLoadingHistory = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.isLoadingHistory = false;
        this.cdr.detectChanges();
      }
    });
  }

  updatePriceChart(history: PriceHistory[]): void {
    const isPositive = history.length > 1 && history[history.length - 1].close >= history[0].close;
    const color = isPositive ? '#00FF88' : '#FF4444';

    this.priceChartData = {
      labels: history.map(h => this.formatChartDate(h.date)),
      datasets: [{
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

  getProfitLossClass(value: number | null): string {
    if (value === null) return 'text-text-secondary';
    return value >= 0 ? 'text-profit' : 'text-loss';
  }

  getColorForIndex(index: number): string {
    return this.chartColors[index % this.chartColors.length];
  }

  getBestPerformer(): HoldingWithMarketData | null {
    if (!this.portfolio || this.portfolio.holdings.length === 0) return null;
    return this.portfolio.holdings.reduce((best, current) => {
      const bestPL = best.profit_loss_percent ?? -Infinity;
      const currentPL = current.profit_loss_percent ?? -Infinity;
      return currentPL > bestPL ? current : best;
    });
  }

  getWorstPerformer(): HoldingWithMarketData | null {
    if (!this.portfolio || this.portfolio.holdings.length === 0) return null;
    return this.portfolio.holdings.reduce((worst, current) => {
      const worstPL = worst.profit_loss_percent ?? Infinity;
      const currentPL = current.profit_loss_percent ?? Infinity;
      return currentPL < worstPL ? current : worst;
    });
  }

  getAllocationPercent(holding: HoldingWithMarketData): string {
    if (!this.portfolio || !holding.current_value || this.portfolio.total_value === 0) return '0';
    return ((holding.current_value / this.portfolio.total_value) * 100).toFixed(1);
  }

  // AI Features
  openDigest(): void {
    this.showDigest = true;
  }
}
