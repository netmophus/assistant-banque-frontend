'use client';

import React, { useState, useEffect } from 'react';
import { useResponsive } from '@/hooks/useResponsive';
import Pagination from '@/components/common/Pagination';

interface SMSMessage {
  id: string;
  message_id: string;
  to: string;
  linked_credit: string;
  body: string;
  status: 'PENDING' | 'SENT' | 'FAILED';
  created_at?: string;
  sent_at?: string;
  error_message?: string;
}

interface SMSStats {
  pending: number;
  sent: number;
  failed: number;
  total: number;
}

const SMSTab = () => {
  const { isMobile } = useResponsive();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [availableDates, setAvailableDates] = useState<string[]>([]);
  const [selectedDateSituation, setSelectedDateSituation] = useState<string>('');
  const [smsFilter, setSmsFilter] = useState<string>('');
  const [smsStats, setSmsStats] = useState<SMSStats>({ pending: 0, sent: 0, failed: 0, total: 0 });
  const [allMessages, setAllMessages] = useState<SMSMessage[]>([]);
  const [allMessagesTotal, setAllMessagesTotal] = useState(0);
  const [allMessagesPage, setAllMessagesPage] = useState(1);
  const allMessagesLimit = 20;

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
    loadSmsStats();
  }, []);

  useEffect(() => {
    loadAllMessages();
  }, [allMessagesPage, smsFilter]);

  const loadAvailableDates = async () => {
    try {
      const response = await fetch('/api/impayes/dates-situation', {
        headers: getAuthHeaders(),
      });

      if (response.ok) {
        const data = await response.json();
        const dates = data.dates || [];
        setAvailableDates(dates);
        if (dates.length > 0) {
          setSelectedDateSituation(dates[0]);
        }
      }
    } catch (err) {
      console.error('Erreur lors du chargement des dates:', err);
    }
  };

  const loadSmsStats = async () => {
    try {
      const response = await fetch('/api/impayes/messages/stats', {
        headers: getAuthHeaders(),
      });

      if (response.ok) {
        const data = await response.json();
        setSmsStats({
          pending: data.pending || 0,
          sent: data.sent || 0,
          failed: data.failed || 0,
          total: data.total || 0,
        });
      }
    } catch (err) {
      console.error('Erreur lors du chargement des statistiques SMS:', err);
    }
  };

  const loadAllMessages = async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({
        limit: allMessagesLimit.toString(),
        skip: ((allMessagesPage - 1) * allMessagesLimit).toString(),
      });

      if (smsFilter) {
        params.append('status', smsFilter);
      }

      const response = await fetch(`/api/impayes/messages/all?${params}`, {
        headers: getAuthHeaders(),
      });

      if (!response.ok) {
        throw new Error('Erreur lors du chargement des messages');
      }

      const data = await response.json();
      setAllMessages(data.data || data || []);
      setAllMessagesTotal(data.total || (data.data || data).length);
    } catch (err: any) {
      console.error('Erreur lors du chargement des messages:', err);
      setError(err.message || 'Erreur lors du chargement des messages');
    } finally {
      setLoading(false);
    }
  };

  const handleSendSMS = async () => {
    const totalPending = smsStats.pending || allMessages.filter((m) => m.status === 'PENDING').length;
    if (totalPending === 0) {
      alert('Aucun message en attente');
      return;
    }

    if (!window.confirm(`Voulez-vous envoyer ${totalPending} SMS en attente ?`)) {
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/impayes/messages/send', {
        method: 'POST',
        headers: getAuthHeaders(),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || 'Erreur lors de l\'envoi');
      }

      const data = await response.json();
      let detailMessage = data.message || 'SMS envoyés avec succès';

      if (data.errors_detail && data.errors_detail.length > 0) {
        detailMessage += '\n\nErreurs détaillées:\n' + data.errors_detail.slice(0, 5).join('\n');
        if (data.errors_detail.length > 5) {
          detailMessage += `\n... et ${data.errors_detail.length - 5} autres erreurs`;
        }
      }

      alert(detailMessage);
      loadSmsStats();
      loadAllMessages();
    } catch (err: any) {
      alert('Erreur: ' + (err.message || 'Erreur lors de l\'envoi'));
    } finally {
      setLoading(false);
    }
  };

  const handleRegenerateSMS = async () => {
    if (!selectedDateSituation) {
      alert('Veuillez sélectionner une date de situation pour régénérer les SMS');
      return;
    }

    if (
      !window.confirm(
        `Voulez-vous régénérer les SMS pour la date ${selectedDateSituation} ?\n\nLes SMS existants (non envoyés) seront conservés, seuls les SMS manquants seront créés.`
      )
    ) {
      return;
    }

    setLoading(true);
    try {
      const params = new URLSearchParams({ date_situation: selectedDateSituation });
      const response = await fetch(`/api/impayes/messages/regenerate?${params}`, {
        method: 'POST',
        headers: getAuthHeaders(),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || 'Erreur lors de la régénération');
      }

      const data = await response.json();
      alert(data.message || 'SMS régénérés avec succès');
      loadSmsStats();
      loadAllMessages();
    } catch (err: any) {
      alert('Erreur: ' + (err.message || 'Erreur lors de la régénération'));
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteMessage = async (messageId: string) => {
    if (!window.confirm('Voulez-vous vraiment supprimer ce SMS ?')) {
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`/api/impayes/messages/${messageId}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || 'Erreur lors de la suppression');
      }

      alert('SMS supprimé avec succès');
      loadSmsStats();
      loadAllMessages();
    } catch (err: any) {
      alert('Erreur: ' + (err.message || 'Erreur lors de la suppression'));
    } finally {
      setLoading(false);
    }
  };

  const handleBulkDelete = async () => {
    const totalToDelete = smsFilter
      ? smsFilter === 'PENDING'
        ? smsStats.pending
        : smsFilter === 'SENT'
          ? smsStats.sent
          : smsStats.failed
      : smsStats.total;

    if (totalToDelete === 0) {
      alert('Aucun SMS à supprimer');
      return;
    }

    const filterLabel = smsFilter
      ? smsFilter === 'PENDING'
        ? 'en attente'
        : smsFilter === 'SENT'
          ? 'envoyés'
          : 'échoués'
      : 'tous';

    if (!window.confirm(`Voulez-vous vraiment supprimer TOUS les SMS ${filterLabel} (${totalToDelete}) ?`)) {
      return;
    }

    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (smsFilter) {
        params.append('status', smsFilter);
      } else {
        params.append('status', 'ALL');
      }

      const response = await fetch(`/api/impayes/messages/bulk-delete?${params}`, {
        method: 'POST',
        headers: getAuthHeaders(),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || 'Erreur lors de la suppression');
      }

      const data = await response.json();
      alert(data.message || 'SMS supprimés avec succès');
      loadSmsStats();
      loadAllMessages();
    } catch (err: any) {
      alert('Erreur: ' + (err.message || 'Erreur lors de la suppression'));
    } finally {
      setLoading(false);
    }
  };

  const filteredMessages = smsFilter ? allMessages.filter((m) => m.status === smsFilter) : allMessages;
  const totalPending = smsStats.pending || allMessages.filter((m) => m.status === 'PENDING').length;

  return (
    <div>
      {/* En-tête avec actions */}
      <div
        style={{
          marginBottom: '20px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '10px',
          padding: '1rem',
          background: 'rgba(255, 255, 255, 0.05)',
          borderRadius: '12px',
          border: '1px solid rgba(211, 47, 47, 0.2)',
        }}
      >
        <h3 style={{ margin: 0, color: '#fff', fontSize: isMobile ? '1.2rem' : '1.5rem' }}>Gestion des SMS</h3>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
          <select
            value={smsFilter}
            onChange={(e) => {
              setSmsFilter(e.target.value);
              setAllMessagesPage(1);
            }}
            style={{
              padding: '8px 12px',
              borderRadius: '8px',
              border: '2px solid rgba(211, 47, 47, 0.3)',
              background: 'rgba(255, 255, 255, 0.1)',
              color: '#fff',
              fontSize: '0.9rem',
              cursor: 'pointer',
            }}
          >
            <option value="" style={{ background: '#1a1f3a', color: '#fff' }}>
              Tous les SMS
            </option>
            <option value="PENDING" style={{ background: '#1a1f3a', color: '#fff' }}>
              En attente
            </option>
            <option value="SENT" style={{ background: '#1a1f3a', color: '#fff' }}>
              Envoyés
            </option>
            <option value="FAILED" style={{ background: '#1a1f3a', color: '#fff' }}>
              Échoués
            </option>
          </select>

          {selectedDateSituation && (
            <button
              onClick={handleRegenerateSMS}
              disabled={loading}
              style={{
                padding: '10px 20px',
                background: loading ? '#888' : 'linear-gradient(135deg, #ff9800 0%, #f57c00 100%)',
                color: '#fff',
                border: 'none',
                borderRadius: '8px',
                cursor: loading ? 'not-allowed' : 'pointer',
                fontWeight: '600',
                fontSize: '0.9rem',
              }}
              title={`Régénérer les SMS pour la date ${selectedDateSituation}`}
            >
              {loading ? '⏳ Régénération...' : '🔄 Régénérer SMS'}
            </button>
          )}

          {totalPending > 0 && (
            <button
              onClick={handleSendSMS}
              disabled={loading}
              style={{
                padding: '10px 20px',
                background: loading ? '#888' : 'linear-gradient(135deg, #4caf50 0%, #2e7d32 100%)',
                color: '#fff',
                border: 'none',
                borderRadius: '8px',
                cursor: loading ? 'not-allowed' : 'pointer',
                fontWeight: '600',
                fontSize: '0.9rem',
              }}
            >
              {loading ? '⏳ Envoi...' : `📤 Envoyer ${totalPending} SMS`}
            </button>
          )}

          {(() => {
            const totalToDelete = smsFilter
              ? smsFilter === 'PENDING'
                ? smsStats.pending
                : smsFilter === 'SENT'
                  ? smsStats.sent
                  : smsStats.failed
              : smsStats.total;

            return (
              totalToDelete > 0 && (
                <button
                  onClick={handleBulkDelete}
                  disabled={loading}
                  style={{
                    padding: '10px 20px',
                    background: loading ? '#888' : 'linear-gradient(135deg, #f44336 0%, #d32f2f 100%)',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: loading ? 'not-allowed' : 'pointer',
                    fontWeight: '600',
                    fontSize: '0.9rem',
                  }}
                >
                  {loading
                    ? '⏳ Suppression...'
                    : `🗑️ Supprimer tout${smsFilter ? ` (${smsFilter === 'PENDING' ? 'en attente' : smsFilter === 'SENT' ? 'envoyés' : 'échoués'})` : ''} (${totalToDelete})`}
                </button>
              )
            );
          })()}
        </div>
      </div>

      {/* Statistiques SMS */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '15px',
          marginBottom: '20px',
        }}
      >
        <div
          style={{
            background: 'rgba(255, 152, 0, 0.1)',
            padding: '15px',
            borderRadius: '12px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            border: '1px solid rgba(255, 152, 0, 0.2)',
          }}
        >
          <div style={{ fontSize: '0.9rem', color: '#CBD5E1', marginBottom: '5px' }}>En attente</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#ff9800' }}>
            {smsStats.pending || allMessages.filter((m) => m.status === 'PENDING').length}
          </div>
        </div>
        <div
          style={{
            background: 'rgba(76, 175, 80, 0.1)',
            padding: '15px',
            borderRadius: '12px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            border: '1px solid rgba(76, 175, 80, 0.2)',
          }}
        >
          <div style={{ fontSize: '0.9rem', color: '#CBD5E1', marginBottom: '5px' }}>Envoyés</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#4caf50' }}>
            {smsStats.sent || allMessages.filter((m) => m.status === 'SENT').length}
          </div>
        </div>
        <div
          style={{
            background: 'rgba(244, 67, 54, 0.1)',
            padding: '15px',
            borderRadius: '12px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            border: '1px solid rgba(244, 67, 54, 0.2)',
          }}
        >
          <div style={{ fontSize: '0.9rem', color: '#CBD5E1', marginBottom: '5px' }}>Échoués</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#f44336' }}>
            {smsStats.failed || allMessages.filter((m) => m.status === 'FAILED').length}
          </div>
        </div>
        <div
          style={{
            background: 'rgba(33, 150, 243, 0.1)',
            padding: '15px',
            borderRadius: '12px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            border: '1px solid rgba(33, 150, 243, 0.2)',
          }}
        >
          <div style={{ fontSize: '0.9rem', color: '#CBD5E1', marginBottom: '5px' }}>Total</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#2196f3' }}>
            {smsStats.total || allMessagesTotal || allMessages.length}
          </div>
        </div>
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

      {/* Liste des SMS */}
      <div
        style={{
          background: 'rgba(255, 255, 255, 0.05)',
          padding: '20px',
          borderRadius: '16px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          border: '1px solid rgba(211, 47, 47, 0.2)',
        }}
      >
        <h4 style={{ marginBottom: '15px', color: '#fff', fontSize: isMobile ? '1.1rem' : '1.3rem' }}>
          {smsFilter === '' && `Tous les SMS (${smsStats.total || allMessagesTotal || allMessages.length})`}
          {smsFilter === 'PENDING' && `SMS en attente (${smsStats.pending || allMessagesTotal || allMessages.length})`}
          {smsFilter === 'SENT' && `SMS envoyés (${smsStats.sent || allMessagesTotal || allMessages.length})`}
          {smsFilter === 'FAILED' && `SMS échoués (${smsStats.failed || allMessagesTotal || allMessages.length})`}
        </h4>

        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#CBD5E1' }}>
            <p>Chargement...</p>
          </div>
        ) : filteredMessages.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#CBD5E1' }}>
            <p style={{ fontSize: '1.1rem', marginBottom: '10px' }}>Aucun SMS trouvé</p>
            <p style={{ fontSize: '0.9rem', color: '#718096' }}>
              {smsFilter === 'PENDING' && "Aucun SMS en attente. Les SMS sont générés automatiquement lors de l'import si :"}
              {smsFilter === 'PENDING' && (
                <ul style={{ textAlign: 'left', display: 'inline-block', marginTop: '10px', color: '#CBD5E1' }}>
                  <li>Le client a un numéro de téléphone valide</li>
                  <li>Un modèle SMS est configuré pour la tranche de retard</li>
                </ul>
              )}
              {smsFilter !== 'PENDING' && 'Aucun SMS avec ce statut.'}
            </p>
          </div>
        ) : (
          <>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', color: '#CBD5E1' }}>
                <thead>
                  <tr style={{ background: 'rgba(211, 47, 47, 0.1)' }}>
                    <th style={{ padding: '10px', textAlign: 'left', borderBottom: '2px solid rgba(211, 47, 47, 0.3)', color: '#fff' }}>
                      Statut
                    </th>
                    <th style={{ padding: '10px', textAlign: 'left', borderBottom: '2px solid rgba(211, 47, 47, 0.3)', color: '#fff' }}>
                      Destinataire
                    </th>
                    <th style={{ padding: '10px', textAlign: 'left', borderBottom: '2px solid rgba(211, 47, 47, 0.3)', color: '#fff' }}>
                      Crédit
                    </th>
                    <th style={{ padding: '10px', textAlign: 'left', borderBottom: '2px solid rgba(211, 47, 47, 0.3)', color: '#fff' }}>
                      Message (Longueur)
                    </th>
                    <th style={{ padding: '10px', textAlign: 'left', borderBottom: '2px solid rgba(211, 47, 47, 0.3)', color: '#fff' }}>
                      Date
                    </th>
                    <th style={{ padding: '10px', textAlign: 'left', borderBottom: '2px solid rgba(211, 47, 47, 0.3)', color: '#fff' }}>
                      Erreur
                    </th>
                    <th style={{ padding: '10px', textAlign: 'center', borderBottom: '2px solid rgba(211, 47, 47, 0.3)', color: '#fff' }}>
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredMessages.map((msg) => (
                    <tr key={msg.id} style={{ borderBottom: '1px solid rgba(211, 47, 47, 0.1)' }}>
                      <td style={{ padding: '10px' }}>
                        {msg.status === 'PENDING' && (
                          <span
                            style={{
                              padding: '4px 8px',
                              background: 'rgba(255, 152, 0, 0.2)',
                              color: '#ff9800',
                              borderRadius: '4px',
                              fontSize: '0.85rem',
                              fontWeight: 'bold',
                            }}
                          >
                            ⏳ En attente
                          </span>
                        )}
                        {msg.status === 'SENT' && (
                          <span
                            style={{
                              padding: '4px 8px',
                              background: 'rgba(76, 175, 80, 0.2)',
                              color: '#4caf50',
                              borderRadius: '4px',
                              fontSize: '0.85rem',
                              fontWeight: 'bold',
                            }}
                          >
                            ✅ Envoyé
                          </span>
                        )}
                        {msg.status === 'FAILED' && (
                          <span
                            style={{
                              padding: '4px 8px',
                              background: 'rgba(244, 67, 54, 0.2)',
                              color: '#f44336',
                              borderRadius: '4px',
                              fontSize: '0.85rem',
                              fontWeight: 'bold',
                            }}
                          >
                            ❌ Échoué
                          </span>
                        )}
                      </td>
                      <td style={{ padding: '10px', color: '#CBD5E1' }}>{msg.to}</td>
                      <td style={{ padding: '10px', color: '#CBD5E1' }}>{msg.linked_credit}</td>
                      <td style={{ padding: '10px', maxWidth: '500px' }}>
                        <div style={{ marginBottom: '4px', fontSize: '0.8rem', color: '#CBD5E1', fontWeight: 'bold' }}>
                          {msg.body?.length || 0} caractère(s)
                        </div>
                        <div
                          style={{
                            wordBreak: 'break-word',
                            whiteSpace: 'pre-wrap',
                            fontSize: '0.9rem',
                            lineHeight: '1.4',
                            background: 'rgba(255, 255, 255, 0.05)',
                            padding: '8px',
                            borderRadius: '8px',
                            border: '1px solid rgba(211, 47, 47, 0.2)',
                            maxHeight: '200px',
                            overflowY: 'auto',
                            color: '#CBD5E1',
                          }}
                        >
                          {msg.body || '-'}
                        </div>
                      </td>
                      <td style={{ padding: '10px', fontSize: '0.85rem', color: '#CBD5E1' }}>
                        {msg.created_at ? new Date(msg.created_at).toLocaleString('fr-FR') : '-'}
                        {msg.sent_at && (
                          <div style={{ fontSize: '0.8rem', color: '#718096', marginTop: '2px' }}>
                            Envoyé: {new Date(msg.sent_at).toLocaleString('fr-FR')}
                          </div>
                        )}
                      </td>
                      <td style={{ padding: '10px', fontSize: '0.85rem', color: '#f44336' }}>
                        {msg.error_message || '-'}
                      </td>
                      <td style={{ padding: '10px', textAlign: 'center' }}>
                        {msg.status === 'SENT' ? (
                          <span style={{ fontSize: '0.85rem', color: '#718096' }} title="Les SMS envoyés sont conservés dans l'historique">
                            📜 Archivé
                          </span>
                        ) : (
                          <button
                            onClick={() => handleDeleteMessage(msg.message_id)}
                            disabled={loading}
                            style={{
                              padding: '6px 12px',
                              background: 'linear-gradient(135deg, #f44336 0%, #d32f2f 100%)',
                              color: '#fff',
                              border: 'none',
                              borderRadius: '8px',
                              cursor: loading ? 'not-allowed' : 'pointer',
                              fontSize: '0.85rem',
                              fontWeight: '600',
                            }}
                            title="Supprimer ce SMS"
                          >
                            🗑️ Supprimer
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {allMessagesTotal > allMessagesLimit && (
              <Pagination
                currentPage={allMessagesPage}
                totalItems={allMessagesTotal}
                itemsPerPage={allMessagesLimit}
                currentItemsCount={filteredMessages.length}
                onPageChange={(page) => {
                  setAllMessagesPage(page);
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default SMSTab;

