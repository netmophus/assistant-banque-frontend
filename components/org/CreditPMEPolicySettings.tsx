'use client';

import { useState, useEffect, useCallback } from 'react';
import { apiClient } from '@/lib/api/client';
import { PMEPolicyConfig, PMEScoringWeights, defaultPMEPolicy } from '@/types/credit-pme-policy';

// ─────────────────────────────────────────────────────────────────────────────
// Helpers UI
// ─────────────────────────────────────────────────────────────────────────────

function Section({
  title, icon, help, children, accent = '#C9A84C',
}: {
  title: string; icon: string; help: string; children: React.ReactNode; accent?: string;
}) {
  const [open, setOpen] = useState(true);
  return (
    <div className="rounded-2xl overflow-hidden mb-4 transition-all"
      style={{
        background: '#070E28',
        borderTop: `1px solid ${accent}30`,
        borderRight: `1px solid ${accent}30`,
        borderBottom: `1px solid ${accent}30`,
        borderLeft: `3px solid ${accent}`,
        boxShadow: open ? `0 0 20px ${accent}10` : 'none',
      }}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-5 py-4 text-left transition-colors"
        style={{ background: open ? `${accent}10` : 'transparent' }}
      >
        <span className="flex items-center gap-3">
          <span className="text-xl">{icon}</span>
          <span className="font-black text-white text-sm uppercase tracking-[0.08em]">{title}</span>
        </span>
        <svg className="w-4 h-4 flex-shrink-0 transition-transform duration-300"
          style={{ color: accent, transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }}
          fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && (
        <div className="px-5 py-4" style={{ background: '#040B1E', borderTop: `1px solid ${accent}18` }}>
          <p className="text-[11px] text-white/45 mb-4 italic px-3 py-2 rounded-lg"
            style={{ background: 'rgba(27,58,140,0.08)', border: `1px solid ${accent}20` }}>{help}</p>
          <div className="space-y-4">{children}</div>
        </div>
      )}
    </div>
  );
}

function NumInput({
  label, help, value, onChange, step = 1, min, max,
}: {
  label: string; help: string; value: number; onChange: (v: number) => void;
  step?: number; min?: number; max?: number;
}) {
  return (
    <div>
      <label className="block text-xs font-semibold text-white/70 mb-1">{label}</label>
      <p className="text-[11px] text-white/55 mb-2 px-2.5 py-1.5 bg-[#040B1E] border border-[#1B3A8C]/25 rounded-md">{help}</p>
      <input
        type="number"
        value={value}
        step={step}
        min={min}
        max={max}
        onChange={e => onChange(parseFloat(e.target.value) || 0)}
        className="w-full px-3 py-2 bg-[#070E28] border border-[#1B3A8C]/25 rounded-lg text-white text-sm focus:outline-none focus:border-[#C9A84C]/50"
      />
    </div>
  );
}

