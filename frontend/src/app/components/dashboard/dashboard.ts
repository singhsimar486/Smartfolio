import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, Router } from '@angular/router';
import { BaseChartDirective } from 'ng2-charts';
import { Chart, ChartConfiguration, ChartData, ArcElement, Tooltip, Legend, DoughnutController } from 'chart.js';
import { ApiService, PortfolioSummary, HoldingWithMarketData } from '../../services/api';
import { AuthService } from '../../services/auth';
import { Navbar } from '../navbar/navbar';

// Register Chart.js components
Chart.register(ArcElement, Tooltip, Legend, DoughnutController);

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink, Navbar, BaseChartDirective],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css',
})
export class Dashboard implements OnInit {
  portfolio: PortfolioSummary | null = null;
  isLoading: boolean = true;
  errorMessage: string = '';

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

  // Color palette for chart
  private chartColors = [
    '#00D4FF', '#00FF88', '#FF4444', '#FFB800', '#A855F7',
    '#EC4899', '#14B8A6', '#F97316', '#8B5CF6', '#06B6D4'
  ];

  constructor(
    private apiService: ApiService,
    private authService: AuthService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    if (!this.authService.isLoggedIn()) {
      this.router.navigate(['/login']);
      return;
    }
    this.loadPortfolio();
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
}
