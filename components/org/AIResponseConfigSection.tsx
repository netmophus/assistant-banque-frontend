'use client';

import { useState, useEffect } from 'react';
import { apiClient } from '@/lib/api/client';
import ScrollReveal from '@/components/home/ScrollReveal';

interface AIResponseConfig {
  system_prompt: string;
  model: string;
  temperature: number;
  max_tokens: number;
  response_style: 'formal' | 'professional' | 'friendly' | 'technical';
  response_format: 'markdown' | 'text' | 'structured';
  include_user_context: boolean;
  include_department: boolean;
  include_service: boolean;
  custom_instructions: string;
}

const DEFAULT_CONFIG: AIResponseConfig = {
  system_prompt: `Tu es Fahimta AI, un assistant expert en formation bancaire spécialisé dans la réglementation UEMOA.
Tu dois répondre aux questions des utilisateurs de manière claire, précise et pédagogique.
Tes réponses doivent être techniques, conformes à la réglementation UEMOA, et adaptées au contexte bancaire.
Utilise un langage professionnel mais accessible, avec des exemples concrets lorsque c'est pertinent.`,
  model: 'gpt-4o-mini',
  temperature: 0.7,
  max_tokens: 2000,
  response_style: 'professional',
  response_format: 'markdown',
  include_user_context: true,
  include_department: true,
  include_service: true,
  custom_instructions: `- Réponds de manière complète et détaillée à la question
- Si des extraits de la base de connaissances sont fournis, utilise-les comme référence principale
- Priorise les informations de votre organisation si disponibles, puis complète avec les références officielles globales
- Cite les sources (document, page, référence officielle) quand tu utilises des informations de la base de connaissances
- Utilise des exemples concrets liés au secteur bancaire UEMOA si pertinent
- Structure ta réponse avec des titres (##) et des listes si nécessaire
- Assure-toi que la réponse est conforme à la réglementation UEMOA
- Sois précis et technique tout en restant accessible`,
};

const AVAILABLE_MODELS = [
  { value: 'gpt-4o-mini', label: 'GPT-4o Mini (Rapide, Économique)', cost: 'Faible' },
  { value: 'gpt-4o', label: 'GPT-4o (Équilibré)', cost: 'Moyen' },
  { value: 'gpt-4-turbo', label: 'GPT-4 Turbo (Performant)', cost: 'Élevé' },
  { value: 'gpt-3.5-turbo', label: 'GPT-3.5 Turbo (Rapide)', cost: 'Très faible' },
];

const RESPONSE_STYLES = {
  formal: {
    label: 'Formel',
    description: 'Langage très formel et protocolaire, adapté aux communications officielles',
  },
  professional: {
    label: 'Professionnel',
    description: 'Langage professionnel et technique, adapté au secteur bancaire',
  },
  friendly: {
    label: 'Amical',
    description: 'Langage accessible et convivial, tout en restant professionnel',
  },
  technical: {
    label: 'Technique',
    description: 'Langage très technique et précis, pour les experts',
  },
};

