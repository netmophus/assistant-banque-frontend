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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [candidats, setCandidats] = useState<Candidat[]>([]);
  const [candidatsTotal, setCandidatsTotal] = useState(0);
  const [candidatsPage, setCandidatsPage] = useState(1);
  const candidatsLimit = 20;
  const [showContactGestionnaireModal, setShowContactGestionnaireModal] = useState(false);
  const [selectedCandidatForContact, setSelectedCandidatForContact] = useState<Candidat | null>(null);

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
    loadCandidats();
  }, [candidatsPage]);

  // Écouter les événements d'import pour recharger les candidats
  useEffect(() => {
    const handleDataImported = (event: CustomEvent) => {
      console.log('🔄 Données importées, rechargement des candidats...');
      loadCandidats();
    };

    window.addEventListener('dataImported', handleDataImported as EventListener);
    
    return () => {
      window.removeEventListener('dataImported', handleDataImported as EventListener);
    };
  }, [candidatsPage]);

  const loadCandidats = async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({
        limit: candidatsLimit.toString(),
        skip: ((candidatsPage - 1) * candidatsLimit).toString(),
      });

      const data = await apiClient.get(`/impayes/candidats-restructuration?${params}`) as any;
      console.log('🎯 Restructuration - Données reçues:', data);
      console.log('🎯 Restructuration - data.data:', data.data);
      console.log('🎯 Restructuration - data.snapshots:', data.snapshots);
      console.log('🎯 Restructuration - Params:', params.toString());
      const candidatsData = Array.isArray(data.data?.snapshots) ? data.data.snapshots : (Array.isArray(data.data) ? data.data : (Array.isArray(data.snapshots) ? data.snapshots : []));
      console.log('🎯 Restructuration - Candidats traités:', candidatsData.length, candidatsData);
      setCandidats(candidatsData);
      setCandidatsTotal(data.total || candidatsData.length);
    } catch (err: any) {
      console.error('Erreur lors du chargement des candidats:', err);
      setError(err.message || 'Erreur lors du chargement des candidats');
    } finally {
      setLoading(false);
    }
  };

  const handleContacterGestionnaire = (candidat: Candidat) => {
    setSelectedCandidatForContact(candidat);
    setShowContactGestionnaireModal(true);
  };

  return (
    <div
      style={{
        background: 'rgba(255, 255, 255, 0.05)',
        padding: '20px',
        borderRadius: '16px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        border: '1px solid rgba(211, 47, 47, 0.2)',
      }}
    >
      {showContactGestionnaireModal && (
        <div
          onClick={() => setShowContactGestionnaireModal(false)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.45)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: isMobile ? '1rem' : '2rem',
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '100%',
              maxWidth: '620px',
              borderRadius: '20px',
              border: '2px solid rgba(255, 152, 0, 0.55)',
              background: 'linear-gradient(180deg, rgba(248, 250, 252, 0.98) 0%, rgba(241, 245, 249, 0.98) 100%)',
              boxShadow: '0 20px 60px rgba(2, 6, 23, 0.35)',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                padding: isMobile ? '1rem' : '1.25rem 1.5rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                borderBottom: '1px solid rgba(15, 23, 42, 0.12)',
                background: 'rgba(255, 152, 0, 0.14)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div
                  style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '12px',
                    background: 'rgba(255, 152, 0, 0.25)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '1.25rem',
                  }}
                >
                  ⚠️
                </div>
                <div>
                  <div style={{ color: '#0f172a', fontWeight: 800, fontSize: '1.05rem' }}>Action requise</div>
                  <div style={{ color: '#334155', fontSize: '0.85rem' }}>Contact du gestionnaire</div>
                </div>
              </div>

              <button
                onClick={() => setShowContactGestionnaireModal(false)}
                style={{
                  padding: '0.5rem 0.75rem',
                  borderRadius: '12px',
                  border: '1px solid rgba(15, 23, 42, 0.18)',
                  background: 'rgba(15, 23, 42, 0.06)',
                  color: '#0f172a',
                  cursor: 'pointer',
                  fontWeight: 700,
                }}
              >
                Fermer
              </button>
            </div>

            <div style={{ padding: isMobile ? '1rem' : '1.25rem 1.5rem' }}>
              <div
                style={{
                  padding: '1rem',
                  borderRadius: '16px',
                  background: 'rgba(255, 237, 213, 0.85)',
                  border: '1px solid rgba(255, 152, 0, 0.35)',
                  color: '#0f172a',
                  lineHeight: 1.6,
                }}
              >
                Pour <strong>refuser</strong> ou <strong>valider</strong> une restructuration, veuillez contacter le gestionnaire.
                {selectedCandidatForContact ? (
                  <>
                    <br />
                    <br />
                    Crédit : <strong>{selectedCandidatForContact.ref_credit}</strong>
                    <br />
                    Client : <strong>{selectedCandidatForContact.nom_client}</strong>
                  </>
                ) : null}
              </div>

              <div style={{ marginTop: '1rem', display: 'flex', justifyContent: 'flex-end' }}>
                <button
                  onClick={() => setShowContactGestionnaireModal(false)}
                  style={{
                    padding: '10px 14px',
                    borderRadius: '12px',
                    border: '1px solid rgba(15, 23, 42, 0.18)',
                    background: 'rgba(255, 255, 255, 0.85)',
                    color: '#0f172a',
                    cursor: 'pointer',
                    fontWeight: 800,
                  }}
                >
                  OK
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div
        style={{
          marginBottom: '20px',
          padding: '15px',
          background: 'rgba(255, 152, 0, 0.1)',
          borderRadius: '12px',
          border: '1px solid rgba(255, 152, 0, 0.3)',
        }}
      >
        <h3
          style={{
            marginTop: 0,
            marginBottom: '10px',
            color: '#ff9800',
            fontSize: isMobile ? '1.2rem' : '1.5rem',
          }}
        >
          Candidats à restructuration ({candidatsTotal || candidats.length})
        </h3>
        <p style={{ margin: 0, fontSize: '0.9rem', color: '#CBD5E1', lineHeight: '1.6' }}>
          <strong style={{ color: '#fff' }}>Conditions pour être candidat à restructuration :</strong>
          <br />
          • Jours de retard ≥ 60 jours (configurable dans "Configuration")
          <br />
          • Ratio impayé/encours {'>'} 30% (configurable dans "Configuration")
          <br />
          <em style={{ color: '#CBD5E1' }}>
            Si aucun candidat n'apparaît, vérifiez que vos données satisfont ces conditions.
          </em>
        </p>
      </div>

      {error && (
        <div
          style={{
            padding: '1rem',
            background: 'rgba(211, 47, 47, 0.2)',
            color: '#ff6b6b',
            borderRadius: '12px',
            marginBottom: '1rem',
            border: '1px solid rgba(211, 47, 47, 0.3)',
          }}
        >
          ⚠️ {error}
        </div>
      )}

      {loading ? (
        <div style={{ padding: '40px', textAlign: 'center', color: '#CBD5E1' }}>
          <p>Chargement...</p>
        </div>
      ) : candidats.length === 0 ? (
        <div style={{ padding: '40px', textAlign: 'center', color: '#CBD5E1' }}>
          <p>Aucun candidat à restructuration trouvé.</p>
        </div>
      ) : (
        <>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', color: '#CBD5E1' }}>
              <thead>
                <tr style={{ background: 'rgba(255, 152, 0, 0.1)' }}>
                  <th style={{ padding: '10px', textAlign: 'left', borderBottom: '2px solid rgba(255, 152, 0, 0.3)', color: '#fff' }}>
                    Téléphone
                  </th>
                  <th style={{ padding: '10px', textAlign: 'left', borderBottom: '2px solid rgba(255, 152, 0, 0.3)', color: '#fff' }}>
                    Ref. Crédit
                  </th>
                  <th style={{ padding: '10px', textAlign: 'left', borderBottom: '2px solid rgba(255, 152, 0, 0.3)', color: '#fff' }}>
                    Client
                  </th>
                  <th style={{ padding: '10px', textAlign: 'right', borderBottom: '2px solid rgba(255, 152, 0, 0.3)', color: '#fff' }}>
                    Montant impayé
                  </th>
                  <th style={{ padding: '10px', textAlign: 'center', borderBottom: '2px solid rgba(255, 152, 0, 0.3)', color: '#fff' }}>
                    Jours retard
                  </th>
                  <th style={{ padding: '10px', textAlign: 'right', borderBottom: '2px solid rgba(255, 152, 0, 0.3)', color: '#fff' }}>
                    Ratio impayé/encours
                  </th>
                  <th style={{ padding: '10px', textAlign: 'left', borderBottom: '2px solid rgba(255, 152, 0, 0.3)', color: '#fff' }}>
                    Agence
                  </th>
                  <th style={{ padding: '10px', textAlign: 'left', borderBottom: '2px solid rgba(255, 152, 0, 0.3)', color: '#fff' }}>
                    Gestionnaire
                  </th>
                  <th style={{ padding: '10px', textAlign: 'left', borderBottom: '2px solid rgba(255, 152, 0, 0.3)', color: '#fff' }}>
                    Action
                  </th>
                </tr>
              </thead>
              <tbody>
                {candidats.map((candidat) => (
                  <tr key={candidat.id} style={{ borderBottom: '1px solid rgba(255, 152, 0, 0.1)' }}>
                    <td style={{ padding: '10px', fontFamily: 'monospace', fontSize: '0.9rem', color: '#CBD5E1' }}>
                      {candidat.telephone_client || <span style={{ color: '#718096' }}>-</span>}
                    </td>
                    <td style={{ padding: '10px', color: '#CBD5E1' }}>{candidat.ref_credit}</td>
                    <td style={{ padding: '10px', color: '#CBD5E1' }}>{candidat.nom_client}</td>
                    <td style={{ padding: '10px', textAlign: 'right', color: '#CBD5E1' }}>
                      {candidat.montant_total_impaye?.toLocaleString('fr-FR') || 0} FCFA
                    </td>
                    <td style={{ padding: '10px', textAlign: 'center', color: '#CBD5E1' }}>
                      {candidat.jours_retard}
                    </td>
                    <td style={{ padding: '10px', textAlign: 'right', color: '#CBD5E1' }}>
                      {candidat.ratio_impaye_encours?.toFixed(2) || 0}%
                    </td>
                    <td style={{ padding: '10px', color: '#CBD5E1' }}>
                      {candidat.agence || <span style={{ color: '#718096' }}>-</span>}
                    </td>
                    <td style={{ padding: '10px', color: '#CBD5E1' }}>
                      {candidat.gestionnaire || <span style={{ color: '#718096' }}>-</span>}
                    </td>
                    <td style={{ padding: '10px' }}>
                      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                        <button
                          onClick={() => handleContacterGestionnaire(candidat)}
                          style={{
                            padding: '6px 12px',
                            background: 'linear-gradient(135deg, #ff9800 0%, #f57c00 100%)',
                            color: '#fff',
                            border: 'none',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            fontSize: '0.85rem',
                            fontWeight: '600',
                          }}
                        >
                          Contacter le gestionnaire
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {candidatsTotal > candidatsLimit && (
            <Pagination
              currentPage={candidatsPage}
              totalItems={candidatsTotal}
              itemsPerPage={candidatsLimit}
              currentItemsCount={candidats.length}
              onPageChange={(page) => {
                setCandidatsPage(page);
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
            />
          )}
        </>
      )}
    </div>
  );
};

export default RestructurationTab;

