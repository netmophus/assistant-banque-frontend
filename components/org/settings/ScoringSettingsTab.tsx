'use client';

import React, { useState, useEffect } from 'react';
import { apiClient } from '@/lib/api/client';

// ── Types ─────────────────────────────────────────────────────────────────────

interface ScoringPoidsConfig {
  jours_retard: number;
  ratio_impaye: number;
  garanties: number;
  joignabilite: number;
  historique_promesses: number;
  echeances_impayees: number;
}
interface ScoringSeuilsJoursRetard {
  palier_1_jours: number; palier_1_score: number;
  palier_2_jours: number; palier_2_score: number;
  palier_3_jours: number; palier_3_score: number;
  palier_4_jours: number; palier_4_score: number;
  palier_5_jours: number; palier_5_score: number;
  palier_6_score: number;
}
interface ScoringSeuilsRatioImpaye {
  palier_1_pct: number; palier_1_score: number;
  palier_2_pct: number; palier_2_score: number;
  palier_3_pct: number; palier_3_score: number;
  palier_4_pct: number; palier_4_score: number;
  palier_5_score: number;
}
interface ScoringSeuilsEcheances {
  palier_1_nb: number; palier_1_score: number;
  palier_2_nb: number; palier_2_score: number;
  palier_3_nb: number; palier_3_score: number;
  palier_4_score: number;
}
interface ScoringConfig {
  poids: ScoringPoidsConfig;
  seuils_jours_retard: ScoringSeuilsJoursRetard;
  seuils_ratio_impaye: ScoringSeuilsRatioImpaye;
  seuils_echeances: ScoringSeuilsEcheances;
  scores_garanties: { avec_garantie: number; sans_garantie: number };
  scores_joignabilite: { avec_telephone: number; sans_telephone: number };
  seuils_niveaux: {
    faible: number; moyen: number; eleve: number;
    recommandation_faible: string; recommandation_moyen: string;
    recommandation_eleve: string; recommandation_critique: string;
  };
}

// ── Défaut ────────────────────────────────────────────────────────────────────

const defaultConfig = (): ScoringConfig => ({
  poids: { jours_retard: 0.30, ratio_impaye: 0.20, garanties: 0.15, joignabilite: 0.10, historique_promesses: 0.15, echeances_impayees: 0.10 },
  seuils_jours_retard: { palier_1_jours: 15, palier_1_score: 90, palier_2_jours: 30, palier_2_score: 75, palier_3_jours: 60, palier_3_score: 50, palier_4_jours: 90, palier_4_score: 30, palier_5_jours: 180, palier_5_score: 15, palier_6_score: 5 },
  seuils_ratio_impaye: { palier_1_pct: 10, palier_1_score: 90, palier_2_pct: 25, palier_2_score: 70, palier_3_pct: 50, palier_3_score: 45, palier_4_pct: 75, palier_4_score: 20, palier_5_score: 5 },
  seuils_echeances: { palier_1_nb: 1, palier_1_score: 90, palier_2_nb: 3, palier_2_score: 65, palier_3_nb: 6, palier_3_score: 35, palier_4_score: 10 },
  scores_garanties: { avec_garantie: 80, sans_garantie: 20 },
  scores_joignabilite: { avec_telephone: 80, sans_telephone: 20 },
  seuils_niveaux: { faible: 70, moyen: 50, eleve: 30, recommandation_faible: 'Relance amiable par SMS, forte probabilité de régularisation', recommandation_moyen: 'Relance téléphonique recommandée, négocier un échéancier', recommandation_eleve: 'Mise en demeure à envisager, visite terrain si possible', recommandation_critique: 'Risque de perte élevé, envisager contentieux ou passage en perte' },
});

// ── Composants helpers ─────────────────────────────────────────────────────────

const Help = ({ text }: { text: string }) => (
  <p className="text-[11px] text-[#93C5FD] mb-2 px-2.5 py-1.5 bg-[#0f172a] border border-[#1e3a5f]/60 rounded-md">{text}</p>
);

