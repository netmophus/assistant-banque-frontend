'use client';

import React, { useState, useEffect } from 'react';
import { apiClient } from '@/lib/api/client';

interface ScoreItem {
  ref_credit: string;
  nom_client: string;
  score: number;
  niveau_risque: string;
  couleur: string;
  facteurs: Record<string, number>;
  recommandation: string;
  montant_impaye: number;
  jours_retard: number;
  agence: string;
  segment: string;
}

const FACTEUR_LABELS: Record<string, string> = {
  jours_retard:          'Jours de retard',
  ratio_impaye:          'Ratio impayé/encours',
  garanties:             'Garanties',
  joignabilite:          'Joignabilité',
  historique_promesses:  'Historique promesses',
  echeances_impayees:    'Échéances impayées',
};

const NIVEAU_LABELS: Record<string, string> = {
  faible:   'Risque faible',
  moyen:    'Risque moyen',
  eleve:    'Risque élevé',
  critique: 'Risque critique',
};

const NIVEAU_COLORS: Record<string, { text: string; bg: string; border: string; dot: string }> = {
  faible:   { text: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/25', dot: 'bg-emerald-400' },
  moyen:    { text: 'text-amber-400',   bg: 'bg-amber-500/10',   border: 'border-amber-500/25',   dot: 'bg-amber-400' },
  eleve:    { text: 'text-red-400',     bg: 'bg-red-500/10',     border: 'border-red-500/25',     dot: 'bg-red-400' },
  critique: { text: 'text-rose-400',    bg: 'bg-rose-600/10',    border: 'border-rose-600/25',    dot: 'bg-rose-500' },
};

const ScoringTab = () => {
  const [loading, setLoading]         = useState(false);
  const [error, setError]             = useState('');
  const [scores, setScores]           = useState<ScoreItem[]>([]);
  const [expandedRef, setExpandedRef] = useState<string | null>(null);
  const [filtreNiveau, setFiltreNiveau] = useState('');
  const [filtreAgence, setFiltreAgence] = useState('');
  const [search, setSearch]           = useState('');

  useEffect(() => { loadScores(); }, []);

  const loadScores = async () => {
    setLoading(true); setError('');
    try {
      const data = await apiClient.get<ScoreItem[]>('/impayes/scoring');
      setScores(data || []);
    } catch (err: any) {
      setError(err.message || 'Erreur chargement');
    } finally {
      setLoading(false);
    }
  };

  const filtered = scores.filter((s) => {
    if (filtreNiveau && s.niveau_risque !== filtreNiveau) return false;
    if (filtreAgence && s.agence !== filtreAgence) return false;
    if (search) {
      const q = search.toLowerCase();
      if (!s.nom_client.toLowerCase().includes(q) && !s.ref_credit.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  const agences = [...new Set(scores.map(s => s.agence))].sort();

  const statsNiveau = {
    faible:   scores.filter(s => s.niveau_risque === 'faible').length,
    moyen:    scores.filter(s => s.niveau_risque === 'moyen').length,
    eleve:    scores.filter(s => s.niveau_risque === 'eleve').length,
    critique: scores.filter(s => s.niveau_risque === 'critique').length,
  };

  const scoreMoyen = scores.length > 0
    ? Math.round(scores.reduce((sum, s) => sum + s.score, 0) / scores.length)
    : 0;

  return (
    <div className="space-y-5">

      {/* ── KPI Cards ───────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {[
          { label: 'Score moyen',  value: `${scoreMoyen}/100`, accent: '#3b82f6', border: 'border-blue-500/20',    glow: 'from-blue-500/8' },
          { label: 'Faible',       value: statsNiveau.faible,  accent: '#22c55e', border: 'border-emerald-500/20', glow: 'from-emerald-500/8' },
          { label: 'Moyen',        value: statsNiveau.moyen,   accent: '#f59e0b', border: 'border-amber-500/20',   glow: 'from-amber-500/8' },
          { label: 'Élevé',        value: statsNiveau.eleve,   accent: '#ef4444', border: 'border-red-500/20',     glow: 'from-red-500/8' },
          { label: 'Critique',     value: statsNiveau.critique,accent: '#f43f5e', border: 'border-rose-600/20',    glow: 'from-rose-600/8' },
        ].map(k => (
          <div key={k.label} className={`relative overflow-hidden rounded-2xl border ${k.border} bg-gradient-to-br ${k.glow} to-transparent p-4`}>
            <div className="absolute -right-3 -top-3 h-14 w-14 rounded-full opacity-20" style={{ background: k.accent, filter: 'blur(16px)' }} />
            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">{k.label}</p>
            <p className="mt-1 text-xl font-black tabular-nums" style={{ color: k.accent }}>{k.value}</p>
          </div>
        ))}
      </div>

      {/* ── Filtres ─────────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[180px]">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Rechercher client ou référence…"
            className="w-full rounded-xl border border-white/10 bg-white/5 pl-9 pr-3 py-2 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-[#d32f2f]/40 focus:ring-1 focus:ring-[#d32f2f]/20 transition-all"
          />
        </div>
        <select value={filtreNiveau} onChange={e => setFiltreNiveau(e.target.value)}
          className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white cursor-pointer focus:outline-none focus:border-[#d32f2f]/40 transition-all">
          <option value="" className="bg-[#0f1629]">Tous les niveaux</option>
          <option value="faible" className="bg-[#0f1629]">Faible</option>
          <option value="moyen" className="bg-[#0f1629]">Moyen</option>
          <option value="eleve" className="bg-[#0f1629]">Élevé</option>
          <option value="critique" className="bg-[#0f1629]">Critique</option>
        </select>
        <select value={filtreAgence} onChange={e => setFiltreAgence(e.target.value)}
          className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white cursor-pointer focus:outline-none focus:border-[#d32f2f]/40 transition-all">
          <option value="" className="bg-[#0f1629]">Toutes les agences</option>
          {agences.map(a => <option key={a} value={a} className="bg-[#0f1629]">{a}</option>)}
        </select>
        <span className="text-xs text-slate-500">{filtered.length} dossier{filtered.length > 1 ? 's' : ''}</span>
      </div>

      {/* ── Erreur ──────────────────────────────────────────────────────────── */}
      {error && (
        <div className="flex items-center gap-3 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">{error}</div>
      )}

      {/* ── Liste ───────────────────────────────────────────────────────────── */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-16 text-slate-400">
          <div className="mb-4 h-10 w-10 animate-spin rounded-full border-[3px] border-[#d32f2f]/20 border-t-[#d32f2f]" />
          <p className="text-sm">Calcul des scores…</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-slate-400">
          <p className="text-sm font-semibold text-slate-300">Aucun dossier</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(s => {
            const nc = NIVEAU_COLORS[s.niveau_risque] || NIVEAU_COLORS.moyen;
            const isOpen = expandedRef === s.ref_credit;
            return (
              <div
                key={s.ref_credit}
                className="overflow-hidden rounded-2xl border border-white/[0.07] bg-white/[0.03] transition-all duration-200 hover:border-white/15 cursor-pointer"
                style={{ borderLeft: `3px solid ${s.couleur}` }}
                onClick={() => setExpandedRef(isOpen ? null : s.ref_credit)}
              >
                {/* Row */}
                <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3.5">
                  <div className="flex items-center gap-3">
                    <div>
                      <span className="font-bold text-white">{s.nom_client}</span>
                      <span className="ml-2 font-mono text-xs text-slate-500">{s.ref_credit}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="text-xs text-slate-400">{s.agence}</span>
                    <span className="text-xs text-slate-400">{s.montant_impaye.toLocaleString('fr-FR')} FCFA</span>
                    <span className="text-xs text-slate-400">{s.jours_retard}j</span>
                    {/* Score badge */}
                    <div className={`flex items-center gap-2 rounded-full border px-3 py-1 ${nc.bg} ${nc.border}`}>
                      {/* Donut */}
                      <div className="relative h-7 w-7 shrink-0">
                        <svg className="h-7 w-7 -rotate-90" viewBox="0 0 36 36">
                          <circle cx="18" cy="18" r="15" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="3" />
                          <circle cx="18" cy="18" r="15" fill="none" stroke={s.couleur} strokeWidth="3"
                            strokeDasharray={`${s.score * 0.942} 94.2`} strokeLinecap="round" />
                        </svg>
                        <span className="absolute inset-0 flex items-center justify-center text-[9px] font-black text-white">{s.score}</span>
                      </div>
                      <span className={`text-xs font-bold ${nc.text}`}>{NIVEAU_LABELS[s.niveau_risque] || s.niveau_risque}</span>
                    </div>
                    <svg className={`w-4 h-4 text-slate-500 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>

                {/* Expanded */}
                {isOpen && (
                  <div className="border-t border-white/5 bg-white/[0.02] px-4 py-4">
                    <p className="mb-4 text-xs italic text-slate-400 leading-relaxed">{s.recommandation}</p>
                    <div className="grid gap-2 sm:grid-cols-2">
                      {Object.entries(s.facteurs).map(([key, val]) => (
                        <div key={key} className="flex items-center gap-3">
                          <span className="w-36 shrink-0 text-[11px] text-slate-500">{FACTEUR_LABELS[key] || key}</span>
                          <div className="flex-1 h-2 rounded-full bg-white/[0.08] overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all duration-500"
                              style={{ width: `${val}%`, background: val >= 70 ? '#22c55e' : val >= 40 ? '#f59e0b' : '#ef4444' }}
                            />
                          </div>
                          <span className="w-7 text-right text-[11px] text-slate-400 tabular-nums">{val}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ScoringTab;
