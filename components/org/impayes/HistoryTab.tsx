'use client';

import React, { useState, useEffect } from 'react';
import { useResponsive } from '@/hooks/useResponsive';
import Pagination from '@/components/common/Pagination';
import { apiClient } from '@/lib/api/client';

interface HistoryMessage {
  id: string;
  message_id: string;
  to: string;
  linked_credit: string;
  body: string;
  sent_at?: string;
  provider_message_id?: string;
}

const HistoryTab = () => {
  const { isMobile } = useResponsive();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [smsHistory, setSmsHistory] = useState<HistoryMessage[]>([]);
  const [historyCount, setHistoryCount] = useState(0);
  const [historyPage, setHistoryPage] = useState(1);
  const historyLimit = 20;

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
    loadSmsHistory();
  }, [historyPage]);

  const loadSmsHistory = async () => {
    setLoading(true);
    setError('');
    try {
      const [historyData, countData] = await Promise.all([
        apiClient.get(`/impayes/messages/history?limit=${historyLimit}&skip=${(historyPage - 1) * historyLimit}`) as any,
        apiClient.get('/impayes/messages/history/count') as any,
      ]);

      const historyArray = Array.isArray(historyData) ? historyData : [];
      setSmsHistory(historyArray);
      setHistoryCount(countData?.count || 0);
    } catch (err: any) {
      console.error('Erreur lors du chargement de l\'historique:', err);
      setError(err.message || 'Erreur lors du chargement de l\'historique');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteHistoryMessage = async (messageId: string) => {
    if (!window.confirm("Voulez-vous vraiment supprimer ce SMS de l'historique ?")) {
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`/api/impayes/messages/history/${messageId}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || 'Erreur lors de la suppression');
      }

      alert("SMS supprimé de l'historique avec succès");
      loadSmsHistory();
    } catch (err: any) {
      alert('Erreur: ' + (err.message || 'Erreur lors de la suppression'));
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteBulkHistoryMessages = async (messageIds: string[]) => {
    if (messageIds.length === 0) {
      alert('Aucun SMS sélectionné');
      return;
    }

    if (!window.confirm(`Voulez-vous vraiment supprimer ${messageIds.length} SMS de l'historique ?`)) {
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/impayes/messages/history/bulk-delete', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(messageIds),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || 'Erreur lors de la suppression');
      }

      const data = await response.json();
      alert(data.message || 'SMS supprimés avec succès');
      loadSmsHistory();
    } catch (err: any) {
      alert('Erreur: ' + (err.message || 'Erreur lors de la suppression'));
    } finally {
      setLoading(false);
    }
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
      <div
        style={{
          marginBottom: '20px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '10px',
        }}
      >
        <div>
          <h3 style={{ marginBottom: '10px', marginTop: 0, color: '#fff', fontSize: isMobile ? '1.2rem' : '1.5rem' }}>
            Historique des SMS envoyés ({historyCount})
          </h3>
          <p style={{ color: '#CBD5E1', fontSize: '0.9rem', margin: 0 }}>
            Tous les SMS envoyés sont conservés dans cet historique.
          </p>
        </div>
        {smsHistory.length > 0 && (
          <button
            onClick={() => {
              const messageIds = smsHistory.map((m) => m.message_id);
              handleDeleteBulkHistoryMessages(messageIds);
            }}
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
            {loading ? '⏳ Suppression...' : `🗑️ Supprimer tout l'historique (${smsHistory.length})`}
          </button>
        )}
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
      ) : smsHistory.length === 0 ? (
        <p style={{ textAlign: 'center', color: '#CBD5E1', padding: '40px' }}>Aucun SMS dans l'historique</p>
      ) : (
        <>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', color: '#CBD5E1' }}>
              <thead>
                <tr style={{ background: 'rgba(211, 47, 47, 0.1)' }}>
                  <th style={{ padding: '10px', textAlign: 'left', borderBottom: '2px solid rgba(211, 47, 47, 0.3)', color: '#fff' }}>
                    Date d'envoi
                  </th>
                  <th style={{ padding: '10px', textAlign: 'left', borderBottom: '2px solid rgba(211, 47, 47, 0.3)', color: '#fff' }}>
                    Destinataire
                  </th>
                  <th style={{ padding: '10px', textAlign: 'left', borderBottom: '2px solid rgba(211, 47, 47, 0.3)', color: '#fff' }}>
                    Crédit
                  </th>
                  <th style={{ padding: '10px', textAlign: 'left', borderBottom: '2px solid rgba(211, 47, 47, 0.3)', color: '#fff' }}>
                    Message
                  </th>
                  <th style={{ padding: '10px', textAlign: 'left', borderBottom: '2px solid rgba(211, 47, 47, 0.3)', color: '#fff' }}>
                    ID Provider
                  </th>
                  <th style={{ padding: '10px', textAlign: 'center', borderBottom: '2px solid rgba(211, 47, 47, 0.3)', color: '#fff' }}>
                    Action
                  </th>
                </tr>
              </thead>
              <tbody>
                {smsHistory.map((msg) => (
                  <tr key={msg.id} style={{ borderBottom: '1px solid rgba(211, 47, 47, 0.1)' }}>
                    <td style={{ padding: '10px', fontSize: '0.85rem', color: '#CBD5E1' }}>
                      {msg.sent_at ? new Date(msg.sent_at).toLocaleString('fr-FR') : '-'}
                    </td>
                    <td style={{ padding: '10px', color: '#CBD5E1' }}>{msg.to}</td>
                    <td style={{ padding: '10px', color: '#CBD5E1' }}>{msg.linked_credit}</td>
                    <td style={{ padding: '10px', maxWidth: '300px' }}>
                      <div
                        style={{
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          cursor: 'pointer',
                          color: '#CBD5E1',
                        }}
                        title={msg.body}
                      >
                        {msg.body}
                      </div>
                    </td>
                    <td style={{ padding: '10px', fontSize: '0.85rem', color: '#718096' }}>
                      {msg.provider_message_id || '-'}
                    </td>
                    <td style={{ padding: '10px', textAlign: 'center' }}>
                      <button
                        onClick={() => handleDeleteHistoryMessage(msg.message_id)}
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
                        title="Supprimer de l'historique"
                      >
                        🗑️ Supprimer
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {historyCount > historyLimit && (
            <Pagination
              currentPage={historyPage}
              totalItems={historyCount}
              itemsPerPage={historyLimit}
              currentItemsCount={smsHistory.length}
              onPageChange={(page) => {
                setHistoryPage(page);
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
            />
          )}
        </>
      )}
    </div>
  );
};

export default HistoryTab;

