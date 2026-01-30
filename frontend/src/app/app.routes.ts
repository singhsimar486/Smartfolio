import { Routes } from '@angular/router';
import { Login } from './components/login/login';
import { Register } from './components/register/register';
import { Dashboard } from './components/dashboard/dashboard';
import { Holdings } from './components/holdings/holdings';
import { Sentiment } from './components/sentiment/sentiment';

export const routes: Routes = [
  // Default route - redirect to dashboard
  { path: '', redirectTo: '/dashboard', pathMatch: 'full' },
  
  // Auth routes (public)
  { path: 'login', component: Login },
  { path: 'register', component: Register },
  
  // Protected routes (require login)
  { path: 'dashboard', component: Dashboard },
  { path: 'holdings', component: Holdings },
  { path: 'sentiment', component: Sentiment },
  
  // Wildcard - redirect unknown routes to dashboard
  { path: '**', redirectTo: '/dashboard' }
];