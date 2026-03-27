'use client';

import { useState, useEffect, useCallback } from 'react';
import { apiClient } from '@/lib/api/client';
import type {
  PMEApplicationInput, PMEDecisionResult, PMECalculatedIndicators,
  PMERatioDetail, PMETriggeredRule, PMESimulationScenario, PMEApplicationRecord,
} from '@/types/credit-pme-policy';

// ── Constants ──────────────────────────────────────────────────────────────────

const DECISION_CFG = {
  APPROUVE:     { bg: 'bg-emerald-500/15 border-emerald-500/40', text: 'text-emerald-300', dot: 'bg-emerald-400', label: 'Approuvé',     badge: 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300', icon: '✅' },
  CONDITIONNEL: { bg: 'bg-amber-500/15 border-amber-500/40',     text: 'text-amber-300',   dot: 'bg-amber-400',   label: 'Conditionnel', badge: 'bg-amber-500/20 border-amber-500/50 text-amber-300',     icon: '⚠️' },
  REFUSE:       { bg: 'bg-red-500/15 border-red-500/40',         text: 'text-red-300',     dot: 'bg-red-400',     label: 'Refusé',       badge: 'bg-red-500/20 border-red-500/50 text-red-300',           icon: '❌' },
};

const TYPE_LABELS: Record<string, string> = { INVESTISSEMENT: 'Investissement', TRESORERIE: 'Trésorerie', LIGNE_FONCTIONNEMENT: 'Ligne de fonctionnement', AUTRE: 'Autre' };

// ── Dossier text builder ───────────────────────────────────────────────────────

function buildPMEDossierText(app: PMEApplicationInput, res: PMEDecisionResult, currency: string): string {
  const ind = res.indicators;
  const decLbl = res.decision === 'APPROUVE' ? 'FAVORABLE' : res.decision === 'CONDITIONNEL' ? 'CONDITIONNEL' : 'DEFAVORABLE';
  const dateStr = new Date(res.analyzed_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });

  const lines: string[] = [
    `AVIS D ANALYSE DE CREDIT PME/PMI — ${dateStr}`,
    '',
    `Objet : Demande de credit ${TYPE_LABELS[app.type_credit] || app.type_credit} — ${app.raison_sociale}`,
    '',
    'I. PRESENTATION DE L ENTREPRISE',
    `La societe ${app.raison_sociale}${app.nom_commercial ? ' (' + app.nom_commercial + ')' : ''}, immatriculee sous la forme juridique ${app.forme_juridique}, a ete creee en ${app.annee_creation} (anciennete : ${(ind?.company_age_years ?? 0).toFixed(0)} ans).${app.secteur ? ' Elle evolue dans le secteur ' + app.secteur + (app.sous_secteur ? ' / ' + app.sous_secteur : '') + '.' : ''}${app.ville ? ' Siege : ' + app.ville + (app.region ? ', ' + app.region : '') + '.' : ''}`,
    `Effectif : ${app.nombre_employes} employe(s). Taille : ${app.taille}.${app.zone_activite ? ' Zone d activite : ' + app.zone_activite + '.' : ''}`,
    `Dirigeant : ${app.nom_dirigeant}${app.age_dirigeant ? ', ' + app.age_dirigeant + ' ans' : ''}${app.fonction_dirigeant ? ', ' + app.fonction_dirigeant : ''}. Experience sectorielle : ${app.experience_secteur_ans} ans. Anciennete direction : ${app.anciennete_direction_ans} ans.${app.equipe_structuree ? ' Equipe de gestion structuree.' : ''}${app.gouvernance_formelle ? ' Gouvernance formelle.' : ''}`,
    '',
    'II. SITUATION FINANCIERE',
    ...(ind ? [
      `Chiffre d affaires N : ${ind.ca_n != null ? ind.ca_n.toLocaleString('fr-FR') + ' ' + currency : 'non renseigne'}${ind.ca_n1 != null ? ' (N-1 : ' + ind.ca_n1.toLocaleString('fr-FR') + ' ' + currency + ')' : ''}.${ind.ca_growth_pct != null ? ' Croissance CA : ' + (ind.ca_growth_pct > 0 ? '+' : '') + ind.ca_growth_pct.toFixed(1) + '%.' : ''}`,
      `Resultat net N : ${ind.resultat_net_n != null ? ind.resultat_net_n.toLocaleString('fr-FR') + ' ' + currency : 'non renseigne'}.${ind.ebitda_n != null ? ' EBITDA N : ' + ind.ebitda_n.toLocaleString('fr-FR') + ' ' + currency + (ind.ebitda_margin_pct != null ? ' (marge : ' + ind.ebitda_margin_pct.toFixed(1) + '%)' : '') + '.' : ''}`,
      `Fonds propres N : ${ind.fonds_propres_n != null ? ind.fonds_propres_n.toLocaleString('fr-FR') + ' ' + currency : 'non renseigne'}. Endettement total N : ${ind.endettement_n != null ? ind.endettement_n.toLocaleString('fr-FR') + ' ' + currency : 'non renseigne'}.${ind.debt_equity_ratio != null ? ' Ratio D/E : ' + ind.debt_equity_ratio.toFixed(2) + 'x.' : ''}`,
      `Tresorerie N : ${ind.tresorerie_n != null ? ind.tresorerie_n.toLocaleString('fr-FR') + ' ' + currency : 'non renseignee'}.${ind.treasury_coverage_months != null ? ' Couverture tresorerie : ' + ind.treasury_coverage_months.toFixed(1) + ' mois de service de dette.' : ''}`,
      `Completude financiere : ${(ind.financial_completeness_score ?? 0).toFixed(0)}%. Completude documentaire : ${(ind.document_completeness_score ?? 0).toFixed(0)}%. Score gouvernance : ${(ind.governance_score ?? 0).toFixed(0)}/100.`,
    ] : ['Donnees financieres non disponibles.']),
    '',
    'III. DEMANDE DE CREDIT',
    `Montant sollicite : ${app.montant_demande.toLocaleString('fr-FR')} ${currency}. Type : ${TYPE_LABELS[app.type_credit] || app.type_credit}. Duree : ${app.duree_mois} mois. Periodicite : ${app.periodicite.toLowerCase()}.${app.taux_annuel_pct ? ' Taux annuel : ' + app.taux_annuel_pct.toFixed(2) + '%.' : ''}${app.periode_grace_mois > 0 ? ' Periode de grace : ' + app.periode_grace_mois + ' mois.' : ''}`,
    `${app.apport_personnel ? 'Apport personnel : ' + app.apport_personnel.toLocaleString('fr-FR') + ' ' + currency + '. ' : ''}Source de remboursement : ${app.source_remboursement}.`,
    ...(ind?.nouvelle_mensualite != null ? [`Mensualite estimee : ${ind.nouvelle_mensualite.toLocaleString('fr-FR')} ${currency}.${ind.dscr != null ? ' DSCR : ' + ind.dscr.toFixed(2) + 'x.' : ''}`] : []),
    ...(app.garanties_prevues ? [
      `Garanties : ${app.type_garantie || 'type non precise'}. ${app.description_garantie || ''}${app.valeur_estimee_garantie ? ' Valeur estimee : ' + app.valeur_estimee_garantie.toLocaleString('fr-FR') + ' ' + currency + '.' : ''}${app.valeur_retenue_garantie ? ' Valeur retenue : ' + app.valeur_retenue_garantie.toLocaleString('fr-FR') + ' ' + currency + '.' : ''}${ind?.guarantee_coverage_pct != null ? ' Couverture : ' + ind.guarantee_coverage_pct.toFixed(0) + '%.' : ''}`,
    ] : ['Aucune garantie prevue.']),
    '',
    'IV. INDICATEURS DE RISQUE',
    ...Object.values(res.ratio_details || {}).map((rd) => `- ${rd.label} : ${rd.value.toFixed(2)}${rd.unit} (${rd.status === 'FAVORABLE' ? 'favorable' : rd.status === 'CONDITIONNEL' ? 'a surveiller' : rd.status === 'BLOQUANT' ? 'bloquant' : 'non applicable'})`),
    ...(res.credit_score != null ? [`- Score global PME : ${res.credit_score.toFixed(0)}/100`] : []),
    '',
    ...(res.strengths.length > 0 ? ['Points favorables : ' + res.strengths.join(' ; ') + '.'] : []),
    ...(res.weaknesses.length > 0 ? ['Points d attention : ' + res.weaknesses.join(' ; ') + '.'] : []),
    ...(res.identified_risks.length > 0 ? ['Risques identifies : ' + res.identified_risks.join(' ; ') + '.'] : []),
    '',
    'V. BANCARISATION',
    `${app.client_existant ? 'Client existant de l etablissement.' : 'Nouveau client.'} Anciennete relation : ${app.anciennete_relation_bancaire_mois} mois.${app.flux_domicilies ? ' Flux domicilies.' : ''}${app.comportement_remboursement ? ' Comportement remboursement : ' + app.comportement_remboursement + '.' : ''} Niveau incidents : ${app.niveau_incidents_bancaires}/3. Nombre de banques : ${app.nombre_banques}.`,
    '',
    'VI. DECISION',
    `Apres analyse de l ensemble des elements du dossier, la decision rendue est : ${decLbl}.`,
    res.main_reason,
    ...(res.conditions.length > 0 ? ['', 'Conditions requises :', ...res.conditions.map(c => '- ' + c)] : []),
    ...(res.missing_documents.length > 0 ? ['', 'Documents manquants :', ...res.missing_documents.map(d => '- ' + d)] : []),
    '',
    `Analyse realisee par le moteur de decision automatise — Strategie : ${res.strategy} — Config v${res.config_version}`,
  ];
  return lines.join('\n');
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function RatioGauge({ ratio }: { ratio: PMERatioDetail }) {
  const cfg = {
    FAVORABLE:    { bar: 'bg-emerald-500', text: 'text-emerald-300' },
    CONDITIONNEL: { bar: 'bg-amber-500',   text: 'text-amber-300' },
    BLOQUANT:     { bar: 'bg-red-500',     text: 'text-red-300' },
    NA:           { bar: 'bg-[#374151]',   text: 'text-[#6B7280]' },
  }[ratio.status] ?? { bar: 'bg-[#374151]', text: 'text-[#6B7280]' };
  const max = ratio.threshold_rejection ?? (ratio.value * 1.5 || 100);
  const pct = max > 0 ? Math.min(100, (Math.abs(ratio.value) / Math.abs(max)) * 100) : 0;
  return (
    <div className="bg-[#0d1226] rounded-xl p-4 border border-[#2563EB]/20">
      <div className="flex items-start justify-between mb-2">
        <div><p className="text-sm font-bold text-white">{ratio.label}</p><p className="text-xs text-[#6B7280] mt-0.5">{ratio.message}</p></div>
        <div className="text-right flex-shrink-0 ml-2">
          <p className="text-lg font-black text-white">{ratio.value.toFixed(2)}<span className="text-sm font-normal text-[#6B7280]">{ratio.unit}</span></p>
          <span className={`text-xs font-bold ${cfg.text}`}>{ratio.status}</span>
        </div>
      </div>
      <div className="w-full bg-[#1a2035] rounded-full h-2 mt-2"><div className={`h-2 rounded-full ${cfg.bar}`} style={{ width: `${pct}%` }} /></div>
    </div>
  );
}

function SimCard({ sim, currency }: { sim: PMESimulationScenario; currency: string }) {
  const cfg = {
    APPROUVE:     { border: 'border-emerald-500/40', badge: 'bg-emerald-500/20 text-emerald-300' },
    CONDITIONNEL: { border: 'border-amber-500/40',   badge: 'bg-amber-500/20 text-amber-300' },
    REFUSE:       { border: 'border-red-500/40',     badge: 'bg-red-500/20 text-red-300' },
  }[sim.decision] ?? { border: 'border-[#374151]', badge: 'bg-[#374151] text-[#9CA3AF]' };
  return (
    <div className={`bg-[#0d1226] rounded-xl p-4 border ${cfg.border}`}>
      <div className="flex items-start justify-between mb-3">
        <div><p className="text-sm font-bold text-white">{sim.label}</p><p className="text-xs text-[#6B7280] mt-0.5">{sim.description}</p></div>
        <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${cfg.badge} flex-shrink-0 ml-2`}>{sim.decision === 'APPROUVE' ? 'Approuvé' : sim.decision === 'CONDITIONNEL' ? 'Conditionnel' : 'Refusé'}</span>
      </div>
      <div className="grid grid-cols-3 gap-3 text-center">
        <div><p className="text-[10px] text-[#6B7280] uppercase tracking-wide">Montant</p><p className="text-sm font-bold text-white">{sim.montant.toLocaleString('fr-FR')} {currency}</p></div>
        <div><p className="text-[10px] text-[#6B7280] uppercase tracking-wide">Durée</p><p className="text-sm font-bold text-white">{sim.duree_mois} mois</p></div>
        <div><p className="text-[10px] text-[#6B7280] uppercase tracking-wide">Mensualité</p><p className="text-sm font-bold text-white">{sim.mensualite.toLocaleString('fr-FR')} {currency}</p></div>
      </div>
      {sim.explication && <p className="text-xs text-[#9CA3AF] mt-3 italic border-t border-[#1e2a3a] pt-2">{sim.explication}</p>}
    </div>
  );
}

// ── Print ──────────────────────────────────────────────────────────────────────

function printPMERecord(rec: PMEApplicationRecord, currency: string) {
  const app = rec.application;
  const res = rec.result;
  const ind = res.indicators;
  const date = new Date(rec.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });
  const decLabel = res.decision === 'APPROUVE' ? 'APPROUVÉ' : res.decision === 'CONDITIONNEL' ? 'CONDITIONNEL' : 'REFUSÉ';
  const decColor = res.decision === 'APPROUVE' ? '#10B981' : res.decision === 'CONDITIONNEL' ? '#F59E0B' : '#EF4444';

  const ratiosHtml = Object.values(res.ratio_details || {}).map(r =>
    `<tr><td>${r.label}</td><td>${r.value.toFixed(2)}${r.unit}</td><td style="color:${r.status === 'FAVORABLE' ? '#10B981' : r.status === 'BLOQUANT' ? '#EF4444' : '#F59E0B'}">${r.status}</td><td>${r.message}</td></tr>`
  ).join('');

  const rulesHtml = (res.triggered_rules || []).map(rule =>
    `<tr><td>${rule.code}</td><td style="color:${rule.impact === 'BLOQUANT' ? '#EF4444' : rule.impact === 'PENALISANT' ? '#F59E0B' : '#10B981'}">${rule.impact}</td><td>${rule.section}</td><td>${rule.message}</td></tr>`
  ).join('');

  const simsHtml = (res.simulations || []).map(s =>
    `<tr><td>${s.label}</td><td>${s.montant.toLocaleString('fr-FR')}</td><td>${s.duree_mois} mois</td><td>${s.mensualite.toLocaleString('fr-FR')}</td><td style="color:${s.decision === 'APPROUVE' ? '#10B981' : s.decision === 'CONDITIONNEL' ? '#F59E0B' : '#EF4444'}">${s.decision}</td></tr>`
  ).join('');

  const fmt = (v: number | null | undefined) => v != null ? v.toLocaleString('fr-FR') : '—';

  const html = `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8">
  <title>Analyse PME – ${app.raison_sociale} – ${date}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: Arial, sans-serif; font-size: 12px; color: #111; padding: 20mm 15mm; }
    h1 { font-size: 18px; margin-bottom: 4px; }
    h2 { font-size: 13px; font-weight: bold; margin: 16px 0 6px; padding: 4px 8px; background: #f0f4ff; border-left: 4px solid #F59E0B; }
    .header { border-bottom: 2px solid #F59E0B; padding-bottom: 10px; margin-bottom: 16px; }
    .decision-badge { display: inline-block; padding: 6px 16px; border-radius: 20px; font-weight: bold; font-size: 14px; color: white; background: ${decColor}; margin: 8px 0; }
    .grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 8px; }
    .grid3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 8px; margin-bottom: 8px; }
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
    <h1>Avis d'Analyse de Crédit PME/PMI</h1>
    <p style="color:#6B7280">Dossier établi le ${date} — ${app.raison_sociale}</p>
    <div class="decision-badge">${decLabel}</div>
    <p style="margin-top:6px;color:#374151">${res.main_reason || ''}</p>
  </div>

  <h2>I. Identification de l'entreprise</h2>
  <div class="grid2">
    <div class="kpi"><div class="kpi-label">Raison sociale</div><div class="kpi-value">${app.raison_sociale}</div></div>
    <div class="kpi"><div class="kpi-label">Forme juridique</div><div class="kpi-value">${app.forme_juridique}</div></div>
    <div class="kpi"><div class="kpi-label">Secteur</div><div class="kpi-value">${app.secteur || '—'}${app.sous_secteur ? ' / ' + app.sous_secteur : ''}</div></div>
    <div class="kpi"><div class="kpi-label">Année de création</div><div class="kpi-value">${app.annee_creation} (${(ind?.company_age_years ?? 0).toFixed(0)} ans)</div></div>
    <div class="kpi"><div class="kpi-label">Taille / Effectif</div><div class="kpi-value">${app.taille} — ${app.nombre_employes} emp.</div></div>
    <div class="kpi"><div class="kpi-label">Dirigeant</div><div class="kpi-value">${app.nom_dirigeant}${app.fonction_dirigeant ? ' (' + app.fonction_dirigeant + ')' : ''}</div></div>
  </div>

  <h2>II. Indicateurs calculés</h2>
  <div class="grid3">
    <div class="kpi"><div class="kpi-label">CA N</div><div class="kpi-value">${fmt(ind?.ca_n)} ${currency}</div></div>
    <div class="kpi"><div class="kpi-label">Croissance CA</div><div class="kpi-value">${ind?.ca_growth_pct != null ? (ind.ca_growth_pct > 0 ? '+' : '') + ind.ca_growth_pct.toFixed(1) + '%' : '—'}</div></div>
    <div class="kpi"><div class="kpi-label">Résultat net N</div><div class="kpi-value">${fmt(ind?.resultat_net_n)} ${currency}</div></div>
    <div class="kpi"><div class="kpi-label">EBITDA N</div><div class="kpi-value">${fmt(ind?.ebitda_n)} ${currency}</div></div>
    <div class="kpi"><div class="kpi-label">Fonds propres</div><div class="kpi-value">${fmt(ind?.fonds_propres_n)} ${currency}</div></div>
    <div class="kpi"><div class="kpi-label">Endettement</div><div class="kpi-value">${fmt(ind?.endettement_n)} ${currency}</div></div>
    <div class="kpi"><div class="kpi-label">DSCR</div><div class="kpi-value">${ind?.dscr != null ? ind.dscr.toFixed(2) + 'x' : '—'}</div></div>
    <div class="kpi"><div class="kpi-label">D/E Ratio</div><div class="kpi-value">${ind?.debt_equity_ratio != null ? ind.debt_equity_ratio.toFixed(2) + 'x' : '—'}</div></div>
    <div class="kpi"><div class="kpi-label">Mensualité</div><div class="kpi-value">${fmt(ind?.nouvelle_mensualite)} ${currency}</div></div>
    <div class="kpi"><div class="kpi-label">Trésorerie</div><div class="kpi-value">${fmt(ind?.tresorerie_n)} ${currency}</div></div>
    <div class="kpi"><div class="kpi-label">Couv. garantie</div><div class="kpi-value">${ind?.guarantee_coverage_pct != null ? ind.guarantee_coverage_pct.toFixed(0) + '%' : '—'}</div></div>
    ${res.credit_score != null ? `<div class="kpi"><div class="kpi-label">Score PME</div><div class="kpi-value" style="color:#7C3AED">${res.credit_score.toFixed(0)}/100</div></div>` : ''}
  </div>

  <h2>III. Demande de crédit</h2>
  <div class="grid2">
    <div class="kpi"><div class="kpi-label">Montant demandé</div><div class="kpi-value">${app.montant_demande.toLocaleString('fr-FR')} ${currency}</div></div>
    <div class="kpi"><div class="kpi-label">Type</div><div class="kpi-value">${TYPE_LABELS[app.type_credit] || app.type_credit}</div></div>
    <div class="kpi"><div class="kpi-label">Durée</div><div class="kpi-value">${app.duree_mois} mois</div></div>
    <div class="kpi"><div class="kpi-label">Périodicité</div><div class="kpi-value">${app.periodicite}</div></div>
    ${app.apport_personnel ? `<div class="kpi"><div class="kpi-label">Apport personnel</div><div class="kpi-value">${app.apport_personnel.toLocaleString('fr-FR')} ${currency}</div></div>` : ''}
    ${app.garanties_prevues ? `<div class="kpi"><div class="kpi-label">Garantie</div><div class="kpi-value">${app.type_garantie || '—'}</div></div>` : ''}
  </div>

  <h2>IV. Ratios financiers</h2>
  ${ratiosHtml ? `<table><thead><tr><th>Indicateur</th><th>Valeur</th><th>Statut</th><th>Commentaire</th></tr></thead><tbody>${ratiosHtml}</tbody></table>` : '<p>Aucun ratio calculé.</p>'}

  <h2>V. Analyse de la décision</h2>
  ${res.strengths?.length ? `<p style="font-weight:bold;margin-bottom:4px">Points favorables :</p><ul>${res.strengths.map(s => `<li class="tag-good">${s}</li>`).join('')}</ul>` : ''}
  ${res.weaknesses?.length ? `<p style="font-weight:bold;margin:8px 0 4px">Points d'attention :</p><ul>${res.weaknesses.map(w => `<li class="tag-bad">${w}</li>`).join('')}</ul>` : ''}
  ${res.identified_risks?.length ? `<p style="font-weight:bold;margin:8px 0 4px">Risques identifiés :</p><ul>${res.identified_risks.map(r => `<li class="tag-bad">${r}</li>`).join('')}</ul>` : ''}
  ${res.conditions?.length ? `<p style="font-weight:bold;margin:8px 0 4px">Conditions requises :</p><ul>${res.conditions.map(c => `<li>${c}</li>`).join('')}</ul>` : ''}
  ${res.missing_documents?.length ? `<p style="font-weight:bold;margin:8px 0 4px">Documents manquants :</p><ul>${res.missing_documents.map(d => `<li>${d}</li>`).join('')}</ul>` : ''}
  ${rulesHtml ? `<p style="font-weight:bold;margin:8px 0 4px">Règles déclenchées :</p><table><thead><tr><th>Code</th><th>Impact</th><th>Section</th><th>Message</th></tr></thead><tbody>${rulesHtml}</tbody></table>` : ''}

  ${simsHtml ? `<h2>VI. Scénarios alternatifs</h2>
  <table><thead><tr><th>Scénario</th><th>Montant</th><th>Durée</th><th>Mensualité</th><th>Décision</th></tr></thead>
  <tbody>${simsHtml}</tbody></table>` : ''}

  <h2>VII. Synthèse rédigée</h2>
  <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:16px;line-height:1.7;font-size:11px;white-space:pre-wrap;">${buildPMEDossierText(app, res, currency)}</div>

  <div class="footer">
    Analyse automatisée — Stratégie : ${res.strategy} — Config v${res.config_version} — ${date}
  </div>
  </body></html>`;

  const w = window.open('', '_blank');
  if (w) { w.document.write(html); w.document.close(); w.focus(); w.print(); }
}

// ── Main Component ─────────────────────────────────────────────────────────────

export default function CreditPMEHistory() {
  const [records, setRecords] = useState<PMEApplicationRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [filterDecision, setFilterDecision] = useState<'ALL' | 'APPROUVE' | 'CONDITIONNEL' | 'REFUSE'>('ALL');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    apiClient.get<PMEApplicationRecord[]>('/credit-policy/pme/applications')
      .then(setRecords)
      .catch(() => setError("Impossible de charger l'historique PME."))
      .finally(() => setLoading(false));
  }, []);

  const handleCopy = useCallback((id: string, text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    });
  }, []);

  const filtered = records.filter(r => {
    const matchSearch = !search || r.application?.raison_sociale?.toLowerCase().includes(search.toLowerCase());
    const matchDecision = filterDecision === 'ALL' || r.result?.decision === filterDecision;
    return matchSearch && matchDecision;
  });

  if (loading) return (
    <div className="flex items-center justify-center py-16">
      <div className="flex items-center gap-3 text-[#CBD5E1]">
        <svg className="animate-spin h-6 w-6 text-[#F59E0B]" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
        Chargement de l'historique PME…
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
          placeholder="Rechercher par raison sociale…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="flex-1 px-4 py-2.5 bg-[#0d1226] border border-[#F59E0B]/30 rounded-xl text-white placeholder-[#4B5563] text-sm focus:outline-none focus:border-[#F59E0B]/70"
        />
        <div className="flex gap-2 flex-wrap">
          {(['ALL', 'APPROUVE', 'CONDITIONNEL', 'REFUSE'] as const).map(d => {
            const cfg = d === 'ALL' ? null : DECISION_CFG[d];
            return (
              <button key={d} onClick={() => setFilterDecision(d)}
                className={`px-3 py-2 rounded-xl text-xs font-bold transition-all border ${filterDecision === d ? (d === 'ALL' ? 'bg-[#F59E0B]/30 border-[#F59E0B]/60 text-white' : `${cfg!.bg} ${cfg!.text}`) : 'bg-white/5 border-white/10 text-[#6B7280] hover:bg-white/10'}`}>
                {d === 'ALL' ? 'Tous' : cfg!.label}
              </button>
            );
          })}
        </div>
      </div>

      <p className="text-xs text-[#6B7280]">{filtered.length} analyse{filtered.length > 1 ? 's' : ''} PME archivée{filtered.length > 1 ? 's' : ''}{records.length !== filtered.length && ` sur ${records.length}`}</p>

      {filtered.length === 0 ? (
        <div className="text-center py-16 bg-[#111827]/50 rounded-2xl border border-[#F59E0B]/10">
          <p className="text-4xl mb-3">🏢</p>
          <p className="text-[#CBD5E1] font-semibold">Aucune analyse PME trouvée</p>
          <p className="text-[#6B7280] text-sm mt-1">Les analyses PME/PMI réalisées apparaîtront ici automatiquement.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(rec => {
            const d = (rec.result?.decision ?? 'REFUSE') as keyof typeof DECISION_CFG;
            const cfg = DECISION_CFG[d] ?? DECISION_CFG.REFUSE;
            const isOpen = expanded === rec.id;
            const app = rec.application;
            const res = rec.result;
            const ind = res?.indicators;
            const currency = res?.currency || 'XOF';
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
                        <span className="text-sm font-bold text-white">{app?.raison_sociale || '—'}</span>
                        <span className="text-xs text-[#6B7280] bg-white/5 px-2 py-0.5 rounded-full">{TYPE_LABELS[app?.type_credit] || app?.type_credit}</span>
                      </div>
                      <div className="flex items-center gap-2 mt-0.5 text-xs text-[#6B7280]">
                        <span>{app?.montant_demande?.toLocaleString('fr-FR')} {currency}</span>
                        <span>·</span><span>{app?.duree_mois} mois</span>
                        <span>·</span><span>{date} à {time}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      <div className="text-right hidden sm:block">
                        <p className="text-[10px] text-[#6B7280]">Mensualité</p>
                        <p className="text-sm font-bold text-white">{ind?.nouvelle_mensualite?.toLocaleString('fr-FR') ?? '—'}</p>
                      </div>
                      <div className="text-right hidden sm:block">
                        <p className="text-[10px] text-[#6B7280]">DSCR</p>
                        <p className="text-sm font-bold text-white">{ind?.dscr != null ? ind.dscr.toFixed(2) + 'x' : '—'}</p>
                      </div>
                      <span className={`text-xs font-bold px-3 py-1 rounded-full border ${cfg.badge}`}>{cfg.label}</span>
                      <svg className={`w-4 h-4 text-[#6B7280] transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </button>
                  {/* Bouton imprimer */}
                  <button
                    onClick={() => printPMERecord(rec, currency)}
                    title="Imprimer / Exporter PDF"
                    className="flex-shrink-0 p-2 bg-white/5 hover:bg-white/15 border border-white/10 rounded-xl text-[#CBD5E1] hover:text-white transition-all"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                    </svg>
                  </button>
                </div>

                {/* Détail complet — copie conforme de l'analyse */}
                {isOpen && res && (
                  <div className="border-t border-white/5 p-4 space-y-5">

                    {/* Décision + raison */}
                    <div className="flex flex-col sm:flex-row items-start gap-4 p-4 bg-[#0d1226]/60 rounded-xl border border-white/5">
                      <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r border ${cfg.badge} flex-shrink-0`}>
                        <span>{cfg.icon}</span>
                        <span className={`font-black tracking-widest text-sm ${cfg.text}`}>{cfg.label.toUpperCase()}</span>
                      </div>
                      <div>
                        <p className="text-[#CBD5E1] text-sm leading-relaxed">{res.main_reason}</p>
                        <p className="text-xs text-[#6B7280] mt-1">Stratégie : {res.strategy} · Config v{res.config_version} · {currency}</p>
                      </div>
                    </div>

                    {/* Indicateurs calculés */}
                    {ind && (() => {
                      const kpis = [
                        { label: 'Ancienneté', value: `${(ind.company_age_years ?? 0).toFixed(0)} ans`, color: 'text-white' },
                        { label: 'CA N', value: ind.ca_n != null ? ind.ca_n.toLocaleString('fr-FR') + ' ' + currency : '—', color: ind.ca_n != null ? 'text-emerald-300' : 'text-[#4B5563]' },
                        { label: 'Croissance CA', value: ind.ca_growth_pct != null ? `${ind.ca_growth_pct > 0 ? '+' : ''}${ind.ca_growth_pct.toFixed(1)}%` : '—', color: ind.ca_growth_pct != null ? (ind.ca_growth_pct >= 0 ? 'text-emerald-300' : 'text-red-300') : 'text-[#4B5563]' },
                        { label: 'Résultat net N', value: ind.resultat_net_n != null ? ind.resultat_net_n.toLocaleString('fr-FR') + ' ' + currency : '—', color: ind.resultat_net_n != null ? (ind.resultat_net_n >= 0 ? 'text-emerald-300' : 'text-red-300') : 'text-[#4B5563]' },
                        { label: 'EBITDA N', value: ind.ebitda_n != null ? ind.ebitda_n.toLocaleString('fr-FR') + ' ' + currency : '—', color: ind.ebitda_n != null ? 'text-[#60A5FA]' : 'text-[#4B5563]' },
                        { label: 'Marge EBITDA', value: ind.ebitda_margin_pct != null ? `${ind.ebitda_margin_pct.toFixed(1)}%` : '—', color: ind.ebitda_margin_pct != null ? 'text-[#60A5FA]' : 'text-[#4B5563]' },
                        { label: 'Fonds propres', value: ind.fonds_propres_n != null ? ind.fonds_propres_n.toLocaleString('fr-FR') + ' ' + currency : '—', color: ind.fonds_propres_n != null ? (ind.fonds_propres_n > 0 ? 'text-emerald-300' : 'text-red-300') : 'text-[#4B5563]' },
                        { label: 'Endettement', value: ind.endettement_n != null ? ind.endettement_n.toLocaleString('fr-FR') + ' ' + currency : '—', color: ind.endettement_n != null ? 'text-amber-300' : 'text-[#4B5563]' },
                        { label: 'DSCR', value: ind.dscr != null ? ind.dscr.toFixed(2) + 'x' : '—', color: ind.dscr != null ? (ind.dscr >= 1.2 ? 'text-emerald-300' : ind.dscr >= 1.0 ? 'text-amber-300' : 'text-red-300') : 'text-[#4B5563]' },
                        { label: 'D/E ratio', value: ind.debt_equity_ratio != null ? ind.debt_equity_ratio.toFixed(2) + 'x' : '—', color: ind.debt_equity_ratio != null ? (ind.debt_equity_ratio <= 2 ? 'text-emerald-300' : ind.debt_equity_ratio <= 3 ? 'text-amber-300' : 'text-red-300') : 'text-[#4B5563]' },
                        { label: 'Mensualité', value: ind.nouvelle_mensualite != null ? ind.nouvelle_mensualite.toLocaleString('fr-FR') + ' ' + currency : '—', color: ind.nouvelle_mensualite != null ? 'text-[#A78BFA]' : 'text-[#4B5563]' },
                        { label: 'Trésorerie', value: ind.tresorerie_n != null ? ind.tresorerie_n.toLocaleString('fr-FR') + ' ' + currency : '—', color: ind.tresorerie_n != null ? (ind.tresorerie_n >= 0 ? 'text-emerald-300' : 'text-red-300') : 'text-[#4B5563]' },
                        { label: 'Couv. trésorerie', value: ind.treasury_coverage_months != null ? `${ind.treasury_coverage_months.toFixed(1)} mois` : '—', color: ind.treasury_coverage_months != null ? 'text-[#60A5FA]' : 'text-[#4B5563]' },
                        { label: 'Cov. garantie', value: ind.guarantee_coverage_pct != null ? ind.guarantee_coverage_pct.toFixed(0) + '%' : '—', color: ind.guarantee_coverage_pct != null ? (ind.guarantee_coverage_pct >= 100 ? 'text-emerald-300' : 'text-amber-300') : 'text-[#4B5563]' },
                        { label: 'Compl. financière', value: `${(ind.financial_completeness_score ?? 0).toFixed(0)}%`, color: (ind.financial_completeness_score ?? 0) >= 80 ? 'text-emerald-300' : 'text-amber-300' },
                        { label: 'Compl. dossier', value: `${(ind.document_completeness_score ?? 0).toFixed(0)}%`, color: (ind.document_completeness_score ?? 0) >= 80 ? 'text-emerald-300' : 'text-amber-300' },
                        { label: 'Score gouv.', value: `${(ind.governance_score ?? 0).toFixed(0)}/100`, color: (ind.governance_score ?? 0) >= 60 ? 'text-emerald-300' : 'text-amber-300' },
                        ...(res.credit_score != null ? [{ label: 'Score PME', value: `${res.credit_score.toFixed(0)}/100`, color: 'text-[#A78BFA]' }] : []),
                      ];
                      return (
                        <div>
                          <p className="text-xs font-bold text-[#6B7280] uppercase tracking-wide mb-3">Indicateurs calculés</p>
                          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2.5">
                            {kpis.map(kpi => (
                              <div key={kpi.label} className={`bg-[#0d1424] rounded-xl p-3 border ${kpi.color === 'text-[#4B5563]' ? 'border-[#1e2a45]/50 opacity-50' : 'border-[#2563EB]/15'}`}>
                                <p className="text-[9px] text-[#6B7280] uppercase tracking-wider mb-1">{kpi.label}</p>
                                <p className={`text-sm font-black ${kpi.color}`}>{kpi.value}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })()}

                    {/* Score gauge */}
                    {res.credit_score != null && (
                      <div className="bg-[#0d1424] rounded-xl p-4 border border-[#7C3AED]/20">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-bold text-white">Score PME global</span>
                          <span className="text-xl font-black text-[#7C3AED]">{res.credit_score.toFixed(0)}/100</span>
                        </div>
                        <div className="w-full bg-[#1a2035] rounded-full h-3">
                          <div className="h-3 rounded-full bg-gradient-to-r from-[#7C3AED] to-[#2563EB]" style={{ width: `${res.credit_score}%` }} />
                        </div>
                      </div>
                    )}

                    {/* Ratios */}
                    {Object.keys(res.ratio_details || {}).length > 0 && (
                      <div>
                        <p className="text-xs font-bold text-[#6B7280] uppercase tracking-wide mb-3">Ratios financiers</p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {Object.values(res.ratio_details).map((r, i) => <RatioGauge key={i} ratio={r} />)}
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

                    {/* Risques / Documents manquants */}
                    {(res.identified_risks?.length > 0 || res.missing_documents?.length > 0) && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {res.identified_risks?.length > 0 && (
                          <div className="bg-orange-900/15 rounded-xl p-4 border border-orange-500/25">
                            <p className="text-xs font-bold text-orange-400 uppercase tracking-wide mb-2">Risques identifiés</p>
                            <ul className="space-y-1">{res.identified_risks.map((r, i) => <li key={i} className="text-xs text-[#CBD5E1] flex gap-2"><span className="text-orange-400">⚡</span>{r}</li>)}</ul>
                          </div>
                        )}
                        {res.missing_documents?.length > 0 && (
                          <div className="bg-purple-900/15 rounded-xl p-4 border border-purple-500/25">
                            <p className="text-xs font-bold text-purple-400 uppercase tracking-wide mb-2">Documents manquants</p>
                            <ul className="space-y-1">{res.missing_documents.map((d, i) => <li key={i} className="text-xs text-[#CBD5E1] flex gap-2"><span className="text-purple-400">📎</span>{d}</li>)}</ul>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Règles déclenchées */}
                    {res.triggered_rules?.length > 0 && (
                      <div>
                        <p className="text-xs font-bold text-[#6B7280] uppercase tracking-wide mb-2">Règles déclenchées</p>
                        <div className="space-y-2">
                          {res.triggered_rules.map((rule: PMETriggeredRule, i) => {
                            const rc = rule.impact === 'BLOQUANT' ? { bg: 'bg-red-500/10 border-red-500/30', tag: 'bg-red-500/20 text-red-300' }
                              : rule.impact === 'PENALISANT' ? { bg: 'bg-amber-500/10 border-amber-500/30', tag: 'bg-amber-500/20 text-amber-300' }
                              : { bg: 'bg-emerald-500/10 border-emerald-500/30', tag: 'bg-emerald-500/20 text-emerald-300' };
                            return (
                              <div key={i} className={`flex items-start gap-3 p-3 rounded-lg border ${rc.bg}`}>
                                <span className={`text-xs font-bold px-2 py-0.5 rounded-full flex-shrink-0 ${rc.tag}`}>{rule.impact}</span>
                                <div><p className="text-xs font-mono text-[#9CA3AF]">{rule.code} · {rule.section}</p><p className="text-sm text-[#CBD5E1]">{rule.message}</p></div>
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
                          {res.simulations.map((sim: PMESimulationScenario) => <SimCard key={sim.id} sim={sim} currency={currency} />)}
                        </div>
                      </div>
                    )}

                    {/* Texte du dossier */}
                    {(() => {
                      const dossierText = buildPMEDossierText(app, res, currency);
                      const lines = dossierText.split('\n');

                      const renderLine = (line: string, i: number) => {
                        const t = line.trim();
                        if (!t) return <div key={i} className="h-2" />;
                        if (t.startsWith('AVIS D ANALYSE'))
                          return <p key={i} className="text-sm font-black text-[#F59E0B] tracking-wide pb-2 mb-1 border-b border-[#F59E0B]/20">{t}</p>;
                        if (t.startsWith('Objet :'))
                          return <p key={i} className="text-xs text-[#F59E0B]/80 font-semibold">{t}</p>;
                        if (/^(I{1,3}V?|IV|V|VI)\. /.test(t))
                          return <div key={i} className="flex items-center gap-2 mt-2"><div className="w-1 h-5 rounded-full bg-gradient-to-b from-[#F59E0B] to-[#2563EB]" /><p className="text-xs font-bold text-white uppercase tracking-wide">{t}</p></div>;
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
                        if (t.startsWith('Risques identifies'))
                          return <p key={i} className="text-xs font-semibold text-orange-400">{t}</p>;
                        if (t.startsWith('Conditions requises') || t.startsWith('Documents manquants'))
                          return <p key={i} className="text-xs font-semibold text-amber-400">{t}</p>;
                        if (t.startsWith('Analyse realisee'))
                          return <p key={i} className="text-[10px] text-[#4B5563] italic pt-2 mt-1 border-t border-white/5">{t}</p>;
                        return <p key={i} className="text-xs text-[#CBD5E1] leading-relaxed pl-1">{t}</p>;
                      };

                      return (
                        <div className="bg-[#0a0f1e] rounded-xl border border-[#F59E0B]/30 overflow-hidden">
                          <div className="flex items-center justify-between px-4 py-3 border-b border-[#F59E0B]/20 bg-[#F59E0B]/10">
                            <div className="flex items-center gap-2">
                              <span className="text-sm">📝</span>
                              <p className="text-sm font-bold text-[#FDE68A]">Texte du dossier — Analyste crédit</p>
                            </div>
                            <button
                              onClick={() => handleCopy(rec.id, dossierText)}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#F59E0B]/20 hover:bg-[#F59E0B]/40 border border-[#F59E0B]/30 text-[#FDE68A] text-xs font-semibold transition-all"
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
