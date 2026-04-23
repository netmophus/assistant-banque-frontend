'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api/client';
import { authApi } from '@/lib/api/auth';

interface Formation {
  id: string;
  titre: string;
  description?: string;
  status: string;
  is_ready_to_distribute?: boolean;
  modules_count?: number;
  bloc_label?: string;
  bloc_numero?: number;
  bloc_titre?: string;
}

interface Organisation {
  id: string;
  name: string;
  code: string;
  country: string;
}

interface AssignResult {
  org_id: string;
  org_name?: string;
  status: 'assigned' | 'skipped' | 'error';
  detail?: string;
  formation_id?: string;
}

interface AssignResponse {
  formation_titre: string;
  total: number;
  assigned: number;
  skipped: number;
  errors: number;
  details: AssignResult[];
}

export default function CataloguePage() {
  const router = useRouter();
  const [formations, setFormations] = useState<Formation[]>([]);
  const [organisations, setOrganisations] = useState<Organisation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal état
  const [selectedFormation, setSelectedFormation] = useState<Formation | null>(null);
  const [selectedOrgIds, setSelectedOrgIds] = useState<string[]>([]);
  const [assigning, setAssigning] = useState(false);
  const [assignResult, setAssignResult] = useState<AssignResponse | null>(null);

  useEffect(() => {
    const user = authApi.getCurrentUser();
    if (!user || user.role !== 'admin') {
      router.push('/login');
      return;
    }
    fetchData();
  }, []);

  async function fetchData() {
    setLoading(true);
    setError(null);
    try {
      const [f, o] = await Promise.all([
        apiClient.get<Formation[]>('/formations/catalogue/list'),
        apiClient.get<Organisation[]>('/formations/catalogue/organizations'),
      ]);
      setFormations(f);
      setOrganisations(o);
    } catch (e: any) {
      setError(e.message || 'Erreur lors du chargement');
    } finally {
      setLoading(false);
    }
  }

  function openModal(formation: Formation) {
    setSelectedFormation(formation);
    setSelectedOrgIds([]);
    setAssignResult(null);
  }

  function closeModal() {
    setSelectedFormation(null);
    setSelectedOrgIds([]);
    setAssignResult(null);
  }

  function toggleOrg(id: string) {
    setSelectedOrgIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  }

  function toggleAll() {
    if (selectedOrgIds.length === organisations.length) {
      setSelectedOrgIds([]);
    } else {
      setSelectedOrgIds(organisations.map(o => o.id));
    }
  }

  async function handleAssign() {
    if (!selectedFormation || selectedOrgIds.length === 0) return;
    setAssigning(true);
    try {
      const result = await apiClient.post<AssignResponse>(
        `/formations/${selectedFormation.id}/assign`,
        { org_ids: selectedOrgIds }
      );
      setAssignResult(result);
    } catch (e: any) {
      setError(e.message || 'Erreur lors de l\'affectation');
    } finally {
      setAssigning(false);
    }
  }

  const statusBadge = (f: Formation) => {
    // 3 etats : Brouillon / Publie sans contenu / Pret a distribuer
    if (f.status !== 'published') {
      return (
        <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-yellow-500/20 text-yellow-400 border border-yellow-500/30">
          Brouillon
        </span>
      );
    }
    if (!f.is_ready_to_distribute) {
      return (
        <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-orange-500/20 text-orange-400 border border-orange-500/30">
          Publié — contenu incomplet
        </span>
      );
    }
    return (
      <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-green-500/20 text-green-400 border border-green-500/30">
        Prêt à distribuer
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-[#0B1026] text-white px-4 py-8 max-w-5xl mx-auto">

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white mb-1">Catalogue Global</h1>
        <p className="text-[#94A3B8] text-sm">
          Gérez les formations du catalogue et affectez-les aux organisations.
        </p>
      </div>

      {/* Erreur */}
      {error && (
        <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Chargement */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-2 border-[#C9A84C] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : formations.length === 0 ? (
        <div className="text-center py-20 text-[#64748B]">
          Aucune formation dans le catalogue.
        </div>
      ) : (
        <div className="space-y-4">
          {formations.map(f => (
            <div
              key={f.id}
              className="bg-[#0F1E48] border border-[#2563EB]/20 rounded-2xl p-5 flex items-start justify-between gap-4"
            >
              <div className="flex-1 min-w-0">
                {f.bloc_label && (
                  <p className="text-xs text-[#C9A84C] font-semibold mb-1 uppercase tracking-wide">
                    {f.bloc_label}
                  </p>
                )}
                <h2 className="text-white font-semibold text-base leading-snug mb-2">
                  {f.titre}
                </h2>
                {f.description && (
                  <p className="text-[#94A3B8] text-sm mb-3 line-clamp-2">{f.description}</p>
                )}
                <div className="flex items-center gap-3">
                  {statusBadge(f)}
                  {f.modules_count !== undefined && (
                    <span className="text-xs text-[#64748B]">
                      {f.modules_count} module{f.modules_count > 1 ? 's' : ''}
                    </span>
                  )}
                </div>
              </div>
              {f.is_ready_to_distribute ? (
                <button
                  onClick={() => openModal(f)}
                  className="shrink-0 px-4 py-2 rounded-xl bg-[#C9A84C] hover:bg-[#b8963e] text-[#0B1026] font-semibold text-sm transition-colors"
                >
                  Affecter
                </button>
              ) : f.status !== 'published' ? (
                <div className="shrink-0 flex flex-col items-end gap-1.5 max-w-[180px]">
                  <button
                    disabled
                    title="Publiez d'abord la formation depuis Paramétrage / Formations"
                    className="px-4 py-2 rounded-xl bg-[#0F1E48] border border-yellow-500/30 text-yellow-400/50 font-semibold text-sm cursor-not-allowed"
                  >
                    Affecter
                  </button>
                  <span className="text-[11px] text-yellow-400/70 text-right leading-tight">
                    Brouillon — à publier<br />+ générer d&apos;abord
                  </span>
                </div>
              ) : (
                <div className="shrink-0 flex flex-col items-end gap-1.5 max-w-[200px]">
                  <button
                    disabled
                    title="Publiée mais contenu non généré. Régénérez le contenu + QCM depuis Paramétrage / Formations."
                    className="px-4 py-2 rounded-xl bg-[#0F1E48] border border-orange-500/30 text-orange-400/50 font-semibold text-sm cursor-not-allowed"
                  >
                    Affecter
                  </button>
                  <span className="text-[11px] text-orange-400/70 text-right leading-tight">
                    Contenu non généré<br />générez avant d&apos;affecter
                  </span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ── Modal affectation ─────────────────────────────────────────────── */}
      {selectedFormation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
          <div className="bg-[#0F1E48] border border-[#2563EB]/30 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden">

            {/* Header modal */}
            <div className="p-6 border-b border-[#2563EB]/20">
              <h3 className="text-white font-bold text-lg leading-snug">
                Affecter la formation
              </h3>
              <p className="text-[#C9A84C] text-sm mt-1 font-medium line-clamp-2">
                {selectedFormation.titre}
              </p>
            </div>

            {/* Résultat affectation */}
            {assignResult ? (
              <div className="p-6 space-y-4">
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-3">
                    <p className="text-2xl font-bold text-green-400">{assignResult.assigned}</p>
                    <p className="text-xs text-green-400/70 mt-1">Affecté(s)</p>
                  </div>
                  <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-3">
                    <p className="text-2xl font-bold text-yellow-400">{assignResult.skipped}</p>
                    <p className="text-xs text-yellow-400/70 mt-1">Déjà présent(s)</p>
                  </div>
                  <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3">
                    <p className="text-2xl font-bold text-red-400">{assignResult.errors}</p>
                    <p className="text-xs text-red-400/70 mt-1">Erreur(s)</p>
                  </div>
                </div>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {assignResult.details.map((d, i) => (
                    <div key={i} className="flex items-center justify-between text-sm px-3 py-2 rounded-lg bg-white/5">
                      <span className="text-white">{d.org_name || d.org_id}</span>
                      <span className={
                        d.status === 'assigned' ? 'text-green-400' :
                        d.status === 'skipped' ? 'text-yellow-400' : 'text-red-400'
                      }>
                        {d.status === 'assigned' ? 'Affecté' :
                         d.status === 'skipped' ? 'Déjà présent' : 'Erreur'}
                      </span>
                    </div>
                  ))}
                </div>
                <button
                  onClick={closeModal}
                  className="w-full py-3 rounded-xl bg-[#2563EB] hover:bg-[#1d4ed8] text-white font-semibold transition-colors"
                >
                  Fermer
                </button>
              </div>
            ) : (
              /* Sélection des orgs */
              <div className="p-6 space-y-4">
                {organisations.length === 0 ? (
                  <p className="text-[#64748B] text-sm text-center py-4">
                    Aucune organisation disponible.
                  </p>
                ) : (
                  <>
                    {/* Tout sélectionner */}
                    <button
                      onClick={toggleAll}
                      className="text-xs text-[#C9A84C] hover:underline"
                    >
                      {selectedOrgIds.length === organisations.length
                        ? 'Tout désélectionner'
                        : 'Tout sélectionner'}
                    </button>

                    {/* Liste orgs */}
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {organisations.map(org => (
                        <label
                          key={org.id}
                          className="flex items-center gap-3 px-4 py-3 rounded-xl bg-white/5 hover:bg-white/10 cursor-pointer transition-colors"
                        >
                          <input
                            type="checkbox"
                            checked={selectedOrgIds.includes(org.id)}
                            onChange={() => toggleOrg(org.id)}
                            className="w-4 h-4 accent-[#C9A84C]"
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-white text-sm font-medium">{org.name}</p>
                            <p className="text-[#64748B] text-xs">{org.code} · {org.country}</p>
                          </div>
                        </label>
                      ))}
                    </div>
                  </>
                )}

                {/* Actions */}
                <div className="flex gap-3 pt-2">
                  <button
                    onClick={closeModal}
                    className="flex-1 py-3 rounded-xl border border-white/10 text-[#94A3B8] hover:text-white hover:border-white/20 font-medium text-sm transition-colors"
                  >
                    Annuler
                  </button>
                  <button
                    onClick={handleAssign}
                    disabled={selectedOrgIds.length === 0 || assigning}
                    className="flex-1 py-3 rounded-xl bg-[#C9A84C] hover:bg-[#b8963e] disabled:opacity-40 disabled:cursor-not-allowed text-[#0B1026] font-semibold text-sm transition-colors flex items-center justify-center gap-2"
                  >
                    {assigning ? (
                      <>
                        <div className="w-4 h-4 border-2 border-[#0B1026] border-t-transparent rounded-full animate-spin" />
                        Affectation...
                      </>
                    ) : (
                      `Affecter (${selectedOrgIds.length})`
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
