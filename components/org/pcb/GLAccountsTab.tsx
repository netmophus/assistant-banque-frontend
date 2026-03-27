'use client';

import React, { useState, useEffect } from 'react';
import { useResponsive } from '@/hooks/useResponsive';
import api from '@/lib/api/pcb';

interface GLAccount {
  id: number;
  code: string;
  libelle: string;
  classe: number;
  solde: number;
  solde_debit?: number;
  solde_credit?: number;
  type?: string;
  date_solde: string;
  devise: string;
}

interface ImportResult {
  comptes_crees: number;
  comptes_mis_a_jour: number;
  erreurs?: Array<{ ligne?: number; code?: string; message: string }>;
}

const GLAccountsTab = () => {
  const { isMobile } = useResponsive();
  const [glAccounts, setGlAccounts] = useState<GLAccount[]>([]);
  const [loading, setLoading] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importDate, setImportDate] = useState(new Date().toISOString().split('T')[0]);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [filters, setFilters] = useState({ classe: '', code: '', date: '' });
  const [availableDates, setAvailableDates] = useState<string[]>([]);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedDeleteDate, setSelectedDeleteDate] = useState('');
  const [deleteAll, setDeleteAll] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetchGLAccounts();
    fetchAvailableDates();
  }, [filters]);

  const fetchGLAccounts = async () => {
    if (!filters.date) {
      setGlAccounts([]);
      return;
    }

    setLoading(true);
    try {
      let dateStr = filters.date;
      if (filters.date.includes('T')) {
        dateStr = filters.date.split('T')[0];
      } else if (filters.date.length > 10) {
        const dateObj = new Date(filters.date);
        dateStr = dateObj.toISOString().split('T')[0];
      }

      const params: any = { date_solde: dateStr };
      if (filters.classe) params.classe = filters.classe;
      if (filters.code) params.code = filters.code;

      const { data } = await api.get<GLAccount[]>('/api/pcb/gl', { params });
      setGlAccounts(data || []);
    } catch (err: any) {
      console.error('Erreur lors de la récupération des comptes GL:', err);
      alert('Erreur: ' + (err.message || 'Erreur inconnue'));
    } finally {
      setLoading(false);
    }
  };

  const fetchAvailableDates = async () => {
    try {
      const { data: dates } = await api.get<string[]>('/api/pcb/gl/dates');
      const dateMap = new Map<string, string>();

      (dates || []).forEach((dateStr) => {
        try {
          const date = new Date(dateStr);
          const dateKey = `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`;

          if (!dateMap.has(dateKey)) {
            const normalized = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
            dateMap.set(dateKey, normalized.toISOString());
          }
        } catch (e) {
          console.warn('Erreur lors de la normalisation de la date:', dateStr, e);
        }
      });

      const normalizedDates = Array.from(dateMap.values()).sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
      setAvailableDates(normalizedDates);
    } catch (err) {
      console.error('Erreur lors de la récupération des dates:', err);
      setAvailableDates([]);
    }
  };

  const handleDelete = async () => {
    if (deleteAll) {
      if (!window.confirm(`⚠️ ATTENTION : Êtes-vous sûr de vouloir supprimer TOUS les comptes GL de l'organisation ?\n\nCette action est irréversible et supprimera toutes les données importées.`)) {
        return;
      }
    } else {
      if (!selectedDeleteDate) {
        alert('Veuillez sélectionner une date');
        return;
      }

      if (!window.confirm(`Êtes-vous sûr de vouloir supprimer tous les comptes GL importés pour la date ${new Date(selectedDeleteDate).toLocaleDateString('fr-FR')} ?\n\nCette action est irréversible.`)) {
        return;
      }
    }

    setDeleting(true);
    try {
      let result;
      if (deleteAll) {
        result = await api.delete<{ deleted_count: number; message: string }>('/api/pcb/gl/all');
        const count = result?.data?.deleted_count || 0;
        alert(`Tous les comptes GL ont été supprimés avec succès ! (${count} compte(s) supprimé(s))`);
      } else {
        const dateStr = selectedDeleteDate.split('T')[0];
        result = await api.delete<{ deleted_count: number; message: string }>(`/api/pcb/gl/by-date/${dateStr}`);
        const count = result?.data?.deleted_count || 0;
        alert(`Comptes GL supprimés avec succès ! (${count} compte(s) supprimé(s))`);
      }
      setShowDeleteModal(false);
      setSelectedDeleteDate('');
      setDeleteAll(false);
      fetchGLAccounts();
      fetchAvailableDates();
    } catch (err: any) {
      console.error('Erreur lors de la suppression:', err);
      if (err.message && err.message.includes('trop de temps')) {
        alert('⚠️ La suppression prend trop de temps. Cela peut être dû à un grand nombre de comptes. Veuillez patienter ou réessayer plus tard.');
      } else {
        alert('Erreur: ' + (err.message || 'Erreur inconnue'));
      }
    } finally {
      setDeleting(false);
    }
  };

  const handleImport = async () => {
    if (!importFile) {
      alert('Veuillez sélectionner un fichier');
      return;
    }

    setImporting(true);
    setImportResult(null);

    try {
      const formData = new FormData();
      formData.append('file', importFile);
      formData.append('date_solde', new Date(importDate).toISOString());

      const { data: result } = await api.post<ImportResult>(
        '/api/pcb/gl/import',
        formData
      );

      setImportResult(result);
      setShowImportModal(false);
      setImportFile(null);
      await fetchAvailableDates();
      setFilters({ ...filters, date: '' });
      setGlAccounts([]);
    } catch (err: any) {
      console.error("Erreur lors de l'import:", err);
      alert("Erreur: " + (err.message || "Erreur inconnue"));
    } finally {
      setImporting(false);
    }
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'decimal',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(num);
  };

  const getNetAffiche = (account: GLAccount): number => {
    const debit = Number(account.solde_debit ?? 0);
    const credit = Number(account.solde_credit ?? 0);
    if ((account.type || '').toLowerCase() === 'actif') {
      return debit - credit;
    }
    if (account.solde_debit != null || account.solde_credit != null) {
      return credit - debit;
    }
    return Number(account.solde ?? 0);
  };

  return (
    <div>
      {/* Header avec bouton d'import */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '1.5rem',
          flexWrap: 'wrap',
          gap: '1rem',
        }}
      >
        <h3 style={{ margin: 0, fontSize: '1.5rem', fontWeight: '700', color: '#fff' }}>
          📊 Comptes GL (Plan Comptable Bancaire)
        </h3>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          <button
            onClick={() => setShowImportModal(true)}
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
              transition: 'all 0.3s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 6px 16px rgba(27, 58, 140, 0.4)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(27, 58, 140, 0.3)';
            }}
          >
            📥 Importer un fichier Excel
          </button>
          <button
            onClick={() => setShowDeleteModal(true)}
            disabled={availableDates.length === 0}
            style={{
              padding: '0.75rem 1.5rem',
              background: availableDates.length === 0 ? '#cbd5e0' : 'linear-gradient(135deg, #e74c3c 0%, #c0392b 100%)',
              color: '#fff',
              border: 'none',
              borderRadius: '12px',
              cursor: availableDates.length === 0 ? 'not-allowed' : 'pointer',
              fontWeight: '600',
              fontSize: '0.9rem',
              boxShadow: availableDates.length === 0 ? 'none' : '0 4px 12px rgba(231, 76, 60, 0.3)',
              transition: 'all 0.3s ease',
              opacity: availableDates.length === 0 ? 0.6 : 1,
            }}
            onMouseEnter={(e) => {
              if (availableDates.length > 0) {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 6px 16px rgba(231, 76, 60, 0.4)';
              }
            }}
            onMouseLeave={(e) => {
              if (availableDates.length > 0) {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(231, 76, 60, 0.3)';
              }
            }}
            title={availableDates.length === 0 ? 'Aucune date disponible' : 'Supprimer les comptes GL par date'}
          >
            🗑️ Supprimer par date
          </button>
        </div>
      </div>

      {/* Filtres */}
      <div
        style={{
          display: 'flex',
          gap: '1rem',
          marginBottom: '1.5rem',
          flexWrap: 'wrap',
          alignItems: 'flex-end',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
          <label style={{ fontSize: '0.85rem', fontWeight: '600', color: '#CBD5E1' }}>
            📅 Date de solde (obligatoire)
          </label>
          <select
            value={filters.date}
            onChange={(e) => setFilters({ ...filters, date: e.target.value })}
            style={{
              padding: '0.75rem',
              borderRadius: '8px',
              border: '1px solid #3B82F6',
              fontSize: '0.9rem',
              minWidth: '220px',
              background: '#1E3A8A',
              color: '#ffffff',
              colorScheme: 'dark',
              fontWeight: filters.date ? 'normal' : '600',
            }}
            required
          >
            <option
              value=""
              style={{
                background: '#1E3A8A',
                color: '#ffffff',
              }}
            >
              {availableDates.length === 0 ? 'Aucune date disponible' : '⚠️ Sélectionnez une date'}
            </option>
            {availableDates
              .map((date) => {
                try {
                  const dateObj = new Date(date);
                  return {
                    iso: date,
                    display: dateObj.toLocaleDateString('fr-FR', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    }),
                  };
                } catch {
                  return { iso: date, display: date };
                }
              })
              .sort((a, b) => new Date(b.iso).getTime() - new Date(a.iso).getTime())
              .map((dateItem) => (
                <option
                  key={dateItem.iso}
                  value={dateItem.iso}
                  style={{
                    background: '#1E3A8A',
                    color: '#ffffff',
                  }}
                >
                  {dateItem.display}
                </option>
              ))}
          </select>
          {availableDates.length === 0 && (
            <span style={{ fontSize: '0.75rem', color: '#f57c00', fontStyle: 'italic' }}>
              Importez d'abord un fichier Excel pour voir les dates disponibles
            </span>
          )}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
          <label style={{ fontSize: '0.85rem', fontWeight: '600', color: '#CBD5E1' }}>
            🔍 Code GL
          </label>
          <input
            type="text"
            placeholder="Rechercher par code GL..."
            value={filters.code}
            onChange={(e) => setFilters({ ...filters, code: e.target.value })}
            disabled={!filters.date}
            style={{
              padding: '0.75rem',
              borderRadius: '8px',
              border: '1px solid #3B82F6',
              fontSize: '0.9rem',
              minWidth: '200px',
              background: '#1E3A8A',
              color: '#ffffff',
              opacity: filters.date ? 1 : 0.6,
              cursor: filters.date ? 'text' : 'not-allowed',
            }}
          />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
          <label style={{ fontSize: '0.85rem', fontWeight: '600', color: '#CBD5E1' }}>
            📂 Classe
          </label>
          <select
            value={filters.classe}
            onChange={(e) => setFilters({ ...filters, classe: e.target.value })}
            disabled={!filters.date}
            style={{
              padding: '0.75rem',
              borderRadius: '8px',
              border: '1px solid #3B82F6',
              fontSize: '0.9rem',
              opacity: filters.date ? 1 : 0.6,
              cursor: filters.date ? 'pointer' : 'not-allowed',
              background: '#1E3A8A',
              color: '#ffffff',
              colorScheme: 'dark',
            }}
          >
            <option
              value=""
              style={{
                background: '#1E3A8A',
                color: '#ffffff',
              }}
            >
              Toutes les classes
            </option>
            {[1, 2, 3, 4, 5, 6, 7, 9].map((classe) => (
              <option
                key={classe}
                value={classe}
                style={{
                  background: '#1E3A8A',
                  color: '#ffffff',
                }}
              >
                Classe {classe} {classe === 9 ? '(Hors bilan)' : ''}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Résultat d'import */}
      {importResult && (
        <div
          style={{
            padding: '1rem',
            marginBottom: '1.5rem',
            borderRadius: '12px',
            background: importResult.erreurs && importResult.erreurs.length > 0 ? 'rgba(245, 158, 11, 0.2)' : 'rgba(46, 125, 50, 0.2)',
            border: `1px solid ${importResult.erreurs && importResult.erreurs.length > 0 ? '#F59E0B' : '#22C55E'}`,
          }}
        >
          <p style={{ margin: 0, fontWeight: '600', color: '#E2E8F0' }}>
            Import terminé : {importResult.comptes_crees} créé(s), {importResult.comptes_mis_a_jour} mis à jour
          </p>
          {importResult.erreurs && importResult.erreurs.length > 0 && (
            <div style={{ marginTop: '0.5rem' }}>
              <p style={{ margin: '0 0 0.5rem 0', fontSize: '0.85rem', fontWeight: '600', color: '#FBBF24' }}>
                {importResult.erreurs.length} erreur(s) détectée(s) :
              </p>
              <div style={{ maxHeight: '200px', overflowY: 'auto', fontSize: '0.85rem', color: '#FDE68A' }}>
                {importResult.erreurs.map((err, idx) => (
                  <div key={idx} style={{ marginBottom: '0.25rem', padding: '0.25rem', background: '#1E3A8A', borderRadius: '4px', border: '1px solid #3B82F6', color: '#ffffff' }}>
                    <strong>Ligne {err.ligne || '?'}</strong>
                    {err.code && err.code !== 'N/A' && ` (Code: ${err.code})`} : {err.message}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Message si aucune date sélectionnée */}
      {!filters.date && (
        <div
          style={{
            padding: '2rem',
            textAlign: 'center',
            background: '#fff3cd',
            borderRadius: '12px',
            border: '1px solid #ffc107',
            marginBottom: '1.5rem',
          }}
        >
          <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📅</div>
          <div style={{ fontWeight: '600', color: '#856404', marginBottom: '0.5rem' }}>Sélectionnez une date de solde</div>
          <div style={{ fontSize: '0.9rem', color: '#856404' }}>
            {availableDates.length === 0
              ? "Aucune date disponible. Importez d'abord un fichier Excel."
              : 'Veuillez sélectionner une date dans le menu déroulant ci-dessus pour afficher les comptes GL.'}
          </div>
        </div>
      )}

      {/* Liste des comptes GL */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '2rem' }}>
          <div
            style={{
              width: '40px',
              height: '40px',
              border: '4px solid #1E3A8A',
              borderTop: '4px solid #3B82F6',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
              margin: '0 auto',
            }}
          />
          <p style={{ marginTop: '1rem', color: '#CBD5E1' }}>Chargement...</p>
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', background: '#0B1026', borderRadius: '12px', overflow: 'hidden', border: '1px solid #3B82F6' }}>
            <thead>
              <tr style={{ background: 'linear-gradient(135deg, #1B3A8C 0%, #2e5bb8 50%, #C9A84C 100%)', color: '#fff' }}>
                <th style={{ padding: '1rem', textAlign: 'left', fontWeight: '600' }}>Code GL</th>
                <th style={{ padding: '1rem', textAlign: 'left', fontWeight: '600' }}>Libellé</th>
                <th style={{ padding: '1rem', textAlign: 'left', fontWeight: '600' }}>Classe</th>
                <th style={{ padding: '1rem', textAlign: 'right', fontWeight: '600' }}>Solde</th>
                <th style={{ padding: '1rem', textAlign: 'left', fontWeight: '600' }}>Date solde</th>
                <th style={{ padding: '1rem', textAlign: 'left', fontWeight: '600' }}>Devise</th>
              </tr>
            </thead>
            <tbody>
              {glAccounts.map((account, index) => (
                (() => {
                  const netAffiche = getNetAffiche(account);
                  return (
                <tr
                  key={account.id}
                  style={{
                    borderBottom: '1px solid #3B82F6',
                    background: index % 2 === 0 ? '#0B1026' : '#0B1026',
                  }}
                >
                  <td style={{ padding: '1rem', fontWeight: '600', color: '#ffffff' }}>{account.code}</td>
                  <td style={{ padding: '1rem', color: '#E2E8F0' }}>{account.libelle}</td>
                  <td style={{ padding: '1rem' }}>
                    <span
                      style={{
                        padding: '0.25rem 0.75rem',
                        borderRadius: '6px',
                        background: '#1E3A8A',
                        color: '#ffffff',
                        border: '1px solid #3B82F6',
                        fontSize: '0.85rem',
                        fontWeight: '600',
                      }}
                    >
                      Classe {account.classe}
                    </span>
                  </td>
                  <td style={{ padding: '1rem', textAlign: 'right', fontWeight: netAffiche >= 0 ? '600' : 'normal', color: netAffiche >= 0 ? '#0F1E48' : '#c62828' }}>
                    {formatNumber(netAffiche)} XOF
                  </td>
                  <td style={{ padding: '1rem', fontSize: '0.85rem', color: '#CBD5E1' }}>
                    {account.date_solde ? new Date(account.date_solde).toLocaleDateString('fr-FR') : '-'}
                  </td>
                  <td style={{ padding: '1rem', color: '#E2E8F0' }}>{account.devise}</td>
                </tr>
                  );
                })()
              ))}
              {glAccounts.length === 0 && (
                <tr>
                  <td colSpan={6} style={{ padding: '2rem', textAlign: 'center', color: '#CBD5E1' }}>
                    Aucun compte GL trouvé. Importez un fichier Excel pour commencer.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal d'import */}
      {showImportModal && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.7)',
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '1rem',
            overflowY: 'auto',
          }}
          onClick={() => !importing && setShowImportModal(false)}
        >
          <div
            style={{
              background: 'linear-gradient(135deg, #1a1f3a 0%, #2d3a5c 100%)',
              borderRadius: '16px',
              padding: '2rem',
              maxWidth: '500px',
              width: '100%',
              maxHeight: '90vh',
              overflowY: 'auto',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
              marginTop: '2rem',
              border: '1px solid #1B3A8C40',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ margin: '0 0 1.5rem 0', fontSize: '1.5rem', fontWeight: '700', color: '#fff' }}>
              📥 Importer des comptes GL
            </h3>
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', color: '#CBD5E1' }}>
                Fichier Excel
              </label>
              <input
                type="file"
                accept=".xlsx,.xls"
                onChange={(e) => setImportFile(e.target.files?.[0] || null)}
                disabled={importing}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  borderRadius: '8px',
                  border: '1px solid #1B3A8C60',
                  background: '#0B1026',
                  color: '#fff',
                  fontSize: '0.9rem',
                }}
              />
              <div style={{ margin: '0.5rem 0 0 0', fontSize: '0.85rem', color: '#CBD5E1' }}>
                <p style={{ margin: '0 0 0.5rem 0', fontWeight: '600', color: '#CBD5E1' }}>Format attendu :</p>
                <ul style={{ margin: '0', paddingLeft: '1.5rem', color: '#CBD5E1' }}>
                  <li>
                    Feuille nommée <strong>"GL_Import"</strong> (ou première feuille si absente)
                  </li>
                  <li>En-têtes dans la <strong>première ligne</strong> (ou dans les 10 premières lignes)</li>
                  <li>
                    <strong>Colonnes obligatoires</strong> : Code_GL, Libelle_GL, Classe
                  </li>
                  <li>
                    <strong>Classe</strong> : 1-7 (bilan) ou 9 (hors bilan). <strong>La classe 8 n'existe pas</strong>
                  </li>
                  <li>
                    <strong>Colonnes optionnelles</strong> : Sous_classe, Solde_Debit, Solde_Credit, Solde_Net, Date_Solde, Devise, Type
                  </li>
                </ul>
                <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.8rem', fontStyle: 'italic', color: '#CBD5E1' }}>
                  Exemple : Code_GL | Libelle_GL | Classe | Solde_Debit | Solde_Credit | Date_Solde
                </p>
              </div>
            </div>
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', color: '#CBD5E1' }}>
                Date de clôture
              </label>
              <input
                type="date"
                value={importDate}
                onChange={(e) => setImportDate(e.target.value)}
                disabled={importing}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  borderRadius: '8px',
                  border: '1px solid #1B3A8C60',
                  background: '#0B1026',
                  color: '#fff',
                  fontSize: '0.9rem',
                }}
              />
            </div>
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setShowImportModal(false)}
                disabled={importing}
                style={{
                  padding: '0.75rem 1.5rem',
                  background: '#374151',
                  color: '#fff',
                  border: '1px solid #4B5563',
                  borderRadius: '8px',
                  cursor: importing ? 'not-allowed' : 'pointer',
                  fontWeight: '600',
                  transition: 'all 0.3s',
                  opacity: importing ? 0.5 : 1,
                }}
                onMouseEnter={(e) => !importing && (e.currentTarget.style.background = '#4B5563')}
                onMouseLeave={(e) => (e.currentTarget.style.background = '#374151')}
              >
                Annuler
              </button>
              <button
                onClick={handleImport}
                disabled={importing || !importFile}
                style={{
                  padding: '0.75rem 1.5rem',
                  background: importing || !importFile ? '#6B7280' : 'linear-gradient(135deg, #1B3A8C 0%, #2e5bb8 50%, #C9A84C 100%)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: importing || !importFile ? 'not-allowed' : 'pointer',
                  fontWeight: '600',
                  transition: 'all 0.3s',
                  opacity: importing || !importFile ? 0.6 : 1,
                }}
                onMouseEnter={(e) => !importing && !importFile && (e.currentTarget.style.opacity = '0.9')}
                onMouseLeave={(e) => (e.currentTarget.style.opacity = importing || !importFile ? '0.6' : '1')}
              >
                {importing ? 'Import en cours...' : 'Importer'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de suppression */}
      {showDeleteModal && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.7)',
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '1rem',
            overflowY: 'auto',
          }}
          onClick={() => !deleting && setShowDeleteModal(false)}
        >
          <div
            style={{
              background: 'linear-gradient(135deg, #1a1f3a 0%, #2d3a5c 100%)',
              borderRadius: '16px',
              padding: '2rem',
              maxWidth: '500px',
              width: '100%',
              maxHeight: '90vh',
              overflowY: 'auto',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
              marginTop: '2rem',
              border: '1px solid #1B3A8C40',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ margin: '0 0 1.5rem 0', fontSize: '1.5rem', fontWeight: '700', color: '#fff' }}>
              🗑️ Supprimer les comptes GL
            </h3>

            {/* Option : Tout supprimer */}
            <div style={{ marginBottom: '1.5rem', padding: '1rem', background: '#dc26260f', borderRadius: '8px', border: '1px solid #DC262630' }}>
              <label style={{ display: 'flex', alignItems: 'center', cursor: deleting ? 'not-allowed' : 'pointer' }}>
                <input
                  type="checkbox"
                  checked={deleteAll}
                  onChange={(e) => {
                    setDeleteAll(e.target.checked);
                    if (e.target.checked) {
                      setSelectedDeleteDate('');
                    }
                  }}
                  disabled={deleting}
                  style={{ marginRight: '0.75rem', width: '18px', height: '18px', cursor: deleting ? 'not-allowed' : 'pointer' }}
                />
                <div>
                  <strong style={{ color: '#F87171' }}>Supprimer TOUS les comptes GL</strong>
                  <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.85rem', color: '#FCA5A5' }}>
                    Cette option supprimera définitivement tous les comptes GL de l&apos;organisation, toutes dates confondues.
                  </p>
                </div>
              </label>
            </div>

            {/* Option : Supprimer par date */}
            {!deleteAll && (
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', color: '#CBD5E1' }}>
                  Date de solde à supprimer
                </label>
                <select
                  value={selectedDeleteDate}
                  onChange={(e) => setSelectedDeleteDate(e.target.value)}
                  disabled={deleting || deleteAll}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    borderRadius: '8px',
                    border: '1px solid #1B3A8C60',
                    background: '#0B1026',
                    color: '#fff',
                    fontSize: '0.9rem',
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
                <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.85rem', color: '#F87171', fontWeight: '600' }}>
                  ⚠️ Attention : Cette action supprimera définitivement tous les comptes GL importés pour cette date.
                </p>
              </div>
            )}

            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setDeleteAll(false);
                  setSelectedDeleteDate('');
                }}
                disabled={deleting}
                style={{
                  padding: '0.75rem 1.5rem',
                  background: '#374151',
                  color: '#fff',
                  border: '1px solid #4B5563',
                  borderRadius: '8px',
                  cursor: deleting ? 'not-allowed' : 'pointer',
                  fontWeight: '600',
                  opacity: deleting ? 0.5 : 1,
                  transition: 'all 0.3s',
                }}
                onMouseEnter={(e) => !deleting && (e.currentTarget.style.background = '#4B5563')}
                onMouseLeave={(e) => (e.currentTarget.style.background = '#374151')}
              >
                Annuler
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting || (!deleteAll && !selectedDeleteDate)}
                style={{
                  padding: '0.75rem 1.5rem',
                  background: deleting || (!deleteAll && !selectedDeleteDate) ? '#6B7280' : 'linear-gradient(135deg, #e74c3c 0%, #c0392b 100%)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: deleting || (!deleteAll && !selectedDeleteDate) ? 'not-allowed' : 'pointer',
                  fontWeight: '600',
                  opacity: deleting || (!deleteAll && !selectedDeleteDate) ? 0.6 : 1,
                  transition: 'all 0.3s',
                }}
                onMouseEnter={(e) => !deleting && (!deleteAll && !selectedDeleteDate) === false && (e.currentTarget.style.opacity = '0.9')}
                onMouseLeave={(e) => (e.currentTarget.style.opacity = deleting || (!deleteAll && !selectedDeleteDate) ? '0.6' : '1')}
              >
                {deleting ? 'Suppression...' : deleteAll ? 'Tout supprimer' : 'Supprimer'}
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default GLAccountsTab;

