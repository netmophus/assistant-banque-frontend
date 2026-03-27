'use client';

import { useState, useEffect, useCallback } from 'react';
import { apiClient } from '@/lib/api/client';
import { CreditPolicyConfig, LoanTypeConfig, DocumentRequirement } from '@/types/credit-policy';
import {
  CREDIT_POLICY_META, DECISION_STRATEGY_META, LOAN_TYPE_LABELS,
  CONTRACT_TYPE_OPTIONS, FieldHelpMeta,
} from '@/lib/credit-policy-meta';

interface Props {
  hasActiveLicense: boolean;
}

// ── Helpers UI ────────────────────────────────────────────────────

function HelpTooltip({ meta }: { meta: FieldHelpMeta }) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative inline-block ml-1.5">
      <button
        type="button"
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}
        onClick={() => setShow(!show)}
        className="w-4 h-4 rounded-full bg-[#1B3A8C]/20 border border-[#1B3A8C]/40 text-[#1B3A8C] text-xs flex items-center justify-center hover:bg-[#1B3A8C]/30 transition-colors leading-none"
      >
        ?
      </button>
      {show && (
        <div className="absolute z-50 left-6 top-0 w-80 max-h-80 overflow-auto bg-[#040B1E] border border-[#1B3A8C]/40 rounded-xl p-4 shadow-2xl shadow-[#1B3A8C]/20 text-sm break-words">
          <p className="text-white font-semibold mb-1">{meta.label}</p>
          <p className="text-white/70 mb-2 leading-relaxed">{meta.description}</p>
          {meta.example && (
            <p className="text-white/75 text-xs mb-1">
              Exemple : <span className="text-[#C9A84C] font-medium">{meta.example}</span>
            </p>
          )}
          {meta.unit && (
            <p className="text-white/75 text-xs mb-1">
              Unité : <span className="text-[#C9A84C] font-medium">{meta.unit}</span>
            </p>
          )}
          {meta.impact && (
            <p className="text-[#10B981] text-xs mt-2 pt-2 border-t border-[#1B3A8C]/20 leading-relaxed">
              Impact : {meta.impact}
            </p>
          )}
          {meta.warning && (
            <p className="text-[#C9A84C] text-xs mt-1 leading-relaxed">⚠️ {meta.warning}</p>
          )}
        </div>
      )}
    </div>
  );
}

function SectionCard({ title, icon, accent = '#1B3A8C', children }: {
  title: string; icon: string; accent?: string; children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-2xl overflow-hidden mb-4 transition-all"
      style={{
        background: '#070E28',
        borderTop: `1px solid ${accent}30`,
        borderRight: `1px solid ${accent}30`,
        borderBottom: `1px solid ${accent}30`,
        borderLeft: `3px solid ${accent}`,
        boxShadow: open ? `0 0 20px ${accent}12` : 'none',
      }}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-5 py-4 text-left transition-colors"
        style={{ background: open ? `${accent}10` : 'transparent' }}
      >
        <div className="flex items-center gap-3">
          <span className="text-xl">{icon}</span>
          <h3 className="text-sm font-black text-white uppercase tracking-[0.08em]">{title}</h3>
        </div>
        <svg className={`w-4 h-4 transition-transform duration-300 flex-shrink-0`}
          style={{ color: accent, transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }}
          fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && (
        <div className="px-5 pb-6 pt-4" style={{ borderTop: `1px solid ${accent}18` }}>
          {children}
        </div>
      )}
    </div>
  );
}

function InputField({
  label, metaKey, value, onChange, type = 'text', unit, min, max, disabled, placeholder, className,
}: {
  label?: string; metaKey?: string; value: any; onChange: (v: any) => void;
  type?: string; unit?: string; min?: number; max?: number; disabled?: boolean; placeholder?: string;
  className?: string;
}) {
  const meta = metaKey ? CREDIT_POLICY_META[metaKey] : null;
  const hasUnit = !!unit;
  const isLongUnit = typeof unit === 'string' && unit.length > 10;
  const inputPaddingRight = hasUnit
    ? type === 'number'
      ? isLongUnit
        ? 'pr-40'
        : 'pr-24'
      : 'pr-12'
    : '';
  const unitRightClass = type === 'number' ? 'right-10' : 'right-3';
  return (
    <div className={`space-y-1.5 ${className || ''}`.trim()}>
      <div className="flex items-center">
        <label className="text-sm font-medium text-white/70">{label || meta?.label}</label>
        {meta && <HelpTooltip meta={meta} />}
      </div>
      <div className="relative">
        <input
          type={type}
          value={value ?? ''}
          onChange={e => onChange(type === 'number' ? (parseFloat(e.target.value) || 0) : e.target.value)}
          min={min} max={max} step={type === 'number' ? 'any' : undefined}
          disabled={disabled} placeholder={placeholder || meta?.placeholder}
          className={`w-full bg-[#040B1E] border border-[#1B3A8C]/35 rounded-xl px-4 py-2.5 text-white placeholder-white/25 focus:outline-none focus:border-[#C9A84C]/60 focus:ring-1 focus:ring-[#C9A84C]/15 disabled:opacity-50 text-sm transition-colors ${inputPaddingRight}`}
        />
        {unit && (
          <span
            className={`pointer-events-none absolute ${unitRightClass} top-1/2 -translate-y-1/2 text-xs text-white/75 font-medium text-right ${type === 'number' ? 'max-w-28 truncate' : ''}`}
            title={unit}
          >
            {unit}
          </span>
        )}
      </div>
      {meta?.description && <p className="text-xs text-white/60 bg-[#1B3A8C]/10 border border-[#1B3A8C]/20 rounded-lg px-2.5 py-1.5 leading-relaxed italic">{meta.description}</p>}
    </div>
  );
}

