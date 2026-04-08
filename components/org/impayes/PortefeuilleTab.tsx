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
  if (jours >= 90) return { label: 'Douteux/NPL', detail: 'Contentieux', color: '#ef4444', bg: 'rgba(239,68,68,0.12)' };
  if (jours >= 60) return { label: 'Zone critique', detail: 'Mise en demeure', color: '#f97316', bg: 'rgba(249,115,22,0.12)' };
  if (jours >= 30) return { label: 'Retard signif.', detail: 'Deuxième relance', color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' };
  return { label: 'Retard léger', detail: 'Première relance', color: '#22c55e', bg: 'rgba(34,197,94,0.12)' };
};

// Styles pour les options des selects
const selectOptionStyle: React.CSSProperties = {
  background: '#1e293b',
  color: '#fff',
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
    // Charger les départements uniquement pour les admins
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
      // Charger l'historique depuis le backend
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
      
      // Recharger l'historique si la modal est ouverte
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
      // Créer la promesse
      await apiClient.post('/impayes/promesses', {
        ref_credit: selectedDossier?.ref_credit,
        nom_client: selectedDossier?.nom_client,
        montant_promis: montant,
        date_promesse: datePromesse,
        commentaire: commentaire,
        utilisateur: currentUser?.full_name || currentUser?.email
      });
      
      // Ajouter au journal
      await apiClient.post('/impayes/journal', {
        ref_credit: selectedDossier?.ref_credit,
        type_action: 'promesse',
        description: `Promesse de paiement de ${montant.toLocaleString()} FCFA pour le ${datePromesse}${commentaire ? ': ' + commentaire : ''}`,
        utilisateur: currentUser?.full_name || currentUser?.email,
        montant: montant
      });
      
      // Recharger l'historique si la modal est ouverte
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
    <div>
      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px', marginBottom: '20px' }}>
        <div style={cardStyle}>
          <div style={cardLabel}>Agents</div>
          <div style={{ ...cardValue, color: '#3b82f6' }}>{portefeuilles.length}</div>
        </div>
        <div style={cardStyle}>
          <div style={cardLabel}>Dossiers attribues</div>
          <div style={{ ...cardValue, color: '#22c55e' }}>{totalDossiers}</div>
        </div>
        <div style={cardStyle}>
          <div style={cardLabel}>Montant total</div>
          <div style={{ ...cardValue, color: '#f59e0b', fontSize: '1rem' }}>{totalMontant.toLocaleString()} FCFA</div>
        </div>
      </div>

      {/* Actions */}
      {isAdmin && (
        <div style={{ marginBottom: '16px' }}>
          <button
            onClick={() => setShowForm(!showForm)}
            style={{
              padding: '8px 18px',
              background: showForm ? 'rgba(255,255,255,0.1)' : 'linear-gradient(135deg, #3b82f6, #2563eb)',
              color: '#fff', border: 'none', borderRadius: '8px',
              fontWeight: '600', fontSize: '0.85rem', cursor: 'pointer',
            }}
          >
            {showForm ? 'Fermer' : '+ Attribuer des dossiers'}
          </button>
        </div>
      )}

      {/* Formulaire */}
      {showForm && isAdmin && (
        <form
          onSubmit={handleAttribuer}
          style={{
            background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.3)',
            borderRadius: '12px', padding: '20px', marginBottom: '20px',
          }}
        >
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', marginBottom: '12px' }}>
            <div>
              <label style={labelStyle}>Département *</label>
              <select value={formDepartmentId} onChange={(e) => setFormDepartmentId(e.target.value)} style={inputStyle} required>
                <option value="" style={selectOptionStyle}>Sélectionner...</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id} style={selectOptionStyle}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Service</label>
              <select 
                value={formServiceId} 
                onChange={(e) => setFormServiceId(e.target.value)} 
                style={inputStyle}
                disabled={!formDepartmentId}
              >
                <option value="" style={selectOptionStyle}>Tous les services</option>
                {services.map((s) => (
                  <option key={s.id} value={s.id} style={selectOptionStyle}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Agent *</label>
              <select 
                value={formAgentId} 
                onChange={(e) => {
                  const agentId = e.target.value;
                  setFormAgentId(agentId);
                  const selectedAgent = agents.find(a => a.id === agentId);
                  setFormAgentNom(selectedAgent?.full_name || '');
                }} 
                style={inputStyle} 
                required
                disabled={!formDepartmentId}
              >
                <option value="" style={selectOptionStyle}>Sélectionner...</option>
                {agents.map((a) => (
                  <option key={a.id} value={a.id} style={selectOptionStyle}>
                    {a.full_name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Nom Agent</label>
              <input 
                value={formAgentNom} 
                onChange={(e) => setFormAgentNom(e.target.value)} 
                style={inputStyle} 
                placeholder="Auto-rempli" 
                readOnly 
              />
            </div>
          </div>
          <div style={{ marginBottom: '12px' }}>
            <label style={labelStyle}>References credits (separees par virgule)</label>
            <textarea
              value={formRefs}
              onChange={(e) => setFormRefs(e.target.value)}
              style={{ ...inputStyle, minHeight: '60px', resize: 'vertical' }}
              placeholder="REF-001, REF-002, REF-003"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            style={{
              padding: '10px 24px',
              background: loading ? '#4b5563' : 'linear-gradient(135deg, #3b82f6, #2563eb)',
              color: '#fff', border: 'none', borderRadius: '8px',
              fontWeight: '600', cursor: loading ? 'not-allowed' : 'pointer',
            }}
          >
            {loading ? 'Attribution...' : 'Attribuer'}
          </button>
        </form>
      )}

      {error && (
        <div style={{ padding: '12px', background: 'rgba(239,68,68,0.15)', borderRadius: '8px', color: '#f87171', marginBottom: '12px' }}>{error}</div>
      )}

      {loading && portefeuilles.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px', color: '#CBD5E1' }}>Chargement...</div>
      ) : portefeuilles.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>Aucun portefeuille configure</div>
      ) : (
        <div style={{ display: 'grid', gap: '12px' }}>
          {portefeuilles.map((pf) => (
            <div
              key={pf.agent_id}
              style={{
                background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: '12px', overflow: 'hidden',
              }}
            >
              <div
                style={{
                  padding: '16px 20px', display: 'flex', justifyContent: 'space-between',
                  alignItems: 'center', cursor: 'pointer', flexWrap: 'wrap', gap: '8px',
                }}
                onClick={() => setExpandedAgent(expandedAgent === pf.agent_id ? null : pf.agent_id)}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '1.1rem', fontWeight: '700', color: '#fff' }}>
                    {pf.agent_nom}
                  </span>
                  <span style={{ color: '#3b82f6', fontWeight: '600', fontSize: '0.85rem' }}>{pf.nombre_dossiers} dossiers</span>
                  <span style={{ color: '#f59e0b', fontWeight: '600', fontSize: '0.85rem' }}>{pf.montant_total.toLocaleString()} FCFA</span>
                  {pf.promesses_en_cours > 0 && (
                    <span style={{ color: '#8b5cf6', fontSize: '0.8rem' }}>{pf.promesses_en_cours} promesses</span>
                  )}
                </div>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleImprimerAgent(pf); }}
                    style={{ padding: '4px 10px', background: 'rgba(59,130,246,0.15)', border: '1px solid rgba(59,130,246,0.3)', borderRadius: '6px', color: '#60a5fa', fontSize: '0.75rem', cursor: 'pointer', fontWeight: '600' }}
                    title="Imprimer le rapport de cet agent"
                  >
                    🖨️ Rapport
                  </button>
                  <span style={{ color: '#6b7280', fontSize: '1.2rem' }}>
                    {expandedAgent === pf.agent_id ? '▲' : '▼'}
                  </span>
                </div>
              </div>

              {expandedAgent === pf.agent_id && (() => {
                const currentPage = pagesByAgent[pf.agent_id] || 1;
                const totalPages = Math.ceil(pf.dossiers.length / DOSSIERS_PER_PAGE);
                const paginated = pf.dossiers.slice((currentPage - 1) * DOSSIERS_PER_PAGE, currentPage * DOSSIERS_PER_PAGE);
                return (
                  <div style={{ padding: '0 20px 16px 20px' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr style={{ background: 'rgba(255,255,255,0.03)' }}>
                          <th style={thStyle}>Client</th>
                          <th style={thStyle}>Réf.</th>
                          <th style={thStyle}>Niveau</th>
                          <th style={thStyle}>Montant impayé</th>
                          <th style={thStyle}>Retard</th>
                          <th style={thStyle}>Agence</th>
                          <th style={{ ...thStyle, textAlign: 'center' }}>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {paginated.map((d) => {
                          const niv = getNiveau(d.jours_retard);
                          return (
                            <tr key={d.ref_credit} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                              <td style={tdStyle}>{d.nom_client}</td>
                              <td style={{ ...tdStyle, fontSize: '0.8rem', color: '#9ca3af' }}>{d.ref_credit}</td>
                              <td style={tdStyle}>
                                <span style={{ padding: '2px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: '600', color: niv.color, background: niv.bg }}>
                                  {niv.label} <span style={{ fontWeight: '400', opacity: 0.8 }}>({niv.detail})</span>
                                </span>
                              </td>
                              <td style={{ ...tdStyle, fontWeight: '600' }}>{d.montant_impaye.toLocaleString()} FCFA</td>
                              <td style={{ ...tdStyle, color: niv.color, fontWeight: '600' }}>{d.jours_retard}j</td>
                              <td style={tdStyle}>{d.agence}</td>
                              <td style={{ ...tdStyle, textAlign: 'center' }}>
                                <div style={{ display: 'flex', gap: '4px', justifyContent: 'center', flexWrap: 'wrap' }}>
                                  <button onClick={(e) => { e.stopPropagation(); handleAddComment(d); }}
                                    style={{ padding: '3px 8px', background: 'rgba(59,130,246,0.2)', color: '#60a5fa', border: 'none', borderRadius: '4px', fontSize: '0.7rem', cursor: 'pointer' }}
                                    title="Commentaire">💬</button>
                                  <button onClick={(e) => { e.stopPropagation(); handleAddPromesse(d); }}
                                    style={{ padding: '3px 8px', background: 'rgba(34,197,94,0.2)', color: '#4ade80', border: 'none', borderRadius: '4px', fontSize: '0.7rem', cursor: 'pointer' }}
                                    title="Promesse">💰</button>
                                  <button onClick={(e) => { e.stopPropagation(); handleViewHistory(d); }}
                                    style={{ padding: '3px 8px', background: 'rgba(168,85,247,0.2)', color: '#a78bfa', border: 'none', borderRadius: '4px', fontSize: '0.7rem', cursor: 'pointer' }}
                                    title="Historique">📊</button>
                                  {isAdmin && (
                                    <button onClick={(e) => { e.stopPropagation(); handleDesattribuer(pf.agent_id, [d.ref_credit]); }}
                                      style={{ padding: '3px 8px', background: 'rgba(239,68,68,0.2)', color: '#f87171', border: 'none', borderRadius: '4px', fontSize: '0.7rem', cursor: 'pointer' }}
                                      title="Retirer">❌</button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>

                    {/* Pagination */}
                    {totalPages > 1 && (
                      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', marginTop: '12px' }}>
                        <button
                          disabled={currentPage === 1}
                          onClick={(e) => { e.stopPropagation(); setPagesByAgent(p => ({ ...p, [pf.agent_id]: currentPage - 1 })); }}
                          style={{ padding: '4px 10px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '6px', color: currentPage === 1 ? '#4b5563' : '#cbd5e1', cursor: currentPage === 1 ? 'not-allowed' : 'pointer', fontSize: '0.8rem' }}
                        >←</button>
                        <span style={{ fontSize: '0.8rem', color: '#9ca3af' }}>Page {currentPage} / {totalPages}</span>
                        <button
                          disabled={currentPage === totalPages}
                          onClick={(e) => { e.stopPropagation(); setPagesByAgent(p => ({ ...p, [pf.agent_id]: currentPage + 1 })); }}
                          style={{ padding: '4px 10px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '6px', color: currentPage === totalPages ? '#4b5563' : '#cbd5e1', cursor: currentPage === totalPages ? 'not-allowed' : 'pointer', fontSize: '0.8rem' }}
                        >→</button>
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
          ))}
        </div>
      )}

      {/* Modales */}
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

const cardStyle: React.CSSProperties = {
  background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: '10px', padding: '14px', textAlign: 'center',
};
const cardLabel: React.CSSProperties = { fontSize: '0.75rem', color: '#9ca3af', marginBottom: '4px' };
const cardValue: React.CSSProperties = { fontSize: '1.3rem', fontWeight: '700' };
const labelStyle: React.CSSProperties = { color: '#CBD5E1', fontSize: '0.8rem', display: 'block', marginBottom: '4px' };
const inputStyle: React.CSSProperties = {
  padding: '8px 12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.2)',
  background: 'rgba(255,255,255,0.05)', color: '#fff', fontSize: '0.85rem', width: '100%',
};
const thStyle: React.CSSProperties = {
  padding: '8px 10px', textAlign: 'left', color: '#9ca3af', fontSize: '0.75rem',
  fontWeight: '600', borderBottom: '1px solid rgba(255,255,255,0.08)',
};
const tdStyle: React.CSSProperties = { padding: '8px 10px', color: '#CBD5E1', fontSize: '0.85rem' };

export default PortefeuilleTab;
