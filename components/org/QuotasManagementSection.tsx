'use client';

import { useState, useEffect } from 'react';
import { apiClient } from '@/lib/api/client';
import ScrollReveal from '@/components/home/ScrollReveal';

interface User {
  id: string;
  email: string;
  full_name: string;
  role: string;
  department_id?: string;
  department_name?: string;
  service_id?: string;
  service_name?: string;
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

interface QuotaConfig {
  global_quota: number;
  default_user_quota: number;
  department_quotas: { department_id: string; quota: number }[];
  service_quotas: { service_id: string; quota: number }[];
  user_exceptions: { user_id: string; quota: number | null }[]; // null = illimité
}

interface QuotaStats {
  user_id: string;
  user_name: string;
  user_email: string;
  department_name?: string;
  service_name?: string;
  questions_asked: number;
  quota_limit: number;
  remaining_quota: number;
  is_exceeded: boolean;
}

const DEFAULT_CONFIG: QuotaConfig = {
  global_quota: 1000,
  default_user_quota: 60,
  department_quotas: [],
  service_quotas: [],
  user_exceptions: [],
};

export default function QuotasManagementSection() {
  const [config, setConfig] = useState<QuotaConfig>(DEFAULT_CONFIG);
  const [users, setUsers] = useState<User[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [stats, setStats] = useState<QuotaStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'config' | 'stats' | 'exceptions'>('config');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      // Récupérer les utilisateurs
      const usersRes = await apiClient.get<User[]>('/auth/users/org').catch(() => []);
      setUsers(Array.isArray(usersRes) ? usersRes : []);

      // Récupérer les départements
      const deptsRes = await apiClient.get<Department[]>('/departments').catch(() => []);
      setDepartments(Array.isArray(deptsRes) ? deptsRes : []);

      // Récupérer les services
      const servicesRes = await apiClient.get<Service[]>('/services').catch(() => []);
      setServices(Array.isArray(servicesRes) ? servicesRes : []);

      // Récupérer la configuration des quotas
      const configRes = await apiClient.get<QuotaConfig>('/ai-config/quotas-config').catch(() => DEFAULT_CONFIG);
      setConfig(configRes);

      // TODO: Récupérer les statistiques
      // const statsRes = await apiClient.get<QuotaStats[]>('/quotas/stats');
      // setStats(statsRes);
    } catch (err: any) {
      console.error('Erreur lors du chargement:', err);
      setError('Erreur lors du chargement des données');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      // Appeler l'endpoint backend pour sauvegarder la configuration des quotas
      await apiClient.put('/ai-config/quotas-config', config);
      
      setSuccess('Configuration enregistrée avec succès');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      console.error('Erreur lors de l\'enregistrement:', err);
      setError(err.message || 'Erreur lors de l\'enregistrement de la configuration');
    } finally {
      setSaving(false);
    }
  };

  const addDepartmentQuota = () => {
    if (departments.length === 0) return;
    const newDept = departments.find(d => !config.department_quotas.find(dq => dq.department_id === d.id));
    if (newDept) {
      setConfig({
        ...config,
        department_quotas: [...config.department_quotas, { department_id: newDept.id, quota: config.default_user_quota }],
      });
    }
  };

  const removeDepartmentQuota = (department_id: string) => {
    setConfig({
      ...config,
      department_quotas: config.department_quotas.filter(dq => dq.department_id !== department_id),
    });
  };

  const addServiceQuota = () => {
    if (services.length === 0) return;
    const newService = services.find(s => !config.service_quotas.find(sq => sq.service_id === s.id));
    if (newService) {
      setConfig({
        ...config,
        service_quotas: [...config.service_quotas, { service_id: newService.id, quota: config.default_user_quota }],
      });
    }
  };

  const removeServiceQuota = (service_id: string) => {
    setConfig({
      ...config,
      service_quotas: config.service_quotas.filter(sq => sq.service_id !== service_id),
    });
  };

  const addUserException = () => {
    if (users.length === 0) return;
    const newUser = users.find(u => !config.user_exceptions.find(ue => ue.user_id === u.id));
    if (newUser) {
      setConfig({
        ...config,
        user_exceptions: [...config.user_exceptions, { user_id: newUser.id, quota: config.default_user_quota }],
      });
    }
  };

  const removeUserException = (user_id: string) => {
    setConfig({
      ...config,
      user_exceptions: config.user_exceptions.filter(ue => ue.user_id !== user_id),
    });
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="flex flex-col items-center justify-center space-y-4">
          <svg className="animate-spin h-8 w-8 text-[#2563EB]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p className="text-[#CBD5E1]">Chargement des données...</p>
        </div>
      </div>
    );
  }

