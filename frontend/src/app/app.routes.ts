import { Routes } from '@angular/router';
import { Login } from './components/login/login';
import { Register } from './components/register/register';
import { Dashboard } from './components/dashboard/dashboard';
import { Holdings } from './components/holdings/holdings';
import { Sentiment } from './components/sentiment/sentiment';
import { Watchlist } from './components/watchlist/watchlist';
import { Alerts } from './components/alerts/alerts';
import { authGuard } from './guards/auth.guard';

export const routes: Routes = [
  // Default route - redirect to dashboard
  { path: '', redirectTo: '/dashboard', pathMatch: 'full' },

  // Auth routes (public)
  { path: 'login', component: Login },
  { path: 'register', component: Register },

  // Protected routes (require login)
  { path: 'dashboard', component: Dashboard, canActivate: [authGuard] },
  { path: 'holdings', component: Holdings, canActivate: [authGuard] },
  { path: 'watchlist', component: Watchlist, canActivate: [authGuard] },
  { path: 'alerts', component: Alerts, canActivate: [authGuard] },
  { path: 'sentiment', component: Sentiment, canActivate: [authGuard] },

  // Wildcard - redirect unknown routes to dashboard
  { path: '**', redirectTo: '/dashboard' }
];
