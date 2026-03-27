'use client';

import React, { useState, useEffect } from 'react';
import { useResponsive } from '@/hooks/useResponsive';

interface GLAccount {
  id: string;
  code: string;
  libelle: string;
  classe: number;
  solde: number;
}

interface GLCode {
  code: string;
  signe: '+' | '-';
  basis?: 'NET' | 'DEBIT' | 'CREDIT';
}

interface Poste {
  id: string;
  code: string;
  libelle: string;
  type: string;
  niveau: number;
  parent_id?: string;
  parent_code?: string;
  ordre: number;
  gl_codes: GLCode[];
  is_active: boolean;
}

const MappingTab = () => {
  const { isMobile } = useResponsive();
  const [postes, setPostes] = useState<Poste[]>([]);
  const [glAccounts, setGlAccounts] = useState<GLAccount[]>([]);
  const [, setLoading] = useState(false);
  const [viewMode, setViewMode] = useState<'poste' | 'gl'>('poste');
  const [selectedPoste, setSelectedPoste] = useState<Poste | null>(null);
  const [selectedGL, setSelectedGL] = useState<GLAccount | null>(null);
  const [glSearch, setGlSearch] = useState('');
  const [posteSearch, setPosteSearch] = useState('');
  const [posteTypeFilter, setPosteTypeFilter] = useState<string>('');
  const [showAddGLModal, setShowAddGLModal] = useState(false);
  const [newGLMapping, setNewGLMapping] = useState<{ code: string; signe: '+' | '-'; basis: 'NET' | 'DEBIT' | 'CREDIT' }>({ code: '', signe: '+', basis: 'NET' });
  const [availableDates, setAvailableDates] = useState<string[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [calculResult, setCalculResult] = useState<any>(null);
  const [showCalculDetails, setShowCalculDetails] = useState(false);
  const [calculating, setCalculating] = useState(false);

  const netBasisLabel = (selectedPoste?.type || '') === 'bilan_actif' ? 'NET (Dr - Cr)' : 'NET (Cr - Dr)';
  const netBasisLabelLong = (selectedPoste?.type || '') === 'bilan_actif' ? 'NET (Débit - Crédit)' : 'NET (Crédit - Débit)';

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'decimal',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(num || 0);
  };

  const flattenCalculTree = (node: any, level: number = 0): Array<any> => {
    const rows: any[] = [{ ...node, __level: level }];
    if (node?.enfants && Array.isArray(node.enfants) && node.enfants.length > 0) {
      node.enfants.forEach((child: any) => {
        rows.push(...flattenCalculTree(child, level + 1));
      });
    }
    return rows;
  };

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
    fetchPostes();
    fetchGLAccounts();
    fetchAvailableDates();
  }, []);

  const fetchAvailableDates = async () => {
    try {
      const response = await fetch('/api/pcb/gl/dates', {
        headers: getAuthHeaders(),
      });
      if (!response.ok) throw new Error('Erreur');
      const data = await response.json();
      setAvailableDates(data || []);
      if (data && data.length > 0 && !selectedDate) {
        setSelectedDate(data[0]);
      }
    } catch (err) {
      console.error('Erreur:', err);
    }
  };

  const fetchPostes = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/pcb/postes', {
        headers: getAuthHeaders(),
      });
      if (!response.ok) throw new Error('Erreur');
      const data = await response.json();
      setPostes(data);
    } catch (err) {
      alert('Erreur: ' + (err instanceof Error ? err.message : 'Erreur inconnue'));
    } finally {
      setLoading(false);
    }
  };

  const fetchGLAccounts = async () => {
    try {
      const response = await fetch('/api/pcb/gl/latest', {
        headers: getAuthHeaders(),
      });
      if (!response.ok) throw new Error('Erreur');
      const data = await response.json();
      setGlAccounts(data);
    } catch (err) {
      console.error('Erreur:', err);
    }
  };

  const handleAddGLToPoste = async () => {
    if (!selectedPoste || !newGLMapping.code) {
      alert('Veuillez sélectionner un poste et entrer un code GL');
      return;
    }

    try {
      const updatedGlCodes = [...(selectedPoste.gl_codes || []), newGLMapping];
      const response = await fetch(`/api/pcb/postes/${selectedPoste.id}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({ gl_codes: updatedGlCodes }),
      });

      if (!response.ok) throw new Error('Erreur');
      alert('GL ajouté avec succès !');
      setShowAddGLModal(false);
      setNewGLMapping({ code: '', signe: '+', basis: 'NET' });
      fetchPostes();
      setSelectedPoste({ ...selectedPoste, gl_codes: updatedGlCodes });
    } catch (err) {
      alert('Erreur: ' + (err instanceof Error ? err.message : 'Erreur inconnue'));
    }
  };

  const handleUpdateGLMapping = (glIndex: number, updates: Partial<GLCode>) => {
    if (!selectedPoste) return;
    const updatedGlCodes = (selectedPoste.gl_codes || []).map((gl, idx) => {
      if (idx !== glIndex) return gl;
      return {
        ...gl,
        ...updates,
      };
    });
    setSelectedPoste({ ...selectedPoste, gl_codes: updatedGlCodes });
  };

  const handleSaveGLMappings = async () => {
    if (!selectedPoste) return;
    try {
      const response = await fetch(`/api/pcb/postes/${selectedPoste.id}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({ gl_codes: selectedPoste.gl_codes || [] }),
      });

      if (!response.ok) throw new Error('Erreur');
      alert('Mapping mis à jour avec succès !');
      fetchPostes();
    } catch (err) {
      alert('Erreur: ' + (err instanceof Error ? err.message : 'Erreur inconnue'));
    }
  };

  const handleCalculerPoste = async () => {
    if (!selectedPoste || !selectedDate) {
      alert('Veuillez sélectionner un poste et une date de solde');
      return;
    }

    setCalculating(true);
    setCalculResult(null);
    setShowCalculDetails(false);
    try {
      const dateStr = selectedDate.split('T')[0];
      const response = await fetch(`/api/pcb/postes/${selectedPoste.id}/calculer?date_solde=${encodeURIComponent(dateStr)}`, {
        method: 'POST',
        headers: getAuthHeaders(),
      });

      if (!response.ok) throw new Error('Erreur lors du calcul');
      const data = await response.json();
      setCalculResult(data);
    } catch (err) {
      alert('Erreur: ' + (err instanceof Error ? err.message : 'Erreur inconnue'));
    } finally {
      setCalculating(false);
    }
  };

  const handleRemoveGLFromPoste = async (glIndex: number) => {
    if (!selectedPoste) return;

    try {
      const updatedGlCodes = selectedPoste.gl_codes.filter((_, i) => i !== glIndex);
      const response = await fetch(`/api/pcb/postes/${selectedPoste.id}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({ gl_codes: updatedGlCodes }),
      });

      if (!response.ok) throw new Error('Erreur');
      alert('GL supprimé avec succès !');
      fetchPostes();
      setSelectedPoste({ ...selectedPoste, gl_codes: updatedGlCodes });
    } catch (err) {
      alert('Erreur: ' + (err instanceof Error ? err.message : 'Erreur inconnue'));
    }
  };

  const filteredPostes = postes
    .filter((p) => {
      const matchesSearch =
        p.code.toLowerCase().includes(posteSearch.toLowerCase()) ||
        p.libelle.toLowerCase().includes(posteSearch.toLowerCase());
      const matchesType = !posteTypeFilter || p.type === posteTypeFilter;
      return matchesSearch && matchesType;
    })
    .sort((a, b) => {
      const orderA = Number.isFinite(a.ordre) ? a.ordre : 0;
      const orderB = Number.isFinite(b.ordre) ? b.ordre : 0;
      if (orderA !== orderB) return orderA - orderB;
      return (a.code || '').localeCompare(b.code || '');
    });

  const filteredGLAccounts = glAccounts.filter(
    (gl) =>
      gl.code.toLowerCase().includes(glSearch.toLowerCase()) ||
      gl.libelle.toLowerCase().includes(glSearch.toLowerCase())
  );

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <h3 style={{ margin: 0, fontSize: '1.5rem', fontWeight: '700', color: '#fff' }}>
          🔗 Mapping GL → Postes
        </h3>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
            <label style={{ fontSize: '0.85rem', fontWeight: '600', color: '#CBD5E1' }}>
              📅 Date de solde
            </label>
            <select
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              style={{
                padding: '0.75rem',
                borderRadius: '8px',
                border: '1px solid #3B82F6',
                fontSize: '0.9rem',
                minWidth: '200px',
                color: '#ffffff',
                background: '#1E3A8A',
                colorScheme: 'dark',
              }}
            >
              <option value="" style={{ background: '#1E3A8A', color: '#ffffff' }}>Sélectionner une date</option>
              {availableDates.map((date) => (
                <option key={date} value={date} style={{ background: '#1E3A8A', color: '#ffffff' }}>
                  {new Date(date).toLocaleDateString('fr-FR', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div
        style={{
          display: 'flex',
          gap: '1rem',
          marginBottom: '1.5rem',
          padding: '1rem',
          background: '#0B1026',
          borderRadius: '12px',
          border: '1px solid #3B82F6',
        }}
      >
        <button
          onClick={() => setViewMode('poste')}
          style={{
            flex: 1,
            padding: '0.75rem 1.5rem',
            background: viewMode === 'poste' ? 'linear-gradient(135deg, #1B3A8C 0%, #2e5bb8 50%, #C9A84C 100%)' : '#1E3A8A',
            color: viewMode === 'poste' ? '#fff' : '#E2E8F0',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontWeight: '600',
          }}
        >
          📋 Configurer depuis un poste
        </button>
        <button
          onClick={() => setViewMode('gl')}
          style={{
            flex: 1,
            padding: '0.75rem 1.5rem',
            background: viewMode === 'gl' ? 'linear-gradient(135deg, #1B3A8C 0%, #2e5bb8 50%, #C9A84C 100%)' : '#1E3A8A',
            color: viewMode === 'gl' ? '#fff' : '#E2E8F0',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontWeight: '600',
          }}
        >
          📊 Configurer depuis un GL
        </button>
      </div>

      {/* Mode 1 : Configuration depuis un poste */}
      {viewMode === 'poste' && (
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 2fr', gap: '1.5rem' }}>
          <div style={{ background: '#0B1026', borderRadius: '12px', padding: '1rem', border: '1px solid #3B82F6', maxHeight: '600px', overflowY: 'auto' }}>
            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
              <select
                value={posteTypeFilter}
                onChange={(e) => setPosteTypeFilter(e.target.value)}
                style={{
                  flex: 1,
                  minWidth: '220px',
                  padding: '0.75rem',
                  borderRadius: '8px',
                  border: '1px solid #3B82F6',
                  background: '#1E3A8A',
                  color: '#ffffff',
                  colorScheme: 'dark',
                }}
              >
                <option value="" style={{ background: '#1E3A8A', color: '#ffffff' }}>Tous les types</option>
                <option value="bilan_actif" style={{ background: '#1E3A8A', color: '#ffffff' }}>Bilan Actif</option>
                <option value="bilan_passif" style={{ background: '#1E3A8A', color: '#ffffff' }}>Bilan Passif</option>
                <option value="cr_produit" style={{ background: '#1E3A8A', color: '#ffffff' }}>Compte de résultat</option>
                <option value="cr_charge" style={{ background: '#1E3A8A', color: '#ffffff' }}>Ratio Caracteristique de Gestion</option>
              </select>
              <button
                type="button"
                onClick={() => setPosteTypeFilter('')}
                style={{
                  padding: '0.75rem 1rem',
                  background: '#1D4ED8',
                  color: '#E2E8F0',
                  border: '1px solid #3B82F6',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontWeight: '600',
                }}
              >
                Réinitialiser
              </button>
            </div>
            <input
              type="text"
              placeholder="Rechercher un poste..."
              value={posteSearch}
              onChange={(e) => setPosteSearch(e.target.value)}
              style={{ width: '100%', padding: '0.75rem', marginBottom: '1rem', borderRadius: '8px', border: '1px solid #3B82F6', background: '#1E3A8A', color: '#ffffff' }}
            />
            {filteredPostes.map((poste) => (
              <button
                key={poste.id}
                onClick={() => setSelectedPoste(poste)}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  textAlign: 'left',
                  background: selectedPoste?.id === poste.id ? 'rgba(59, 130, 246, 0.25)' : '#1E3A8A',
                  border: `2px solid ${selectedPoste?.id === poste.id ? '#1B3A8C' : 'transparent'}`,
                  borderRadius: '8px',
                  cursor: 'pointer',
                  marginBottom: '0.5rem',
                }}
              >
                <div style={{ fontWeight: '600', color: '#fff' }}>{poste.code}</div>
                <div style={{ fontSize: '0.85rem', color: '#CBD5E1' }}>{poste.libelle}</div>
              </button>
            ))}
          </div>

          <div style={{ background: '#0B1026', borderRadius: '12px', padding: '1.5rem', border: '1px solid #3B82F6' }}>
            {selectedPoste ? (
              <>
                <h4 style={{ margin: '0 0 1rem 0', fontSize: '1.1rem', fontWeight: '700', color: '#fff' }}>
                  {selectedPoste.code} - {selectedPoste.libelle}
                </h4>

                {/* Bouton calculer */}
                {selectedDate && (
                  <div style={{ marginBottom: '1rem', padding: '1rem', background: '#0B1026', borderRadius: '8px', border: '1px solid #3B82F6' }}>
                    <button
                      onClick={handleCalculerPoste}
                      disabled={calculating}
                      style={{
                        padding: '0.75rem 1.5rem',
                        background: calculating ? '#cbd5e0' : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '8px',
                        cursor: calculating ? 'not-allowed' : 'pointer',
                        fontWeight: '600',
                        fontSize: '0.9rem',
                        width: '100%',
                      }}
                    >
                      {calculating ? '⏳ Calcul en cours...' : '🧮 Tester / Calculer ce poste'}
                    </button>
                    
                    {calculResult && (
                      <div style={{ marginTop: '1rem', padding: '1rem', background: '#0B1026', borderRadius: '8px', border: '1px solid #3B82F6' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                          <span style={{ fontWeight: '600', color: '#fff' }}>Solde (brut):</span>
                          <span style={{ fontWeight: '700', fontSize: '1.2rem', color: (calculResult.solde_brut || 0) < 0 ? '#c62828' : '#1B3A8C' }}>
                            {formatNumber(calculResult.solde_brut || 0)} XOF
                          </span>
                        </div>
                        {calculResult.warning_signe && (
                          <div style={{ padding: '0.75rem', background: '#fff3cd', borderRadius: '6px', border: '1px solid #ffc107', marginBottom: '0.5rem' }}>
                            <span style={{ fontWeight: '600', color: '#856404' }}>⚠️ Signe inversé / vérifier mapping</span>
                          </div>
                        )}

                        {/* Si poste parent : afficher la hiérarchie (somme des enfants) */}
                        {calculResult.enfants && Array.isArray(calculResult.enfants) && calculResult.enfants.length > 0 && (
                          <div style={{ marginTop: '0.75rem' }}>
                            <div style={{ fontWeight: '700', color: '#fff', marginBottom: '0.5rem' }}>
                              Détail des sous-postes (somme)
                            </div>
                            <div style={{ maxHeight: '300px', overflowY: 'auto', border: '1px solid #334155', borderRadius: '8px' }}>
                              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                                <thead>
                                  <tr style={{ background: '#0B1026', borderBottom: '2px solid #3B82F6' }}>
                                    <th style={{ padding: '0.5rem', textAlign: 'left', fontWeight: '600', color: '#fff' }}>Poste</th>
                                    <th style={{ padding: '0.5rem', textAlign: 'right', fontWeight: '600', color: '#fff' }}>Solde brut</th>
                                    <th style={{ padding: '0.5rem', textAlign: 'left', fontWeight: '600', color: '#fff' }}>Source</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {flattenCalculTree(calculResult)
                                    .slice(1)
                                    .map((row: any, idx: number) => (
                                      <tr key={idx} style={{ borderBottom: '1px solid #334155' }}>
                                        <td style={{ padding: '0.5rem', color: '#fff' }}>
                                          <span style={{ display: 'inline-block', paddingLeft: `${Math.min((row.__level || 0) * 16, 64)}px` }}>
                                            {row.code} - <span style={{ color: '#CBD5E1' }}>{row.libelle}</span>
                                          </span>
                                        </td>
                                        <td style={{ padding: '0.5rem', textAlign: 'right', fontWeight: '700', color: (row.solde_brut || 0) < 0 ? '#c62828' : '#1B3A8C' }}>
                                          {formatNumber(row.solde_brut || 0)} XOF
                                        </td>
                                        <td style={{ padding: '0.5rem', color: '#CBD5E1' }}>{row.source || '-'}</td>
                                      </tr>
                                    ))}
                                </tbody>
                              </table>
                            </div>
                            <div style={{ marginTop: '0.5rem', fontSize: '0.8rem', color: '#CBD5E1' }}>
                              Le solde du parent est calculé comme la somme des soldes de ses sous-postes.
                            </div>
                          </div>
                        )}

                        <button
                          onClick={() => setShowCalculDetails(!showCalculDetails)}
                          style={{
                            padding: '0.5rem 1rem',
                            background: '#1D4ED8',
                            color: '#E2E8F0',
                            border: 'none',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            fontSize: '0.85rem',
                            fontWeight: '600',
                            width: '100%',
                            marginTop: '0.5rem',
                          }}
                        >
                          {showCalculDetails ? '▼ Masquer détails' : '▶ Voir détails'}
                        </button>

                        {/* Détails GL disponibles sur les feuilles (gl_details) */}
                        {showCalculDetails && calculResult.gl_details && (
                          <div style={{ marginTop: '1rem', maxHeight: '300px', overflowY: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                              <thead>
                                <tr style={{ background: '#0B1026', borderBottom: '2px solid #3B82F6' }}>
                                  <th style={{ padding: '0.5rem', textAlign: 'left', fontWeight: '600', color: '#fff' }}>Code</th>
                                  <th style={{ padding: '0.5rem', textAlign: 'left', fontWeight: '600', color: '#fff' }}>Libellé</th>
                                  <th style={{ padding: '0.5rem', textAlign: 'left', fontWeight: '600', color: '#fff' }}>Base</th>
                                  <th style={{ padding: '0.5rem', textAlign: 'right', fontWeight: '600', color: '#fff' }}>Débit</th>
                                  <th style={{ padding: '0.5rem', textAlign: 'right', fontWeight: '600', color: '#fff' }}>Crédit</th>
                                  <th style={{ padding: '0.5rem', textAlign: 'right', fontWeight: '600', color: '#fff' }}>Net</th>
                                  <th style={{ padding: '0.5rem', textAlign: 'right', fontWeight: '600', color: '#fff' }}>Contribution</th>
                                </tr>
                              </thead>
                              <tbody>
                                {calculResult.gl_details.map((detail: any, idx: number) => (
                                  <tr key={idx} style={{ borderBottom: '1px solid #334155' }}>
                                    <td style={{ padding: '0.5rem', color: '#fff' }}>{detail.code}</td>
                                    <td style={{ padding: '0.5rem', color: '#CBD5E1' }}>{detail.libelle || '-'}</td>
                                    <td style={{ padding: '0.5rem', color: '#CBD5E1' }}>{detail.basis || 'NET'}</td>
                                    <td style={{ padding: '0.5rem', textAlign: 'right', color: '#CBD5E1' }}>
                                      {formatNumber(detail.solde_debit || 0)}
                                    </td>
                                    <td style={{ padding: '0.5rem', textAlign: 'right', color: '#CBD5E1' }}>
                                      {formatNumber(detail.solde_credit || 0)}
                                    </td>
                                    <td style={{ padding: '0.5rem', textAlign: 'right', color: '#CBD5E1' }}>
                                      {formatNumber(detail.solde_net || 0)}
                                    </td>
                                    <td style={{ padding: '0.5rem', textAlign: 'right', fontWeight: '600', color: detail.contribution >= 0 ? '#0F1E48' : '#c62828' }}>
                                      {detail.signe} {formatNumber(Math.abs(detail.contribution || 0))}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                <div style={{ marginBottom: '1rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                    <label style={{ fontWeight: '600', color: '#CBD5E1' }}>Comptes GL associés</label>
                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                      <button
                        onClick={() => setShowAddGLModal(true)}
                        style={{
                          padding: '0.5rem 1rem',
                          background: '#1B3A8C',
                          color: '#fff',
                          border: 'none',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          fontSize: '0.85rem',
                          fontWeight: '600',
                        }}
                      >
                        ➕ Ajouter un GL
                      </button>
                      {selectedPoste.gl_codes && selectedPoste.gl_codes.length > 0 && (
                        <button
                          onClick={handleSaveGLMappings}
                          style={{
                            padding: '0.5rem 1rem',
                            background: '#1D4ED8',
                            color: '#E2E8F0',
                            border: 'none',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            fontSize: '0.85rem',
                            fontWeight: '600',
                          }}
                        >
                          💾 Enregistrer modifications
                        </button>
                      )}
                    </div>
                  </div>

                  {selectedPoste.gl_codes && selectedPoste.gl_codes.length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                      {selectedPoste.gl_codes.map((glMapping, index) => (
                        <div
                          key={index}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.75rem',
                            padding: '0.75rem',
                            background: '#1E3A8A',
                            borderRadius: '8px',
                            border: '1px solid #3B82F6',
                          }}
                        >
                          <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: '600', color: '#fff' }}>{glMapping.code}</div>
                            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginTop: '0.5rem', flexWrap: 'wrap' }}>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                                <div style={{ fontSize: '0.75rem', fontWeight: '600', color: '#CBD5E1' }}>Base</div>
                                <select
                                  value={glMapping.basis || 'NET'}
                                  onChange={(e) => handleUpdateGLMapping(index, { basis: e.target.value as GLCode['basis'] })}
                                  style={{
                                    padding: '0.5rem 0.6rem',
                                    borderRadius: '6px',
                                    border: '1px solid #3B82F6',
                                    fontSize: '0.85rem',
                                    color: '#ffffff',
                                    background: '#0B1026',
                                    colorScheme: 'dark',
                                  }}
                                >
                                  <option value="NET" style={{ background: '#0B1026', color: '#ffffff' }}>{netBasisLabel}</option>
                                  <option value="CREDIT" style={{ background: '#0B1026', color: '#ffffff' }}>CREDIT</option>
                                  <option value="DEBIT" style={{ background: '#0B1026', color: '#ffffff' }}>DEBIT</option>
                                </select>
                              </div>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                                <div style={{ fontSize: '0.75rem', fontWeight: '600', color: '#CBD5E1' }}>Signe</div>
                                <select
                                  value={glMapping.signe}
                                  onChange={(e) => handleUpdateGLMapping(index, { signe: e.target.value as GLCode['signe'] })}
                                  style={{
                                    padding: '0.5rem 0.6rem',
                                    borderRadius: '6px',
                                    border: '1px solid #3B82F6',
                                    fontSize: '0.85rem',
                                    color: '#ffffff',
                                    background: '#0B1026',
                                    colorScheme: 'dark',
                                  }}
                                >
                                  <option value="+" style={{ background: '#0B1026', color: '#ffffff' }}>+</option>
                                  <option value="-" style={{ background: '#0B1026', color: '#ffffff' }}>-</option>
                                </select>
                              </div>
                            </div>
                          </div>
                          <button
                            onClick={() => handleRemoveGLFromPoste(index)}
                            style={{
                              padding: '0.5rem 0.75rem',
                              background: '#f44336',
                              color: '#fff',
                              border: 'none',
                              borderRadius: '6px',
                              cursor: 'pointer',
                            }}
                          >
                            🗑️
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div style={{ padding: '2rem', textAlign: 'center', background: '#0B1026', borderRadius: '8px', color: '#CBD5E1', border: '1px solid #3B82F6' }}>
                      Aucun GL associé.
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div style={{ textAlign: 'center', padding: '3rem', color: '#CBD5E1' }}>
                👈 Sélectionnez un poste
              </div>
            )}
          </div>
        </div>
      )}

      {/* Mode 2 : Configuration depuis un GL */}
      {viewMode === 'gl' && (
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 2fr', gap: '1.5rem' }}>
          <div style={{ background: '#0B1026', borderRadius: '12px', padding: '1rem', border: '1px solid #3B82F6', maxHeight: '600px', overflowY: 'auto' }}>
            <input
              type="text"
              placeholder="Rechercher un GL..."
              value={glSearch}
              onChange={(e) => setGlSearch(e.target.value)}
              style={{ width: '100%', padding: '0.75rem', marginBottom: '1rem', borderRadius: '8px', border: '1px solid #3B82F6', background: '#1E3A8A', color: '#ffffff' }}
            />
            {filteredGLAccounts.map((gl) => (
              <button
                key={gl.id}
                onClick={() => setSelectedGL(gl)}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  textAlign: 'left',
                  background: selectedGL?.id === gl.id ? 'rgba(59, 130, 246, 0.25)' : '#1E3A8A',
                  border: `2px solid ${selectedGL?.id === gl.id ? '#1B3A8C' : 'transparent'}`,
                  borderRadius: '8px',
                  cursor: 'pointer',
                  marginBottom: '0.5rem',
                }}
              >
                <div style={{ fontWeight: '600', color: '#fff' }}>{gl.code}</div>
                <div style={{ fontSize: '0.85rem', color: '#CBD5E1' }}>{gl.libelle}</div>
              </button>
            ))}
          </div>

          <div style={{ background: '#0B1026', borderRadius: '12px', padding: '1.5rem', border: '1px solid #3B82F6' }}>
            {selectedGL ? (
              <>
                <h4 style={{ margin: '0 0 1rem 0', fontSize: '1.1rem', fontWeight: '700', color: '#fff' }}>
                  {selectedGL.code} - {selectedGL.libelle}
                </h4>
                <p style={{ margin: '0 0 1rem 0', fontSize: '0.85rem', color: '#CBD5E1' }}>
                  Utilisé dans {postes.filter(p => {
                    if (!p.gl_codes) return false;
                    return p.gl_codes.some(gl => {
                      const glCode = gl.code;
                      if (glCode === selectedGL.code) return true;
                      if (glCode.includes('*')) {
                        const prefix = glCode.replace('*', '');
                        return selectedGL.code.startsWith(prefix);
                      }
                      if (glCode.includes('-')) {
                        const parts = glCode.split('-');
                        if (parts.length === 2) {
                          const start = parseInt(parts[0].trim());
                          const end = parseInt(parts[1].trim());
                          const codeNum = parseInt(selectedGL.code);
                          if (!isNaN(start) && !isNaN(end) && !isNaN(codeNum)) {
                            return codeNum >= start && codeNum <= end;
                          }
                        }
                      }
                      return false;
                    });
                  }).length} poste(s)
                </p>
                <div style={{ marginTop: '1rem' }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', color: '#CBD5E1' }}>
                    Postes utilisant ce GL:
                  </label>
                  <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                    {postes.filter(p => {
                      if (!p.gl_codes) return false;
                      return p.gl_codes.some(gl => {
                        const glCode = gl.code;
                        if (glCode === selectedGL.code) return true;
                        if (glCode.includes('*')) {
                          const prefix = glCode.replace('*', '');
                          return selectedGL.code.startsWith(prefix);
                        }
                        if (glCode.includes('-')) {
                          const parts = glCode.split('-');
                          if (parts.length === 2) {
                            const start = parseInt(parts[0].trim());
                            const end = parseInt(parts[1].trim());
                            const codeNum = parseInt(selectedGL.code);
                            if (!isNaN(start) && !isNaN(end) && !isNaN(codeNum)) {
                              return codeNum >= start && codeNum <= end;
                            }
                          }
                        }
                        return false;
                      });
                    }).map((poste) => (
                      <button
                        key={poste.id}
                        onClick={() => {
                          setSelectedPoste(poste);
                          setViewMode('poste');
                        }}
                        style={{
                          width: '100%',
                          padding: '0.75rem',
                          textAlign: 'left',
                          background: '#1E3A8A',
                          border: '1px solid #3B82F6',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          marginBottom: '0.5rem',
                        }}
                      >
                        <div style={{ fontWeight: '600', color: '#fff' }}>{poste.code}</div>
                        <div style={{ fontSize: '0.85rem', color: '#CBD5E1' }}>{poste.libelle}</div>
                      </button>
                    ))}
                  </div>
                </div>
              </>
            ) : (
              <div style={{ textAlign: 'center', padding: '3rem', color: '#CBD5E1' }}>
                👈 Sélectionnez un GL
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal pour ajouter un GL */}
      {showAddGLModal && selectedPoste && (
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
          }}
          onClick={() => setShowAddGLModal(false)}
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
              ➕ Ajouter un GL
            </h3>

            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', color: '#CBD5E1' }}>
                Code GL * (support patterns: 411*, 4111-4119, Classe 4)
              </label>
              <input
                type="text"
                value={newGLMapping.code}
                onChange={(e) => setNewGLMapping({ ...newGLMapping, code: e.target.value })}
                style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #3B82F6', color: '#ffffff', background: '#1E3A8A' }}
                placeholder="ex: 101011, 411*, 4111-4119, Classe 4"
              />
              <div style={{ fontSize: '0.75rem', color: '#CBD5E1', marginTop: '0.25rem' }}>
                Patterns supportés: 411* (préfixe), 4111-4119 (plage), Classe 4 (classe), ou codes séparés par virgules
              </div>
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', color: '#CBD5E1' }}>
                Base
              </label>
              <select
                value={newGLMapping.basis}
                onChange={(e) => setNewGLMapping({ ...newGLMapping, basis: e.target.value as 'NET' | 'DEBIT' | 'CREDIT' })}
                style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #3B82F6', color: '#ffffff', background: '#1E3A8A', colorScheme: 'dark' }}
              >
                <option value="NET" style={{ background: '#1E3A8A', color: '#ffffff' }}>{netBasisLabelLong}</option>
                <option value="DEBIT" style={{ background: '#1E3A8A', color: '#ffffff' }}>DEBIT (Débit brut)</option>
                <option value="CREDIT" style={{ background: '#1E3A8A', color: '#ffffff' }}>CREDIT (Crédit brut)</option>
              </select>
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', color: '#CBD5E1' }}>
                Signe
              </label>
              <select
                value={newGLMapping.signe}
                onChange={(e) => setNewGLMapping({ ...newGLMapping, signe: e.target.value as '+' | '-' })}
                style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #3B82F6', color: '#ffffff', background: '#1E3A8A', colorScheme: 'dark' }}
              >
                <option value="+" style={{ background: '#1E3A8A', color: '#ffffff' }}>+ (Ajouter)</option>
                <option value="-" style={{ background: '#1E3A8A', color: '#ffffff' }}>- (Soustraire)</option>
              </select>
            </div>

            <div style={{ display: 'flex', gap: '1rem' }}>
              <button
                onClick={() => setShowAddGLModal(false)}
                style={{
                  flex: 1,
                  padding: '0.75rem',
                  background: '#1D4ED8',
                  color: '#E2E8F0',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontWeight: '600',
                }}
              >
                Annuler
              </button>
              <button
                onClick={handleAddGLToPoste}
                style={{
                  flex: 1,
                  padding: '0.75rem',
                  background: '#1B3A8C',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontWeight: '600',
                }}
              >
                Ajouter
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MappingTab;
