import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './register.html',
  styleUrl: './register.css',
})
export class Register {
  email: string = '';
  password: string = '';
  confirmPassword: string = '';
  errorMessage: string = '';
  isLoading: boolean = false;

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  onSubmit(): void {
    this.errorMessage = '';

    if (!this.email || !this.password || !this.confirmPassword) {
      this.errorMessage = 'Please fill in all fields';
      return;
    }

    if (this.password !== this.confirmPassword) {
      this.errorMessage = 'Passwords do not match';
      return;
    }

    if (this.password.length < 8) {
      this.errorMessage = 'Password must be at least 8 characters';
      return;
    }

    this.isLoading = true;

    this.authService.register(this.email, this.password).subscribe({
      next: () => {
        // Registration successful - now log them in
        this.authService.login(this.email, this.password).subscribe({
          next: () => {
            this.router.navigate(['/dashboard']);
          },
          error: () => {
            // Registration worked but login failed - send to login page
            this.router.navigate(['/login']);
          }
        });
      },
      error: (error) => {
        this.isLoading = false;
        if (error.status === 400) {
          this.errorMessage = 'Email already registered';
        } else {
          this.errorMessage = 'Something went wrong. Please try again.';
        }
      }
    });
  }
}
