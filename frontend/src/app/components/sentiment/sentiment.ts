import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { ApiService, PortfolioSentiment, HoldingSentiment, SentimentArticle } from '../../services/api';
import { AuthService } from '../../services/auth';
import { Navbar } from '../navbar/navbar';

@Component({
  selector: 'app-sentiment',
  standalone: true,
  imports: [CommonModule, Navbar],
  templateUrl: './sentiment.html',
  styleUrl: './sentiment.css',
})
export class Sentiment implements OnInit {
  sentiment: PortfolioSentiment | null = null;
  isLoading: boolean = true;
  errorMessage: string = '';

  // Expanded holding for viewing articles
  expandedTicker: string | null = null;

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
    this.loadSentiment();
  }

  loadSentiment(): void {
    this.isLoading = true;
    this.errorMessage = '';

    this.apiService.getPortfolioSentiment().subscribe({
      next: (data) => {
        this.sentiment = data;
        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: (error) => {
        this.isLoading = false;
        if (error.status === 401) {
          this.router.navigate(['/login']);
        } else if (error.status === 404) {
          this.errorMessage = 'No holdings found. Add some stocks to see sentiment analysis.';
        } else {
          this.errorMessage = 'Failed to load sentiment data';
        }
        this.cdr.detectChanges();
      }
    });
  }

  toggleExpanded(ticker: string): void {
    if (this.expandedTicker === ticker) {
      this.expandedTicker = null;
    } else {
      this.expandedTicker = ticker;
    }
  }

  getSentimentClass(sentiment: string): string {
    switch (sentiment.toLowerCase()) {
      case 'positive':
        return 'text-profit';
      case 'negative':
        return 'text-loss';
      default:
        return 'text-warning';
    }
  }

  getSentimentBadgeClass(sentiment: string): string {
    switch (sentiment.toLowerCase()) {
      case 'positive':
        return 'bg-profit/20 text-profit border-profit/50';
      case 'negative':
        return 'bg-loss/20 text-loss border-loss/50';
      default:
        return 'bg-warning/20 text-warning border-warning/50';
    }
  }

  getPolarityWidth(polarity: number): number {
    // Polarity ranges from -1 to 1, convert to 0-100
    return ((polarity + 1) / 2) * 100;
  }

  getPolarityClass(polarity: number): string {
    if (polarity > 0.1) return 'bg-profit';
    if (polarity < -0.1) return 'bg-loss';
    return 'bg-warning';
  }

  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }
}