  return (
    <ScrollReveal direction="up" delay={0}>
      <div className="bg-gradient-to-br from-[#1a1f3a]/80 via-[#2563EB]/10 to-[#1a1f3a]/80 backdrop-blur-lg rounded-[28px] border border-[#2563EB]/30 p-8">
        <div className="mb-6">
          <h2 className="text-3xl font-black text-white mb-2">Gestion Quotas</h2>
          <p className="text-[#CBD5E1]">
            Configurez les quotas de questions mensuelles par utilisateur, département ou service.
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

        {/* Tabs */}
        <div className="mb-6">
          <div className="flex space-x-2 bg-white/5 rounded-xl p-1 border border-white/10">
            <button
              onClick={() => setActiveTab('config')}
              className={`flex-1 px-4 py-2 rounded-lg font-medium transition-all ${
                activeTab === 'config'
                  ? 'bg-gradient-to-r from-[#2563EB] via-[#7C3AED] to-[#F59E0B] text-white'
                  : 'text-[#CBD5E1] hover:text-white hover:bg-white/5'
              }`}
            >
              Configuration
            </button>
            <button
              onClick={() => setActiveTab('stats')}
              className={`flex-1 px-4 py-2 rounded-lg font-medium transition-all ${
                activeTab === 'stats'
                  ? 'bg-gradient-to-r from-[#2563EB] via-[#7C3AED] to-[#F59E0B] text-white'
                  : 'text-[#CBD5E1] hover:text-white hover:bg-white/5'
              }`}
            >
              Statistiques
            </button>
            <button
              onClick={() => setActiveTab('exceptions')}
              className={`flex-1 px-4 py-2 rounded-lg font-medium transition-all ${
                activeTab === 'exceptions'
                  ? 'bg-gradient-to-r from-[#2563EB] via-[#7C3AED] to-[#F59E0B] text-white'
                  : 'text-[#CBD5E1] hover:text-white hover:bg-white/5'
              }`}
            >
              Exceptions
            </button>
          </div>
        </div>

        {/* Configuration Tab */}
        {activeTab === 'config' && (
          <div className="space-y-8">
            {/* Quota Global */}
            <div>
              <h3 className="text-xl font-bold text-white mb-4">Quota Global de l'Organisation</h3>
              <p className="text-sm text-[#CBD5E1] mb-4">
                Nombre total de questions autorisées pour toute l'organisation par mois.
              </p>
              <div className="max-w-md">
                <input
                  type="number"
                  min="0"
                  value={config.global_quota}
                  onChange={(e) => setConfig({ ...config, global_quota: parseInt(e.target.value) || 0 })}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-[#CBD5E1] focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:border-transparent transition-all"
                />
                <p className="text-xs text-[#CBD5E1] mt-2">0 = illimité</p>
              </div>
            </div>

            {/* Quota par Défaut */}
            <div>
              <h3 className="text-xl font-bold text-white mb-4">Quota par Défaut par Utilisateur</h3>
              <p className="text-sm text-[#CBD5E1] mb-4">
                Quota mensuel appliqué par défaut à tous les utilisateurs (sauf exceptions).
              </p>
              <div className="max-w-md">
                <input
                  type="number"
                  min="0"
                  value={config.default_user_quota}
                  onChange={(e) => setConfig({ ...config, default_user_quota: parseInt(e.target.value) || 0 })}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-[#CBD5E1] focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:border-transparent transition-all"
                />
                <p className="text-xs text-[#CBD5E1] mt-2">Recommandé: 60 questions/mois</p>
              </div>
            </div>

            {/* Quotas par Département */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-white">Quotas par Département</h3>
                <button
                  onClick={addDepartmentQuota}
                  className="px-4 py-2 bg-[#2563EB]/20 hover:bg-[#2563EB]/30 text-[#2563EB] font-semibold rounded-lg border border-[#2563EB]/30 transition-all cursor-pointer"
                >
                  + Ajouter
                </button>
              </div>
              <p className="text-sm text-[#CBD5E1] mb-4">
                Définissez des quotas spécifiques pour certains départements.
              </p>
              <div className="space-y-3">
                {config.department_quotas.map((dq) => {
                  const dept = departments.find(d => d.id === dq.department_id);
                  return (
                    <div key={dq.department_id} className="flex items-center space-x-3 bg-white/5 p-4 rounded-xl border border-white/10">
                      <div className="flex-1">
                        <select
                          value={dq.department_id}
                          onChange={(e) => {
                            const newQuotas = config.department_quotas.map(q =>
                              q.department_id === dq.department_id
                                ? { ...q, department_id: e.target.value }
                                : q
                            );
                            setConfig({ ...config, department_quotas: newQuotas });
                          }}
                          className="w-full px-4 py-2 bg-[#1a1f3a] border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
                          style={{ backgroundColor: '#1a1f3a', color: '#ffffff' }}
                        >
                          {departments.map(d => (
                            <option key={d.id} value={d.id} style={{ backgroundColor: '#1a1f3a', color: '#ffffff' }}>
                              {d.name}
                            </option>
                          ))}
                        </select>
                      </div>
                      <input
                        type="number"
                        min="0"
                        value={dq.quota}
                        onChange={(e) => {
                          const newQuotas = config.department_quotas.map(q =>
                            q.department_id === dq.department_id
                              ? { ...q, quota: parseInt(e.target.value) || 0 }
                              : q
                          );
                          setConfig({ ...config, department_quotas: newQuotas });
                        }}
                        className="w-32 px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:border-transparent transition-all"
                        placeholder="Quota"
                      />
                      <button
                        onClick={() => removeDepartmentQuota(dq.department_id)}
                        className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 font-semibold rounded-lg border border-red-500/30 transition-all cursor-pointer"
                      >
                        Supprimer
                      </button>
                    </div>
                  );
                })}
                {config.department_quotas.length === 0 && (
                  <p className="text-sm text-[#CBD5E1] text-center py-4">Aucun quota par département configuré</p>
                )}
              </div>
            </div>

            {/* Quotas par Service */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-white">Quotas par Service</h3>
                <button
                  onClick={addServiceQuota}
                  className="px-4 py-2 bg-[#2563EB]/20 hover:bg-[#2563EB]/30 text-[#2563EB] font-semibold rounded-lg border border-[#2563EB]/30 transition-all cursor-pointer"
                >
                  + Ajouter
                </button>
              </div>
              <p className="text-sm text-[#CBD5E1] mb-4">
                Définissez des quotas spécifiques pour certains services.
              </p>
              <div className="space-y-3">
                {config.service_quotas.map((sq) => {
                  const service = services.find(s => s.id === sq.service_id);
                  return (
                    <div key={sq.service_id} className="flex items-center space-x-3 bg-white/5 p-4 rounded-xl border border-white/10">
                      <div className="flex-1">
                        <select
                          value={sq.service_id}
                          onChange={(e) => {
                            const newQuotas = config.service_quotas.map(q =>
                              q.service_id === sq.service_id
                                ? { ...q, service_id: e.target.value }
                                : q
                            );
                            setConfig({ ...config, service_quotas: newQuotas });
                          }}
                          className="w-full px-4 py-2 bg-[#1a1f3a] border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
                          style={{ backgroundColor: '#1a1f3a', color: '#ffffff' }}
                        >
                          {services.map(s => (
                            <option key={s.id} value={s.id} style={{ backgroundColor: '#1a1f3a', color: '#ffffff' }}>
                              {s.name}
                            </option>
                          ))}
                        </select>
                      </div>
                      <input
                        type="number"
                        min="0"
                        value={sq.quota}
                        onChange={(e) => {
                          const newQuotas = config.service_quotas.map(q =>
                            q.service_id === sq.service_id
                              ? { ...q, quota: parseInt(e.target.value) || 0 }
                              : q
                          );
                          setConfig({ ...config, service_quotas: newQuotas });
                        }}
                        className="w-32 px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:border-transparent transition-all"
                        placeholder="Quota"
                      />
                      <button
                        onClick={() => removeServiceQuota(sq.service_id)}
                        className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 font-semibold rounded-lg border border-red-500/30 transition-all cursor-pointer"
                      >
                        Supprimer
                      </button>
                    </div>
                  );
                })}
                {config.service_quotas.length === 0 && (
                  <p className="text-sm text-[#CBD5E1] text-center py-4">Aucun quota par service configuré</p>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex space-x-4 pt-6 border-t border-white/10">
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 px-6 py-3 bg-gradient-to-r from-[#2563EB] via-[#7C3AED] to-[#F59E0B] text-white font-semibold rounded-lg hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                {saving ? 'Enregistrement...' : 'Enregistrer la Configuration'}
              </button>
            </div>
          </div>
        )}

        {/* Statistics Tab */}
        {activeTab === 'stats' && (
          <div className="space-y-6">
            <div>
              <h3 className="text-xl font-bold text-white mb-4">Statistiques d'Utilisation</h3>
              <p className="text-sm text-[#CBD5E1] mb-4">
                Consultez l'utilisation des quotas pour le mois en cours.
              </p>
            </div>

            {stats.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-6xl mb-4">📊</div>
                <p className="text-[#CBD5E1] text-lg">Aucune statistique disponible</p>
                <p className="text-[#CBD5E1] text-sm mt-2">Les statistiques seront disponibles après la première question posée</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-white/10">
                      <th className="py-3 px-4 text-white font-semibold">Utilisateur</th>
                      <th className="py-3 px-4 text-white font-semibold">Département</th>
                      <th className="py-3 px-4 text-white font-semibold">Service</th>
                      <th className="py-3 px-4 text-white font-semibold">Utilisé</th>
                      <th className="py-3 px-4 text-white font-semibold">Limite</th>
                      <th className="py-3 px-4 text-white font-semibold">Restant</th>
                      <th className="py-3 px-4 text-white font-semibold">Statut</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.map((stat) => (
                      <tr key={stat.user_id} className="border-t border-white/10 hover:bg-white/5">
                        <td className="py-3 px-4 text-sm">
                          <div>
                            <p className="text-white font-semibold">{stat.user_name}</p>
                            <p className="text-[#CBD5E1] text-xs">{stat.user_email}</p>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-sm text-[#CBD5E1]">{stat.department_name || '-'}</td>
                        <td className="py-3 px-4 text-sm text-[#CBD5E1]">{stat.service_name || '-'}</td>
                        <td className="py-3 px-4 text-sm text-white font-semibold">{stat.questions_asked}</td>
                        <td className="py-3 px-4 text-sm text-white font-semibold">{stat.quota_limit === null ? '∞' : stat.quota_limit}</td>
                        <td className="py-3 px-4 text-sm text-white font-semibold">{stat.remaining_quota === null ? '∞' : stat.remaining_quota}</td>
                        <td className="py-3 px-4 text-sm">
                          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                            stat.is_exceeded
                              ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                              : stat.remaining_quota === null || stat.remaining_quota > 10
                              ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                              : 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
                          }`}>
                            {stat.is_exceeded ? 'Dépassé' : stat.remaining_quota === null || stat.remaining_quota > 10 ? 'OK' : 'Attention'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Exceptions Tab */}
        {activeTab === 'exceptions' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-xl font-bold text-white">Exceptions Utilisateurs</h3>
                <p className="text-sm text-[#CBD5E1] mt-2">
                  Définissez des quotas personnalisés ou illimités pour des utilisateurs spécifiques.
                </p>
              </div>
              <button
                onClick={addUserException}
                className="px-4 py-2 bg-[#2563EB]/20 hover:bg-[#2563EB]/30 text-[#2563EB] font-semibold rounded-lg border border-[#2563EB]/30 transition-all cursor-pointer"
              >
                + Ajouter Exception
              </button>
            </div>

            <div className="space-y-3">
              {config.user_exceptions.map((ue) => {
                const user = users.find(u => u.id === ue.user_id);
                return (
                  <div key={ue.user_id} className="flex items-center space-x-3 bg-white/5 p-4 rounded-xl border border-white/10">
                    <div className="flex-1">
                      <select
                        value={ue.user_id}
                        onChange={(e) => {
                          const newExceptions = config.user_exceptions.map(ex =>
                            ex.user_id === ue.user_id
                              ? { ...ex, user_id: e.target.value }
                              : ex
                          );
                          setConfig({ ...config, user_exceptions: newExceptions });
                        }}
                        className="w-full px-4 py-2 bg-[#1a1f3a] border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
                        style={{ backgroundColor: '#1a1f3a', color: '#ffffff' }}
                      >
                        {users.map(u => (
                          <option key={u.id} value={u.id} style={{ backgroundColor: '#1a1f3a', color: '#ffffff' }}>
                            {u.full_name} ({u.email})
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="flex items-center space-x-2">
                      <label className="flex items-center space-x-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={ue.quota === null}
                          onChange={(e) => {
                            const newExceptions = config.user_exceptions.map(ex =>
                              ex.user_id === ue.user_id
                                ? { ...ex, quota: e.target.checked ? null : config.default_user_quota }
                                : ex
                            );
                            setConfig({ ...config, user_exceptions: newExceptions });
                          }}
                          className="w-4 h-4 rounded border-white/20 bg-white/5 text-[#2563EB] focus:ring-2 focus:ring-[#2563EB] cursor-pointer"
                        />
                        <span className="text-sm text-white">Illimité</span>
                      </label>
                    </div>
                    {ue.quota !== null && (
                      <input
                        type="number"
                        min="0"
                        value={ue.quota}
                        onChange={(e) => {
                          const newExceptions = config.user_exceptions.map(ex =>
                            ex.user_id === ue.user_id
                              ? { ...ex, quota: parseInt(e.target.value) || 0 }
                              : ex
                          );
                          setConfig({ ...config, user_exceptions: newExceptions });
                        }}
                        className="w-32 px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:border-transparent transition-all"
                        placeholder="Quota"
                      />
                    )}
                    <button
                      onClick={() => removeUserException(ue.user_id)}
                      className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 font-semibold rounded-lg border border-red-500/30 transition-all cursor-pointer"
                    >
                      Supprimer
                    </button>
                  </div>
                );
              })}
              {config.user_exceptions.length === 0 && (
                <p className="text-sm text-[#CBD5E1] text-center py-4">Aucune exception configurée</p>
              )}
            </div>
          </div>
        )}
      </div>
    </ScrollReveal>
  );
}

