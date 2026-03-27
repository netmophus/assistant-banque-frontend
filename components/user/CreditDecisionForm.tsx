'use client';

import { useState, useEffect, useCallback } from 'react';
import { apiClient } from '@/lib/api/client';
import type {
  CreditApplicationInput,
  ExistingLoanInput,
  CreditDecisionResult,
  RatioDetail,
  SimulationScenario,
  TriggeredRule,
} from '@/types/credit-policy';

// ── Constants ─────────────────────────────────────────────────────────────────

const LOAN_TYPE_OPTIONS = [
  { value: 'CONSO', label: 'Crédit Consommation' },
  { value: 'PERSO', label: 'Prêt Personnel' },
  { value: 'AUTO', label: 'Crédit Auto' },
  { value: 'IMMO', label: 'Crédit Immobilier' },
];

const CONTRACT_TYPE_OPTIONS = [
  { value: 'CDI', label: 'CDI – Contrat à durée indéterminée' },
  { value: 'CDD', label: 'CDD – Contrat à durée déterminée' },
  { value: 'FONCTIONNAIRE', label: 'Fonctionnaire / Agent public' },
  { value: 'TNS', label: 'TNS – Travailleur non salarié' },
  { value: 'INTERIM', label: 'Intérim' },
  { value: 'SANS_EMPLOI', label: 'Sans emploi' },
];

const DOCUMENT_OPTIONS: Record<string, { code: string; label: string }[]> = {
  CONSO: [
    { code: 'ID', label: "Pièce d'identité" },
    { code: 'BULLETINS_SALAIRE', label: 'Bulletins de salaire (3 derniers)' },
    { code: 'RELEVES_BANCAIRES', label: 'Relevés bancaires (3 derniers mois)' },
    { code: 'JUSTIFICATIF_DOMICILE', label: 'Justificatif de domicile' },
  ],
  PERSO: [
    { code: 'ID', label: "Pièce d'identité" },
    { code: 'BULLETINS_SALAIRE', label: 'Bulletins de salaire (3 derniers)' },
    { code: 'RELEVES_BANCAIRES', label: 'Relevés bancaires (3 derniers mois)' },
    { code: 'JUSTIFICATIF_DOMICILE', label: 'Justificatif de domicile' },
  ],
  AUTO: [
    { code: 'ID', label: "Pièce d'identité" },
    { code: 'BULLETINS_SALAIRE', label: 'Bulletins de salaire (3 derniers)' },
    { code: 'RELEVES_BANCAIRES', label: 'Relevés bancaires (3 derniers mois)' },
    { code: 'BON_COMMANDE', label: 'Bon de commande du véhicule' },
    { code: 'ASSURANCE_AUTO', label: "Attestation d'assurance" },
  ],
  IMMO: [
    { code: 'ID', label: "Pièce d'identité" },
    { code: 'BULLETINS_SALAIRE', label: 'Bulletins de salaire (3 derniers)' },
    { code: 'RELEVES_BANCAIRES', label: 'Relevés bancaires (3 derniers mois)' },
    { code: 'AVIS_IMPOSITION', label: "Avis d'imposition (2 derniers)" },
    { code: 'COMPROMIS_VENTE', label: 'Compromis de vente' },
    { code: 'EXPERTISE_BIEN', label: "Rapport d'expertise du bien" },
  ],
};

// ── Helper ─────────────────────────────────────────────────────────────────────

const empty = (): CreditApplicationInput => ({
  loanType: 'CONSO',
  loanAmount: 10000,
  loanDurationMonths: 48,
  annualInterestRate: undefined,
  propertyValue: undefined,
  downPayment: undefined,
  clientName: '',
  age: undefined,
  isExistingCustomer: false,
  hasSalaryDomiciliation: false,
  contractType: 'CDI',
  employmentStartDate: '',
  isOnProbation: false,
  probationEndDate: '',
  employerSector: '',
  netMonthlySalary: 0,
  otherMonthlyIncome: 0,
  rentOrMortgage: 0,
  otherMonthlyCharges: 0,
  existingLoans: [],
  providedDocuments: [],
});

// ── Sub-components ─────────────────────────────────────────────────────────────

function Label({ text, required }: { text: string; required?: boolean }) {
  return (
    <label className="block text-sm font-semibold text-white/85 mb-1">
      {text}
      {required && <span className="text-red-400 ml-1">*</span>}
    </label>
  );
}

function Input({
  label,
  required,
  type = 'text',
  value,
  onChange,
  placeholder,
  suffix,
  min,
  max,
  step,
  disabled,
}: {
  label: string;
  required?: boolean;
  type?: string;
  value: string | number | undefined;
  onChange: (v: string) => void;
  placeholder?: string;
  suffix?: string;
  min?: number;
  max?: number;
  step?: number;
  disabled?: boolean;
}) {
  return (
    <div>
      <Label text={label} required={required} />
      <div className="relative">
        <input
          type={type}
          value={value ?? ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          min={min}
          max={max}
          step={step}
          disabled={disabled}
          className="w-full px-4 py-2.5 bg-[#040B1E] border border-[#1B3A8C]/40 rounded-xl text-white placeholder-white/25 focus:outline-none focus:border-[#C9A84C]/60 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          style={{ paddingRight: suffix ? '3.5rem' : undefined }}
        />
        {suffix && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 text-sm font-medium select-none">
            {suffix}
          </span>
        )}
      </div>
    </div>
  );
}

