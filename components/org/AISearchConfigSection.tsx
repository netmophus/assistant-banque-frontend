'use client';

import { useState, useEffect } from 'react';
import { apiClient } from '@/lib/api/client';
import ScrollReveal from '@/components/home/ScrollReveal';

interface AISearchConfig {
  source_priority: string[]; // ['ORG', 'GLOBAL', 'AI']
  org_limit: number;
  global_limit: number;
  min_similarity_score: number;
  enable_global: boolean;
  enable_ai_fallback: boolean;
  filter_by_category: boolean;
  filter_by_department: boolean;
}


const DEFAULT_CONFIG: AISearchConfig = {
  source_priority: ['ORG', 'GLOBAL', 'AI'],
  org_limit: 5,
  global_limit: 3,
  min_similarity_score: 0.7,
  enable_global: true,
  enable_ai_fallback: true,
  filter_by_category: false,
  filter_by_department: false,
};

export default function AISearchConfigSection() {
  const [config, setConfig] = useState<AISearchConfig>(DEFAULT_CONFIG);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiClient.get<AISearchConfig>('/ai-config/search-config');
      setConfig(response);
    } catch (err: any) {
      console.error('Erreur lors du chargement de la configuration:', err);
      setConfig(DEFAULT_CONFIG);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      await apiClient.put('/ai-config/search-config', config);
      setSuccess('Configuration enregistrée avec succès');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      console.error('Erreur lors de l\'enregistrement:', err);
      setError(err.message || 'Erreur lors de l\'enregistrement de la configuration');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setConfig(DEFAULT_CONFIG);
    setError(null);
    setSuccess(null);
  };

  const moveSource = (index: number, direction: 'up' | 'down') => {
    const newPriority = [...config.source_priority];
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    
    if (newIndex < 0 || newIndex >= newPriority.length) return;
    
    [newPriority[index], newPriority[newIndex]] = [newPriority[newIndex], newPriority[index]];
    setConfig({ ...config, source_priority: newPriority });
  };

  const getSourceLabel = (source: string) => {
    const labels: Record<string, string> = {
      'ORG': '📁 Documents Organisationnels',
      'GLOBAL': '🌐 Base de Connaissances Globale',
      'AI': '🤖 Connaissance IA (Fallback)',
    };
    return labels[source] || source;
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="flex flex-col items-center justify-center space-y-4">
          <svg className="animate-spin h-8 w-8 text-[#2563EB]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p className="text-[#CBD5E1]">Chargement de la configuration...</p>
        </div>
      </div>
    );
  }

  return (
    <ScrollReveal direction="up" delay={0}>
      <div className="bg-gradient-to-br from-[#1a1f3a]/80 via-[#2563EB]/10 to-[#1a1f3a]/80 backdrop-blur-lg rounded-[28px] border border-[#2563EB]/30 p-8">
        <div className="mb-6">
          <h2 className="text-3xl font-black text-white mb-2">Configuration Recherche IA</h2>
          <p className="text-[#CBD5E1]">
            Configurez l'ordre de priorité des sources de connaissances et les paramètres de recherche.
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

        <div className="space-y-8">
          {/* Ordre de Priorité des Sources */}
          <div>
            <h3 className="text-xl font-bold text-white mb-4">Ordre de Priorité des Sources</h3>
            <p className="text-sm text-[#CBD5E1] mb-4">
              Définissez l'ordre dans lequel l'IA recherchera les informations. Les sources sont consultées de haut en bas.
            </p>
            <div className="space-y-3">
              {config.source_priority.map((source, index) => (
                <div
                  key={source}
                  className="flex items-center justify-between bg-white/5 p-4 rounded-xl border border-white/10"
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-r from-[#2563EB] via-[#7C3AED] to-[#F59E0B] flex items-center justify-center text-white font-bold text-sm">
                      {index + 1}
                    </div>
                    <span className="text-white font-semibold">{getSourceLabel(source)}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => moveSource(index, 'up')}
                      disabled={index === 0}
                      className="p-2 bg-white/5 hover:bg-white/10 text-white rounded-lg border border-white/10 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                      title="Déplacer vers le haut"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                      </svg>
                    </button>
                    <button
                      onClick={() => moveSource(index, 'down')}
                      disabled={index === config.source_priority.length - 1}
                      className="p-2 bg-white/5 hover:bg-white/10 text-white rounded-lg border border-white/10 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                      title="Déplacer vers le bas"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Limites de Résultats */}
          <div>
            <h3 className="text-xl font-bold text-white mb-4">Limites de Résultats par Source</h3>
            <p className="text-sm text-[#CBD5E1] mb-4">
              Nombre maximum de chunks (extraits) à récupérer de chaque source pour construire le contexte.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-semibold text-white mb-2">
                  Documents Organisationnels (ORG)
                </label>
                <input
                  type="number"
                  min="1"
                  max="20"
                  value={config.org_limit}
                  onChange={(e) => setConfig({ ...config, org_limit: parseInt(e.target.value) || 1 })}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-[#CBD5E1] focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:border-transparent transition-all"
                />
                <p className="text-xs text-[#CBD5E1] mt-1">Recommandé: 3-10 chunks</p>
              </div>
              <div>
                <label className="block text-sm font-semibold text-white mb-2">
                  Base de Connaissances Globale (GLOBAL)
                </label>
                <input
                  type="number"
                  min="1"
                  max="20"
                  value={config.global_limit}
                  onChange={(e) => setConfig({ ...config, global_limit: parseInt(e.target.value) || 1 })}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-[#CBD5E1] focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:border-transparent transition-all"
                />
                <p className="text-xs text-[#CBD5E1] mt-1">Recommandé: 2-5 chunks</p>
              </div>
            </div>
          </div>

          {/* Score Minimum de Similarité */}
          <div>
            <h3 className="text-xl font-bold text-white mb-4">Score Minimum de Similarité</h3>
            <p className="text-sm text-[#CBD5E1] mb-4">
              Seuil de pertinence pour inclure un chunk dans les résultats. Plus le score est élevé, plus les résultats seront pertinents (mais moins nombreux).
            </p>
            <div className="max-w-md">
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={config.min_similarity_score}
                onChange={(e) => setConfig({ ...config, min_similarity_score: parseFloat(e.target.value) })}
                className="w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer accent-[#2563EB]"
              />
              <div className="flex justify-between text-xs text-[#CBD5E1] mt-1">
                <span>0.0 (Moins strict)</span>
                <span className="text-white font-semibold">{config.min_similarity_score.toFixed(2)}</span>
                <span>1.0 (Très strict)</span>
              </div>
              <p className="text-xs text-[#CBD5E1] mt-2">Recommandé: 0.7 (équilibre entre pertinence et quantité)</p>
            </div>
          </div>

          {/* Options d'Activation */}
          <div>
            <h3 className="text-xl font-bold text-white mb-4">Options d'Activation</h3>
            <div className="space-y-4">
              <label className="flex items-center space-x-3 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={config.enable_global}
                  onChange={(e) => setConfig({ ...config, enable_global: e.target.checked })}
                  className="w-5 h-5 rounded border-white/20 bg-white/5 text-[#2563EB] focus:ring-2 focus:ring-[#2563EB] focus:ring-offset-2 focus:ring-offset-[#1a1f3a] cursor-pointer"
                />
                <div className="flex-1">
                  <span className="text-white font-semibold">Activer la Base de Connaissances Globale</span>
                  <p className="text-sm text-[#CBD5E1]">
                    Inclure les documents globaux (réglementations, références officielles) dans les recherches
                  </p>
                </div>
              </label>

              <label className="flex items-center space-x-3 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={config.enable_ai_fallback}
                  onChange={(e) => setConfig({ ...config, enable_ai_fallback: e.target.checked })}
                  className="w-5 h-5 rounded border-white/20 bg-white/5 text-[#2563EB] focus:ring-2 focus:ring-[#2563EB] focus:ring-offset-2 focus:ring-offset-[#1a1f3a] cursor-pointer"
                />
                <div className="flex-1">
                  <span className="text-white font-semibold">Activer le Fallback IA</span>
                  <p className="text-sm text-[#CBD5E1]">
                    Permettre à l'IA d'utiliser sa propre connaissance si aucune information pertinente n'est trouvée dans les bases de connaissances
                  </p>
                </div>
              </label>
            </div>
          </div>

          {/* Filtres Avancés */}
          <div>
            <h3 className="text-xl font-bold text-white mb-4">Filtres Avancés</h3>
            <p className="text-sm text-[#CBD5E1] mb-4">
              Options de filtrage pour affiner les résultats de recherche.
            </p>
            <div className="space-y-4">
              <label className="flex items-center space-x-3 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={config.filter_by_category}
                  onChange={(e) => setConfig({ ...config, filter_by_category: e.target.checked })}
                  className="w-5 h-5 rounded border-white/20 bg-white/5 text-[#2563EB] focus:ring-2 focus:ring-[#2563EB] focus:ring-offset-2 focus:ring-offset-[#1a1f3a] cursor-pointer"
                />
                <div className="flex-1">
                  <span className="text-white font-semibold">Filtrer par Catégorie</span>
                  <p className="text-sm text-[#CBD5E1]">
                    Limiter la recherche aux documents de catégories spécifiques (à configurer par question)
                  </p>
                </div>
              </label>

              <label className="flex items-center space-x-3 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={config.filter_by_department}
                  onChange={(e) => setConfig({ ...config, filter_by_department: e.target.checked })}
                  className="w-5 h-5 rounded border-white/20 bg-white/5 text-[#2563EB] focus:ring-2 focus:ring-[#2563EB] focus:ring-offset-2 focus:ring-offset-[#1a1f3a] cursor-pointer"
                />
                <div className="flex-1">
                  <span className="text-white font-semibold">Filtrer par Département</span>
                  <p className="text-sm text-[#CBD5E1]">
                    Limiter la recherche aux documents assignés au département de l'utilisateur
                  </p>
                </div>
              </label>
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
            <button
              onClick={handleReset}
              disabled={saving}
              className="px-6 py-3 bg-white/5 hover:bg-white/10 text-white font-semibold rounded-lg border border-white/10 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              Réinitialiser
            </button>
          </div>
        </div>
      </div>
    </ScrollReveal>
  );
}

