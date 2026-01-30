import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, tap } from 'rxjs';
import { Router } from '@angular/router';

/**
 * Interface defining what a User looks like
 * This matches what our backend returns
 */
export interface User {
  id: string;
  email: string;
  is_active: boolean;
  created_at: string;
}

/**
 * Interface for login response
 * Backend returns a JWT token
 */
export interface AuthResponse {
  access_token: string;
  token_type: string;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  
  private apiUrl = 'http://127.0.0.1:8000';
  
  private currentUserSubject = new BehaviorSubject<User | null>(null);
  
  public currentUser$ = this.currentUserSubject.asObservable();

  constructor(
    private http: HttpClient,
    private router: Router
  ) {
    this.loadStoredUser();
  }

  private loadStoredUser(): void {
    const token = localStorage.getItem('access_token');
    if (token) {
      this.getCurrentUser().subscribe({
        next: (user) => this.currentUserSubject.next(user),
        error: () => this.logout()
      });
    }
  }

  register(email: string, password: string): Observable<User> {
    return this.http.post<User>(`${this.apiUrl}/auth/register`, {
      email,
      password
    });
  }

  login(email: string, password: string): Observable<AuthResponse> {
    const formData = new FormData();
    formData.append('username', email);
    formData.append('password', password);

    return this.http.post<AuthResponse>(`${this.apiUrl}/auth/login`, formData)
      .pipe(
        tap(response => {
          localStorage.setItem('access_token', response.access_token);
          
          this.getCurrentUser().subscribe(user => {
            this.currentUserSubject.next(user);
          });
        })
      );
  }

  getCurrentUser(): Observable<User> {
    return this.http.get<User>(`${this.apiUrl}/auth/me`);
  }

  logout(): void {
    localStorage.removeItem('access_token');
    this.currentUserSubject.next(null);
    this.router.navigate(['/login']);
  }

  isLoggedIn(): boolean {
    return !!localStorage.getItem('access_token');
  }

  getToken(): string | null {
    return localStorage.getItem('access_token');
  }
}