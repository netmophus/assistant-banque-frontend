'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useResponsive } from '@/hooks/useResponsive';
import Pagination from '@/components/common/Pagination';
import { apiClient } from '@/lib/api/client';

interface Snapshot {
  id: string;
  telephone_client?: string;
  ref_credit: string;
  nom_client: string;
  montant_total_impaye?: number;
  jours_retard: number;
  bucket_retard: string;
  statut_reglementaire: string;
  segment: string;
  agence: string;
  produit: string;
  gestionnaire?: string;
  candidat_restructuration: boolean;
  statut_restructuration?: string;
  date_restructuration?: string;
  commentaire_restructuration?: string;
  restructure_par?: string;
  created_at: string;
}

interface Filtres {
  date_situation: string;
  agence: string;
  segment: string;
  bucket_retard: string;
  candidat_restructuration: boolean | null;
}

const BUCKET_CONFIG: Record<string, { label: string; color: string; bg: string; border: string; dot: string }> = {
  'Retard léger':                    { label: 'Retard léger',    color: 'text-amber-400',  bg: 'bg-amber-500/10',  border: 'border-amber-500/25',  dot: 'bg-amber-400' },
  'Retard significatif':             { label: 'Significatif',    color: 'text-orange-400', bg: 'bg-orange-500/10', border: 'border-orange-500/25', dot: 'bg-orange-400' },
  'Zone critique / à restructurer':  { label: 'Zone critique',   color: 'text-red-400',    bg: 'bg-red-500/10',    border: 'border-red-500/25',    dot: 'bg-red-400' },
  'Douteux / NPL':                   { label: 'Douteux / NPL',   color: 'text-rose-400',   bg: 'bg-rose-600/10',   border: 'border-rose-600/25',   dot: 'bg-rose-400' },
};

const SEGMENT_CONFIG: Record<string, { color: string; bg: string }> = {
  'PARTICULIER': { color: 'text-blue-400',   bg: 'bg-blue-500/10' },
  'PME':         { color: 'text-violet-400', bg: 'bg-violet-500/10' },
  'PMI':         { color: 'text-indigo-400', bg: 'bg-indigo-500/10' },
};

const retardColor = (j: number) =>
  j >= 90 ? 'bg-rose-500/15 text-rose-300 border-rose-500/20' :
  j >= 60 ? 'bg-red-500/15 text-red-300 border-red-500/20' :
  j >= 30 ? 'bg-orange-500/15 text-orange-300 border-orange-500/20' :
            'bg-amber-500/15 text-amber-300 border-amber-500/20';

