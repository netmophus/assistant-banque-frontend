'use client';

import React, { useState } from 'react';
import { useResponsive } from '@/hooks/useResponsive';

interface ImportError {
  ligne: number;
  champ: string;
  message: string;
}

interface PreviewData {
  success: boolean;
  message: string;
  stats_preview?: {
    total_montant_impaye: number;
    total_credits: number;
    candidats_restructuration: number;
    repartition_tranches?: Record<string, number>;
    repartition_segments?: Record<string, number>;
    repartition_agences?: Record<string, number>;
  };
  messages_preview?: any[];
  snapshots_preview?: any[];
  errors?: ImportError[];
}

interface ImportConfirmResult {
  success: boolean;
  message?: string;
  [key: string]: any;
}

const ImportTab = () => {
  const { isMobile, isTablet } = useResponsive();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [importErrors, setImportErrors] = useState<ImportError[]>([]);
  const [previewData, setPreviewData] = useState<PreviewData | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [showImportResultModal, setShowImportResultModal] = useState(false);
  const [importConfirmResult, setImportConfirmResult] = useState<ImportConfirmResult | null>(null);
  const [dateSituation, setDateSituation] = useState(() => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  });

  // Helper function to get headers with authentication token
  const getAuthHeaders = (): HeadersInit => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    const headers: HeadersInit = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setError('');
      setPreviewData(null);
      setShowPreview(false);
    }
  };

  const handlePreview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !dateSituation) {
      setError('Veuillez sélectionner un fichier et une date de situation');
      return;
    }

    setLoading(true);
    setError('');
    setMessage('');
    setImportErrors([]);
    setPreviewData(null);
    setShowPreview(false);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('date_situation', dateSituation);

      const response = await fetch('/api/impayes/import/preview', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || 'Erreur lors de la prévisualisation');
      }

      const data: PreviewData = await response.json();

      if (data.success) {
        setPreviewData(data);
        setShowPreview(true);
        setMessage(data.message);
      } else {
        setImportErrors(data.errors || []);
        setError(data.message || 'Erreurs détectées dans le fichier');
      }
    } catch (err: any) {
      setError(err.message || 'Erreur lors de la prévisualisation');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmImport = async () => {
    if (!file || !dateSituation) {
      setError('Fichier ou date manquant');
      return;
    }

    setLoading(true);
    setError('');
    setMessage('');

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('date_situation', dateSituation);

      const response = await fetch('/api/impayes/import/confirm', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || 'Erreur lors de l\'import');
      }

      const data = await response.json();

      if (data.success) {
        setMessage(data.message);
        setFile(null);
        // Reset file input
        const fileInput = document.getElementById('import-file-input') as HTMLInputElement;
        if (fileInput) fileInput.value = '';
        setPreviewData(null);
        setShowPreview(false);
        setImportConfirmResult(data);
        setShowImportResultModal(true);
        
        // Notifier les autres composants de recharger les données
        window.dispatchEvent(new CustomEvent('dataImported', { 
          detail: { 
            type: 'impayes',
            dateSituation: dateSituation,
            success: true 
          } 
        }));
      } else {
        setImportErrors(data.errors || []);
        setError(data.message || 'Erreurs détectées dans le fichier');
      }
    } catch (err: any) {
      setError(err.message || 'Erreur lors de l\'import');
    } finally {
      setLoading(false);
    }
  };

  const downloadTemplate = async () => {
    try {
      const response = await fetch('/api/impayes/config/modele-excel', {
        headers: getAuthHeaders(),
      });

      if (!response.ok) {
        throw new Error('Erreur lors du téléchargement');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'modele_impayes.xlsx');
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      alert('Erreur lors du téléchargement du modèle: ' + err.message);
    }
  };

  return (
    <div
      style={{
        background: 'rgba(255, 255, 255, 0.05)',
        padding: isMobile ? '1.5rem' : '2rem',
        borderRadius: '24px',
        border: '1px solid rgba(211, 47, 47, 0.2)',
      }}
    >
      {showImportResultModal && importConfirmResult && (
        <div
          onClick={() => setShowImportResultModal(false)}
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
              maxWidth: '720px',
              borderRadius: '20px',
              border: '2px solid rgba(46, 125, 50, 0.55)',
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
                background: 'rgba(46, 125, 50, 0.12)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div
                  style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '12px',
                    background: 'rgba(46, 125, 50, 0.25)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '1.25rem',
                  }}
                >
                  ✅
                </div>
                <div>
                  <div style={{ color: '#0f172a', fontWeight: 800, fontSize: '1.05rem' }}>Import terminé</div>
                  <div style={{ color: '#334155', fontSize: '0.85rem' }}>Résumé de la génération des SMS</div>
                </div>
              </div>

              <button
                onClick={() => setShowImportResultModal(false)}
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
                  background: 'rgba(220, 252, 231, 0.75)',
                  border: '1px solid rgba(46, 125, 50, 0.35)',
                  color: '#0f172a',
                  whiteSpace: 'pre-wrap',
                  lineHeight: 1.6,
                }}
              >
                {importConfirmResult.message || 'Import effectué avec succès.'}
              </div>

              <div style={{ marginTop: '1rem' }}>
                <div style={{ color: '#0f172a', fontWeight: 800, marginBottom: '0.5rem' }}>📊 Résumé de l'opération</div>
                <div
                  style={{
                    padding: '1rem',
                    borderRadius: '16px',
                    background: 'rgba(255, 255, 255, 0.65)',
                    border: '1px solid rgba(15, 23, 42, 0.10)',
                    color: '#334155',
                    fontSize: '0.9rem',
                    lineHeight: 1.6,
                  }}
                >
                  <div style={{ marginBottom: '0.75rem' }}>
                    <strong>✅ Import terminé avec succès !</strong>
                  </div>
                  
                  {importConfirmResult.credits_importes && (
                    <div style={{ marginBottom: '0.5rem' }}>
                      📁 <strong>Crédits importés :</strong> {importConfirmResult.credits_importes}
                    </div>
                  )}
                  
                  {importConfirmResult.messages_generes && (
                    <div style={{ marginBottom: '0.5rem' }}>
                      📱 <strong>SMS générés :</strong> {importConfirmResult.messages_generes}
                    </div>
                  )}
                  
                  {importConfirmResult.snapshots_crees && (
                    <div style={{ marginBottom: '0.5rem' }}>
                      📊 <strong>Snapshots créés :</strong> {importConfirmResult.snapshots_crees}
                    </div>
                  )}
                  
                  <div style={{ marginTop: '1rem', paddingTop: '0.75rem', borderTop: '1px solid rgba(15, 23, 42, 0.1)' }}>
                    <div style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '0.25rem' }}>
                      ⏰ Date de l'opération : {new Date().toLocaleString('fr-FR')}
                    </div>
                    <div style={{ fontSize: '0.85rem', color: '#64748b' }}>
                      🔄 Les données sont maintenant disponibles dans le dashboard et les autres écrans
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
        <div
          style={{
            width: '56px',
            height: '56px',
            borderRadius: '16px',
            background: 'linear-gradient(135deg, #d32f2f 0%, #f44336 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1.75rem',
            boxShadow: '0 4px 15px rgba(211, 47, 47, 0.3)',
          }}
        >
          📥
        </div>
        <div>
          <h3
            style={{
              margin: 0,
              fontSize: isMobile ? '1.25rem' : '1.5rem',
              fontWeight: '700',
              color: '#fff',
            }}
          >
            Import de fichier Excel/CSV
          </h3>
          <p style={{ margin: '0.25rem 0 0 0', color: '#CBD5E1', fontSize: '0.9rem' }}>
            Importez vos données d'impayés pour analyse et génération de SMS
          </p>
        </div>
      </div>

      <div
        style={{
          marginBottom: '1.5rem',
          padding: '1.25rem',
          background: 'rgba(255, 152, 0, 0.1)',
          borderRadius: '16px',
          border: '1px solid rgba(255, 152, 0, 0.2)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
          <span style={{ fontSize: '1.5rem' }}>📝</span>
          <strong style={{ color: '#ffb74d', fontSize: '1rem' }}>Instructions :</strong>
        </div>
        <ul style={{ margin: '0.5rem 0 0 0', paddingLeft: '1.5rem', color: '#CBD5E1', lineHeight: '1.8' }}>
          <li>Exportez la situation d'impayés depuis votre core banking</li>
          <li>Téléchargez le modèle Excel ci-dessous si nécessaire</li>
          <li>Remplissez le fichier avec les données requises (format Excel .xlsx ou CSV)</li>
          <li>Cliquez sur "Prévisualiser" pour voir l'analyse avant de confirmer</li>
          <li>Confirmez l'import pour sauvegarder les données et générer les SMS</li>
        </ul>
      </div>

      <button
        onClick={downloadTemplate}
        style={{
          padding: isMobile ? '0.75rem 1.25rem' : '1rem 1.5rem',
          background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
          color: '#fff',
          border: 'none',
          borderRadius: '16px',
          cursor: 'pointer',
          marginBottom: '1.5rem',
          fontWeight: '700',
          fontSize: '0.95rem',
          boxShadow: '0 4px 12px rgba(245, 158, 11, 0.3)',
          transition: 'all 0.3s ease',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'translateY(-2px)';
          e.currentTarget.style.boxShadow = '0 6px 16px rgba(245, 158, 11, 0.4)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'translateY(0)';
          e.currentTarget.style.boxShadow = '0 4px 12px rgba(245, 158, 11, 0.3)';
        }}
      >
        <span>📥</span>
        <span>Télécharger le modèle Excel</span>
      </button>

      <form onSubmit={handlePreview}>
        <div style={{ marginBottom: '1.5rem' }}>
          <label
            style={{
              display: 'block',
              marginBottom: '0.75rem',
              fontWeight: '600',
              color: '#CBD5E1',
              fontSize: '0.95rem',
            }}
          >
            Date de situation <span style={{ color: '#f44336' }}>*</span>
          </label>
          <input
            type="date"
            value={dateSituation}
            onChange={(e) => setDateSituation(e.target.value)}
            required
            style={{
              width: '100%',
              maxWidth: isMobile ? '100%' : '300px',
              padding: '0.75rem 1rem',
              borderRadius: '12px',
              border: '2px solid rgba(211, 47, 47, 0.3)',
              fontSize: '0.95rem',
              background: 'rgba(255, 255, 255, 0.1)',
              color: '#fff',
              transition: 'all 0.3s ease',
            }}
            onFocus={(e) => {
              e.target.style.borderColor = '#d32f2f';
              e.target.style.boxShadow = '0 0 0 3px rgba(211, 47, 47, 0.1)';
            }}
            onBlur={(e) => {
              e.target.style.borderColor = 'rgba(211, 47, 47, 0.3)';
              e.target.style.boxShadow = 'none';
            }}
          />
        </div>

        <div style={{ marginBottom: '1.5rem' }}>
          <label
            style={{
              display: 'block',
              marginBottom: '0.75rem',
              fontWeight: '600',
              color: '#CBD5E1',
              fontSize: '0.95rem',
            }}
          >
            Fichier Excel ou CSV <span style={{ color: '#f44336' }}>*</span>
          </label>
          <div
            style={{
              position: 'relative',
              width: '100%',
              maxWidth: isMobile ? '100%' : '400px',
            }}
          >
            <input
              id="import-file-input"
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={handleFileChange}
              required
              style={{
                width: '100%',
                padding: '0.75rem 1rem',
                borderRadius: '12px',
                border: '2px solid rgba(211, 47, 47, 0.3)',
                fontSize: '0.95rem',
                background: 'rgba(255, 255, 255, 0.1)',
                color: '#fff',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
              }}
              onFocus={(e) => {
                e.target.style.borderColor = '#d32f2f';
                e.target.style.boxShadow = '0 0 0 3px rgba(211, 47, 47, 0.1)';
              }}
              onBlur={(e) => {
                e.target.style.borderColor = 'rgba(211, 47, 47, 0.3)';
                e.target.style.boxShadow = 'none';
              }}
            />
            {file && (
              <div
                style={{
                  marginTop: '0.5rem',
                  padding: '0.5rem 0.75rem',
                  background: 'rgba(76, 175, 80, 0.2)',
                  borderRadius: '8px',
                  fontSize: '0.85rem',
                  color: '#4caf50',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  border: '1px solid rgba(76, 175, 80, 0.3)',
                }}
              >
                <span>✅</span>
                <span>{file.name}</span>
              </div>
            )}
          </div>
        </div>

        {error && (
          <div
            style={{
              padding: '1rem 1.25rem',
              background: 'rgba(211, 47, 47, 0.2)',
              backdropFilter: 'blur(10px)',
              color: '#ff6b6b',
              borderRadius: '16px',
              marginBottom: '1rem',
              border: '1px solid rgba(211, 47, 47, 0.3)',
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
            }}
          >
            <span style={{ fontSize: '1.2rem' }}>⚠️</span>
            <span style={{ fontWeight: '500' }}>{error}</span>
          </div>
        )}

        {message && (
          <div
            style={{
              padding: '1rem 1.25rem',
              background: 'rgba(76, 175, 80, 0.2)',
              backdropFilter: 'blur(10px)',
              color: '#4caf50',
              borderRadius: '16px',
              marginBottom: '1rem',
              border: '1px solid rgba(76, 175, 80, 0.3)',
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
            }}
          >
            <span style={{ fontSize: '1.2rem' }}>✅</span>
            <span style={{ fontWeight: '500' }}>{message}</span>
          </div>
        )}

        {importErrors.length > 0 && (
          <div style={{ marginBottom: '16px' }}>
            <strong style={{ color: '#f44336' }}>Erreurs détectées :</strong>
            <div
              style={{
                maxHeight: '200px',
                overflowY: 'auto',
                marginTop: '8px',
                padding: '12px',
                background: 'rgba(255, 255, 255, 0.05)',
                borderRadius: '8px',
                border: '1px solid rgba(211, 47, 47, 0.2)',
              }}
            >
              {importErrors.map((err, idx) => (
                <div key={idx} style={{ marginBottom: '4px', fontSize: '0.9rem', color: '#CBD5E1' }}>
                  Ligne {err.ligne}, champ "{err.champ}": {err.message}
                </div>
              ))}
            </div>
          </div>
        )}

        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <button
            type="submit"
            disabled={loading}
            style={{
              padding: isMobile ? '0.75rem 1.25rem' : '1rem 1.5rem',
              background: loading
                ? 'rgba(211, 47, 47, 0.3)'
                : 'linear-gradient(135deg, #d32f2f 0%, #f44336 100%)',
              color: '#fff',
              border: 'none',
              borderRadius: '16px',
              cursor: loading ? 'not-allowed' : 'pointer',
              fontSize: '0.95rem',
              fontWeight: '700',
              boxShadow: loading ? 'none' : '0 4px 12px rgba(211, 47, 47, 0.3)',
              transition: 'all 0.3s ease',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
            }}
            onMouseEnter={(e) => {
              if (!loading) {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 6px 16px rgba(211, 47, 47, 0.4)';
              }
            }}
            onMouseLeave={(e) => {
              if (!loading) {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(211, 47, 47, 0.3)';
              }
            }}
          >
            {loading ? (
              <>
                <span>⏳</span>
                <span>Analyse en cours...</span>
              </>
            ) : (
              <>
                <span>👁️</span>
                <span>Prévisualiser</span>
              </>
            )}
          </button>
        </div>
      </form>

      {/* Prévisualisation */}
      {showPreview && previewData && (
        <div
          style={{
            marginTop: '2rem',
            padding: isMobile ? '1.5rem' : '2rem',
            background: 'rgba(255, 255, 255, 0.05)',
            borderRadius: '20px',
            border: '1px solid rgba(211, 47, 47, 0.2)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
            <div
              style={{
                width: '48px',
                height: '48px',
                borderRadius: '12px',
                background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.5rem',
                boxShadow: '0 4px 15px rgba(79, 172, 254, 0.3)',
              }}
            >
              📊
            </div>
            <h4
              style={{
                margin: 0,
                fontSize: isMobile ? '1.1rem' : '1.25rem',
                fontWeight: '700',
                color: '#fff',
              }}
            >
              Prévisualisation de l'analyse
            </h4>
          </div>

          {/* Statistiques */}
          {previewData.stats_preview && (
            <div style={{ marginBottom: '1.5rem' }}>
              <h5 style={{ marginBottom: '1rem', fontSize: '1rem', fontWeight: '600', color: '#CBD5E1' }}>
                Statistiques prévisionnelles :
              </h5>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: isMobile ? '1fr' : isTablet ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)',
                  gap: '1rem',
                }}
              >
                <div
                  style={{
                    padding: '1.25rem',
                    background: 'rgba(239, 68, 68, 0.1)',
                    borderRadius: '16px',
                    border: '1px solid rgba(239, 68, 68, 0.2)',
                  }}
                >
                  <div style={{ fontSize: '0.85rem', color: '#CBD5E1', marginBottom: '0.5rem' }}>Total impayé</div>
                  <div style={{ fontSize: '1.25rem', fontWeight: '700', color: '#f44336' }}>
                    {previewData.stats_preview.total_montant_impaye?.toLocaleString('fr-FR') || 0} FCFA
                  </div>
                </div>
                <div
                  style={{
                    padding: '1.25rem',
                    background: 'rgba(33, 150, 243, 0.1)',
                    borderRadius: '16px',
                    border: '1px solid rgba(33, 150, 243, 0.2)',
                  }}
                >
                  <div style={{ fontSize: '0.85rem', color: '#CBD5E1', marginBottom: '0.5rem' }}>Nombre de crédits</div>
                  <div style={{ fontSize: '1.25rem', fontWeight: '700', color: '#2196f3' }}>
                    {previewData.stats_preview.total_credits || 0}
                  </div>
                </div>
                <div
                  style={{
                    padding: '1.25rem',
                    background: 'rgba(76, 175, 80, 0.1)',
                    borderRadius: '16px',
                    border: '1px solid rgba(76, 175, 80, 0.2)',
                  }}
                >
                  <div style={{ fontSize: '0.85rem', color: '#CBD5E1', marginBottom: '0.5rem' }}>
                    Candidats restructuration
                  </div>
                  <div style={{ fontSize: '1.25rem', fontWeight: '700', color: '#4caf50' }}>
                    {previewData.stats_preview.candidats_restructuration || 0}
                  </div>
                </div>
                <div
                  style={{
                    padding: '1.25rem',
                    background: 'rgba(255, 152, 0, 0.1)',
                    borderRadius: '16px',
                    border: '1px solid rgba(255, 152, 0, 0.2)',
                  }}
                >
                  <div style={{ fontSize: '0.85rem', color: '#CBD5E1', marginBottom: '0.5rem' }}>SMS à générer</div>
                  <div style={{ fontSize: '1.25rem', fontWeight: '700', color: '#ff9800' }}>
                    {previewData.messages_preview?.length || 0}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Aperçu des snapshots */}
          {previewData.snapshots_preview && previewData.snapshots_preview.length > 0 && (
            <div style={{ marginBottom: '20px' }}>
              <h5 style={{ marginBottom: '12px', color: '#CBD5E1' }}>
                Aperçu des crédits ({previewData.snapshots_preview.length}) :
              </h5>
              <div
                style={{
                  maxHeight: '300px',
                  overflowY: 'auto',
                  background: 'rgba(255, 255, 255, 0.05)',
                  padding: '12px',
                  borderRadius: '8px',
                  border: '1px solid rgba(211, 47, 47, 0.2)',
                }}
              >
                <table style={{ width: '100%', fontSize: '0.9rem', color: '#CBD5E1' }}>
                  <thead>
                    <tr style={{ background: 'rgba(211, 47, 47, 0.1)' }}>
                      <th style={{ padding: '8px', textAlign: 'left', color: '#fff' }}>Téléphone</th>
                      <th style={{ padding: '8px', textAlign: 'left', color: '#fff' }}>Ref. Crédit</th>
                      <th style={{ padding: '8px', textAlign: 'left', color: '#fff' }}>Client</th>
                      <th style={{ padding: '8px', textAlign: 'left', color: '#fff' }}>Agence</th>
                      <th style={{ padding: '8px', textAlign: 'left', color: '#fff' }}>Gestionnaire</th>
                      <th style={{ padding: '8px', textAlign: 'right', color: '#fff' }}>Montant impayé</th>
                      <th style={{ padding: '8px', textAlign: 'center', color: '#fff' }}>Jours retard</th>
                      <th style={{ padding: '8px', textAlign: 'left', color: '#fff' }}>Tranche</th>
                      <th style={{ padding: '8px', textAlign: 'center', color: '#fff' }}>Restructuration</th>
                    </tr>
                  </thead>
                  <tbody>
                    {previewData.snapshots_preview.slice(0, 10).map((snapshot: any, idx: number) => (
                      <tr key={idx} style={{ borderBottom: '1px solid rgba(211, 47, 47, 0.1)' }}>
                        <td style={{ padding: '8px', fontFamily: 'monospace', fontSize: '0.9rem', color: '#CBD5E1' }}>
                          {snapshot.telephone_client || <span style={{ color: '#718096' }}>-</span>}
                        </td>
                        <td style={{ padding: '8px', color: '#CBD5E1' }}>{snapshot.ref_credit}</td>
                        <td style={{ padding: '8px', color: '#CBD5E1' }}>{snapshot.nom_client}</td>
                        <td style={{ padding: '8px', color: '#CBD5E1' }}>{snapshot.agence}</td>
                        <td style={{ padding: '8px', color: '#CBD5E1' }}>
                          {snapshot.gestionnaire || <span style={{ color: '#718096' }}>-</span>}
                        </td>
                        <td style={{ padding: '8px', textAlign: 'right', color: '#CBD5E1' }}>
                          {snapshot.montant_total_impaye?.toLocaleString('fr-FR') || 0} FCFA
                        </td>
                        <td style={{ padding: '8px', textAlign: 'center', color: '#CBD5E1' }}>
                          {snapshot.jours_retard}
                        </td>
                        <td style={{ padding: '8px', color: '#CBD5E1' }}>{snapshot.bucket_retard}</td>
                        <td style={{ padding: '8px', textAlign: 'center', color: '#CBD5E1' }}>
                          {snapshot.candidat_restructuration ? '✅ Oui' : '❌ Non'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {previewData.snapshots_preview.length > 10 && (
                  <p style={{ marginTop: '8px', fontSize: '0.85rem', color: '#CBD5E1' }}>
                    ... et {previewData.snapshots_preview.length - 10} autres crédits
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Aperçu des SMS prévisualisés */}
          {previewData.messages_preview && previewData.messages_preview.length > 0 && (
            <div style={{ marginBottom: '1.5rem' }}>
              <h5 style={{ marginBottom: '1rem', fontSize: '1rem', fontWeight: '600', color: '#CBD5E1' }}>
                📱 Messages SMS qui seront générés ({previewData.messages_preview.length}) :
              </h5>
              <div
                style={{
                  maxHeight: '300px',
                  overflowY: 'auto',
                  background: 'rgba(255, 255, 255, 0.05)',
                  padding: '12px',
                  borderRadius: '8px',
                  border: '1px solid rgba(211, 47, 47, 0.2)',
                }}
              >
                {previewData.messages_preview.slice(0, 5).map((sms: any, idx: number) => (
                  <div key={idx} style={{ 
                    marginBottom: '12px', 
                    padding: '8px', 
                    background: 'rgba(76, 175, 80, 0.1)', 
                    borderRadius: '6px',
                    borderLeft: '3px solid #4caf50'
                  }}>
                    <div style={{ fontSize: '0.85rem', color: '#9ca3af', marginBottom: '4px' }}>
                      📞 {sms.to} • {sms.linked_credit}
                    </div>
                    <div style={{ fontSize: '0.9rem', color: '#cbd5e1', lineHeight: '1.4' }}>
                      {sms.body}
                    </div>
                  </div>
                ))}
                {previewData.messages_preview.length > 5 && (
                  <p style={{ marginTop: '8px', fontSize: '0.85rem', color: '#CBD5E1', textAlign: 'center' }}>
                    ... et {previewData.messages_preview.length - 5} autres messages
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Statistiques détaillées */}
          {previewData.stats_preview && (
            <div style={{ marginBottom: '1.5rem' }}>
              <h5 style={{ marginBottom: '1rem', fontSize: '1rem', fontWeight: '600', color: '#CBD5E1' }}>
                📊 Répartition détaillée :
              </h5>
              
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)', gap: '1rem' }}>
                
                {/* Répartition par tranche */}
                {previewData.stats_preview.repartition_tranches && (
                  <div style={{
                    background: 'rgba(255, 255, 255, 0.05)',
                    padding: '1rem',
                    borderRadius: '8px',
                    border: '1px solid rgba(211, 47, 47, 0.2)'
                  }}>
                    <div style={{ fontSize: '0.9rem', fontWeight: '600', color: '#fff', marginBottom: '0.5rem' }}>
                      📈 Par tranche de retard
                    </div>
                    {Object.entries(previewData.stats_preview.repartition_tranches).map(([tranche, count]) => (
                      <div key={tranche} style={{ 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        fontSize: '0.85rem', 
                        color: '#cbd5e1',
                        marginBottom: '4px'
                      }}>
                        <span>{tranche}</span>
                        <span style={{ fontWeight: '600' }}>{count}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Répartition par segment */}
                {previewData.stats_preview.repartition_segments && (
                  <div style={{
                    background: 'rgba(255, 255, 255, 0.05)',
                    padding: '1rem',
                    borderRadius: '8px',
                    border: '1px solid rgba(211, 47, 47, 0.2)'
                  }}>
                    <div style={{ fontSize: '0.9rem', fontWeight: '600', color: '#fff', marginBottom: '0.5rem' }}>
                      👥 Par segment client
                    </div>
                    {Object.entries(previewData.stats_preview.repartition_segments).map(([segment, count]) => (
                      <div key={segment} style={{ 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        fontSize: '0.85rem', 
                        color: '#cbd5e1',
                        marginBottom: '4px'
                      }}>
                        <span>{segment}</span>
                        <span style={{ fontWeight: '600' }}>{count}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Répartition par agence */}
                {previewData.stats_preview.repartition_agences && (
                  <div style={{
                    background: 'rgba(255, 255, 255, 0.05)',
                    padding: '1rem',
                    borderRadius: '8px',
                    border: '1px solid rgba(211, 47, 47, 0.2)'
                  }}>
                    <div style={{ fontSize: '0.9rem', fontWeight: '600', color: '#fff', marginBottom: '0.5rem' }}>
                      🏢 Par agence
                    </div>
                    {Object.entries(previewData.stats_preview.repartition_agences).slice(0, 5).map(([agence, count]) => (
                      <div key={agence} style={{ 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        fontSize: '0.85rem', 
                        color: '#cbd5e1',
                        marginBottom: '4px'
                      }}>
                        <span>{agence}</span>
                        <span style={{ fontWeight: '600' }}>{count}</span>
                      </div>
                    ))}
                    {Object.keys(previewData.stats_preview.repartition_agences).length > 5 && (
                      <div style={{ fontSize: '0.75rem', color: '#9ca3af', marginTop: '4px' }}>
                        ... et {Object.keys(previewData.stats_preview.repartition_agences).length - 5} autres agences
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
          
          {/* Boutons d'action après prévisualisation */}
          <div style={{ 
            display: 'flex', 
            gap: '0.75rem', 
            marginTop: '1.5rem',
            paddingTop: '1.5rem',
            borderTop: '1px solid rgba(211, 47, 47, 0.2)'
          }}>
            <button
              onClick={() => {
                // Réinitialiser tout
                setFile(null);
                setPreviewData(null);
                setShowPreview(false);
                setError('');
                setMessage('');
                setImportErrors([]);
                // Reset file input
                const fileInput = document.getElementById('import-file-input') as HTMLInputElement;
                if (fileInput) fileInput.value = '';
              }}
              style={{
                padding: isMobile ? '0.75rem 1.25rem' : '1rem 1.5rem',
                background: 'linear-gradient(135deg, #6b7280 0%, #4b5563 100%)',
                color: '#fff',
                border: 'none',
                borderRadius: '16px',
                cursor: 'pointer',
                fontSize: '0.95rem',
                fontWeight: '700',
                boxShadow: '0 4px 12px rgba(107, 114, 128, 0.3)',
                transition: 'all 0.3s ease',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 6px 16px rgba(107, 114, 128, 0.4)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(107, 114, 128, 0.3)';
              }}
            >
              <span>🔄</span>
              <span>Changer le fichier</span>
            </button>
            
            {previewData.success && (
              <button
                onClick={handleConfirmImport}
                disabled={loading}
                style={{
                  padding: isMobile ? '0.75rem 1.25rem' : '1rem 1.5rem',
                  background: loading
                    ? 'rgba(76, 175, 80, 0.3)'
                    : 'linear-gradient(135deg, #4caf50 0%, #2e7d32 100%)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '16px',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  fontSize: '0.95rem',
                  fontWeight: '700',
                  boxShadow: loading ? 'none' : '0 4px 12px rgba(76, 175, 80, 0.3)',
                  transition: 'all 0.3s ease',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                }}
                onMouseEnter={(e) => {
                  if (!loading) {
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = '0 6px 16px rgba(76, 175, 80, 0.4)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!loading) {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(76, 175, 80, 0.3)';
                  }
                }}
              >
                {loading ? (
                  <>
                    <span>⏳</span>
                    <span>Import en cours...</span>
                  </>
                ) : (
                  <>
                    <span>✅</span>
                    <span>Confirmer l'import</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ImportTab;

