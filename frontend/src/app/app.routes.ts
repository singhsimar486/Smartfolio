import { Routes } from '@angular/router';
import { Login } from './components/login/login';
import { Register } from './components/register/register';
import { Dashboard } from './components/dashboard/dashboard';
import { Holdings } from './components/holdings/holdings';
import { Sentiment } from './components/sentiment/sentiment';
import { Watchlist } from './components/watchlist/watchlist';
import { Alerts } from './components/alerts/alerts';
import { Transactions } from './components/transactions/transactions';
import { Gains } from './components/gains/gains';
import { Landing } from './components/landing/landing';
import { StockLookup } from './components/stock-lookup/stock-lookup';
import { authGuard } from './guards/auth.guard';

export const routes: Routes = [
  // Landing page for visitors
  { path: '', component: Landing },

  // Auth routes (public)
  { path: 'login', component: Login },
  { path: 'register', component: Register },

  // Protected routes (require login)
  { path: 'dashboard', component: Dashboard, canActivate: [authGuard] },
  { path: 'holdings', component: Holdings, canActivate: [authGuard] },
  { path: 'watchlist', component: Watchlist, canActivate: [authGuard] },
  { path: 'alerts', component: Alerts, canActivate: [authGuard] },
  { path: 'sentiment', component: Sentiment, canActivate: [authGuard] },
  { path: 'transactions', component: Transactions, canActivate: [authGuard] },
  { path: 'gains', component: Gains, canActivate: [authGuard] },
  { path: 'lookup', component: StockLookup, canActivate: [authGuard] },

  // Wildcard - redirect unknown routes to dashboard
  { path: '**', redirectTo: '/dashboard' }
];