function Toggle({
  label, help, value, onChange,
}: {
  label: string; help: string; value: boolean; onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="flex-1">
        <p className="text-xs font-semibold text-white/70">{label}</p>
        <p className="text-[11px] text-white/55 mt-1 px-2.5 py-1.5 bg-[#040B1E] border border-[#1B3A8C]/25 rounded-md">{help}</p>
      </div>
      <button
        type="button"
        onClick={() => onChange(!value)}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors shrink-0 mt-0.5 ${value ? 'bg-[#C9A84C]' : 'bg-[#0A1434]'}`}
      >
        <span className={`inline-block h-4 w-4 rounded-full bg-white transition-transform ${value ? 'translate-x-6' : 'translate-x-1'}`} />
      </button>
    </div>
  );
}

function TagsInput({
  label, help, values, onChange,
}: {
  label: string; help: string; values: string[]; onChange: (v: string[]) => void;
}) {
  const [input, setInput] = useState('');
  const add = () => {
    const v = input.trim().toUpperCase();
    if (v && !values.includes(v)) onChange([...values, v]);
    setInput('');
  };
  return (
    <div>
      <label className="block text-xs font-semibold text-white/70 mb-1">{label}</label>
      <p className="text-[11px] text-white/55 mb-2 px-2.5 py-1.5 bg-[#040B1E] border border-[#1B3A8C]/25 rounded-md">{help}</p>
      <div className="flex gap-2 mb-2">
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); add(); } }}
          className="flex-1 px-3 py-2 bg-[#070E28] border border-[#1B3A8C]/25 rounded-lg text-white text-sm focus:outline-none focus:border-[#C9A84C]/50"
          placeholder="Tapez et Entrée"
        />
        <button type="button" onClick={add} className="px-3 py-2 bg-[#C9A84C]/30 hover:bg-[#C9A84C]/50 text-white rounded-lg text-sm">+</button>
      </div>
      <div className="flex flex-wrap gap-2">
        {values.map(v => (
          <span key={v} className="flex items-center gap-1 px-2 py-1 bg-[#C9A84C]/20 border border-[#C9A84C]/30 rounded-full text-xs text-white/80">
            {v}
            <button type="button" onClick={() => onChange(values.filter(x => x !== v))} className="text-[#EF4444] hover:text-red-300 ml-1">×</button>
          </span>
        ))}
        {values.length === 0 && <span className="text-xs text-white/30 italic">Aucune valeur</span>}
      </div>
    </div>
  );
}

function SelectInput({
  label, help, value, onChange, options,
}: {
  label: string; help: string; value: string; onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div>
      <label className="block text-xs font-semibold text-white/70 mb-1">{label}</label>
      <p className="text-[11px] text-white/55 mb-2 px-2.5 py-1.5 bg-[#040B1E] border border-[#1B3A8C]/25 rounded-md">{help}</p>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className="w-full px-3 py-2 bg-[#070E28] border border-[#1B3A8C]/25 rounded-lg text-white text-sm focus:outline-none focus:border-[#C9A84C]/50"
      >
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Poids scoring — validation somme = 100
// ─────────────────────────────────────────────────────────────────────────────

function WeightsEditor({
  weights, onChange,
}: {
  weights: PMEScoringWeights; onChange: (w: PMEScoringWeights) => void;
}) {
  const total = Object.values(weights).reduce((s, v) => s + (v || 0), 0);
  const ok = Math.abs(total - 100) < 0.1;

  const fields: Array<{ key: keyof PMEScoringWeights; label: string }> = [
    { key: 'solidite_financiere', label: 'Solidite financiere' },
    { key: 'capacite_remboursement', label: 'Capacite remboursement' },
    { key: 'qualite_garanties', label: 'Qualite garanties' },
    { key: 'risque_activite', label: 'Risque activite' },
    { key: 'gouvernance', label: 'Gouvernance' },
    { key: 'comportement_bancaire', label: 'Comportement bancaire' },
    { key: 'completude_documentaire', label: 'Completude documentaire' },
    { key: 'completude_financiere', label: 'Completude financiere' },
  ];

  return (
    <div>
      <div className={`text-xs font-bold mb-3 ${ok ? 'text-green-400' : 'text-red-400'}`}>
        Total des poids : {total.toFixed(1)} / 100 {ok ? '✓' : '⚠ doit etre egal a 100'}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {fields.map(f => (
          <div key={f.key}>
            <label className="block text-[11px] text-white/45 mb-1">{f.label}</label>
            <div className="flex items-center gap-2">
              <input
                type="range"
                min={0}
                max={100}
                step={1}
                value={weights[f.key]}
                onChange={e => onChange({ ...weights, [f.key]: parseFloat(e.target.value) })}
                className="flex-1"
              />
              <span className="text-sm text-white w-10 text-right">{weights[f.key]}%</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Composant principal
// ─────────────────────────────────────────────────────────────────────────────

interface Props {
  hasActiveLicense: boolean;
}

export default function CreditPMEPolicySettings({ hasActiveLicense }: Props) {
  const [policy, setPolicy] = useState<PMEPolicyConfig>(defaultPMEPolicy());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const data = await apiClient.get<PMEPolicyConfig>('/credit-policy/pme/policy');
        setPolicy(data);
      } catch {
        // garde les defauts
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Helpers de mise a jour immuable
  const upd = useCallback(<K extends keyof PMEPolicyConfig>(section: K, patch: Partial<PMEPolicyConfig[K]>) => {
    setPolicy(p => ({ ...p, [section]: { ...p[section], ...patch } }));
  }, []);

  const weightsSum = Object.values(policy.scoring.weights).reduce((s, v) => s + (v || 0), 0);

  const handlePrint = useCallback(() => {
    const p = policy;
    const fmt = (v: number | null | undefined, suffix = '') =>
      v == null ? 'N/A' : v.toLocaleString('fr-FR') + (suffix ? ' ' + suffix : '');
    const bool = (v: boolean) => v ? 'Oui' : 'Non';
    const tags = (arr: string[]) => arr.length ? arr.join(', ') : '—';

    const row = (label: string, value: string) =>
      `<tr><td class="lbl">${label}</td><td class="val">${value}</td></tr>`;

    const section = (title: string, icon: string, rows: string) =>
      `<div class="section"><div class="sec-title">${icon} ${title}</div><table>${rows}</table></div>`;

    const html = `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8">
<title>Politique Crédit PME/PMI — ${p.general.policy_version}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Segoe UI', Arial, sans-serif; background: #fff; color: #1e293b; font-size: 11px; }
  .page { max-width: 900px; margin: 0 auto; padding: 24px; }
  .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 3px solid #C9A84C; padding-bottom: 14px; margin-bottom: 20px; }
  .header h1 { font-size: 20px; font-weight: 800; color: #1e293b; }
  .header p { font-size: 11px; color: #64748b; margin-top: 4px; }
  .badge { background: #C9A84C; color: white; padding: 3px 10px; border-radius: 20px; font-size: 10px; font-weight: 700; }
  .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
  .section { border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; break-inside: avoid; }
  .sec-title { background: #f1f5f9; padding: 7px 12px; font-weight: 700; font-size: 11px; color: #334155; border-bottom: 1px solid #e2e8f0; }
  table { width: 100%; border-collapse: collapse; }
  tr:nth-child(even) { background: #f8fafc; }
  td { padding: 4px 10px; vertical-align: top; }
  td.lbl { color: #64748b; width: 55%; font-size: 10px; }
  td.val { font-weight: 600; color: #0f172a; font-size: 10px; }
  .weights-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 4px 16px; padding: 8px 10px; }
  .wrow { display: flex; justify-content: space-between; align-items: center; }
  .wlbl { color: #64748b; font-size: 10px; }
  .wval { font-weight: 700; color: #C9A84C; font-size: 10px; }
  .bar-bg { height: 5px; background: #e2e8f0; border-radius: 3px; flex: 1; margin: 0 8px; }
  .bar-fill { height: 100%; background: #C9A84C; border-radius: 3px; }
  .tags { display: flex; flex-wrap: wrap; gap: 4px; }
  .tag { background: #ede9fe; color: #6d28d9; padding: 1px 6px; border-radius: 10px; font-size: 9px; font-weight: 600; }
  .footer { margin-top: 20px; padding-top: 10px; border-top: 1px solid #e2e8f0; text-align: center; color: #94a3b8; font-size: 9px; }
  @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } .page { padding: 12px; } }
</style></head><body><div class="page">

<div class="header">
  <div>
    <h1>Politique de Crédit PME/PMI</h1>
    <p>Version ${p.general.policy_version} &nbsp;•&nbsp; Devise : ${p.general.currency} &nbsp;•&nbsp; Stratégie : ${p.general.strategy}</p>
    ${p.general.internal_note ? `<p style="margin-top:6px;color:#64748b;font-style:italic">${p.general.internal_note}</p>` : ''}
  </div>
  <div>
    <div class="badge">${p.general.enabled ? 'MODULE ACTIF' : 'MODULE INACTIF'}</div>
    <p style="text-align:right;margin-top:6px;color:#94a3b8;font-size:9px">Imprimé le ${new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })}</p>
  </div>
</div>

<div class="grid">

${section('A — Paramètres généraux', '⚙️', [
  row('Module activé', bool(p.general.enabled)),
  row('Stratégie', p.general.strategy),
  row('Mode strict', bool(p.general.strict_mode)),
  row('Explications activées', bool(p.general.enable_explanations)),
  row('Simulations activées', bool(p.general.enable_simulations)),
  row('Nb max simulations', String(p.general.max_simulations)),
  row('Devise', p.general.currency),
].join(''))}

${section('B — Éligibilité entreprise', '🏢', [
  row('Ancienneté min (ans)', fmt(p.eligibility.min_company_age_years)),
  row('Ancienneté conditionnelle (ans)', fmt(p.eligibility.conditional_company_age_years)),
  row('Effectif min', fmt(p.eligibility.min_employees)),
  row('Expérience dirigeant min (ans)', fmt(p.eligibility.min_manager_experience_years)),
  row('Seuil grand montant', fmt(p.eligibility.large_amount_threshold)),
  row('Équipe structurée (grands montants)', bool(p.eligibility.require_structured_team_for_large)),
  row('Formes juridiques acceptées', tags(p.eligibility.accepted_legal_forms)),
  row('Formes refusées', tags(p.eligibility.rejected_legal_forms)),
  row('Secteurs acceptés', tags(p.eligibility.accepted_sectors)),
  row('Secteurs restreints', tags(p.eligibility.restricted_sectors)),
  row('Secteurs refusés', tags(p.eligibility.rejected_sectors)),
].join(''))}

${section('C — Seuils financiers', '📊', [
  row('CA minimum', fmt(p.financial_thresholds.min_ca)),
  row('Résultat net minimum', fmt(p.financial_thresholds.min_resultat_net)),
  row('EBITDA minimum', fmt(p.financial_thresholds.min_ebitda)),
  row('Fonds propres minimum', fmt(p.financial_thresholds.min_fonds_propres)),
  row('Endettement maximum', fmt(p.financial_thresholds.max_endettement_total)),
  row('Trésorerie minimum', fmt(p.financial_thresholds.min_tresorerie)),
  row('Financières incomplètes tolérées', bool(p.financial_thresholds.allow_incomplete_financials)),
  row('Score complétude financière min', fmt(p.financial_thresholds.min_financial_completeness_score, '%')),
].join(''))}

${section('D — Ratios financiers', '📐', [
  row('Ratio D/E activé', bool(p.ratios.enable_debt_equity)),
  row('D/E max (BLOQUANT)', fmt(p.ratios.max_debt_equity)),
  row('D/E conditionnel', fmt(p.ratios.conditional_debt_equity)),
  row('DSCR activé', bool(p.ratios.enable_dscr)),
  row('DSCR minimum approuvé', fmt(p.ratios.min_dscr)),
  row('DSCR conditionnel', fmt(p.ratios.conditional_dscr)),
  row('Couverture trésorerie activée', bool(p.ratios.enable_treasury_coverage)),
  row('Couverture trésorerie min (mois)', fmt(p.ratios.min_treasury_months)),
  row('Tendance CA activée', bool(p.ratios.enable_ca_trend)),
  row('Tendance CA min', fmt(p.ratios.min_ca_trend_pct, '%')),
  row('Tendance résultat activée', bool(p.ratios.enable_result_trend)),
  row('Tendance résultat min', fmt(p.ratios.min_result_trend_pct, '%')),
].join(''))}

${section('E — Garanties', '🔒', [
  row('Garanties requises au-dessus de', fmt(p.guarantees.guarantee_required_above)),
  row('Couverture min approbation', fmt(p.guarantees.min_guarantee_coverage_pct, '%')),
  row('Couverture conditionnelle', fmt(p.guarantees.conditional_guarantee_coverage_pct, '%')),
  row('Décote (haircut)', fmt(p.guarantees.haircut_pct, '%')),
  row('Docs garantie requis', bool(p.guarantees.require_guarantee_docs)),
  row('Garantie libre de charges', bool(p.guarantees.require_guarantee_free_of_charges)),
  row('Types acceptés', tags(p.guarantees.accepted_guarantee_types)),
  row('Types refusés', tags(p.guarantees.rejected_guarantee_types)),
].join(''))}

${section('F — Bancarisation', '🏦', [
  row('Relation bancaire requise', bool(p.banking.require_bank_relationship)),
  row('Ancienneté relation min (mois)', fmt(p.banking.min_bank_relationship_months)),
  row('Domiciliation requise', bool(p.banking.require_flux_domiciliation_for_approval)),
  row('Flux mensuels min', fmt(p.banking.min_monthly_flux)),
  row('Pénalité incidents activée', bool(p.banking.enable_incident_penalty)),
  row('Niveau incidents max toléré (0-3)', fmt(p.banking.max_incident_level)),
  row('Historique requis (grands montants)', bool(p.banking.require_credit_history_for_large)),
  row('Seuil grand montant bancarisation', fmt(p.banking.large_exposure_threshold)),
].join(''))}

${section('G — Risque commercial', '⚠️', [
  row('Concentration client activée', bool(p.commercial_risk.enable_client_concentration)),
  row('Concentration client max', fmt(p.commercial_risk.max_client_concentration_pct, '%')),
  row('Concentration conditionnelle', fmt(p.commercial_risk.conditional_client_concentration_pct, '%')),
  row('Dépendance fournisseur activée', bool(p.commercial_risk.enable_supplier_dependency)),
  row('Dépendance fournisseur max', fmt(p.commercial_risk.max_supplier_dependency_pct, '%')),
  row('Dépendance conditionnelle', fmt(p.commercial_risk.conditional_supplier_dependency_pct, '%')),
  row('Risque saisonnalité activé', bool(p.commercial_risk.enable_seasonality_risk)),
  row('Saisonnalité max tolérée', fmt(p.commercial_risk.max_seasonality_level)),
].join(''))}

${section('H — Gouvernance', '👔', [
  row('Analyse gouvernance activée', bool(p.governance.enable_governance_analysis)),
  row('Score gouvernance min', fmt(p.governance.min_governance_score)),
  row('Ancienneté dirigeant min (ans)', fmt(p.governance.min_manager_seniority_years)),
  row('Bonus équipe structurée', fmt(p.governance.structured_team_bonus, 'pts')),
  row('Pénalité gouvernance faible', fmt(p.governance.weak_governance_penalty, 'pts')),
  row('Bonus expérience dirigeant', fmt(p.governance.manager_experience_bonus, 'pts')),
].join(''))}

${section('I — Politique documentaire', '📂', [
  row('Politique documentaire activée', bool(p.document_policy.enable_document_policy)),
  row('Score complétude docs min', fmt(p.document_policy.min_document_completeness_score, '%')),
  row('Blocage si docs clés manquants', bool(p.document_policy.block_if_key_docs_missing)),
  row('Documents clés', tags(p.document_policy.key_mandatory_docs)),
  row('Bonus dossier complet', fmt(p.document_policy.complete_dossier_bonus, 'pts')),
  row('Pénalité doc clé manquant', fmt(p.document_policy.missing_key_doc_penalty, 'pts')),
].join(''))}

${section('K — Bonus / Malus', '⚡', [
  row('Bonus domiciliation', fmt(p.bonus_malus.bonus_domiciliation, 'pts')),
  row('Bonus client existant', fmt(p.bonus_malus.bonus_client_existant, 'pts')),
  row('Bonus bon historique remb.', fmt(p.bonus_malus.bonus_bon_historique_remboursement, 'pts')),
  row('Bonus gouvernance forte', fmt(p.bonus_malus.bonus_gouvernance_forte, 'pts')),
  row('Pénalité incidents bancaires', fmt(p.bonus_malus.penalty_incidents_bancaires, 'pts')),
  row('Pénalité concentration client', fmt(p.bonus_malus.penalty_concentration_client, 'pts')),
  row('Pénalité dépendance fournisseur', fmt(p.bonus_malus.penalty_dependance_fournisseur, 'pts')),
  row('Pénalité financières incomplètes', fmt(p.bonus_malus.penalty_donnees_financieres_incompletes, 'pts')),
  row('Pénalité documentation faible', fmt(p.bonus_malus.penalty_documentation_faible, 'pts')),
].join(''))}

${section('L — Dérogation', '🔑', [
  row('Dérogations autorisées', bool(p.override.allow_manual_override)),
  row('Justification obligatoire', bool(p.override.require_justification)),
  row('Journal d\'audit', bool(p.override.require_audit_log)),
  row('Rôles autorisés', tags(p.override.override_roles)),
].join(''))}

</div>

<!-- Scoring — pleine largeur -->
<div class="section" style="margin-top:14px">
  <div class="sec-title">🎯 J — Scoring</div>
  <table>
    <tr>${[
      row('Scoring activé', bool(p.scoring.enabled)),
      row('Seuil approbation', fmt(p.scoring.score_approval, 'pts')),
      row('Seuil conditionnel', fmt(p.scoring.score_conditional, 'pts')),
      row('Seuil rejet', fmt(p.scoring.score_rejection, 'pts')),
    ].join('')}</tr>
  </table>
  <div style="padding:8px 10px 6px;border-top:1px solid #e2e8f0;">
    <p style="font-weight:700;font-size:10px;color:#334155;margin-bottom:8px">Pondération des dimensions</p>
    <div class="weights-grid">
      ${[
        ['Solidité financière', p.scoring.weights.solidite_financiere],
        ['Capacité remboursement', p.scoring.weights.capacite_remboursement],
        ['Qualité garanties', p.scoring.weights.qualite_garanties],
        ['Risque activité', p.scoring.weights.risque_activite],
        ['Gouvernance', p.scoring.weights.gouvernance],
        ['Comportement bancaire', p.scoring.weights.comportement_bancaire],
        ['Complétude documentaire', p.scoring.weights.completude_documentaire],
        ['Complétude financière', p.scoring.weights.completude_financiere],
      ].map(([lbl, val]) =>
        `<div class="wrow"><span class="wlbl">${lbl}</span><div class="bar-bg"><div class="bar-fill" style="width:${val}%"></div></div><span class="wval">${val}%</span></div>`
      ).join('')}
    </div>
  </div>
</div>

<div class="footer">Politique de Crédit PME/PMI &nbsp;•&nbsp; Version ${p.general.policy_version} &nbsp;•&nbsp; Imprimé le ${new Date().toLocaleDateString('fr-FR')}</div>
</div></body></html>`;

    const win = window.open('', '_blank');
    if (!win) return;
    win.document.write(html);
    win.document.close();
    win.onload = () => { win.focus(); win.print(); };
  }, [policy]);

  const handleSave = async () => {
    setError('');
    // Validation somme des poids
    if (Math.abs(weightsSum - 100) > 0.1) {
      setError('La somme des poids de scoring doit etre egale a 100.');
      return;
    }
    // Validation coherence des seuils scoring
    if (policy.scoring.score_approval <= policy.scoring.score_conditional ||
        policy.scoring.score_conditional <= policy.scoring.score_rejection) {
      setError('Seuils scoring incoherents : approbation > conditionnel > rejet requis.');
      return;
    }
    setSaving(true);
    try {
      await apiClient.put('/credit-policy/pme/policy', policy);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (e: any) {
      setError(e?.message || 'Erreur lors de la sauvegarde.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="text-center">
          <div className="relative w-12 h-12 mx-auto mb-4">
            <div className="absolute inset-0 border-2 border-[#1B3A8C]/30 rounded-full" />
            <div className="absolute inset-0 border-2 border-transparent border-t-[#C9A84C] rounded-full animate-spin" />
          </div>
          <p className="text-white/60 text-sm">Chargement de la politique PME/PMI…</p>
        </div>
      </div>
    );
  }

  const disabled = !hasActiveLicense;

  return (
    <div className={disabled ? 'opacity-60 pointer-events-none' : ''}>
      {/* Header */}
      <div className="px-6 py-5 flex items-center gap-4" style={{ borderBottom: '1px solid rgba(201,168,76,0.15)', background: 'rgba(201,168,76,0.05)' }}>
        <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: 'rgba(201,168,76,0.15)', border: '1px solid rgba(201,168,76,0.3)' }}>
          <svg className="w-5 h-5 text-[#C9A84C]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
          </svg>
        </div>
        <div className="flex-1">
          <h2 className="text-lg font-black text-white">Politique de Crédit PME/PMI</h2>
          <p className="text-xs text-white/45">Moteur de décision déterministe — seuils, ratios, scoring, bonus/malus</p>
        </div>
        {saved && (
          <span className="px-3 py-1.5 rounded-xl text-xs font-black text-[#059669]"
            style={{ background: 'rgba(5,150,105,0.12)', border: '1px solid rgba(5,150,105,0.25)' }}>
            ✓ Sauvegardé
          </span>
        )}
      </div>
      <div className="p-6">

      {error && (
        <div className="mb-4 p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-sm text-red-400">{error}</div>
      )}

      {/* ── A. Paramètres généraux ─────────────────────────────── */}
      <Section title="A — Paramètres généraux" icon="⚙️" help="Stratégie globale du moteur de décision, activation du module, devise, version.">
        <Toggle
          label="Module PME activé"
          help="Si désactivé, toutes les analyses PME seront bloquées."
          value={policy.general.enabled}
          onChange={v => upd('general', { enabled: v })}
        />
        <SelectInput
          label="Stratégie de décision"
          help="RULES_ONLY = uniquement les règles bloquantes. SCORING_ONLY = uniquement le score. HYBRID = règles bloquantes + score (recommandé)."
          value={policy.general.strategy}
          onChange={v => upd('general', { strategy: v as any })}
          options={[
            { value: 'HYBRID', label: 'HYBRID — Règles + Scoring (recommandé)' },
            { value: 'RULES_ONLY', label: 'RULES_ONLY — Règles bloquantes uniquement' },
            { value: 'SCORING_ONLY', label: 'SCORING_ONLY — Score uniquement' },
          ]}
        />
        <Toggle
          label="Mode strict"
          help="En mode strict, le moindre critère conditionnel non satisfait entraîne un refus. Décochez pour être plus souple."
          value={policy.general.strict_mode}
          onChange={v => upd('general', { strict_mode: v })}
        />
        <Toggle
          label="Activer les explications"
          help="Inclure des messages explicatifs (forces, faiblesses, conditions) dans le résultat."
          value={policy.general.enable_explanations}
          onChange={v => upd('general', { enable_explanations: v })}
        />
        <Toggle
          label="Activer les simulations"
          help="Générer automatiquement des scénarios alternatifs (montant réduit, durée allongée…) pour aider le conseiller."
          value={policy.general.enable_simulations}
          onChange={v => upd('general', { enable_simulations: v })}
        />
        <NumInput
          label="Nombre max de simulations"
          help="Entre 1 et 10. Détermine combien de scénarios sont calculés."
          value={policy.general.max_simulations}
          onChange={v => upd('general', { max_simulations: Math.min(10, Math.max(1, Math.round(v))) })}
          min={1} max={10} step={1}
        />
        <div>
          <label className="block text-xs font-semibold text-white/70 mb-1">Devise</label>
          <p className="text-[11px] text-white/55 mb-2 px-2.5 py-1.5 bg-[#040B1E] border border-[#1B3A8C]/25 rounded-md">Code ISO de la devise affichée dans les résultats (ex : DZD, XOF, MAD, EUR).</p>
          <input
            value={policy.general.currency}
            onChange={e => upd('general', { currency: e.target.value })}
            className="w-full px-3 py-2 bg-[#070E28] border border-[#1B3A8C]/25 rounded-lg text-white text-sm focus:outline-none focus:border-[#C9A84C]/50"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-white/70 mb-1">Version de la politique</label>
          <p className="text-[11px] text-white/55 mb-2 px-2.5 py-1.5 bg-[#040B1E] border border-[#1B3A8C]/25 rounded-md">Libellé libre pour identifier la version en vigueur (ex : 2024-v1).</p>
          <input
            value={policy.general.policy_version}
            onChange={e => upd('general', { policy_version: e.target.value })}
            className="w-full px-3 py-2 bg-[#070E28] border border-[#1B3A8C]/25 rounded-lg text-white text-sm focus:outline-none focus:border-[#C9A84C]/50"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-white/70 mb-1">Note interne</label>
          <p className="text-[11px] text-white/55 mb-2 px-2.5 py-1.5 bg-[#040B1E] border border-[#1B3A8C]/25 rounded-md">Commentaire interne non affiché aux conseillers.</p>
          <textarea
            value={policy.general.internal_note}
            onChange={e => upd('general', { internal_note: e.target.value })}
            rows={2}
            className="w-full px-3 py-2 bg-[#070E28] border border-[#1B3A8C]/25 rounded-lg text-white text-sm focus:outline-none focus:border-[#C9A84C]/50"
          />
        </div>
      </Section>

      {/* ── B. Éligibilité entreprise ──────────────────────────── */}
      <Section title="B — Éligibilité entreprise" icon="🏢" help="Critères d'éligibilité de l'entreprise : ancienneté, effectif, forme juridique, secteur d'activité." accent="#1B3A8C">
        <NumInput
          label="Ancienneté minimale (ans) — BLOQUANT"
          help="Une entreprise plus jeune est automatiquement refusée. Ex : 2 = au moins 2 ans d'existence."
          value={policy.eligibility.min_company_age_years}
          onChange={v => upd('eligibility', { min_company_age_years: v })}
          step={0.5} min={0}
        />
        <NumInput
          label="Ancienneté conditionnelle (ans)"
          help="Entre cette valeur et l'ancienneté minimale, le dossier est conditionnel (peut être accepté avec garanties renforcées)."
          value={policy.eligibility.conditional_company_age_years}
          onChange={v => upd('eligibility', { conditional_company_age_years: v })}
          step={0.5} min={0}
        />
        <NumInput
          label="Nombre minimum d'employés"
          help="Effectif déclaré en dessous duquel le dossier est pénalisé. 0 = pas de minimum."
          value={policy.eligibility.min_employees}
          onChange={v => upd('eligibility', { min_employees: Math.round(v) })}
          step={1} min={0}
        />
        <NumInput
          label="Expérience minimale du dirigeant (ans)"
          help="Nombre d'années d'expérience dans le secteur requis. En dessous, le dossier est conditionnel."
          value={policy.eligibility.min_manager_experience_years}
          onChange={v => upd('eligibility', { min_manager_experience_years: v })}
          step={0.5} min={0}
        />
        <NumInput
          label="Seuil grand montant (montant demandé)"
          help="Au-dessus de ce montant, une équipe structurée peut être exigée (si l'option est activée)."
          value={policy.eligibility.large_amount_threshold}
          onChange={v => upd('eligibility', { large_amount_threshold: v })}
          step={1_000_000} min={0}
        />
        <Toggle
          label="Équipe structurée requise pour les grands montants"
          help="Si activé, les dossiers dépassant le seuil ci-dessus doivent avoir une équipe de direction formalisée."
          value={policy.eligibility.require_structured_team_for_large}
          onChange={v => upd('eligibility', { require_structured_team_for_large: v })}
        />
        <TagsInput
          label="Formes juridiques acceptées"
          help="Laissez vide = toutes acceptées. Ex : SARL, SA, SAS, EURL."
          values={policy.eligibility.accepted_legal_forms}
          onChange={v => upd('eligibility', { accepted_legal_forms: v })}
        />
        <TagsInput
          label="Formes juridiques refusées (BLOQUANT)"
          help="Ces formes juridiques entraînent un refus automatique."
          values={policy.eligibility.rejected_legal_forms}
          onChange={v => upd('eligibility', { rejected_legal_forms: v })}
        />
        <TagsInput
          label="Secteurs acceptés"
          help="Laissez vide = tous secteurs acceptés. Si renseigné, seuls ces secteurs sont traités."
          values={policy.eligibility.accepted_sectors}
          onChange={v => upd('eligibility', { accepted_sectors: v })}
        />
        <TagsInput
          label="Secteurs à risque (conditionnels)"
          help="Ces secteurs peuvent être acceptés mais avec des conditions supplémentaires."
          values={policy.eligibility.restricted_sectors}
          onChange={v => upd('eligibility', { restricted_sectors: v })}
        />
        <TagsInput
          label="Secteurs refusés (BLOQUANT)"
          help="Ces secteurs entraînent un refus automatique du dossier."
          values={policy.eligibility.rejected_sectors}
          onChange={v => upd('eligibility', { rejected_sectors: v })}
        />
      </Section>

      {/* ── C. Seuils financiers ───────────────────────────────── */}
      <Section title="C — Seuils financiers" icon="📊" help="Montants minimaux et maximaux absolus sur les données financières. 0 = pas de seuil." accent="#10B981">
        <NumInput
          label="CA minimum (N)"
          help="Chiffre d'affaires de la dernière année en dessous duquel le dossier est pénalisé. 0 = pas de minimum."
          value={policy.financial_thresholds.min_ca}
          onChange={v => upd('financial_thresholds', { min_ca: v })}
          step={100_000} min={0}
        />
        <NumInput
          label="Résultat net minimum (N)"
          help="Résultat net minimal requis. Peut être négatif (ex : -500000 tolère une légère perte)."
          value={policy.financial_thresholds.min_resultat_net}
          onChange={v => upd('financial_thresholds', { min_resultat_net: v })}
          step={100_000}
        />
        <NumInput
          label="EBITDA minimum (N)"
          help="Excédent brut d'exploitation minimal. Un EBITDA nul ou négatif est généralement bloquant."
          value={policy.financial_thresholds.min_ebitda}
          onChange={v => upd('financial_thresholds', { min_ebitda: v })}
          step={100_000}
        />
        <NumInput
          label="Fonds propres minimum"
          help="Capitaux propres minimaux requis. Assure que l'entreprise a une base de fonds propres suffisante."
          value={policy.financial_thresholds.min_fonds_propres}
          onChange={v => upd('financial_thresholds', { min_fonds_propres: v })}
          step={100_000} min={0}
        />
        <NumInput
          label="Endettement total maximum"
          help="Plafond d'endettement. 0 = pas de plafond. Ex : 100000000 = max 100M."
          value={policy.financial_thresholds.max_endettement_total}
          onChange={v => upd('financial_thresholds', { max_endettement_total: v })}
          step={1_000_000} min={0}
        />
        <NumInput
          label="Trésorerie minimum"
          help="Niveau de trésorerie minimal requis pour que le dossier soit considéré."
          value={policy.financial_thresholds.min_tresorerie}
          onChange={v => upd('financial_thresholds', { min_tresorerie: v })}
          step={100_000}
        />
        <Toggle
          label="Autoriser les financières incomplètes"
          help="Si activé, un dossier avec des données financières partielles peut quand même être analysé (avec pénalités de score)."
          value={policy.financial_thresholds.allow_incomplete_financials}
          onChange={v => upd('financial_thresholds', { allow_incomplete_financials: v })}
        />
        <NumInput
          label="Score de complétude financière minimum (%)"
          help="En dessous de ce pourcentage de champs financiers renseignés, le dossier est bloqué (si option désactivée ci-dessus) ou pénalisé."
          value={policy.financial_thresholds.min_financial_completeness_score}
          onChange={v => upd('financial_thresholds', { min_financial_completeness_score: Math.min(100, Math.max(0, v)) })}
          step={5} min={0} max={100}
        />
      </Section>

      {/* ── D. Ratios financiers ───────────────────────────────── */}
      <Section title="D — Ratios financiers" icon="📐" help="Seuils de ratios calculés automatiquement : D/E, DSCR, couverture trésorerie, tendance CA." accent="#F59E0B">
        <Toggle
          label="Activer le ratio D/E (Dette/Fonds propres)"
          help="Le ratio D/E = endettement total / fonds propres. Au-delà du max, le dossier est bloqué."
          value={policy.ratios.enable_debt_equity}
          onChange={v => upd('ratios', { enable_debt_equity: v })}
        />
        <NumInput
          label="D/E maximum (BLOQUANT)"
          help="Au-dessus de ce seuil, le dossier est refusé. Ex : 3 = la dette ne peut pas dépasser 3× les fonds propres."
          value={policy.ratios.max_debt_equity}
          onChange={v => upd('ratios', { max_debt_equity: v })}
          step={0.1} min={0}
        />
        <NumInput
          label="D/E conditionnel"
          help="Entre ce seuil et le maximum, le dossier est conditionnel. En dessous = favorable."
          value={policy.ratios.conditional_debt_equity}
          onChange={v => upd('ratios', { conditional_debt_equity: v })}
          step={0.1} min={0}
        />
        <Toggle
          label="Activer le DSCR (couverture du service de la dette)"
          help="DSCR = CAF estimée / annuité annuelle du nouveau crédit. Mesure la capacité de remboursement réelle."
          value={policy.ratios.enable_dscr}
          onChange={v => upd('ratios', { enable_dscr: v })}
        />
        <NumInput
          label="DSCR minimum approuvé"
          help="En dessous de ce seuil, le dossier est refusé. Ex : 1.2 = les cash-flows couvrent 120% du service de la dette."
          value={policy.ratios.min_dscr}
          onChange={v => upd('ratios', { min_dscr: v })}
          step={0.05} min={0}
        />
        <NumInput
          label="DSCR conditionnel"
          help="Entre ce seuil et le minimum approuvé, le dossier est conditionnel."
          value={policy.ratios.conditional_dscr}
          onChange={v => upd('ratios', { conditional_dscr: v })}
          step={0.05} min={0}
        />
        <Toggle
          label="Activer la couverture trésorerie"
          help="Vérifie si la trésorerie couvre au moins N mois de mensualité."
          value={policy.ratios.enable_treasury_coverage}
          onChange={v => upd('ratios', { enable_treasury_coverage: v })}
        />
        <NumInput
          label="Couverture trésorerie minimum (mois)"
          help="La trésorerie doit couvrir au moins ce nombre de mensualités."
          value={policy.ratios.min_treasury_months}
          onChange={v => upd('ratios', { min_treasury_months: v })}
          step={0.5} min={0}
        />
        <Toggle
          label="Activer la tendance du CA"
          help="Analyse l'évolution du chiffre d'affaires entre N-1 et N. Requiert au moins 2 années de données."
          value={policy.ratios.enable_ca_trend}
          onChange={v => upd('ratios', { enable_ca_trend: v })}
        />
        <NumInput
          label="Tendance CA minimum (%)"
          help="En dessous de cette variation (ex : -10% = baisse de CA acceptée jusqu'à -10%), le dossier est pénalisé."
          value={policy.ratios.min_ca_trend_pct}
          onChange={v => upd('ratios', { min_ca_trend_pct: v })}
          step={1}
        />
        <Toggle
          label="Activer la tendance du résultat net"
          help="Analyse l'évolution du résultat net entre N-1 et N."
          value={policy.ratios.enable_result_trend}
          onChange={v => upd('ratios', { enable_result_trend: v })}
        />
        <NumInput
          label="Tendance résultat net minimum (%)"
          help="Variation minimale tolérée du résultat net. Ex : -20% = une baisse jusqu'à 20% est acceptable."
          value={policy.ratios.min_result_trend_pct}
          onChange={v => upd('ratios', { min_result_trend_pct: v })}
          step={1}
        />
      </Section>

      {/* ── E. Garanties ──────────────────────────────────────────── */}
      <Section title="E — Garanties" icon="🔒" help="Seuils de couverture des garanties, types acceptés/refusés, décote (haircut)." accent="#EF4444">
        <NumInput
          label="Garanties requises au-dessus de (montant)"
          help="En dessous de ce montant, les garanties sont facultatives. Au-dessus, elles deviennent obligatoires."
          value={policy.guarantees.guarantee_required_above}
          onChange={v => upd('guarantees', { guarantee_required_above: v })}
          step={1_000_000} min={0}
        />
        <NumInput
          label="Couverture garanties minimum pour approbation (%)"
          help="Rapport (valeur retenue × (1-haircut)) / montant demandé. En dessous du seuil conditionnel = refus."
          value={policy.guarantees.min_guarantee_coverage_pct}
          onChange={v => upd('guarantees', { min_guarantee_coverage_pct: Math.min(200, Math.max(0, v)) })}
          step={5} min={0} max={200}
        />
        <NumInput
          label="Couverture conditionnelle (%)"
          help="Entre ce pourcentage et le minimum d'approbation, le dossier est conditionnel."
          value={policy.guarantees.conditional_guarantee_coverage_pct}
          onChange={v => upd('guarantees', { conditional_guarantee_coverage_pct: Math.min(200, Math.max(0, v)) })}
          step={5} min={0} max={200}
        />
        <NumInput
          label="Décote (haircut) (%)"
          help="Pourcentage appliqué à la valeur retenue de la garantie pour obtenir sa valeur nette. Ex : 20% = valeur retenue × 0.80."
          value={policy.guarantees.haircut_pct}
          onChange={v => upd('guarantees', { haircut_pct: Math.min(100, Math.max(0, v)) })}
          step={5} min={0} max={100}
        />
        <Toggle
          label="Documents de garantie requis"
          help="Si activé, l'absence de documents de garantie est signalée comme condition."
          value={policy.guarantees.require_guarantee_docs}
          onChange={v => upd('guarantees', { require_guarantee_docs: v })}
        />
        <Toggle
          label="Garantie libre de charges requise"
          help="Si activé, les garanties déjà engagées (hypothèque en cours) ne sont pas acceptées."
          value={policy.guarantees.require_guarantee_free_of_charges}
          onChange={v => upd('guarantees', { require_guarantee_free_of_charges: v })}
        />
        <TagsInput
          label="Types de garanties acceptés"
          help="Ex : HYPOTHEQUE, NANTISSEMENT, CAUTION_PERSO, GAGE_MATERIEL. Laissez vide = tous types."
          values={policy.guarantees.accepted_guarantee_types}
          onChange={v => upd('guarantees', { accepted_guarantee_types: v })}
        />
        <TagsInput
          label="Types de garanties refusés (BLOQUANT)"
          help="Ces types de garanties sont rejetés. Le dossier est bloqué si la garantie proposée est dans cette liste."
          values={policy.guarantees.rejected_guarantee_types}
          onChange={v => upd('guarantees', { rejected_guarantee_types: v })}
        />
      </Section>

      {/* ── F. Bancarisation ──────────────────────────────────────── */}
      <Section title="F — Bancarisation" icon="🏦" help="Historique bancaire, domiciliation des flux, incidents, relation bancaire." accent="#0EA5E9">
        <Toggle
          label="Relation bancaire préalable requise"
          help="Si activé, l'entreprise doit déjà être cliente de votre établissement."
          value={policy.banking.require_bank_relationship}
          onChange={v => upd('banking', { require_bank_relationship: v })}
        />
        <NumInput
          label="Ancienneté relation bancaire minimum (mois)"
          help="Durée minimale de la relation client avant de pouvoir accorder un crédit. Ex : 6 = 6 mois minimum."
          value={policy.banking.min_bank_relationship_months}
          onChange={v => upd('banking', { min_bank_relationship_months: Math.round(v) })}
          step={1} min={0}
        />
        <Toggle
          label="Domiciliation des flux requise pour approbation"
          help="Si activé, la domiciliation des flux de l'entreprise est une condition d'approbation."
          value={policy.banking.require_flux_domiciliation_for_approval}
          onChange={v => upd('banking', { require_flux_domiciliation_for_approval: v })}
        />
        <NumInput
          label="Volume de flux mensuels minimum"
          help="Volume mensuel minimum domicilié requis. 0 = pas de minimum."
          value={policy.banking.min_monthly_flux}
          onChange={v => upd('banking', { min_monthly_flux: v })}
          step={100_000} min={0}
        />
        <Toggle
          label="Activer la pénalité pour incidents bancaires"
          help="Si activé, les incidents bancaires déclarés entraînent une pénalité de score."
          value={policy.banking.enable_incident_penalty}
          onChange={v => upd('banking', { enable_incident_penalty: v })}
        />
        <NumInput
          label="Niveau d'incidents bancaires maximum toléré (0–3)"
          help="0 = aucun incident, 1 = légers, 2 = modérés, 3 = graves. Au-dessus de ce niveau = BLOQUANT."
          value={policy.banking.max_incident_level}
          onChange={v => upd('banking', { max_incident_level: Math.min(3, Math.max(0, Math.round(v))) })}
          step={1} min={0} max={3}
        />
        <Toggle
          label="Historique de crédits requis pour grands montants"
          help="Si activé, les dossiers dépassant le seuil grand montant doivent avoir un historique de remboursement."
          value={policy.banking.require_credit_history_for_large}
          onChange={v => upd('banking', { require_credit_history_for_large: v })}
        />
        <NumInput
          label="Seuil grand montant bancarisation"
          help="Seuil à partir duquel l'historique de crédits est requis (si option activée ci-dessus)."
          value={policy.banking.large_exposure_threshold}
          onChange={v => upd('banking', { large_exposure_threshold: v })}
          step={1_000_000} min={0}
        />
      </Section>

      {/* ── G. Risque commercial ──────────────────────────────────── */}
      <Section title="G — Risque commercial" icon="⚠️" help="Concentration clients/fournisseurs, saisonnalité. Une forte dépendance accroît le risque." accent="#F97316">
        <Toggle
          label="Activer l'analyse de concentration client"
          help="Vérifie si le CA dépend fortement d'un seul client (risque de défaillance en chaîne)."
          value={policy.commercial_risk.enable_client_concentration}
          onChange={v => upd('commercial_risk', { enable_client_concentration: v })}
        />
        <NumInput
          label="Concentration client maximum (%) — BLOQUANT"
          help="Au-dessus de ce pourcentage, le dossier est bloqué. Ex : 80 = un client ne peut pas représenter plus de 80% du CA."
          value={policy.commercial_risk.max_client_concentration_pct}
          onChange={v => upd('commercial_risk', { max_client_concentration_pct: Math.min(100, Math.max(0, v)) })}
          step={5} min={0} max={100}
        />
        <NumInput
          label="Concentration client conditionnelle (%)"
          help="Entre ce seuil et le maximum, le dossier est conditionnel."
          value={policy.commercial_risk.conditional_client_concentration_pct}
          onChange={v => upd('commercial_risk', { conditional_client_concentration_pct: Math.min(100, Math.max(0, v)) })}
          step={5} min={0} max={100}
        />
        <Toggle
          label="Activer l'analyse de dépendance fournisseur"
          help="Vérifie si l'approvisionnement est trop concentré chez un seul fournisseur."
          value={policy.commercial_risk.enable_supplier_dependency}
          onChange={v => upd('commercial_risk', { enable_supplier_dependency: v })}
        />
        <NumInput
          label="Dépendance fournisseur maximum (%) — BLOQUANT"
          help="Au-dessus de ce pourcentage, le dossier est bloqué."
          value={policy.commercial_risk.max_supplier_dependency_pct}
          onChange={v => upd('commercial_risk', { max_supplier_dependency_pct: Math.min(100, Math.max(0, v)) })}
          step={5} min={0} max={100}
        />
        <NumInput
          label="Dépendance fournisseur conditionnelle (%)"
          help="Entre ce seuil et le maximum, le dossier est conditionnel."
          value={policy.commercial_risk.conditional_supplier_dependency_pct}
          onChange={v => upd('commercial_risk', { conditional_supplier_dependency_pct: Math.min(100, Math.max(0, v)) })}
          step={5} min={0} max={100}
        />
        <Toggle
          label="Activer l'analyse de saisonnalité"
          help="Si activé, un niveau de saisonnalité élevé entraîne une pénalité."
          value={policy.commercial_risk.enable_seasonality_risk}
          onChange={v => upd('commercial_risk', { enable_seasonality_risk: v })}
        />
        <NumInput
          label="Niveau de saisonnalité maximum toléré (0–3)"
          help="0 = pas de saisonnalité, 3 = très forte saisonnalité. Au-dessus de ce niveau = PENALISANT."
          value={policy.commercial_risk.max_seasonality_level}
          onChange={v => upd('commercial_risk', { max_seasonality_level: Math.min(3, Math.max(0, Math.round(v))) })}
          step={1} min={0} max={3}
        />
      </Section>

      {/* ── H. Gouvernance ────────────────────────────────────────── */}
      <Section title="H — Gouvernance" icon="👔" help="Qualité de la direction, ancienneté du dirigeant, présence d'une équipe structurée." accent="#8B5CF6">
        <Toggle
          label="Activer l'analyse de gouvernance"
          help="Si activé, la qualité de la gouvernance est évaluée et impacte le score."
          value={policy.governance.enable_governance_analysis}
          onChange={v => upd('governance', { enable_governance_analysis: v })}
        />
        <NumInput
          label="Score de gouvernance minimum (0–100)"
          help="En dessous de ce score interne de gouvernance, une pénalité est appliquée."
          value={policy.governance.min_governance_score}
          onChange={v => upd('governance', { min_governance_score: Math.min(100, Math.max(0, v)) })}
          step={5} min={0} max={100}
        />
        <NumInput
          label="Ancienneté dirigeant minimum (ans)"
          help="Nombre d'années minimum d'ancienneté dans la direction de l'entreprise."
          value={policy.governance.min_manager_seniority_years}
          onChange={v => upd('governance', { min_manager_seniority_years: v })}
          step={0.5} min={0}
        />
        <NumInput
          label="Bonus équipe structurée (points)"
          help="Points bonus ajoutés au score si l'entreprise dispose d'une équipe de direction formalisée."
          value={policy.governance.structured_team_bonus}
          onChange={v => upd('governance', { structured_team_bonus: Math.min(20, Math.max(0, v)) })}
          step={0.5} min={0} max={20}
        />
        <NumInput
          label="Pénalité gouvernance faible (points)"
          help="Points déduits du score si la gouvernance est insuffisante. Valeur négative."
          value={policy.governance.weak_governance_penalty}
          onChange={v => upd('governance', { weak_governance_penalty: Math.min(0, Math.max(-20, v)) })}
          step={0.5} max={0} min={-20}
        />
        <NumInput
          label="Bonus expérience dirigeant (points)"
          help="Points bonus si le dirigeant dépasse l'expérience sectorielle minimale."
          value={policy.governance.manager_experience_bonus}
          onChange={v => upd('governance', { manager_experience_bonus: Math.min(15, Math.max(0, v)) })}
          step={0.5} min={0} max={15}
        />
      </Section>

      {/* ── I. Documents ──────────────────────────────────────────── */}
      <Section title="I — Politique documentaire" icon="📂" help="Documents obligatoires, seuil de complétude, blocage si pièces clés manquantes." accent="#14B8A6">
        <Toggle
          label="Activer la politique documentaire"
          help="Si activé, la complétude du dossier documentaire impacte le score et peut bloquer l'approbation."
          value={policy.document_policy.enable_document_policy}
          onChange={v => upd('document_policy', { enable_document_policy: v })}
        />
        <NumInput
          label="Score de complétude documentaire minimum (%)"
          help="Pourcentage minimum de documents fournis. En dessous, le dossier est pénalisé ou bloqué."
          value={policy.document_policy.min_document_completeness_score}
          onChange={v => upd('document_policy', { min_document_completeness_score: Math.min(100, Math.max(0, v)) })}
          step={5} min={0} max={100}
        />
        <Toggle
          label="Bloquer si documents clés manquants"
          help="Si activé, l'absence d'un document marqué comme bloquant entraîne un refus automatique."
          value={policy.document_policy.block_if_key_docs_missing}
          onChange={v => upd('document_policy', { block_if_key_docs_missing: v })}
        />
        <TagsInput
          label="Documents clés obligatoires (codes)"
          help="Ex : RCCM, NIF, STATUTS, BILAN_N, BILAN_N1, RELEVES_BANCAIRES. Ces codes doivent correspondre aux codes dans la liste documentaire du formulaire utilisateur."
          values={policy.document_policy.key_mandatory_docs}
          onChange={v => upd('document_policy', { key_mandatory_docs: v })}
        />
        <NumInput
          label="Bonus dossier complet (points)"
          help="Points bonus ajoutés au score si tous les documents sont fournis."
          value={policy.document_policy.complete_dossier_bonus}
          onChange={v => upd('document_policy', { complete_dossier_bonus: Math.min(15, Math.max(0, v)) })}
          step={0.5} min={0} max={15}
        />
        <NumInput
          label="Pénalité document clé manquant (points)"
          help="Points déduits par document clé manquant. Valeur négative."
          value={policy.document_policy.missing_key_doc_penalty}
          onChange={v => upd('document_policy', { missing_key_doc_penalty: Math.min(0, Math.max(-30, v)) })}
          step={1} max={0} min={-30}
        />
      </Section>

      {/* ── J. Scoring ────────────────────────────────────────────── */}
      <Section title="J — Scoring" icon="🎯" help="Seuils d'approbation/rejet par score et pondération des 8 dimensions. La somme des poids doit être égale à 100." accent="#6366F1">
        <Toggle
          label="Scoring activé"
          help="Si désactivé (RULES_ONLY), le score n'est pas utilisé dans la décision."
          value={policy.scoring.enabled}
          onChange={v => upd('scoring', { enabled: v })}
        />
        <div className="grid grid-cols-3 gap-3">
          <NumInput
            label="Seuil approbation"
            help="Score >= ce seuil → APPROUVE."
            value={policy.scoring.score_approval}
            onChange={v => upd('scoring', { score_approval: Math.min(100, Math.max(0, v)) })}
            step={1} min={0} max={100}
          />
          <NumInput
            label="Seuil conditionnel"
            help="Score entre seuil conditionnel et seuil approbation → CONDITIONNEL."
            value={policy.scoring.score_conditional}
            onChange={v => upd('scoring', { score_conditional: Math.min(100, Math.max(0, v)) })}
            step={1} min={0} max={100}
          />
          <NumInput
            label="Seuil rejet"
            help="Score <= ce seuil → REFUSE."
            value={policy.scoring.score_rejection}
            onChange={v => upd('scoring', { score_rejection: Math.min(100, Math.max(0, v)) })}
            step={1} min={0} max={100}
          />
        </div>
        {(policy.scoring.score_approval <= policy.scoring.score_conditional ||
          policy.scoring.score_conditional <= policy.scoring.score_rejection) && (
          <p className="text-xs text-red-400">
            Seuils incohérents : approbation ({policy.scoring.score_approval}) doit être supérieur au conditionnel ({policy.scoring.score_conditional}), lui-même supérieur au rejet ({policy.scoring.score_rejection}).
          </p>
        )}
        <div className="mt-2">
          <p className="text-xs font-semibold text-white/70 mb-2">Pondération des dimensions (somme = 100)</p>
          <WeightsEditor
            weights={policy.scoring.weights}
            onChange={w => upd('scoring', { weights: w })}
          />
        </div>
      </Section>

      {/* ── K. Bonus/Malus ────────────────────────────────────────── */}
      <Section title="K — Bonus / Malus" icon="⚡" help="Ajustements du score liés à des comportements spécifiques : domiciliation, incidents, gouvernance forte…" accent="#EC4899">
        <NumInput
          label="Bonus domiciliation des flux (points)"
          help="Points bonus si l'entreprise domicilie ses flux chez vous."
          value={policy.bonus_malus.bonus_domiciliation}
          onChange={v => upd('bonus_malus', { bonus_domiciliation: Math.min(10, Math.max(0, v)) })}
          step={0.5} min={0} max={10}
        />
        <NumInput
          label="Bonus client existant (points)"
          help="Points bonus si c'est un client existant de votre banque."
          value={policy.bonus_malus.bonus_client_existant}
          onChange={v => upd('bonus_malus', { bonus_client_existant: Math.min(10, Math.max(0, v)) })}
          step={0.5} min={0} max={10}
        />
        <NumInput
          label="Bonus bon historique remboursement (points)"
          help="Points bonus si l'entreprise a un historique de remboursement excellent."
          value={policy.bonus_malus.bonus_bon_historique_remboursement}
          onChange={v => upd('bonus_malus', { bonus_bon_historique_remboursement: Math.min(15, Math.max(0, v)) })}
          step={0.5} min={0} max={15}
        />
        <NumInput
          label="Bonus gouvernance forte (points)"
          help="Points bonus si l'entreprise dispose d'une gouvernance formalisée et d'une équipe structurée."
          value={policy.bonus_malus.bonus_gouvernance_forte}
          onChange={v => upd('bonus_malus', { bonus_gouvernance_forte: Math.min(15, Math.max(0, v)) })}
          step={0.5} min={0} max={15}
        />
        <NumInput
          label="Pénalité incidents bancaires (points)"
          help="Points déduits si des incidents bancaires sont signalés. Valeur négative."
          value={policy.bonus_malus.penalty_incidents_bancaires}
          onChange={v => upd('bonus_malus', { penalty_incidents_bancaires: Math.min(0, Math.max(-25, v)) })}
          step={1} max={0} min={-25}
        />
        <NumInput
          label="Pénalité concentration client (points)"
          help="Points déduits si la concentration client dépasse le seuil conditionnel."
          value={policy.bonus_malus.penalty_concentration_client}
          onChange={v => upd('bonus_malus', { penalty_concentration_client: Math.min(0, Math.max(-20, v)) })}
          step={1} max={0} min={-20}
        />
        <NumInput
          label="Pénalité dépendance fournisseur (points)"
          help="Points déduits si la dépendance fournisseur dépasse le seuil conditionnel."
          value={policy.bonus_malus.penalty_dependance_fournisseur}
          onChange={v => upd('bonus_malus', { penalty_dependance_fournisseur: Math.min(0, Math.max(-15, v)) })}
          step={1} max={0} min={-15}
        />
        <NumInput
          label="Pénalité données financières incomplètes (points)"
          help="Points déduits si le score de complétude financière est insuffisant."
          value={policy.bonus_malus.penalty_donnees_financieres_incompletes}
          onChange={v => upd('bonus_malus', { penalty_donnees_financieres_incompletes: Math.min(0, Math.max(-20, v)) })}
          step={1} max={0} min={-20}
        />
        <NumInput
          label="Pénalité documentation faible (points)"
          help="Points déduits si le score de complétude documentaire est insuffisant."
          value={policy.bonus_malus.penalty_documentation_faible}
          onChange={v => upd('bonus_malus', { penalty_documentation_faible: Math.min(0, Math.max(-20, v)) })}
          step={1} max={0} min={-20}
        />
      </Section>

      {/* ── L. Dérogation ─────────────────────────────────────────── */}
      <Section title="L — Dérogation manuelle" icon="🔑" help="Paramètres de dérogation permettant à un admin de forcer une décision avec justification." accent="#64748B">
        <Toggle
          label="Autoriser les dérogations manuelles"
          help="Si activé, un administrateur peut forcer la décision finale sur un dossier."
          value={policy.override.allow_manual_override}
          onChange={v => upd('override', { allow_manual_override: v })}
        />
        <Toggle
          label="Justification obligatoire"
          help="Toute dérogation doit être accompagnée d'un motif écrit."
          value={policy.override.require_justification}
          onChange={v => upd('override', { require_justification: v })}
        />
        <Toggle
          label="Journal d'audit obligatoire"
          help="Chaque dérogation est enregistrée dans le journal d'audit."
          value={policy.override.require_audit_log}
          onChange={v => upd('override', { require_audit_log: v })}
        />
        <TagsInput
          label="Rôles autorisés à déroger"
          help="Ex : org_admin, credit_manager. Ces rôles peuvent forcer une décision."
          values={policy.override.override_roles}
          onChange={v => upd('override', { override_roles: v })}
        />
      </Section>
      </div>{/* close p-6 */}

      {/* ── Barre de sauvegarde ────────────────────────────────────── */}
      <div className="sticky bottom-0 backdrop-blur-lg px-5 py-4 flex items-center justify-between gap-4 z-10"
        style={{ background: 'rgba(4,11,30,0.97)', borderTop: '1px solid rgba(201,168,76,0.2)' }}>
        <div className="text-xs text-white/40">
          Poids scoring : <span className={Math.abs(weightsSum - 100) < 0.1 ? 'text-green-400 font-bold' : 'text-red-400 font-bold'}>{weightsSum.toFixed(1)} / 100</span>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handlePrint}
            className="px-5 py-3 bg-white/10 hover:bg-white/15 text-white/70 font-semibold rounded-xl border border-[#1B3A8C]/25 hover:border-white/20 transition-all flex items-center gap-2 text-sm"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
            Imprimer / PDF
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !hasActiveLicense}
            className="px-8 py-3 text-white font-bold rounded-xl hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            style={{ background: 'linear-gradient(135deg, #1B3A8C 0%, #2e5bb8 50%, #C9A84C 100%)', boxShadow: '0 4px 16px rgba(27,58,140,0.3)' }}
          >
            {saving ? (
              <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /><span>Sauvegarde...</span></>
            ) : saved ? (
              <><span>✓</span><span>Sauvegardé</span></>
            ) : (
              <span>Enregistrer la politique</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