// ── SVG Icons ────────────────────────────────────────────────────────────────
const IcDossier = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
  </svg>
);
const IcMoney = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);
const IcClock = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);
const IcRefresh = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
  </svg>
);
const IcFilter = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2a1 1 0 01-.293.707L13 13.414V19a1 1 0 01-.553.894l-4 2A1 1 0 017 21v-7.586L3.293 6.707A1 1 0 013 6V4z" />
  </svg>
);
const IcChevron = ({ open }: { open: boolean }) => (
  <svg className={`w-4 h-4 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
  </svg>
);
const IcSearch = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
  </svg>
);

// ── Component ─────────────────────────────────────────────────────────────────
const ListeTab = () => {
  const { isMobile } = useResponsive();
  const [loading, setLoading]           = useState(false);
  const [error, setError]               = useState('');
  const [availableDates, setAvailableDates] = useState<string[]>([]);
  const [snapshots, setSnapshots]       = useState<Snapshot[]>([]);
  const [snapshotsTotal, setSnapshotsTotal] = useState(0);
  const [snapshotsPage, setSnapshotsPage]   = useState(1);
  const [showFilters, setShowFilters]   = useState(true);
  const snapshotsLimit = 20;

  const [filtres, setFiltres] = useState<Filtres>({
    date_situation: '', agence: '', segment: '', bucket_retard: '', candidat_restructuration: null,
  });

  const getAuthHeaders = (): HeadersInit => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    return { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) };
  };

  useEffect(() => { loadAvailableDates(); }, []);
  useEffect(() => { loadSnapshots(); }, [snapshotsPage, filtres]);
  useEffect(() => {
    const handler = () => { loadAvailableDates(); loadSnapshots(); };
    window.addEventListener('dataImported', handler as EventListener);
    return () => window.removeEventListener('dataImported', handler as EventListener);
  }, [snapshotsPage, filtres]);

  const loadAvailableDates = async () => {
    try {
      const r = await fetch('/api/impayes/dates-situation', { headers: getAuthHeaders() });
      if (!r.ok) throw new Error('Erreur chargement dates');
      const d = await r.json();
      setAvailableDates(d.dates || []);
    } catch (e: any) { setError(e.message); }
  };

  const loadSnapshots = async () => {
    setLoading(true); setError('');
    try {
      const p = new URLSearchParams({ limit: snapshotsLimit.toString(), skip: ((snapshotsPage - 1) * snapshotsLimit).toString() });
      if (filtres.date_situation) p.append('date_situation', filtres.date_situation);
      if (filtres.agence)         p.append('agence', filtres.agence);
      if (filtres.segment)        p.append('segment', filtres.segment);
      if (filtres.bucket_retard)  p.append('bucket_retard', filtres.bucket_retard);
      if (filtres.candidat_restructuration !== null) p.append('candidat_restructuration', filtres.candidat_restructuration.toString());
      const data = await apiClient.get(`/impayes/snapshots?${p}`) as any;
      const rows = Array.isArray(data.data?.snapshots) ? data.data.snapshots : (Array.isArray(data.data) ? data.data : (Array.isArray(data.snapshots) ? data.snapshots : []));
      setSnapshots(rows);
      setSnapshotsTotal(data.total || rows.length);
    } catch (e: any) { setError(e.message || 'Erreur chargement'); }
    finally { setLoading(false); }
  };

  const kpis = useMemo(() => {
    const totalMontant = snapshots.reduce((s, r) => s + (r.montant_total_impaye || 0), 0);
    const avgJours = snapshots.length > 0 ? Math.round(snapshots.reduce((s, r) => s + r.jours_retard, 0) / snapshots.length) : 0;
    const candidats = snapshots.filter(r => r.candidat_restructuration).length;
    return { totalMontant, avgJours, candidats };
  }, [snapshots]);

  const resetFiltres = () => { setFiltres({ date_situation: '', agence: '', segment: '', bucket_retard: '', candidat_restructuration: null }); setSnapshotsPage(1); };
  const hasActive = !!(filtres.date_situation || filtres.agence || filtres.segment || filtres.bucket_retard || filtres.candidat_restructuration !== null);

  const setF = (patch: Partial<Filtres>) => { setFiltres(f => ({ ...f, ...patch })); setSnapshotsPage(1); };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-5">

      {/* ── KPI Cards ───────────────────────────────────────────────────────── */}
      <div className={`grid gap-4 ${isMobile ? 'grid-cols-2' : 'grid-cols-4'}`}>
        {[
          { label: 'Total dossiers',    value: snapshotsTotal.toLocaleString('fr-FR'), sub: 'résultats trouvés',  icon: <IcDossier />, accent: '#d32f2f', ring: 'border-[#d32f2f]/20', glow: 'from-[#d32f2f]/8' },
          { label: 'Montant page',      value: kpis.totalMontant.toLocaleString('fr-FR'), sub: 'FCFA',           icon: <IcMoney />,   accent: '#f59e0b', ring: 'border-amber-500/20',  glow: 'from-amber-500/8' },
          { label: 'Retard moyen',      value: `${kpis.avgJours}`,                     sub: 'jours',            icon: <IcClock />,   accent: '#f97316', ring: 'border-orange-500/20', glow: 'from-orange-500/8' },
          { label: 'Candidats restruct.', value: `${kpis.candidats}`,                  sub: 'sur cette page',   icon: <IcRefresh />, accent: '#a855f7', ring: 'border-purple-500/20', glow: 'from-purple-500/8' },
        ].map((k) => (
          <div key={k.label} className={`relative overflow-hidden rounded-2xl border ${k.ring} bg-gradient-to-br ${k.glow} to-transparent p-5 backdrop-blur-sm`}>
            {/* Glow orb */}
            <div className="absolute -right-4 -top-4 h-20 w-20 rounded-full opacity-20" style={{ background: k.accent, filter: 'blur(20px)' }} />
            <div className="relative">
              <div className="mb-3 inline-flex items-center justify-center rounded-xl p-2" style={{ background: `${k.accent}20`, color: k.accent }}>
                {k.icon}
              </div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">{k.label}</p>
              <p className="mt-1 text-2xl font-black text-white tabular-nums">{k.value}</p>
              <p className="mt-0.5 text-[11px] text-slate-500">{k.sub}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Filtres ─────────────────────────────────────────────────────────── */}
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur-md overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/5">
          <button
            onClick={() => setShowFilters(v => !v)}
            className="flex items-center gap-2 text-sm font-semibold text-white/80 hover:text-white transition-colors"
          >
            <span className="text-slate-400"><IcFilter /></span>
            <span>Filtres</span>
            {hasActive && (
              <span className="inline-flex items-center rounded-full bg-[#d32f2f]/20 border border-[#d32f2f]/30 px-2 py-0.5 text-[10px] font-bold text-[#f44336]">
                {[filtres.date_situation, filtres.agence, filtres.segment, filtres.bucket_retard, filtres.candidat_restructuration !== null ? '1' : ''].filter(Boolean).length} actifs
              </span>
            )}
            <IcChevron open={showFilters} />
          </button>

          <div className="flex items-center gap-3">
            {hasActive && (
              <button onClick={resetFiltres} className="text-xs text-slate-500 hover:text-white transition-colors underline underline-offset-2">
                Effacer tout
              </button>
            )}
            <select
              value={filtres.date_situation}
              onChange={e => setF({ date_situation: e.target.value })}
              className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white cursor-pointer focus:outline-none focus:border-[#d32f2f]/50 focus:ring-1 focus:ring-[#d32f2f]/20 transition-all"
            >
              <option value="" className="bg-[#0f1629]">Toutes les dates</option>
              {availableDates.map(d => <option key={d} value={d} className="bg-[#0f1629]">{d}</option>)}
            </select>
          </div>
        </div>

        {/* Body */}
        {showFilters && (
          <div className={`grid gap-4 p-5 ${isMobile ? 'grid-cols-1' : 'grid-cols-4'}`}>
            {/* Agence */}
            <div className="space-y-1.5">
              <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500">Agence</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"><IcSearch /></span>
                <input
                  type="text"
                  value={filtres.agence}
                  onChange={e => setF({ agence: e.target.value })}
                  placeholder="Rechercher..."
                  className="w-full rounded-xl border border-white/10 bg-white/5 pl-9 pr-3 py-2 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-[#d32f2f]/40 focus:ring-1 focus:ring-[#d32f2f]/20 transition-all"
                />
              </div>
            </div>
            {/* Segment */}
            <div className="space-y-1.5">
              <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500">Segment</label>
              <select
                value={filtres.segment}
                onChange={e => setF({ segment: e.target.value })}
                className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white cursor-pointer focus:outline-none focus:border-[#d32f2f]/40 focus:ring-1 focus:ring-[#d32f2f]/20 transition-all"
              >
                <option value="" className="bg-[#0f1629]">Tous les segments</option>
                <option value="PARTICULIER" className="bg-[#0f1629]">Particulier</option>
                <option value="PME" className="bg-[#0f1629]">PME</option>
                <option value="PMI" className="bg-[#0f1629]">PMI</option>
              </select>
            </div>
            {/* Tranche */}
            <div className="space-y-1.5">
              <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500">Tranche de retard</label>
              <select
                value={filtres.bucket_retard}
                onChange={e => setF({ bucket_retard: e.target.value })}
                className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white cursor-pointer focus:outline-none focus:border-[#d32f2f]/40 focus:ring-1 focus:ring-[#d32f2f]/20 transition-all"
              >
                <option value="" className="bg-[#0f1629]">Toutes les tranches</option>
                <option value="Retard léger" className="bg-[#0f1629]">Retard léger</option>
                <option value="Retard significatif" className="bg-[#0f1629]">Retard significatif</option>
                <option value="Zone critique / à restructurer" className="bg-[#0f1629]">Zone critique</option>
                <option value="Douteux / NPL" className="bg-[#0f1629]">Douteux / NPL</option>
              </select>
            </div>
            {/* Candidat */}
            <div className="space-y-1.5">
              <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500">Restructuration</label>
              <select
                value={filtres.candidat_restructuration === null ? '' : filtres.candidat_restructuration ? 'true' : 'false'}
                onChange={e => setF({ candidat_restructuration: e.target.value === '' ? null : e.target.value === 'true' })}
                className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white cursor-pointer focus:outline-none focus:border-[#d32f2f]/40 focus:ring-1 focus:ring-[#d32f2f]/20 transition-all"
              >
                <option value="" className="bg-[#0f1629]">Tous</option>
                <option value="true" className="bg-[#0f1629]">Candidats uniquement</option>
                <option value="false" className="bg-[#0f1629]">Non candidats</option>
              </select>
            </div>
          </div>
        )}
      </div>

      {/* ── Erreur ──────────────────────────────────────────────────────────── */}
      {error && (
        <div className="flex items-center gap-3 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
          </svg>
          {error}
        </div>
      )}

      {/* ── Tableau ─────────────────────────────────────────────────────────── */}
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur-md overflow-hidden">
        {/* Header tableau */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
          <div>
            <h3 className="text-sm font-bold text-white">Liste des crédits</h3>
            <p className="text-[11px] text-slate-500 mt-0.5">{snapshotsTotal.toLocaleString('fr-FR')} résultat{snapshotsTotal > 1 ? 's' : ''}</p>
          </div>
          {loading && (
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-[#d32f2f]/30 border-t-[#d32f2f]" />
              Actualisation...
            </div>
          )}
        </div>

        {/* États vides / chargement */}
        {loading && snapshots.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400">
            <div className="mb-4 h-10 w-10 animate-spin rounded-full border-[3px] border-[#d32f2f]/20 border-t-[#d32f2f]" />
            <p className="text-sm font-medium">Chargement des dossiers…</p>
          </div>
        ) : snapshots.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-white/10 bg-white/5">
              <svg className="w-7 h-7 opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <p className="text-sm font-semibold text-slate-300">Aucun crédit trouvé</p>
            <p className="mt-1 text-xs text-slate-500">Ajustez les filtres pour afficher des résultats</p>
            {hasActive && (
              <button onClick={resetFiltres} className="mt-4 rounded-lg border border-white/10 bg-white/5 px-4 py-1.5 text-xs text-white hover:bg-white/10 transition-colors">
                Réinitialiser les filtres
              </button>
            )}
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/5">
                    <th className="bg-white/[0.02] px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-slate-500">Téléphone</th>
                    <th className="bg-white/[0.02] px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-slate-500">Réf. Crédit</th>
                    <th className="bg-white/[0.02] px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-slate-500">Client</th>
                    <th className="bg-white/[0.02] px-4 py-3 text-right text-[10px] font-bold uppercase tracking-widest text-slate-500">Montant</th>
                    <th className="bg-white/[0.02] px-4 py-3 text-center text-[10px] font-bold uppercase tracking-widest text-slate-500">Retard</th>
                    <th className="bg-white/[0.02] px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-slate-500">Tranche</th>
                    <th className="bg-white/[0.02] px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-slate-500">Segment</th>
                    <th className="bg-white/[0.02] px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-slate-500">Agence</th>
                    <th className="bg-white/[0.02] px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-slate-500">Gestionnaire</th>
                    <th className="bg-white/[0.02] px-4 py-3 text-center text-[10px] font-bold uppercase tracking-widest text-slate-500">Restruct.</th>
                  </tr>
                </thead>
                <tbody>
                  {snapshots.map((s, idx) => {
                    const bucket  = BUCKET_CONFIG[s.bucket_retard]  || { label: s.bucket_retard, color: 'text-slate-400', bg: 'bg-slate-500/10', border: 'border-slate-500/20', dot: 'bg-slate-400' };
                    const segment = SEGMENT_CONFIG[s.segment] || { color: 'text-slate-400', bg: 'bg-slate-500/10' };
                    return (
                      <tr
                        key={s.id}
                        className={`group border-b border-white/[0.03] transition-colors duration-100 hover:bg-white/[0.04] ${idx % 2 !== 0 ? 'bg-white/[0.015]' : ''}`}
                      >
                        {/* Téléphone */}
                        <td className="px-4 py-3 font-mono text-xs text-slate-400">
                          {s.telephone_client || <span className="text-slate-700">—</span>}
                        </td>
                        {/* Réf */}
                        <td className="px-4 py-3">
                          <span className="rounded-md bg-white/5 border border-white/10 px-2 py-0.5 font-mono text-[11px] font-semibold text-white/90 group-hover:border-white/20 transition-colors">
                            {s.ref_credit}
                          </span>
                        </td>
                        {/* Client */}
                        <td className="px-4 py-3 max-w-[180px]">
                          <span className="block truncate text-sm text-slate-200 font-medium">{s.nom_client}</span>
                        </td>
                        {/* Montant */}
                        <td className="px-4 py-3 text-right">
                          <span className="font-bold text-white/90 tabular-nums">
                            {(s.montant_total_impaye || 0).toLocaleString('fr-FR')}
                          </span>
                          <span className="ml-1 text-[10px] text-slate-600">FCFA</span>
                        </td>
                        {/* Retard */}
                        <td className="px-4 py-3 text-center">
                          <span className={`inline-flex items-center justify-center rounded-full border px-2.5 py-0.5 text-[11px] font-bold tabular-nums ${retardColor(s.jours_retard)}`}>
                            {s.jours_retard}j
                          </span>
                        </td>
                        {/* Tranche */}
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[11px] font-semibold ${bucket.bg} ${bucket.color} ${bucket.border}`}>
                            <span className={`inline-block h-1.5 w-1.5 rounded-full ${bucket.dot}`} />
                            {bucket.label}
                          </span>
                        </td>
                        {/* Segment */}
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center rounded-lg px-2.5 py-1 text-[11px] font-semibold ${segment.bg} ${segment.color}`}>
                            {s.segment}
                          </span>
                        </td>
                        {/* Agence */}
                        <td className="px-4 py-3 text-xs text-slate-300">{s.agence}</td>
                        {/* Gestionnaire */}
                        <td className="px-4 py-3 text-xs text-slate-400">
                          {s.gestionnaire || <span className="text-slate-700">—</span>}
                        </td>
                        {/* Restruct */}
                        <td className="px-4 py-3 text-center">
                          {s.candidat_restructuration ? (
                            <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/25 bg-amber-500/10 px-2.5 py-0.5 text-[10px] font-bold text-amber-400">
                              <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
                              Oui
                            </span>
                          ) : (
                            <span className="text-[11px] text-slate-700">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {snapshotsTotal > snapshotsLimit && (
              <div className="border-t border-white/5 px-5 py-3">
                <Pagination
                  currentPage={snapshotsPage}
                  totalItems={snapshotsTotal}
                  itemsPerPage={snapshotsLimit}
                  currentItemsCount={snapshots.length}
                  onPageChange={(page) => { setSnapshotsPage(page); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default ListeTab;
