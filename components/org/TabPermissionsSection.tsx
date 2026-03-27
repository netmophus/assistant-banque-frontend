'use client';

import { useState, useEffect } from 'react';
import { apiClient } from '@/lib/api/client';
import ScrollReveal from '@/components/home/ScrollReveal';

interface Tab {
  id: string;
  name: string;
  icon: string;
}

interface TabPermissionRule {
  rule_type?: 'SEGMENT' | 'USER';
  department_id?: string;
  service_id?: string;
  role_departement?: string;
  user_id?: string;
}

interface TabConfig {
  tab_id: string;
  enabled: boolean;
  rules: TabPermissionRule[];
}

interface TabPermissionsConfig {
  organization_id: string;
  tabs: TabConfig[];
}

interface User {
  id: string;
  email: string;
  full_name: string;
  role: string;
  department_id?: string;
  service_id?: string;
}

interface Department {
  id: string;
  name: string;
}

interface Service {
  id: string;
  name: string;
  department_id: string;
}

export default function TabPermissionsSection() {
  const [availableTabs, setAvailableTabs] = useState<Tab[]>([]);
  const [config, setConfig] = useState<TabPermissionsConfig | null>(null);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [editingTab, setEditingTab] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      // Définir les 5 modules essentiels
      const essentialTabs: Tab[] = [
        { id: 'questions', name: 'Base de Connaissances & IA', icon: '📚' },
        { id: 'credit', name: 'Analyse de Dossier de Crédit', icon: '💳' },
        { id: 'pcb', name: 'PCB & Ratios', icon: '📊' },
        { id: 'impayes', name: 'Gestion des Impayés', icon: '💸' },
        { id: 'formations', name: 'Modules de Formation', icon: '📚' }
      ];
      setAvailableTabs(essentialTabs);

      // Récupérer la configuration actuelle
      const configRes = await apiClient.get<TabPermissionsConfig>('/tab-permissions/organization');
      setConfig(configRes);

      // Récupérer les départements
      const deptsRes = await apiClient.get<Department[]>('/departments').catch(() => []);
      setDepartments(Array.isArray(deptsRes) ? deptsRes : []);
    } catch (err: any) {
      console.error('Erreur lors du chargement:', err);
      setError('Erreur lors du chargement des données');
    } finally {
      setLoading(false);
    }
  };

  const getTabConfig = (tabId: string): TabConfig => {
    if (!config) {
      return { tab_id: tabId, enabled: false, rules: [] };
    }
    return config.tabs.find(t => t.tab_id === tabId) || { tab_id: tabId, enabled: false, rules: [] };
  };

  const toggleTab = async (tabId: string, enabled: boolean) => {
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const currentConfig = getTabConfig(tabId);
      await apiClient.put(`/tab-permissions/organization/tab/${tabId}`, {
        enabled,
        rules: currentConfig.rules,
      });
      
      setSuccess(`Onglet ${enabled ? 'activé' : 'désactivé'} avec succès`);
      setTimeout(() => setSuccess(null), 3000);
      fetchData();
    } catch (err: any) {
      console.error('Erreur lors de la mise à jour:', err);
      setError(err.message || 'Erreur lors de la mise à jour');
    } finally {
      setSaving(false);
    }
  };

  const addRule = (tabId: string) => {
    const currentConfig = getTabConfig(tabId);
    const newRule: TabPermissionRule = { 
      rule_type: 'SEGMENT',
      department_id: departments[0]?.id || ''
    };
    
    updateTabRules(tabId, [...currentConfig.rules, newRule]);
  };

  const removeRule = (tabId: string, ruleIndex: number) => {
    const currentConfig = getTabConfig(tabId);
    const newRules = currentConfig.rules.filter((_, idx) => idx !== ruleIndex);
    updateTabRules(tabId, newRules);
  };

  const updateRule = (tabId: string, ruleIndex: number, updatedRule: TabPermissionRule) => {
    const currentConfig = getTabConfig(tabId);
    const newRules = [...currentConfig.rules];
    newRules[ruleIndex] = updatedRule;
    updateTabRules(tabId, newRules);
  };

  const updateTabRules = async (tabId: string, rules: TabPermissionRule[]) => {
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const currentConfig = getTabConfig(tabId);
      await apiClient.put(`/tab-permissions/organization/tab/${tabId}`, {
        enabled: currentConfig.enabled,
        rules,
      });
      
      setSuccess('Règles mises à jour avec succès');
      setTimeout(() => setSuccess(null), 3000);
      fetchData();
    } catch (err: any) {
      console.error('Erreur lors de la mise à jour:', err);
      setError(err.message || 'Erreur lors de la mise à jour');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="flex flex-col items-center justify-center space-y-4">
          <svg className="animate-spin h-8 w-8 text-[#2563EB]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p className="text-[#CBD5E1]">Chargement des permissions...</p>
        </div>
      </div>
    );
  }

  return (
    <ScrollReveal direction="up" delay={0}>
      <div className="bg-gradient-to-br from-[#1a1f3a]/80 via-[#2563EB]/10 to-[#1a1f3a]/80 backdrop-blur-lg rounded-[28px] border border-[#2563EB]/30 p-8">
        <div className="mb-6">
          <h2 className="text-3xl font-black text-white mb-2">Permissions Onglets</h2>
          <p className="text-[#CBD5E1]">
            Configurez quels onglets sont visibles pour vos utilisateurs selon leur département.
          </p>
          <p className="text-sm text-[#CBD5E1] mt-2">
            <strong>Mode OPT-IN :</strong> Un onglet doit être explicitement activé pour être visible. Si aucune règle n'est définie, seuls les admins y ont accès.
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}

        {success && (
          <div className="mb-6 p-4 bg-green-500/10 border border-green-500/30 rounded-lg">
            <p className="text-green-400 text-sm">{success}</p>
          </div>
        )}

        <div className="space-y-6">
          {availableTabs.map((tab) => {
            const tabConfig = getTabConfig(tab.id);
            const isExpanded = editingTab === tab.id;

            return (
              <div
                key={tab.id}
                className={`bg-white/5 rounded-xl border transition-all ${
                  tabConfig.enabled
                    ? 'border-[#2563EB]/40 bg-[#2563EB]/10'
                    : 'border-white/10'
                }`}
              >
                <div className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <span className="text-2xl">{tab.icon}</span>
                      <div>
                        <h3 className="text-lg font-bold text-white">{tab.name}</h3>
                        <p className="text-xs text-[#CBD5E1]">
                          {tabConfig.enabled
                            ? `${tabConfig.rules.length} règle(s) configurée(s)`
                            : 'Onglet désactivé'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <label className="flex items-center space-x-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={tabConfig.enabled}
                          onChange={(e) => toggleTab(tab.id, e.target.checked)}
                          disabled={saving}
                          className="w-5 h-5 rounded border-white/20 bg-white/5 text-[#2563EB] focus:ring-2 focus:ring-[#2563EB] cursor-pointer"
                        />
                        <span className="text-sm text-white font-semibold">
                          {tabConfig.enabled ? 'Activé' : 'Désactivé'}
                        </span>
                      </label>
                      <button
                        onClick={() => setEditingTab(isExpanded ? null : tab.id)}
                        className="px-4 py-2 bg-white/5 hover:bg-white/10 text-white font-semibold rounded-lg border border-white/10 transition-all cursor-pointer"
                      >
                        {isExpanded ? 'Masquer' : 'Configurer'}
                      </button>
                    </div>
                  </div>

                  {isExpanded && tabConfig.enabled && (
                    <div className="mt-6 pt-6 border-t border-white/10">
                      <div className="flex items-center justify-between mb-4">
                        <h4 className="text-md font-bold text-white">Règles d'Accès par Département</h4>
                        <button
                          onClick={() => addRule(tab.id)}
                          className="px-3 py-1.5 bg-[#2563EB]/20 hover:bg-[#2563EB]/30 text-[#2563EB] font-semibold rounded-lg border border-[#2563EB]/30 transition-all cursor-pointer text-sm"
                        >
                          + Ajouter une règle
                        </button>
                      </div>

                      {tabConfig.rules.length === 0 ? (
                        <div className="text-center py-8 bg-white/5 rounded-lg border border-white/10">
                          <p className="text-[#CBD5E1] text-sm mb-2">Aucune règle configurée</p>
                          <p className="text-xs text-[#CBD5E1]">
                            Sans règles, seuls les admins ont accès à cet onglet
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {tabConfig.rules.map((rule, ruleIndex) => (
                            <div
                              key={ruleIndex}
                              className="bg-white/5 p-4 rounded-lg border border-white/10"
                            >
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <div>
                                    <label className="block text-xs font-semibold text-white mb-2">
                                      Département *
                                    </label>
                                    <select
                                      value={rule.department_id || ''}
                                      onChange={(e) =>
                                        updateRule(tab.id, ruleIndex, {
                                          ...rule,
                                          department_id: e.target.value || undefined,
                                        })
                                      }
                                      className="w-full px-3 py-2 bg-[#1a1f3a] border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
                                      style={{ backgroundColor: '#1a1f3a', color: '#ffffff' }}
                                    >
                                      <option value="" style={{ backgroundColor: '#1a1f3a', color: '#ffffff' }}>
                                        Sélectionner un département
                                      </option>
                                      {departments.map((d) => (
                                        <option
                                          key={d.id}
                                          value={d.id}
                                          style={{ backgroundColor: '#1a1f3a', color: '#ffffff' }}
                                        >
                                          {d.name}
                                        </option>
                                      ))}
                                    </select>
                                  </div>
                                </div>
                                <button
                                  onClick={() => removeRule(tab.id, ruleIndex)}
                                  className="ml-4 px-3 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 font-semibold rounded-lg border border-red-500/30 transition-all cursor-pointer"
                                >
                                  Supprimer
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </ScrollReveal>
  );
}

