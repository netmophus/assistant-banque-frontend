'use client';

import { useState, useEffect } from 'react';
import { apiClient } from '@/lib/api/client';
import { authApi } from '@/lib/api/auth';
import { CommentModal, PromesseModal, HistoryModal } from '@/components/org/impayes/AgentActionModals';

interface Dossier {
  ref_credit: string;
  nom_client: string;
  montant_impaye: number;
  jours_retard: number;
  agence: string;
}

interface Portefeuille {
  agent_id: string;
  agent_nom: string;
  nombre_dossiers: number;
  montant_total: number;
  dossiers: Dossier[];
  promesses_en_cours: number;
}

const fmt = (n: number) => Math.round(n).toLocaleString('fr-FR');

const bucketLabel = (jours: number) => {
  if (jours >= 90) return { label: 'Douteux / NPL', detail: 'Contentieux', color: '#ef4444', bg: 'rgba(239,68,68,0.12)' };
  if (jours >= 60) return { label: 'Zone critique', detail: 'Mise en demeure', color: '#f97316', bg: 'rgba(249,115,22,0.12)' };
  if (jours >= 30) return { label: 'Retard significatif', detail: 'Deuxième relance', color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' };
  return { label: 'Retard léger', detail: 'Première relance', color: '#22c55e', bg: 'rgba(34,197,94,0.12)' };
};

export default function MesDossiersPage() {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [portefeuille, setPortefeuille] = useState<Portefeuille | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Modales
  const [selectedDossier, setSelectedDossier] = useState<Dossier | null>(null);
  const [showComment, setShowComment] = useState(false);
  const [showPromesse, setShowPromesse] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [historique, setHistorique] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  useEffect(() => {
    const user = authApi.getCurrentUser();
    setCurrentUser(user);
    loadPortefeuille();
  }, []);

  const loadPortefeuille = async () => {
    setLoading(true);
    setError('');
    try {
      // Le backend filtre automatiquement par agent_id pour role="user"
      const data = await apiClient.get<Portefeuille[]>('/impayes/portefeuille');
      setPortefeuille(data && data.length > 0 ? data[0] : null);
    } catch (err: any) {
      setError(err.message || 'Erreur lors du chargement');
    } finally {
      setLoading(false);
    }
  };

  const handleViewHistory = async (dossier: Dossier) => {
    setSelectedDossier(dossier);
    setShowHistory(true);
    setLoadingHistory(true);
    try {
      const response = await apiClient.get<any>(`/impayes/journal?ref_credit=${dossier.ref_credit}`);
      setHistorique(response?.actions || []);
    } catch {
      setHistorique([]);
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleCommentSubmit = async (commentaire: string) => {
    await apiClient.post('/impayes/journal', {
      ref_credit: selectedDossier?.ref_credit,
      type_action: 'commentaire',
      description: commentaire,
      utilisateur: currentUser?.full_name || currentUser?.email,
    });
  };

  const handlePromesseSubmit = async (montant: number, datePromesse: string, commentaire: string) => {
    await apiClient.post('/impayes/promesses', {
      ref_credit: selectedDossier?.ref_credit,
      nom_client: selectedDossier?.nom_client,
      montant_promis: montant,
      date_promesse: datePromesse,
      commentaire,
    });
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center">
          <div className="relative w-12 h-12 mx-auto mb-4">
            <div className="absolute inset-0 border-2 border-white/10 rounded-full" />
            <div className="absolute inset-0 border-2 border-transparent border-t-[#EF4444] rounded-full animate-spin" />
          </div>
          <p className="text-white/50 text-sm">Chargement de vos dossiers…</p>
        </div>
      </div>
    );
  }

  const dossiers = portefeuille?.dossiers || [];
  const totalMontant = portefeuille?.montant_total || 0;
  const promessesEnCours = portefeuille?.promesses_en_cours || 0;

  return (
    <div className="max-w-5xl mx-auto">

      {/* ── En-tête ── */}
      <div className="relative rounded-3xl overflow-hidden mb-6"
        style={{
          borderLeft: '4px solid #EF4444',
          border: '2px solid rgba(239,68,68,0.2)',
          borderLeftWidth: '4px',
          background: 'linear-gradient(135deg, #070E28 0%, #0F1E48 60%, #0A1434 100%)',
        }}>
        <div className="relative z-10 p-6 flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-[#EF4444]/15 border border-[#EF4444]/30 flex items-center justify-center shrink-0">
            <svg className="w-6 h-6 text-[#EF4444]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <div className="flex-1">
            <p className="text-[10px] font-bold uppercase tracking-widest text-[#EF4444] mb-0.5">Recouvrement</p>
            <h1 className="text-2xl font-black text-white">Mes dossiers assignés</h1>
            <p className="text-sm text-white/50 mt-0.5">
              Bonjour {currentUser?.full_name || 'Agent'} — {dossiers.length} dossier{dossiers.length > 1 ? 's' : ''} en charge
            </p>
          </div>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">{error}</div>
      )}

      {/* ── KPIs ── */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: 'Dossiers assignés', value: dossiers.length, color: '#EF4444' },
          { label: 'Montant total impayé', value: fmt(totalMontant) + ' FCFA', color: '#F97316' },
          { label: 'Promesses en cours', value: promessesEnCours, color: '#F59E0B' },
        ].map(k => (
          <div key={k.label} className="rounded-2xl p-4 text-center"
            style={{ background: '#070E28', border: `1px solid ${k.color}30` }}>
            <p className="text-xs text-white/40 mb-1">{k.label}</p>
            <p className="text-xl font-black" style={{ color: k.color }}>{k.value}</p>
          </div>
        ))}
      </div>

      {/* ── Liste des dossiers ── */}
      {dossiers.length === 0 ? (
        <div className="rounded-2xl p-12 text-center"
          style={{ background: '#070E28', border: '1px solid rgba(255,255,255,0.06)' }}>
          <p className="text-white/30 text-sm">Aucun dossier ne vous est assigné pour le moment.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {dossiers.map(d => {
            const bucket = bucketLabel(d.jours_retard);
            return (
              <div key={d.ref_credit} className="rounded-2xl p-4"
                style={{ background: '#070E28', border: '1px solid rgba(255,255,255,0.07)' }}>
                <div className="flex flex-col sm:flex-row sm:items-center gap-4">

                  {/* Infos client */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="font-bold text-white text-sm">{d.nom_client}</span>
                      <span className="text-xs text-white/30 font-mono">{d.ref_credit}</span>
                      <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full"
                        style={{ color: bucket.color, background: bucket.bg }}>
                        {bucket.label} <span style={{ fontWeight: 400, opacity: 0.8 }}>({bucket.detail})</span>
                      </span>
                    </div>
                    <div className="flex gap-4 text-xs text-white/50">
                      <span>Agence : <span className="text-white/70">{d.agence}</span></span>
                      <span>Retard : <span className="font-bold" style={{ color: bucket.color }}>{d.jours_retard} j</span></span>
                      <span>Impayé : <span className="text-white/70 font-semibold">{fmt(d.montant_impaye)} FCFA</span></span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 shrink-0 flex-wrap">
                    <button
                      onClick={() => { setSelectedDossier(d); setShowComment(true); }}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
                      style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#94A3B8' }}>
                      Commentaire
                    </button>
                    <button
                      onClick={() => { setSelectedDossier(d); setShowPromesse(true); }}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
                      style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.2)', color: '#22C55E' }}>
                      Promesse
                    </button>
                    <button
                      onClick={() => handleViewHistory(d)}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
                      style={{ background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.2)', color: '#60A5FA' }}>
                      Historique
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Modales ── */}
      {selectedDossier && (
        <>
          <CommentModal
            isOpen={showComment}
            onClose={() => setShowComment(false)}
            onSubmit={handleCommentSubmit}
            refCredit={selectedDossier.ref_credit}
            nomClient={selectedDossier.nom_client}
          />
          <PromesseModal
            isOpen={showPromesse}
            onClose={() => setShowPromesse(false)}
            onSubmit={handlePromesseSubmit}
            refCredit={selectedDossier.ref_credit}
            nomClient={selectedDossier.nom_client}
            montantImpaye={selectedDossier.montant_impaye}
          />
          <HistoryModal
            isOpen={showHistory}
            onClose={() => setShowHistory(false)}
            refCredit={selectedDossier.ref_credit}
            nomClient={selectedDossier.nom_client}
            historique={historique}
            loading={loadingHistory}
          />
        </>
      )}
    </div>
  );
}
