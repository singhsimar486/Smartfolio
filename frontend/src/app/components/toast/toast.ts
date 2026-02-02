import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ToastService, Toast } from '../../services/toast';

@Component({
  selector: 'app-toast',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './toast.html',
})
export class ToastContainer {
  private toastService = inject(ToastService);
  toasts$ = this.toastService.toasts$;

  dismiss(id: string): void {
    this.toastService.dismiss(id);
  }

  getIcon(type: string): string {
    switch (type) {
      case 'success':
        return 'M5 13l4 4L19 7';
      case 'error':
        return 'M6 18L18 6M6 6l12 12';
      case 'alert':
        return 'M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9';
      default:
        return 'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z';
    }
  }

  getColorClasses(type: string): { bg: string; border: string; icon: string } {
    switch (type) {
      case 'success':
        return { bg: 'bg-gain/10', border: 'border-gain/50', icon: 'text-gain' };
      case 'error':
        return { bg: 'bg-loss/10', border: 'border-loss/50', icon: 'text-loss' };
      case 'alert':
        return { bg: 'bg-accent/10', border: 'border-accent/50', icon: 'text-accent' };
      default:
        return { bg: 'bg-white/10', border: 'border-white/20', icon: 'text-white' };
    }
  }

  trackByToastId(index: number, toast: Toast): string {
    return toast.id;
  }
}
