/**
 * Configuration de l'application
 */

export const config = {
  apiUrl: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000',
  
  // Vérifier que l'URL de l'API est définie
  getApiUrl: () => {
    const url = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
    if (!url) {
      console.warn('NEXT_PUBLIC_API_URL n\'est pas définie, utilisation de la valeur par défaut');
    }
    return url;
  },
};

