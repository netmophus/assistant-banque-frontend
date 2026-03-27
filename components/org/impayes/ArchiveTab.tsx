'use client';

import React, { useState, useEffect } from 'react';
import { apiClient } from '@/lib/api/client';

interface Archive {
  archive_id: string;
  date_archive: string;
  archive_display_name: string;
  archive_number: number;
  snapshots_collection: string;
  messages_collection: string;
  archived_at: string;
  total_snapshots: number;
  total_messages: number;
  montant_total_impaye: number;
  credits_archives?: string[];  // Rendre optionnel
  commentaire?: string;
}

interface ArchiveResponse {
  success: boolean;
  archive_id: string;
  message: string;
  statistiques: {
    total_snapshots: number;
    total_messages: number;
    montant_total_impaye: number;
    date_archive: string;
    snapshots_collection: string;
    messages_collection: string;
  };
  credits_archives: string[];
}

const ArchiveTab = () => {
  const [archives, setArchives] = useState<Archive[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [selectedArchive, setSelectedArchive] = useState<Archive | null>(null);
  const [archiveData, setArchiveData] = useState<any>(null);
  const [loadingArchiveData, setLoadingArchiveData] = useState(false);
  
  // Formulaire d'archivage
  const [archiveForm, setArchiveForm] = useState({
    date_archive: '',
    commentaire: ''
  });
  
  
  useEffect(() => {
    loadArchives();
  }, []);

  const loadArchives = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get('/impayes/archives') as any;
      console.log('Réponse API archives:', response); // Debug
      
      // L'API retourne maintenant {archives: [...]}
      const archivesData = response.archives || [];
      console.log('Archives extraites:', archivesData); // Debug
      setArchives(archivesData);
    } catch (err: any) {
      console.error('Erreur loadArchives:', err); // Debug
      setError(err.message || 'Erreur lors du chargement des archives');
    } finally {
      setLoading(false);
    }
  };

  const loadArchiveData = async (archive: Archive) => {
    try {
      setLoadingArchiveData(true);
      setError('');
      
      // Charger les snapshots de l'archive
      const snapshotsResponse = await apiClient.get<{snapshots: any[]}>(`/impayes/archives/${archive.archive_id}/snapshots`);
      const messagesResponse = await apiClient.get<{messages: any[]}>(`/impayes/archives/${archive.archive_id}/messages`);
      
      setArchiveData({
        snapshots: snapshotsResponse.snapshots || [],
        messages: messagesResponse.messages || []
      });
      setSelectedArchive(archive);
      
    } catch (err: any) {
      setError(err.message || 'Erreur lors du chargement des données de l\'archive');
    } finally {
      setLoadingArchiveData(false);
    }
  };

  const createArchive = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!archiveForm.date_archive) {
      setError('Veuillez spécifier la date de l\'archive');
      return;
    }

    try {
      setLoading(true);
      setError('');
      
      const response = await apiClient.post<ArchiveResponse>('/impayes/archives/create', archiveForm);
      
      console.log('Réponse création archive:', response); // Debug
      setSuccess(`Archive créée avec succès : ${response.archive_id}`);
      setArchiveForm({ date_archive: '', commentaire: '' });
      
      // Recharger les archives
      await loadArchives();
      
    } catch (err: any) {
      setError(err.message || 'Erreur lors de la création de l\'archive');
    } finally {
      setLoading(false);
    }
  };

  
  return (
    <div style={{ padding: '1rem' }}>
      <h2 style={{ color: '#d32f2f', marginBottom: '2rem' }}>📦 Gestion des Archives</h2>
      
      {error && (
        <div style={{ 
          padding: '1rem', 
          background: '#ffebee', 
          border: '1px solid #f44336', 
          borderRadius: '8px', 
          marginBottom: '1rem',
          color: '#c62828'
        }}>
          ❌ {error}
        </div>
      )}
      
      {success && (
        <div style={{ 
          padding: '1rem', 
          background: '#e8f5e8', 
          border: '1px solid #4caf50', 
          borderRadius: '8px', 
          marginBottom: '1rem',
          color: '#2e7d32'
        }}>
          ✅ {success}
        </div>
      )}

      {/* Section Archivage */}
      <div style={{ 
        background: 'rgba(255,255,255,0.05)', 
        padding: '1.5rem', 
        borderRadius: '12px', 
        marginBottom: '2rem',
        border: '1px solid rgba(211, 47, 47, 0.2)'
      }}>
        <h3 style={{ color: '#d32f2f', marginBottom: '1rem' }}>📦 Archiver une situation</h3>
        
        <form onSubmit={createArchive}>
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', color: '#CBD5E1' }}>
              Date de l'archive (YYYY-MM-DD) :
            </label>
            <input
              type="date"
              value={archiveForm.date_archive}
              onChange={(e) => setArchiveForm({...archiveForm, date_archive: e.target.value})}
              style={{
                width: '100%',
                padding: '0.75rem',
                borderRadius: '8px',
                border: '2px solid rgba(211, 47, 47, 0.3)',
                background: 'rgba(255,255,255,0.1)',
                color: '#fff',
                fontSize: '1rem'
              }}
              required
            />
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', color: '#CBD5E1' }}>
              Commentaire (optionnel) :
            </label>
            <textarea
              value={archiveForm.commentaire}
              onChange={(e) => setArchiveForm({...archiveForm, commentaire: e.target.value})}
              placeholder="Description de l'archive..."
              style={{
                width: '100%',
                padding: '0.75rem',
                borderRadius: '8px',
                border: '2px solid rgba(211, 47, 47, 0.3)',
                background: 'rgba(255,255,255,0.1)',
                color: '#fff',
                fontSize: '1rem',
                minHeight: '80px',
                resize: 'vertical'
              }}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              padding: '0.75rem 2rem',
              background: loading ? '#666' : 'linear-gradient(135deg, #d32f2f 0%, #f44336 100%)',
              color: '#fff',
              border: 'none',
              borderRadius: '8px',
              fontSize: '1rem',
              fontWeight: '600',
              cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'all 0.3s ease'
            }}
          >
            {loading ? '⏳ Archivage...' : '📦 Archiver la situation'}
          </button>
        </form>
      </div>

      
      {/* Liste des archives */}
      <div style={{ 
        background: 'rgba(255,255,255,0.05)', 
        padding: '1.5rem', 
        borderRadius: '12px',
        border: '1px solid rgba(211, 47, 47, 0.2)'
      }}>
        <h3 style={{ color: '#d32f2f', marginBottom: '1rem' }}>📋 Archives existantes</h3>
        
        {loading ? (
          <div style={{ textAlign: 'center', padding: '2rem', color: '#CBD5E1' }}>
            ⏳ Chargement des archives...
          </div>
        ) : archives.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '2rem', color: '#CBD5E1' }}>
            📭 Aucune archive pour le moment
          </div>
        ) : (
          <div style={{ display: 'grid', gap: '1rem' }}>
            {archives.map((archive) => (
              <div key={archive.archive_id} style={{
                background: 'rgba(255,255,255,0.05)',
                padding: '1rem',
                borderRadius: '8px',
                border: '1px solid rgba(255,255,255,0.1)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <div>
                  <h4 style={{ color: '#d32f2f', margin: '0 0 0.5rem 0' }}>
                    📦 Archive {archive.archive_display_name || archive.date_archive || 'Date inconnue'}
                  </h4>
                  <p style={{ margin: '0.25rem 0', color: '#CBD5E1', fontSize: '0.9rem' }}>
                    📅 Date : {archive.date_archive || 'Date inconnue'}
                  </p>
                  <p style={{ margin: '0.25rem 0', color: '#CBD5E1', fontSize: '0.9rem' }}>
                    📊 {archive.total_snapshots || 0} crédits | {(archive.credits_archives || []).length} références
                  </p>
                  <p style={{ margin: '0.25rem 0', color: '#CBD5E1', fontSize: '0.9rem' }}>
                    💰 Montant total : {(archive.montant_total_impaye || 0).toLocaleString()} FCFA
                  </p>
                  {archive.commentaire && (
                    <p style={{ margin: '0.5rem 0', color: '#9ca3af', fontSize: '0.85rem', fontStyle: 'italic' }}>
                      💬 {archive.commentaire}
                    </p>
                  )}
                </div>
                <div style={{ textAlign: 'right' }}>
                  <p style={{ margin: '0', color: '#6b7280', fontSize: '0.8rem' }}>
                    📅 {archive.archived_at ? new Date(archive.archived_at).toLocaleDateString() : 'Date inconnue'}
                  </p>
                  <p style={{ margin: '0', color: '#6b7280', fontSize: '0.8rem' }}>
                    📁 {archive.snapshots_collection || 'Collection inconnue'}
                  </p>
                  <button
                    onClick={() => loadArchiveData(archive)}
                    disabled={loadingArchiveData}
                    style={{
                      marginTop: '0.5rem',
                      padding: '0.5rem 1rem',
                      background: loadingArchiveData ? '#666' : 'linear-gradient(135deg, #2196f3 0%, #1976d2 100%)',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '6px',
                      fontSize: '0.8rem',
                      fontWeight: '600',
                      cursor: loadingArchiveData ? 'not-allowed' : 'pointer',
                      transition: 'all 0.3s ease'
                    }}
                  >
                    {loadingArchiveData ? '⏳ Chargement...' : '🔍 Voir les détails'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

      </div>

      {/* Section Consultation des archives */}
      {selectedArchive && (
        <div style={{ 
          background: 'rgba(255,255,255,0.05)', 
          padding: '1.5rem', 
          borderRadius: '12px',
          border: '1px solid rgba(33, 150, 243, 0.2)',
          marginTop: '2rem'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3 style={{ color: '#2196f3', margin: '0' }}>
              📊 Détails de l'archive : {selectedArchive.archive_display_name}
            </h3>
            <button
              onClick={() => {
                setSelectedArchive(null);
                setArchiveData(null);
              }}
              style={{
                padding: '0.5rem 1rem',
                background: 'rgba(255,255,255,0.1)',
                color: '#fff',
                border: '1px solid rgba(255,255,255,0.2)',
                borderRadius: '6px',
                fontSize: '0.8rem',
                cursor: 'pointer'
              }}
            >
              ✖ Fermer
            </button>
          </div>

          {loadingArchiveData ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: '#CBD5E1' }}>
              ⏳ Chargement des données de l'archive...
            </div>
          ) : archiveData ? (
            <div>
              {/* Statistiques */}
              <div style={{ 
                background: 'rgba(33, 150, 243, 0.1)', 
                padding: '1rem', 
                borderRadius: '8px', 
                marginBottom: '1rem' 
              }}>
                <h4 style={{ color: '#2196f3', margin: '0 0 0.5rem 0' }}>📊 Statistiques</h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                  <div>
                    <p style={{ margin: '0', color: '#CBD5E1', fontSize: '0.9rem' }}>
                      📅 Date : {selectedArchive.date_archive}
                    </p>
                    <p style={{ margin: '0', color: '#CBD5E1', fontSize: '0.9rem' }}>
                      📊 Snapshots : {archiveData.snapshots.length}
                    </p>
                  </div>
                  <div>
                    <p style={{ margin: '0', color: '#CBD5E1', fontSize: '0.9rem' }}>
                      💬 Messages : {archiveData.messages.length}
                    </p>
                    <p style={{ margin: '0', color: '#CBD5E1', fontSize: '0.9rem' }}>
                      💰 Montant total : {(selectedArchive.montant_total_impaye || 0).toLocaleString()} FCFA
                    </p>
                  </div>
                </div>
              </div>

              {/* Tableau des snapshots */}
              <div style={{ marginBottom: '1rem' }}>
                <h4 style={{ color: '#2196f3', margin: '0 0 1rem 0' }}>📋 Liste des crédits archivés</h4>
                <div style={{ 
                  background: 'rgba(255,255,255,0.05)', 
                  borderRadius: '8px', 
                  overflow: 'hidden',
                  maxHeight: '300px',
                  overflowY: 'auto'
                }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead style={{ background: 'rgba(33, 150, 243, 0.2)' }}>
                      <tr>
                        <th style={{ padding: '0.75rem', textAlign: 'left', color: '#fff', fontSize: '0.9rem' }}>Référence</th>
                        <th style={{ padding: '0.75rem', textAlign: 'left', color: '#fff', fontSize: '0.9rem' }}>Client</th>
                        <th style={{ padding: '0.75rem', textAlign: 'left', color: '#fff', fontSize: '0.9rem' }}>Montant</th>
                        <th style={{ padding: '0.75rem', textAlign: 'left', color: '#fff', fontSize: '0.9rem' }}>Retard</th>
                      </tr>
                    </thead>
                    <tbody>
                      {archiveData.snapshots.slice(0, 10).map((snapshot: any, index: number) => {
                    console.log('Snapshot data:', snapshot); // Debug
                    return (
                      <tr key={index} style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                        <td style={{ padding: '0.75rem', color: '#CBD5E1', fontSize: '0.9rem' }}>
                          {snapshot.ref_credit || 'N/A'}
                        </td>
                        <td style={{ padding: '0.75rem', color: '#CBD5E1', fontSize: '0.9rem' }}>
                          {snapshot.nom_client || 'N/A'}
                        </td>
                        <td style={{ padding: '0.75rem', color: '#CBD5E1', fontSize: '0.9rem' }}>
                          {(snapshot.montant_total_impaye || 0).toLocaleString()} FCFA
                        </td>
                        <td style={{ padding: '0.75rem', color: '#CBD5E1', fontSize: '0.9rem' }}>
                          {(snapshot.retard_jours || snapshot.jours_retard || 0)} jours
                        </td>
                      </tr>
                    );
                  })}
                    </tbody>
                  </table>
                  {archiveData.snapshots.length > 10 && (
                    <div style={{ padding: '0.75rem', textAlign: 'center', color: '#6b7280', fontSize: '0.8rem' }}>
                      ... et {archiveData.snapshots.length - 10} autres crédits
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
};

export default ArchiveTab;
