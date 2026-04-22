/**
 * API Auth - Gestion de l'authentification
 */

import { apiClient } from './client';
import { setLoggedInCookie, clearLoggedInCookie } from '@/lib/auth-cookie';

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  full_name: string;
  organization_name?: string;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
}

export interface User {
  id: string;
  email: string;
  full_name: string;
  role: string;
  organization_id?: string | null;
  organization_name?: string;
  department_id?: string | null;
  department_name?: string;
  service_id?: string | null;
  service_name?: string;
  role_departement?: string;
  is_active?: boolean;
  [key: string]: any;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  user: User;
}

export const authApi = {
  /**
   * Connexion
   */
  async login(credentials: LoginRequest): Promise<AuthResponse> {
    // 1. Se connecter et obtenir le token
    const tokenResponse = await apiClient.post<TokenResponse>(
      '/auth/login',
      credentials
    );
    
    // 2. Stocker le token temporairement pour pouvoir appeler /auth/me
    if (typeof window !== 'undefined' && tokenResponse.access_token) {
      localStorage.setItem('token', tokenResponse.access_token);
    }
    
    // 3. Récupérer les informations de l'utilisateur
    const user = await apiClient.get<User>('/auth/me');
    
    // 4. Stocker l'utilisateur
    if (typeof window !== 'undefined') {
      localStorage.setItem('user', JSON.stringify(user));
    }

    // 5. Poser le cookie partagé .miznas.co pour la redirection mobile
    //    (middleware.ts lit ce cookie pour rediriger www → app.miznas.co).
    setLoggedInCookie();

    return {
      access_token: tokenResponse.access_token,
      token_type: tokenResponse.token_type,
      user,
    };
  },

  /**
   * Inscription
   */
  async register(data: RegisterRequest): Promise<AuthResponse> {
    const response = await apiClient.post<AuthResponse>(
      '/auth/register',
      data
    );
    
    // Stocker le token
    if (typeof window !== 'undefined' && response.access_token) {
      localStorage.setItem('token', response.access_token);
      localStorage.setItem('user', JSON.stringify(response.user));
    }

    // Register connecte l'utilisateur — poser le cookie partagé
    setLoggedInCookie();

    return response;
  },

  /**
   * Déconnexion
   */
  logout(): void {
    // Supprimer le cookie partagé avant de nettoyer le localStorage pour
    // que le middleware de redirection ne reste pas actif sur www.miznas.co.
    clearLoggedInCookie();
    if (typeof window !== 'undefined') {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    }
  },

  /**
   * Récupérer l'utilisateur actuel depuis le localStorage
   */
  getCurrentUser(): User | null {
    if (typeof window !== 'undefined') {
      const userStr = localStorage.getItem('user');
      return userStr ? JSON.parse(userStr) : null;
    }
    return null;
  },

  /**
   * Récupérer l'utilisateur actuel depuis l'API
   */
  async fetchCurrentUser(): Promise<User> {
    return await apiClient.get<User>('/auth/me');
  },

  /**
   * Vérifier si l'utilisateur est connecté
   */
  isAuthenticated(): boolean {
    if (typeof window !== 'undefined') {
      return !!localStorage.getItem('token');
    }
    return false;
  },

  /**
   * Récupérer le token
   */
  getToken(): string | null {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('token');
    }
    return null;
  },
};

