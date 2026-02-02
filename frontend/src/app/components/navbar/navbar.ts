import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../services/auth';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  templateUrl: './navbar.html',
  styleUrl: './navbar.css',
})
export class Navbar {
  constructor(public authService: AuthService) {}

  logout(): void {
    this.authService.logout();
  }

  getUserInitial(): string {
    const user = this.authService.currentUserValue;
    if (user?.email) {
      return user.email.charAt(0).toUpperCase();
    }
    return 'U';
  }

  getUserName(): string {
    const user = this.authService.currentUserValue;
    if (user?.email) {
      return user.email.split('@')[0];
    }
    return 'User';
  }
}
