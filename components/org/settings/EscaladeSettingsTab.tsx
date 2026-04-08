'use client';

import React, { useState, useEffect } from 'react';
import { apiClient } from '@/lib/api/client';

interface EscaladeNiveauConfig {
  niveau: string;
  label: string;
  description?: string;
  jours_declenchement: number;
  couleur: string;
  actions_auto: string[];
  responsable_escalade?: string;
  agent_id?: string;
  agent_nom?: string;
  actif: boolean;
}

interface OrgUser {
  id: string;
  full_name: string;
  email: string;
}

interface EscaladeConfig {
  escalade_auto: boolean;
  notifier_gestionnaire: boolean;
  autoriser_forcage_manuel: boolean;
  justification_forcage_obligatoire: boolean;
  niveaux: EscaladeNiveauConfig[];
}

const defaultConfig: EscaladeConfig = {
  escalade_auto: true,
  notifier_gestionnaire: true,
  autoriser_forcage_manuel: true,
  justification_forcage_obligatoire: true,
  niveaux: [
    { niveau: 'relance_1', label: 'Première relance', description: 'Premier rappel amiable par SMS', jours_declenchement: 7, couleur: '#f59e0b', actions_auto: ['sms'], responsable_escalade: 'Agent Recouvrement 1', actif: true },
    { niveau: 'relance_2', label: 'Deuxième relance', description: 'Deuxième rappel avec avertissement', jours_declenchement: 30, couleur: '#f97316', actions_auto: ['sms'], responsable_escalade: 'Agent Recouvrement 2', actif: true },
    { niveau: 'mise_en_demeure', label: 'Mise en demeure', description: 'Notification formelle de mise en demeure', jours_declenchement: 60, couleur: '#ef4444', actions_auto: ['sms', 'courrier'], responsable_escalade: 'Superviseur Recouvrement', actif: true },
    { niveau: 'contentieux', label: 'Contentieux', description: 'Transfert au service contentieux / juridique', jours_declenchement: 90, couleur: '#7f1d1d', actions_auto: ['courrier'], responsable_escalade: 'Responsable Juridique', actif: true },
  ],
};

const actionsAutorisees = [
  { value: 'sms', label: 'SMS' },
  { value: 'email', label: 'Email' },
  { value: 'courrier', label: 'Courrier' },
  { value: 'notification_app', label: 'Notification App' },
  { value: 'appel', label: 'Appel Téléphonique' },
];

