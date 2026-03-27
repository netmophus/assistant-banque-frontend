'use client';

import { useState, useEffect } from 'react';
import { apiClient } from '@/lib/api/client';

interface TabPermissionsResponse {
  allowed_tabs: string[];
}

export function useTabPermissions() {
  const [allowedTabs, setAllowedTabs] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchPermissions();
  }, []);

  const fetchPermissions = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get<TabPermissionsResponse>('/tab-permissions/user/allowed-tabs');
      setAllowedTabs(response.allowed_tabs || []);
      console.log('[useTabPermissions] Permissions chargées:', response.allowed_tabs);
    } catch (err: any) {
      console.error('[useTabPermissions] Erreur:', err);
      setError(err.message || 'Erreur lors du chargement des permissions');
    } finally {
      setLoading(false);
    }
  };

  const hasTabPermission = (tabId: string): boolean => {
    const hasPermission = allowedTabs.includes(tabId);
    console.log(`[useTabPermissions] Vérification ${tabId}: ${hasPermission} (autorisés: ${allowedTabs.join(', ')})`);
    return hasPermission;
  };

  return {
    allowedTabs,
    loading,
    error,
    hasTabPermission,
    refetch: fetchPermissions,
  };
}
