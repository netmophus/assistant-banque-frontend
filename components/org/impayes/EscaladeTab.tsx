'use client';

import React, { useState, useEffect } from 'react';
import { apiClient } from '@/lib/api/client';
import Pagination from '@/components/common/Pagination';

interface EscaladeDossier {
  ref_credit: string;
  nom_client: string;
  niveau_actuel: string;
  niveau_label: string;
  niveau_couleur: string;
  date_escalade: string;
  jours_retard: number;
  montant_impaye: number;
  agence: string;
  segment: string;
  telephone: string;
  agent_attribue?: string;
  agent_nom?: string;
  responsable_escalade?: string;
  historique_escalade: any[];
  prochaine_escalade?: string;
  jours_avant_prochaine?: number;
}

interface NiveauConfig {
  niveau: string;
  label: string;
  description: string;
  jours_declenchement: number;
  actions_auto: string[];
  couleur: string;
}

const NIVEAU_ICONS: Record<string, string> = {
  relance_1:        '📨',
  relance_2:        '📞',
  mise_en_demeure:  '⚠️',
  contentieux:      '⚖️',
};

const sel = 'rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white cursor-pointer focus:outline-none focus:border-[#d32f2f]/40 transition-all';
const selOpt = 'bg-[#0f1629]';

const EscaladeTab = () => {
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState('');
  const [dossiers, setDossiers]   = useState<EscaladeDossier[]>([]);
  const [total, setTotal]         = useState(0);
  const [statsNiveaux, setStatsNiveaux]     = useState<Record<string, number>>({});
  const [niveauxConfig, setNiveauxConfig]   = useState<NiveauConfig[]>([]);
  const [page, setPage]           = useState(1);
  const limit = 20;

  const [filtreNiveau, setFiltreNiveau]   = useState('');
  const [filtreAgence, setFiltreAgence]   = useState('');
  const [expandedDossier, setExpandedDossier] = useState<string | null>(null);
  const [showRapport, setShowRapport]     = useState(false);

  const [escaladeModal, setEscaladeModal] = useState<EscaladeDossier | null>(null);
  const [nouveauNiveau, setNouveauNiveau] = useState('');
  const [commentaire, setCommentaire]     = useState('');

  const [promesseModal, setPromesseModal]   = useState<EscaladeDossier | null>(null);
  const [promesseMontant, setPromesseMontant] = useState('');
  const [promesseDate, setPromesseDate]     = useState('');
  const [promesseComment, setPromesseComment] = useState('');
  const [promesseSaving, setPromesseSaving] = useState(false);
  const [promesseSuccess, setPromesseSuccess] = useState('');

  const [smsModal, setSmsModal]     = useState<EscaladeDossier | null>(null);
  const [smsMessage, setSmsMessage] = useState('');
  const [smsSaving, setSmsSaving]   = useState(false);
  const [smsSuccess, setSmsSuccess] = useState('');

  useEffect(() => { loadDossiers(); }, [page, filtreNiveau, filtreAgence]);

  const loadDossiers = async () => {
    setLoading(true); setError('');
    try {
      const params = new URLSearchParams();
      if (filtreNiveau) params.set('niveau', filtreNiveau);
      if (filtreAgence) params.set('agence', filtreAgence);
      params.set('limit', String(limit));
      params.set('skip', String((page - 1) * limit));
      const data = await apiClient.get<any>(`/impayes/escalade/dossiers?${params}`);
      setDossiers(data.dossiers || []);
      setTotal(data.total || 0);
      setStatsNiveaux(data.stats_niveaux || {});
      setNiveauxConfig(data.niveaux_config || []);
    } catch (err: any) {
      setError(err.message || 'Erreur chargement');
    } finally {
      setLoading(false);
    }
  };

  const handleEscalade = async () => {
    if (!escaladeModal || !nouveauNiveau) return;
    try {
      await apiClient.post('/impayes/escalade/action', { ref_credit: escaladeModal.ref_credit, nouveau_niveau: nouveauNiveau, commentaire: commentaire || undefined });
      setEscaladeModal(null); setNouveauNiveau(''); setCommentaire('');
      loadDossiers();
    } catch (err: any) { alert('Erreur: ' + (err.message || 'Erreur escalade')); }
  };

  const handlePromesse = async () => {
    if (!promesseModal || !promesseMontant || !promesseDate) return;
    setPromesseSaving(true);
    try {
      await apiClient.post('/impayes/promesses', { ref_credit: promesseModal.ref_credit, nom_client: promesseModal.nom_client, montant_promis: parseFloat(promesseMontant), date_promesse: promesseDate, commentaire: promesseComment || undefined });
      setPromesseSuccess('Promesse enregistrée ✓');
      setTimeout(() => { setPromesseModal(null); setPromesseMontant(''); setPromesseDate(''); setPromesseComment(''); setPromesseSuccess(''); }, 1500);
    } catch (err: any) { alert('Erreur : ' + (err.message || 'Erreur promesse')); }
    finally { setPromesseSaving(false); }
  };

  const formatMontantSms = (n: number) => Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');

  const getDefaultSmsMessage = (d: EscaladeDossier) =>
    `Cher(e) ${d.nom_client}, votre credit ${d.ref_credit} presente un retard de ${d.jours_retard} jours pour un montant de ${formatMontantSms(d.montant_impaye)} FCFA. Merci de regulariser votre situation au plus vite ou de contacter votre agence ${d.agence}.`;

  const handleSmsRappel = async () => {
    if (!smsModal || !smsMessage) return;
    setSmsSaving(true);
    try {
      const res = await apiClient.post<any>('/impayes/escalade/sms-rappel', { ref_credit: smsModal.ref_credit, nom_client: smsModal.nom_client, telephone: smsModal.telephone, message: smsMessage, niveau_actuel: smsModal.niveau_actuel });
      if (res.success === false) { alert('Erreur : ' + (res.message || "Échec envoi SMS")); }
      else {
        setSmsSuccess('SMS envoyé avec succès ✓');
        setTimeout(() => { setSmsModal(null); setSmsMessage(''); setSmsSuccess(''); }, 2000);
      }
    } catch (err: any) { alert('Erreur : ' + (err.message || "Échec envoi SMS")); }
    finally { setSmsSaving(false); }
  };

  const reportParNiveau = niveauxConfig.map(niv => {
    const items = dossiers.filter(d => d.niveau_actuel === niv.niveau);
    return { niveau: niv.niveau, label: niv.label, couleur: niv.couleur, count: items.length, montant: items.reduce((s, d) => s + d.montant_impaye, 0), jours_moy: items.length ? Math.round(items.reduce((s, d) => s + d.jours_retard, 0) / items.length) : 0 };
  });

  const reportParResponsable = Object.values(
    dossiers.reduce((acc, d) => {
      const key = d.responsable_escalade || 'Non défini';
      if (!acc[key]) acc[key] = { responsable: key, count: 0, montant: 0, niveaux: new Set<string>() };
      acc[key].count++; acc[key].montant += d.montant_impaye; acc[key].niveaux.add(d.niveau_label);
      return acc;
    }, {} as Record<string, { responsable: string; count: number; montant: number; niveaux: Set<string> }>)
  ).sort((a, b) => b.count - a.count);

  const handlePrintRapport = () => {
    const date = new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });
    const totalMontant = dossiers.reduce((s, d) => s + d.montant_impaye, 0);
    const fmt = (n: number) => n.toLocaleString('fr-FR');
    const rowsNiveau = reportParNiveau.map(r => `<tr><td style="padding:8px 12px;border-bottom:1px solid #e2e8f0"><span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:${r.couleur};margin-right:8px"></span>${r.label}</td><td style="padding:8px 12px;border-bottom:1px solid #e2e8f0;text-align:center;font-weight:700">${r.count}</td><td style="padding:8px 12px;border-bottom:1px solid #e2e8f0;text-align:right">${fmt(r.montant)} FCFA</td><td style="padding:8px 12px;border-bottom:1px solid #e2e8f0;text-align:center">${r.jours_moy}j</td></tr>`).join('');
    const rowsResp = reportParResponsable.map(r => `<tr><td style="padding:8px 12px;border-bottom:1px solid #e2e8f0;font-weight:600">${r.responsable}</td><td style="padding:8px 12px;border-bottom:1px solid #e2e8f0;text-align:center;font-weight:700">${r.count}</td><td style="padding:8px 12px;border-bottom:1px solid #e2e8f0;text-align:right">${fmt(r.montant)} FCFA</td><td style="padding:8px 12px;border-bottom:1px solid #e2e8f0;font-size:11px;color:#64748b">${[...r.niveaux].join(', ')}</td></tr>`).join('');
    const rowsDossiers = dossiers.map(d => `<tr><td style="padding:6px 10px;border-bottom:1px solid #f1f5f9;font-size:11px">${d.ref_credit}</td><td style="padding:6px 10px;border-bottom:1px solid #f1f5f9;font-size:11px">${d.nom_client}</td><td style="padding:6px 10px;border-bottom:1px solid #f1f5f9;font-size:11px;color:${d.niveau_couleur};font-weight:600">${d.niveau_label}</td><td style="padding:6px 10px;border-bottom:1px solid #f1f5f9;font-size:11px;text-align:center;color:#ef4444;font-weight:700">${d.jours_retard}j</td><td style="padding:6px 10px;border-bottom:1px solid #f1f5f9;font-size:11px;text-align:right">${fmt(d.montant_impaye)}</td><td style="padding:6px 10px;border-bottom:1px solid #f1f5f9;font-size:11px">${d.agence}</td><td style="padding:6px 10px;border-bottom:1px solid #f1f5f9;font-size:11px;color:#d97706">${d.responsable_escalade || '—'}</td></tr>`).join('');
    const html = `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"><title>Rapport Escalade — ${date}</title><style>*{box-sizing:border-box;margin:0;padding:0}body{font-family:'Segoe UI',Arial,sans-serif;color:#1e293b;font-size:12px;background:#fff}.page{max-width:1000px;margin:0 auto;padding:28px}.header{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:3px solid #ef4444;padding-bottom:16px;margin-bottom:24px}.header h1{font-size:22px;font-weight:800}.header p{color:#64748b;font-size:11px;margin-top:4px}.kpi-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:24px}.kpi{background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:14px;text-align:center}.kpi-label{font-size:10px;color:#64748b;margin-bottom:4px;text-transform:uppercase;letter-spacing:.5px}.kpi-value{font-size:22px;font-weight:800}.section{margin-bottom:28px}.section-title{font-size:13px;font-weight:700;color:#334155;padding:8px 12px;background:#f1f5f9;border-left:4px solid #ef4444;margin-bottom:0}table{width:100%;border-collapse:collapse}thead{background:#f8fafc}th{padding:8px 12px;text-align:left;font-size:10px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:.5px;border-bottom:2px solid #e2e8f0}.footer{margin-top:24px;padding-top:12px;border-top:1px solid #e2e8f0;text-align:center;color:#94a3b8;font-size:10px}@media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact}.page{padding:16px}}</style></head><body><div class="page"><div class="header"><div><h1>Rapport d'Escalade des Impayés</h1><p>Imprimé le ${date} • ${dossiers.length} dossiers en escalade</p></div><div style="text-align:right"><div style="font-size:11px;color:#64748b">Montant total impayé</div><div style="font-size:20px;font-weight:800;color:#ef4444">${fmt(totalMontant)} FCFA</div></div></div><div class="kpi-grid">${reportParNiveau.map(r => `<div class="kpi"><div class="kpi-label" style="color:${r.couleur}">${r.label}</div><div class="kpi-value" style="color:${r.couleur}">${r.count}</div><div style="font-size:10px;color:#94a3b8">${fmt(r.montant)} FCFA</div></div>`).join('')}</div><div class="section"><div class="section-title">Répartition par niveau</div><table><thead><tr><th>Niveau</th><th style="text-align:center">Dossiers</th><th style="text-align:right">Montant impayé</th><th style="text-align:center">Retard moyen</th></tr></thead><tbody>${rowsNiveau}</tbody></table></div><div class="section"><div class="section-title">Répartition par responsable</div><table><thead><tr><th>Responsable</th><th style="text-align:center">Dossiers</th><th style="text-align:right">Montant impayé</th><th>Niveaux</th></tr></thead><tbody>${rowsResp}</tbody></table></div><div class="section"><div class="section-title">Détail des dossiers</div><table><thead><tr><th>Réf. Crédit</th><th>Client</th><th>Niveau</th><th style="text-align:center">Retard</th><th style="text-align:right">Montant (FCFA)</th><th>Agence</th><th>Responsable</th></tr></thead><tbody>${rowsDossiers}</tbody></table></div><div class="footer">Rapport Escalade Impayés • ${date}</div></div></body></html>`;
    const win = window.open('', '_blank');
    if (!win) return;
    win.document.write(html); win.document.close(); win.onload = () => { win.focus(); win.print(); };
  };

  const agences = [...new Set(dossiers.map(d => d.agence))].sort();

  return (
    <div className="space-y-5">

      {/* ── Workflow niveaux ─────────────────────────────────────────────────── */}
      {niveauxConfig.length > 0 && (
        <div className={`grid gap-3 ${niveauxConfig.length <= 4 ? `grid-cols-2 sm:grid-cols-${niveauxConfig.length}` : 'grid-cols-2 sm:grid-cols-4'}`}>
          {niveauxConfig.map((niv, idx) => {
            const count = statsNiveaux[niv.niveau] || 0;
            const isActive = filtreNiveau === niv.niveau;
            return (
              <div
                key={niv.niveau}
                onClick={() => { setFiltreNiveau(isActive ? '' : niv.niveau); setPage(1); }}
                className="relative cursor-pointer overflow-hidden rounded-2xl border transition-all duration-200 hover:scale-[1.02]"
                style={{ borderColor: isActive ? niv.couleur : 'rgba(255,255,255,0.08)', background: isActive ? `${niv.couleur}20` : 'rgba(255,255,255,0.03)' }}
              >
                {idx < niveauxConfig.length - 1 && (
                  <div className="absolute right-1 top-1/2 -translate-y-1/2 text-slate-700 text-lg font-bold z-10">›</div>
                )}
                <div className="p-4">
                  <div className="text-xl mb-2">{NIVEAU_ICONS[niv.niveau] || '📋'}</div>
                  <div className="text-xs font-bold mb-0.5" style={{ color: niv.couleur }}>{niv.label}</div>
                  <div className="text-[10px] text-slate-500 leading-snug mb-3">{niv.description}</div>
                  <div className="text-2xl font-black text-white leading-none">{count}</div>
                  <div className="text-[10px] text-slate-500 mt-0.5">dossier{count > 1 ? 's' : ''}</div>
                  <div className="mt-2 inline-block rounded-md bg-white/5 px-1.5 py-0.5 text-[9px] text-slate-600">+{niv.jours_declenchement}j retard</div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Filtres & actions ───────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-3">
        <select value={filtreAgence} onChange={e => { setFiltreAgence(e.target.value); setPage(1); }} className={sel}>
          <option value="" className={selOpt}>Toutes les agences</option>
          {agences.map(a => <option key={a} value={a} className={selOpt}>{a}</option>)}
        </select>
        <span className="text-xs text-slate-500">{total} dossier{total > 1 ? 's' : ''}</span>
        <div className="ml-auto flex gap-2">
          <button onClick={() => setShowRapport(!showRapport)}
            className={`flex items-center gap-2 rounded-xl border px-4 py-2 text-xs font-bold transition-all ${showRapport ? 'border-transparent bg-indigo-600 text-white' : 'border-indigo-500/30 bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20'}`}>
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
            {showRapport ? 'Masquer rapport' : 'Voir rapport'}
          </button>
          <button onClick={handlePrintRapport}
            className="flex items-center gap-2 rounded-xl border border-red-500/25 bg-red-500/10 px-4 py-2 text-xs font-bold text-red-400 hover:bg-red-500/20 transition-all">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
            Imprimer
          </button>
        </div>
      </div>

      {/* ── Rapport ─────────────────────────────────────────────────────────── */}
      {showRapport && dossiers.length > 0 && (
        <div className="rounded-2xl border border-indigo-500/20 bg-white/[0.02] p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-indigo-300">Rapport d'escalade</h3>
            <span className="text-xs text-slate-500">{dossiers.length} dossiers — {dossiers.reduce((s,d) => s + d.montant_impaye, 0).toLocaleString('fr-FR')} FCFA</span>
          </div>
          {/* KPI par niveau */}
          <div className="flex flex-wrap gap-3 mb-5">
            {reportParNiveau.filter(r => r.count > 0).map(r => (
              <div key={r.niveau} className="flex-1 min-w-[120px] rounded-xl border p-3" style={{ borderColor: `${r.couleur}30`, background: `${r.couleur}08` }}>
                <div className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: r.couleur }}>{r.label}</div>
                <div className="text-xl font-black text-white leading-none">{r.count}</div>
                <div className="text-[10px] text-slate-600 mt-1">{r.montant.toLocaleString('fr-FR')} FCFA</div>
                <div className="text-[10px] text-slate-600">Moy. {r.jours_moy}j</div>
              </div>
            ))}
          </div>
          {/* Tables */}
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-2">Répartition par niveau</p>
              <table className="w-full text-xs">
                <thead><tr className="border-b border-white/5">
                  {['Niveau','Nb','Montant','Moy.'].map(h => <th key={h} className="pb-2 text-left text-[10px] font-semibold text-slate-500">{h}</th>)}
                </tr></thead>
                <tbody>
                  {reportParNiveau.map(r => (
                    <tr key={r.niveau} className="border-b border-white/[0.03]">
                      <td className="py-1.5 text-xs font-semibold" style={{ color: r.couleur }}>
                        <span className="mr-1.5 inline-block h-2 w-2 rounded-full" style={{ background: r.couleur }} />{r.label}
                      </td>
                      <td className="py-1.5 font-bold text-white">{r.count}</td>
                      <td className="py-1.5 text-slate-400">{r.montant.toLocaleString('fr-FR')}</td>
                      <td className="py-1.5 text-slate-500">{r.jours_moy}j</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-2">Répartition par responsable</p>
              <table className="w-full text-xs">
                <thead><tr className="border-b border-white/5">
                  {['Responsable','Nb','Montant'].map(h => <th key={h} className="pb-2 text-left text-[10px] font-semibold text-slate-500">{h}</th>)}
                </tr></thead>
                <tbody>
                  {reportParResponsable.map((r, i) => (
                    <tr key={i} className="border-b border-white/[0.03]">
                      <td className="py-1.5 text-slate-200 font-semibold">
                        {r.responsable}
                        <div className="text-[10px] text-slate-600">{[...r.niveaux].join(', ')}</div>
                      </td>
                      <td className="py-1.5 font-bold text-white">{r.count}</td>
                      <td className="py-1.5 text-slate-400">{r.montant.toLocaleString('fr-FR')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── Erreur ──────────────────────────────────────────────────────────── */}
      {error && (
        <div className="flex items-center gap-3 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">{error}</div>
      )}

      {/* ── Table ───────────────────────────────────────────────────────────── */}
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
          <div>
            <h3 className="text-sm font-bold text-white">Dossiers en escalade</h3>
            <p className="text-[11px] text-slate-500 mt-0.5">{total} dossier{total > 1 ? 's' : ''}</p>
          </div>
          {loading && <div className="flex items-center gap-2 text-xs text-slate-400"><div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-[#d32f2f]/30 border-t-[#d32f2f]" />Actualisation…</div>}
        </div>

        {loading && dossiers.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-slate-400">
            <div className="mb-4 h-10 w-10 animate-spin rounded-full border-[3px] border-[#d32f2f]/20 border-t-[#d32f2f]" />
            <p className="text-sm">Chargement…</p>
          </div>
        ) : dossiers.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-slate-400">
            <p className="text-sm font-semibold text-slate-300">Aucun dossier en escalade</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/5">
                    {['Niveau','Client','Réf.','Montant','Retard','Agence','Agent','Prochaine','Actions'].map(h => (
                      <th key={h} className="bg-white/[0.02] px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-slate-500">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {dossiers.map((d, idx) => (
                    <React.Fragment key={d.ref_credit}>
                      <tr
                        className={`border-b border-white/[0.03] cursor-pointer transition-colors hover:bg-white/[0.04] ${idx % 2 !== 0 ? 'bg-white/[0.015]' : ''}`}
                        onClick={() => setExpandedDossier(expandedDossier === d.ref_credit ? null : d.ref_credit)}
                      >
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[11px] font-semibold"
                            style={{ color: d.niveau_couleur, background: `${d.niveau_couleur}15`, borderColor: `${d.niveau_couleur}30` }}>
                            {NIVEAU_ICONS[d.niveau_actuel] || ''} {d.niveau_label}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm font-medium text-slate-200 max-w-[150px] truncate">{d.nom_client}</td>
                        <td className="px-4 py-3">
                          <span className="rounded-md border border-white/10 bg-white/5 px-2 py-0.5 font-mono text-[11px] text-white/80">{d.ref_credit}</span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span className="font-bold text-white/90 tabular-nums">{d.montant_impaye.toLocaleString('fr-FR')}</span>
                          <span className="ml-1 text-[10px] text-slate-600">FCFA</span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={`inline-flex items-center justify-center rounded-full border px-2.5 py-0.5 text-[11px] font-bold tabular-nums ${d.jours_retard > 90 ? 'border-rose-500/20 bg-rose-500/15 text-rose-300' : d.jours_retard > 30 ? 'border-orange-500/20 bg-orange-500/15 text-orange-300' : 'border-amber-500/20 bg-amber-500/15 text-amber-300'}`}>
                            {d.jours_retard}j
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-300">{d.agence}</td>
                        <td className="px-4 py-3 text-xs">
                          {d.responsable_escalade ? (
                            <div>
                              <div className="font-semibold text-slate-200">{d.responsable_escalade}</div>
                              {d.agent_nom && <div className="text-[10px] text-slate-600">Agent: {d.agent_nom}</div>}
                            </div>
                          ) : d.agent_nom ? (
                            <span className="font-semibold text-slate-200">{d.agent_nom}</span>
                          ) : (
                            <span className="text-slate-700">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-xs">
                          {d.prochaine_escalade ? (
                            <span className="text-amber-400">{d.prochaine_escalade} ({d.jours_avant_prochaine}j)</span>
                          ) : (
                            <span className="text-slate-600">Max</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <button onClick={e => { e.stopPropagation(); setEscaladeModal(d); }}
                              className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 text-[11px] font-bold text-amber-400 hover:bg-amber-500/20 transition-colors whitespace-nowrap">
                              Escalader
                            </button>
                            <button onClick={e => { e.stopPropagation(); setSmsModal(d); setSmsMessage(getDefaultSmsMessage(d)); setSmsSuccess(''); }}
                              disabled={!d.telephone}
                              className={`rounded-lg border px-2.5 py-1 text-[11px] font-bold transition-colors whitespace-nowrap ${d.telephone ? 'border-blue-500/30 bg-blue-500/10 text-blue-400 hover:bg-blue-500/20' : 'border-white/5 bg-white/5 text-slate-600 cursor-not-allowed'}`}
                              title={!d.telephone ? 'Pas de téléphone' : 'Envoyer un SMS'}>
                              SMS
                            </button>
                            <button onClick={e => { e.stopPropagation(); setPromesseModal(d); setPromesseMontant(''); setPromesseDate(''); setPromesseComment(''); setPromesseSuccess(''); }}
                              className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-[11px] font-bold text-emerald-400 hover:bg-emerald-500/20 transition-colors whitespace-nowrap">
                              Promesse
                            </button>
                          </div>
                        </td>
                      </tr>

                      {/* Row étendue */}
                      {expandedDossier === d.ref_credit && (
                        <tr>
                          <td colSpan={9} className="border-b border-white/[0.03] bg-white/[0.015] px-6 py-4">
                            <div className="grid sm:grid-cols-2 gap-6">
                              <div>
                                <p className="text-xs font-bold text-slate-400 mb-2 uppercase tracking-wider">Informations</p>
                                <div className="space-y-1 text-xs text-slate-400 leading-relaxed">
                                  <div>Segment : <span className="text-slate-200">{d.segment}</span></div>
                                  <div>Téléphone : <span className="text-slate-200">{d.telephone || 'N/A'}</span></div>
                                  <div>Date situation : <span className="text-slate-200">{d.date_escalade}</span></div>
                                  {d.responsable_escalade && (
                                    <div>Responsable : <span className="font-bold text-amber-400">{d.responsable_escalade}</span></div>
                                  )}
                                  {d.agent_nom && <div>Agent portefeuille : <span className="text-slate-200">{d.agent_nom}</span></div>}
                                </div>
                              </div>
                              <div>
                                <p className="text-xs font-bold text-slate-400 mb-2 uppercase tracking-wider">Historique escalade</p>
                                {d.historique_escalade.length === 0 ? (
                                  <p className="text-xs text-slate-600">Aucun historique (escalade automatique)</p>
                                ) : (
                                  <div className="max-h-36 overflow-y-auto space-y-1.5">
                                    {d.historique_escalade.map((h: any, i: number) => (
                                      <div key={i} className="rounded-lg border border-white/5 bg-white/[0.03] px-3 py-2 text-xs text-slate-300">
                                        <span className="font-semibold">{h.niveau}</span>
                                        {' — '}
                                        <span className="text-slate-500">{h.date ? new Date(h.date).toLocaleDateString('fr-FR') : ''}</span>
                                        {h.commentaire && <div className="text-slate-600 mt-0.5">{h.commentaire}</div>}
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>

            {total > limit && (
              <div className="border-t border-white/5 px-5 py-3">
                <Pagination currentPage={page} totalItems={total} itemsPerPage={limit} currentItemsCount={dossiers.length} onPageChange={p => setPage(p)} />
              </div>
            )}
          </>
        )}
      </div>

      {/* ── Modal Promesse ──────────────────────────────────────────────────── */}
      {promesseModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm" onClick={() => setPromesseModal(null)}>
          <div className="w-full max-w-md rounded-2xl border border-emerald-500/25 bg-[#0f172a] p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-5">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/20">
                <svg className="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Saisir une promesse de paiement</h3>
                <p className="text-xs text-slate-500">{promesseModal.nom_client} — {promesseModal.ref_credit}</p>
              </div>
            </div>

            <div className="flex gap-4 flex-wrap rounded-xl border border-white/5 bg-white/[0.03] p-3 mb-5 text-xs">
              <div><div className="text-slate-500 mb-0.5">Niveau</div><span className="font-bold" style={{ color: promesseModal.niveau_couleur }}>{promesseModal.niveau_label}</span></div>
              <div><div className="text-slate-500 mb-0.5">Retard</div><span className="font-bold text-red-400">{promesseModal.jours_retard}j</span></div>
              <div><div className="text-slate-500 mb-0.5">Montant impayé</div><span className="font-bold text-white">{promesseModal.montant_impaye.toLocaleString('fr-FR')} FCFA</span></div>
            </div>

            {promesseSuccess ? (
              <div className="flex items-center justify-center gap-2 py-8 text-emerald-400 font-bold">{promesseSuccess}</div>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="block mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500">Montant promis <span className="text-red-400">*</span></label>
                  <input type="number" min="1" value={promesseMontant} onChange={e => setPromesseMontant(e.target.value)} placeholder={`Max: ${promesseModal.montant_impaye.toLocaleString()} FCFA`}
                    className="w-full rounded-xl border border-emerald-500/30 bg-emerald-500/5 px-3 py-2 text-sm text-white placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-emerald-500/30 transition-all" />
                </div>
                <div>
                  <label className="block mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500">Date de paiement <span className="text-red-400">*</span></label>
                  <input type="date" value={promesseDate} min={new Date().toISOString().split('T')[0]} onChange={e => setPromesseDate(e.target.value)} style={{ colorScheme: 'dark' }}
                    className="w-full rounded-xl border border-emerald-500/30 bg-emerald-500/5 px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-emerald-500/30 transition-all" />
                </div>
                <div>
                  <label className="block mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500">Commentaire <span className="text-slate-600">(optionnel)</span></label>
                  <textarea value={promesseComment} onChange={e => setPromesseComment(e.target.value)} placeholder="Ex: client s'engage à payer à réception de son salaire…" rows={3}
                    className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-white placeholder-slate-600 resize-none focus:outline-none focus:border-white/20 transition-all" />
                </div>
                <div className="flex justify-end gap-3 pt-1">
                  <button onClick={() => setPromesseModal(null)} className="rounded-xl border border-white/10 bg-white/5 px-5 py-2 text-sm font-semibold text-slate-300 hover:bg-white/10 transition-colors">Annuler</button>
                  <button onClick={handlePromesse} disabled={promesseSaving || !promesseMontant || !promesseDate}
                    className={`rounded-xl px-5 py-2 text-sm font-bold text-white transition-all ${promesseMontant && promesseDate ? 'bg-gradient-to-r from-emerald-600 to-emerald-700 hover:opacity-90' : 'bg-slate-700 opacity-50 cursor-not-allowed'}`}>
                    {promesseSaving ? 'Enregistrement…' : 'Enregistrer la promesse'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Modal SMS ───────────────────────────────────────────────────────── */}
      {smsModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm" onClick={() => setSmsModal(null)}>
          <div className="w-full max-w-lg rounded-2xl border border-blue-500/25 bg-[#0f172a] p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-5">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/20">
                <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" /></svg>
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Envoyer un SMS de rappel</h3>
                <p className="text-xs text-slate-500">{smsModal.nom_client} — {smsModal.ref_credit}</p>
              </div>
            </div>

            <div className="flex gap-4 flex-wrap rounded-xl border border-white/5 bg-white/[0.03] p-3 mb-5 text-xs">
              <div><div className="text-slate-500 mb-0.5">Niveau</div><span className="font-bold" style={{ color: smsModal.niveau_couleur }}>{smsModal.niveau_label}</span></div>
              <div><div className="text-slate-500 mb-0.5">Retard</div><span className="font-bold text-red-400">{smsModal.jours_retard}j</span></div>
              <div><div className="text-slate-500 mb-0.5">Montant</div><span className="font-bold text-white">{smsModal.montant_impaye.toLocaleString('fr-FR')} FCFA</span></div>
              <div><div className="text-slate-500 mb-0.5">Téléphone</div><span className="font-bold text-blue-400">{smsModal.telephone || 'N/A'}</span></div>
            </div>

            {smsSuccess ? (
              <div className="flex items-center justify-center gap-2 py-8 text-blue-400 font-bold">{smsSuccess}</div>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="block mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500">Message SMS <span className="text-red-400">*</span></label>
                  <textarea value={smsMessage} onChange={e => setSmsMessage(e.target.value)} rows={5}
                    className="w-full rounded-xl border border-blue-500/30 bg-blue-500/5 px-3 py-2 text-sm text-white resize-vertical focus:outline-none focus:ring-1 focus:ring-blue-500/30 transition-all leading-relaxed" />
                  <div className="flex justify-between mt-1">
                    <span className="text-[10px] text-slate-600">
                      {smsMessage.length} car.{smsMessage.length > 160 && <span className="text-amber-400"> ({Math.ceil(smsMessage.length / 160)} SMS)</span>}
                    </span>
                    <button onClick={() => setSmsMessage(getDefaultSmsMessage(smsModal))} className="text-[10px] text-blue-400 hover:underline">Réinitialiser</button>
                  </div>
                </div>
                {!smsModal.telephone && (
                  <div className="rounded-xl border border-red-500/20 bg-red-500/8 px-3 py-2 text-xs text-red-400">
                    Aucun numéro enregistré — l'envoi n'est pas possible.
                  </div>
                )}
                <div className="flex justify-end gap-3">
                  <button onClick={() => setSmsModal(null)} className="rounded-xl border border-white/10 bg-white/5 px-5 py-2 text-sm font-semibold text-slate-300 hover:bg-white/10 transition-colors">Annuler</button>
                  <button onClick={handleSmsRappel} disabled={smsSaving || !smsMessage || !smsModal.telephone}
                    className={`rounded-xl px-5 py-2 text-sm font-bold text-white transition-all ${smsMessage && smsModal.telephone ? 'bg-gradient-to-r from-blue-600 to-blue-700 hover:opacity-90' : 'bg-slate-700 opacity-50 cursor-not-allowed'}`}>
                    {smsSaving ? 'Envoi…' : 'Envoyer le SMS'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Modal Escalade manuelle ─────────────────────────────────────────── */}
      {escaladeModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm" onClick={() => setEscaladeModal(null)}>
          <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#1e293b] p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
            <h3 className="mb-1 text-base font-bold text-white">Escalader manuellement</h3>
            <p className="mb-5 text-xs text-slate-400">
              {escaladeModal.nom_client} — {escaladeModal.ref_credit} — Niveau actuel :{' '}
              <span className="font-bold" style={{ color: escaladeModal.niveau_couleur }}>{escaladeModal.niveau_label}</span>
            </p>
            <div className="space-y-4">
              <div>
                <label className="block mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500">Nouveau niveau</label>
                <select value={nouveauNiveau} onChange={e => setNouveauNiveau(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white cursor-pointer focus:outline-none focus:border-amber-500/40 transition-all">
                  <option value="" className={selOpt}>Choisir…</option>
                  {niveauxConfig.map(n => <option key={n.niveau} value={n.niveau} className={selOpt}>{n.label} (+{n.jours_declenchement}j)</option>)}
                </select>
              </div>
              <div>
                <label className="block mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500">Commentaire</label>
                <textarea value={commentaire} onChange={e => setCommentaire(e.target.value)} placeholder="Raison de l'escalade…" rows={3}
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white resize-vertical focus:outline-none focus:border-amber-500/30 transition-all" />
              </div>
            </div>
            <div className="mt-5 flex justify-end gap-3">
              <button onClick={() => setEscaladeModal(null)} className="rounded-xl border border-white/10 bg-white/5 px-5 py-2 text-sm font-semibold text-slate-300 hover:bg-white/10 transition-colors">Annuler</button>
              <button onClick={handleEscalade} disabled={!nouveauNiveau}
                className={`rounded-xl px-5 py-2 text-sm font-bold text-white transition-all ${nouveauNiveau ? 'bg-gradient-to-r from-amber-500 to-amber-600 hover:opacity-90' : 'bg-slate-700 opacity-50 cursor-not-allowed'}`}>
                Confirmer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EscaladeTab;
