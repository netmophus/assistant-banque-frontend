'use client';

import React, { useState, useEffect } from 'react';
import { useResponsive } from '@/hooks/useResponsive';
import Pagination from '@/components/common/Pagination';
import { apiClient } from '@/lib/api/client';

interface Candidat {
  id: string;
  telephone_client?: string;
  ref_credit: string;
  nom_client: string;
  montant_total_impaye?: number;
  jours_retard: number;
  ratio_impaye_encours?: number;
  agence?: string;
  gestionnaire?: string;
  produit?: string;
}

const RestructurationTab = () => {
  const { isMobile } = useResponsive();
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');
  const [candidats, setCandidats] = useState<Candidat[]>([]);
  const [candidatsTotal, setCandidatsTotal] = useState(0);
  const [candidatsPage, setCandidatsPage]   = useState(1);
  const candidatsLimit = 20;
  const [showModal, setShowModal] = useState(false);
  const [selectedCandidatForContact, setSelectedCandidatForContact] = useState<Candidat | null>(null);

  const getAuthHeaders = (): HeadersInit => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    return { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) };
  };

  useEffect(() => { loadCandidats(); }, [candidatsPage]);
  useEffect(() => {
    const handler = () => loadCandidats();
    window.addEventListener('dataImported', handler as EventListener);
    return () => window.removeEventListener('dataImported', handler as EventListener);
  }, [candidatsPage]);

  const loadCandidats = async () => {
    setLoading(true); setError('');
    try {
      const params = new URLSearchParams({ limit: candidatsLimit.toString(), skip: ((candidatsPage - 1) * candidatsLimit).toString() });
      const data = await apiClient.get(`/impayes/candidats-restructuration?${params}`) as any;
      const rows = Array.isArray(data.data?.snapshots) ? data.data.snapshots : (Array.isArray(data.data) ? data.data : (Array.isArray(data.snapshots) ? data.snapshots : []));
      setCandidats(rows);
      setCandidatsTotal(data.total || rows.length);
    } catch (err: any) {
      setError(err.message || 'Erreur chargement');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-5">

      {/* ── Bannière conditions ─────────────────────────────────────────────── */}
      <div className="rounded-2xl border border-amber-500/25 bg-amber-500/5 p-5">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-500/15">
            <svg className="w-5 h-5 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-bold text-amber-300 mb-1">
              Candidats à restructuration — {candidatsTotal || candidats.length}
            </p>
            <div className="text-xs text-slate-400 space-y-0.5 leading-relaxed">
              <div>• Jours de retard ≥ 60 jours (configurable dans &quot;Configuration&quot;)</div>
              <div>• Ratio impayé / encours &gt; 30% (configurable dans &quot;Configuration&quot;)</div>
              <div className="text-slate-500 italic mt-1">Si aucun candidat n'apparaît, vérifiez que vos données satisfont ces conditions.</div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Erreur ──────────────────────────────────────────────────────────── */}
      {error && (
        <div className="flex items-center gap-3 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" /></svg>
          {error}
        </div>
      )}

      {/* ── Table ───────────────────────────────────────────────────────────── */}
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur-md overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
          <div>
            <h3 className="text-sm font-bold text-white">Liste des candidats</h3>
            <p className="text-[11px] text-slate-500 mt-0.5">{candidatsTotal} candidat{candidatsTotal > 1 ? 's' : ''}</p>
          </div>
          {loading && (
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-amber-500/30 border-t-amber-400" />
              Chargement...
            </div>
          )}
        </div>

        {loading && candidats.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-slate-400">
            <div className="mb-4 h-10 w-10 animate-spin rounded-full border-[3px] border-amber-500/20 border-t-amber-400" />
            <p className="text-sm">Chargement des candidats…</p>
          </div>
        ) : candidats.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-slate-400">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-white/5">
              <svg className="w-6 h-6 opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
            </div>
            <p className="text-sm font-semibold text-slate-300">Aucun candidat à restructuration</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/5">
                    {['Téléphone','Réf. Crédit','Client','Montant impayé','Jours retard','Ratio imp./enc.','Agence','Gestionnaire','Action'].map(h => (
                      <th key={h} className="bg-white/[0.02] px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-slate-500">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {candidats.map((c, idx) => (
                    <tr key={c.id} className={`group border-b border-white/[0.03] transition-colors hover:bg-white/[0.04] ${idx % 2 !== 0 ? 'bg-white/[0.015]' : ''}`}>
                      <td className="px-4 py-3 font-mono text-xs text-slate-400">{c.telephone_client || <span className="text-slate-700">—</span>}</td>
                      <td className="px-4 py-3">
                        <span className="rounded-md border border-white/10 bg-white/5 px-2 py-0.5 font-mono text-[11px] font-semibold text-white/90">{c.ref_credit}</span>
                      </td>
                      <td className="px-4 py-3 max-w-[160px] truncate text-sm font-medium text-slate-200">{c.nom_client}</td>
                      <td className="px-4 py-3 text-right">
                        <span className="font-bold text-white/90 tabular-nums">{(c.montant_total_impaye || 0).toLocaleString('fr-FR')}</span>
                        <span className="ml-1 text-[10px] text-slate-600">FCFA</span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-flex items-center justify-center rounded-full border px-2.5 py-0.5 text-[11px] font-bold tabular-nums ${c.jours_retard >= 90 ? 'border-rose-500/20 bg-rose-500/15 text-rose-300' : 'border-red-500/20 bg-red-500/15 text-red-300'}`}>
                          {c.jours_retard}j
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className={`font-semibold tabular-nums ${(c.ratio_impaye_encours || 0) > 50 ? 'text-red-400' : 'text-orange-400'}`}>
                          {c.ratio_impaye_encours?.toFixed(2) || '0'}%
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-300">{c.agence || <span className="text-slate-700">—</span>}</td>
                      <td className="px-4 py-3 text-xs text-slate-400">{c.gestionnaire || <span className="text-slate-700">—</span>}</td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => { setSelectedCandidatForContact(c); setShowModal(true); }}
                          className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-1.5 text-[11px] font-semibold text-amber-400 hover:bg-amber-500/20 transition-colors whitespace-nowrap"
                        >
                          Contacter gestionnaire
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {candidatsTotal > candidatsLimit && (
              <div className="border-t border-white/5 px-5 py-3">
                <Pagination
                  currentPage={candidatsPage}
                  totalItems={candidatsTotal}
                  itemsPerPage={candidatsLimit}
                  currentItemsCount={candidats.length}
                  onPageChange={(page) => { setCandidatsPage(page); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                />
              </div>
            )}
          </>
        )}
      </div>

      {/* ── Modal contact gestionnaire ─────────────────────────────────────── */}
      {showModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm" onClick={() => setShowModal(false)}>
          <div className="w-full max-w-lg overflow-hidden rounded-2xl border border-amber-500/30 bg-[#0f172a] shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-white/5 bg-amber-500/8 px-6 py-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/20">
                  <svg className="w-5 h-5 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" /></svg>
                </div>
                <div>
                  <p className="text-sm font-bold text-white">Action requise</p>
                  <p className="text-xs text-slate-400">Contact du gestionnaire</p>
                </div>
              </div>
              <button onClick={() => setShowModal(false)} className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-slate-300 hover:bg-white/10 transition-colors">Fermer</button>
            </div>
            <div className="p-6">
              <div className="rounded-xl border border-amber-500/20 bg-amber-500/8 p-4 text-sm text-slate-300 leading-relaxed">
                Pour <strong className="text-white">refuser</strong> ou <strong className="text-white">valider</strong> une restructuration, veuillez contacter le gestionnaire.
                {selectedCandidatForContact && (
                  <div className="mt-3 space-y-1 text-sm">
                    <div>Crédit : <strong className="text-white">{selectedCandidatForContact.ref_credit}</strong></div>
                    <div>Client : <strong className="text-white">{selectedCandidatForContact.nom_client}</strong></div>
                  </div>
                )}
              </div>
              <div className="mt-4 flex justify-end">
                <button onClick={() => setShowModal(false)} className="rounded-xl border border-white/10 bg-white/5 px-5 py-2 text-sm font-bold text-white hover:bg-white/10 transition-colors">OK</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RestructurationTab;