export default function AIResponseConfigSection() {
  const [config, setConfig] = useState<AIResponseConfig>(DEFAULT_CONFIG);
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
      // Récupérer la configuration depuis le backend
      const response = await apiClient.get<AIResponseConfig>('/ai-config/response-config');
      setConfig(response);
    } catch (err: any) {
      console.error('Erreur lors du chargement de la configuration:', err);
      // En cas d'erreur, utiliser la configuration par défaut
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
      // Appeler l'endpoint backend pour sauvegarder la configuration de réponse IA
      await apiClient.put('/ai-config/response-config', config);
      
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
          <h2 className="text-3xl font-black text-white mb-2">Personnalisation Réponses IA</h2>
          <p className="text-[#CBD5E1]">
            Personnalisez les instructions système, le modèle IA et les paramètres de génération des réponses.
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
          {/* Instructions Système */}
          <div>
            <h3 className="text-xl font-bold text-white mb-4">Instructions Système (System Prompt)</h3>
            <p className="text-sm text-[#CBD5E1] mb-4">
              Définissez le rôle et le comportement général de l'IA. Ces instructions guident toutes les réponses.
            </p>
            <textarea
              value={config.system_prompt}
              onChange={(e) => setConfig({ ...config, system_prompt: e.target.value })}
              rows={6}
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-[#CBD5E1] focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:border-transparent transition-all resize-none font-mono text-sm"
              placeholder="Décrivez le rôle et le comportement de l'IA..."
            />
            <p className="text-xs text-[#CBD5E1] mt-2">
              Ces instructions définissent l'identité et le ton de l'IA pour toutes les réponses.
            </p>
          </div>

          {/* Modèle IA */}
          <div>
            <h3 className="text-xl font-bold text-white mb-4">Modèle IA</h3>
            <p className="text-sm text-[#CBD5E1] mb-4">
              Choisissez le modèle OpenAI à utiliser. Les modèles plus récents offrent de meilleures performances mais coûtent plus cher.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {AVAILABLE_MODELS.map((model) => (
                <label
                  key={model.value}
                  className={`flex items-start space-x-3 p-4 rounded-xl border cursor-pointer transition-all ${
                    config.model === model.value
                      ? 'bg-[#2563EB]/20 border-[#2563EB]'
                      : 'bg-white/5 border-white/10 hover:border-white/20'
                  }`}
                >
                  <input
                    type="radio"
                    name="model"
                    value={model.value}
                    checked={config.model === model.value}
                    onChange={(e) => setConfig({ ...config, model: e.target.value })}
                    className="mt-1 w-4 h-4 text-[#2563EB] focus:ring-2 focus:ring-[#2563EB] focus:ring-offset-2 focus:ring-offset-[#1a1f3a] cursor-pointer"
                  />
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="text-white font-semibold">{model.label}</span>
                      <span className={`text-xs px-2 py-1 rounded ${
                        model.cost === 'Très faible' ? 'bg-green-500/20 text-green-400' :
                        model.cost === 'Faible' ? 'bg-blue-500/20 text-blue-400' :
                        model.cost === 'Moyen' ? 'bg-yellow-500/20 text-yellow-400' :
                        'bg-orange-500/20 text-orange-400'
                      }`}>
                        {model.cost}
                      </span>
                    </div>
                    <p className="text-xs text-[#CBD5E1] mt-1">Modèle: {model.value}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Température */}
          <div>
            <h3 className="text-xl font-bold text-white mb-4">Température (Créativité)</h3>
            <p className="text-sm text-[#CBD5E1] mb-4">
              Contrôle la créativité et la variabilité des réponses. Plus bas = plus déterministe, plus haut = plus créatif.
            </p>
            <div className="max-w-md">
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={config.temperature}
                onChange={(e) => setConfig({ ...config, temperature: parseFloat(e.target.value) })}
                className="w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer accent-[#2563EB]"
              />
              <div className="flex justify-between text-xs text-[#CBD5E1] mt-1">
                <span>0.0 (Déterministe)</span>
                <span className="text-white font-semibold">{(config.temperature || 0.7).toFixed(1)}</span>
                <span>1.0 (Créatif)</span>
              </div>
              <p className="text-xs text-[#CBD5E1] mt-2">
                Recommandé: 0.7 (équilibre entre précision et créativité)
              </p>
            </div>
          </div>

          {/* Max Tokens */}
          <div>
            <h3 className="text-xl font-bold text-white mb-4">Limite de Tokens (Longueur Max)</h3>
            <p className="text-sm text-[#CBD5E1] mb-4">
              Nombre maximum de tokens dans la réponse. 1 token ≈ 0.75 mot. Plus élevé = réponses plus longues mais plus coûteux.
            </p>
            <div className="max-w-md">
              <input
                type="number"
                min="100"
                max="4000"
                step="100"
                value={config.max_tokens}
                onChange={(e) => setConfig({ ...config, max_tokens: parseInt(e.target.value) || 2000 })}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-[#CBD5E1] focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:border-transparent transition-all"
              />
              <p className="text-xs text-[#CBD5E1] mt-2">
                Environ {Math.round(config.max_tokens * 0.75)} mots. Recommandé: 1500-2500 tokens
              </p>
            </div>
          </div>

          {/* Style de Réponse */}
          <div>
            <h3 className="text-xl font-bold text-white mb-4">Style de Réponse</h3>
            <p className="text-sm text-[#CBD5E1] mb-4">
              Définissez le ton et le style de communication de l'IA.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Object.entries(RESPONSE_STYLES).map(([key, style]) => (
                <label
                  key={key}
                  className={`flex items-start space-x-3 p-4 rounded-xl border cursor-pointer transition-all ${
                    config.response_style === key
                      ? 'bg-[#2563EB]/20 border-[#2563EB]'
                      : 'bg-white/5 border-white/10 hover:border-white/20'
                  }`}
                >
                  <input
                    type="radio"
                    name="response_style"
                    value={key}
                    checked={config.response_style === key}
                    onChange={(e) => setConfig({ ...config, response_style: e.target.value as any })}
                    className="mt-1 w-4 h-4 text-[#2563EB] focus:ring-2 focus:ring-[#2563EB] focus:ring-offset-2 focus:ring-offset-[#1a1f3a] cursor-pointer"
                  />
                  <div className="flex-1">
                    <span className="text-white font-semibold">{style.label}</span>
                    <p className="text-xs text-[#CBD5E1] mt-1">{style.description}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Format de Réponse */}
          <div>
            <h3 className="text-xl font-bold text-white mb-4">Format de Réponse</h3>
            <p className="text-sm text-[#CBD5E1] mb-4">
              Choisissez le format de présentation des réponses.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                { value: 'markdown', label: 'Markdown', desc: 'Format riche avec titres, listes, liens' },
                { value: 'text', label: 'Texte', desc: 'Format texte simple' },
                { value: 'structured', label: 'Structuré', desc: 'Format JSON structuré' },
              ].map((format) => (
                <label
                  key={format.value}
                  className={`flex items-start space-x-3 p-4 rounded-xl border cursor-pointer transition-all ${
                    config.response_format === format.value
                      ? 'bg-[#2563EB]/20 border-[#2563EB]'
                      : 'bg-white/5 border-white/10 hover:border-white/20'
                  }`}
                >
                  <input
                    type="radio"
                    name="response_format"
                    value={format.value}
                    checked={config.response_format === format.value}
                    onChange={(e) => setConfig({ ...config, response_format: e.target.value as any })}
                    className="mt-1 w-4 h-4 text-[#2563EB] focus:ring-2 focus:ring-[#2563EB] focus:ring-offset-2 focus:ring-offset-[#1a1f3a] cursor-pointer"
                  />
                  <div className="flex-1">
                    <span className="text-white font-semibold">{format.label}</span>
                    <p className="text-xs text-[#CBD5E1] mt-1">{format.desc}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Instructions Personnalisées */}
          <div>
            <h3 className="text-xl font-bold text-white mb-4">Instructions Personnalisées</h3>
            <p className="text-sm text-[#CBD5E1] mb-4">
              Ajoutez des instructions spécifiques qui seront incluses dans chaque prompt utilisateur.
            </p>
            <textarea
              value={config.custom_instructions}
              onChange={(e) => setConfig({ ...config, custom_instructions: e.target.value })}
              rows={8}
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-[#CBD5E1] focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:border-transparent transition-all resize-none font-mono text-sm"
              placeholder="Ajoutez des instructions spécifiques..."
            />
            <p className="text-xs text-[#CBD5E1] mt-2">
              Ces instructions sont ajoutées à chaque question pour guider la réponse de l'IA.
            </p>
          </div>

          {/* Contexte Utilisateur */}
          <div>
            <h3 className="text-xl font-bold text-white mb-4">Contexte Utilisateur</h3>
            <p className="text-sm text-[#CBD5E1] mb-4">
              Définissez quelles informations sur l'utilisateur doivent être incluses dans le contexte de la question.
            </p>
            <div className="space-y-4">
              <label className="flex items-center space-x-3 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={config.include_user_context}
                  onChange={(e) => setConfig({ ...config, include_user_context: e.target.checked })}
                  className="w-5 h-5 rounded border-white/20 bg-white/5 text-[#2563EB] focus:ring-2 focus:ring-[#2563EB] focus:ring-offset-2 focus:ring-offset-[#1a1f3a] cursor-pointer"
                />
                <div className="flex-1">
                  <span className="text-white font-semibold">Inclure le Contexte Utilisateur</span>
                  <p className="text-sm text-[#CBD5E1]">
                    Ajouter des informations générales sur l'utilisateur (nom, rôle, organisation)
                  </p>
                </div>
              </label>

              <label className="flex items-center space-x-3 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={config.include_department}
                  onChange={(e) => setConfig({ ...config, include_department: e.target.checked })}
                  className="w-5 h-5 rounded border-white/20 bg-white/5 text-[#2563EB] focus:ring-2 focus:ring-[#2563EB] focus:ring-offset-2 focus:ring-offset-[#1a1f3a] cursor-pointer"
                />
                <div className="flex-1">
                  <span className="text-white font-semibold">Inclure le Département</span>
                  <p className="text-sm text-[#CBD5E1]">
                    Ajouter le département de l'utilisateur pour personnaliser les réponses
                  </p>
                </div>
              </label>

              <label className="flex items-center space-x-3 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={config.include_service}
                  onChange={(e) => setConfig({ ...config, include_service: e.target.checked })}
                  className="w-5 h-5 rounded border-white/20 bg-white/5 text-[#2563EB] focus:ring-2 focus:ring-[#2563EB] focus:ring-offset-2 focus:ring-offset-[#1a1f3a] cursor-pointer"
                />
                <div className="flex-1">
                  <span className="text-white font-semibold">Inclure le Service</span>
                  <p className="text-sm text-[#CBD5E1]">
                    Ajouter le service de l'utilisateur pour affiner les réponses
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

