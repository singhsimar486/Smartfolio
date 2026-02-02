import { Component, OnInit, ChangeDetectorRef, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService, AIInsight, InsightsOverview } from '../../services/api';
import { AIChatService } from '../../services/ai-chat.service';

@Component({
  selector: 'app-ai-insights',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './ai-insights.html',
})
export class AIInsights implements OnInit {
  @Output() openDigest = new EventEmitter<void>();

  insights: AIInsight[] = [];
  isLoading: boolean = true;
  errorMessage: string = '';
  hasNewDigest: boolean = false;
  digestSummary: string | null = null;

  constructor(
    private apiService: ApiService,
    private chatService: AIChatService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadInsights();
  }

  loadInsights(): void {
    this.isLoading = true;
    this.errorMessage = '';

    this.apiService.getInsights().subscribe({
      next: (data: InsightsOverview) => {
        this.insights = data.insights;
        this.hasNewDigest = data.has_new_digest;
        this.digestSummary = data.digest_summary;
        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.isLoading = false;
        this.errorMessage = 'Failed to load insights';
        this.cdr.detectChanges();
      }
    });
  }

  getInsightIcon(type: string): string {
    switch (type) {
      case 'success':
        return 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z';
      case 'warning':
        return 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z';
      case 'alert':
        return 'M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9';
      default:
        return 'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z';
    }
  }

  getInsightColorClasses(type: string): { bg: string; border: string; icon: string; badge: string } {
    switch (type) {
      case 'success':
        return {
          bg: 'bg-gain/5',
          border: 'border-gain/20',
          icon: 'text-gain',
          badge: 'bg-gain/20 text-gain'
        };
      case 'warning':
        return {
          bg: 'bg-warning/5',
          border: 'border-warning/20',
          icon: 'text-warning',
          badge: 'bg-warning/20 text-warning'
        };
      case 'alert':
        return {
          bg: 'bg-loss/5',
          border: 'border-loss/20',
          icon: 'text-loss',
          badge: 'bg-loss/20 text-loss'
        };
      default:
        return {
          bg: 'bg-accent/5',
          border: 'border-accent/20',
          icon: 'text-accent',
          badge: 'bg-accent/20 text-accent'
        };
    }
  }

  onOpenDigest(): void {
    this.openDigest.emit();
  }

  onOpenChat(): void {
    this.chatService.open();
  }

  refreshInsights(): void {
    this.loadInsights();
  }
}
