'use client';

import React, { useState, useEffect } from 'react';
import { apiClient } from '@/lib/api/client';
import Pagination from '@/components/common/Pagination';

interface Promesse {
  id: string;
  promesse_id: string;
  ref_credit: string;
  nom_client: string;
  montant_promis: number;
  montant_recu: number | null;
  date_promesse: string;
  date_creation: string;
  statut: string;
  commentaire: string | null;
  created_by: string;
  updated_at: string | null;
}

interface PromesseStats {
  total: number;
  en_attente: number;
  tenues: number;
  non_tenues: number;
  annulees: number;
  montant_total_promis: number;
  montant_total_recu: number;
  taux_tenue: number;
}

const STATUT_CONFIG: Record<string, { label: string; color: string; bg: string; border: string; dot: string }> = {
  en_attente: { label: 'En attente', color: 'text-amber-400',  bg: 'bg-amber-500/10',  border: 'border-amber-500/25',  dot: 'bg-amber-400' },
  tenue:      { label: 'Tenue',      color: 'text-emerald-400',bg: 'bg-emerald-500/10', border: 'border-emerald-500/25', dot: 'bg-emerald-400' },
  non_tenue:  { label: 'Non tenue',  color: 'text-red-400',    bg: 'bg-red-500/10',     border: 'border-red-500/25',     dot: 'bg-red-400' },
  annulee:    { label: 'Annulée',    color: 'text-slate-400',  bg: 'bg-slate-500/10',   border: 'border-slate-500/25',   dot: 'bg-slate-400' },
};

const inputCls = 'w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-blue-500/40 focus:ring-1 focus:ring-blue-500/20 transition-all';
const labelCls = 'block mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500';
const selectOptionCls = 'bg-[#0f1629]';

