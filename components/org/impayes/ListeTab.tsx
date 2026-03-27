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

const getBucketBadge = (bucket: string) => {
  const map: Record<string, { bg: string; text: string; border: string }> = {
    'Retard léger': { bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/30' },
    'Retard significatif': { bg: 'bg-orange-500/10', text: 'text-orange-400', border: 'border-orange-500/30' },
    'Zone critique / à restructurer': { bg: 'bg-red-500/10', text: 'text-red-400', border: 'border-red-500/30' },
    'Douteux / NPL': { bg: 'bg-rose-600/10', text: 'text-rose-400', border: 'border-rose-600/30' },
  };
  return map[bucket] || { bg: 'bg-slate-500/10', text: 'text-slate-400', border: 'border-slate-500/30' };
};

const getSegmentBadge = (segment: string) => {
  const map: Record<string, { bg: string; text: string }> = {
    'PARTICULIER': { bg: 'bg-blue-500/10', text: 'text-blue-400' },
    'PME': { bg: 'bg-purple-500/10', text: 'text-purple-400' },
    'PMI': { bg: 'bg-indigo-500/10', text: 'text-indigo-400' },
  };
  return map[segment] || { bg: 'bg-slate-500/10', text: 'text-slate-400' };
};

const ListeTab = () => {
  const { isMobile } = useResponsive();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [availableDates, setAvailableDates] = useState<string[]>([]);
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const [snapshotsTotal, setSnapshotsTotal] = useState(0);
  const [snapshotsPage, setSnapshotsPage] = useState(1);
  const snapshotsLimit = 20;
  const [filtres, setFiltres] = useState<Filtres>({
    date_situation: '',
    agence: '',
    segment: '',
    bucket_retard: '',
    candidat_restructuration: null,
  });

  const getAuthHeaders = (): HeadersInit => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
  };

  useEffect(() => {
    loadAvailableDates();
  }, []);

  useEffect(() => {
    loadSnapshots();
  }, [snapshotsPage, filtres]);

  // Écouter les événements d'import pour recharger les données
  useEffect(() => {
    const handleDataImported = () => {
      loadAvailableDates();
      loadSnapshots();
    };

    window.addEventListener('dataImported', handleDataImported as EventListener);
    
    return () => {
      window.removeEventListener('dataImported', handleDataImported as EventListener);
    };
  }, [snapshotsPage, filtres]);

  const loadAvailableDates = async () => {
    try {
      const response = await fetch('/api/impayes/dates-situation', {
        headers: getAuthHeaders(),
      });

      if (!response.ok) {
        throw new Error('Erreur lors du chargement des dates');
      }

      const data = await response.json();
      setAvailableDates(data.dates || []);
    } catch (err: any) {
      setError(err.message || 'Erreur lors du chargement des dates');
    }
  };

  const loadSnapshots = async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({
        limit: snapshotsLimit.toString(),
        skip: ((snapshotsPage - 1) * snapshotsLimit).toString(),
      });

      if (filtres.date_situation) params.append('date_situation', filtres.date_situation);
      if (filtres.agence) params.append('agence', filtres.agence);
      if (filtres.segment) params.append('segment', filtres.segment);
      if (filtres.bucket_retard) params.append('bucket_retard', filtres.bucket_retard);
      if (filtres.candidat_restructuration !== null) {
        params.append('candidat_restructuration', filtres.candidat_restructuration.toString());
      }

      const data = await apiClient.get(`/impayes/snapshots?${params}`) as any;
      const snapshotsData = Array.isArray(data.data?.snapshots) ? data.data.snapshots : (Array.isArray(data.data) ? data.data : (Array.isArray(data.snapshots) ? data.snapshots : []));
      setSnapshots(snapshotsData);
      setSnapshotsTotal(data.total || snapshotsData.length);
    } catch (err: any) {
      setError(err.message || 'Erreur lors du chargement des crédits');
    } finally {
      setLoading(false);
    }
  };

  const [showFilters, setShowFilters] = useState(true);

  const kpis = useMemo(() => {
    const totalMontant = snapshots.reduce((sum, s) => sum + (s.montant_total_impaye || 0), 0);
    const avgJours = snapshots.length > 0
      ? Math.round(snapshots.reduce((sum, s) => sum + s.jours_retard, 0) / snapshots.length)
      : 0;
    const candidats = snapshots.filter(s => s.candidat_restructuration).length;
    return { totalMontant, avgJours, candidats };
  }, [snapshots]);

  const resetFiltres = () => {
    setFiltres({ date_situation: '', agence: '', segment: '', bucket_retard: '', candidat_restructuration: null });
    setSnapshotsPage(1);
  };

  const hasActiveFilters = filtres.date_situation || filtres.agence || filtres.segment || filtres.bucket_retard || filtres.candidat_restructuration !== null;

  return (
    <div className="space-y-5">

      {/* KPI Cards */}
      <div className={`grid ${isMobile ? 'grid-cols-2' : 'grid-cols-4'} gap-4`}>
        <div className="relative overflow-hidden rounded-2xl border border-[#d32f2f]/20 bg-gradient-to-br from-[#d32f2f]/5 to-transparent p-5 backdrop-blur-sm">
          <div className="absolute -right-3 -top-3 h-16 w-16 rounded-full bg-[#d32f2f]/10" />
          <p className="text-xs font-medium uppercase tracking-wider text-slate-400">Total crédits</p>
          <p className="mt-1 text-2xl font-bold text-white">{snapshotsTotal.toLocaleString('fr-FR')}</p>
          <p className="mt-1 text-xs text-slate-500">dossiers trouvés</p>
        </div>
        <div className="relative overflow-hidden rounded-2xl border border-amber-500/20 bg-gradient-to-br from-amber-500/5 to-transparent p-5 backdrop-blur-sm">
          <div className="absolute -right-3 -top-3 h-16 w-16 rounded-full bg-amber-500/10" />
          <p className="text-xs font-medium uppercase tracking-wider text-slate-400">Montant page</p>
          <p className="mt-1 text-2xl font-bold text-amber-400">{kpis.totalMontant.toLocaleString('fr-FR')}</p>
          <p className="mt-1 text-xs text-slate-500">FCFA</p>
        </div>
        <div className="relative overflow-hidden rounded-2xl border border-orange-500/20 bg-gradient-to-br from-orange-500/5 to-transparent p-5 backdrop-blur-sm">
          <div className="absolute -right-3 -top-3 h-16 w-16 rounded-full bg-orange-500/10" />
          <p className="text-xs font-medium uppercase tracking-wider text-slate-400">Retard moyen</p>
          <p className="mt-1 text-2xl font-bold text-orange-400">{kpis.avgJours}</p>
          <p className="mt-1 text-xs text-slate-500">jours</p>
        </div>
        <div className="relative overflow-hidden rounded-2xl border border-purple-500/20 bg-gradient-to-br from-purple-500/5 to-transparent p-5 backdrop-blur-sm">
          <div className="absolute -right-3 -top-3 h-16 w-16 rounded-full bg-purple-500/10" />
          <p className="text-xs font-medium uppercase tracking-wider text-slate-400">Candidats restruct.</p>
          <p className="mt-1 text-2xl font-bold text-purple-400">{kpis.candidats}</p>
          <p className="mt-1 text-xs text-slate-500">sur cette page</p>
        </div>
      </div>

      {/* Filtres */}
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur-md overflow-hidden">
        {/* Header filtres */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2 text-white font-semibold text-sm hover:text-[#f44336] transition-colors"
          >
            <span className="text-lg">{showFilters ? '▾' : '▸'}</span>
            <span>Filtres</span>
            {hasActiveFilters && (
              <span className="ml-2 inline-flex items-center rounded-full bg-[#d32f2f]/20 px-2 py-0.5 text-[10px] font-bold text-[#f44336] border border-[#d32f2f]/30">
                Actifs
              </span>
            )}
          </button>
          <div className="flex items-center gap-3">
            {hasActiveFilters && (
              <button
                onClick={resetFiltres}
                className="text-xs text-slate-400 hover:text-white transition-colors underline underline-offset-2"
              >
                Réinitialiser
              </button>
            )}
            <select
              value={filtres.date_situation}
              onChange={(e) => { setFiltres({ ...filtres, date_situation: e.target.value }); setSnapshotsPage(1); }}
              className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-white cursor-pointer focus:outline-none focus:border-[#d32f2f]/50 focus:ring-1 focus:ring-[#d32f2f]/30"
            >
              <option value="" className="bg-[#1a1f3a]">Toutes les dates</option>
              {availableDates.map((date) => (
                <option key={date} value={date} className="bg-[#1a1f3a]">{date}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Corps des filtres */}
        {showFilters && (
          <div className={`grid ${isMobile ? 'grid-cols-1' : 'grid-cols-4'} gap-4 p-5`}>
            <div>
              <label className="block mb-1.5 text-xs font-medium uppercase tracking-wider text-slate-400">Agence</label>
              <input
                type="text"
                value={filtres.agence}
                onChange={(e) => { setFiltres({ ...filtres, agence: e.target.value }); setSnapshotsPage(1); }}
                placeholder="Rechercher..."
                className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-[#d32f2f]/50 focus:ring-1 focus:ring-[#d32f2f]/30 transition-all"
              />
            </div>
            <div>
              <label className="block mb-1.5 text-xs font-medium uppercase tracking-wider text-slate-400">Segment</label>
              <select
                value={filtres.segment}
                onChange={(e) => { setFiltres({ ...filtres, segment: e.target.value }); setSnapshotsPage(1); }}
                className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white cursor-pointer focus:outline-none focus:border-[#d32f2f]/50 focus:ring-1 focus:ring-[#d32f2f]/30 transition-all"
              >
                <option value="" className="bg-[#1a1f3a]">Tous</option>
                <option value="PARTICULIER" className="bg-[#1a1f3a]">Particulier</option>
                <option value="PME" className="bg-[#1a1f3a]">PME</option>
                <option value="PMI" className="bg-[#1a1f3a]">PMI</option>
              </select>
            </div>
            <div>
              <label className="block mb-1.5 text-xs font-medium uppercase tracking-wider text-slate-400">Tranche de retard</label>
              <select
                value={filtres.bucket_retard}
                onChange={(e) => { setFiltres({ ...filtres, bucket_retard: e.target.value }); setSnapshotsPage(1); }}
                className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white cursor-pointer focus:outline-none focus:border-[#d32f2f]/50 focus:ring-1 focus:ring-[#d32f2f]/30 transition-all"
              >
                <option value="" className="bg-[#1a1f3a]">Toutes</option>
                <option value="Retard léger" className="bg-[#1a1f3a]">Retard léger</option>
                <option value="Retard significatif" className="bg-[#1a1f3a]">Retard significatif</option>
                <option value="Zone critique / à restructurer" className="bg-[#1a1f3a]">Zone critique</option>
                <option value="Douteux / NPL" className="bg-[#1a1f3a]">Douteux / NPL</option>
              </select>
            </div>
            <div>
              <label className="block mb-1.5 text-xs font-medium uppercase tracking-wider text-slate-400">Candidat restruct.</label>
              <select
                value={filtres.candidat_restructuration === null ? '' : filtres.candidat_restructuration ? 'true' : 'false'}
                onChange={(e) => { setFiltres({ ...filtres, candidat_restructuration: e.target.value === '' ? null : e.target.value === 'true' }); setSnapshotsPage(1); }}
                className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white cursor-pointer focus:outline-none focus:border-[#d32f2f]/50 focus:ring-1 focus:ring-[#d32f2f]/30 transition-all"
              >
                <option value="" className="bg-[#1a1f3a]">Tous</option>
                <option value="true" className="bg-[#1a1f3a]">Oui</option>
                <option value="false" className="bg-[#1a1f3a]">Non</option>
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Erreur */}
      {error && (
        <div className="flex items-center gap-3 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400 backdrop-blur-sm">
          <span className="text-base">⚠️</span>
          <span>{error}</span>
        </div>
      )}

      {/* Tableau des crédits */}
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur-md overflow-hidden">
        {/* Header tableau */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
          <h3 className="text-base font-semibold text-white">
            Liste des crédits
            <span className="ml-2 text-sm font-normal text-slate-400">
              ({snapshotsTotal.toLocaleString('fr-FR')} résultats)
            </span>
          </h3>
          {loading && (
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <div className="h-3 w-3 animate-spin rounded-full border-2 border-[#d32f2f] border-t-transparent" />
              Chargement...
            </div>
          )}
        </div>

        {/* Contenu */}
        {loading && snapshots.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-slate-400">
            <div className="mb-4 h-10 w-10 animate-spin rounded-full border-3 border-[#d32f2f]/30 border-t-[#d32f2f]" />
            <p className="text-sm">Chargement des dossiers...</p>
          </div>
        ) : snapshots.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-slate-400">
            <span className="mb-3 text-4xl opacity-30">📋</span>
            <p className="text-sm font-medium">Aucun crédit trouvé</p>
            <p className="mt-1 text-xs text-slate-500">Modifiez les filtres pour afficher des résultats</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/5 bg-white/[0.02]">
                    <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400">Téléphone</th>
                    <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400">Réf. Crédit</th>
                    <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400">Client</th>
                    <th className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-wider text-slate-400">Montant</th>
                    <th className="px-4 py-3 text-center text-[11px] font-semibold uppercase tracking-wider text-slate-400">Retard</th>
                    <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400">Tranche</th>
                    <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400">Segment</th>
                    <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400">Agence</th>
                    <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400">Gestionnaire</th>
                    <th className="px-4 py-3 text-center text-[11px] font-semibold uppercase tracking-wider text-slate-400">Restruct.</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.03]">
                  {snapshots.map((snapshot, idx) => {
                    const bucketStyle = getBucketBadge(snapshot.bucket_retard);
                    const segmentStyle = getSegmentBadge(snapshot.segment);
                    return (
                      <tr
                        key={snapshot.id}
                        className={`transition-colors duration-150 hover:bg-white/[0.04] ${idx % 2 === 0 ? '' : 'bg-white/[0.01]'}`}
                      >
                        <td className="px-4 py-3 font-mono text-xs text-slate-300">
                          {snapshot.telephone_client || <span className="text-slate-600">—</span>}
                        </td>
                        <td className="px-4 py-3">
                          <span className="font-medium text-white/90">{snapshot.ref_credit}</span>
                        </td>
                        <td className="px-4 py-3 text-slate-300 max-w-[180px] truncate">{snapshot.nom_client}</td>
                        <td className="px-4 py-3 text-right">
                          <span className="font-semibold text-white/90 tabular-nums">
                            {(snapshot.montant_total_impaye || 0).toLocaleString('fr-FR')}
                          </span>
                          <span className="ml-1 text-[10px] text-slate-500">FCFA</span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={`inline-flex items-center justify-center rounded-full px-2.5 py-0.5 text-xs font-bold tabular-nums ${
                            snapshot.jours_retard >= 90 ? 'bg-rose-500/15 text-rose-400' :
                            snapshot.jours_retard >= 60 ? 'bg-red-500/15 text-red-400' :
                            snapshot.jours_retard >= 30 ? 'bg-orange-500/15 text-orange-400' :
                            'bg-amber-500/15 text-amber-400'
                          }`}>
                            {snapshot.jours_retard}j
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-medium ${bucketStyle.bg} ${bucketStyle.text} ${bucketStyle.border}`}>
                            {snapshot.bucket_retard}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-medium ${segmentStyle.bg} ${segmentStyle.text}`}>
                            {snapshot.segment}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-300">{snapshot.agence}</td>
                        <td className="px-4 py-3 text-xs text-slate-400">
                          {snapshot.gestionnaire || <span className="text-slate-600">—</span>}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {snapshot.candidat_restructuration ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 text-[10px] font-bold text-amber-400">
                              ● Oui
                            </span>
                          ) : (
                            <span className="text-[10px] text-slate-600">Non</span>
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
                  onPageChange={(page) => {
                    setSnapshotsPage(page);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
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

