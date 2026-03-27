/**
 * API Client pour communiquer avec le backend FastAPI
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export interface ApiError {
  detail: string | { [key: string]: any };
}

export class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string = API_URL) {
    this.baseUrl = baseUrl.replace(/\/+$/, '');
  }

  /**
   * Effectue une requête HTTP avec gestion des erreurs
   */
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    
    // Récupérer le token depuis le localStorage ou les cookies
    const token = typeof window !== 'undefined' 
      ? localStorage.getItem('token') 
      : null;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string> | undefined),
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    try {
      // Créer un AbortController pour le timeout (180 secondes pour les opérations longues)
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 180000); // 180 secondes
      
      const response = await fetch(url, {
        ...options,
        headers,
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData: ApiError = await response.json().catch(() => ({
          detail: response.statusText,
        }));
        throw new Error(
          typeof errorData.detail === 'string'
            ? errorData.detail
            : JSON.stringify(errorData.detail)
        );
      }

      // Si la réponse est vide (204 No Content)
      if (response.status === 204) {
        return {} as T;
      }

      return await response.json();
    } catch (error) {
      if (error instanceof Error) {
        // Si c'est une erreur d'abort (timeout)
        if (error.name === 'AbortError') {
          throw new Error('La requête a pris trop de temps. Veuillez réessayer.');
        }
        throw error;
      }
      throw new Error('Une erreur inattendue est survenue');
    }
  }

  /**
   * GET request
   */
  async get<T>(endpoint: string, options?: RequestInit): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'GET',
    });
  }

  /**
   * POST request
   */
  async post<T>(
    endpoint: string,
    data?: any,
    options?: RequestInit
  ): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  /**
   * PUT request
   */
  async put<T>(
    endpoint: string,
    data?: any,
    options?: RequestInit
  ): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  /**
   * PATCH request
   */
  async patch<T>(
    endpoint: string,
    data?: any,
    options?: RequestInit
  ): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'PATCH',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  /**
   * DELETE request
   */
  async delete<T>(endpoint: string, options?: RequestInit): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'DELETE',
    });
  }

  /**
   * Upload file (multipart/form-data)
   */
  async uploadFile<T>(
    endpoint: string,
    file: File,
    additionalData?: { [key: string]: string },
    options?: RequestInit
  ): Promise<T> {
    const formData = new FormData();
    formData.append('file', file);
    
    if (additionalData) {
      Object.entries(additionalData).forEach(([key, value]) => {
        formData.append(key, value);
      });
    }

    const token = typeof window !== 'undefined' 
      ? localStorage.getItem('token') 
      : null;

    const headers: Record<string, string> = {
      ...((options?.headers as Record<string, string> | undefined) || {}),
    };

    // Ne pas définir Content-Type manuellement pour FormData
    // Le navigateur le définira automatiquement avec le boundary
    delete (headers as any)['Content-Type'];
    delete (headers as any)['content-type'];

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const url = `${this.baseUrl}${endpoint}`;

    try {
      const response = await fetch(url, {
        ...options,
        method: 'POST',
        headers,
        body: formData,
      });

      if (!response.ok) {
        let errorData: ApiError;
        try {
          errorData = await response.json();
        } catch {
          errorData = { detail: response.statusText || `Erreur HTTP ${response.status}` };
        }
        
        const errorMessage = typeof errorData.detail === 'string'
          ? errorData.detail
          : JSON.stringify(errorData.detail);
        
        const error = new Error(errorMessage);
        (error as any).detail = errorData.detail;
        (error as any).status = response.status;
        throw error;
      }

      return await response.json();
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Une erreur inattendue est survenue');
    }
  }
}

// Instance singleton
export const apiClient = new ApiClient();

