'use client';

import React, { useState } from 'react';

interface CommentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (commentaire: string) => void;
  refCredit: string;
  nomClient: string;
}

export const CommentModal: React.FC<CommentModalProps> = ({ isOpen, onClose, onSubmit, refCredit, nomClient }) => {
  const [commentaire, setCommentaire] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentaire.trim()) return;
    
    setLoading(true);
    try {
      await onSubmit(commentaire);
      setCommentaire('');
      onClose();
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center',
      justifyContent: 'center', zIndex: 1000
    }}>
      <div style={{
        background: '#1e293b', border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: '12px', padding: '24px', width: '90%', maxWidth: '500px',
        color: '#fff'
      }}>
        <h3 style={{ margin: '0 0 16px 0', fontSize: '1.2rem' }}>💬 Ajouter un commentaire</h3>
        
        <div style={{ marginBottom: '16px', fontSize: '0.9rem', color: '#9ca3af' }}>
          <div><strong>Dossier:</strong> {refCredit}</div>
          <div><strong>Client:</strong> {nomClient}</div>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem' }}>
              Commentaire de suivi
            </label>
            <textarea
              value={commentaire}
              onChange={(e) => setCommentaire(e.target.value)}
              placeholder="Ex: Appelé le 25/03 - Client promet de payer fin de semaine..."
              style={{
                width: '100%', minHeight: '100px', padding: '12px',
                background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.2)',
                borderRadius: '8px', color: '#fff', fontSize: '0.9rem',
                resize: 'vertical'
              }}
              required
            />
          </div>

          <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '8px 16px', background: 'rgba(255,255,255,0.1)',
                color: '#fff', border: 'none', borderRadius: '6px',
                cursor: 'pointer', fontSize: '0.9rem'
              }}
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={loading || !commentaire.trim()}
              style={{
                padding: '8px 16px', background: '#3b82f6',
                color: '#fff', border: 'none', borderRadius: '6px',
                cursor: loading ? 'not-allowed' : 'pointer', fontSize: '0.9rem',
                opacity: (loading || !commentaire.trim()) ? 0.5 : 1
              }}
            >
              {loading ? 'Enregistrement...' : 'Enregistrer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

interface PromesseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (montant: number, datePromesse: string, commentaire: string) => void;
  refCredit: string;
  nomClient: string;
  montantImpaye: number;
}

export const PromesseModal: React.FC<PromesseModalProps> = ({ 
  isOpen, onClose, onSubmit, refCredit, nomClient, montantImpaye 
}) => {
  const [montant, setMontant] = useState('');
  const [datePromesse, setDatePromesse] = useState('');
  const [commentaire, setCommentaire] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!montant || !datePromesse) return;
    
    setLoading(true);
    try {
      await onSubmit(parseFloat(montant), datePromesse, commentaire);
      setMontant('');
      setDatePromesse('');
      setCommentaire('');
      onClose();
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center',
      justifyContent: 'center', zIndex: 1000
    }}>
      <div style={{
        background: '#1e293b', border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: '12px', padding: '24px', width: '90%', maxWidth: '500px',
        color: '#fff'
      }}>
        <h3 style={{ margin: '0 0 16px 0', fontSize: '1.2rem' }}>💰 Enregistrer une promesse</h3>
        
        <div style={{ marginBottom: '20px', fontSize: '0.9rem', color: '#9ca3af' }}>
          <div><strong>Dossier:</strong> {refCredit}</div>
          <div><strong>Client:</strong> {nomClient}</div>
          <div><strong>Montant impayé:</strong> {montantImpaye.toLocaleString()} FCFA</div>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem' }}>
              Montant promis (FCFA)
            </label>
            <input
              type="number"
              value={montant}
              onChange={(e) => setMontant(e.target.value)}
              placeholder="0"
              min="0"
              max={montantImpaye}
              style={{
                width: '100%', padding: '12px',
                background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.2)',
                borderRadius: '6px', color: '#fff', fontSize: '0.9rem'
              }}
              required
            />
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem' }}>
              Date de la promesse
            </label>
            <input
              type="date"
              value={datePromesse}
              onChange={(e) => setDatePromesse(e.target.value)}
              min={new Date().toISOString().split('T')[0]}
              style={{
                width: '100%', padding: '12px',
                background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.2)',
                borderRadius: '6px', color: '#fff', fontSize: '0.9rem'
              }}
              required
            />
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem' }}>
              Commentaire (optionnel)
            </label>
            <textarea
              value={commentaire}
              onChange={(e) => setCommentaire(e.target.value)}
              placeholder="Détails sur la promesse..."
              style={{
                width: '100%', minHeight: '60px', padding: '12px',
                background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.2)',
                borderRadius: '6px', color: '#fff', fontSize: '0.9rem',
                resize: 'vertical'
              }}
            />
          </div>

          <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '8px 16px', background: 'rgba(255,255,255,0.1)',
                color: '#fff', border: 'none', borderRadius: '6px',
                cursor: 'pointer', fontSize: '0.9rem'
              }}
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={loading || !montant || !datePromesse}
              style={{
                padding: '8px 16px', background: '#22c55e',
                color: '#fff', border: 'none', borderRadius: '6px',
                cursor: loading ? 'not-allowed' : 'pointer', fontSize: '0.9rem',
                opacity: (loading || !montant || !datePromesse) ? 0.5 : 1
              }}
            >
              {loading ? 'Enregistrement...' : 'Enregistrer la promesse'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

interface HistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  refCredit: string;
  nomClient: string;
  historique: any[];
  loading: boolean;
}