const Label = ({ children }: { children: React.ReactNode }) => (
  <label className="block text-xs font-semibold text-[#E2E8F0] mb-1.5 px-2 py-1 bg-[#1e2d45] border border-[#2d4a6e]/50 rounded-md w-fit">{children}</label>
);

const NumInput = ({ value, onChange, min = 0, max = 100, step = 1 }: { value: number; onChange: (v: number) => void; min?: number; max?: number; step?: number }) => (
  <input
    type="number"
    value={value}
    min={min}
    max={max}
    step={step}
    onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
    className="w-full px-3 py-2 bg-[#0d1526] border border-white/10 rounded-lg text-[#E2E8F0] text-sm focus:outline-none focus:border-[#d32f2f]/60"
  />
);

const TextArea = ({ value, onChange }: { value: string; onChange: (v: string) => void }) => (
  <textarea
    value={value}
    onChange={(e) => onChange(e.target.value)}
    rows={2}
    className="w-full px-3 py-2 bg-[#0d1526] border border-white/10 rounded-lg text-[#E2E8F0] text-sm resize-none focus:outline-none focus:border-[#d32f2f]/60"
  />
);

const SectionCard = ({ title, accent, children }: { title: string; accent: string; children: React.ReactNode }) => (
  <div className="rounded-xl overflow-hidden mb-5" style={{ borderTop: '1px solid rgba(255,255,255,0.08)', borderRight: '1px solid rgba(255,255,255,0.08)', borderBottom: '1px solid rgba(255,255,255,0.08)', borderLeft: `3px solid ${accent}` }}>
    <div className="px-5 py-3 bg-[#111827]/60" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
      <h3 className="text-sm font-bold text-[#E2E8F0]">{title}</h3>
    </div>
    <div className="p-5 bg-[#0d1526]/40">{children}</div>
  </div>
);

// ── Composant principal ────────────────────────────────────────────────────────