function Select({
  label,
  required,
  value,
  onChange,
  options,
}: {
  label: string;
  required?: boolean;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div>
      <Label text={label} required={required} />
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-4 py-2.5 bg-[#040B1E] border border-[#1B3A8C]/40 rounded-xl text-white focus:outline-none focus:border-[#C9A84C]/60 transition-colors"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value} className="bg-[#040B1E]">
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}

function Toggle({
  label,
  checked,
  onChange,
  description,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  description?: string;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <p className="text-sm font-semibold text-[#CBD5E1]">{label}</p>
        {description && <p className="text-xs text-white/40 mt-0.5">{description}</p>}
      </div>
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={`relative flex-shrink-0 w-11 h-6 rounded-full transition-colors duration-200 ${
          checked ? 'bg-[#1B3A8C]' : 'bg-white/10'
        }`}
      >
        <span
          className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200 ${
            checked ? 'translate-x-5' : 'translate-x-0'
          }`}
        />
      </button>
    </div>
  );
}

function SectionTitle({ children, accent = '#1B3A8C' }: { children: React.ReactNode; accent?: string }) {
  return (
    <div className="flex items-center gap-3 mb-5 pb-3" style={{ borderBottom: `1px solid ${accent}30` }}>
      <span className="w-1 h-5 rounded-full flex-shrink-0" style={{ background: accent }} />
      <h3 className="text-sm font-black uppercase tracking-[0.12em] text-white flex items-center gap-2">
        {children}
      </h3>
    </div>
  );
}

// ── Decision Badge ─────────────────────────────────────────────────────────────

function DecisionBadge({ decision }: { decision: string }) {
  const cfg =
    decision === 'APPROUVE'
      ? { bg: 'from-emerald-600/30 to-emerald-500/20', border: 'border-emerald-500/50', text: 'text-emerald-300', icon: '✅', label: 'APPROUVÉ' }
      : decision === 'CONDITIONNEL'
      ? { bg: 'from-amber-600/30 to-amber-500/20', border: 'border-amber-500/50', text: 'text-amber-300', icon: '⚠️', label: 'CONDITIONNEL' }
      : { bg: 'from-red-600/30 to-red-500/20', border: 'border-red-500/50', text: 'text-red-300', icon: '❌', label: 'REFUSÉ' };

  return (
    <div className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-gradient-to-r ${cfg.bg} border ${cfg.border}`}>
      <span className="text-xl">{cfg.icon}</span>
      <span className={`text-lg font-black tracking-widest ${cfg.text}`}>{cfg.label}</span>
    </div>
  );
}

// ── Ratio Gauge ────────────────────────────────────────────────────────────────

function RatioGauge({ ratio }: { ratio: RatioDetail }) {
  const statusCfg = {
    FAVORABLE: { color: 'bg-emerald-500', text: 'text-emerald-300', label: 'Favorable' },
    CONDITIONNEL: { color: 'bg-amber-500', text: 'text-amber-300', label: 'Conditionnel' },
    BLOQUANT: { color: 'bg-red-500', text: 'text-red-300', label: 'Bloquant' },
    NA: { color: 'bg-white/15', text: 'text-white/40', label: 'N/A' },
  }[ratio.status] ?? { color: 'bg-white/15', text: 'text-white/40', label: ratio.status };

  const maxVal = ratio.thresholdRejection ?? (ratio.value * 1.5 || 100);
  const pct = Math.min(100, (ratio.value / maxVal) * 100);

  return (
    <div className="rounded-xl p-4" style={{ background: '#040B1E', border: '1px solid rgba(5,150,105,0.25)' }}>
      <div className="flex items-start justify-between mb-2">
        <div>
          <p className="text-sm font-bold text-white">{ratio.label}</p>
          <p className="text-xs text-white/45 mt-0.5">{ratio.message}</p>
        </div>
        <div className="text-right flex-shrink-0">
          <p className="text-xl font-black text-white">
            {ratio.value.toFixed(1)}<span className="text-sm font-normal text-white/40 ml-0.5">{ratio.unit}</span>
          </p>
          <span className={`text-xs font-bold ${statusCfg.text}`}>{statusCfg.label}</span>
        </div>
      </div>
      <div className="w-full rounded-full h-2 mt-3" style={{ background: 'rgba(255,255,255,0.06)' }}>
        <div
          className={`h-2 rounded-full transition-all duration-700 ${statusCfg.color}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      {(ratio.thresholdApproval || ratio.thresholdConditional || ratio.thresholdRejection) && (
        <div className="flex justify-between text-[10px] text-white/35 mt-1">
          {ratio.thresholdApproval != null && <span>Approbation ≤ {ratio.thresholdApproval}{ratio.unit}</span>}
          {ratio.thresholdConditional != null && <span>Conditionnel ≤ {ratio.thresholdConditional}{ratio.unit}</span>}
          {ratio.thresholdRejection != null && <span>Rejet &gt; {ratio.thresholdRejection}{ratio.unit}</span>}
        </div>
      )}
    </div>
  );
}

// ── Simulation Card ────────────────────────────────────────────────────────────

function SimCard({ sim, currency }: { sim: SimulationScenario; currency: string }) {
  const decCfg = {
    APPROUVE: { border: 'border-emerald-500/40', badge: 'bg-emerald-500/20 text-emerald-300' },
    CONDITIONNEL: { border: 'border-amber-500/40', badge: 'bg-amber-500/20 text-amber-300' },
    REFUSE: { border: 'border-red-500/40', badge: 'bg-red-500/20 text-red-300' },
  }[sim.decision] ?? { border: 'border-white/15', badge: 'bg-white/10 text-white/60' };

  return (
    <div className={`rounded-xl p-4 border ${decCfg.border}`} style={{ background: '#040B1E' }}>
      <div className="flex items-start justify-between mb-3">
        <div>
          <p className="text-sm font-bold text-white">{sim.label}</p>
          <p className="text-xs text-white/45 mt-0.5">{sim.description}</p>
        </div>
        <span className={`text-xs font-bold px-2 py-1 rounded-full ${decCfg.badge}`}>
          {sim.decision === 'APPROUVE' ? 'Approuvé' : sim.decision === 'CONDITIONNEL' ? 'Conditionnel' : 'Refusé'}
        </span>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
        <div>
          <p className="text-[10px] text-white/40 uppercase tracking-wide">Montant</p>
          <p className="text-sm font-bold text-white">{sim.loanAmount.toLocaleString('fr-FR')} {currency}</p>
        </div>
        <div>
          <p className="text-[10px] text-white/40 uppercase tracking-wide">Durée</p>
          <p className="text-sm font-bold text-white">{sim.loanDurationMonths} mois</p>
        </div>
        <div>
          <p className="text-[10px] text-white/40 uppercase tracking-wide">Mensualité</p>
          <p className="text-sm font-bold text-white">{sim.monthlyInstallment.toLocaleString('fr-FR')} {currency}</p>
        </div>
        <div>
          <p className="text-[10px] text-white/40 uppercase tracking-wide">Taux d'endettement</p>
          <p className="text-sm font-bold text-white">{sim.newDTI.toFixed(1)}%</p>
        </div>
      </div>
      {sim.explanation && (
        <p className="text-xs text-white/50 mt-3 italic pt-2" style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }}>{sim.explanation}</p>
      )}
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────

export default function CreditDecisionForm() {
  const [form, setForm] = useState<CreditApplicationInput>(empty());
  const [result, setResult] = useState<CreditDecisionResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currency, setCurrency] = useState<string>('DZD');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    apiClient.get<{ currency?: string }>('/credit-policy/config')
      .then((cfg) => { if (cfg?.currency) setCurrency(cfg.currency); })
      .catch(() => {});
  }, []);

  const update = useCallback(<K extends keyof CreditApplicationInput>(key: K, value: CreditApplicationInput[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  }, []);

  const toggleDoc = useCallback((code: string) => {
    setForm((prev) => {
      const docs = prev.providedDocuments.includes(code)
        ? prev.providedDocuments.filter((d) => d !== code)
        : [...prev.providedDocuments, code];
      return { ...prev, providedDocuments: docs };
    });
  }, []);

  const addLoan = useCallback(() => {
    setForm((prev) => ({
      ...prev,
      existingLoans: [
        ...prev.existingLoans,
        { type: 'Crédit conso', monthlyPayment: 0, remainingDurationMonths: 0, outstandingAmount: 0 },
      ],
    }));
  }, []);

  const updateLoan = useCallback((idx: number, field: keyof ExistingLoanInput, value: string | number) => {
    setForm((prev) => {
      const loans = [...prev.existingLoans];
      loans[idx] = { ...loans[idx], [field]: value };
      return { ...prev, existingLoans: loans };
    });
  }, []);

  const removeLoan = useCallback((idx: number) => {
    setForm((prev) => ({ ...prev, existingLoans: prev.existingLoans.filter((_, i) => i !== idx) }));
  }, []);

  const buildDossierText = useCallback((r: CreditDecisionResult): string => {
    const loanLabels: Record<string, string> = { CONSO: 'credit a la consommation', PERSO: 'pret personnel', AUTO: 'credit automobile', IMMO: 'credit immobilier' };
    const contractLabels: Record<string, string> = { CDI: 'CDI', CDD: 'CDD', FONCTIONNAIRE: 'fonctionnaire', TNS: 'travailleur non salarie', INTERIM: 'interimaire', SANS_EMPLOI: 'sans emploi' };
    const decisionLabel = r.decision === 'APPROUVE' ? 'FAVORABLE' : r.decision === 'CONDITIONNEL' ? 'CONDITIONNEL' : 'DEFAVORABLE';
    const dateStr = new Date(r.analyzedAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });
    const loanLabel = loanLabels[form.loanType] || form.loanType;
    const contractLabel = contractLabels[form.contractType] || form.contractType;

    const presLine = [
      'M./Mme ' + form.clientName,
      form.age ? ', age(e) de ' + form.age + ' ans,' : '',
      ' ' + contractLabel,
      form.employerSector ? ' dans le secteur ' + form.employerSector : '',
      ', sollicite un ' + loanLabel,
      ' d un montant de ' + form.loanAmount.toLocaleString('fr-FR') + ' ' + currency,
      ' sur une duree de ' + form.loanDurationMonths + ' mois',
      r.appliedRate ? ', au taux annuel de ' + r.appliedRate.toFixed(2) + '%' : '',
      '.',
      form.isExistingCustomer ? ' Le demandeur est un client existant de l\'etablissement.' : '',
      form.hasSalaryDomiciliation ? ' La domiciliation du salaire est confirmee.' : '',
    ].join('');

    const sitLine = [
      'Revenu net mensuel total : ' + r.totalMonthlyIncome.toLocaleString('fr-FR') + ' ' + currency + '.',
      ' Charges mensuelles actuelles (hors credit sollicite) : ' + r.totalCurrentCharges.toLocaleString('fr-FR') + ' ' + currency + '.',
      ' La mensualite du credit sollicite s eleveait a ' + r.monthlyInstallment.toLocaleString('fr-FR') + ' ' + currency + ',',
      ' portant le taux d endettement de ' + r.currentDTI.toFixed(1) + '% a ' + r.newDTI.toFixed(1) + '%.',
      ' Le reste a vivre apres remboursement serait de ' + r.livingRemainder.toLocaleString('fr-FR') + ' ' + currency + '/mois.',
    ].join('');

    const lines: string[] = [
      'AVIS D ANALYSE DE CREDIT — ' + dateStr.toUpperCase(),
      '',
      'Objet : Demande de ' + loanLabel + ' — ' + form.clientName,
      '',
      'I. PRESENTATION DE LA DEMANDE',
      presLine,
      '',
      'II. SITUATION FINANCIERE',
      sitLine,
      '',
      'III. INDICATEURS DE RISQUE',
    ];
    Object.values(r.ratioDetails).forEach(rd => {
      const s = rd.status === 'FAVORABLE' ? 'favorable' : rd.status === 'CONDITIONNEL' ? 'a surveiller' : rd.status === 'BLOQUANT' ? 'bloquant' : 'non applicable';
      lines.push('  - ' + rd.label + ' : ' + rd.value.toFixed(1) + rd.unit + ' (' + s + ')');
    });
    if (r.creditScore != null) lines.push('  - Score de credit : ' + r.creditScore + '/100');
    if (r.strengths.length > 0) { lines.push(''); lines.push('Points favorables : ' + r.strengths.join(' ; ') + '.'); }
    if (r.weaknesses.length > 0) { lines.push(''); lines.push('Points d attention : ' + r.weaknesses.join(' ; ') + '.'); }
    lines.push('');
    lines.push('IV. DECISION');
    lines.push('Apres analyse des elements du dossier, la decision rendue est ' + decisionLabel + '.');
    lines.push(r.mainReason);
    if (r.conditions.length > 0) { lines.push(''); lines.push('Conditions requises :'); r.conditions.forEach(c => lines.push('  - ' + c)); }
    lines.push('');
    lines.push('Analyse realisee par le moteur de decision automatise (strategie : ' + r.strategy + ', config v' + r.configVersion + ').');
    return lines.join('\n');
  }, [form, currency]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await apiClient.post<CreditDecisionResult>('/credit-policy/analyze', form);
      setResult(res);
      setTimeout(() => {
        document.getElementById('credit-result')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    } catch (err: any) {
      setError(err?.message || 'Erreur lors de l\'analyse.');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setForm(empty());
    setResult(null);
    setError(null);
  };

  const docOptions = DOCUMENT_OPTIONS[form.loanType] ?? DOCUMENT_OPTIONS['CONSO'];
  const isIMO = form.loanType === 'IMMO';
  const totalIncome = (form.netMonthlySalary || 0) + (form.otherMonthlyIncome || 0);
  const totalCharges =
    (form.rentOrMortgage || 0) +
    (form.otherMonthlyCharges || 0) +
    form.existingLoans.reduce((s, l) => s + (l.monthlyPayment || 0), 0);

  return (
    <div className="space-y-6">
      {/* ── BLOCK 1 — Formulaire ───────────────────────────────────────────────── */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Prêt demandé */}
        <div className="rounded-2xl p-6" style={{ background: '#0A1434', borderTop: '2px solid rgba(201,168,76,0.25)', borderRight: '2px solid rgba(201,168,76,0.25)', borderBottom: '2px solid rgba(201,168,76,0.25)', borderLeft: '4px solid #C9A84C', boxShadow: '0 0 20px rgba(201,168,76,0.06)' }}>
          <SectionTitle accent="#C9A84C">
            <svg className="w-4 h-4 text-[#C9A84C]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
            Prêt demandé
          </SectionTitle>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <Select
              label="Type de crédit"
              required
              value={form.loanType}
              onChange={(v) => update('loanType', v)}
              options={LOAN_TYPE_OPTIONS}
            />
            <Input
              label="Montant souhaité"
              required
              type="number"
              value={form.loanAmount}
              onChange={(v) => update('loanAmount', Number(v))}
              min={1000}
              step={1000}
              suffix={currency}
              placeholder="ex. 500 000"
            />
            <Input
              label="Durée"
              required
              type="number"
              value={form.loanDurationMonths}
              onChange={(v) => update('loanDurationMonths', Number(v))}
              min={6}
              max={360}
              suffix="mois"
              placeholder="ex. 60"
            />
            <Input
              label="Taux annuel (optionnel)"
              type="number"
              value={form.annualInterestRate}
              onChange={(v) => update('annualInterestRate', v ? Number(v) : undefined)}
              min={0}
              max={30}
              step={0.1}
              suffix="%"
              placeholder="Taux par défaut"
            />
            {isIMO && (
              <>
                <Input
                  label="Valeur du bien"
                  required
                  type="number"
                  value={form.propertyValue}
                  onChange={(v) => update('propertyValue', v ? Number(v) : undefined)}
                  suffix={currency}
                  placeholder="ex. 8 000 000"
                />
                <Input
                  label="Apport personnel"
                  type="number"
                  value={form.downPayment}
                  onChange={(v) => update('downPayment', v ? Number(v) : undefined)}
                  suffix={currency}
                  placeholder="ex. 1 600 000"
                />
              </>
            )}
          </div>
        </div>

        {/* Profil client */}
        <div className="rounded-2xl p-6" style={{ background: '#0A1434', borderTop: '2px solid rgba(27,58,140,0.35)', borderRight: '2px solid rgba(27,58,140,0.35)', borderBottom: '2px solid rgba(27,58,140,0.35)', borderLeft: '4px solid #1B3A8C', boxShadow: '0 0 20px rgba(27,58,140,0.08)' }}>
          <SectionTitle accent="#1B3A8C">
            <svg className="w-4 h-4 text-[#6B8FD4]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg>
            Profil client
          </SectionTitle>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <Input
              label="Nom complet"
              required
              value={form.clientName}
              onChange={(v) => update('clientName', v)}
              placeholder="ex. Ahmed Benali"
            />
            <Input
              label="Âge"
              type="number"
              value={form.age}
              onChange={(v) => update('age', v ? Number(v) : undefined)}
              min={18}
              max={80}
              suffix="ans"
              placeholder="ex. 35"
            />
            <Select
              label="Type de contrat"
              required
              value={form.contractType}
              onChange={(v) => update('contractType', v)}
              options={CONTRACT_TYPE_OPTIONS}
            />
            <Input
              label="Date d'embauche"
              type="date"
              value={form.employmentStartDate}
              onChange={(v) => update('employmentStartDate', v)}
            />
            <Input
              label="Secteur employeur"
              value={form.employerSector}
              onChange={(v) => update('employerSector', v)}
              placeholder="ex. Bancaire"
            />
            <div className="sm:col-span-2 lg:col-span-1 space-y-3 pt-1">
              <Toggle
                label="Client existant"
                description="Le client est déjà en relation avec la banque"
                checked={form.isExistingCustomer}
                onChange={(v) => update('isExistingCustomer', v)}
              />
              <Toggle
                label="Domiciliation salaire"
                description="Le salaire est versé sur un compte de la banque"
                checked={form.hasSalaryDomiciliation}
                onChange={(v) => update('hasSalaryDomiciliation', v)}
              />
              <Toggle
                label="Période d'essai"
                description="Le client est actuellement en période d'essai"
                checked={form.isOnProbation}
                onChange={(v) => update('isOnProbation', v)}
              />
            </div>
            {form.isOnProbation && (
              <Input
                label="Fin de période d'essai"
                type="date"
                value={form.probationEndDate}
                onChange={(v) => update('probationEndDate', v)}
              />
            )}
          </div>
        </div>

        {/* Revenus & charges */}
        <div className="rounded-2xl p-6" style={{ background: '#0A1434', borderTop: '2px solid rgba(5,150,105,0.25)', borderRight: '2px solid rgba(5,150,105,0.25)', borderBottom: '2px solid rgba(5,150,105,0.25)', borderLeft: '4px solid #059669', boxShadow: '0 0 20px rgba(5,150,105,0.06)' }}>
          <SectionTitle accent="#059669">
            <svg className="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/></svg>
            Revenus &amp; charges mensuels
          </SectionTitle>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Salaire net mensuel"
              required
              type="number"
              value={form.netMonthlySalary}
              onChange={(v) => update('netMonthlySalary', Number(v))}
              min={0}
              step={1000}
              suffix={currency}
              placeholder="ex. 80 000"
            />
            <Input
              label="Autres revenus"
              type="number"
              value={form.otherMonthlyIncome}
              onChange={(v) => update('otherMonthlyIncome', Number(v))}
              min={0}
              step={1000}
              suffix={currency}
              placeholder="ex. 0"
            />
            <Input
              label="Loyer / remboursement logement"
              type="number"
              value={form.rentOrMortgage}
              onChange={(v) => update('rentOrMortgage', Number(v))}
              min={0}
              step={1000}
              suffix={currency}
              placeholder="ex. 20 000"
            />
            <Input
              label="Autres charges mensuelles"
              type="number"
              value={form.otherMonthlyCharges}
              onChange={(v) => update('otherMonthlyCharges', Number(v))}
              min={0}
              step={1000}
              suffix={currency}
              placeholder="ex. 5 000"
            />
          </div>

          {/* Indicateurs temps réel */}
          {totalIncome > 0 && (
            <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div className="bg-[#040B1E] rounded-xl p-3 text-center border border-[#1B3A8C]/25">
                <p className="text-[10px] uppercase text-white/40 tracking-wide">Revenu total</p>
                <p className="text-base font-black text-emerald-300">{totalIncome.toLocaleString('fr-FR')} {currency}</p>
              </div>
              <div className="bg-[#040B1E] rounded-xl p-3 text-center border border-[#1B3A8C]/25">
                <p className="text-[10px] uppercase text-white/40 tracking-wide">Charges actuelles</p>
                <p className="text-base font-black text-amber-300">{totalCharges.toLocaleString('fr-FR')} {currency}</p>
              </div>
              <div className="rounded-xl p-3 text-center col-span-2 sm:col-span-1" style={{ background: '#040B1E', border: '1px solid rgba(27,58,140,0.25)' }}>
                <p className="text-[10px] uppercase text-white/40 tracking-wide">Taux d'endettement actuel</p>
                <p className={`text-base font-black ${totalIncome > 0 ? (totalCharges / totalIncome * 100 > 40 ? 'text-red-300' : totalCharges / totalIncome * 100 > 30 ? 'text-amber-300' : 'text-emerald-300') : 'text-white'}`}>
                  {totalIncome > 0 ? (totalCharges / totalIncome * 100).toFixed(1) : 0}%
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Crédits en cours */}
        <div className="rounded-2xl p-6" style={{ background: '#0A1434', borderTop: '2px solid rgba(217,119,6,0.25)', borderRight: '2px solid rgba(217,119,6,0.25)', borderBottom: '2px solid rgba(217,119,6,0.25)', borderLeft: '4px solid #D97706', boxShadow: '0 0 20px rgba(217,119,6,0.06)' }}>
          <SectionTitle accent="#D97706">
            <svg className="w-4 h-4 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"/></svg>
            Crédits en cours
          </SectionTitle>
          {form.existingLoans.length === 0 ? (
            <p className="text-sm text-white/45 text-center py-4">Aucun crédit en cours déclaré.</p>
          ) : (
            <div className="space-y-3 mb-4">
              {form.existingLoans.map((loan, idx) => (
                <div key={idx} className="bg-[#040B1E] rounded-xl p-4 border grid grid-cols-1 sm:grid-cols-4 gap-3 items-end" style={{ borderColor: 'rgba(217,119,6,0.25)' }}>
                  <Input
                    label="Type"
                    value={loan.type}
                    onChange={(v) => updateLoan(idx, 'type', v)}
                    placeholder="ex. Immobilier"
                  />
                  <Input
                    label="Mensualité"
                    type="number"
                    value={loan.monthlyPayment}
                    onChange={(v) => updateLoan(idx, 'monthlyPayment', Number(v))}
                    min={0}
                    suffix={currency}
                  />
                  <Input
                    label="Mois restants"
                    type="number"
                    value={loan.remainingDurationMonths}
                    onChange={(v) => updateLoan(idx, 'remainingDurationMonths', Number(v))}
                    min={0}
                    suffix="mois"
                  />
                  <div>
                    <Label text="Capital restant dû" />
                    <div className="flex gap-2">
                      <input
                        type="number"
                        value={loan.outstandingAmount}
                        onChange={(e) => updateLoan(idx, 'outstandingAmount', Number(e.target.value))}
                        min={0}
                        className="flex-1 px-3 py-2.5 bg-[#040B1E] border border-[#1B3A8C]/40 rounded-xl text-white focus:outline-none focus:border-[#C9A84C]/60 transition-colors"
                      />
                      <button
                        type="button"
                        onClick={() => removeLoan(idx)}
                        className="px-3 py-2.5 bg-red-500/20 hover:bg-red-500/40 border border-red-500/30 text-red-300 rounded-xl transition-colors text-sm font-bold"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
          <button
            type="button"
            onClick={addLoan}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-colors" style={{ background: 'rgba(217,119,6,0.12)', border: '1px solid rgba(217,119,6,0.35)', color: '#F59E0B' }}
          >
            <span>+</span> Ajouter un crédit en cours
          </button>
        </div>

        {/* Documents fournis */}
        <div className="rounded-2xl p-6" style={{ background: '#0A1434', borderTop: '2px solid rgba(124,58,237,0.25)', borderRight: '2px solid rgba(124,58,237,0.25)', borderBottom: '2px solid rgba(124,58,237,0.25)', borderLeft: '4px solid #7C3AED', boxShadow: '0 0 20px rgba(124,58,237,0.06)' }}>
          <SectionTitle accent="#7C3AED">
            <svg className="w-4 h-4 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
            Documents fournis
          </SectionTitle>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {docOptions.map((doc) => {
              const checked = form.providedDocuments.includes(doc.code);
              return (
                <button
                  key={doc.code}
                  type="button"
                  onClick={() => toggleDoc(doc.code)}
                  className="flex items-center gap-3 px-4 py-3 rounded-xl border text-left transition-all duration-200"
                  style={checked
                    ? { background: 'rgba(201,168,76,0.1)', borderColor: 'rgba(201,168,76,0.5)', color: 'white' }
                    : { background: '#040B1E', borderColor: 'rgba(27,58,140,0.25)', color: 'rgba(255,255,255,0.5)' }}
                >
                  <span className="w-5 h-5 rounded flex items-center justify-center text-xs flex-shrink-0 font-bold" style={checked ? { background: '#C9A84C', color: 'white' } : { background: 'rgba(27,58,140,0.2)', color: 'transparent', border: '1px solid rgba(27,58,140,0.4)' }}>
                    {checked && '✓'}
                  </span>
                  <span className="text-sm font-medium">{doc.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Actions */}
        {error && (
          <div className="flex items-start gap-3 p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-300 text-sm">
            <span className="text-xl flex-shrink-0">⚠️</span>
            <p>{error}</p>
          </div>
        )}

        <div className="flex flex-wrap gap-3">
          <button
            type="submit"
            disabled={loading || !form.clientName || form.netMonthlySalary <= 0}
            className="flex-1 sm:flex-none px-8 py-3 text-white font-bold rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            style={{ background: 'linear-gradient(135deg, #1B3A8C 0%, #2e5bb8 50%, #C9A84C 100%)', boxShadow: '0 4px 20px rgba(27,58,140,0.35)' }}
          >
            {loading ? (
              <>
                <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Analyse en cours…
              </>
            ) : (
              <>
                <span>🔍</span> Analyser le dossier
              </>
            )}
          </button>
          {result && (
            <button
              type="button"
              onClick={handleReset}
              className="px-6 py-3 bg-white/10 hover:bg-white/20 text-white font-semibold rounded-xl border border-white/20 transition-colors"
            >
              Nouvelle analyse
            </button>
          )}
        </div>
      </form>

      {/* ── BLOCKS 2-5 — Résultats ────────────────────────────────────────────── */}
      {result && (
        <div id="credit-result" className="space-y-6 pt-2">
          {/* BLOCK 2 — Résumé immédiat */}
          <div className="rounded-2xl p-6" style={{ background: '#0A1434', borderTop: '2px solid rgba(201,168,76,0.3)', borderRight: '2px solid rgba(201,168,76,0.3)', borderBottom: '2px solid rgba(201,168,76,0.3)', borderLeft: '4px solid #C9A84C', boxShadow: '0 0 28px rgba(201,168,76,0.08)' }}>
            <SectionTitle accent="#C9A84C">
              <svg className="w-4 h-4 text-[#C9A84C]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
              Résumé immédiat
            </SectionTitle>

            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 mb-6">
              <div className="text-center">
                <DecisionBadge decision={result.decision} />
                <p className="text-xs text-white/45 mt-2">Stratégie : {result.strategy}</p>
                <p className="text-xs text-white/45">Config v{result.configVersion}</p>
              </div>
              <div className="flex-1">
                <p className="text-white/80 text-sm leading-relaxed">{result.mainReason}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[
                { label: 'Mensualité', value: `${result.monthlyInstallment.toLocaleString('fr-FR')} ${currency}`, sub: `Taux appliqué : ${result.appliedRate?.toFixed(2) ?? '—'}%` },
                { label: 'Coût total', value: `${result.totalAmount.toLocaleString('fr-FR')} ${currency}`, sub: `Dont intérêts : ${result.totalInterest.toLocaleString('fr-FR')} ${currency}` },
                { label: "Taux d'endettement", value: `${result.newDTI.toFixed(1)}%`, sub: `Avant : ${result.currentDTI.toFixed(1)}%` },
                { label: 'Reste à vivre', value: `${result.livingRemainder.toLocaleString('fr-FR')} ${currency}`, sub: `Revenu total : ${result.totalMonthlyIncome.toLocaleString('fr-FR')} ${currency}` },
              ].map((kpi) => (
                <div key={kpi.label} className="rounded-xl p-4 text-center" style={{ background: '#040B1E', border: '1px solid rgba(201,168,76,0.2)' }}>
                  <p className="text-[10px] uppercase text-white/45 tracking-wide mb-1">{kpi.label}</p>
                  <p className="text-lg font-black text-white">{kpi.value}</p>
                  <p className="text-[10px] text-white/35 mt-0.5">{kpi.sub}</p>
                </div>
              ))}
            </div>

            {result.creditScore != null && (
              <div className="mt-4 rounded-xl p-4" style={{ background: '#040B1E', border: '1px solid rgba(124,58,237,0.35)' }}>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-bold text-white">Score de crédit</p>
                  <span className="text-2xl font-black text-[#C9A84C]">{result.creditScore}/100</span>
                </div>
                <div className="w-full rounded-full h-3" style={{ background: 'rgba(255,255,255,0.06)' }}>
                  <div
                    className="h-3 rounded-full transition-all duration-700"
                    style={{ width: `${result.creditScore}%`, background: 'linear-gradient(90deg, #1B3A8C, #C9A84C)' }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* BLOCK 3 — Ratios détaillés */}
          {Object.keys(result.ratioDetails).length > 0 && (
            <div className="rounded-2xl p-6" style={{ background: '#0A1434', borderTop: '2px solid rgba(5,150,105,0.25)', borderRight: '2px solid rgba(5,150,105,0.25)', borderBottom: '2px solid rgba(5,150,105,0.25)', borderLeft: '4px solid #059669', boxShadow: '0 0 20px rgba(5,150,105,0.06)' }}>
              <SectionTitle accent="#059669">
                <svg className="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/></svg>
                Ratios calculés
              </SectionTitle>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {Object.values(result.ratioDetails).map((ratio, i) => (
                  <RatioGauge key={i} ratio={ratio} />
                ))}
              </div>
            </div>
          )}

          {/* BLOCK 4 — Décision détaillée */}
          <div className="rounded-2xl p-6" style={{ background: '#0A1434', borderTop: '2px solid rgba(27,58,140,0.35)', borderRight: '2px solid rgba(27,58,140,0.35)', borderBottom: '2px solid rgba(27,58,140,0.35)', borderLeft: '4px solid #1B3A8C', boxShadow: '0 0 20px rgba(27,58,140,0.08)' }}>
            <SectionTitle accent="#1B3A8C">
              <svg className="w-4 h-4 text-[#6B8FD4]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3"/></svg>
              Analyse détaillée de la décision
            </SectionTitle>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              {/* Points forts */}
              {result.strengths.length > 0 && (
                <div className="rounded-xl p-4" style={{ background: 'rgba(5,150,105,0.08)', borderTop: '1px solid rgba(5,150,105,0.3)', borderRight: '1px solid rgba(5,150,105,0.3)', borderBottom: '1px solid rgba(5,150,105,0.3)', borderLeft: '3px solid #059669' }}>
                  <p className="text-xs font-bold text-emerald-300 uppercase tracking-wide mb-3">Points forts</p>
                  <ul className="space-y-1.5">
                    {result.strengths.map((s, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-white/80">
                        <span className="text-emerald-400 flex-shrink-0 mt-0.5">✓</span>
                        {s}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Points faibles */}
              {result.weaknesses.length > 0 && (
                <div className="rounded-xl p-4" style={{ background: 'rgba(239,68,68,0.08)', borderTop: '1px solid rgba(239,68,68,0.3)', borderRight: '1px solid rgba(239,68,68,0.3)', borderBottom: '1px solid rgba(239,68,68,0.3)', borderLeft: '3px solid #EF4444' }}>
                  <p className="text-xs font-bold text-red-300 uppercase tracking-wide mb-3">Points d'attention</p>
                  <ul className="space-y-1.5">
                    {result.weaknesses.map((w, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-white/80">
                        <span className="text-red-400 flex-shrink-0 mt-0.5">✗</span>
                        {w}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Conditions */}
              {result.conditions.length > 0 && (
                <div className="rounded-xl p-4" style={{ background: 'rgba(217,119,6,0.08)', borderTop: '1px solid rgba(217,119,6,0.3)', borderRight: '1px solid rgba(217,119,6,0.3)', borderBottom: '1px solid rgba(217,119,6,0.3)', borderLeft: '3px solid #D97706' }}>
                  <p className="text-xs font-bold text-amber-300 uppercase tracking-wide mb-3">Conditions requises</p>
                  <ul className="space-y-1.5">
                    {result.conditions.map((c, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-white/80">
                        <span className="text-amber-400 flex-shrink-0 mt-0.5">→</span>
                        {c}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Règles déclenchées */}
            {result.triggeredRules.length > 0 && (
              <div>
                <p className="text-xs font-bold text-white/40 uppercase tracking-wide mb-3">Règles déclenchées</p>
                <div className="space-y-2">
                  {result.triggeredRules.map((rule: TriggeredRule, i) => {
                    const cfg =
                      rule.impact === 'BLOQUANT'
                        ? { bg: 'rgba(239,68,68,0.08)', border: 'rgba(239,68,68,0.3)', tag: 'bg-red-500/20 text-red-300' }
                        : rule.impact === 'PENALISANT'
                        ? { bg: 'rgba(217,119,6,0.08)', border: 'rgba(217,119,6,0.3)', tag: 'bg-amber-500/20 text-amber-300' }
                        : { bg: 'rgba(5,150,105,0.08)', border: 'rgba(5,150,105,0.3)', tag: 'bg-emerald-500/20 text-emerald-300' };
                    return (
                      <div key={i} className="flex items-start gap-3 p-3 rounded-lg" style={{ background: cfg.bg, border: `1px solid ${cfg.border}` }}>
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full flex-shrink-0 ${cfg.tag}`}>
                          {rule.impact}
                        </span>
                        <div>
                          <p className="text-xs font-mono text-white/45">{rule.code}</p>
                          <p className="text-sm text-white/80">{rule.message}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* BLOCK 5 — Simulations */}
          {result.simulations.length > 0 && (
            <div className="rounded-2xl p-6" style={{ background: '#0A1434', borderTop: '2px solid rgba(124,58,237,0.25)', borderRight: '2px solid rgba(124,58,237,0.25)', borderBottom: '2px solid rgba(124,58,237,0.25)', borderLeft: '4px solid #7C3AED', boxShadow: '0 0 20px rgba(124,58,237,0.06)' }}>
              <SectionTitle accent="#7C3AED">
                <svg className="w-4 h-4 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"/></svg>
                Scénarios alternatifs
              </SectionTitle>
              <p className="text-sm text-white/45 mb-4">
                Ces scénarios alternatifs ont été calculés automatiquement pour explorer d'autres conditions pouvant aboutir à une décision favorable.
              </p>
              <div className="grid grid-cols-1 gap-4">
                {result.simulations.map((sim) => (
                  <SimCard key={sim.id} sim={sim} currency={currency} />
                ))}
              </div>
            </div>
          )}

          {/* Synthèse finale */}
          <div className="rounded-2xl p-6" style={{ background: '#0A1434', borderTop: '2px solid rgba(201,168,76,0.25)', borderRight: '2px solid rgba(201,168,76,0.25)', borderBottom: '2px solid rgba(201,168,76,0.25)', borderLeft: '4px solid #C9A84C', boxShadow: '0 0 20px rgba(201,168,76,0.06)' }}>
            <SectionTitle accent="#C9A84C">
              <svg className="w-4 h-4 text-[#C9A84C]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/></svg>
              Synthèse
            </SectionTitle>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm mb-4">
              {[
                { label: 'Client', value: form.clientName },
                { label: 'Type de crédit', value: form.loanType },
                { label: 'Montant demandé', value: `${form.loanAmount.toLocaleString('fr-FR')} ${currency}` },
                { label: 'Durée', value: `${form.loanDurationMonths} mois` },
                { label: 'Mensualité', value: `${result.monthlyInstallment.toLocaleString('fr-FR')} ${currency}` },
                { label: "Taux d'endettement final", value: `${result.newDTI.toFixed(1)}%` },
                { label: 'Reste à vivre', value: `${result.livingRemainder.toLocaleString('fr-FR')} ${currency}` },
                ...(result.creditScore != null ? [{ label: 'Score de crédit', value: `${result.creditScore}/100` }] : []),
              ].map(row => (
                <div key={row.label} className="flex justify-between gap-2 py-1.5 border-b" style={{ borderColor: 'rgba(27,58,140,0.15)' }}>
                  <span className="text-white/45">{row.label}</span>
                  <span className="text-white font-medium">{row.value}</span>
                </div>
              ))}
            </div>
            <div className="flex items-center justify-between pt-3" style={{ borderTop: '1px solid rgba(201,168,76,0.15)' }}>
              <DecisionBadge decision={result.decision} />
              <span className="text-xs text-white/35">
                Analyse du {new Date(result.analyzedAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })}
              </span>
            </div>
          </div>

          {/* Texte du dossier — Formaté */}
          {(() => {
            const dossierText = buildDossierText(result);
            const handleCopy = () => {
              navigator.clipboard.writeText(dossierText).then(() => {
                setCopied(true);
                setTimeout(() => setCopied(false), 2500);
              });
            };
            const _loanLabel = LOAN_TYPE_OPTIONS.find(o => o.value === form.loanType)?.label || form.loanType;
            const _contractLabel = (CONTRACT_TYPE_OPTIONS.find(o => o.value === form.contractType)?.label || form.contractType).split(' – ')[0];
            const _dateStr = new Date(result.analyzedAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });
            const _decLabel = result.decision === 'APPROUVE' ? 'FAVORABLE' : result.decision === 'CONDITIONNEL' ? 'CONDITIONNEL' : 'DÉFAVORABLE';
            const _decColor = result.decision === 'APPROUVE' ? 'text-emerald-400' : result.decision === 'CONDITIONNEL' ? 'text-amber-400' : 'text-red-400';
            const _decBg = result.decision === 'APPROUVE' ? 'bg-emerald-500/15 border-emerald-500/30' : result.decision === 'CONDITIONNEL' ? 'bg-amber-500/15 border-amber-500/30' : 'bg-red-500/15 border-red-500/30';
            const _decIcon = result.decision === 'APPROUVE' ? '✅' : result.decision === 'CONDITIONNEL' ? '⚠️' : '❌';

            return (
              <div className="rounded-2xl overflow-hidden" style={{ background: '#040B1E', borderTop: '2px solid rgba(27,58,140,0.4)', borderRight: '2px solid rgba(27,58,140,0.4)', borderBottom: '2px solid rgba(27,58,140,0.4)', borderLeft: '4px solid #1B3A8C' }}>
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b" style={{ background: 'rgba(27,58,140,0.12)', borderColor: 'rgba(27,58,140,0.25)' }}>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-[#2563EB] to-[#7C3AED] rounded-xl flex items-center justify-center shadow-lg shadow-[#2563EB]/20">
                      <span className="text-lg">📄</span>
                    </div>
                    <div>
                      <h3 className="text-base font-black text-white tracking-tight">AVIS D'ANALYSE DE CRÉDIT</h3>
                      <p className="text-xs text-white/45">{_dateStr} · {form.clientName} · {_loanLabel}</p>
                    </div>
                  </div>
                  <button onClick={handleCopy}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-200 ${copied ? 'bg-emerald-500/20 border border-emerald-500/40 text-emerald-300' : 'bg-white/10 border border-white/20 text-[#CBD5E1] hover:bg-white/15'}`}>
                    {copied ? '✓ Copié' : '📋 Copier le texte'}
                  </button>
                </div>

                <div className="p-6 space-y-6">
                  {/* I. Présentation de la demande */}
                  <div>
                    <div className="flex items-center gap-2.5 mb-3">
                      <span className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-black text-[#C9A84C]" style={{ background: 'rgba(201,168,76,0.15)' }}>I</span>
                      <h4 className="text-sm font-bold text-white uppercase tracking-wide">Présentation de la demande</h4>
                    </div>
                    <div className="pl-9 text-sm text-white/80 leading-relaxed space-y-2">
                      <p>
                        <span className="font-semibold text-white">M./Mme {form.clientName}</span>
                        {form.age ? <>, âgé(e) de <span className="font-semibold text-white">{form.age} ans</span></> : null}
                        , <span className="text-[#60A5FA]">{_contractLabel}</span>
                        {form.employerSector ? <> dans le secteur <span className="text-[#A78BFA]">{form.employerSector}</span></> : null}
                        , sollicite un <span className="font-semibold text-[#A78BFA]">{_loanLabel.toLowerCase()}</span> d&apos;un montant de{' '}
                        <span className="font-bold text-white">{form.loanAmount.toLocaleString('fr-FR')} {currency}</span> sur une durée de{' '}
                        <span className="font-bold text-white">{form.loanDurationMonths} mois</span>
                        {result.appliedRate ? <>, au taux annuel de <span className="font-bold text-white">{result.appliedRate.toFixed(2)}%</span></> : null}.
                      </p>
                      {(form.isExistingCustomer || form.hasSalaryDomiciliation) && (
                        <div className="flex flex-wrap gap-2 mt-1">
                          {form.isExistingCustomer && (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs font-medium">✓ Client existant</span>
                          )}
                          {form.hasSalaryDomiciliation && (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-blue-300 text-xs font-medium" style={{ background: 'rgba(27,58,140,0.2)', border: '1px solid rgba(27,58,140,0.4)' }}>✓ Domiciliation salaire</span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* II. Situation financière */}
                  <div>
                    <div className="flex items-center gap-2.5 mb-3">
                      <span className="w-7 h-7 rounded-lg bg-emerald-500/20 flex items-center justify-center text-xs font-black text-emerald-400">II</span>
                      <h4 className="text-sm font-bold text-white uppercase tracking-wide">Situation financière</h4>
                    </div>
                    <div className="pl-9 grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                      {[
                        { label: 'Revenu mensuel total', value: `${result.totalMonthlyIncome.toLocaleString('fr-FR')} ${currency}`, color: 'text-emerald-300' },
                        { label: 'Charges actuelles', value: `${result.totalCurrentCharges.toLocaleString('fr-FR')} ${currency}`, color: 'text-amber-300' },
                        { label: 'Mensualité sollicitée', value: `${result.monthlyInstallment.toLocaleString('fr-FR')} ${currency}`, color: 'text-[#60A5FA]' },
                        { label: "Taux d'endettement", value: `${result.currentDTI.toFixed(1)}% → ${result.newDTI.toFixed(1)}%`, color: result.newDTI > 40 ? 'text-red-300' : result.newDTI > 33 ? 'text-amber-300' : 'text-emerald-300' },
                        { label: 'Reste à vivre', value: `${result.livingRemainder.toLocaleString('fr-FR')} ${currency}/mois`, color: 'text-white' },
                      ].map(item => (
                        <div key={item.label} className="bg-[#060d1f] rounded-lg p-3 border border-white/5">
                          <p className="text-[10px] text-white/40 uppercase tracking-wider mb-1">{item.label}</p>
                          <p className={`text-sm font-bold ${item.color}`}>{item.value}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* III. Indicateurs de risque */}
                  <div>
                    <div className="flex items-center gap-2.5 mb-3">
                      <span className="w-7 h-7 rounded-lg bg-amber-500/20 flex items-center justify-center text-xs font-black text-amber-400">III</span>
                      <h4 className="text-sm font-bold text-white uppercase tracking-wide">Indicateurs de risque</h4>
                    </div>
                    <div className="pl-9 space-y-2">
                      {Object.values(result.ratioDetails).map((rd, i) => {
                        const _s = rd.status === 'FAVORABLE'
                          ? { color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20', label: 'Favorable', dot: 'bg-emerald-400' }
                          : rd.status === 'CONDITIONNEL'
                          ? { color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20', label: 'À surveiller', dot: 'bg-amber-400' }
                          : rd.status === 'BLOQUANT'
                          ? { color: 'text-red-400', bg: 'bg-red-500/10 border-red-500/20', label: 'Bloquant', dot: 'bg-red-400' }
                          : { color: 'text-white/40', bg: 'bg-white/5 border-white/10', label: 'N/A', dot: 'bg-white/20' };
                        return (
                          <div key={i} className={`flex items-center justify-between px-3 py-2.5 rounded-lg border ${_s.bg}`}>
                            <div className="flex items-center gap-2.5">
                              <span className={`w-2 h-2 rounded-full flex-shrink-0 ${_s.dot}`} />
                              <span className="text-sm text-[#CBD5E1]">{rd.label}</span>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className="text-sm font-bold text-white">{rd.value.toFixed(1)}{rd.unit}</span>
                              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${_s.bg} ${_s.color}`}>{_s.label}</span>
                            </div>
                          </div>
                        );
                      })}
                      {result.creditScore != null && (
                        <div className="flex items-center justify-between px-3 py-2.5 rounded-lg border bg-[#7C3AED]/10 border-[#7C3AED]/20">
                          <div className="flex items-center gap-2.5">
                            <span className="w-2 h-2 rounded-full flex-shrink-0 bg-[#7C3AED]" />
                            <span className="text-sm text-[#CBD5E1]">Score de crédit</span>
                          </div>
                          <span className="text-sm font-bold text-[#A78BFA]">{result.creditScore}/100</span>
                        </div>
                      )}
                    </div>
                    {(result.strengths.length > 0 || result.weaknesses.length > 0) && (
                      <div className="pl-9 grid grid-cols-1 sm:grid-cols-2 gap-2.5 mt-3">
                        {result.strengths.length > 0 && (
                          <div className="bg-emerald-500/5 rounded-lg p-3 border border-emerald-500/15">
                            <p className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider mb-2">Points favorables</p>
                            {result.strengths.map((s, i) => (
                              <p key={i} className="text-xs text-[#CBD5E1] flex items-start gap-1.5 mb-1 last:mb-0"><span className="text-emerald-400 flex-shrink-0 mt-0.5">✓</span>{s}</p>
                            ))}
                          </div>
                        )}
                        {result.weaknesses.length > 0 && (
                          <div className="bg-red-500/5 rounded-lg p-3 border border-red-500/15">
                            <p className="text-[10px] font-bold text-red-400 uppercase tracking-wider mb-2">Points d&apos;attention</p>
                            {result.weaknesses.map((w, i) => (
                              <p key={i} className="text-xs text-[#CBD5E1] flex items-start gap-1.5 mb-1 last:mb-0"><span className="text-red-400 flex-shrink-0 mt-0.5">✗</span>{w}</p>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* IV. Décision */}
                  <div>
                    <div className="flex items-center gap-2.5 mb-3">
                      <span className="w-7 h-7 rounded-lg bg-[#7C3AED]/20 flex items-center justify-center text-xs font-black text-[#A78BFA]">IV</span>
                      <h4 className="text-sm font-bold text-white uppercase tracking-wide">Décision</h4>
                    </div>
                    <div className="pl-9 space-y-3">
                      <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full border ${_decBg}`}>
                        <span>{_decIcon}</span>
                        <span className={`text-sm font-black tracking-widest ${_decColor}`}>{_decLabel}</span>
                      </div>
                      <p className="text-sm text-[#CBD5E1] leading-relaxed">{result.mainReason}</p>
                      {result.conditions.length > 0 && (
                        <div className="bg-amber-500/5 rounded-lg p-3 border border-amber-500/15">
                          <p className="text-[10px] font-bold text-amber-400 uppercase tracking-wider mb-2">Conditions requises</p>
                          {result.conditions.map((c, i) => (
                            <p key={i} className="text-xs text-[#CBD5E1] flex items-start gap-1.5 mb-1 last:mb-0"><span className="text-amber-400 flex-shrink-0 mt-0.5">→</span>{c}</p>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Footer */}
                  <div className="flex items-center justify-between pt-4 border-t border-white/5 text-xs text-white/35">
                    <span>Analyse automatisée · Stratégie : {result.strategy} · Config v{result.configVersion}</span>
                    <span>{_dateStr}</span>
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
}
