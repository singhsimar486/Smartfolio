import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export interface Toast {
  id: string;
  type: 'success' | 'error' | 'alert';
  title: string;
  message: string;
}

@Injectable({
  providedIn: 'root'
})
export class ToastService {
  private toastsSubject = new BehaviorSubject<Toast[]>([]);
  toasts$ = this.toastsSubject.asObservable();

  private generateId(): string {
    return Math.random().toString(36).substring(2, 9);
  }

  show(type: 'success' | 'error' | 'alert', title: string, message: string, duration: number = 5000): void {
    const id = this.generateId();
    const toast: Toast = { id, type, title, message };

    const currentToasts = this.toastsSubject.value;
    this.toastsSubject.next([...currentToasts, toast]);

    if (duration > 0) {
      setTimeout(() => this.dismiss(id), duration);
    }
  }

  dismiss(id: string): void {
    const currentToasts = this.toastsSubject.value;
    this.toastsSubject.next(currentToasts.filter(t => t.id !== id));
  }

  showSuccess(title: string, message: string, duration: number = 5000): void {
    this.show('success', title, message, duration);
  }

  showError(title: string, message: string, duration: number = 5000): void {
    this.show('error', title, message, duration);
  }

  showAlert(ticker: string, condition: string, targetPrice: number, currentPrice: number): void {
    const conditionText = condition === 'ABOVE' ? 'above' : 'below';
    const title = `${ticker} Alert Triggered`;
    const message = `Price hit $${currentPrice.toFixed(2)} (target: ${conditionText} $${targetPrice.toFixed(2)})`;
    this.show('alert', title, message, 8000);
  }
}