const ScoringSettingsTab = () => {
  const [config, setConfig] = useState<ScoringConfig>(defaultConfig());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    apiClient.get<ScoringConfig>('/impayes/scoring/config')
      .then((data) => setConfig({ ...defaultConfig(), ...data }))
      .catch(() => setConfig(defaultConfig()))
      .finally(() => setLoading(false));
  }, []);

  const setP = (key: keyof ScoringConfig, sub: string, val: number | string) =>
    setConfig((c) => ({ ...c, [key]: { ...(c[key] as any), [sub]: val } }));

  const totalPoids = Math.round(
    Object.values(config.poids).reduce((s, v) => s + v, 0) * 100
  );

  const handleSave = async () => {
    if (totalPoids !== 100) {
      setError(`La somme des poids doit être égale à 100% (actuellement ${totalPoids}%)`);
      return;
    }
    setSaving(true);
    setError('');
    setMessage('');
    try {
      await apiClient.put('/impayes/scoring/config', { config });
      setMessage('Configuration enregistrée avec succès');
      setTimeout(() => setMessage(''), 3000);
    } catch (err: any) {
      setError(err.message || 'Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    if (confirm('Réinitialiser aux valeurs par défaut ?')) setConfig(defaultConfig());
  };

  if (loading) return (
    <div className="flex items-center justify-center py-12 text-[#94A3B8]">Chargement...</div>
  );

  const poidsFacteurs: { key: keyof ScoringPoidsConfig; label: string; desc: string; color: string }[] = [
    { key: 'jours_retard', label: 'Jours de retard', color: '#ef4444', desc: "Le nombre de jours écoulés depuis le premier impayé. C'est généralement le signal le plus fort de difficulté de remboursement. Plus le retard est long, plus le risque est élevé." },
    { key: 'ratio_impaye', label: 'Ratio impayé / encours', color: '#f59e0b', desc: "La part de l'encours total qui est en impayé. Un impayé de 50 000 FCFA sur un crédit de 100 000 FCFA = 50%. Un ratio élevé indique que le client est très en difficulté par rapport au capital emprunté." },
    { key: 'garanties', label: 'Présence de garanties', color: '#3b82f6', desc: "Si le crédit est adossé à une garantie (hypothèque, nantissement, caution...), la probabilité de recouvrement est plus forte car on peut activer la garantie. Sans garantie, le risque de perte est plus élevé." },
    { key: 'joignabilite', label: 'Joignabilité du client', color: '#8b5cf6', desc: "Si le numéro de téléphone du client est renseigné dans le fichier. Un client joignable peut être relancé par SMS/appel. Un client injoignable complique drastiquement le recouvrement." },
    { key: 'historique_promesses', label: 'Historique des promesses', color: '#22c55e', desc: "Le taux de promesses de paiement honorées par le client dans le passé. Si le client a promis 5 fois et payé 4 fois → 80%. Un bon historique est un signal fort de bonne volonté." },
    { key: 'echeances_impayees', label: "Nb d'échéances impayées", color: '#ec4899', desc: "Le nombre d'échéances successives en impayé. 1 échéance peut être un oubli ou un retard de salaire. 6+ échéances indique une situation financière structurellement dégradée." },
  ];

  return (
    <div className="space-y-1">
      {/* En-tête explication */}
      <div className="mb-6 p-4 rounded-xl bg-[#0f172a] border border-[#1e3a5f]/40">
        <h2 className="text-base font-bold text-[#E2E8F0] mb-2">🎯 Moteur de scoring de recouvrabilité</h2>
        <p className="text-sm text-[#CBD5E1] leading-relaxed">
          Le score est calculé <strong className="text-[#CBD5E1]">à la demande</strong> pour chaque dossier impayé.
          Il va de <strong className="text-[#22c55e]">0</strong> (perte certaine) à <strong className="text-[#22c55e]">100</strong> (recouvrement quasi-certain).
          Chaque organisation peut adapter les poids, les seuils et les recommandations à son modèle d'affaires.
        </p>
      </div>

      {/* Section A — Poids */}
      <SectionCard title="A — Pondération des facteurs (total doit = 100%)" accent="#d32f2f">
        <Help text="Chaque facteur contribue au score final selon son poids. Adaptez ces poids à la réalité de votre portefeuille : si vos clients ont rarement de téléphone, réduisez le poids 'Joignabilité'. Si vos crédits sont systématiquement garantis, le poids 'Garanties' peut être réduit." />
        <div className={`mb-4 px-3 py-2 rounded-lg text-sm font-bold text-center ${totalPoids === 100 ? 'bg-[#22c55e]/15 text-[#22c55e] border border-[#22c55e]/30' : 'bg-[#ef4444]/15 text-[#ef4444] border border-[#ef4444]/30'}`}>
          Total actuel : {totalPoids}% {totalPoids === 100 ? '✓' : `— il manque ${100 - totalPoids}% ou il y a ${totalPoids - 100}% de trop`}
        </div>
        <div className="space-y-4">
          {poidsFacteurs.map(({ key, label, desc, color }) => {
            const pct = Math.round(config.poids[key] * 100);
            return (
              <div key={key} className="p-3 rounded-lg bg-[#111827]/50 border border-white/5">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <Label>{label}</Label>
                    <p className="text-[11px] text-[#CBD5E1] mt-1">{desc}</p>
                  </div>
                  <div className="flex items-center gap-2 ml-4 flex-shrink-0">
                    <input
                      type="range"
                      min={0}
                      max={100}
                      step={5}
                      value={pct}
                      onChange={(e) => setP('poids', key, parseInt(e.target.value) / 100)}
                      className="w-24 accent-[#d32f2f]"
                    />
                    <span className="text-sm font-bold w-10 text-right" style={{ color }}>{pct}%</span>
                  </div>
                </div>
                <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                  <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
                </div>
              </div>
            );
          })}
        </div>
      </SectionCard>

      {/* Section B — Seuils jours de retard */}
      <SectionCard title="B — Paliers : Jours de retard → Score" accent="#ef4444">
        <Help text="Définissez à partir de combien de jours de retard on attribue quel score. Ex: si votre activité est très saisonnière, un retard de 30j peut être normal — vous pouvez augmenter le score du palier 2. Les seuils doivent être croissants." />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {([1,2,3,4,5] as const).map((i) => (
            <div key={i} className="p-3 bg-[#111827]/50 rounded-lg border border-white/5">
              <Label>Palier {i} : ≤</Label>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <p className="text-[11px] text-[#CBD5E1] mb-1">Jours max</p>
                  <NumInput
                    value={(config.seuils_jours_retard as any)[`palier_${i}_jours`]}
                    onChange={(v) => setP('seuils_jours_retard', `palier_${i}_jours`, v)}
                    min={0} max={3650}
                  />
                </div>
                <div>
                  <p className="text-[11px] text-[#CBD5E1] mb-1">Score (0-100)</p>
                  <NumInput
                    value={(config.seuils_jours_retard as any)[`palier_${i}_score`]}
                    onChange={(v) => setP('seuils_jours_retard', `palier_${i}_score`, v)}
                  />
                </div>
              </div>
            </div>
          ))}
          <div className="p-3 bg-[#111827]/50 rounded-lg border border-white/5">
            <Label>Palier 6 : &gt; palier 5 jours</Label>
            <p className="text-[11px] text-[#CBD5E1] mb-1">Score attribué (retard très long)</p>
            <NumInput
              value={config.seuils_jours_retard.palier_6_score}
              onChange={(v) => setP('seuils_jours_retard', 'palier_6_score', v)}
            />
          </div>
        </div>
      </SectionCard>

      {/* Section C — Ratio impayé/encours */}
      <SectionCard title="C — Paliers : Ratio impayé/encours (%) → Score" accent="#f59e0b">
        <Help text="Le ratio = montant impayé / encours principal × 100. Plus ce ratio est élevé, plus la situation est grave. Pour les microcrédits où les montants sont faibles, vous pouvez être plus tolérant sur les petits ratios." />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {([1,2,3,4] as const).map((i) => (
            <div key={i} className="p-3 bg-[#111827]/50 rounded-lg border border-white/5">
              <Label>Palier {i} : ≤</Label>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <p className="text-[11px] text-[#CBD5E1] mb-1">Ratio max (%)</p>
                  <NumInput
                    value={(config.seuils_ratio_impaye as any)[`palier_${i}_pct`]}
                    onChange={(v) => setP('seuils_ratio_impaye', `palier_${i}_pct`, v)}
                    min={0} max={100}
                  />
                </div>
                <div>
                  <p className="text-[11px] text-[#CBD5E1] mb-1">Score (0-100)</p>
                  <NumInput
                    value={(config.seuils_ratio_impaye as any)[`palier_${i}_score`]}
                    onChange={(v) => setP('seuils_ratio_impaye', `palier_${i}_score`, v)}
                  />
                </div>
              </div>
            </div>
          ))}
          <div className="p-3 bg-[#111827]/50 rounded-lg border border-white/5">
            <Label>Palier 5 : &gt; palier 4 %</Label>
            <p className="text-[11px] text-[#CBD5E1] mb-1">Score (ratio très élevé)</p>
            <NumInput
              value={config.seuils_ratio_impaye.palier_5_score}
              onChange={(v) => setP('seuils_ratio_impaye', 'palier_5_score', v)}
            />
          </div>
        </div>
      </SectionCard>

      {/* Section D — Nb échéances */}
      <SectionCard title="D — Paliers : Nombre d'échéances impayées → Score" accent="#8b5cf6">
        <Help text="Le nombre d'échéances consécutives en impayé est un signal de profondeur de la difficulté. 1 échéance = incident ponctuel. 6+ échéances = défaillance structurelle. Adaptez selon votre type de produit (mensuel, trimestriel...)." />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {([1,2,3] as const).map((i) => (
            <div key={i} className="p-3 bg-[#111827]/50 rounded-lg border border-white/5">
              <Label>Palier {i} : ≤</Label>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <p className="text-[11px] text-[#CBD5E1] mb-1">Nb échéances max</p>
                  <NumInput
                    value={(config.seuils_echeances as any)[`palier_${i}_nb`]}
                    onChange={(v) => setP('seuils_echeances', `palier_${i}_nb`, v)}
                    min={0} max={100}
                  />
                </div>
                <div>
                  <p className="text-[11px] text-[#CBD5E1] mb-1">Score (0-100)</p>
                  <NumInput
                    value={(config.seuils_echeances as any)[`palier_${i}_score`]}
                    onChange={(v) => setP('seuils_echeances', `palier_${i}_score`, v)}
                  />
                </div>
              </div>
            </div>
          ))}
          <div className="p-3 bg-[#111827]/50 rounded-lg border border-white/5">
            <Label>Palier 4 : &gt; palier 3 échéances</Label>
            <p className="text-[11px] text-[#CBD5E1] mb-1">Score (très nombreuses échéances)</p>
            <NumInput
              value={config.seuils_echeances.palier_4_score}
              onChange={(v) => setP('seuils_echeances', 'palier_4_score', v)}
            />
          </div>
        </div>
      </SectionCard>

      {/* Section E — Garanties */}
      <SectionCard title="E — Scores : Présence de garanties" accent="#3b82f6">
        <Help text="Score attribué selon que le crédit a ou non une garantie. Si dans votre activité tous les crédits sont garantis (ex : immobilier), les deux scores seront proches. Si les garanties sont rares (microcrédit), l'écart sera grand." />
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Avec garantie</Label>
            <Help text="Ex : hypothèque, nantissement, caution solidaire, gage..." />
            <NumInput value={config.scores_garanties.avec_garantie} onChange={(v) => setP('scores_garanties', 'avec_garantie', v)} />
          </div>
          <div>
            <Label>Sans garantie</Label>
            <Help text="Aucune garantie renseignée dans le fichier d'import." />
            <NumInput value={config.scores_garanties.sans_garantie} onChange={(v) => setP('scores_garanties', 'sans_garantie', v)} />
          </div>
        </div>
      </SectionCard>

      {/* Section F — Joignabilité */}
      <SectionCard title="F — Scores : Joignabilité du client" accent="#22c55e">
        <Help text="Score selon si un numéro de téléphone est renseigné dans le fichier importé. Si votre banque a toujours les coordonnées (agence physique), réduisez l'écart. Si vous avez des crédits distribués à distance, cet écart est très important." />
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Téléphone renseigné</Label>
            <Help text="Le champ téléphone est non vide dans le fichier d'import." />
            <NumInput value={config.scores_joignabilite.avec_telephone} onChange={(v) => setP('scores_joignabilite', 'avec_telephone', v)} />
          </div>
          <div>
            <Label>Sans téléphone</Label>
            <Help text="Aucun numéro de téléphone disponible pour relancer le client." />
            <NumInput value={config.scores_joignabilite.sans_telephone} onChange={(v) => setP('scores_joignabilite', 'sans_telephone', v)} />
          </div>
        </div>
      </SectionCard>

      {/* Section G — Seuils niveaux de risque */}
      <SectionCard title="G — Seuils de classification du risque" accent="#d32f2f">
        <Help text="À quel score bascule-t-on d'un niveau de risque à l'autre ? Adaptez selon la sévérité souhaitée : si votre portefeuille est majoritairement risqué, vous pouvez abaisser le seuil 'faible' pour mieux répartir les alertes." />
        <div className="grid grid-cols-3 gap-4 mb-5">
          {[
            { key: 'faible', label: '🟢 Risque faible', color: '#22c55e', desc: 'Score ≥ X → bon client, relance douce' },
            { key: 'moyen', label: '🟡 Risque moyen', color: '#f59e0b', desc: 'Score ≥ X → attention, relance active' },
            { key: 'eleve', label: '🔴 Risque élevé', color: '#ef4444', desc: 'Score ≥ X → alerte, action urgente. En dessous = Critique' },
          ].map(({ key, label, color, desc }) => (
            <div key={key} className="p-3 bg-[#111827]/50 rounded-lg border border-white/5">
              <Label>{label}</Label>
              <p className="text-[11px] text-[#CBD5E1] mb-2">{desc}</p>
              <NumInput
                value={(config.seuils_niveaux as any)[key]}
                onChange={(v) => setConfig((c) => ({ ...c, seuils_niveaux: { ...c.seuils_niveaux, [key]: v } }))}
                min={0} max={100}
              />
            </div>
          ))}
        </div>
        <div className="space-y-3">
          <h4 className="text-xs font-bold text-[#CBD5E1] uppercase tracking-wider">Recommandations affichées à l'agent</h4>
          {[
            { key: 'recommandation_faible', label: 'Recommandation — Risque faible', color: '#22c55e' },
            { key: 'recommandation_moyen', label: 'Recommandation — Risque moyen', color: '#f59e0b' },
            { key: 'recommandation_eleve', label: 'Recommandation — Risque élevé', color: '#ef4444' },
            { key: 'recommandation_critique', label: 'Recommandation — Risque critique', color: '#7f1d1d' },
          ].map(({ key, label, color }) => (
            <div key={key}>
              <label className="block text-xs font-semibold mb-1 px-2 py-1 rounded-md w-fit border" style={{ color, background: `${color}15`, borderColor: `${color}30` }}>{label}</label>
              <TextArea
                value={(config.seuils_niveaux as any)[key]}
                onChange={(v) => setConfig((c) => ({ ...c, seuils_niveaux: { ...c.seuils_niveaux, [key]: v } }))}
              />
            </div>
          ))}
        </div>
      </SectionCard>

      {/* Messages */}
      {error && <div className="p-3 rounded-lg bg-[#ef4444]/15 border border-[#ef4444]/30 text-[#f87171] text-sm">{error}</div>}
      {message && <div className="p-3 rounded-lg bg-[#22c55e]/15 border border-[#22c55e]/30 text-[#4ade80] text-sm">✓ {message}</div>}

      {/* Barre de sauvegarde */}
      <div className="sticky bottom-0 z-10 flex items-center justify-between gap-4 bg-[#080c1a]/95 border-t border-white/10 backdrop-blur px-5 py-4 rounded-xl">
        <button
          onClick={handleReset}
          className="px-4 py-2 text-sm font-semibold text-[#94A3B8] bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition-all"
        >
          Réinitialiser
        </button>
        <div className="flex items-center gap-3">
          <span className={`text-sm font-semibold ${totalPoids === 100 ? 'text-[#22c55e]' : 'text-[#ef4444]'}`}>
            Poids : {totalPoids}%
          </span>
          <button
            onClick={handleSave}
            disabled={saving || totalPoids !== 100}
            className={`px-6 py-2.5 text-sm font-bold rounded-xl transition-all ${saving || totalPoids !== 100 ? 'bg-[#374151] text-[#94A3B8] cursor-not-allowed' : 'bg-gradient-to-r from-[#d32f2f] to-[#f44336] text-white shadow-lg shadow-[#d32f2f]/20 hover:shadow-[#d32f2f]/40'}`}
          >
            {saving ? 'Enregistrement...' : '💾 Enregistrer la configuration'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ScoringSettingsTab;
