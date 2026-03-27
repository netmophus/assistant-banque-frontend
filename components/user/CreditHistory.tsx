'use client';

import { useState, useEffect, useCallback } from 'react';
import { apiClient } from '@/lib/api/client';
import type { CreditDecisionResult, RatioDetail, SimulationScenario, TriggeredRule } from '@/types/credit-policy';

// ── Types ──────────────────────────────────────────────────────────────────────

interface ApplicationRecord {
  id: string;
  user_id: string;
  organization_id: string;
  created_at: string;
  application: {
    clientName: string;
    loanType: string;
    loanAmount: number;
    loanDurationMonths: number;
    contractType: string;
    netMonthlySalary: number;
    otherMonthlyIncome?: number;
    age?: number;
    employerSector?: string;
    isExistingCustomer?: boolean;
    hasSalaryDomiciliation?: boolean;
    isOnProbation?: boolean;
    annualInterestRate?: number;
  };
  result: CreditDecisionResult;
}

// ── Constants ──────────────────────────────────────────────────────────────────

const LOAN_LABELS: Record<string, string> = { CONSO: 'Consommation', PERSO: 'Personnel', AUTO: 'Automobile', IMMO: 'Immobilier' };
const CONTRACT_LABELS: Record<string, string> = { CDI: 'CDI', CDD: 'CDD', FONCTIONNAIRE: 'Fonctionnaire', TNS: 'TNS', INTERIM: 'Intérim', SANS_EMPLOI: 'Sans emploi' };