function Toggle({ label, sub, checked, onChange }: { label: string; sub: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-start justify-between gap-4 p-4 bg-[#0d1224] rounded-xl border border-white/5">
      <div className="flex-1">
        <p className="text-sm font-semibold text-[#CBD5E1]">{label}</p>
        <p className="text-xs text-[#64748B] mt-0.5">{sub}</p>
      </div>
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors shrink-0 mt-0.5 ${checked ? 'bg-[#d32f2f]' : 'bg-[#374151]'}`}
      >
        <span className={`inline-block h-4 w-4 rounded-full bg-white transition-transform ${checked ? 'translate-x-6' : 'translate-x-1'}`} />
      </button>
    </div>
  );
}

const EscaladeSettingsTab = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [success, setSuccess] = useState('');
  const [config, setConfig] = useState<EscaladeConfig>(defaultConfig);
  const [orgUsers, setOrgUsers] = useState<OrgUser[]>([]);

  useEffect(() => {
    loadConfig();
    loadOrgUsers();
  }, []);

  const loadOrgUsers = async () => {
    try {
      const users = await apiClient.get<OrgUser[]>('/auth/users/org/simple');
      setOrgUsers(Array.isArray(users) ? users : []);
    } catch {
      setOrgUsers([]);
    }
  };

  const loadConfig = async () => {
    setLoading(true);
    try {
      const data = await apiClient.get<EscaladeConfig>('/impayes/escalade/config');
      if (data && data.niveaux) setConfig(data);
      else setConfig(defaultConfig);
    } catch {
      setConfig(defaultConfig);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setErrors([]);
    setSuccess('');
    try {
      const res = await apiClient.post<any>('/impayes/escalade/config/validate', { config });
      if (!res.valide) { setErrors(res.erreurs || ['Erreur de validation']); return; }
      await apiClient.put('/impayes/escalade/config', config);
      setSuccess('Configuration sauvegardée avec succès');
      setTimeout(() => setSuccess(''), 3000);
    } catch {
      setErrors(['Erreur lors de la sauvegarde']);
    } finally {
      setSaving(false);
    }
  };

  const updateNiveau = (index: number, field: keyof EscaladeNiveauConfig, value: any) => {
    const niveaux = [...config.niveaux];
    niveaux[index] = { ...niveaux[index], [field]: value };
    setConfig({ ...config, niveaux });
  };

  const addNiveau = () => {
    setConfig({
      ...config,
      niveaux: [...config.niveaux, {
        niveau: `niveau_${config.niveaux.length + 1}`,
        label: `Niveau ${config.niveaux.length + 1}`,
        description: '',
        jours_declenchement: (config.niveaux.length + 1) * 15,
        couleur: '#6b7280',
        actions_auto: ['sms'],
        responsable_escalade: '',
        actif: true,
      }],
    });
  };

  const removeNiveau = (index: number) => {
    setConfig({ ...config, niveaux: config.niveaux.filter((_, i) => i !== index) });
  };

  const moveNiveau = (index: number, dir: 'up' | 'down') => {
    const niveaux = [...config.niveaux];
    const target = dir === 'up' ? index - 1 : index + 1;
    if (target < 0 || target >= niveaux.length) return;
    [niveaux[index], niveaux[target]] = [niveaux[target], niveaux[index]];
    setConfig({ ...config, niveaux });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="w-8 h-8 border-2 border-[#d32f2f] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Feedback */}
      {errors.length > 0 && (
        <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-sm text-red-400">
          {errors.map((e, i) => <p key={i}>{e}</p>)}
        </div>
      )}
      {success && (
        <div className="p-4 bg-green-500/10 border border-green-500/30 rounded-xl text-sm text-green-400">
          {success}
        </div>
      )}

      {/* Paramètres globaux */}
      <div className="bg-[#0a0f1e] rounded-2xl border border-[#d32f2f]/20 overflow-hidden">
        <div className="px-5 py-4 bg-[#d32f2f]/10 border-b border-[#d32f2f]/20">
          <h3 className="font-bold text-white text-sm flex items-center gap-2">
            <span>⚙️</span> Paramètres globaux
          </h3>
        </div>
        <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Toggle
            label="Escalade automatique"
            sub="Les dossiers sont escaladés automatiquement selon les jours de retard"
            checked={config.escalade_auto}
            onChange={v => setConfig({ ...config, escalade_auto: v })}
          />
          <Toggle
            label="Notifier le gestionnaire"
            sub="Envoyer une notification au gestionnaire lors d'une escalade"
            checked={config.notifier_gestionnaire}
            onChange={v => setConfig({ ...config, notifier_gestionnaire: v })}
          />
          <Toggle
            label="Autoriser le forçage manuel"
            sub="Permet aux gestionnaires de forcer manuellement une escalade"
            checked={config.autoriser_forcage_manuel}
            onChange={v => setConfig({ ...config, autoriser_forcage_manuel: v })}
          />
          <Toggle
            label="Justification obligatoire (forçage)"
            sub="Exige une justification lors du forçage manuel d'escalade"
            checked={config.justification_forcage_obligatoire}
            onChange={v => setConfig({ ...config, justification_forcage_obligatoire: v })}
          />
        </div>
      </div>

      {/* Niveaux d'escalade */}
      <div className="bg-[#0a0f1e] rounded-2xl border border-[#d32f2f]/20 overflow-hidden">
        <div className="px-5 py-4 bg-[#d32f2f]/10 border-b border-[#d32f2f]/20 flex items-center justify-between">
          <h3 className="font-bold text-white text-sm flex items-center gap-2">
            <span>🚀</span> Niveaux d'escalade ({config.niveaux.length})
          </h3>
          <button
            onClick={addNiveau}
            className="px-4 py-2 bg-[#d32f2f]/20 hover:bg-[#d32f2f]/40 border border-[#d32f2f]/30 text-white rounded-lg text-xs font-semibold transition-colors"
          >
            + Ajouter un niveau
          </button>
        </div>

        <div className="p-5 space-y-4">
          {config.niveaux.map((niveau, index) => (
            <div
              key={index}
              className="rounded-xl overflow-hidden"
              style={{ borderTop: '1px solid rgba(255,255,255,0.08)', borderRight: '1px solid rgba(255,255,255,0.08)', borderBottom: '1px solid rgba(255,255,255,0.08)', borderLeft: `3px solid ${niveau.couleur}` }}
            >
              {/* En-tête du niveau */}
              <div className="flex items-center justify-between px-4 py-3 bg-white/4">
                <div className="flex items-center gap-3">
                  <div className="w-4 h-4 rounded-full shrink-0" style={{ backgroundColor: niveau.couleur }} />
                  <span className="font-bold text-white text-sm">{niveau.label || `Niveau ${index + 1}`}</span>
                  <span className="text-xs text-[#64748B] px-2 py-0.5 bg-white/5 rounded-full">J+{niveau.jours_declenchement}</span>
                  {!niveau.actif && <span className="text-xs text-[#F59E0B] px-2 py-0.5 bg-[#F59E0B]/10 rounded-full">Inactif</span>}
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => moveNiveau(index, 'up')} disabled={index === 0} className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-[#94A3B8] disabled:opacity-30 text-xs">↑</button>
                  <button onClick={() => moveNiveau(index, 'down')} disabled={index === config.niveaux.length - 1} className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-[#94A3B8] disabled:opacity-30 text-xs">↓</button>
                  <button onClick={() => removeNiveau(index)} className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs px-2">Supprimer</button>
                </div>
              </div>

              {/* Champs */}
              <div className="p-4 bg-[#080c1a] grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[#E2E8F0] mb-1.5 px-2 py-1 bg-[#1e2d45] border border-[#2d4a6e]/50 rounded-md w-fit">Identifiant <span className="text-[#64748B]">(code unique)</span></label>
                  <input
                    type="text"
                    value={niveau.niveau}
                    onChange={e => updateNiveau(index, 'niveau', e.target.value)}
                    className="w-full px-3 py-2 bg-[#1a1f3a] border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-[#d32f2f]/50"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#E2E8F0] mb-1.5 px-2 py-1 bg-[#1e2d45] border border-[#2d4a6e]/50 rounded-md w-fit">Libellé <span className="text-[#64748B]">(nom affiché)</span></label>
                  <input
                    type="text"
                    value={niveau.label}
                    onChange={e => updateNiveau(index, 'label', e.target.value)}
                    className="w-full px-3 py-2 bg-[#1a1f3a] border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-[#d32f2f]/50"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#E2E8F0] mb-1.5 px-2 py-1 bg-[#1e2d45] border border-[#2d4a6e]/50 rounded-md w-fit">Jours de déclenchement</label>
                  <input
                    type="number"
                    min={1}
                    value={niveau.jours_declenchement}
                    onChange={e => updateNiveau(index, 'jours_declenchement', parseInt(e.target.value) || 1)}
                    className="w-full px-3 py-2 bg-[#1a1f3a] border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-[#d32f2f]/50"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#E2E8F0] mb-1.5 px-2 py-1 bg-[#1e2d45] border border-[#2d4a6e]/50 rounded-md w-fit">Responsable escalade</label>
                  <input
                    type="text"
                    value={niveau.responsable_escalade || ''}
                    onChange={e => updateNiveau(index, 'responsable_escalade', e.target.value)}
                    placeholder="Agent Recouvrement"
                    className="w-full px-3 py-2 bg-[#1a1f3a] border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-[#d32f2f]/50"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#E2E8F0] mb-1.5 px-2 py-1 bg-[#1e2d45] border border-[#2d4a6e]/50 rounded-md w-fit">
                    Attribuer à <span className="text-[#64748B] font-normal">(auto)</span>
                  </label>
                  <select
                    value={niveau.agent_id || ''}
                    onChange={e => {
                      const selected = orgUsers.find(u => u.id === e.target.value);
                      const niveaux = [...config.niveaux];
                      niveaux[index] = {
                        ...niveaux[index],
                        agent_id: e.target.value || undefined,
                        agent_nom: selected?.full_name || undefined,
                      };
                      setConfig({ ...config, niveaux });
                    }}
                    className="w-full px-3 py-2 bg-[#1a1f3a] border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-[#d32f2f]/50"
                  >
                    <option value="">— Aucune attribution automatique —</option>
                    {orgUsers.map(u => (
                      <option key={u.id} value={u.id}>{u.full_name}</option>
                    ))}
                  </select>
                  {niveau.agent_id && (
                    <p className="mt-1 text-[11px] text-[#22c55e]">
                      Les dossiers seront attribués automatiquement à <strong>{niveau.agent_nom}</strong> lors du passage à ce niveau.
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#E2E8F0] mb-1.5 px-2 py-1 bg-[#1e2d45] border border-[#2d4a6e]/50 rounded-md w-fit">Couleur</label>
                  <div className="flex gap-2">
                    <input
                      type="color"
                      value={niveau.couleur}
                      onChange={e => updateNiveau(index, 'couleur', e.target.value)}
                      className="w-10 h-9 rounded-lg cursor-pointer border border-white/10 bg-transparent"
                    />
                    <input
                      type="text"
                      value={niveau.couleur}
                      onChange={e => updateNiveau(index, 'couleur', e.target.value)}
                      className="flex-1 px-3 py-2 bg-[#1a1f3a] border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-[#d32f2f]/50"
                    />
                  </div>
                </div>
                <div className="flex items-center">
                  <button
                    type="button"
                    onClick={() => updateNiveau(index, 'actif', !niveau.actif)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors mr-3 ${niveau.actif ? 'bg-[#d32f2f]' : 'bg-[#374151]'}`}
                  >
                    <span className={`inline-block h-4 w-4 rounded-full bg-white transition-transform ${niveau.actif ? 'translate-x-6' : 'translate-x-1'}`} />
                  </button>
                  <span className="text-sm text-[#CBD5E1]">{niveau.actif ? 'Actif' : 'Inactif'}</span>
                </div>

                {/* Description — pleine largeur */}
                <div className="sm:col-span-2 lg:col-span-3">
                  <label className="block text-xs font-semibold text-[#E2E8F0] mb-1.5 px-2 py-1 bg-[#1e2d45] border border-[#2d4a6e]/50 rounded-md w-fit">Description <span className="text-[#64748B]">(optionnel)</span></label>
                  <textarea
                    value={niveau.description || ''}
                    onChange={e => updateNiveau(index, 'description', e.target.value)}
                    rows={2}
                    placeholder="Description de ce niveau d'escalade..."
                    className="w-full px-3 py-2 bg-[#1a1f3a] border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-[#d32f2f]/50 resize-none"
                  />
                </div>

                {/* Actions auto — pleine largeur */}
                <div className="sm:col-span-2 lg:col-span-3">
                  <label className="block text-xs font-semibold text-[#E2E8F0] mb-2 px-2 py-1 bg-[#1e2d45] border border-[#2d4a6e]/50 rounded-md w-fit">Actions automatiques</label>
                  <div className="flex flex-wrap gap-2">
                    {actionsAutorisees.map(action => {
                      const active = niveau.actions_auto.includes(action.value);
                      return (
                        <button
                          key={action.value}
                          type="button"
                          onClick={() => {
                            const newActions = active
                              ? niveau.actions_auto.filter(a => a !== action.value)
                              : [...niveau.actions_auto, action.value];
                            updateNiveau(index, 'actions_auto', newActions);
                          }}
                          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border ${
                            active
                              ? 'bg-[#d32f2f]/25 border-[#d32f2f]/50 text-white'
                              : 'bg-white/5 border-white/10 text-[#64748B] hover:bg-white/10'
                          }`}
                        >
                          {action.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          ))}

          {config.niveaux.length === 0 && (
            <div className="text-center py-8 text-[#64748B] text-sm">
              Aucun niveau configuré. Cliquez sur &quot;+ Ajouter un niveau&quot;.
            </div>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-end gap-3 pt-2">
        <button
          onClick={loadConfig}
          disabled={saving}
          className="px-5 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 text-[#CBD5E1] font-semibold rounded-xl text-sm transition-colors disabled:opacity-50"
        >
          Annuler
        </button>
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-8 py-2.5 bg-gradient-to-r from-[#d32f2f] to-[#f44336] text-white font-bold rounded-xl shadow-lg hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center gap-2 text-sm"
        >
          {saving ? (
            <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /><span>Sauvegarde...</span></>
          ) : (
            <span>💾 Sauvegarder</span>
          )}
        </button>
      </div>
    </div>
  );
};

export default EscaladeSettingsTab;
