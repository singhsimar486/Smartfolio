import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { ApiService, AllocationResponse, SectorAllocation, HoldingAllocation } from '../../services/api';
import { AuthService } from '../../services/auth';
import { Navbar } from '../navbar/navbar';

@Component({
  selector: 'app-allocation',
  standalone: true,
  imports: [CommonModule, Navbar],
  templateUrl: './allocation.html',
})
export class Allocation implements OnInit {
  allocation: AllocationResponse | null = null;
  isLoading: boolean = true;
  errorMessage: string = '';

  // Chart colors
  colors = [
    '#22c55e', // green
    '#3b82f6', // blue
    '#f59e0b', // yellow
    '#ef4444', // red
    '#8b5cf6', // purple
    '#06b6d4', // cyan
    '#ec4899', // pink
    '#f97316', // orange
    '#84cc16', // lime
    '#6366f1', // indigo
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
    this.loadAllocation();
  }

  loadAllocation(): void {
    this.isLoading = true;
    this.apiService.getAllocation().subscribe({
      next: (data: AllocationResponse) => {
        this.allocation = data;
        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.isLoading = false;
        this.errorMessage = 'Failed to load allocation data';
        this.cdr.detectChanges();
      }
    });
  }

  formatCurrency(value: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  }

  getColor(index: number): string {
    return this.colors[index % this.colors.length];
  }

  // Generate SVG pie chart path
  getSectorPath(sectors: SectorAllocation[], index: number): string {
    if (!sectors || sectors.length === 0) return '';

    let startAngle = 0;
    for (let i = 0; i < index; i++) {
      startAngle += (sectors[i].percentage / 100) * 360;
    }

    const angle = (sectors[index].percentage / 100) * 360;
    const endAngle = startAngle + angle;

    const startRad = (startAngle - 90) * (Math.PI / 180);
    const endRad = (endAngle - 90) * (Math.PI / 180);

    const x1 = 50 + 45 * Math.cos(startRad);
    const y1 = 50 + 45 * Math.sin(startRad);
    const x2 = 50 + 45 * Math.cos(endRad);
    const y2 = 50 + 45 * Math.sin(endRad);

    const largeArc = angle > 180 ? 1 : 0;

    if (angle >= 359.9) {
      // Full circle
      return `M 50 5 A 45 45 0 1 1 49.99 5 Z`;
    }

    return `M 50 50 L ${x1} ${y1} A 45 45 0 ${largeArc} 1 ${x2} ${y2} Z`;
  }

  getRecommendationIcon(rec: string): string {
    if (rec.startsWith('✅')) return '✅';
    if (rec.startsWith('⚠️')) return '⚠️';
    if (rec.startsWith('📊')) return '📊';
    if (rec.startsWith('💡')) return '💡';
    if (rec.startsWith('📈')) return '📈';
    return '💡';
  }

  getRecommendationText(rec: string): string {
    // Remove emoji prefix if present
    return rec.replace(/^[✅⚠️📊💡📈]\s*/, '');
  }

  getRecommendationClass(rec: string): string {
    if (rec.startsWith('✅')) return 'border-gain/30 bg-gain/5';
    if (rec.startsWith('⚠️')) return 'border-warning/30 bg-warning/5';
    return 'border-accent/30 bg-accent/5';
  }
}
