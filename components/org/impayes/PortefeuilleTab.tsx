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
      console.log('Historique response:', response.data);
      setHistorique(response.data?.actions || []);
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
                <div>
                  <span style={{ fontSize: '1.1rem', fontWeight: '700', color: '#fff', marginRight: '12px' }}>
                    {pf.agent_nom}
                  </span>
                  <span style={{ color: '#9ca3af', fontSize: '0.8rem' }}>({pf.agent_id})</span>
                </div>
                <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                  <span style={{ color: '#3b82f6', fontWeight: '600' }}>{pf.nombre_dossiers} dossiers</span>
                  <span style={{ color: '#f59e0b', fontWeight: '600' }}>{pf.montant_total.toLocaleString()} FCFA</span>
                  {pf.promesses_en_cours > 0 && (
                    <span style={{ color: '#8b5cf6', fontSize: '0.8rem' }}>{pf.promesses_en_cours} promesses</span>
                  )}
                  <span style={{ color: '#6b7280', fontSize: '1.2rem' }}>
                    {expandedAgent === pf.agent_id ? '▲' : '▼'}
                  </span>
                </div>
              </div>

              {expandedAgent === pf.agent_id && (
                <div style={{ padding: '0 20px 16px 20px' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ background: 'rgba(255,255,255,0.03)' }}>
                        <th style={thStyle}>Client</th>
                        <th style={thStyle}>Ref</th>
                        <th style={thStyle}>Montant</th>
                        <th style={thStyle}>Retard</th>
                        <th style={thStyle}>Agence</th>
                        <th style={{ ...thStyle, textAlign: 'center' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pf.dossiers.map((d) => (
                        <tr key={d.ref_credit} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                          <td style={tdStyle}>{d.nom_client}</td>
                          <td style={{ ...tdStyle, fontSize: '0.8rem', color: '#9ca3af' }}>{d.ref_credit}</td>
                          <td style={{ ...tdStyle, fontWeight: '600' }}>{d.montant_impaye.toLocaleString()} FCFA</td>
                          <td style={tdStyle}>{d.jours_retard}j</td>
                          <td style={tdStyle}>{d.agence}</td>
                          <td style={{ ...tdStyle, textAlign: 'center' }}>
                            <div style={{ display: 'flex', gap: '4px', justifyContent: 'center', flexWrap: 'wrap' }}>
                              {/* Actions pour tous */}
                              <button
                                onClick={(e) => { e.stopPropagation(); handleAddComment(d); }}
                                style={{
                                  padding: '3px 8px', background: 'rgba(59,130,246,0.2)',
                                  color: '#60a5fa', border: 'none', borderRadius: '4px',
                                  fontSize: '0.7rem', cursor: 'pointer',
                                }}
                                title="Ajouter un commentaire"
                              >
                                💬
                              </button>
                              
                              <button
                                onClick={(e) => { e.stopPropagation(); handleAddPromesse(d); }}
                                style={{
                                  padding: '3px 8px', background: 'rgba(34,197,94,0.2)',
                                  color: '#4ade80', border: 'none', borderRadius: '4px',
                                  fontSize: '0.7rem', cursor: 'pointer',
                                }}
                                title="Enregistrer une promesse"
                              >
                                💰
                              </button>
                              
                              <button
                                onClick={(e) => { e.stopPropagation(); handleViewHistory(d); }}
                                style={{
                                  padding: '3px 8px', background: 'rgba(168,85,247,0.2)',
                                  color: '#a78bfa', border: 'none', borderRadius: '4px',
                                  fontSize: '0.7rem', cursor: 'pointer',
                                }}
                                title="Voir l'historique"
                              >
                                📊
                              </button>
                              
                              {/* Action admin uniquement */}
                              {isAdmin && (
                                <button
                                  onClick={(e) => { e.stopPropagation(); handleDesattribuer(pf.agent_id, [d.ref_credit]); }}
                                  style={{
                                    padding: '3px 8px', background: 'rgba(239,68,68,0.2)',
                                    color: '#f87171', border: 'none', borderRadius: '4px',
                                    fontSize: '0.7rem', cursor: 'pointer',
                                  }}
                                  title="Retirer le dossier"
                                >
                                  ❌
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
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