const PromessesTab = () => {
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState('');
  const [promesses, setPromesses] = useState<Promesse[]>([]);
  const [total, setTotal]         = useState(0);
  const [stats, setStats]         = useState<PromesseStats | null>(null);
  const [page, setPage]           = useState(1);
  const limit = 20;

  const [filtreStatut, setFiltreStatut] = useState('');
  const [filtreRef, setFiltreRef]       = useState('');
  const [showForm, setShowForm]         = useState(false);
  const [form, setForm] = useState({ ref_credit: '', nom_client: '', montant_promis: '', date_promesse: '', commentaire: '' });

  const [updateModal, setUpdateModal]   = useState<Promesse | null>(null);
  const [updateStatut, setUpdateStatut] = useState('');
  const [updateMontant, setUpdateMontant] = useState('');
  const [updateComment, setUpdateComment] = useState('');

  useEffect(() => { loadPromesses(); loadStats(); }, [page, filtreStatut]);

  const loadPromesses = async () => {
    setLoading(true); setError('');
    try {
      const p = new URLSearchParams();
      if (filtreStatut) p.set('statut', filtreStatut);
      if (filtreRef) p.set('ref_credit', filtreRef);
      p.set('limit', String(limit));
      p.set('skip', String((page - 1) * limit));
      const data = await apiClient.get<any>(`/impayes/promesses?${p}`);
      setPromesses(data.promesses || []);
      setTotal(data.total || 0);
    } catch (err: any) {
      setError(err.message || 'Erreur chargement');
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const data = await apiClient.get<PromesseStats>('/impayes/promesses/stats');
      setStats(data);
    } catch {}
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.ref_credit || !form.montant_promis || !form.date_promesse) { setError('Remplir les champs obligatoires'); return; }
    try {
      setLoading(true);
      await apiClient.post('/impayes/promesses', { ref_credit: form.ref_credit, nom_client: form.nom_client, montant_promis: parseFloat(form.montant_promis), date_promesse: form.date_promesse, commentaire: form.commentaire || undefined });
      setForm({ ref_credit: '', nom_client: '', montant_promis: '', date_promesse: '', commentaire: '' });
      setShowForm(false); loadPromesses(); loadStats();
    } catch (err: any) {
      setError(err.message || 'Erreur création');
    } finally { setLoading(false); }
  };

  const handleUpdateStatut = async () => {
    if (!updateModal || !updateStatut) return;
    try {
      await apiClient.put(`/impayes/promesses/${updateModal.promesse_id}`, { statut: updateStatut, montant_recu: updateMontant ? parseFloat(updateMontant) : undefined, commentaire: updateComment || undefined });
      setUpdateModal(null); setUpdateStatut(''); setUpdateMontant(''); setUpdateComment('');
      loadPromesses(); loadStats();
    } catch (err: any) { alert('Erreur: ' + (err.message || 'Erreur MAJ')); }
  };

  const handleVerifierEchues = async () => {
    try {
      const data = await apiClient.post<any>('/impayes/promesses/verifier-echues', {});
      if (data.count > 0) { alert(`${data.count} promesse(s) marquée(s) comme non tenue(s)`); loadPromesses(); loadStats(); }
      else alert('Aucune promesse échue');
    } catch (err: any) { alert('Erreur: ' + err.message); }
  };

  const handlePrintPromesses = () => {
    const date = new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });
    const fmt = (n: number) => n.toLocaleString('fr-FR');
    const statsByStatut = Object.entries(STATUT_CONFIG).map(([key, cfg]) => {
      const items = promesses.filter(p => p.statut === key);
      return { key, label: cfg.label, color: cfg.dot.replace('bg-','#').replace('-400',''), count: items.length, montant: items.reduce((s, p) => s + p.montant_promis, 0) };
    });
    const kpis = stats ? `<div class="kpi-grid">
      <div class="kpi"><div class="kpi-label">Total</div><div class="kpi-value" style="color:#3b82f6">${stats.total}</div></div>
      <div class="kpi"><div class="kpi-label">En attente</div><div class="kpi-value" style="color:#f59e0b">${stats.en_attente}</div></div>
      <div class="kpi"><div class="kpi-label">Tenues</div><div class="kpi-value" style="color:#22c55e">${stats.tenues}</div></div>
      <div class="kpi"><div class="kpi-label">Non tenues</div><div class="kpi-value" style="color:#ef4444">${stats.non_tenues}</div></div>
      <div class="kpi"><div class="kpi-label">Taux de tenue</div><div class="kpi-value" style="color:${stats.taux_tenue >= 50 ? '#22c55e' : '#ef4444'}">${stats.taux_tenue}%</div></div>
      <div class="kpi"><div class="kpi-label">Montant promis</div><div class="kpi-value" style="color:#8b5cf6;font-size:16px">${fmt(stats.montant_total_promis)} FCFA</div></div>
      <div class="kpi"><div class="kpi-label">Montant reçu</div><div class="kpi-value" style="color:#10b981;font-size:16px">${fmt(stats.montant_total_recu)} FCFA</div></div>
    </div>` : '';
    const rows = promesses.map(p => {
      const sc = STATUT_CONFIG[p.statut] || STATUT_CONFIG.en_attente;
      const echeance = p.date_promesse ? new Date(p.date_promesse) : null;
      const isLate = echeance && p.statut === 'en_attente' && echeance < new Date();
      return `<tr><td style="padding:6px 10px;border-bottom:1px solid #f1f5f9;font-size:11px">${p.ref_credit}</td>
        <td style="padding:6px 10px;border-bottom:1px solid #f1f5f9;font-size:11px">${p.nom_client || '—'}</td>
        <td style="padding:6px 10px;border-bottom:1px solid #f1f5f9;font-size:11px"><span style="padding:2px 8px;border-radius:4px;background:${sc.bg};font-weight:600">${sc.label}</span></td>
        <td style="padding:6px 10px;border-bottom:1px solid #f1f5f9;font-size:11px;text-align:right;font-weight:700">${fmt(p.montant_promis)}</td>
        <td style="padding:6px 10px;border-bottom:1px solid #f1f5f9;font-size:11px;text-align:right;color:#22c55e">${p.montant_recu != null ? fmt(p.montant_recu) : '—'}</td>
        <td style="padding:6px 10px;border-bottom:1px solid #f1f5f9;font-size:11px;${isLate ? 'color:#ef4444;font-weight:700' : ''}">${p.date_promesse || '—'}</td>
        <td style="padding:6px 10px;border-bottom:1px solid #f1f5f9;font-size:11px;color:#64748b">${p.commentaire || '—'}</td>
      </tr>`;
    }).join('');
    const html = `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"><title>Rapport Promesses — ${date}</title>
    <style>*{box-sizing:border-box;margin:0;padding:0}body{font-family:'Segoe UI',Arial,sans-serif;color:#1e293b;font-size:12px;background:#fff}.page{max-width:1000px;margin:0 auto;padding:28px}.header{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:3px solid #3b82f6;padding-bottom:16px;margin-bottom:24px}.header h1{font-size:22px;font-weight:800}.header p{color:#64748b;font-size:11px;margin-top:4px}.kpi-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:24px}.kpi{background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:12px;text-align:center}.kpi-label{font-size:10px;color:#64748b;margin-bottom:4px;text-transform:uppercase;letter-spacing:0.5px}.kpi-value{font-size:20px;font-weight:800}.section{margin-bottom:28px}.section-title{font-size:13px;font-weight:700;padding:8px 12px;background:#f1f5f9;border-left:4px solid #3b82f6;margin-bottom:0}table{width:100%;border-collapse:collapse}thead{background:#f8fafc}th{padding:8px 12px;text-align:left;font-size:10px;font-weight:700;color:#64748b;text-transform:uppercase;border-bottom:2px solid #e2e8f0}.footer{margin-top:24px;padding-top:12px;border-top:1px solid #e2e8f0;text-align:center;color:#94a3b8;font-size:10px}@media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact}.page{padding:16px}}</style>
    </head><body><div class="page">
    <div class="header"><div><h1>Rapport des Promesses de Paiement</h1><p>Imprimé le ${date} • ${promesses.length} promesse(s)${filtreStatut ? ` — filtre : ${STATUT_CONFIG[filtreStatut]?.label || filtreStatut}` : ''}</p></div>
    ${stats ? `<div style="text-align:right"><div style="font-size:11px;color:#64748b">Taux de tenue</div><div style="font-size:24px;font-weight:800;color:${stats.taux_tenue >= 50 ? '#22c55e' : '#ef4444'}">${stats.taux_tenue}%</div></div>` : ''}
    </div>${kpis}
    <div class="section"><div class="section-title">Détail des promesses</div>
    <table><thead><tr><th>Réf. Crédit</th><th>Client</th><th>Statut</th><th style="text-align:right">Promis (FCFA)</th><th style="text-align:right">Reçu (FCFA)</th><th>Date promise</th><th>Commentaire</th></tr></thead><tbody>${rows}</tbody></table></div>
    <div class="footer">Rapport Promesses de Paiement • ${date}</div></div></body></html>`;
    const win = window.open('', '_blank');
    if (!win) return;
    win.document.write(html); win.document.close(); win.onload = () => { win.focus(); win.print(); };
  };

  return (
    <div className="space-y-5">

      {/* ── Stats ───────────────────────────────────────────────────────────── */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
          {[
            { label: 'Total',          value: stats.total,                         accent: '#3b82f6' },
            { label: 'En attente',     value: stats.en_attente,                    accent: '#f59e0b' },
            { label: 'Tenues',         value: stats.tenues,                        accent: '#22c55e' },
            { label: 'Non tenues',     value: stats.non_tenues,                    accent: '#ef4444' },
            { label: 'Taux tenue',     value: `${stats.taux_tenue}%`,              accent: stats.taux_tenue >= 50 ? '#22c55e' : '#ef4444' },
            { label: 'Montant promis', value: `${stats.montant_total_promis.toLocaleString('fr-FR')}`, accent: '#8b5cf6' },
            { label: 'Montant reçu',   value: `${stats.montant_total_recu.toLocaleString('fr-FR')}`,  accent: '#10b981' },
          ].map(k => (
            <div key={k.label} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-center">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-1">{k.label}</p>
              <p className="text-lg font-black tabular-nums truncate" style={{ color: k.accent }}>{k.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* ── Actions ─────────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-3">
        <button onClick={() => setShowForm(!showForm)}
          className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold transition-all ${showForm ? 'border border-white/10 bg-white/5 text-slate-300 hover:bg-white/10' : 'bg-gradient-to-r from-blue-600 to-blue-700 text-white hover:opacity-90'}`}>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={showForm ? 'M6 18L18 6M6 6l12 12' : 'M12 4v16m8-8H4'} /></svg>
          {showForm ? 'Annuler' : 'Nouvelle promesse'}
        </button>

        <button onClick={handleVerifierEchues}
          className="flex items-center gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-2 text-sm font-bold text-amber-400 hover:bg-amber-500/20 transition-all">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          Vérifier échues
        </button>

        <select value={filtreStatut} onChange={e => { setFiltreStatut(e.target.value); setPage(1); }}
          className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white cursor-pointer focus:outline-none focus:border-blue-500/40 transition-all">
          <option value="" className={selectOptionCls}>Tous les statuts</option>
          <option value="en_attente" className={selectOptionCls}>En attente</option>
          <option value="tenue" className={selectOptionCls}>Tenue</option>
          <option value="non_tenue" className={selectOptionCls}>Non tenue</option>
          <option value="annulee" className={selectOptionCls}>Annulée</option>
        </select>

        <button onClick={handlePrintPromesses}
          className="ml-auto flex items-center gap-2 rounded-xl border border-red-500/25 bg-red-500/8 px-4 py-2 text-sm font-bold text-red-400 hover:bg-red-500/15 transition-all">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
          Imprimer rapport
        </button>
      </div>

      {/* ── Formulaire création ─────────────────────────────────────────────── */}
      {showForm && (
        <form onSubmit={handleCreate} className="rounded-2xl border border-blue-500/25 bg-blue-500/5 p-5">
          <p className="text-sm font-bold text-blue-300 mb-4">Nouvelle promesse de paiement</p>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <label className={labelCls}>Réf. crédit *</label>
              <input value={form.ref_credit} onChange={e => setForm({ ...form, ref_credit: e.target.value })} className={inputCls} placeholder="REF-001" required />
            </div>
            <div>
              <label className={labelCls}>Nom client</label>
              <input value={form.nom_client} onChange={e => setForm({ ...form, nom_client: e.target.value })} className={inputCls} placeholder="Nom du client" />
            </div>
            <div>
              <label className={labelCls}>Montant promis (FCFA) *</label>
              <input type="number" value={form.montant_promis} onChange={e => setForm({ ...form, montant_promis: e.target.value })} className={inputCls} placeholder="500000" required />
            </div>
            <div>
              <label className={labelCls}>Date promesse *</label>
              <input type="date" value={form.date_promesse} onChange={e => setForm({ ...form, date_promesse: e.target.value })} className={inputCls} required />
            </div>
            <div className="sm:col-span-2">
              <label className={labelCls}>Commentaire</label>
              <input value={form.commentaire} onChange={e => setForm({ ...form, commentaire: e.target.value })} className={inputCls} placeholder="Détails…" />
            </div>
          </div>
          <div className="mt-4">
            <button type="submit" disabled={loading}
              className="rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-2.5 text-sm font-bold text-white hover:opacity-90 disabled:opacity-50 transition-all">
              {loading ? 'Enregistrement…' : 'Enregistrer'}
            </button>
          </div>
        </form>
      )}

      {/* ── Erreur ──────────────────────────────────────────────────────────── */}
      {error && (
        <div className="flex items-center gap-3 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">{error}</div>
      )}

      {/* ── Table ───────────────────────────────────────────────────────────── */}
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
          <div>
            <h3 className="text-sm font-bold text-white">Liste des promesses</h3>
            <p className="text-[11px] text-slate-500 mt-0.5">{total} promesse{total > 1 ? 's' : ''}</p>
          </div>
          {loading && <div className="flex items-center gap-2 text-xs text-slate-400"><div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-blue-500/30 border-t-blue-400" />Actualisation…</div>}
        </div>

        {loading && promesses.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-slate-400">
            <div className="mb-4 h-10 w-10 animate-spin rounded-full border-[3px] border-blue-500/20 border-t-blue-400" />
            <p className="text-sm">Chargement…</p>
          </div>
        ) : promesses.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-slate-400">
            <p className="text-sm font-semibold text-slate-300">Aucune promesse</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/5">
                    {['Statut','Client','Réf. Crédit','Montant promis','Montant reçu','Date promesse','Date création','Commentaire','Action'].map(h => (
                      <th key={h} className="bg-white/[0.02] px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-slate-500">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {promesses.map((p, idx) => {
                    const sc = STATUT_CONFIG[p.statut] || STATUT_CONFIG.en_attente;
                    const echeance = p.date_promesse ? new Date(p.date_promesse) : null;
                    const isLate = echeance && p.statut === 'en_attente' && echeance < new Date();
                    return (
                      <tr key={p.id} className={`border-b border-white/[0.03] transition-colors hover:bg-white/[0.04] ${idx % 2 !== 0 ? 'bg-white/[0.015]' : ''}`}>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[11px] font-semibold ${sc.bg} ${sc.color} ${sc.border}`}>
                            <span className={`h-1.5 w-1.5 rounded-full ${sc.dot}`} />{sc.label}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm font-medium text-slate-200 max-w-[140px] truncate">{p.nom_client}</td>
                        <td className="px-4 py-3">
                          <span className="rounded-md border border-white/10 bg-white/5 px-2 py-0.5 font-mono text-[11px] font-semibold text-white/80">{p.ref_credit}</span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span className="font-bold text-white/90 tabular-nums">{p.montant_promis.toLocaleString('fr-FR')}</span>
                          <span className="ml-1 text-[10px] text-slate-600">FCFA</span>
                        </td>
                        <td className="px-4 py-3 text-right text-emerald-400 tabular-nums">
                          {p.montant_recu != null ? `${p.montant_recu.toLocaleString('fr-FR')} FCFA` : <span className="text-slate-700">—</span>}
                        </td>
                        <td className={`px-4 py-3 text-xs whitespace-nowrap tabular-nums ${isLate ? 'font-bold text-red-400' : 'text-slate-300'}`}>
                          {p.date_promesse || '—'}
                          {isLate && <span className="ml-1 text-[10px]">⚠</span>}
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-500 tabular-nums">
                          {p.date_creation ? new Date(p.date_creation).toLocaleDateString('fr-FR') : ''}
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-400 max-w-[130px] truncate">{p.commentaire || <span className="text-slate-700">—</span>}</td>
                        <td className="px-4 py-3 text-center">
                          {p.statut === 'en_attente' && (
                            <button onClick={() => setUpdateModal(p)}
                              className="rounded-lg bg-gradient-to-r from-blue-600 to-blue-700 px-3 py-1.5 text-[11px] font-bold text-white hover:opacity-90 transition-all">
                              Mettre à jour
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {total > limit && (
              <div className="border-t border-white/5 px-5 py-3">
                <Pagination currentPage={page} totalItems={total} itemsPerPage={limit} currentItemsCount={promesses.length} onPageChange={p => setPage(p)} />
              </div>
            )}
          </>
        )}
      </div>

      {/* ── Modal MAJ statut ────────────────────────────────────────────────── */}
      {updateModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm" onClick={() => setUpdateModal(null)}>
          <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#1e293b] p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
            <h3 className="mb-1 text-base font-bold text-white">Mettre à jour</h3>
            <p className="mb-5 text-xs text-slate-400">{updateModal.nom_client} — {updateModal.montant_promis.toLocaleString('fr-FR')} FCFA le {updateModal.date_promesse}</p>

            <div className="space-y-4">
              <div>
                <label className={labelCls}>Nouveau statut</label>
                <select value={updateStatut} onChange={e => setUpdateStatut(e.target.value)} className={inputCls + ' cursor-pointer'}>
                  <option value="" className={selectOptionCls}>Choisir…</option>
                  <option value="tenue" className={selectOptionCls}>Tenue</option>
                  <option value="non_tenue" className={selectOptionCls}>Non tenue</option>
                  <option value="annulee" className={selectOptionCls}>Annulée</option>
                </select>
              </div>
              {updateStatut === 'tenue' && (
                <div>
                  <label className={labelCls}>Montant reçu (FCFA)</label>
                  <input type="number" value={updateMontant} onChange={e => setUpdateMontant(e.target.value)} className={inputCls} placeholder={String(updateModal.montant_promis)} />
                </div>
              )}
              <div>
                <label className={labelCls}>Commentaire</label>
                <input value={updateComment} onChange={e => setUpdateComment(e.target.value)} className={inputCls} placeholder="Note…" />
              </div>
            </div>

            <div className="mt-5 flex justify-end gap-3">
              <button onClick={() => setUpdateModal(null)} className="rounded-xl border border-white/10 bg-white/5 px-5 py-2 text-sm font-semibold text-slate-300 hover:bg-white/10 transition-colors">Annuler</button>
              <button onClick={handleUpdateStatut} disabled={!updateStatut}
                className={`rounded-xl px-5 py-2 text-sm font-bold text-white transition-all ${updateStatut ? 'bg-gradient-to-r from-blue-600 to-blue-700 hover:opacity-90' : 'bg-slate-700 opacity-50 cursor-not-allowed'}`}>
                Confirmer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PromessesTab;