function Toggle({ label, metaKey, checked, onChange, disabled }: {
  label?: string; metaKey?: string; checked: boolean; onChange: (v: boolean) => void; disabled?: boolean;
}) {
  const meta = metaKey ? CREDIT_POLICY_META[metaKey] : null;
  return (
    <div className="flex items-start gap-3 py-2">
      <button
        type="button"
        onClick={() => !disabled && onChange(!checked)}
        disabled={disabled}
        className={`relative flex-shrink-0 w-11 h-6 rounded-full transition-all duration-300 ${checked ? 'bg-gradient-to-r from-[#1B3A8C] to-[#C9A84C]' : 'bg-[#0A1434] border border-[#1B3A8C]/30'} disabled:opacity-50`}
      >
        <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow-md transition-transform duration-300 ${checked ? 'translate-x-5' : ''}`} />
      </button>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1">
          <span className="text-sm font-medium text-white/70">{label || meta?.label}</span>
          {meta && <HelpTooltip meta={meta} />}
        </div>
        {meta?.description && <p className="text-xs text-white/60 bg-[#1B3A8C]/10 border border-[#1B3A8C]/20 rounded-lg px-2.5 py-1.5 mt-1 leading-relaxed italic">{meta.description}</p>}
      </div>
    </div>
  );
}

function AlertBanner({ type, message }: { type: 'warning' | 'error' | 'info' | 'success'; message: string }) {
  const styles = {
    warning: 'bg-[#F59E0B]/10 border-[#F59E0B]/30 text-[#C9A84C]',
    error: 'bg-[#EF4444]/10 border-[#EF4444]/30 text-[#EF4444]',
    info: 'bg-[#1B3A8C]/10 border-[#1B3A8C]/30 text-[#C9A84C]',
    success: 'bg-[#10B981]/10 border-[#10B981]/30 text-[#10B981]',
  };
  const icons = { warning: '⚠️', error: '🚫', info: 'ℹ️', success: '✅' };
  return (
    <div className={`flex items-start gap-2 px-4 py-3 rounded-xl border text-sm my-3 ${styles[type]}`}>
      <span className="flex-shrink-0">{icons[type]}</span>
      <span>{message}</span>
    </div>
  );
}

// ── Default config ────────────────────────────────────────────────

const DEFAULT_CONFIG: Partial<CreditPolicyConfig> = {
  currency: 'XOF', defaultLoanType: 'CONSO', decisionStrategy: 'HYBRID',
  strictMode: false, enableExplanations: true, enableSimulations: true, maxSimulationScenarios: 3,
  loanTypes: {
    CONSO: { enabled: true, label: 'Crédit consommation', minAmount: 50000, maxAmount: 5000000, minDurationMonths: 6, maxDurationMonths: 60, defaultDurationMonths: 24, minRate: 8, maxRate: 18, defaultRate: 12, maxUsuryRate: 22, requiresCollateral: false, requiresDownPayment: false },
    PERSO: { enabled: true, label: 'Crédit personnel', minAmount: 50000, maxAmount: 3000000, minDurationMonths: 6, maxDurationMonths: 48, defaultDurationMonths: 24, minRate: 10, maxRate: 20, defaultRate: 14, maxUsuryRate: 24, requiresCollateral: false, requiresDownPayment: false },
    AUTO: { enabled: true, label: 'Crédit automobile', minAmount: 500000, maxAmount: 15000000, minDurationMonths: 12, maxDurationMonths: 60, defaultDurationMonths: 48, minRate: 7, maxRate: 16, defaultRate: 10, maxUsuryRate: 20, requiresCollateral: true, requiresDownPayment: true },
    IMMO: { enabled: true, label: 'Crédit immobilier', minAmount: 1000000, maxAmount: 100000000, minDurationMonths: 60, maxDurationMonths: 240, defaultDurationMonths: 120, minRate: 5, maxRate: 12, defaultRate: 7.5, maxUsuryRate: 15, requiresCollateral: true, requiresDownPayment: true },
  },
  eligibility: { minimumNetIncome: 150000, minimumEmploymentMonths: 12, conditionalEmploymentMonths: 6, allowProbationaryPeriod: false, probationaryDecision: 'CONDITIONAL', minimumAge: 21, maximumAge: 65, acceptedContractTypes: ['CDI', 'FONCTIONNAIRE', 'RETRAITE'], rejectedContractTypes: ['SANS_EMPLOI'] },
  ratios: {
    dti: { enabled: true, approvalThreshold: 33, conditionalThreshold: 38, rejectionThreshold: 40 },
    livingRemainder: { enabled: true, minimumAmount: 75000, minimumPercentOfIncome: 30 },
    ltv: { enabled: true, approvalThreshold: 70, conditionalThreshold: 80, rejectionThreshold: 90 },
    lti: { enabled: true, maximum: 4.5 },
  },
  scoring: {
    enabled: true, scaleMin: 0, scaleMax: 100, approvalScore: 75, conditionalScore: 60, rejectionScore: 40,
    weights: { dti: 20, livingRemainder: 15, ltv: 10, employmentStability: 15, contractType: 10, incomeLevel: 15, debtBehavior: 10, clientProfile: 3, documentCompleteness: 2 },
  },
  profileAdjustments: { publicEmployeeBonus: 5, permanentContractBonus: 3, selfEmployedPenalty: -8, probationPenalty: -10, seniorityBonusPerYear: 1, existingCustomerBonus: 3, salaryDomiciliationBonus: 5 },
  documents: {
    CONSO: [{ code: 'CNI', label: "Pièce d'identité", required: true, blockingIfMissing: true }, { code: 'JUSTIF_REVENU', label: 'Justificatif de revenus', required: true, blockingIfMissing: true }, { code: 'RELEVES_BANCAIRES', label: 'Relevés bancaires (3 mois)', required: true, blockingIfMissing: false }],
    PERSO: [{ code: 'CNI', label: "Pièce d'identité", required: true, blockingIfMissing: true }, { code: 'JUSTIF_REVENU', label: 'Justificatif de revenus', required: true, blockingIfMissing: true }],
    AUTO: [{ code: 'CNI', label: "Pièce d'identité", required: true, blockingIfMissing: true }, { code: 'JUSTIF_REVENU', label: 'Justificatif de revenus', required: true, blockingIfMissing: true }, { code: 'FACTURE_DEVIS', label: 'Facture ou devis véhicule', required: true, blockingIfMissing: true }],
    IMMO: [{ code: 'CNI', label: "Pièce d'identité", required: true, blockingIfMissing: true }, { code: 'JUSTIF_REVENU', label: 'Justificatif de revenus', required: true, blockingIfMissing: true }, { code: 'TITRE_PROPRIETE', label: 'Titre de propriété / compromis', required: true, blockingIfMissing: true }, { code: 'RELEVES_BANCAIRES', label: 'Relevés bancaires', required: true, blockingIfMissing: false }, { code: 'ATTESTATION_DOM', label: 'Attestation domiciliation salaire', required: false, blockingIfMissing: false }],
  },
  simulations: { enabled: true, amountVariations: [-20, -10, 10], durationVariationsMonths: [-12, 12, 24], rateVariations: [-1, 1], downPaymentVariations: [10, 20] },
  overrides: { allowManualOverride: false, manualOverrideRoles: ['org_admin'], requireOverrideReason: true },
};

// ── Validation ────────────────────────────────────────────────────

function getValidationWarnings(config: Partial<CreditPolicyConfig>): string[] {
  const warnings: string[] = [];
  if (!config.ratios) return warnings;
  const dti = config.ratios.dti;
  if (dti?.enabled) {
    if (dti.approvalThreshold >= dti.conditionalThreshold)
      warnings.push('DTI : le seuil d\'approbation doit être inférieur au seuil conditionnel.');
    if (dti.conditionalThreshold >= dti.rejectionThreshold)
      warnings.push('DTI : le seuil conditionnel doit être inférieur au seuil de refus.');
    if (dti.rejectionThreshold > 50)
      warnings.push('DTI : un seuil de refus > 50% est très élevé et augmente fortement le risque.');
  }
  const ltv = config.ratios.ltv;
  if (ltv?.enabled) {
    if (ltv.approvalThreshold >= ltv.conditionalThreshold)
      warnings.push('LTV : le seuil favorable doit être inférieur au seuil conditionnel.');
    if (ltv.conditionalThreshold >= ltv.rejectionThreshold)
      warnings.push('LTV : le seuil conditionnel doit être inférieur au seuil de refus.');
  }
  const scoring = config.scoring;
  if (scoring?.enabled) {
    if (scoring.approvalScore <= scoring.conditionalScore)
      warnings.push('Scoring : le score d\'approbation doit être supérieur au score conditionnel.');
    if (scoring.conditionalScore <= scoring.rejectionScore)
      warnings.push('Scoring : le score conditionnel doit être supérieur au score de refus.');
    if (scoring.weights) {
      const total = Object.values(scoring.weights).reduce((s: number, v) => s + (v as number), 0);
      if (Math.abs(total - 100) > 0.5)
        warnings.push(`Pondérations : la somme est ${(total as number).toFixed(1)}% (doit être 100%).`);
    }
  }
  if (config.eligibility) {
    if ((config.eligibility.conditionalEmploymentMonths ?? 0) >= (config.eligibility.minimumEmploymentMonths ?? 12))
      warnings.push('Éligibilité : l\'ancienneté conditionnelle doit être inférieure à l\'ancienneté standard.');
  }
  if (config.loanTypes) {
    for (const [key, lt] of Object.entries(config.loanTypes)) {
      if (!lt.enabled) continue;
      if (lt.minAmount >= lt.maxAmount) warnings.push(`${LOAN_TYPE_LABELS[key] || key} : montant min ≥ montant max.`);
      if (lt.minDurationMonths >= lt.maxDurationMonths) warnings.push(`${LOAN_TYPE_LABELS[key] || key} : durée min ≥ durée max.`);
      if (lt.defaultDurationMonths < lt.minDurationMonths || lt.defaultDurationMonths > lt.maxDurationMonths)
        warnings.push(`${LOAN_TYPE_LABELS[key] || key} : durée par défaut hors de la plage min/max.`);
      if (lt.defaultRate < lt.minRate || lt.defaultRate > lt.maxRate)
        warnings.push(`${LOAN_TYPE_LABELS[key] || key} : taux par défaut hors de la plage min/max.`);
      if (lt.maxRate > lt.maxUsuryRate)
        warnings.push(`${LOAN_TYPE_LABELS[key] || key} : taux maximum dépasse le taux d'usure.`);
    }
  }
  return warnings;
}

// ── Component principal ───────────────────────────────────────────

