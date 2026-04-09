'use client';

import React, { useState, useEffect } from 'react';
import { apiClient } from '@/lib/api/client';
import { authApi } from '@/lib/api/auth';
import { CommentModal, PromesseModal, HistoryModal } from './AgentActionModals';

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

const DOSSIERS_PER_PAGE = 10;

const getNiveau = (jours: number) => {
  if (jours >= 90) return { label: 'Douteux/NPL', detail: 'Contentieux', color: '#ef4444', bg: 'rgba(239,68,68,0.12)', tw: { text: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/20' } };
  if (jours >= 60) return { label: 'Zone critique', detail: 'Mise en demeure', color: '#f97316', bg: 'rgba(249,115,22,0.12)', tw: { text: 'text-orange-400', bg: 'bg-orange-500/10', border: 'border-orange-500/20' } };
  if (jours >= 30) return { label: 'Retard signif.', detail: 'Deuxième relance', color: '#f59e0b', bg: 'rgba(245,158,11,0.12)', tw: { text: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20' } };
  return { label: 'Retard léger', detail: 'Première relance', color: '#22c55e', bg: 'rgba(34,197,94,0.12)', tw: { text: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' } };
};

const PortefeuilleTab = () => {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const userRole = currentUser?.role || 'user';
  const isAdmin = userRole === 'admin';

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [portefeuilles, setPortefeuilles] = useState<Portefeuille[]>([]);
  const [expandedAgent, setExpandedAgent] = useState<string | null>(null);
  const [pagesByAgent, setPagesByAgent] = useState<Record<string, number>>({});

  // Formulaire attribution
  const [showForm, setShowForm] = useState(false);
  const [formServiceId, setFormServiceId] = useState('');
  const [formDepartmentId, setFormDepartmentId] = useState('');
  const [formAgentId, setFormAgentId] = useState('');
  const [formAgentNom, setFormAgentNom] = useState('');
  const [formRefs, setFormRefs] = useState('');

  // Données pour les cascades
  const [services, setServices] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [agents, setAgents] = useState<any[]>([]);

  // Credits non attribues
  const [nonAttribues, setNonAttribues] = useState<Dossier[]>([]);
  const [selectedNonAttribues, setSelectedNonAttribues] = useState<Set<string>>(new Set());

  // États pour les modales
  const [showCommentModal, setShowCommentModal] = useState(false);
  const [showPromesseModal, setShowPromesseModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [selectedDossier, setSelectedDossier] = useState<Dossier | null>(null);
  const [historique, setHistorique] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const user = await authApi.getCurrentUser();
        setCurrentUser(user);
      } catch (error) {
        console.error('Erreur lors de la récupération de l\'utilisateur:', error);
      }
    };

    fetchUser();
    loadPortefeuilles();
  }, []);

  useEffect(() => {
    if (currentUser?.role === 'admin') {
      loadDepartments();
    }
  }, [currentUser]);

  useEffect(() => {
    if (formDepartmentId) {
      loadServices(formDepartmentId);
      loadAgents(formDepartmentId);
    } else {
      setServices([]);
      setAgents([]);
    }
    setFormServiceId('');
    setFormAgentId('');
    setFormAgentNom('');
  }, [formDepartmentId]);

  useEffect(() => {
    if (formServiceId && formDepartmentId) {
      loadAgentsByService(formDepartmentId, formServiceId);
    } else if (formDepartmentId) {
      loadAgents(formDepartmentId);
    }
    setFormAgentId('');
    setFormAgentNom('');
  }, [formServiceId]);

  const loadPortefeuilles = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await apiClient.get<Portefeuille[]>('/impayes/portefeuille');
      setPortefeuilles(data || []);
    } catch (err: any) {
      setError(err.message || 'Erreur chargement');
    } finally {
      setLoading(false);
    }
  };

  const loadDepartments = async () => {
    try {
      const data = await apiClient.get<any[]>('/departments');
      setDepartments(data || []);
    } catch (err) {
      console.error('Erreur chargement départements:', err);
    }
  };

  const loadServices = async (departmentId: string) => {
    try {
      const data = await apiClient.get<any[]>(`/departments/services/by-department/${departmentId}`);
      setServices(data || []);
    } catch (err) {
      console.error('Erreur chargement services:', err);
    }
  };

  const loadAgents = async (departmentId: string) => {
    try {
      const data = await apiClient.get<any[]>(`/auth/users/org/filtered?department_id=${departmentId}`);
      setAgents(data || []);
    } catch (err) {
      console.error('Erreur chargement agents:', err);
    }
  };

  const loadAgentsByService = async (departmentId: string, serviceId: string) => {
    try {
      const data = await apiClient.get<any[]>(`/auth/users/org/filtered?department_id=${departmentId}&service_id=${serviceId}`);
      setAgents(data || []);
    } catch (err) {
      console.error('Erreur chargement agents par service:', err);
    }
  };

  const handleAttribuer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formDepartmentId || !formAgentId || !formAgentNom) {
      setError('Département, ID et nom agent requis');
      return;
    }
    const refs = formRefs.split(/[,;\n]+/).map((r) => r.trim()).filter(Boolean);
    const allRefs = [...refs, ...Array.from(selectedNonAttribues)];
    if (allRefs.length === 0) {
      setError('Au moins une reference requise');
      return;
    }
    try {
      setLoading(true);
      await apiClient.post('/impayes/portefeuille/attribuer', {
        department_id: formDepartmentId,
        service_id: formServiceId,
        agent_id: formAgentId,
        agent_nom: formAgentNom,
        ref_credits: allRefs,
      });
      setFormDepartmentId('');
      setFormServiceId('');
      setFormAgentId('');
      setFormAgentNom('');
      setFormRefs('');
      setSelectedNonAttribues(new Set());
      setShowForm(false);
      loadPortefeuilles();
    } catch (err: any) {
      setError(err.message || 'Erreur attribution');
    } finally {
      setLoading(false);
    }
  };

  const handleDesattribuer = async (agentId: string, refCredits: string[]) => {
    try {
      await apiClient.post('/impayes-extended/portefeuille/desattribuer', {
        agent_id: agentId,
        ref_credits: refCredits,
      });
      await loadPortefeuilles();
    } catch (err: any) {
      setError(err.message || 'Erreur lors de la désattribution');
    }
  };

  const handleAddComment = (dossier: Dossier) => {
    setSelectedDossier(dossier);
    setShowCommentModal(true);
  };

  const handleAddPromesse = (dossier: Dossier) => {
    setSelectedDossier(dossier);
    setShowPromesseModal(true);
  };

  const handleViewHistory = async (dossier: Dossier) => {
    setSelectedDossier(dossier);
    setShowHistoryModal(true);
    setLoadingHistory(true);

    try {
      const response = await apiClient.get<any>(`/impayes/journal?ref_credit=${dossier.ref_credit}`);
      setHistorique(response?.actions || []);
    } catch (error) {
      console.error('Erreur chargement historique:', error);
      setHistorique([]);
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleCommentSubmit = async (commentaire: string) => {
    try {
      await apiClient.post('/impayes/journal', {
        ref_credit: selectedDossier?.ref_credit,
        type_action: 'commentaire',
        description: commentaire,
        utilisateur: currentUser?.full_name || currentUser?.email
      });

      if (showHistoryModal && selectedDossier) {
        await handleViewHistory(selectedDossier);
      }
    } catch (error) {
      console.error('Erreur ajout commentaire:', error);
      throw error;
    }
  };

  const handlePromesseSubmit = async (montant: number, datePromesse: string, commentaire: string) => {
    try {
      await apiClient.post('/impayes/promesses', {
        ref_credit: selectedDossier?.ref_credit,
        nom_client: selectedDossier?.nom_client,
        montant_promis: montant,
        date_promesse: datePromesse,
        commentaire: commentaire,
        utilisateur: currentUser?.full_name || currentUser?.email
      });

      await apiClient.post('/impayes/journal', {
        ref_credit: selectedDossier?.ref_credit,
        type_action: 'promesse',
        description: `Promesse de paiement de ${montant.toLocaleString()} FCFA pour le ${datePromesse}${commentaire ? ': ' + commentaire : ''}`,
        utilisateur: currentUser?.full_name || currentUser?.email,
        montant: montant
      });

      if (showHistoryModal && selectedDossier) {
        await handleViewHistory(selectedDossier);
      }
    } catch (error) {
      console.error('Erreur ajout promesse:', error);
      throw error;
    }
  };

  const handleImprimerAgent = (pf: Portefeuille) => {
    const date = new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });
    const rows = pf.dossiers.map(d => {
      const niv = getNiveau(d.jours_retard);
      return `<tr>
        <td style="padding:7px 10px;border-bottom:1px solid #e2e8f0">${d.nom_client}</td>
        <td style="padding:7px 10px;border-bottom:1px solid #e2e8f0;font-family:monospace;font-size:11px">${d.ref_credit}</td>
        <td style="padding:7px 10px;border-bottom:1px solid #e2e8f0"><span style="padding:2px 8px;border-radius:4px;font-size:11px;font-weight:600;color:${niv.color};background:${niv.bg}">${niv.label}</span></td>
        <td style="padding:7px 10px;border-bottom:1px solid #e2e8f0;text-align:right;font-weight:600">${d.montant_impaye.toLocaleString()} FCFA</td>
        <td style="padding:7px 10px;border-bottom:1px solid #e2e8f0;text-align:center;color:${niv.color};font-weight:700">${d.jours_retard}j</td>
        <td style="padding:7px 10px;border-bottom:1px solid #e2e8f0">${d.agence}</td>
      </tr>`;
    }).join('');

    const html = `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8">
      <title>Portefeuille — ${pf.agent_nom}</title>
      <style>*{box-sizing:border-box;margin:0;padding:0}body{font-family:'Segoe UI',Arial,sans-serif;color:#1e293b;font-size:12px;padding:28px}</style>
    </head><body>
      <div style="border-bottom:3px solid #3b82f6;padding-bottom:14px;margin-bottom:20px;display:flex;justify-content:space-between;align-items:flex-start">
        <div>
          <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:2px;color:#3b82f6;margin-bottom:4px">Rapport de portefeuille</div>
          <div style="font-size:20px;font-weight:800">${pf.agent_nom}</div>
          <div style="font-size:11px;color:#64748b;margin-top:2px">Généré le ${date}</div>
        </div>
        <div style="text-align:right">
          <div style="font-size:22px;font-weight:800;color:#3b82f6">${pf.nombre_dossiers}</div>
          <div style="font-size:10px;color:#64748b">dossiers</div>
          <div style="font-size:14px;font-weight:700;color:#f59e0b;margin-top:4px">${pf.montant_total.toLocaleString()} FCFA</div>
          <div style="font-size:10px;color:#64748b">montant total impayé</div>
        </div>
      </div>
      <table style="width:100%;border-collapse:collapse">
        <thead><tr style="background:#f8fafc">
          <th style="padding:8px 10px;text-align:left;font-size:11px;color:#64748b;border-bottom:2px solid #e2e8f0">Client</th>
          <th style="padding:8px 10px;text-align:left;font-size:11px;color:#64748b;border-bottom:2px solid #e2e8f0">Réf. crédit</th>
          <th style="padding:8px 10px;text-align:left;font-size:11px;color:#64748b;border-bottom:2px solid #e2e8f0">Niveau</th>
          <th style="padding:8px 10px;text-align:right;font-size:11px;color:#64748b;border-bottom:2px solid #e2e8f0">Montant impayé</th>
          <th style="padding:8px 10px;text-align:center;font-size:11px;color:#64748b;border-bottom:2px solid #e2e8f0">Retard</th>
          <th style="padding:8px 10px;text-align:left;font-size:11px;color:#64748b;border-bottom:2px solid #e2e8f0">Agence</th>
        </tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </body></html>`;

    const win = window.open('', '_blank');
    if (win) { win.document.write(html); win.document.close(); win.print(); }
  };

  const totalDossiers = portefeuilles.reduce((s, p) => s + p.nombre_dossiers, 0);
  const totalMontant = portefeuilles.reduce((s, p) => s + p.montant_total, 0);

  return (
    <div className="space-y-5">

      {/* ── KPI Cards ───────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {[
          { label: 'Agents',            value: portefeuilles.length,              accent: '#3b82f6', border: 'border-blue-500/20',    glow: 'from-blue-500/8' },
          { label: 'Dossiers attribués', value: totalDossiers,                     accent: '#22c55e', border: 'border-emerald-500/20', glow: 'from-emerald-500/8' },
          { label: 'Montant total',      value: `${totalMontant.toLocaleString('fr-FR')} FCFA`, accent: '#f59e0b', border: 'border-amber-500/20', glow: 'from-amber-500/8' },
        ].map(k => (
          <div key={k.label} className={`relative overflow-hidden rounded-2xl border ${k.border} bg-gradient-to-br ${k.glow} to-transparent p-4`}>
            <div className="absolute -right-3 -top-3 h-14 w-14 rounded-full opacity-20" style={{ background: k.accent, filter: 'blur(16px)' }} />
            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">{k.label}</p>
            <p className="mt-1 text-xl font-black tabular-nums" style={{ color: k.accent }}>{k.value}</p>
          </div>
        ))}
      </div>

      {/* ── Bouton attribution (admin) ───────────────────────────────────────── */}
      {isAdmin && (
        <div>
          <button
            onClick={() => setShowForm(!showForm)}
            className={`rounded-xl px-4 py-2 text-sm font-semibold transition-all ${
              showForm
                ? 'border border-white/10 bg-white/5 text-slate-300 hover:bg-white/10'
                : 'bg-blue-600 text-white hover:bg-blue-500 shadow-lg shadow-blue-500/20'
            }`}
          >
            {showForm ? 'Fermer' : '+ Attribuer des dossiers'}
          </button>
        </div>
      )}

      {/* ── Formulaire attribution ───────────────────────────────────────────── */}
      {showForm && isAdmin && (
        <form
          onSubmit={handleAttribuer}
          className="rounded-2xl border border-blue-500/25 bg-blue-500/5 p-5 space-y-4"
        >
          <p className="text-sm font-bold text-blue-300">Attribution de dossiers</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div>
              <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-slate-500">Département *</label>
              <select
                value={formDepartmentId}
                onChange={(e) => setFormDepartmentId(e.target.value)}
                required
                className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500/40 transition-all cursor-pointer"
              >
                <option value="" className="bg-[#0f1629]">Sélectionner...</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id} className="bg-[#0f1629]">{d.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-slate-500">Service</label>
              <select
                value={formServiceId}
                onChange={(e) => setFormServiceId(e.target.value)}
                disabled={!formDepartmentId}
                className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500/40 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <option value="" className="bg-[#0f1629]">Tous les services</option>
                {services.map((s) => (
                  <option key={s.id} value={s.id} className="bg-[#0f1629]">{s.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-slate-500">Agent *</label>
              <select
                value={formAgentId}
                onChange={(e) => {
                  const agentId = e.target.value;
                  setFormAgentId(agentId);
                  const selectedAgent = agents.find(a => a.id === agentId);
                  setFormAgentNom(selectedAgent?.full_name || '');
                }}
                required
                disabled={!formDepartmentId}
                className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500/40 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <option value="" className="bg-[#0f1629]">Sélectionner...</option>
                {agents.map((a) => (
                  <option key={a.id} value={a.id} className="bg-[#0f1629]">{a.full_name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-slate-500">Nom agent</label>
              <input
                value={formAgentNom}
                onChange={(e) => setFormAgentNom(e.target.value)}
                placeholder="Auto-rempli"
                readOnly
                className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-400 placeholder-slate-600 focus:outline-none transition-all"
              />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-slate-500">Références crédits (séparées par virgule)</label>
            <textarea
              value={formRefs}
              onChange={(e) => setFormRefs(e.target.value)}
              placeholder="REF-001, REF-002, REF-003"
              rows={3}
              className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-blue-500/40 transition-all resize-y"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="rounded-xl bg-blue-600 px-5 py-2 text-sm font-bold text-white hover:bg-blue-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-500/20"
          >
            {loading ? 'Attribution...' : 'Attribuer'}
          </button>
        </form>
      )}

      {/* ── Erreur ──────────────────────────────────────────────────────────── */}
      {error && (
        <div className="flex items-center gap-3 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" /></svg>
          {error}
        </div>
      )}

      {/* ── Liste portefeuilles ──────────────────────────────────────────────── */}
      {loading && portefeuilles.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-slate-400">
          <div className="mb-4 h-10 w-10 animate-spin rounded-full border-[3px] border-blue-500/20 border-t-blue-500" />
          <p className="text-sm">Chargement des portefeuilles…</p>
        </div>
      ) : portefeuilles.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-slate-400">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-white/5">
            <svg className="w-6 h-6 opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
          </div>
          <p className="text-sm font-semibold text-slate-300">Aucun portefeuille configuré</p>
        </div>
      ) : (
        <div className="space-y-3">
          {portefeuilles.map((pf) => {
            const isOpen = expandedAgent === pf.agent_id;
            const currentPage = pagesByAgent[pf.agent_id] || 1;
            const totalPages = Math.ceil(pf.dossiers.length / DOSSIERS_PER_PAGE);
            const paginated = pf.dossiers.slice((currentPage - 1) * DOSSIERS_PER_PAGE, currentPage * DOSSIERS_PER_PAGE);

            return (
              <div
                key={pf.agent_id}
                className="overflow-hidden rounded-2xl border border-white/[0.07] bg-white/[0.03] transition-all duration-200 hover:border-white/12"
              >
                {/* ── Header agent ── */}
                <div
                  className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 cursor-pointer"
                  onClick={() => setExpandedAgent(isOpen ? null : pf.agent_id)}
                >
                  <div className="flex items-center gap-3 flex-wrap">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-500/15">
                      <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                    </div>
                    <span className="text-base font-bold text-white">{pf.agent_nom}</span>
                    <span className="rounded-full border border-blue-500/25 bg-blue-500/10 px-2.5 py-0.5 text-xs font-semibold text-blue-400">
                      {pf.nombre_dossiers} dossier{pf.nombre_dossiers > 1 ? 's' : ''}
                    </span>
                    <span className="text-xs font-semibold text-amber-400 tabular-nums">
                      {pf.montant_total.toLocaleString('fr-FR')} FCFA
                    </span>
                    {pf.promesses_en_cours > 0 && (
                      <span className="text-xs text-violet-400">{pf.promesses_en_cours} promesse{pf.promesses_en_cours > 1 ? 's' : ''}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={(e) => { e.stopPropagation(); handleImprimerAgent(pf); }}
                      className="rounded-lg border border-blue-500/25 bg-blue-500/10 px-3 py-1.5 text-[11px] font-semibold text-blue-400 hover:bg-blue-500/20 transition-colors"
                    >
                      Rapport
                    </button>
                    <svg className={`w-4 h-4 text-slate-500 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>

                {/* ── Expanded dossiers ── */}
                {isOpen && (
                  <div className="border-t border-white/5 bg-white/[0.02]">
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-white/5">
                            {['Client', 'Réf.', 'Niveau', 'Montant impayé', 'Retard', 'Agence', 'Actions'].map(h => (
                              <th key={h} className="bg-white/[0.02] px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-slate-500">{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {paginated.map((d, idx) => {
                            const niv = getNiveau(d.jours_retard);
                            return (
                              <tr key={d.ref_credit} className={`border-b border-white/[0.03] transition-colors hover:bg-white/[0.04] ${idx % 2 !== 0 ? 'bg-white/[0.015]' : ''}`}>
                                <td className="px-4 py-3 max-w-[160px] truncate text-sm font-medium text-slate-200">{d.nom_client}</td>
                                <td className="px-4 py-3">
                                  <span className="rounded-md border border-white/10 bg-white/5 px-2 py-0.5 font-mono text-[11px] font-semibold text-white/90">{d.ref_credit}</span>
                                </td>
                                <td className="px-4 py-3">
                                  <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${niv.tw.text} ${niv.tw.bg} ${niv.tw.border}`}>
                                    {niv.label}
                                    <span className="ml-1 font-normal opacity-70">({niv.detail})</span>
                                  </span>
                                </td>
                                <td className="px-4 py-3 text-right">
                                  <span className="font-bold text-white/90 tabular-nums">{d.montant_impaye.toLocaleString('fr-FR')}</span>
                                  <span className="ml-1 text-[10px] text-slate-600">FCFA</span>
                                </td>
                                <td className="px-4 py-3 text-center">
                                  <span className={`inline-flex items-center justify-center rounded-full border px-2.5 py-0.5 text-[11px] font-bold tabular-nums ${niv.tw.text} ${niv.tw.bg} ${niv.tw.border}`}>
                                    {d.jours_retard}j
                                  </span>
                                </td>
                                <td className="px-4 py-3 text-xs text-slate-300">{d.agence}</td>
                                <td className="px-4 py-3">
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <button
                                      onClick={(e) => { e.stopPropagation(); handleAddComment(d); }}
                                      className="rounded-lg border border-blue-500/25 bg-blue-500/10 px-2.5 py-1 text-[11px] font-semibold text-blue-400 hover:bg-blue-500/20 transition-colors"
                                      title="Commentaire"
                                    >
                                      Comm.
                                    </button>
                                    <button
                                      onClick={(e) => { e.stopPropagation(); handleAddPromesse(d); }}
                                      className="rounded-lg border border-emerald-500/25 bg-emerald-500/10 px-2.5 py-1 text-[11px] font-semibold text-emerald-400 hover:bg-emerald-500/20 transition-colors"
                                      title="Promesse"
                                    >
                                      Promesse
                                    </button>
                                    <button
                                      onClick={(e) => { e.stopPropagation(); handleViewHistory(d); }}
                                      className="rounded-lg border border-violet-500/25 bg-violet-500/10 px-2.5 py-1 text-[11px] font-semibold text-violet-400 hover:bg-violet-500/20 transition-colors"
                                      title="Historique"
                                    >
                                      Hist.
                                    </button>
                                    {isAdmin && (
                                      <button
                                        onClick={(e) => { e.stopPropagation(); handleDesattribuer(pf.agent_id, [d.ref_credit]); }}
                                        className="rounded-lg border border-red-500/25 bg-red-500/10 px-2.5 py-1 text-[11px] font-semibold text-red-400 hover:bg-red-500/20 transition-colors"
                                        title="Retirer"
                                      >
                                        Retirer
                                      </button>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                    {/* Pagination */}
                    {totalPages > 1 && (
                      <div className="flex items-center justify-center gap-3 border-t border-white/5 px-5 py-3">
                        <button
                          disabled={currentPage === 1}
                          onClick={(e) => { e.stopPropagation(); setPagesByAgent(p => ({ ...p, [pf.agent_id]: currentPage - 1 })); }}
                          className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-slate-300 hover:bg-white/10 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                          ←
                        </button>
                        <span className="text-xs text-slate-500">Page {currentPage} / {totalPages}</span>
                        <button
                          disabled={currentPage === totalPages}
                          onClick={(e) => { e.stopPropagation(); setPagesByAgent(p => ({ ...p, [pf.agent_id]: currentPage + 1 })); }}
                          className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-slate-300 hover:bg-white/10 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                          →
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ── Modales ─────────────────────────────────────────────────────────── */}
      {selectedDossier && (
        <>
          <CommentModal
            isOpen={showCommentModal}
            onClose={() => setShowCommentModal(false)}
            onSubmit={handleCommentSubmit}
            refCredit={selectedDossier.ref_credit}
            nomClient={selectedDossier.nom_client}
          />

          <PromesseModal
            isOpen={showPromesseModal}
            onClose={() => setShowPromesseModal(false)}
            onSubmit={handlePromesseSubmit}
            refCredit={selectedDossier.ref_credit}
            nomClient={selectedDossier.nom_client}
            montantImpaye={selectedDossier.montant_impaye}
          />

          <HistoryModal
            isOpen={showHistoryModal}
            onClose={() => setShowHistoryModal(false)}
            refCredit={selectedDossier.ref_credit}
            nomClient={selectedDossier.nom_client}
            historique={historique}
            loading={loadingHistory}
          />
        </>
      )}
    </div>
  );
};

export default PortefeuilleTab;