export const HistoryModal: React.FC<HistoryModalProps> = ({ 
  isOpen, onClose, refCredit, nomClient, historique, loading 
}) => {
  const [filterType, setFilterType] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'date' | 'type'>('date');

  if (!isOpen) return null;

  // Filtrer l'historique
  const filteredHistorique = filterType === 'all' 
    ? historique 
    : historique.filter(item => (item.type_action || item.type) === filterType);

  // Trier l'historique
  const sortedHistorique = [...filteredHistorique].sort((a, b) => {
    if (sortBy === 'date') {
      const dateA = new Date(a.date_creation || a.timestamp || 0);
      const dateB = new Date(b.date_creation || b.timestamp || 0);
      return dateB.getTime() - dateA.getTime(); // Plus récent en premier
    } else {
      return (a.type_action || a.type).localeCompare(b.type_action || b.type);
    }
  });

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('fr-FR', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  };

  const getActionIcon = (typeAction: string) => {
    switch (typeAction) {
      case 'attribution': return '👤';
      case 'commentaire': return '💬';
      case 'promesse': return '💰';
      case 'escalade': return '⬆️';
      case 'paiement': return '✅';
      case 'appel': return '📞';
      case 'sms': return '📱';
      case 'email': return '📧';
      case 'visite': return '🏢';
      case 'relance': return '🔄';
      case 'suspension': return '⏸️';
      case 'recouvrement': return '💵';
      default: return '📝';
    }
  };

  const getActionColor = (typeAction: string) => {
    switch (typeAction) {
      case 'attribution': return '#3b82f6';
      case 'commentaire': return '#60a5fa';
      case 'promesse': return '#22c55e';
      case 'escalade': return '#f59e0b';
      case 'paiement': return '#10b981';
      case 'appel': return '#8b5cf6';
      case 'sms': return '#06b6d4';
      case 'email': return '#f59e0b';
      case 'visite': return '#ec4899';
      case 'relance': return '#f97316';
      case 'suspension': return '#ef4444';
      case 'recouvrement': return '#22c55e';
      default: return '#9ca3af';
    }
  };

  const getActionLabel = (typeAction: string) => {
    switch (typeAction) {
      case 'attribution': return 'Attribution du dossier';
      case 'commentaire': return 'Commentaire de suivi';
      case 'promesse': return 'Promesse de paiement';
      case 'escalade': return 'Escalade du dossier';
      case 'paiement': return 'Paiement effectué';
      case 'appel': return 'Appel téléphonique';
      case 'sms': return 'SMS envoyé';
      case 'email': return 'Email envoyé';
      case 'visite': return 'Visite client';
      case 'relance': return 'Relance effectuée';
      case 'suspension': return 'Suspension du dossier';
      case 'recouvrement': return 'Recouvrement partiel';
      default: return typeAction.charAt(0).toUpperCase() + typeAction.slice(1);
    }
  };

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center',
      justifyContent: 'center', zIndex: 1000
    }}>
      <div style={{
        background: '#1e293b', border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: '12px', padding: '24px', width: '90%', maxWidth: '700px',
        color: '#fff', maxHeight: '80vh', overflow: 'auto'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h3 style={{ margin: 0, fontSize: '1.2rem' }}>📊 Historique du dossier</h3>
          <button
            onClick={onClose}
            style={{
              background: 'none', border: 'none', color: '#9ca3af',
              fontSize: '1.5rem', cursor: 'pointer', padding: '0'
            }}
          >
            ×
          </button>
        </div>
        
        <div style={{ marginBottom: '20px', fontSize: '0.9rem', color: '#9ca3af' }}>
          <div><strong>Dossier:</strong> {refCredit}</div>
          <div><strong>Client:</strong> {nomClient}</div>
        </div>

        {/* Contrôles de filtrage */}
        {!loading && historique.length > 0 && (
          <div style={{ 
            display: 'flex', gap: '12px', marginBottom: '16px', 
            flexWrap: 'wrap', alignItems: 'center'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <label style={{ fontSize: '0.85rem', color: '#9ca3af' }}>Filtrer:</label>
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                style={{
                  padding: '6px 12px', background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.2)', borderRadius: '6px',
                  color: '#fff', fontSize: '0.85rem'
                }}
              >
                <option value="all">Toutes les actions</option>
                <option value="attribution">Attributions</option>
                <option value="commentaire">Commentaires</option>
                <option value="promesse">Promesses</option>
                <option value="escalade">Escalades</option>
                <option value="appel">Appels</option>
                <option value="sms">SMS</option>
                <option value="email">Emails</option>
                <option value="visite">Visites</option>
              </select>
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <label style={{ fontSize: '0.85rem', color: '#9ca3af' }}>Trier:</label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as 'date' | 'type')}
                style={{
                  padding: '6px 12px', background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.2)', borderRadius: '6px',
                  color: '#fff', fontSize: '0.85rem'
                }}
              >
                <option value="date">Plus récent d'abord</option>
                <option value="type">Par type d'action</option>
              </select>
            </div>
            
            {filterType !== 'all' && (
              <div style={{ 
                fontSize: '0.8rem', color: '#60a5fa', 
                background: 'rgba(96,165,250,0.1)', padding: '4px 8px', borderRadius: '4px'
              }}>
                {filteredHistorique.length} résultat{filteredHistorique.length > 1 ? 's' : ''}
              </div>
            )}
          </div>
        )}

        {/* Résumé statistique */}
        {!loading && historique.length > 0 && (
          <div style={{
            background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '8px', padding: '16px', marginBottom: '20px'
          }}>
            <div style={{ fontSize: '0.9rem', fontWeight: '600', marginBottom: '12px', color: '#cbd5e1' }}>
              📊 Résumé d'activité
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '12px' }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#3b82f6' }}>
                  {historique.length}
                </div>
                <div style={{ fontSize: '0.75rem', color: '#9ca3af' }}>Actions totales</div>
              </div>
              
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#22c55e' }}>
                  {historique.filter(item => item.type_action === 'promesse').length}
                </div>
                <div style={{ fontSize: '0.75rem', color: '#9ca3af' }}>Promesses</div>
              </div>
              
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#60a5fa' }}>
                  {historique.filter(item => item.type_action === 'commentaire').length}
                </div>
                <div style={{ fontSize: '0.75rem', color: '#9ca3af' }}>Commentaires</div>
              </div>
              
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#f59e0b' }}>
                  {historique.filter(item => item.type_action === 'escalade').length}
                </div>
                <div style={{ fontSize: '0.75rem', color: '#9ca3af' }}>Escalades</div>
              </div>
            </div>
            
            {/* Montant total des promesses */}
            {historique.some(item => item.type_action === 'promesse' && item.montant) && (
              <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                <div style={{ fontSize: '0.8rem', color: '#9ca3af' }}>Montant total promis:</div>
                <div style={{ fontSize: '1.2rem', fontWeight: '700', color: '#22c55e' }}>
                  {historique
                    .filter(item => item.type_action === 'promesse' && item.montant)
                    .reduce((sum, item) => sum + item.montant, 0)
                    .toLocaleString()} FCFA
                </div>
              </div>
            )}
          </div>
        )}

        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#9ca3af' }}>
            Chargement de l'historique...
          </div>
        ) : historique.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#9ca3af' }}>
            Aucun historique disponible pour ce dossier
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {sortedHistorique.map((item, index) => (
              <div
                key={index}
                style={{
                  background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '8px', padding: '16px', position: 'relative'
                }}
              >
                {/* Timeline connector */}
                {index < sortedHistorique.length - 1 && (
                  <div style={{
                    position: 'absolute', left: '32px', top: '64px', bottom: '-12px',
                    width: '2px', background: 'rgba(255,255,255,0.1)'
                  }} />
                )}
                
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', marginBottom: '8px' }}>
                  {/* Icon circle */}
                  <div style={{
                    width: '40px', height: '40px', borderRadius: '50%',
                    background: getActionColor(item.type_action || item.type),
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '1.2rem', flexShrink: 0
                  }}>
                    {getActionIcon(item.type_action || item.type)}
                  </div>
                  
                  <div style={{ flex: 1 }}>
                    {/* Action header */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '4px' }}>
                      <div>
                        <div style={{ fontWeight: '600', color: getActionColor(item.type_action || item.type), fontSize: '0.95rem' }}>
                          {getActionLabel(item.type_action || item.type)}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: '#9ca3af' }}>
                          {formatDate(item.created_at || item.timestamp)}
                        </div>
                      </div>
                      
                      {item.created_by_nom && (
                        <div style={{ fontSize: '0.8rem', color: '#9ca3af' }}>
                          par {item.created_by_nom}
                        </div>
                      )}
                    </div>
                    
                    {/* Description */}
                    {item.description && (
                      <div style={{ 
                        fontSize: '0.85rem', lineHeight: '1.4', color: '#cbd5e1',
                        marginTop: '8px', padding: '8px', background: 'rgba(255,255,255,0.03)',
                        borderRadius: '4px', borderLeft: `3px solid ${getActionColor(item.type_action || item.type)}`
                      }}>
                        {item.description}
                      </div>
                    )}
                    
                    {/* Additional info */}
                    <div style={{ display: 'flex', gap: '16px', marginTop: '8px', flexWrap: 'wrap' }}>
                      {item.montant && (
                        <div style={{ 
                          fontSize: '0.8rem', color: '#22c55e', fontWeight: '600',
                          background: 'rgba(34,197,94,0.1)', padding: '4px 8px', borderRadius: '4px'
                        }}>
                          💰 {item.montant.toLocaleString()} FCFA
                        </div>
                      )}
                      
                      {item.resultat && (
                        <div style={{ 
                          fontSize: '0.8rem', color: '#f59e0b', fontWeight: '500',
                          background: 'rgba(245,158,11,0.1)', padding: '4px 8px', borderRadius: '4px'
                        }}>
                          📋 {item.resultat}
                        </div>
                      )}
                      
                      {item.statut && (
                        <div style={{ 
                          fontSize: '0.8rem', color: '#3b82f6', fontWeight: '500',
                          background: 'rgba(59,130,246,0.1)', padding: '4px 8px', borderRadius: '4px'
                        }}>
                          🏷️ {item.statut}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '20px' }}>
          <button
            onClick={onClose}
            style={{
              padding: '8px 16px', background: '#3b82f6',
              color: '#fff', border: 'none', borderRadius: '6px',
              cursor: 'pointer', fontSize: '0.9rem'
            }}
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
};
