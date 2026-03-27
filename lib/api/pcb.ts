/**
 * API pour les endpoints PCB
 * Wrapper autour de apiClient pour une interface similaire à axios
 */
import { apiClient } from './client';

// Interface similaire à axios pour faciliter la migration
const api = {
  get: async <T = any>(url: string, config?: { params?: any }): Promise<{ data: T }> => {
    let fullUrl = url;
    if (config?.params) {
      const params = new URLSearchParams();
      Object.entries(config.params).forEach(([key, value]) => {
        if (value !== null && value !== undefined && value !== '') {
          params.append(key, String(value));
        }
      });
      fullUrl = `${url}${url.includes('?') ? '&' : '?'}${params.toString()}`;
    }
    const data = await apiClient.get<T>(fullUrl);
    return { data };
  },

  post: async <T = any>(
    url: string,
    data?: any,
    config?: { headers?: any; params?: any }
  ): Promise<{ data: T }> => {
    let fullUrl = url;
    if (config?.params) {
      const params = new URLSearchParams();
      Object.entries(config.params).forEach(([key, value]) => {
        if (value !== null && value !== undefined && value !== '') {
          params.append(key, String(value));
        }
      });
      fullUrl = `${url}${url.includes('?') ? '&' : '?'}${params.toString()}`;
    }

    // Si c'est FormData, utiliser uploadFile
    if (data instanceof FormData) {
      const additionalData: { [key: string]: string } = {};
      // Extraire les données supplémentaires du FormData si nécessaire
      const formDataObj: any = {};
      data.forEach((value, key) => {
        if (value instanceof File) {
          formDataObj[key] = value;
        } else {
          additionalData[key] = value as string;
        }
      });

      // Pour l'upload de fichier, on doit utiliser uploadFile
      const file = formDataObj.file;
      if (file) {
        const result = await apiClient.uploadFile<T>(fullUrl, file, additionalData, {
          headers: config?.headers,
        });
        return { data: result };
      }
    }

    const result = await apiClient.post<T>(fullUrl, data, {
      headers: config?.headers,
    });
    return { data: result };
  },

  put: async <T = any>(url: string, data?: any, config?: { headers?: any }): Promise<{ data: T }> => {
    const result = await apiClient.put<T>(url, data, {
      headers: config?.headers,
    });
    return { data: result };
  },

  patch: async <T = any>(
    url: string,
    data?: any,
    config?: { headers?: any; params?: any }
  ): Promise<{ data: T }> => {
    let fullUrl = url;
    if (config?.params) {
      const params = new URLSearchParams();
      Object.entries(config.params).forEach(([key, value]) => {
        if (value !== null && value !== undefined && value !== '') {
          params.append(key, String(value));
        }
      });
      fullUrl = `${url}${url.includes('?') ? '&' : '?'}${params.toString()}`;
    }
    const result = await apiClient.patch<T>(fullUrl, data, {
      headers: config?.headers,
    });
    return { data: result };
  },

  delete: async <T = any>(url: string, config?: { headers?: any }): Promise<{ data: T }> => {
    const result = await apiClient.delete<T>(url, {
      headers: config?.headers,
    });
    return { data: result };
  },
};

export default api;