const DECISION_CFG = {
  APPROUVE:     { bg: 'bg-emerald-500/15 border-emerald-500/40', text: 'text-emerald-300', dot: 'bg-emerald-400', label: 'Approuvé',     badge: 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300', icon: '✅' },
  CONDITIONNEL: { bg: 'bg-amber-500/15 border-amber-500/40',     text: 'text-amber-300',   dot: 'bg-amber-400',   label: 'Conditionnel', badge: 'bg-amber-500/20 border-amber-500/50 text-amber-300',     icon: '⚠️' },
  REFUSE:       { bg: 'bg-red-500/15 border-red-500/40',         text: 'text-red-300',     dot: 'bg-red-400',     label: 'Refusé',       badge: 'bg-red-500/20 border-red-500/50 text-red-300',           icon: '❌' },
};

// ── Dossier text builder ───────────────────────────────────────────────────────

function buildDossierText(app: ApplicationRecord['application'], r: CreditDecisionResult, currency: string): string {
  const loanLabels: Record<string, string> = { CONSO: 'credit a la consommation', PERSO: 'pret personnel', AUTO: 'credit automobile', IMMO: 'credit immobilier' };
  const contractLabels: Record<string, string> = { CDI: 'CDI', CDD: 'CDD', FONCTIONNAIRE: 'fonctionnaire', TNS: 'travailleur non salarie', INTERIM: 'interimaire', SANS_EMPLOI: 'sans emploi' };
  const decisionLabel = r.decision === 'APPROUVE' ? 'FAVORABLE' : r.decision === 'CONDITIONNEL' ? 'CONDITIONNEL' : 'DEFAVORABLE';
  const dateStr = new Date(r.analyzedAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });
  const loanLabel = loanLabels[app.loanType] || app.loanType;
  const contractLabel = contractLabels[app.contractType] || app.contractType;

  const presLine = [
    'M./Mme ' + app.clientName,
    app.age ? ', age(e) de ' + app.age + ' ans,' : '',
    ' ' + contractLabel,
    app.employerSector ? ' dans le secteur ' + app.employerSector : '',
    ', sollicite un ' + loanLabel,
    ' d un montant de ' + app.loanAmount.toLocaleString('fr-FR') + ' ' + currency,
    ' sur une duree de ' + app.loanDurationMonths + ' mois',
    r.appliedRate ? ', au taux annuel de ' + r.appliedRate.toFixed(2) + '%' : '',
    '.',
    app.isExistingCustomer ? ' Le demandeur est un client existant de l\'etablissement.' : '',
    app.hasSalaryDomiciliation ? ' La domiciliation du salaire est confirmee.' : '',
  ].join('');

  const sitLine = [
    'Revenu net mensuel total : ' + r.totalMonthlyIncome.toLocaleString('fr-FR') + ' ' + currency + '.',
    ' Charges mensuelles actuelles (hors credit sollicite) : ' + r.totalCurrentCharges.toLocaleString('fr-FR') + ' ' + currency + '.',
    ' La mensualite du credit sollicite s elevait a ' + r.monthlyInstallment.toLocaleString('fr-FR') + ' ' + currency + ',',
    ' portant le taux d endettement de ' + r.currentDTI.toFixed(1) + '% a ' + r.newDTI.toFixed(1) + '%.',
    ' Le reste a vivre apres remboursement serait de ' + r.livingRemainder.toLocaleString('fr-FR') + ' ' + currency + '/mois.',
  ].join('');

  const lines: string[] = [
    'AVIS D ANALYSE DE CREDIT — ' + dateStr.toUpperCase(),
    '',
    'Objet : Demande de ' + loanLabel + ' — ' + app.clientName,
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
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function RatioGauge({ ratio }: { ratio: RatioDetail }) {
  const statusCfg = {
    FAVORABLE:    { color: 'bg-emerald-500', text: 'text-emerald-300', label: 'Favorable' },
    CONDITIONNEL: { color: 'bg-amber-500',   text: 'text-amber-300',   label: 'Conditionnel' },
    BLOQUANT:     { color: 'bg-red-500',     text: 'text-red-300',     label: 'Bloquant' },
    NA:           { color: 'bg-[#374151]',   text: 'text-[#6B7280]',   label: 'N/A' },
  }[ratio.status] ?? { color: 'bg-[#374151]', text: 'text-[#6B7280]', label: ratio.status };

  const maxVal = ratio.thresholdRejection ?? (ratio.value * 1.5 || 100);
  const pct = Math.min(100, (ratio.value / maxVal) * 100);

  return (
    <div className="bg-[#0d1226] rounded-xl p-4 border border-[#2563EB]/20">
      <div className="flex items-start justify-between mb-2">
        <div>
          <p className="text-sm font-bold text-white">{ratio.label}</p>
          <p className="text-xs text-[#6B7280] mt-0.5">{ratio.message}</p>
        </div>
        <div className="text-right flex-shrink-0">
          <p className="text-xl font-black text-white">{ratio.value.toFixed(1)}<span className="text-sm font-normal text-[#6B7280] ml-0.5">{ratio.unit}</span></p>
          <span className={`text-xs font-bold ${statusCfg.text}`}>{statusCfg.label}</span>
        </div>
      </div>
      <div className="w-full bg-[#1a2035] rounded-full h-2 mt-3">
        <div className={`h-2 rounded-full ${statusCfg.color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function SimCard({ sim }: { sim: SimulationScenario }) {
  const decCfg = {
    APPROUVE:     { border: 'border-emerald-500/40', badge: 'bg-emerald-500/20 text-emerald-300' },
    CONDITIONNEL: { border: 'border-amber-500/40',   badge: 'bg-amber-500/20 text-amber-300' },
    REFUSE:       { border: 'border-red-500/40',     badge: 'bg-red-500/20 text-red-300' },
  }[sim.decision] ?? { border: 'border-[#374151]', badge: 'bg-[#374151] text-[#9CA3AF]' };
  return (
    <div className={`bg-[#0d1226] rounded-xl p-4 border ${decCfg.border}`}>
      <div className="flex items-start justify-between mb-3">
        <div>
          <p className="text-sm font-bold text-white">{sim.label}</p>
          <p className="text-xs text-[#6B7280] mt-0.5">{sim.description}</p>
        </div>
        <span className={`text-xs font-bold px-2 py-1 rounded-full ${decCfg.badge}`}>
          {sim.decision === 'APPROUVE' ? 'Approuvé' : sim.decision === 'CONDITIONNEL' ? 'Conditionnel' : 'Refusé'}
        </span>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
        <div><p className="text-[10px] text-[#6B7280] uppercase tracking-wide">Montant</p><p className="text-sm font-bold text-white">{sim.loanAmount.toLocaleString('fr-FR')}</p></div>
        <div><p className="text-[10px] text-[#6B7280] uppercase tracking-wide">Durée</p><p className="text-sm font-bold text-white">{sim.loanDurationMonths} mois</p></div>
        <div><p className="text-[10px] text-[#6B7280] uppercase tracking-wide">Mensualité</p><p className="text-sm font-bold text-white">{sim.monthlyInstallment.toLocaleString('fr-FR')}</p></div>
        <div><p className="text-[10px] text-[#6B7280] uppercase tracking-wide">DTI</p><p className="text-sm font-bold text-white">{sim.newDTI.toFixed(1)}%</p></div>
      </div>
      {sim.explanation && <p className="text-xs text-[#9CA3AF] mt-3 italic border-t border-[#1e2a3a] pt-2">{sim.explanation}</p>}
    </div>
  );
}

// ── Print ──────────────────────────────────────────────────────────────────────

function printRecord(rec: ApplicationRecord, currency = 'DZD') {
  const app = rec.application;
  const res = rec.result;
  const date = new Date(rec.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });
  const decLabel = res.decision === 'APPROUVE' ? 'APPROUVÉ' : res.decision === 'CONDITIONNEL' ? 'CONDITIONNEL' : 'REFUSÉ';
  const decColor = res.decision === 'APPROUVE' ? '#10B981' : res.decision === 'CONDITIONNEL' ? '#F59E0B' : '#EF4444';

  const ratiosHtml = Object.values(res.ratioDetails || {}).map(r =>
    `<tr><td>${r.label}</td><td>${r.value.toFixed(1)}${r.unit}</td><td style="color:${r.status === 'FAVORABLE' ? '#10B981' : r.status === 'BLOQUANT' ? '#EF4444' : '#F59E0B'}">${r.status}</td><td>${r.message}</td></tr>`
  ).join('');

  const rulesHtml = (res.triggeredRules || []).map(rule =>
    `<tr><td>${rule.code}</td><td style="color:${rule.impact === 'BLOQUANT' ? '#EF4444' : rule.impact === 'PENALISANT' ? '#F59E0B' : '#10B981'}">${rule.impact}</td><td>${rule.message}</td></tr>`
  ).join('');

  const simsHtml = (res.simulations || []).map(s =>
    `<tr><td>${s.label}</td><td>${s.loanAmount.toLocaleString('fr-FR')}</td><td>${s.loanDurationMonths} mois</td><td>${s.monthlyInstallment.toLocaleString('fr-FR')}</td><td>${s.newDTI.toFixed(1)}%</td><td style="color:${s.decision === 'APPROUVE' ? '#10B981' : s.decision === 'CONDITIONNEL' ? '#F59E0B' : '#EF4444'}">${s.decision}</td></tr>`
  ).join('');

  const html = `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8">
  <title>Analyse Crédit – ${app.clientName} – ${date}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: Arial, sans-serif; font-size: 12px; color: #111; padding: 20mm 15mm; }
    h1 { font-size: 18px; margin-bottom: 4px; }
    h2 { font-size: 13px; font-weight: bold; margin: 16px 0 6px; padding: 4px 8px; background: #f0f4ff; border-left: 4px solid #2563EB; }
    .header { border-bottom: 2px solid #2563EB; padding-bottom: 10px; margin-bottom: 16px; }
    .decision-badge { display: inline-block; padding: 6px 16px; border-radius: 20px; font-weight: bold; font-size: 14px; color: white; background: ${decColor}; margin: 8px 0; }
    .grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 8px; }
    .kpi { border: 1px solid #e5e7eb; border-radius: 6px; padding: 8px; text-align: center; }
    .kpi-label { font-size: 10px; color: #6B7280; text-transform: uppercase; letter-spacing: 0.05em; }
    .kpi-value { font-size: 14px; font-weight: bold; margin-top: 2px; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 8px; font-size: 11px; }
    th { background: #f3f4f6; text-align: left; padding: 5px 8px; border-bottom: 1px solid #d1d5db; }
    td { padding: 4px 8px; border-bottom: 1px solid #f3f4f6; }
    .tag-good { color: #10B981; font-weight: bold; }
    .tag-bad  { color: #EF4444; font-weight: bold; }
    ul { margin-left: 16px; }
    li { margin-bottom: 3px; }
    .footer { margin-top: 20px; border-top: 1px solid #e5e7eb; padding-top: 8px; font-size: 10px; color: #9CA3AF; text-align: center; }
    @page { margin: 15mm; }
  </style></head><body>
  <div class="header">
    <h1>Avis d'Analyse de Crédit</h1>
    <p style="color:#6B7280">Dossier établi le ${date}</p>
    <div class="decision-badge">${decLabel}</div>
    <p style="margin-top:6px;color:#374151">${res.mainReason || ''}</p>
  </div>

  <h2>I. Demande & profil client</h2>
  <div class="grid2">
    <div class="kpi"><div class="kpi-label">Client</div><div class="kpi-value">${app.clientName}</div></div>
    <div class="kpi"><div class="kpi-label">Type de crédit</div><div class="kpi-value">${LOAN_LABELS[app.loanType] || app.loanType}</div></div>
    <div class="kpi"><div class="kpi-label">Montant demandé</div><div class="kpi-value">${app.loanAmount.toLocaleString('fr-FR')}</div></div>
    <div class="kpi"><div class="kpi-label">Durée</div><div class="kpi-value">${app.loanDurationMonths} mois</div></div>
    <div class="kpi"><div class="kpi-label">Taux appliqué</div><div class="kpi-value">${res.appliedRate?.toFixed(2) ?? '—'}%</div></div>
    <div class="kpi"><div class="kpi-label">Contrat</div><div class="kpi-value">${CONTRACT_LABELS[app.contractType] || app.contractType}</div></div>
  </div>

  <h2>II. Situation financière</h2>
  <div class="grid2">
    <div class="kpi"><div class="kpi-label">Revenu mensuel total</div><div class="kpi-value">${res.totalMonthlyIncome.toLocaleString('fr-FR')}</div></div>
    <div class="kpi"><div class="kpi-label">Mensualité</div><div class="kpi-value">${res.monthlyInstallment.toLocaleString('fr-FR')}</div></div>
    <div class="kpi"><div class="kpi-label">Coût total du crédit</div><div class="kpi-value">${res.totalAmount.toLocaleString('fr-FR')}</div></div>
    <div class="kpi"><div class="kpi-label">Dont intérêts</div><div class="kpi-value">${res.totalInterest.toLocaleString('fr-FR')}</div></div>
    <div class="kpi"><div class="kpi-label">Taux d'endettement</div><div class="kpi-value">${res.currentDTI.toFixed(1)}% → ${res.newDTI.toFixed(1)}%</div></div>
    <div class="kpi"><div class="kpi-label">Reste à vivre</div><div class="kpi-value">${res.livingRemainder.toLocaleString('fr-FR')}</div></div>
    ${res.creditScore != null ? `<div class="kpi"><div class="kpi-label">Score de crédit</div><div class="kpi-value">${res.creditScore}/100</div></div>` : ''}
  </div>

  <h2>III. Indicateurs de risque</h2>
  <table><thead><tr><th>Indicateur</th><th>Valeur</th><th>Statut</th><th>Commentaire</th></tr></thead>
  <tbody>${ratiosHtml}</tbody></table>

  <h2>IV. Analyse de la décision</h2>
  ${res.strengths?.length ? `<p style="font-weight:bold;margin-bottom:4px">Points favorables :</p><ul>${res.strengths.map(s => `<li class="tag-good">${s}</li>`).join('')}</ul>` : ''}
  ${res.weaknesses?.length ? `<p style="font-weight:bold;margin:8px 0 4px">Points d'attention :</p><ul>${res.weaknesses.map(w => `<li class="tag-bad">${w}</li>`).join('')}</ul>` : ''}
  ${res.conditions?.length ? `<p style="font-weight:bold;margin:8px 0 4px">Conditions requises :</p><ul>${res.conditions.map(c => `<li>${c}</li>`).join('')}</ul>` : ''}
  ${rulesHtml ? `<p style="font-weight:bold;margin:8px 0 4px">Règles déclenchées :</p><table><thead><tr><th>Code</th><th>Impact</th><th>Message</th></tr></thead><tbody>${rulesHtml}</tbody></table>` : ''}

  ${simsHtml ? `<h2>V. Scénarios alternatifs</h2>
  <table><thead><tr><th>Scénario</th><th>Montant</th><th>Durée</th><th>Mensualité</th><th>DTI</th><th>Décision</th></tr></thead>
  <tbody>${simsHtml}</tbody></table>` : ''}

  <h2>VI. Synthèse rédigée</h2>
  <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:16px;line-height:1.7;font-size:11px;">
    <p style="font-weight:bold;font-size:13px;color:#1e293b;margin-bottom:8px;">Avis d'analyse de crédit — ${date}</p>
    <p style="color:#475569;margin-bottom:6px;"><strong>Objet :</strong> Demande de ${LOAN_LABELS[app.loanType] || app.loanType} — ${app.clientName}</p>
    <p style="font-weight:bold;color:#334155;margin:10px 0 4px;border-bottom:1px solid #e2e8f0;padding-bottom:3px;">I. Présentation de la demande</p>
    <p style="color:#475569;">M./Mme <strong>${app.clientName}</strong>${app.age ? ', âgé(e) de <strong>' + app.age + ' ans</strong>' : ''}, ${CONTRACT_LABELS[app.contractType] || app.contractType}${app.employerSector ? ' dans le secteur ' + app.employerSector : ''}, sollicite un <strong>${(LOAN_LABELS[app.loanType] || app.loanType).toLowerCase()}</strong> d'un montant de <strong>${app.loanAmount.toLocaleString('fr-FR')} ${currency}</strong> sur <strong>${app.loanDurationMonths} mois</strong>${res.appliedRate ? ' au taux de <strong>' + res.appliedRate.toFixed(2) + '%</strong>' : ''}.${app.isExistingCustomer ? ' Client existant.' : ''}${app.hasSalaryDomiciliation ? ' Domiciliation salaire confirmée.' : ''}</p>
    <p style="font-weight:bold;color:#334155;margin:10px 0 4px;border-bottom:1px solid #e2e8f0;padding-bottom:3px;">II. Situation financière</p>
    <p style="color:#475569;">Revenu mensuel total : <strong>${res.totalMonthlyIncome.toLocaleString('fr-FR')} ${currency}</strong>. Charges actuelles : <strong>${res.totalCurrentCharges.toLocaleString('fr-FR')} ${currency}</strong>. Mensualité sollicitée : <strong>${res.monthlyInstallment.toLocaleString('fr-FR')} ${currency}</strong>. Taux d'endettement : ${res.currentDTI.toFixed(1)}% → <strong>${res.newDTI.toFixed(1)}%</strong>. Reste à vivre : <strong>${res.livingRemainder.toLocaleString('fr-FR')} ${currency}</strong>/mois.</p>
    <p style="font-weight:bold;color:#334155;margin:10px 0 4px;border-bottom:1px solid #e2e8f0;padding-bottom:3px;">III. Décision</p>
    <p style="color:#475569;">Après analyse des éléments du dossier, la décision rendue est <strong style="color:${decColor}">${decLabel}</strong>. ${res.mainReason || ''}</p>
    ${res.conditions?.length ? '<p style="margin-top:6px;color:#475569;"><strong>Conditions :</strong> ' + res.conditions.join(' ; ') + '.</p>' : ''}
    <p style="margin-top:10px;font-size:10px;color:#94a3b8;border-top:1px solid #e2e8f0;padding-top:6px;">Analyse automatisée — Stratégie : ${res.strategy} — Config v${res.configVersion}</p>
  </div>

  <div class="footer">
    Analyse automatisée — Stratégie : ${res.strategy} — Config v${res.configVersion} — ${date}
  </div>
  </body></html>`;

  const w = window.open('', '_blank');
  if (w) { w.document.write(html); w.document.close(); w.focus(); w.print(); }
}

// ── Main Component ─────────────────────────────────────────────────────────────

export default function CreditHistory() {
  const [records, setRecords] = useState<ApplicationRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [filterDecision, setFilterDecision] = useState<'ALL' | 'APPROUVE' | 'CONDITIONNEL' | 'REFUSE'>('ALL');
  const [currency, setCurrency] = useState('DZD');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    apiClient.get<ApplicationRecord[]>('/credit-policy/applications')
      .then(setRecords)
      .catch(() => setError("Impossible de charger l'historique."))
      .finally(() => setLoading(false));
    apiClient.get<any>('/credit-policy/config')
      .then(cfg => { if (cfg?.currency) setCurrency(cfg.currency); })
      .catch(() => {});
  }, []);

  const handleCopy = useCallback((id: string, text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    });
  }, []);

  const filtered = records.filter(r => {
    const matchSearch = !search || r.application?.clientName?.toLowerCase().includes(search.toLowerCase());
    const matchDecision = filterDecision === 'ALL' || r.result?.decision === filterDecision;
    return matchSearch && matchDecision;
  });

  if (loading) return (
    <div className="flex items-center justify-center py-16">
      <div className="flex items-center gap-3 text-[#CBD5E1]">
        <svg className="animate-spin h-6 w-6 text-[#2563EB]" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
        Chargement de l'historique…
      </div>
    </div>
  );

  if (error) return <div className="text-center py-12"><p className="text-red-400 text-sm">{error}</p></div>;

  return (
    <div className="space-y-5">
      {/* Filtres */}
      <div className="flex flex-col sm:flex-row gap-3">
        <input
          type="text"
          placeholder="Rechercher par nom de client…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="flex-1 px-4 py-2.5 bg-[#0d1226] border border-[#2563EB]/30 rounded-xl text-white placeholder-[#4B5563] text-sm focus:outline-none focus:border-[#2563EB]/70"
        />
        <div className="flex gap-2 flex-wrap">
          {(['ALL', 'APPROUVE', 'CONDITIONNEL', 'REFUSE'] as const).map(d => {
            const cfg = d === 'ALL' ? null : DECISION_CFG[d];
            return (
              <button key={d} onClick={() => setFilterDecision(d)}
                className={`px-3 py-2 rounded-xl text-xs font-bold transition-all border ${filterDecision === d ? (d === 'ALL' ? 'bg-[#2563EB]/30 border-[#2563EB]/60 text-white' : `${cfg!.bg} ${cfg!.text}`) : 'bg-white/5 border-white/10 text-[#6B7280] hover:bg-white/10'}`}>
                {d === 'ALL' ? 'Tous' : cfg!.label}
              </button>
            );
          })}
        </div>
      </div>

      <p className="text-xs text-[#6B7280]">{filtered.length} analyse{filtered.length > 1 ? 's' : ''} archivée{filtered.length > 1 ? 's' : ''}{records.length !== filtered.length && ` sur ${records.length}`}</p>

      {filtered.length === 0 ? (
        <div className="text-center py-16 bg-[#111827]/50 rounded-2xl border border-[#2563EB]/10">
          <p className="text-4xl mb-3">📂</p>
          <p className="text-[#CBD5E1] font-semibold">Aucune analyse trouvée</p>
          <p className="text-[#6B7280] text-sm mt-1">Les analyses réalisées apparaîtront ici automatiquement.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(rec => {
            const d = (rec.result?.decision ?? 'REFUSE') as keyof typeof DECISION_CFG;
            const cfg = DECISION_CFG[d] ?? DECISION_CFG.REFUSE;
            const isOpen = expanded === rec.id;
            const app = rec.application;
            const res = rec.result;
            const date = new Date(rec.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
            const time = new Date(rec.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

            return (
              <div key={rec.id} className={`rounded-2xl border ${cfg.bg} overflow-hidden`}>
                {/* Header */}
                <div className="flex items-center gap-4 p-4">
                  <button onClick={() => setExpanded(isOpen ? null : rec.id)} className="flex-1 flex items-center gap-4 text-left">
                    <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${cfg.dot}`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-bold text-white">{app?.clientName || '—'}</span>
                        <span className="text-xs text-[#6B7280] bg-white/5 px-2 py-0.5 rounded-full">{LOAN_LABELS[app?.loanType] || app?.loanType}</span>
                      </div>
                      <div className="flex items-center gap-2 mt-0.5 text-xs text-[#6B7280]">
                        <span>{app?.loanAmount?.toLocaleString('fr-FR')}</span>
                        <span>·</span><span>{app?.loanDurationMonths} mois</span>
                        <span>·</span><span>{date} à {time}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      <div className="text-right hidden sm:block">
                        <p className="text-[10px] text-[#6B7280]">Mensualité</p>
                        <p className="text-sm font-bold text-white">{res?.monthlyInstallment?.toLocaleString('fr-FR')}</p>
                      </div>
                      <div className="text-right hidden sm:block">
                        <p className="text-[10px] text-[#6B7280]">DTI</p>
                        <p className="text-sm font-bold text-white">{res?.newDTI?.toFixed(1)}%</p>
                      </div>
                      <span className={`text-xs font-bold px-3 py-1 rounded-full border ${cfg.badge}`}>{cfg.label}</span>
                      <svg className={`w-4 h-4 text-[#6B7280] transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </button>
                  {/* Bouton imprimer */}
                  <button
                    onClick={() => printRecord(rec, currency)}
                    title="Imprimer / Exporter PDF"
                    className="flex-shrink-0 p-2 bg-white/5 hover:bg-white/15 border border-white/10 rounded-xl text-[#CBD5E1] hover:text-white transition-all"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                    </svg>
                  </button>
                </div>

                {/* Détail complet */}
                {isOpen && res && (
                  <div className="border-t border-white/5 p-4 space-y-5">

                    {/* Décision + raison */}
                    <div className="flex flex-col sm:flex-row items-start gap-4 p-4 bg-[#0d1226]/60 rounded-xl border border-white/5">
                      <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r border ${cfg.badge} flex-shrink-0`}>
                        <span>{cfg.icon}</span>
                        <span className={`font-black tracking-widest text-sm ${cfg.text}`}>{cfg.label.toUpperCase()}</span>
                      </div>
                      <div>
                        <p className="text-[#CBD5E1] text-sm leading-relaxed">{res.mainReason}</p>
                        <p className="text-xs text-[#6B7280] mt-1">Stratégie : {res.strategy} · Config v{res.configVersion}</p>
                      </div>
                    </div>

                    {/* KPIs */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {[
                        { label: 'Mensualité',           value: res.monthlyInstallment.toLocaleString('fr-FR'),  sub: `Taux : ${res.appliedRate?.toFixed(2) ?? '—'}%` },
                        { label: 'Coût total',           value: res.totalAmount.toLocaleString('fr-FR'),         sub: `Intérêts : ${res.totalInterest.toLocaleString('fr-FR')}` },
                        { label: "Taux d'endettement",   value: `${res.newDTI.toFixed(1)}%`,                     sub: `Avant : ${res.currentDTI.toFixed(1)}%` },
                        { label: 'Reste à vivre',        value: res.livingRemainder.toLocaleString('fr-FR'),     sub: `Revenu : ${res.totalMonthlyIncome.toLocaleString('fr-FR')}` },
                      ].map(kpi => (
                        <div key={kpi.label} className="bg-[#0d1226] rounded-xl p-3 text-center border border-[#2563EB]/15">
                          <p className="text-[10px] text-[#6B7280] uppercase tracking-wide mb-1">{kpi.label}</p>
                          <p className="text-base font-black text-white">{kpi.value}</p>
                          <p className="text-[10px] text-[#4B5563] mt-0.5">{kpi.sub}</p>
                        </div>
                      ))}
                    </div>

                    {/* Score */}
                    {res.creditScore != null && (
                      <div className="bg-[#0d1226] rounded-xl p-4 border border-[#7C3AED]/20">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-bold text-white">Score de crédit</span>
                          <span className="text-xl font-black text-[#7C3AED]">{res.creditScore}/100</span>
                        </div>
                        <div className="w-full bg-[#1a2035] rounded-full h-3">
                          <div className="h-3 rounded-full bg-gradient-to-r from-[#7C3AED] to-[#2563EB]" style={{ width: `${res.creditScore}%` }} />
                        </div>
                      </div>
                    )}

                    {/* Ratios */}
                    {Object.keys(res.ratioDetails || {}).length > 0 && (
                      <div>
                        <p className="text-xs font-bold text-[#6B7280] uppercase tracking-wide mb-3">Ratios calculés</p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {Object.values(res.ratioDetails).map((ratio, i) => <RatioGauge key={i} ratio={ratio} />)}
                        </div>
                      </div>
                    )}

                    {/* Points forts / faibles / conditions */}
                    {(res.strengths?.length > 0 || res.weaknesses?.length > 0 || res.conditions?.length > 0) && (
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        {res.strengths?.length > 0 && (
                          <div className="bg-emerald-900/15 rounded-xl p-4 border border-emerald-500/25">
                            <p className="text-xs font-bold text-emerald-400 uppercase tracking-wide mb-2">Points forts</p>
                            <ul className="space-y-1">{res.strengths.map((s, i) => <li key={i} className="text-xs text-[#CBD5E1] flex gap-2"><span className="text-emerald-400 flex-shrink-0">✓</span>{s}</li>)}</ul>
                          </div>
                        )}
                        {res.weaknesses?.length > 0 && (
                          <div className="bg-red-900/15 rounded-xl p-4 border border-red-500/25">
                            <p className="text-xs font-bold text-red-400 uppercase tracking-wide mb-2">Points d'attention</p>
                            <ul className="space-y-1">{res.weaknesses.map((w, i) => <li key={i} className="text-xs text-[#CBD5E1] flex gap-2"><span className="text-red-400 flex-shrink-0">✗</span>{w}</li>)}</ul>
                          </div>
                        )}
                        {res.conditions?.length > 0 && (
                          <div className="bg-amber-900/15 rounded-xl p-4 border border-amber-500/25">
                            <p className="text-xs font-bold text-amber-400 uppercase tracking-wide mb-2">Conditions</p>
                            <ul className="space-y-1">{res.conditions.map((c, i) => <li key={i} className="text-xs text-[#CBD5E1] flex gap-2"><span className="text-amber-400 flex-shrink-0">→</span>{c}</li>)}</ul>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Règles déclenchées */}
                    {res.triggeredRules?.length > 0 && (
                      <div>
                        <p className="text-xs font-bold text-[#6B7280] uppercase tracking-wide mb-2">Règles déclenchées</p>
                        <div className="space-y-2">
                          {res.triggeredRules.map((rule: TriggeredRule, i) => {
                            const rc = rule.impact === 'BLOQUANT' ? { bg: 'bg-red-500/10 border-red-500/30', tag: 'bg-red-500/20 text-red-300' }
                              : rule.impact === 'PENALISANT' ? { bg: 'bg-amber-500/10 border-amber-500/30', tag: 'bg-amber-500/20 text-amber-300' }
                              : { bg: 'bg-emerald-500/10 border-emerald-500/30', tag: 'bg-emerald-500/20 text-emerald-300' };
                            return (
                              <div key={i} className={`flex items-start gap-3 p-3 rounded-lg border ${rc.bg}`}>
                                <span className={`text-xs font-bold px-2 py-0.5 rounded-full flex-shrink-0 ${rc.tag}`}>{rule.impact}</span>
                                <div><p className="text-xs font-mono text-[#9CA3AF]">{rule.code}</p><p className="text-sm text-[#CBD5E1]">{rule.message}</p></div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Simulations */}
                    {res.simulations?.length > 0 && (
                      <div>
                        <p className="text-xs font-bold text-[#6B7280] uppercase tracking-wide mb-3">Scénarios alternatifs</p>
                        <div className="grid grid-cols-1 gap-3">
                          {res.simulations.map((sim: SimulationScenario) => <SimCard key={sim.id} sim={sim} />)}
                        </div>
                      </div>
                    )}

                    {/* Texte du dossier */}
                    {(() => {
                      const dossierText = buildDossierText(app, res, currency);
                      const lines = dossierText.split('\n');

                      const renderLine = (line: string, i: number) => {
                        const t = line.trim();
                        if (!t) return <div key={i} className="h-2" />;
                        if (t.startsWith('AVIS D ANALYSE'))
                          return <p key={i} className="text-sm font-black text-[#60A5FA] tracking-wide pb-2 mb-1 border-b border-[#7C3AED]/20">{t}</p>;
                        if (t.startsWith('Objet :'))
                          return <p key={i} className="text-xs text-[#A78BFA] font-semibold">{t}</p>;
                        if (/^(I{1,3}V?|IV)\.\s/.test(t))
                          return <div key={i} className="flex items-center gap-2 mt-2"><div className="w-1 h-5 rounded-full bg-gradient-to-b from-[#2563EB] to-[#7C3AED]" /><p className="text-xs font-bold text-white uppercase tracking-wide">{t}</p></div>;
                        if (t.startsWith('- ')) {
                          const content = t.substring(2);
                          const sMatch = content.match(/\((favorable|a surveiller|bloquant|non applicable)\)\s*$/i);
                          const dotColor = sMatch ? (sMatch[1].toLowerCase() === 'favorable' ? 'bg-emerald-400' : sMatch[1].toLowerCase() === 'bloquant' ? 'bg-red-400' : sMatch[1].toLowerCase() === 'a surveiller' ? 'bg-amber-400' : 'bg-[#6B7280]') : 'bg-[#6B7280]';
                          return <div key={i} className="flex items-start gap-2 pl-3"><span className={`mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0 ${dotColor}`} /><p className="text-xs text-[#CBD5E1] leading-relaxed">{content}</p></div>;
                        }
                        if (t.startsWith('Points favorables'))
                          return <p key={i} className="text-xs font-semibold text-emerald-400">{t}</p>;
                        if (t.startsWith('Points d attention'))
                          return <p key={i} className="text-xs font-semibold text-red-400">{t}</p>;
                        if (t.startsWith('Conditions requises'))
                          return <p key={i} className="text-xs font-semibold text-amber-400">{t}</p>;
                        if (t.startsWith('Analyse realisee'))
                          return <p key={i} className="text-[10px] text-[#4B5563] italic pt-2 mt-1 border-t border-white/5">{t}</p>;
                        return <p key={i} className="text-xs text-[#CBD5E1] leading-relaxed pl-1">{t}</p>;
                      };

                      return (
                        <div className="bg-[#0a0f1e] rounded-xl border border-[#7C3AED]/30 overflow-hidden">
                          <div className="flex items-center justify-between px-4 py-3 border-b border-[#7C3AED]/20 bg-[#7C3AED]/10">
                            <div className="flex items-center gap-2">
                              <span className="text-sm">📄</span>
                              <p className="text-sm font-bold text-[#C4B5FD]">Texte du dossier</p>
                            </div>
                            <button
                              onClick={() => handleCopy(rec.id, dossierText)}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#7C3AED]/20 hover:bg-[#7C3AED]/40 border border-[#7C3AED]/30 text-[#C4B5FD] text-xs font-semibold transition-all"
                            >
                              {copiedId === rec.id ? (
                                <><svg className="w-3.5 h-3.5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg><span className="text-emerald-400">Copié !</span></>
                              ) : (
                                <><svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg><span>Copier</span></>
                              )}
                            </button>
                          </div>
                          <div className="px-4 py-4 space-y-1 max-h-96 overflow-y-auto">
                            {lines.map((line, i) => renderLine(line, i))}
                          </div>
                        </div>
                      );
                    })()}

                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
