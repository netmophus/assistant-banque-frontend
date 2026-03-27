'use client';

import React, { useState, useEffect } from 'react';
import { useResponsive } from '@/hooks/useResponsive';

interface Report {
  id: string;
  type: string;
  section?: string;
  statut: 'generated' | 'validated' | 'error';
  date_cloture: string;
  date_generation: string;
  exercice?: string;
  structure?: Record<string, unknown>;
  ratios_bancaires?: Record<string, unknown>;
  interpretation_ia?: string;
}

const ReportsTab = () => {
  const {} = useResponsive();
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(false);
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [generating, setGenerating] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [generateForm, setGenerateForm] = useState({
    type: 'bilan_reglementaire',
    section: '',
    date_cloture: '',
    date_realisation: '',
    date_debut: '',
    include_ia: true,
  });

  // Helper function to get headers with authentication token
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
    fetchReports();
  }, []);

  const openReport = async (report: Report) => {
    try {
      const response = await fetch(`/api/pcb/reports/${report.id}`, {
        headers: getAuthHeaders(),
      });
      if (!response.ok) throw new Error('Erreur');
      const data = await response.json();
      setSelectedReport(data);
    } catch (err) {
      alert('Erreur: ' + (err instanceof Error ? err.message : 'Erreur inconnue'));
      setSelectedReport(report);
    }
  };

  const fetchReports = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/pcb/reports', {
        headers: getAuthHeaders(),
      });
      if (!response.ok) throw new Error('Erreur');
      const data = await response.json();
      setReports(data);
    } catch (err) {
      alert('Erreur: ' + (err instanceof Error ? err.message : 'Erreur inconnue'));
    } finally {
      setLoading(false);
    }
  };

  const deleteReport = async (report: Report) => {
    if (!report?.id) return;
    const ok = window.confirm('Voulez-vous vraiment supprimer ce rapport ?');
    if (!ok) return;

    setDeleting(report.id);
    try {
      const response = await fetch(`/api/pcb/reports/${report.id}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      if (!response.ok) throw new Error('Erreur');

      if (selectedReport?.id === report.id) {
        setSelectedReport(null);
      }
      await fetchReports();
    } catch (err) {
      alert('Erreur: ' + (err instanceof Error ? err.message : 'Erreur inconnue'));
    } finally {
      setDeleting(null);
    }
  };

  const handleGenerate = async () => {
    if (!generateForm.type || !generateForm.date_cloture) {
      alert('Veuillez remplir tous les champs obligatoires');
      return;
    }

    setGenerating(true);
    try {
      const params = new URLSearchParams({
        type_rapport: generateForm.type,
        date_cloture: generateForm.date_cloture,
      });
      if (generateForm.section) params.append('section', generateForm.section);
      if (generateForm.date_realisation) params.append('date_realisation', generateForm.date_realisation);
      if (generateForm.date_debut) params.append('date_debut', generateForm.date_debut);
      params.append('include_ia', generateForm.include_ia ? 'true' : 'false');

      const response = await fetch(`/api/pcb/reports/generate?${params.toString()}`, {
        method: 'POST',
        headers: getAuthHeaders(),
      });

      if (!response.ok) throw new Error('Erreur');
      const data = await response.json();
      alert('Rapport généré avec succès !');
      setShowGenerateModal(false);
      fetchReports();
      setSelectedReport(data);
    } catch (err) {
      alert('Erreur: ' + (err instanceof Error ? err.message : 'Erreur inconnue'));
    } finally {
      setGenerating(false);
    }
  };

  const getTypeLabel = (type: string) => {
    const types: Record<string, string> = {
      bilan_reglementaire: 'Bilan réglementaire',
      hors_bilan: 'Hors bilan',
      compte_resultat: 'Compte de résultat',
      ratios_gestion: 'Ratios de gestion',
      ratios_bancaires: 'Ratios bancaires',
    };
    return types[type] || type;
  };

  const getSectionLabel = (type: string, section?: string) => {
    if (!section) return '';
    if (type === 'bilan_reglementaire') {
      return section === 'actif' ? 'Actif' : section === 'passif' ? 'Passif' : section;
    }
    if (type === 'compte_resultat') {
      return section === 'produits'
        ? 'Produits'
        : section === 'charges'
        ? 'Ratios caractéristiques de gestion'
        : section === 'exploitation'
        ? "Compte d'exploitation bancaire"
        : section;
    }
    return section;
  };

  const getStatusColor = (statut: string) => {
    const colors: Record<string, string> = {
      generated: '#28a745',
      validated: '#2196f3',
      error: '#f44336',
    };
    return colors[statut] || '#718096';
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h3 style={{ margin: 0, fontSize: '1.5rem', fontWeight: '700', color: '#fff' }}>
          📄 Rapports générés
        </h3>
        <button
          onClick={() => setShowGenerateModal(true)}
          style={{
            padding: '0.75rem 1.5rem',
            background: 'linear-gradient(135deg, #1B3A8C 0%, #2e5bb8 50%, #C9A84C 100%)',
            color: '#fff',
            border: 'none',
            borderRadius: '12px',
            cursor: 'pointer',
            fontWeight: '600',
            fontSize: '0.9rem',
            boxShadow: '0 4px 12px rgba(27, 58, 140, 0.3)',
          }}
        >
          ➕ Générer un rapport
        </button>
      </div>

      {/* Liste des rapports */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '2rem' }}>Chargement...</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {reports.length === 0 ? (
            <div style={{ padding: '3rem', textAlign: 'center', background: '#0B1026', borderRadius: '12px', border: '1px solid #3B82F6', color: '#CBD5E1' }}>
              Aucun rapport généré. Cliquez sur &quot;Générer un rapport&quot; pour commencer.
            </div>
          ) : (
            reports.map((report) => (
              <div
                key={report.id}
                onClick={() => openReport(report)}
                style={{
                  background: '#0B1026',
                  borderRadius: '12px',
                  padding: '1.5rem',
                  border: '1px solid #3B82F6',
                  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05)',
                  cursor: 'pointer',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                      <h4 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '700', color: '#fff' }}>
                        {getTypeLabel(report.type)}
                        {report.section ? ` - ${getSectionLabel(report.type, report.section)}` : ''}
                      </h4>
                      <span
                        style={{
                          padding: '0.25rem 0.75rem',
                          borderRadius: '6px',
                          background: `${getStatusColor(report.statut)}20`,
                          color: getStatusColor(report.statut),
                          fontSize: '0.75rem',
                          fontWeight: '600',
                        }}
                      >
                        {report.statut === 'generated' ? '✅ Généré' : report.statut === 'validated' ? '✓ Validé' : '❌ Erreur'}
                      </span>
                    </div>
                    <div style={{ fontSize: '0.85rem', color: '#CBD5E1' }}>
                      Date de clôture : {new Date(report.date_cloture).toLocaleDateString('fr-FR')}
                      {report.exercice && ` • Exercice ${report.exercice}`}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        openReport(report);
                      }}
                      style={{
                        padding: '0.5rem 1rem',
                        background: '#1B3A8C',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        fontSize: '0.85rem',
                        fontWeight: '600',
                      }}
                    >
                      👁️ Voir
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteReport(report);
                      }}
                      disabled={deleting === report.id}
                      style={{
                        padding: '0.5rem 1rem',
                        background: deleting === report.id ? '#64748B' : '#DC2626',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '8px',
                        cursor: deleting === report.id ? 'not-allowed' : 'pointer',
                        fontSize: '0.85rem',
                        fontWeight: '600',
                        opacity: deleting === report.id ? 0.8 : 1,
                      }}
                    >
                      🗑️ Supprimer
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Modal de génération */}
      {showGenerateModal && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '1rem',
          }}
          onClick={() => !generating && setShowGenerateModal(false)}
        >
          <div
            style={{
              background: '#0B1026',
              borderRadius: '16px',
              padding: '2rem',
              maxWidth: '500px',
              width: '100%',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)',
              border: '1px solid #3B82F6',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ margin: '0 0 1.5rem 0', fontSize: '1.5rem', fontWeight: '700', color: '#fff' }}>
              ➕ Générer un rapport
            </h3>

            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', color: '#CBD5E1' }}>
                Type de rapport *
              </label>
              <select
                required
                value={generateForm.type}
                onChange={(e) => setGenerateForm({ ...generateForm, type: e.target.value, section: '' })}
                disabled={generating}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  borderRadius: '8px',
                  border: '1px solid #3B82F6',
                  background: '#1E3A8A',
                  color: '#ffffff',
                  colorScheme: 'dark',
                }}
              >
                <option value="bilan_reglementaire" style={{ background: '#1E3A8A', color: '#ffffff' }}>Bilan réglementaire</option>
                <option value="compte_resultat" style={{ background: '#1E3A8A', color: '#ffffff' }}>Compte de résultat</option>
                <option value="hors_bilan" style={{ background: '#1E3A8A', color: '#ffffff' }}>Hors bilan</option>
                <option value="ratios_gestion" style={{ background: '#1E3A8A', color: '#ffffff' }}>Ratios de gestion</option>
                <option value="ratios_bancaires" style={{ background: '#1E3A8A', color: '#ffffff' }}>Ratios bancaires (réglementaires + personnalisés)</option>
              </select>
            </div>

            {(generateForm.type === 'bilan_reglementaire' || generateForm.type === 'compte_resultat') && (
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', color: '#CBD5E1' }}>
                  Section
                </label>
                <select
                  value={generateForm.section}
                  onChange={(e) => setGenerateForm({ ...generateForm, section: e.target.value })}
                  disabled={generating}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    borderRadius: '8px',
                    border: '1px solid #3B82F6',
                    background: '#1E3A8A',
                    color: '#ffffff',
                    colorScheme: 'dark',
                  }}
                >
                  <option value="" style={{ background: '#1E3A8A', color: '#ffffff' }}>Groupé (complet)</option>
                  {generateForm.type === 'bilan_reglementaire' && (
                    <>
                      <option value="actif" style={{ background: '#1E3A8A', color: '#ffffff' }}>Actif uniquement</option>
                      <option value="passif" style={{ background: '#1E3A8A', color: '#ffffff' }}>Passif uniquement</option>
                    </>
                  )}
                  {generateForm.type === 'compte_resultat' && (
                    <>
                      <option value="produits" style={{ background: '#1E3A8A', color: '#ffffff' }}>Produits uniquement</option>
                      <option value="charges" style={{ background: '#1E3A8A', color: '#ffffff' }}>Ratios caractéristiques de gestion uniquement</option>
                      <option value="exploitation" style={{ background: '#1E3A8A', color: '#ffffff' }}>Compte d'exploitation bancaire uniquement</option>
                    </>
                  )}
                </select>
              </div>
            )}

            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', color: '#CBD5E1' }}>
                Date de clôture *
              </label>
              <input
                type="date"
                required
                value={generateForm.date_cloture}
                onChange={(e) => setGenerateForm({ ...generateForm, date_cloture: e.target.value })}
                disabled={generating}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  borderRadius: '8px',
                  border: '1px solid #3B82F6',
                  background: '#1E3A8A',
                  color: '#ffffff',
                  colorScheme: 'dark',
                }}
              />
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', color: '#CBD5E1' }}>
                Réalisation (date de référence)
              </label>
              <input
                type="date"
                value={generateForm.date_realisation}
                onChange={(e) => setGenerateForm({ ...generateForm, date_realisation: e.target.value })}
                disabled={generating}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  borderRadius: '8px',
                  border: '1px solid #3B82F6',
                  background: '#1E3A8A',
                  color: '#ffffff',
                  colorScheme: 'dark',
                }}
              />
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', color: '#CBD5E1' }}>
                Date de début
              </label>
              <input
                type="date"
                value={generateForm.date_debut}
                onChange={(e) => setGenerateForm({ ...generateForm, date_debut: e.target.value })}
                disabled={generating}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  borderRadius: '8px',
                  border: '1px solid #3B82F6',
                  background: '#1E3A8A',
                  color: '#ffffff',
                  colorScheme: 'dark',
                }}
              />
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={generateForm.include_ia}
                  onChange={(e) => setGenerateForm({ ...generateForm, include_ia: e.target.checked })}
                  disabled={generating}
                />
                <span style={{ fontWeight: '600', color: '#CBD5E1' }}>Inclure l&apos;analyse IA</span>
              </label>
            </div>

            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setShowGenerateModal(false)}
                disabled={generating}
                style={{
                  padding: '0.75rem 1.5rem',
                  background: '#1D4ED8',
                  color: '#E2E8F0',
                  border: '1px solid #3B82F6',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontWeight: '600',
                }}
              >
                Annuler
              </button>
              <button
                onClick={handleGenerate}
                disabled={generating || !generateForm.date_cloture}
                style={{
                  padding: '0.75rem 1.5rem',
                  background: generating ? '#cbd5e0' : 'linear-gradient(135deg, #1B3A8C 0%, #2e5bb8 50%, #C9A84C 100%)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontWeight: '600',
                }}
              >
                {generating ? '⏳ En cours...' : 'Générer'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de consultation */}
      {selectedReport && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '1rem',
          }}
          onClick={() => setSelectedReport(null)}
        >
          <div
            style={{
              background: '#0B1026',
              borderRadius: '16px',
              padding: '2rem',
              maxWidth: '800px',
              width: '100%',
              maxHeight: '90vh',
              overflowY: 'auto',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)',
              border: '1px solid #3B82F6',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.5rem', fontWeight: '700', color: '#ffffff' }}>
              {getTypeLabel(selectedReport.type)}
              {selectedReport.section ? ` - ${getSectionLabel(selectedReport.type, selectedReport.section)}` : ''}
            </h3>
            <p style={{ color: '#CBD5E1' }}>
              Date de clôture : {new Date(selectedReport.date_cloture).toLocaleDateString('fr-FR')}
            </p>
            <div
              style={{
                marginTop: '1rem',
                borderRadius: '8px',
                overflow: 'hidden',
                border: '1px solid #3B82F6',
                background: '#0B1026',
              }}
            >
              <iframe
                title="Aperçu PDF"
                src={`/user/pcb/reports/${selectedReport.id}/print?embed=1`}
                style={{ width: '100%', height: '70vh', border: 'none', background: '#fff' }}
              />
            </div>
            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem', flexWrap: 'wrap' }}>
              <button
                onClick={() => {
                  if (!selectedReport?.id) return;
                  window.open(`/user/pcb/reports/${selectedReport.id}/print`, '_blank');
                }}
                style={{
                  padding: '0.75rem 1.5rem',
                  background: '#1B3A8C',
                  color: '#ffffff',
                  border: '1px solid #3B82F6',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontWeight: '600',
                }}
              >
                🖨️ Imprimer / PDF
              </button>
            <button
              onClick={() => setSelectedReport(null)}
              style={{
                marginTop: '1rem',
                padding: '0.75rem 1.5rem',
                background: '#1D4ED8',
                color: '#E2E8F0',
                border: '1px solid #3B82F6',
                borderRadius: '8px',
                cursor: 'pointer',
                fontWeight: '600',
              }}
            >
              Fermer
            </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReportsTab;