export default function CreditPolicySettings({ hasActiveLicense }: Props) {
  const [config, setConfig] = useState<Partial<CreditPolicyConfig>>(DEFAULT_CONFIG);
  const [originalConfig, setOriginalConfig] = useState<Partial<CreditPolicyConfig>>(DEFAULT_CONFIG);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [versions, setVersions] = useState<any[]>([]);
  const [showVersions, setShowVersions] = useState(false);
  const [confirmSave, setConfirmSave] = useState(false);

  const warnings = getValidationWarnings(config);

  useEffect(() => { loadConfig(); }, []);

  const loadConfig = async () => {
    try {
      setLoading(true);
      const data = await apiClient.get<CreditPolicyConfig>('/credit-policy/config');
      setConfig(data);
      setOriginalConfig(data);
    } catch {
      setConfig(DEFAULT_CONFIG);
      setOriginalConfig(DEFAULT_CONFIG);
    } finally {
      setLoading(false);
    }
  };

  const loadVersions = async () => {
    try {
      const data = await apiClient.get<any[]>('/credit-policy/versions');
      setVersions(data);
      setShowVersions(true);
    } catch (err) {
      console.error('Erreur versions:', err);
    }
  };

  const handleSave = async () => {
    if (!confirmSave) { setConfirmSave(true); return; }
    try {
      setSaving(true); setError(null);
      const saved = await apiClient.post<CreditPolicyConfig>('/credit-policy/config', config);
      setConfig(saved); setOriginalConfig(saved); setIsEditing(false);
      setSuccess(true); setConfirmSave(false);
      setTimeout(() => setSuccess(false), 4000);
    } catch (err: any) {
      setError(err?.message || 'Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setConfig(originalConfig); setIsEditing(false); setConfirmSave(false); setError(null);
  };

  const handlePrint = useCallback(() => {
    const c = config;
    const fmt = (v: number | null | undefined, suffix = '') =>
      v == null ? 'N/A' : v.toLocaleString('fr-FR') + (suffix ? ' ' + suffix : '');
    const bool = (v: boolean | undefined) => v ? 'Oui' : 'Non';
    const tags = (arr: string[] | undefined) => arr && arr.length ? arr.join(', ') : '—';

    const row = (label: string, value: string) =>
      `<tr><td class="lbl">${label}</td><td class="val">${value}</td></tr>`;

    const section = (title: string, icon: string, rows: string) =>
      `<div class="section"><div class="sec-title">${icon} ${title}</div><table>${rows}</table></div>`;

    const loanTypes = c.loanTypes || {};
    const loanTypeSections = Object.entries(loanTypes).filter(([, lt]) => lt.enabled).map(([key, lt]) => {
      const typeIcon = key === 'IMMO' ? '🏠' : key === 'AUTO' ? '🚗' : key === 'CONSO' ? '🛍️' : '💼';
      return section(`${typeIcon} ${lt.label || key}`, '', [
        row('Code', key),
        row('Montant min', fmt(lt.minAmount, c.currency || 'XOF')),
        row('Montant max', fmt(lt.maxAmount, c.currency || 'XOF')),
        row('Durée min', fmt(lt.minDurationMonths, 'mois')),
        row('Durée max', fmt(lt.maxDurationMonths, 'mois')),
        row('Durée par défaut', fmt(lt.defaultDurationMonths, 'mois')),
        row('Taux min', fmt(lt.minRate, '%')),
        row('Taux max', fmt(lt.maxRate, '%')),
        row('Taux par défaut', fmt(lt.defaultRate, '%')),
        row('Taux d\'usure max', fmt(lt.maxUsuryRate, '%')),
        row('Garantie requise', bool(lt.requiresCollateral)),
        row('Apport requis', bool(lt.requiresDownPayment)),
      ].join(''));
    }).join('');

    const el = c.eligibility || {} as any;
    const ra = c.ratios || {} as any;
    const sc = c.scoring || {} as any;
    const pa = c.profileAdjustments || {} as any;
    const docs = c.documents || {} as any;
    const ov = c.overrides || {} as any;

    const wLabels: Record<string, string> = {
      dti: 'DTI', livingRemainder: 'Reste à vivre', ltv: 'LTV',
      employmentStability: 'Stabilité emploi', contractType: 'Type de contrat',
      incomeLevel: 'Niveau de revenu', debtBehavior: 'Comportement dette',
      clientProfile: 'Profil client', documentCompleteness: 'Complétude docs',
    };

    const docsSections = Object.entries(docs).map(([typeKey, docList]) => {
      const items = (docList as any[] || []).map((d: any) =>
        row(d.label || d.code, `${d.required ? 'Obligatoire' : 'Optionnel'}${d.blockingIfMissing ? ' — Bloquant' : ''}`)
      ).join('');
      return items ? section(`📄 ${LOAN_TYPE_LABELS[typeKey] || typeKey}`, '', items) : '';
    }).join('');

    const paLabels: Record<string, string> = {
      publicEmployeeBonus: 'Bonus fonctionnaire',
      permanentContractBonus: 'Bonus CDI',
      selfEmployedPenalty: 'Pénalité travailleur indépendant',
      probationPenalty: 'Pénalité période d\'essai',
      seniorityBonusPerYear: 'Bonus ancienneté / an',
      existingCustomerBonus: 'Bonus client existant',
      salaryDomiciliationBonus: 'Bonus domiciliation salaire',
    };

    const html = `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8">
<title>Politique Crédit Particulier — v${c.version || '—'}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Segoe UI', Arial, sans-serif; background: #fff; color: #1e293b; font-size: 11px; }
  .page { max-width: 900px; margin: 0 auto; padding: 24px; }
  .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 3px solid #1B3A8C; padding-bottom: 14px; margin-bottom: 20px; }
  .header h1 { font-size: 20px; font-weight: 800; color: #1e293b; }
  .header p { font-size: 11px; color: #64748b; margin-top: 4px; }
  .badge { background: #1B3A8C; color: white; padding: 3px 10px; border-radius: 20px; font-size: 10px; font-weight: 700; }
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
  .wval { font-weight: 700; color: #1B3A8C; font-size: 10px; }
  .bar-bg { height: 5px; background: #e2e8f0; border-radius: 3px; flex: 1; margin: 0 8px; }
  .bar-fill { height: 100%; background: #1B3A8C; border-radius: 3px; }
  .footer { margin-top: 20px; padding-top: 10px; border-top: 1px solid #e2e8f0; text-align: center; color: #94a3b8; font-size: 9px; }
  @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } .page { padding: 12px; } }
</style></head><body><div class="page">

<div class="header">
  <div>
    <h1>Politique de Crédit Particulier</h1>
    <p>Version ${c.version || '—'} &nbsp;•&nbsp; Devise : ${c.currency || 'XOF'} &nbsp;•&nbsp; Stratégie : ${c.decisionStrategy || '—'}</p>
  </div>
  <div>
    <div class="badge">${c.status === 'active' ? 'ACTIF' : 'INACTIF'}</div>
    <p style="text-align:right;margin-top:6px;color:#94a3b8;font-size:9px">Imprimé le ${new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })}</p>
  </div>
</div>

<div class="grid">

${section('A — Paramètres généraux', '🔧', [
  row('Devise', c.currency || 'XOF'),
  row('Type de crédit par défaut', c.defaultLoanType || '—'),
  row('Stratégie de décision', c.decisionStrategy || '—'),
  row('Mode strict', bool(c.strictMode)),
  row('Explications activées', bool(c.enableExplanations)),
  row('Simulations activées', bool(c.enableSimulations)),
  row('Nb max scénarios', String(c.maxSimulationScenarios ?? 3)),
].join(''))}

${section('B — Éligibilité', '✅', [
  row('Revenu net minimum', fmt(el.minimumNetIncome, c.currency || 'XOF')),
  row('Ancienneté min (approbation)', fmt(el.minimumEmploymentMonths, 'mois')),
  row('Ancienneté conditionnelle', fmt(el.conditionalEmploymentMonths, 'mois')),
  row('Âge minimum', fmt(el.minimumAge, 'ans')),
  row('Âge maximum', fmt(el.maximumAge, 'ans')),
  row('Période d\'essai autorisée', bool(el.allowProbationaryPeriod)),
  row('Traitement période d\'essai', el.probationaryDecision || '—'),
  row('Contrats acceptés', tags(el.acceptedContractTypes)),
  row('Contrats rejetés', tags(el.rejectedContractTypes)),
].join(''))}

${section('C — DTI (Taux d\'endettement)', '📐', [
  row('Contrôle DTI activé', bool(ra.dti?.enabled)),
  row('Seuil approbation', fmt(ra.dti?.approvalThreshold, '%')),
  row('Seuil conditionnel', fmt(ra.dti?.conditionalThreshold, '%')),
  row('Seuil refus', fmt(ra.dti?.rejectionThreshold, '%')),
].join(''))}

${section('D — Reste à vivre', '💰', [
  row('Contrôle activé', bool(ra.livingRemainder?.enabled)),
  row('Montant minimum', fmt(ra.livingRemainder?.minimumAmount, c.currency || 'XOF')),
  row('% minimum du revenu', fmt(ra.livingRemainder?.minimumPercentOfIncome, '%')),
].join(''))}

${section('E — LTV (Financement / valeur bien)', '🏠', [
  row('Contrôle LTV activé', bool(ra.ltv?.enabled)),
  row('Seuil favorable', fmt(ra.ltv?.approvalThreshold, '%')),
  row('Seuil conditionnel', fmt(ra.ltv?.conditionalThreshold, '%')),
  row('Seuil refus', fmt(ra.ltv?.rejectionThreshold, '%')),
].join(''))}

${section('F — LTI (Montant / revenu annuel)', '📊', [
  row('Contrôle LTI activé', bool(ra.lti?.enabled)),
  row('Multiple maximum', fmt(ra.lti?.maximum, 'x revenu annuel')),
].join(''))}

</div>

<!-- Types de crédit — pleine largeur -->
${loanTypeSections ? `<div style="margin-top:14px"><div class="sec-title" style="border:1px solid #e2e8f0;border-radius:8px 8px 0 0">💳 Types de crédit actifs</div><div class="grid" style="border:1px solid #e2e8f0;border-top:none;border-radius:0 0 8px 8px;padding:10px;gap:10px">${loanTypeSections}</div></div>` : ''}

<!-- Scoring — pleine largeur -->
<div class="section" style="margin-top:14px">
  <div class="sec-title">🎯 Scoring</div>
  <table>
    ${[
      row('Scoring activé', bool(sc.enabled)),
      row('Score approbation', fmt(sc.approvalScore, 'pts')),
      row('Score conditionnel', fmt(sc.conditionalScore, 'pts')),
      row('Score refus', fmt(sc.rejectionScore, 'pts')),
    ].join('')}
  </table>
  ${sc.enabled && sc.weights ? `<div style="padding:8px 10px 6px;border-top:1px solid #e2e8f0;">
    <p style="font-weight:700;font-size:10px;color:#334155;margin-bottom:8px">Pondération des critères</p>
    <div class="weights-grid">
      ${Object.entries(sc.weights as Record<string, number>).map(([k, v]) =>
        `<div class="wrow"><span class="wlbl">${wLabels[k] || k}</span><div class="bar-bg"><div class="bar-fill" style="width:${v}%"></div></div><span class="wval">${v}%</span></div>`
      ).join('')}
    </div>
  </div>` : ''}
</div>

<!-- Ajustements profil -->
<div class="grid" style="margin-top:14px">
${section('👤 Ajustements de profil', '', Object.entries(paLabels).map(([k, label]) => {
  const val = (pa as any)[k];
  return row(label, val != null ? `${Number(val) >= 0 ? '+' : ''}${val} pts` : 'N/A');
}).join(''))}

${section('🔑 Dérogations', '', [
  row('Dérogations autorisées', bool(ov.allowManualOverride)),
  row('Justification obligatoire', bool(ov.requireOverrideReason)),
  row('Rôles autorisés', tags(ov.manualOverrideRoles)),
].join(''))}
</div>

<!-- Documents -->
${docsSections ? `<div class="grid" style="margin-top:14px">${docsSections}</div>` : ''}

<div class="footer">Politique de Crédit Particulier &nbsp;•&nbsp; Version ${c.version || '—'} &nbsp;•&nbsp; Imprimé le ${new Date().toLocaleDateString('fr-FR')}</div>
</div></body></html>`;

    const win = window.open('', '_blank');
    if (!win) return;
    win.document.write(html);
    win.document.close();
    win.onload = () => { win.focus(); win.print(); };
  }, [config]);

  const updateConfig = useCallback((path: string, value: any) => {
    setConfig(prev => {
      const next = JSON.parse(JSON.stringify(prev));
      const keys = path.split('.');
      let obj: any = next;
      for (let i = 0; i < keys.length - 1; i++) {
        if (!obj[keys[i]]) obj[keys[i]] = {};
        obj = obj[keys[i]];
      }
      obj[keys[keys.length - 1]] = value;
      return next;
    });
  }, []);

  const updateLoanType = (typeKey: string, field: keyof LoanTypeConfig, value: any) => {
    setConfig(prev => ({
      ...prev,
      loanTypes: { ...prev.loanTypes, [typeKey]: { ...(prev.loanTypes?.[typeKey] || {}), [field]: value } as LoanTypeConfig }
    }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="text-center">
          <div className="relative w-12 h-12 mx-auto mb-4">
            <div className="absolute inset-0 border-2 border-[#1B3A8C]/30 rounded-full" />
            <div className="absolute inset-0 border-2 border-transparent border-t-[#C9A84C] rounded-full animate-spin" />
          </div>
          <p className="text-white/60 text-sm">Chargement de la politique de crédit…</p>
        </div>
      </div>
    );
  }

  const eligibility = (config.eligibility || {}) as any;
  const ratios = (config.ratios || {}) as any;
  const scoring = (config.scoring || {}) as any;
  const profile = (config.profileAdjustments || {}) as any;
  const documents = (config.documents || {}) as Record<string, DocumentRequirement[]>;
  const overrides = (config.overrides || {}) as any;
  const weightsTotal = scoring.weights
    ? Object.values(scoring.weights as Record<string, number>).reduce((s, v) => s + v, 0)
    : 0;

  return (
    <div className="space-y-2">

      {/* ── BARRE D'ACTIONS ──────────────────────────────────── */}
      <div className="flex items-center justify-between flex-wrap gap-3 mb-5">
        <div>
          <h2 className="text-xl font-black text-white">⚙️ Politique de Crédit Particulier</h2>
          {config.version && (
            <div className="flex items-center gap-3 mt-1 text-xs text-white/75 flex-wrap">
              <span className="px-2 py-0.5 bg-[#1B3A8C]/10 border border-[#1B3A8C]/30 rounded-full text-[#C9A84C] font-medium">v{config.version}</span>
              <span className={`px-2 py-0.5 rounded-full font-medium ${config.status === 'active' ? 'bg-[#10B981]/10 text-[#10B981] border border-[#10B981]/30' : 'bg-gray-500/10 text-gray-400 border border-gray-500/30'}`}>
                {config.status === 'active' ? '● Actif' : '○ Inactif'}
              </span>
              {config.updatedAt && <span>Modifié le {new Date(config.updatedAt).toLocaleDateString('fr-FR')}</span>}
              {config.updatedBy && <span>par {config.updatedBy}</span>}
              <span className="capitalize">{config.decisionStrategy}</span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {!isEditing ? (
            <>
              <button onClick={handlePrint} className="px-4 py-2 text-sm bg-white/5 hover:bg-white/10 text-white/75 hover:text-white border border-[#1B3A8C]/25 rounded-xl transition-all flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                </svg>
                Imprimer / PDF
              </button>
              <button onClick={loadVersions} className="px-4 py-2 text-sm bg-white/5 hover:bg-white/10 text-white/75 hover:text-white border border-[#1B3A8C]/25 rounded-xl transition-all">
                📋 Historique
              </button>
              <button onClick={() => { setIsEditing(true); setConfirmSave(false); }} disabled={!hasActiveLicense}
                className="px-5 py-2 text-sm bg-gradient-to-r from-[#1B3A8C] to-[#C9A84C] text-white rounded-xl font-semibold hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed">
                ✏️ Modifier
              </button>
            </>
          ) : (
            <>
              <button onClick={handleCancel} className="px-4 py-2 text-sm bg-white/5 hover:bg-white/10 text-white/75 hover:text-white border border-[#1B3A8C]/25 rounded-xl transition-all">
                Annuler
              </button>
              {confirmSave ? (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-[#C9A84C]">Confirmer ?</span>
                  <button onClick={handleSave} disabled={saving}
                    className="px-4 py-2 text-sm bg-gradient-to-r from-[#10B981] to-[#059669] text-white rounded-xl font-semibold disabled:opacity-50">
                    {saving ? '⏳...' : '✅ Oui'}
                  </button>
                  <button onClick={() => setConfirmSave(false)} className="px-3 py-2 text-sm bg-white/5 text-white/75 border border-[#1B3A8C]/25 rounded-xl">✕</button>
                </div>
              ) : (
                <button onClick={handleSave} disabled={saving || warnings.length > 0}
                  title={warnings.length > 0 ? 'Corrigez les erreurs avant de sauvegarder' : ''}
                  className="px-5 py-2 text-sm bg-gradient-to-r from-[#10B981] to-[#059669] text-white rounded-xl font-semibold hover:opacity-90 transition-opacity disabled:opacity-50">
                  💾 Sauvegarder
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {success && <AlertBanner type="success" message="Configuration sauvegardée. Une nouvelle version a été créée et archivée." />}
      {error && <AlertBanner type="error" message={error} />}
      {!hasActiveLicense && <AlertBanner type="warning" message="Licence inactive — modification désactivée." />}

      {isEditing && warnings.length > 0 && (
        <div className="bg-[#EF4444]/5 border border-[#EF4444]/20 rounded-xl p-4 mb-2">
          <p className="text-sm font-semibold text-[#EF4444] mb-2">🚫 {warnings.length} incohérence(s) — Sauvegarde bloquée jusqu\'à correction</p>
          <ul className="space-y-1">{warnings.map((w, i) => <li key={i} className="text-xs text-red-300">• {w}</li>)}</ul>
        </div>
      )}

      {showVersions && (
        <div className="bg-[#070E28]/80 border border-[#C9A84C]/20 rounded-[20px] p-5 mb-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-bold text-white">📋 Historique des versions</h3>
            <button onClick={() => setShowVersions(false)} className="text-white/75 hover:text-white text-sm">Fermer ✕</button>
          </div>
          {versions.length === 0 ? (
            <p className="text-sm text-white/40 text-center py-4">Aucune version archivée.</p>
          ) : (
            <div className="space-y-2 max-h-56 overflow-y-auto">
              {versions.map((v) => (
                <div key={v.id} className="flex items-center justify-between bg-[#040B1E] rounded-xl px-4 py-3 border border-[#1B3A8C]/15">
                  <div>
                    <span className="text-white font-semibold text-sm">Version {v.version}</span>
                    <span className="text-white/75 text-xs ml-3">
                      {new Date(v.updatedAt || v.archived_at).toLocaleString('fr-FR')} — {v.updatedBy || 'Inconnu'}
                    </span>
                  </div>
                  <button onClick={async () => {
                    try {
                      const restored = await apiClient.post<CreditPolicyConfig>(`/credit-policy/restore/${v.id}`, {});
                      setConfig(restored); setOriginalConfig(restored); setShowVersions(false);
                      setSuccess(true); setTimeout(() => setSuccess(false), 4000);
                    } catch { setError('Erreur lors de la restauration'); }
                  }} className="text-xs px-3 py-1.5 bg-[#C9A84C]/20 hover:bg-[#C9A84C]/30 text-[#C9A84C] border border-[#C9A84C]/30 rounded-lg transition-colors">
                    Restaurer
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ══ SECTION 1 — VUE D'ENSEMBLE ══════════════════════════════ */}
      <SectionCard title="Vue d'ensemble de la politique active" icon="📊" accent="#1B3A8C">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-3">
          {[
            { label: 'Version', value: config.version || '—', color: 'text-[#C9A84C]' },
            { label: 'Statut', value: config.status === 'active' ? 'Actif' : 'Inactif', color: config.status === 'active' ? 'text-[#10B981]' : 'text-white/40' },
            { label: 'Stratégie', value: config.decisionStrategy || '—', color: 'text-[#C9A84C]' },
            { label: 'Types actifs', value: String(Object.values(config.loanTypes || {}).filter(lt => lt.enabled).length), color: 'text-[#C9A84C]' },
          ].map(card => (
            <div key={card.label} className="bg-[#040B1E] border border-[#1B3A8C]/15 rounded-xl p-4 text-center">
              <p className="text-xs text-white/40 mb-1">{card.label}</p>
              <p className={`text-lg font-bold ${card.color}`}>{card.value}</p>
            </div>
          ))}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-3">
          {[
            { label: 'Mode strict', value: config.strictMode ? 'Activé' : 'Désactivé', color: config.strictMode ? 'text-[#EF4444]' : 'text-[#10B981]', dot: config.strictMode ? 'bg-[#EF4444]' : 'bg-[#10B981]' },
            { label: 'Scoring', value: config.scoring?.enabled ? 'Activé' : 'Désactivé', color: config.scoring?.enabled ? 'text-[#10B981]' : 'text-white/40', dot: config.scoring?.enabled ? 'bg-[#10B981]' : 'bg-[#64748B]' },
            { label: 'Simulations', value: config.enableSimulations ? 'Activées' : 'Désactivées', color: config.enableSimulations ? 'text-[#10B981]' : 'text-white/40', dot: config.enableSimulations ? 'bg-[#10B981]' : 'bg-[#64748B]' },
          ].map(item => (
            <div key={item.label} className="bg-[#040B1E] rounded-xl px-4 py-3 flex items-center gap-3 border border-[#1B3A8C]/15">
              <span className={`w-2 h-2 rounded-full flex-shrink-0 ${item.dot}`} />
              <span className="text-sm text-white/70">{item.label} : <strong className={item.color}>{item.value}</strong></span>
            </div>
          ))}
        </div>
      </SectionCard>

      {/* ══ SECTION 2 — PARAMÈTRES GÉNÉRAUX ═════════════════════════ */}
      <SectionCard title="Paramètres généraux" icon="🔧" accent="#C9A84C">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-3">
          <InputField metaKey="currency" value={config.currency} onChange={v => updateConfig('currency', v)} disabled={!isEditing} placeholder="XOF" />
          <div>
            <div className="flex items-center mb-1.5">
              <label className="text-sm font-medium text-white/70">Type de crédit par défaut</label>
              {CREDIT_POLICY_META.defaultLoanType && <HelpTooltip meta={CREDIT_POLICY_META.defaultLoanType} />}
            </div>
            <select value={config.defaultLoanType || 'CONSO'} onChange={e => updateConfig('defaultLoanType', e.target.value)} disabled={!isEditing}
              className="w-full bg-[#040B1E] border border-[#1B3A8C]/30 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-[#C9A84C]/60 disabled:opacity-50 text-sm">
              {Object.keys(config.loanTypes || LOAN_TYPE_LABELS).map(k => (
                <option key={k} value={k}>{LOAN_TYPE_LABELS[k] || k}</option>
              ))}
            </select>
          </div>
          <div className="md:col-span-2">
            <div className="flex items-center mb-3">
              <label className="text-sm font-semibold text-white/70">Stratégie de décision</label>
              {CREDIT_POLICY_META.decisionStrategy && <HelpTooltip meta={CREDIT_POLICY_META.decisionStrategy} />}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {Object.entries(DECISION_STRATEGY_META).map(([key, meta]) => (
                <button key={key} type="button" onClick={() => isEditing && updateConfig('decisionStrategy', key)} disabled={!isEditing}
                  className={`p-4 rounded-xl border-2 text-left transition-all ${config.decisionStrategy === key ? 'border-[#C9A84C] bg-[#C9A84C]/08' : 'border-[#1B3A8C]/25 bg-[#040B1E] hover:border-[#1B3A8C]/40'} disabled:cursor-default`}>
                  <div className="text-2xl mb-2">{meta.icon}</div>
                  <div className="text-sm font-bold text-white mb-1">{meta.label}</div>
                  <div className="text-xs text-white/75 leading-relaxed">{meta.description}</div>
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-1">
            <Toggle metaKey="strictMode" checked={!!config.strictMode} onChange={v => updateConfig('strictMode', v)} disabled={!isEditing} />
            {config.strictMode && <AlertBanner type="warning" message="Mode strict : tout paramètre hors seuil provoque un refus immédiat." />}
          </div>
          <div className="space-y-1">
            <Toggle metaKey="enableExplanations" checked={!!config.enableExplanations} onChange={v => updateConfig('enableExplanations', v)} disabled={!isEditing} />
            <Toggle metaKey="enableSimulations" checked={!!config.enableSimulations} onChange={v => updateConfig('enableSimulations', v)} disabled={!isEditing} />
          </div>
          {config.enableSimulations && (
            <InputField metaKey="maxSimulationScenarios" value={config.maxSimulationScenarios} onChange={v => updateConfig('maxSimulationScenarios', Math.max(1, Math.min(5, v)))} type="number" min={1} max={5} unit="scénarios" disabled={!isEditing} />
          )}
        </div>
      </SectionCard>

      {/* ══ SECTION 3 — TYPES DE CRÉDIT ══════════════════════════════ */}
      <SectionCard title="Types de crédit" icon="💳" accent="#059669">
        <p className="text-sm text-white/40 mt-2 mb-4">Configurez les paramètres spécifiques à chaque produit. Chaque type peut être activé/désactivé indépendamment.</p>
        <div className="space-y-5">
          {Object.entries(config.loanTypes || {}).map(([typeKey, lt]) => (
            <div key={typeKey} className={`bg-[#040B1E] border ${lt.enabled ? 'border-[#1B3A8C]/20' : 'border-[#1B3A8C]/15 opacity-60'} rounded-[14px] p-5`}>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{typeKey === 'IMMO' ? '🏠' : typeKey === 'AUTO' ? '🚗' : typeKey === 'CONSO' ? '🛍️' : '💼'}</span>
                  <div>
                    <h4 className="text-base font-bold text-white">{LOAN_TYPE_LABELS[typeKey] || typeKey}</h4>
                    <span className="text-xs text-white/40">Code : {typeKey}</span>
                  </div>
                </div>
                <Toggle label={lt.enabled ? 'Activé' : 'Désactivé'} checked={lt.enabled} onChange={v => updateLoanType(typeKey, 'enabled', v)} disabled={!isEditing} />
              </div>
              {lt.enabled && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <InputField label="Libellé" value={lt.label} onChange={v => updateLoanType(typeKey, 'label', v)} disabled={!isEditing} />
                  <InputField label="Montant min" metaKey="loanType.minAmount" value={lt.minAmount} onChange={v => updateLoanType(typeKey, 'minAmount', v)} type="number" unit={config.currency || 'XOF'} disabled={!isEditing} />
                  <InputField label="Montant max" metaKey="loanType.maxAmount" value={lt.maxAmount} onChange={v => updateLoanType(typeKey, 'maxAmount', v)} type="number" unit={config.currency || 'XOF'} disabled={!isEditing} />
                  <InputField label="Durée min" metaKey="loanType.minDurationMonths" value={lt.minDurationMonths} onChange={v => updateLoanType(typeKey, 'minDurationMonths', v)} type="number" unit="mois" disabled={!isEditing} />
                  <InputField label="Durée max" metaKey="loanType.maxDurationMonths" value={lt.maxDurationMonths} onChange={v => updateLoanType(typeKey, 'maxDurationMonths', v)} type="number" unit="mois" disabled={!isEditing} />
                  <InputField label="Durée défaut" metaKey="loanType.defaultDurationMonths" value={lt.defaultDurationMonths} onChange={v => updateLoanType(typeKey, 'defaultDurationMonths', v)} type="number" unit="mois" disabled={!isEditing} />
                  <InputField label="Taux min %" value={lt.minRate} onChange={v => updateLoanType(typeKey, 'minRate', v)} type="number" unit="%" disabled={!isEditing} />
                  <InputField label="Taux max %" value={lt.maxRate} onChange={v => updateLoanType(typeKey, 'maxRate', v)} type="number" unit="%" disabled={!isEditing} />
                  <InputField label="Taux défaut" metaKey="loanType.defaultRate" value={lt.defaultRate} onChange={v => updateLoanType(typeKey, 'defaultRate', v)} type="number" unit="%" disabled={!isEditing} />
                  <InputField label="Taux d'usure max" metaKey="loanType.maxUsuryRate" value={lt.maxUsuryRate} onChange={v => updateLoanType(typeKey, 'maxUsuryRate', v)} type="number" unit="%" disabled={!isEditing} />
                  <div className="flex gap-4 items-center md:col-span-2">
                    <Toggle label="Garantie requise" checked={lt.requiresCollateral} onChange={v => updateLoanType(typeKey, 'requiresCollateral', v)} disabled={!isEditing} />
                    <Toggle label="Apport requis" checked={lt.requiresDownPayment} onChange={v => updateLoanType(typeKey, 'requiresDownPayment', v)} disabled={!isEditing} />
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </SectionCard>

      {/* ══ SECTION 4 — ÉLIGIBILITÉ ══════════════════════════════════ */}
      <SectionCard title="Conditions d'éligibilité" icon="✅" accent="#0891B2">
        <p className="text-sm text-white/40 mt-2 mb-4">Premier filtre appliqué à chaque dossier. Un critère bloquant provoque un refus immédiat.</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <InputField metaKey="minimumNetIncome" value={eligibility.minimumNetIncome} onChange={v => updateConfig('eligibility.minimumNetIncome', v)} type="number" unit={config.currency || 'XOF'} disabled={!isEditing} />
          <InputField metaKey="minimumEmploymentMonths" value={eligibility.minimumEmploymentMonths} onChange={v => updateConfig('eligibility.minimumEmploymentMonths', v)} type="number" unit="mois" disabled={!isEditing} />
          <InputField metaKey="conditionalEmploymentMonths" value={eligibility.conditionalEmploymentMonths} onChange={v => updateConfig('eligibility.conditionalEmploymentMonths', v)} type="number" unit="mois" disabled={!isEditing} />
          <InputField metaKey="minimumAge" value={eligibility.minimumAge} onChange={v => updateConfig('eligibility.minimumAge', v)} type="number" unit="ans" disabled={!isEditing} />
          <InputField metaKey="maximumAge" value={eligibility.maximumAge} onChange={v => updateConfig('eligibility.maximumAge', v)} type="number" unit="ans" disabled={!isEditing} />
          <div>
            <Toggle metaKey="allowProbationaryPeriod" checked={!!eligibility.allowProbationaryPeriod} onChange={v => updateConfig('eligibility.allowProbationaryPeriod', v)} disabled={!isEditing} />
            {eligibility.allowProbationaryPeriod && (
              <div className="mt-2">
                <div className="flex items-center mb-1.5">
                  <label className="text-sm font-medium text-white/70">Traitement période d'essai</label>
                  {CREDIT_POLICY_META.probationaryDecision && <HelpTooltip meta={CREDIT_POLICY_META.probationaryDecision} />}
                </div>
                <select value={eligibility.probationaryDecision} onChange={e => updateConfig('eligibility.probationaryDecision', e.target.value)} disabled={!isEditing}
                  className="w-full bg-[#040B1E] border border-[#1B3A8C]/30 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none disabled:opacity-50">
                  <option value="REJECT">REJECT — Refus automatique</option>
                  <option value="CONDITIONAL">CONDITIONAL — Examen conditionnel</option>
                  <option value="ALLOW">ALLOW — Traitement normal</option>
                </select>
              </div>
            )}
          </div>
          <div>
            <div className="flex items-center mb-2">
              <label className="text-sm font-semibold text-white/70">Types de contrat acceptés</label>
              {CREDIT_POLICY_META.acceptedContractTypes && <HelpTooltip meta={CREDIT_POLICY_META.acceptedContractTypes} />}
            </div>
            <div className="flex flex-wrap gap-2">
              {CONTRACT_TYPE_OPTIONS.map(ct => {
                const isAccepted = (eligibility.acceptedContractTypes || []).includes(ct);
                return (
                  <button key={ct} type="button" disabled={!isEditing}
                    onClick={() => {
                      const current = eligibility.acceptedContractTypes || [];
                      updateConfig('eligibility.acceptedContractTypes', isAccepted ? current.filter((x: string) => x !== ct) : [...current, ct]);
                    }}
                    className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all disabled:cursor-default ${isAccepted ? 'bg-[#10B981]/20 text-[#10B981] border border-[#10B981]/40' : 'bg-white/5 text-white/40 border border-[#1B3A8C]/25 hover:bg-white/10'}`}>
                    {isAccepted ? '✓ ' : ''}{ct}
                  </button>
                );
              })}
            </div>
          </div>
          <div>
            <div className="flex items-center mb-2">
              <label className="text-sm font-semibold text-white/70">Types de contrat rejetés</label>
              {CREDIT_POLICY_META.rejectedContractTypes && <HelpTooltip meta={CREDIT_POLICY_META.rejectedContractTypes} />}
            </div>
            <div className="flex flex-wrap gap-2">
              {CONTRACT_TYPE_OPTIONS.map(ct => {
                const isRejected = (eligibility.rejectedContractTypes || []).includes(ct);
                return (
                  <button key={ct} type="button" disabled={!isEditing}
                    onClick={() => {
                      const current = eligibility.rejectedContractTypes || [];
                      updateConfig('eligibility.rejectedContractTypes', isRejected ? current.filter((x: string) => x !== ct) : [...current, ct]);
                    }}
                    className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all disabled:cursor-default ${isRejected ? 'bg-[#EF4444]/20 text-[#EF4444] border border-[#EF4444]/40' : 'bg-white/5 text-white/40 border border-[#1B3A8C]/25 hover:bg-white/10'}`}>
                    {isRejected ? '✗ ' : ''}{ct}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </SectionCard>

      {/* ══ SECTION 5 — RATIOS DE RISQUE ══════════════════════════════ */}
      <SectionCard title="Ratios de risque" icon="📐" accent="#D97706">
        <p className="text-sm text-white/40 mt-2 mb-4">Chaque ratio peut être activé indépendamment et possède trois seuils : approbation, conditionnel, refus.</p>
        <div className="space-y-4">

          {/* DTI */}
          <div className="bg-[#040B1E] border border-[#1B3A8C]/10 rounded-[14px] p-5">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <h4 className="text-sm font-bold text-white">Taux d'endettement (DTI)</h4>
                {CREDIT_POLICY_META['dti.enabled'] && <HelpTooltip meta={CREDIT_POLICY_META['dti.enabled']} />}
              </div>
              <Toggle checked={!!ratios.dti?.enabled} onChange={v => updateConfig('ratios.dti.enabled', v)} disabled={!isEditing} />
            </div>
            <p className="text-xs text-white/40 mb-4">Mesure la part du revenu absorbée par les dettes. Standard : 33% est la norme internationale.</p>
            {ratios.dti?.enabled && (
              <div className="grid grid-cols-3 gap-4">
                <InputField label="Seuil approbation" metaKey="dti.approvalThreshold" value={ratios.dti?.approvalThreshold} onChange={v => updateConfig('ratios.dti.approvalThreshold', v)} type="number" unit="%" disabled={!isEditing} />
                <InputField label="Seuil conditionnel" metaKey="dti.conditionalThreshold" value={ratios.dti?.conditionalThreshold} onChange={v => updateConfig('ratios.dti.conditionalThreshold', v)} type="number" unit="%" disabled={!isEditing} />
                <InputField label="Seuil refus" metaKey="dti.rejectionThreshold" value={ratios.dti?.rejectionThreshold} onChange={v => updateConfig('ratios.dti.rejectionThreshold', v)} type="number" unit="%" disabled={!isEditing} />
              </div>
            )}
          </div>

          {/* Reste à vivre */}
          <div className="bg-[#040B1E] border border-[#C9A84C]/10 rounded-[14px] p-5">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <h4 className="text-sm font-bold text-white">Reste à vivre</h4>
                {CREDIT_POLICY_META['livingRemainder.enabled'] && <HelpTooltip meta={CREDIT_POLICY_META['livingRemainder.enabled']} />}
              </div>
              <Toggle checked={!!ratios.livingRemainder?.enabled} onChange={v => updateConfig('ratios.livingRemainder.enabled', v)} disabled={!isEditing} />
            </div>
            <p className="text-xs text-white/40 mb-4">Montant disponible après toutes charges. Complément essentiel au DTI pour éviter le surendettement.</p>
            {ratios.livingRemainder?.enabled && (
              <div className="grid grid-cols-2 gap-4">
                <InputField label="Montant minimum" metaKey="livingRemainder.minimumAmount" value={ratios.livingRemainder?.minimumAmount} onChange={v => updateConfig('ratios.livingRemainder.minimumAmount', v)} type="number" unit={config.currency || 'XOF'} disabled={!isEditing} />
                <InputField label="% minimum du revenu" metaKey="livingRemainder.minimumPercentOfIncome" value={ratios.livingRemainder?.minimumPercentOfIncome} onChange={v => updateConfig('ratios.livingRemainder.minimumPercentOfIncome', v)} type="number" unit="%" disabled={!isEditing} />
              </div>
            )}
          </div>

          {/* LTV */}
          <div className="bg-[#040B1E] border border-[#F59E0B]/10 rounded-[14px] p-5">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <h4 className="text-sm font-bold text-white">LTV — Financement / valeur bien</h4>
                {CREDIT_POLICY_META['ltv.enabled'] && <HelpTooltip meta={CREDIT_POLICY_META['ltv.enabled']} />}
              </div>
              <Toggle checked={!!ratios.ltv?.enabled} onChange={v => updateConfig('ratios.ltv.enabled', v)} disabled={!isEditing} />
            </div>
            <p className="text-xs text-white/40 mb-4">Pour crédits immobiliers. Mesure la proportion du bien financée. Un LTV élevé réduit la garantie.</p>
            {ratios.ltv?.enabled && (
              <div className="grid grid-cols-3 gap-4">
                <InputField label="Seuil favorable" metaKey="ltv.approvalThreshold" value={ratios.ltv?.approvalThreshold} onChange={v => updateConfig('ratios.ltv.approvalThreshold', v)} type="number" unit="%" disabled={!isEditing} />
                <InputField label="Seuil conditionnel" metaKey="ltv.conditionalThreshold" value={ratios.ltv?.conditionalThreshold} onChange={v => updateConfig('ratios.ltv.conditionalThreshold', v)} type="number" unit="%" disabled={!isEditing} />
                <InputField label="Seuil refus" metaKey="ltv.rejectionThreshold" value={ratios.ltv?.rejectionThreshold} onChange={v => updateConfig('ratios.ltv.rejectionThreshold', v)} type="number" unit="%" disabled={!isEditing} />
              </div>
            )}
          </div>

          {/* LTI */}
          <div className="bg-[#040B1E] border border-[#10B981]/10 rounded-[14px] p-5">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <h4 className="text-sm font-bold text-white">LTI — Montant / revenu annuel</h4>
                {CREDIT_POLICY_META['lti.enabled'] && <HelpTooltip meta={CREDIT_POLICY_META['lti.enabled']} />}
              </div>
              <Toggle checked={!!ratios.lti?.enabled} onChange={v => updateConfig('ratios.lti.enabled', v)} disabled={!isEditing} />
            </div>
            <p className="text-xs text-white/40 mb-4">Vérifie si le montant demandé reste proportionnel au revenu annuel.</p>
            {ratios.lti?.enabled && (
              <InputField label="Multiple maximum" metaKey="lti.maximum" value={ratios.lti?.maximum} onChange={v => updateConfig('ratios.lti.maximum', v)} type="number" unit="x revenu annuel" disabled={!isEditing} className="max-w-xs" />
            )}
          </div>
        </div>
      </SectionCard>

      {/* ══ SECTION 6 — SCORING ═══════════════════════════════════════ */}
      <SectionCard title="Scoring de crédit" icon="🎯" accent="#7C3AED">
        <div className="mt-3 space-y-5">
          <Toggle metaKey="scoring.enabled" checked={!!scoring.enabled} onChange={v => updateConfig('scoring.enabled', v)} disabled={!isEditing} />
          {scoring.enabled && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <InputField label="Score approbation" metaKey="scoring.approvalScore" value={scoring.approvalScore} onChange={v => updateConfig('scoring.approvalScore', v)} type="number" unit="pts" disabled={!isEditing} />
                <InputField label="Score conditionnel" metaKey="scoring.conditionalScore" value={scoring.conditionalScore} onChange={v => updateConfig('scoring.conditionalScore', v)} type="number" unit="pts" disabled={!isEditing} />
                <InputField label="Score refus" metaKey="scoring.rejectionScore" value={scoring.rejectionScore} onChange={v => updateConfig('scoring.rejectionScore', v)} type="number" unit="pts" disabled={!isEditing} />
              </div>
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-bold text-white">Pondérations des critères</h4>
                  <span className={`text-xs font-bold px-3 py-1 rounded-full ${Math.abs(weightsTotal - 100) < 0.5 ? 'bg-[#10B981]/20 text-[#10B981] border border-[#10B981]/30' : 'bg-[#EF4444]/20 text-[#EF4444] border border-[#EF4444]/30'}`}>
                    Somme : {(weightsTotal as number).toFixed(1)}% {Math.abs(weightsTotal - 100) < 0.5 ? '✓' : '(doit être 100%)'}
                  </span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {scoring.weights && Object.entries(scoring.weights as Record<string, number>).map(([key, val]) => {
                    const wLabels: Record<string, string> = { dti: 'DTI', livingRemainder: 'Reste à vivre', ltv: 'LTV', employmentStability: 'Stabilité emploi', contractType: 'Type de contrat', incomeLevel: 'Niveau de revenu', debtBehavior: 'Comportement dette', clientProfile: 'Profil client', documentCompleteness: 'Complétude docs' };
                    const numVal = Number(val);
                    return (
                      <div key={key} className="bg-[#070E28] rounded-xl p-3 border border-[#1B3A8C]/15">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs text-white/75">{wLabels[key] || key}</span>
                          <span className={`text-sm font-bold ${numVal > 25 ? 'text-[#C9A84C]' : 'text-[#C9A84C]'}`}>{numVal}%</span>
                        </div>
                        {isEditing ? (
                          <input type="range" min={0} max={50} step={1} value={numVal}
                            onChange={e => updateConfig(`scoring.weights.${key}`, parseFloat(e.target.value))}
                            className="w-full accent-[#1B3A8C] h-1.5" />
                        ) : (
                          <div className="w-full bg-white/5 rounded-full h-1.5">
                            <div className="bg-gradient-to-r from-[#1B3A8C] to-[#C9A84C] h-1.5 rounded-full" style={{ width: `${numVal * 2}%` }} />
                          </div>
                        )}
                        {numVal > 25 && <p className="text-xs text-[#C9A84C] mt-1">⚠️ Pondération élevée</p>}
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </div>
      </SectionCard>

      {/* ══ SECTION 7 — AJUSTEMENTS DE PROFIL ═══════════════════════ */}
      <SectionCard title="Ajustements de profil" icon="👤" accent="#EC4899">
        <p className="text-sm text-white/40 mt-2 mb-4">Bonus et malus appliqués au score selon les caractéristiques du client. N'affectent pas les seuils principaux.</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[
            ['publicEmployeeBonus', 'publicEmployeeBonus'],
            ['permanentContractBonus', 'permanentContractBonus'],
            ['selfEmployedPenalty', 'selfEmployedPenalty'],
            ['probationPenalty', 'probationPenalty'],
            ['seniorityBonusPerYear', 'seniorityBonusPerYear'],
            ['existingCustomerBonus', 'existingCustomerBonus'],
            ['salaryDomiciliationBonus', 'salaryDomiciliationBonus'],
          ].map(([field, metaKey]) => {
            const val = profile[field] ?? 0;
            const isPositive = Number(val) >= 0;
            const meta = CREDIT_POLICY_META[metaKey];
            return (
              <div key={field} className="bg-[#040B1E] rounded-xl p-4 border border-[#1B3A8C]/15">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1">
                    <span className="text-sm font-medium text-white/70">{meta?.label}</span>
                    {meta && <HelpTooltip meta={meta} />}
                  </div>
                  <span className={`text-sm font-bold ${isPositive ? 'text-[#10B981]' : 'text-[#EF4444]'}`}>
                    {isPositive ? '+' : ''}{val} pts
                  </span>
                </div>
                {isEditing ? (
                  <input type="number" value={val} min={-20} max={20} step={0.5}
                    onChange={e => updateConfig(`profileAdjustments.${field}`, parseFloat(e.target.value) || 0)}
                    className="w-full bg-[#070E28] border border-[#1B3A8C]/30 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#C9A84C]/60"
                  />
                ) : (
                  <div className="w-full bg-white/5 rounded-full h-1.5 mt-2">
                    <div className={`h-1.5 rounded-full ${isPositive ? 'bg-gradient-to-r from-[#10B981] to-[#059669]' : 'bg-gradient-to-r from-[#EF4444] to-[#DC2626]'}`}
                      style={{ width: `${Math.min(100, Math.abs(Number(val)) * 5)}%` }} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </SectionCard>

      {/* ══ SECTION 8 — PIÈCES JUSTIFICATIVES ═══════════════════════ */}
      <SectionCard title="Pièces justificatives" icon="📄" accent="#14B8A6">
        <p className="text-sm text-white/40 mt-2 mb-4">
          Un document <strong className="text-white">bloquant</strong> empêche la décision automatique tant qu'il n'est pas fourni.
        </p>
        <div className="space-y-5">
          {Object.entries(documents).map(([typeKey, docs]) => (
            <div key={typeKey} className="bg-[#040B1E] rounded-[14px] p-4 border border-[#1B3A8C]/15">
              <h4 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
                <span>{typeKey === 'IMMO' ? '🏠' : typeKey === 'AUTO' ? '🚗' : typeKey === 'CONSO' ? '🛍️' : '💼'}</span>
                {LOAN_TYPE_LABELS[typeKey] || typeKey}
              </h4>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[#1B3A8C]/15">
                    <th className="text-left text-xs text-white/40 pb-2 font-medium">Document</th>
                    <th className="text-center text-xs text-white/40 pb-2 font-medium w-24">Obligatoire</th>
                    <th className="text-center text-xs text-white/40 pb-2 font-medium w-24">Bloquant</th>
                  </tr>
                </thead>
                <tbody>
                  {(docs || []).map((doc, idx) => (
                    <tr key={doc.code} className="border-b border-[#1B3A8C]/15">
                      <td className="py-2.5 pr-4">
                        <div className="text-white/70 font-medium text-xs">{doc.label}</div>
                        <div className="text-white/75 text-xs">{doc.code}</div>
                      </td>
                      <td className="text-center py-2.5">
                        <button type="button" disabled={!isEditing}
                          onClick={() => {
                            const newDocs = [...docs];
                            newDocs[idx] = { ...doc, required: !doc.required };
                            updateConfig(`documents.${typeKey}`, newDocs);
                          }}
                          className={`w-6 h-6 rounded-full border-2 flex items-center justify-center mx-auto text-xs transition-all disabled:cursor-default ${doc.required ? 'bg-[#10B981]/20 border-[#10B981] text-[#10B981]' : 'bg-transparent border-[#475569] text-transparent'}`}>
                          ✓
                        </button>
                      </td>
                      <td className="text-center py-2.5">
                        <button type="button" disabled={!isEditing}
                          onClick={() => {
                            const newDocs = [...docs];
                            newDocs[idx] = { ...doc, blockingIfMissing: !doc.blockingIfMissing };
                            updateConfig(`documents.${typeKey}`, newDocs);
                          }}
                          className={`w-6 h-6 rounded-full border-2 flex items-center justify-center mx-auto text-xs transition-all disabled:cursor-default ${doc.blockingIfMissing ? 'bg-[#EF4444]/20 border-[#EF4444] text-[#EF4444]' : 'bg-transparent border-[#475569] text-transparent'}`}>
                          ⚡
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </div>
      </SectionCard>

      {/* ══ SECTION 9 — SIMULATIONS & OVERRIDES ═════════════════════ */}
      <SectionCard title="Simulations et dérogations" icon="🔄" accent="#EF4444">
        <div className="mt-3 space-y-6">
          <div>
            <h4 className="text-sm font-bold text-white mb-3">Simulations alternatives</h4>
            <Toggle metaKey="enableSimulations" label="Activer les simulations" checked={!!config.enableSimulations} onChange={v => updateConfig('enableSimulations', v)} disabled={!isEditing} />
            {config.enableSimulations && (
              <div className="mt-3 max-w-xs">
                <InputField metaKey="maxSimulationScenarios" value={config.maxSimulationScenarios ?? 3} onChange={v => updateConfig('maxSimulationScenarios', Math.max(1, Math.min(5, v)))} type="number" min={1} max={5} unit="scénarios" disabled={!isEditing} />
              </div>
            )}
          </div>
          <div className="border-t border-[#1B3A8C]/25 pt-5">
            <h4 className="text-sm font-bold text-white mb-2">Dérogations manuelles</h4>
            <p className="text-xs text-white/40 mb-4">Permet à des profils habilités de dépasser la décision automatique du moteur.</p>
            <div className="space-y-3">
              <Toggle label="Autoriser les dérogations manuelles" checked={!!overrides.allowManualOverride} onChange={v => updateConfig('overrides.allowManualOverride', v)} disabled={!isEditing} />
              {overrides.allowManualOverride && (
                <>
                  <Toggle label="Justification obligatoire" checked={!!overrides.requireOverrideReason} onChange={v => updateConfig('overrides.requireOverrideReason', v)} disabled={!isEditing} />
                  <div>
                    <label className="text-sm font-medium text-white/70 block mb-2">Rôles autorisés</label>
                    <div className="flex flex-wrap gap-2">
                      {['org_admin', 'credit_manager', 'director'].map(role => {
                        const isSelected = (overrides.manualOverrideRoles || []).includes(role);
                        return (
                          <button key={role} type="button" disabled={!isEditing}
                            onClick={() => {
                              const current = overrides.manualOverrideRoles || [];
                              updateConfig('overrides.manualOverrideRoles', isSelected ? current.filter((r: string) => r !== role) : [...current, role]);
                            }}
                            className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all disabled:cursor-default ${isSelected ? 'bg-[#C9A84C]/20 text-[#C9A84C] border-[#C9A84C]/40' : 'bg-white/5 text-white/40 border-[#1B3A8C]/25 hover:bg-white/10'}`}>
                            {role}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </SectionCard>

    </div>
  );
}
