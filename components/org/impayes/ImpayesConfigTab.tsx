'use client';

import React, { useState, useEffect } from 'react';
import { useResponsive } from '@/hooks/useResponsive';
import EscaladeSettingsTab from '../settings/EscaladeSettingsTab';
import ScoringSettingsTab from '../settings/ScoringSettingsTab';

interface TrancheRetard {
  min_jours: number | null;
  max_jours: number | null;
  libelle: string;
  statut: string;
}

interface ModeleSMS {
  tranche_id: string;
  libelle: string;
  texte: string;
  actif: boolean;
}

interface RegleRestructuration {
  jours_retard_min: number;
  pourcentage_impaye_min: number;
  libelle: string;
}

interface ParametresTechniques {
  sender_id: string;
  fuseau_horaire: string;
  heure_debut: string;
  heure_fin: string;
  respecter_opt_out: boolean;
}

interface ImpayesConfig {
  tranches_retard: TrancheRetard[];
  regle_restructuration: RegleRestructuration;
  modeles_sms: ModeleSMS[];
  parametres_techniques: ParametresTechniques;
}

const ImpayesConfigTab = () => {
  const { isMobile } = useResponsive();
  const [loading, setLoading] = useState(false);
  const [loadingConfig, setLoadingConfig] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [config, setConfig] = useState<ImpayesConfig | null>(null);
  const [activeConfigTab, setActiveConfigTab] = useState('escalade');

  // Helper function to get headers with authentication token
  const getAuthHeaders = (): HeadersInit => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
  };

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    setLoadingConfig(true);
    try {
      const response = await fetch('/api/impayes/config', {
        headers: getAuthHeaders(),
      });
      if (!response.ok) throw new Error('Erreur lors du chargement');
      const data = await response.json();
      setConfig(data);
    } catch (err: any) {
      console.error('Erreur lors du chargement de la config:', err);
      // Créer une config par défaut si elle n'existe pas
      setConfig(getDefaultConfig());
    } finally {
      setLoadingConfig(false);
    }
  };

  const getDefaultConfig = (): ImpayesConfig => ({
    tranches_retard: [
      { min_jours: 1, max_jours: 29, libelle: 'Retard léger', statut: 'Retard léger' },
      { min_jours: 30, max_jours: 59, libelle: 'Retard significatif', statut: 'Retard significatif' },
      { min_jours: 60, max_jours: 89, libelle: 'Zone critique / à restructurer', statut: 'Zone critique' },
      { min_jours: 90, max_jours: null, libelle: 'Douteux / NPL', statut: 'Douteux / NPL' },
    ],
    regle_restructuration: {
      jours_retard_min: 60,
      pourcentage_impaye_min: 30.0,
      libelle: 'Candidat à restructuration',
    },
    modeles_sms: [],
    parametres_techniques: {
      sender_id: 'Softlink',
      fuseau_horaire: 'Africa/Niamey',
      heure_debut: '08:00',
      heure_fin: '20:00',
      respecter_opt_out: true,
    },
  });

  const handleSaveConfig = async () => {
    if (!config) return;
    setLoading(true);
    setError('');
    setMessage('');
    try {
      const response = await fetch('/api/impayes/config', {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify(config),
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || 'Erreur lors de la sauvegarde');
      }
      setMessage('Configuration sauvegardée avec succès ✅');
    } catch (err: any) {
      setError(err.message || 'Erreur lors de la sauvegarde');
    } finally {
      setLoading(false);
    }
  };

  const handleAddTranche = () => {
    if (!config) return;
    setConfig({
      ...config,
      tranches_retard: [
        ...config.tranches_retard,
        { min_jours: 0, max_jours: null, libelle: '', statut: '' },
      ],
    });
  };

  const handleRemoveTranche = (index: number) => {
    if (!config || config.tranches_retard.length <= 1) return;
    setConfig({
      ...config,
      tranches_retard: config.tranches_retard.filter((_, i) => i !== index),
    });
  };

  const handleUpdateTranche = (index: number, field: keyof TrancheRetard, value: string) => {
    if (!config) return;
    const updated = [...config.tranches_retard];
    updated[index] = {
      ...updated[index],
      [field]:
        value === ''
          ? null
          : field.includes('jours')
            ? parseInt(value) || 0
            : value,
    } as TrancheRetard;
    setConfig({ ...config, tranches_retard: updated });
  };

  const handleAddModeleSMS = () => {
    if (!config) return;
    setConfig({
      ...config,
      modeles_sms: [
        ...config.modeles_sms,
        {
          tranche_id: '',
          libelle: '',
          texte: '',
          actif: true,
        },
      ],
    });
  };

  const handleRemoveModeleSMS = (index: number) => {
    if (!config) return;
    setConfig({
      ...config,
      modeles_sms: config.modeles_sms.filter((_, i) => i !== index),
    });
  };

  const handleUpdateModeleSMS = (index: number, field: keyof ModeleSMS, value: string | boolean) => {
    if (!config) return;
    const updated = [...config.modeles_sms];
    updated[index] = { ...updated[index], [field]: value };
    setConfig({ ...config, modeles_sms: updated });
  };

  if (loadingConfig) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="w-8 h-8 border-2 border-[#d32f2f] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!config) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-4">
        <p className="text-[#CBD5E1]">Erreur lors du chargement de la configuration.</p>
        <button onClick={loadConfig} className="px-4 py-2 bg-[#d32f2f] text-white rounded-lg font-semibold hover:opacity-90">
          Réessayer
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-white">⚙️ Paramétrage des impayés</h2>

      {/* Onglets de configuration */}
      <div className="flex gap-2 flex-wrap border-b border-[#d32f2f]/15 pb-3">
        {[
          { id: 'escalade', label: 'Paramétrage Escalade', icon: '🚀' },
          { id: 'scoring', label: 'Scoring recouvrabilité', icon: '🎯' },
          { id: 'general', label: 'Configuration générale', icon: '⚙️' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveConfigTab(tab.id)}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all border ${
              activeConfigTab === tab.id
                ? 'bg-gradient-to-r from-[#d32f2f] to-[#f44336] text-white border-transparent shadow-lg shadow-[#d32f2f]/20'
                : 'bg-white/5 text-[#94A3B8] border-white/10 hover:bg-[#d32f2f]/10 hover:text-white hover:border-[#d32f2f]/30'
            }`}
          >
            <span>{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-sm text-red-400">{error}</div>
      )}
      {message && (
        <div className="p-4 bg-green-500/10 border border-green-500/30 rounded-xl text-sm text-green-400">{message}</div>
      )}

      {/* Contenu des onglets */}
      {activeConfigTab === 'escalade' ? (
        <EscaladeSettingsTab />
      ) : activeConfigTab === 'scoring' ? (
        <ScoringSettingsTab />
      ) : (
        <div className="space-y-5">
          {/* Tranches de retard */}
          <div className="bg-[#0a0f1e] rounded-2xl border border-[#d32f2f]/20 overflow-hidden">
            <div className="px-5 py-4 bg-[#d32f2f]/10 border-b border-[#d32f2f]/15 flex items-center justify-between">
              <h3 className="font-bold text-white text-sm">📅 Tranches de retard</h3>
              <button onClick={handleAddTranche} className="px-4 py-2 bg-green-500/15 hover:bg-green-500/25 border border-green-500/30 text-green-400 rounded-lg text-xs font-semibold transition-colors">
                + Ajouter une tranche
              </button>
            </div>
            <div className="p-5 space-y-3">
              {config.tranches_retard.map((tranche, index) => (
                <div key={index} className="p-4 bg-[#080c1a] rounded-xl border border-white/5 grid gap-3" style={{ gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr 2fr 2fr auto', alignItems: 'end' }}>
                  <div>
                    <label className="block text-xs font-semibold text-[#E2E8F0] mb-1.5 px-2 py-1 bg-[#1e2d45] border border-[#2d4a6e]/50 rounded-md w-fit">Jours min</label>
                    <input type="number" min="0" value={tranche.min_jours || ''} onChange={e => handleUpdateTranche(index, 'min_jours', e.target.value)} className="w-full px-3 py-2 bg-[#1a1f3a] border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-[#d32f2f]/50" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#E2E8F0] mb-1.5 px-2 py-1 bg-[#1e2d45] border border-[#2d4a6e]/50 rounded-md w-fit">Jours max</label>
                    <input type="number" min="0" value={tranche.max_jours || ''} onChange={e => handleUpdateTranche(index, 'max_jours', e.target.value)} placeholder="∞ si vide" className="w-full px-3 py-2 bg-[#1a1f3a] border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-[#d32f2f]/50" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#E2E8F0] mb-1.5 px-2 py-1 bg-[#1e2d45] border border-[#2d4a6e]/50 rounded-md w-fit">Libellé</label>
                    <input type="text" value={tranche.libelle || ''} onChange={e => handleUpdateTranche(index, 'libelle', e.target.value)} placeholder="Ex: Retard léger" className="w-full px-3 py-2 bg-[#1a1f3a] border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-[#d32f2f]/50" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#E2E8F0] mb-1.5 px-2 py-1 bg-[#1e2d45] border border-[#2d4a6e]/50 rounded-md w-fit">Statut</label>
                    <input type="text" value={tranche.statut || ''} onChange={e => handleUpdateTranche(index, 'statut', e.target.value)} placeholder="Ex: Retard léger" className="w-full px-3 py-2 bg-[#1a1f3a] border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-[#d32f2f]/50" />
                  </div>
                  {config.tranches_retard.length > 1 && (
                    <button onClick={() => handleRemoveTranche(index)} className="px-3 py-2 bg-red-500/15 hover:bg-red-500/25 border border-red-500/30 text-red-400 rounded-lg text-xs font-semibold h-9">
                      Supprimer
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Règle de restructuration */}
          <div className="bg-[#0a0f1e] rounded-2xl border border-[#d32f2f]/20 overflow-hidden">
            <div className="px-5 py-4 bg-[#d32f2f]/10 border-b border-[#d32f2f]/15">
              <h3 className="font-bold text-white text-sm">🔄 Règle de détection restructuration</h3>
            </div>
            <div className="p-5">
              <div className={`grid gap-4 mb-4 ${isMobile ? 'grid-cols-1' : 'grid-cols-3'}`}>
                <div>
                  <label className="block text-xs font-semibold text-[#E2E8F0] mb-1.5 px-2 py-1 bg-[#1e2d45] border border-[#2d4a6e]/50 rounded-md w-fit">Jours de retard minimum</label>
                  <input type="number" min="0" value={config.regle_restructuration.jours_retard_min || 60} onChange={e => setConfig({ ...config, regle_restructuration: { ...config.regle_restructuration, jours_retard_min: parseInt(e.target.value) || 60 } })} className="w-full px-3 py-2 bg-[#1a1f3a] border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-[#d32f2f]/50" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#E2E8F0] mb-1.5 px-2 py-1 bg-[#1e2d45] border border-[#2d4a6e]/50 rounded-md w-fit">Pourcentage impayé min (%)</label>
                  <input type="number" step="0.1" min="0" max="100" value={config.regle_restructuration.pourcentage_impaye_min || 30} onChange={e => setConfig({ ...config, regle_restructuration: { ...config.regle_restructuration, pourcentage_impaye_min: parseFloat(e.target.value) || 30 } })} className="w-full px-3 py-2 bg-[#1a1f3a] border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-[#d32f2f]/50" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#E2E8F0] mb-1.5 px-2 py-1 bg-[#1e2d45] border border-[#2d4a6e]/50 rounded-md w-fit">Libellé</label>
                  <input type="text" value={config.regle_restructuration.libelle || ''} onChange={e => setConfig({ ...config, regle_restructuration: { ...config.regle_restructuration, libelle: e.target.value } })} className="w-full px-3 py-2 bg-[#1a1f3a] border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-[#d32f2f]/50" />
                </div>
              </div>
              <div className="p-3 bg-[#F59E0B]/10 border border-[#F59E0B]/20 rounded-xl text-xs text-[#FCD34D]">
                <strong>Condition :</strong> joursRetard &gt;= {config.regle_restructuration.jours_retard_min} ET (montantImpayé / encours) × 100 &gt; {config.regle_restructuration.pourcentage_impaye_min}%
              </div>
            </div>
          </div>

          {/* Modèles SMS */}
          <div className="bg-[#0a0f1e] rounded-2xl border border-[#d32f2f]/20 overflow-hidden">
            <div className="px-5 py-4 bg-[#d32f2f]/10 border-b border-[#d32f2f]/15 flex items-center justify-between">
              <h3 className="font-bold text-white text-sm">💬 Modèles de SMS</h3>
              <button onClick={handleAddModeleSMS} className="px-4 py-2 bg-green-500/15 hover:bg-green-500/25 border border-green-500/30 text-green-400 rounded-lg text-xs font-semibold transition-colors">
                + Ajouter un modèle
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div className="p-3 bg-[#2563EB]/10 border border-[#2563EB]/20 rounded-xl text-xs text-[#93C5FD]">
                <strong>Variables disponibles :</strong> {'{NOM_CLIENT}'}, {'{MONTANT}'}, {'{MONTANT_IMPAYE}'}, {'{DATE_ECHEANCE}'}, {'{AGENCE}'}, {'{CANAL_PAIEMENT}'}, {'{REF_CREDIT}'}, {'{JOURS_RETARD}'}, {'{NUMERO_AGENCE}'}, {'{CONSEILLER_TEL}'}, {'{ENCOURS}'}, {'{NB_ECHEANCES_IMPAYEES}'}
              </div>
              {config.modeles_sms.map((modele, index) => (
                <div key={index} className="p-4 bg-[#080c1a] rounded-xl border border-white/5 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-white">Modèle {index + 1}</span>
                    <button onClick={() => handleRemoveModeleSMS(index)} className="px-3 py-1.5 bg-red-500/15 hover:bg-red-500/25 border border-red-500/30 text-red-400 rounded-lg text-xs font-semibold">Supprimer</button>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#E2E8F0] mb-1.5 px-2 py-1 bg-[#1e2d45] border border-[#2d4a6e]/50 rounded-md w-fit">Tranche associée</label>
                    <select value={modele.tranche_id || ''} onChange={e => handleUpdateModeleSMS(index, 'tranche_id', e.target.value)} className="w-full px-3 py-2 bg-[#1a1f3a] border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-[#d32f2f]/50">
                      <option value="">Sélectionner une tranche</option>
                      {config.tranches_retard.map((t, idx) => (
                        <option key={idx} value={idx.toString()}>{t.libelle} ({t.min_jours}–{t.max_jours || '∞'} jours)</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#E2E8F0] mb-1.5 px-2 py-1 bg-[#1e2d45] border border-[#2d4a6e]/50 rounded-md w-fit">Libellé du modèle</label>
                    <input type="text" value={modele.libelle || ''} onChange={e => handleUpdateModeleSMS(index, 'libelle', e.target.value)} placeholder="Ex: SMS retard léger" className="w-full px-3 py-2 bg-[#1a1f3a] border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-[#d32f2f]/50" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#E2E8F0] mb-1.5 px-2 py-1 bg-[#1e2d45] border border-[#2d4a6e]/50 rounded-md w-fit">Texte du SMS</label>
                    <textarea value={modele.texte || ''} onChange={e => handleUpdateModeleSMS(index, 'texte', e.target.value)} placeholder="Bonjour {NOM_CLIENT}..." rows={4} className="w-full px-3 py-2 bg-[#1a1f3a] border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-[#d32f2f]/50 resize-none" />
                  </div>
                  <div className="flex items-center gap-3">
                    <button type="button" onClick={() => handleUpdateModeleSMS(index, 'actif', !(modele.actif !== false))} className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${modele.actif !== false ? 'bg-[#d32f2f]' : 'bg-[#374151]'}`}>
                      <span className={`inline-block h-4 w-4 rounded-full bg-white transition-transform ${modele.actif !== false ? 'translate-x-6' : 'translate-x-1'}`} />
                    </button>
                    <span className="text-sm text-[#CBD5E1]">Modèle actif</span>
                  </div>
                </div>
              ))}
              {config.modeles_sms.length === 0 && (
                <p className="text-center text-sm text-[#64748B] py-6">Aucun modèle SMS configuré.</p>
              )}
            </div>
          </div>

          {/* Paramètres techniques */}
          <div className="bg-[#0a0f1e] rounded-2xl border border-[#d32f2f]/20 overflow-hidden">
            <div className="px-5 py-4 bg-[#d32f2f]/10 border-b border-[#d32f2f]/15">
              <h3 className="font-bold text-white text-sm">🔧 Paramètres techniques SMS</h3>
            </div>
            <div className="p-5 grid gap-4" style={{ gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, 1fr)' }}>
              <div>
                <label className="block text-xs font-semibold text-[#E2E8F0] mb-1.5 px-2 py-1 bg-[#1e2d45] border border-[#2d4a6e]/50 rounded-md w-fit">Sender ID (nom expéditeur)</label>
                <input type="text" value={config.parametres_techniques.sender_id || 'Softlink'} onChange={e => setConfig({ ...config, parametres_techniques: { ...config.parametres_techniques, sender_id: e.target.value } })} className="w-full px-3 py-2 bg-[#1a1f3a] border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-[#d32f2f]/50" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#E2E8F0] mb-1.5 px-2 py-1 bg-[#1e2d45] border border-[#2d4a6e]/50 rounded-md w-fit">Fuseau horaire</label>
                <input type="text" value={config.parametres_techniques.fuseau_horaire || 'Africa/Niamey'} onChange={e => setConfig({ ...config, parametres_techniques: { ...config.parametres_techniques, fuseau_horaire: e.target.value } })} className="w-full px-3 py-2 bg-[#1a1f3a] border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-[#d32f2f]/50" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#E2E8F0] mb-1.5 px-2 py-1 bg-[#1e2d45] border border-[#2d4a6e]/50 rounded-md w-fit">Heure de début autorisée</label>
                <input type="time" value={config.parametres_techniques.heure_debut || '08:00'} onChange={e => setConfig({ ...config, parametres_techniques: { ...config.parametres_techniques, heure_debut: e.target.value } })} className="w-full px-3 py-2 bg-[#1a1f3a] border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-[#d32f2f]/50" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#E2E8F0] mb-1.5 px-2 py-1 bg-[#1e2d45] border border-[#2d4a6e]/50 rounded-md w-fit">Heure de fin autorisée</label>
                <input type="time" value={config.parametres_techniques.heure_fin || '20:00'} onChange={e => setConfig({ ...config, parametres_techniques: { ...config.parametres_techniques, heure_fin: e.target.value } })} className="w-full px-3 py-2 bg-[#1a1f3a] border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-[#d32f2f]/50" />
              </div>
              <div className="flex items-center gap-3 col-span-full">
                <button type="button" onClick={() => setConfig({ ...config, parametres_techniques: { ...config.parametres_techniques, respecter_opt_out: !config.parametres_techniques.respecter_opt_out } })} className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${config.parametres_techniques.respecter_opt_out !== false ? 'bg-[#d32f2f]' : 'bg-[#374151]'}`}>
                  <span className={`inline-block h-4 w-4 rounded-full bg-white transition-transform ${config.parametres_techniques.respecter_opt_out !== false ? 'translate-x-6' : 'translate-x-1'}`} />
                </button>
                <span className="text-sm text-[#CBD5E1]">Respecter le consentement client (opt-out)</span>
              </div>
            </div>
          </div>

          {/* Bouton de sauvegarde */}
          <div className="flex justify-end pt-2">
            <button
              onClick={handleSaveConfig}
              disabled={loading}
              className="px-8 py-3 bg-gradient-to-r from-[#d32f2f] to-[#f44336] text-white font-bold rounded-xl shadow-lg hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center gap-2"
            >
              {loading ? (
                <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /><span>Sauvegarde...</span></>
              ) : (
                <span>💾 Sauvegarder la configuration</span>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ImpayesConfigTab;

