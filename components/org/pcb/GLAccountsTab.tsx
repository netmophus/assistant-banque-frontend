'use client';

import React, { useState, useEffect } from 'react';
import { useResponsive } from '@/hooks/useResponsive';
import api from '@/lib/api/pcb';

interface ValidationResult {
  blocking: boolean;
  severity: 'ok' | 'warning' | 'error';
  sheetName?: string;
  rowCount?: number;
  headerRow?: number;
  errors: string[];
  warnings: string[];
  stats?: SheetStats;
}

interface SheetStats {
  totalAccounts: number;
  skippedRows: number;
  classDistribution: Array<{
    classe: number;
    label: string;
    count: number;
    debit: number;
    credit: number;
  }>;
  totalDebit: number;
  totalCredit: number;
  dates: string[];
  currencies: string[];
  topContributors: Array<{ code: string; libelle: string; classe: number; net: number }>;
}

const CLASS_LABELS: Record<number, string> = {
  1: 'Passif — Trésorerie / opérations interbancaires',
  2: 'Passif — Opérations avec la clientèle',
  3: 'Actif — Opérations sur titres',
  4: 'Actif — Valeurs immobilisées',
  5: 'Actif — Capitaux permanents',
  6: 'Charges',
  7: 'Produits',
  9: 'Hors bilan',
};

const VALID_CLASSES = [1, 2, 3, 4, 5, 6, 7, 9];

// Mapping aligné sur le backend (app/services/pcb_import.py)
const COLUMN_MAPPING: Array<{ key: string; target: 'Code_GL' | 'Libelle_GL' | 'Classe' | 'Sous_classe' | 'Solde_Debit' | 'Solde_Credit' | 'Solde_Net' | 'Date_Solde' | 'Devise' | 'Type' }> = [
  { key: 'codegl', target: 'Code_GL' },
  { key: 'code_gl', target: 'Code_GL' },
  { key: 'code', target: 'Code_GL' },
  { key: 'libellegl', target: 'Libelle_GL' },
  { key: 'libelle_gl', target: 'Libelle_GL' },
  { key: 'libelle', target: 'Libelle_GL' },
  { key: 'classe', target: 'Classe' },
  { key: 'sousclasse', target: 'Sous_classe' },
  { key: 'sous_classe', target: 'Sous_classe' },
  { key: 'soldedebit', target: 'Solde_Debit' },
  { key: 'solde_debit', target: 'Solde_Debit' },
  { key: 'soldecredit', target: 'Solde_Credit' },
  { key: 'solde_credit', target: 'Solde_Credit' },
  { key: 'soldenet', target: 'Solde_Net' },
  { key: 'solde_net', target: 'Solde_Net' },
  { key: 'datesolde', target: 'Date_Solde' },
  { key: 'date_solde', target: 'Date_Solde' },
  { key: 'devise', target: 'Devise' },
  { key: 'type', target: 'Type' },
];

// Normalisation identique au backend : lower + remplacement accents + remove spaces/underscores
const normalizeForDetection = (v: any): string =>
  String(v ?? '')
    .trim()
    .toLowerCase()
    .replace(/[éèê]/g, 'e')
    .replace(/[àâ]/g, 'a')
    .replace(/\s+/g, '')
    .replace(/_/g, '');

// Pour tester si une ligne contient un en-tête Code_GL
const cellContainsCodeGl = (v: any): boolean => {
  const n = normalizeForDetection(v);
  return n === 'codegl' || (n.includes('code') && n.includes('gl'));
};

function mapColumn(normalized: string): string | null {
  for (const { key, target } of COLUMN_MAPPING) {
    const nk = key.replace(/_/g, '');
    if (normalized === nk || normalized.startsWith(nk) || nk.length >= 3 && normalized.includes(nk)) {
      return target;
    }
  }
  return null;
}

async function validateExcelFile(file: File): Promise<ValidationResult> {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!/\.(xlsx|xls)$/i.test(file.name)) {
    return { blocking: true, severity: 'error', errors: ['Le fichier doit être au format .xlsx ou .xls'], warnings: [] };
  }
  if (file.size > 25 * 1024 * 1024) {
    return { blocking: true, severity: 'error', errors: ['Le fichier dépasse la taille maximale de 25 Mo'], warnings: [] };
  }

  try {
    const XLSX = await import('xlsx');
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: 'array' });

    if (workbook.SheetNames.length === 0) {
      return { blocking: false, severity: 'warning', errors: [], warnings: ['Aucune feuille détectée — le serveur analysera le fichier.'] };
    }

    // Scanner toutes les feuilles pour trouver celle qui contient un en-tête Code_GL
    let sheetName = '';
    let rows: any[][] = [];
    const candidates: Array<{ name: string; rows: any[][] }> = [];

    const priority = workbook.SheetNames.includes('GL_Import')
      ? ['GL_Import', ...workbook.SheetNames.filter((n) => n !== 'GL_Import')]
      : workbook.SheetNames;

    for (const name of priority) {
      const sheet = workbook.Sheets[name];
      if (!sheet) continue;
      const sheetRows: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null, blankrows: true });
      const hasHeader = sheetRows
        .slice(0, Math.min(50, sheetRows.length))
        .some((row) => Array.isArray(row) && row.some(cellContainsCodeGl));
      if (hasHeader) {
        sheetName = name;
        rows = sheetRows;
        break;
      }
      candidates.push({ name, rows: sheetRows });
    }

    if (!sheetName) {
      // Aucune feuille ne contient Code_GL : fallback sur la première
      const first = candidates[0] || { name: workbook.SheetNames[0], rows: [] };
      sheetName = first.name;
      rows = first.rows;
      warnings.push(`Aucune feuille ne contient de colonne "Code_GL" détectable. Le serveur utilisera "${sheetName}".`);
    } else if (sheetName !== 'GL_Import') {
      warnings.push(`Feuille GL détectée : "${sheetName}"${workbook.SheetNames.length > 1 ? ` (parmi ${workbook.SheetNames.length} feuilles)` : ''}.`);
    }

    // Recherche de la ligne d'en-tête dans TOUT le fichier (pas seulement les 10 premières lignes)
    let headerRowIndex = -1;
    let rawHeaders: any[] = [];
    const searchLimit = Math.min(rows.length, 50);
    for (let i = 0; i < searchLimit; i++) {
      const row = rows[i] || [];
      if (row.some(cellContainsCodeGl)) {
        headerRowIndex = i;
        rawHeaders = row;
        break;
      }
    }

    if (headerRowIndex === -1) {
      // Impossible de trouver le header → on n'est pas sûr, on laisse le serveur décider
      return {
        blocking: false,
        severity: 'warning',
        sheetName,
        errors: [],
        warnings: [
          ...warnings,
          'Impossible de détecter automatiquement la ligne d\'en-tête. Le serveur tentera de l\'identifier.',
        ],
      };
    }

    const colIndex: Partial<Record<string, number>> = {};
    rawHeaders.forEach((cell, idx) => {
      if (cell === null || cell === undefined || String(cell).trim() === '') return;
      const normalized = normalizeForDetection(cell);
      const mapped = mapColumn(normalized);
      if (mapped && colIndex[mapped] === undefined) {
        colIndex[mapped] = idx;
      }
    });

    const missingRequired = (['Code_GL', 'Libelle_GL', 'Classe'] as const).filter((c) => colIndex[c] === undefined);
    if (missingRequired.length > 0) {
      warnings.push(`Colonnes possiblement manquantes : ${missingRequired.join(', ')}. À vérifier avec le serveur.`);
      return {
        blocking: false,
        severity: 'warning',
        sheetName,
        headerRow: headerRowIndex + 1,
        errors: [],
        warnings,
      };
    }

    const codeIdx = colIndex['Code_GL']!;
    const libelleIdx = colIndex['Libelle_GL']!;
    const classeIdx = colIndex['Classe']!;
    const debitIdx = colIndex['Solde_Debit'];
    const creditIdx = colIndex['Solde_Credit'];
    const dateIdx = colIndex['Date_Solde'];
    const deviseIdx = colIndex['Devise'];

    const dataRows = rows.slice(headerRowIndex + 1);
    let validRowCount = 0;
    const invalidClasses: Array<{ line: number; value: any }> = [];
    let skippedRows = 0;
    const classStats = new Map<number, { count: number; debit: number; credit: number }>();
    let totalDebit = 0;
    let totalCredit = 0;
    const datesSet = new Set<string>();
    const currenciesSet = new Set<string>();
    const accountsForDiff: Array<{ code: string; libelle: string; classe: number; net: number }> = [];

    const parseNum = (v: any): number => {
      if (v === null || v === undefined || v === '') return 0;
      if (typeof v === 'number') return v;
      const cleaned = String(v).replace(/\s/g, '').replace(',', '.');
      const n = parseFloat(cleaned);
      return Number.isFinite(n) ? n : 0;
    };

    const parseDate = (v: any): string | null => {
      if (v === null || v === undefined || v === '') return null;
      if (v instanceof Date) return v.toISOString().split('T')[0];
      if (typeof v === 'number') {
        // Excel serial date
        const epoch = new Date(Date.UTC(1899, 11, 30));
        const ms = v * 86400000;
        return new Date(epoch.getTime() + ms).toISOString().split('T')[0];
      }
      const s = String(v).trim();
      let m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
      if (m) return `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}`;
      m = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
      if (m) return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
      return null;
    };

    dataRows.forEach((row, i) => {
      if (!row || row.every((c) => c === null || c === '' || c === undefined)) return;
      const excelLine = headerRowIndex + 2 + i;
      const code = row[codeIdx];
      const libelle = row[libelleIdx];
      const classe = row[classeIdx];

      if (
        code === null || code === undefined || String(code).trim() === '' ||
        libelle === null || libelle === undefined || String(libelle).trim() === ''
      ) {
        skippedRows++;
        return;
      }
      const classeNum = Number(classe);
      if (!Number.isFinite(classeNum) || !VALID_CLASSES.includes(classeNum)) {
        invalidClasses.push({ line: excelLine, value: classe });
        return;
      }
      validRowCount++;
      const debitRow = debitIdx !== undefined ? parseNum(row[debitIdx]) : 0;
      const creditRow = creditIdx !== undefined ? parseNum(row[creditIdx]) : 0;
      totalDebit += debitRow;
      totalCredit += creditRow;
      const current = classStats.get(classeNum) || { count: 0, debit: 0, credit: 0 };
      classStats.set(classeNum, {
        count: current.count + 1,
        debit: current.debit + debitRow,
        credit: current.credit + creditRow,
      });
      accountsForDiff.push({
        code: String(code).trim(),
        libelle: String(libelle).trim(),
        classe: classeNum,
        net: debitRow - creditRow,
      });
      if (dateIdx !== undefined) {
        const d = parseDate(row[dateIdx]);
        if (d) datesSet.add(d);
      }
      if (deviseIdx !== undefined) {
        const dev = row[deviseIdx];
        if (dev !== null && dev !== undefined && String(dev).trim() !== '') {
          currenciesSet.add(String(dev).trim().toUpperCase());
        }
      }
    });

    // Top 5 contributeurs par valeur absolue du solde net — pistes d'écart
    const topContributors = accountsForDiff
      .slice()
      .sort((a, b) => Math.abs(b.net) - Math.abs(a.net))
      .slice(0, 5);

    const stats: SheetStats = {
      totalAccounts: validRowCount,
      skippedRows,
      classDistribution: Array.from(classStats.entries())
        .sort((a, b) => a[0] - b[0])
        .map(([classe, s]) => ({
          classe,
          label: CLASS_LABELS[classe] || `Classe ${classe}`,
          count: s.count,
          debit: s.debit,
          credit: s.credit,
        })),
      totalDebit,
      totalCredit,
      dates: Array.from(datesSet).sort(),
      currencies: Array.from(currenciesSet).sort(),
      topContributors,
    };

    if (invalidClasses.length > 0) {
      const sample = invalidClasses.slice(0, 5).map((e) => `L${e.line} (${e.value})`).join(', ');
      warnings.push(
        `${invalidClasses.length} ligne(s) avec classe invalide (1-7 ou 9) : ${sample}${invalidClasses.length > 5 ? '…' : ''}`
      );
    }
    if (skippedRows > 0) {
      warnings.push(`${skippedRows} ligne(s) incomplètes seront ignorées.`);
    }

    return {
      blocking: false,
      severity: warnings.length > 0 ? 'warning' : 'ok',
      sheetName,
      rowCount: validRowCount,
      headerRow: headerRowIndex + 1,
      errors,
      warnings,
      stats,
    };
  } catch (e: any) {
    return {
      blocking: false,
      severity: 'warning',
      errors: [],
      warnings: [`Analyse côté client impossible (${e?.message || 'erreur inconnue'}) — le serveur traitera le fichier.`],
    };
  }
}

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
  const [importProgress, setImportProgress] = useState(0);
  const [importStatus, setImportStatus] = useState('');
  const [deleteProgress, setDeleteProgress] = useState(0);
  const [deleteStatus, setDeleteStatus] = useState('');
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleteSuccess, setDeleteSuccess] = useState<{ count: number; all: boolean } | null>(null);
  const [validation, setValidation] = useState<ValidationResult | null>(null);
  const [validating, setValidating] = useState(false);

  const handleFileSelect = async (file: File | null) => {
    setImportFile(file);
    setValidation(null);
    if (!file) return;
    setValidating(true);
    try {
      const result = await validateExcelFile(file);
      setValidation(result);
    } finally {
      setValidating(false);
    }
  };

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
    if (!deleteAll && !selectedDeleteDate) {
      alert('Veuillez sélectionner une date');
      return;
    }
    if (!confirmingDelete) {
      setConfirmingDelete(true);
      return;
    }

    setDeleting(true);
    setDeleteProgress(5);
    setDeleteStatus('Suppression en cours…');
    const deleteInterval = setInterval(() => {
      setDeleteProgress((p) => (p < 90 ? p + Math.random() * 4 + 1 : p));
    }, 250);
    try {
      let result;
      let count = 0;
      const wasAll = deleteAll;
      if (deleteAll) {
        result = await api.delete<{ deleted_count: number; message: string }>('/api/pcb/gl/all');
        count = result?.data?.deleted_count || 0;
      } else {
        const dateStr = selectedDeleteDate.split('T')[0];
        result = await api.delete<{ deleted_count: number; message: string }>(`/api/pcb/gl/by-date/${dateStr}`);
        count = result?.data?.deleted_count || 0;
      }
      clearInterval(deleteInterval);
      setDeleteProgress(100);
      setDeleteStatus(`${count} compte(s) supprimé(s)`);
      await new Promise((r) => setTimeout(r, 400));

      setDeleteSuccess({ count, all: wasAll });
      setConfirmingDelete(false);
      setDeleting(false);
      fetchGLAccounts();
      fetchAvailableDates();
      setTimeout(() => {
        setShowDeleteModal(false);
        setSelectedDeleteDate('');
        setDeleteAll(false);
        setDeleteSuccess(null);
        setDeleteProgress(0);
        setDeleteStatus('');
      }, 2200);
      return;
    } catch (err: any) {
      clearInterval(deleteInterval);
      console.error('Erreur lors de la suppression:', err);
      if (err.message && err.message.includes('trop de temps')) {
        alert('⚠️ La suppression prend trop de temps. Cela peut être dû à un grand nombre de comptes. Veuillez patienter ou réessayer plus tard.');
      } else {
        alert('Erreur: ' + (err.message || 'Erreur inconnue'));
      }
    } finally {
      clearInterval(deleteInterval);
      setDeleting(false);
      setTimeout(() => {
        setDeleteProgress(0);
        setDeleteStatus('');
      }, 500);
    }
  };

  const handleImport = async () => {
    if (!importFile) {
      alert('Veuillez sélectionner un fichier');
      return;
    }

    setImporting(true);
    setImportResult(null);
    setImportProgress(5);
    setImportStatus('Envoi du fichier…');

    let phase: 'upload' | 'processing' = 'upload';
    const importInterval = setInterval(() => {
      setImportProgress((p) => {
        if (phase === 'upload') {
          if (p >= 50) {
            phase = 'processing';
            setImportStatus('Traitement des données…');
            return p;
          }
          return p + Math.random() * 6 + 2;
        }
        return p < 92 ? p + Math.random() * 2 + 0.5 : p;
      });
    }, 200);

    try {
      const formData = new FormData();
      formData.append('file', importFile);
      formData.append('date_solde', new Date(importDate).toISOString());

      const { data: result } = await api.post<ImportResult>(
        '/api/pcb/gl/import',
        formData
      );

      clearInterval(importInterval);
      setImportProgress(100);
      setImportStatus(
        `${result?.comptes_crees ?? 0} créé(s), ${result?.comptes_mis_a_jour ?? 0} mis à jour`
      );
      await new Promise((r) => setTimeout(r, 500));

      setImportResult(result);
      setShowImportModal(false);
      setImportFile(null);
      setValidation(null);
      await fetchAvailableDates();
      setFilters({ ...filters, date: '' });
      setGlAccounts([]);
    } catch (err: any) {
      clearInterval(importInterval);
      console.error("Erreur lors de l'import:", err);
      alert("Erreur: " + (err.message || "Erreur inconnue"));
    } finally {
      clearInterval(importInterval);
      setImporting(false);
      setTimeout(() => {
        setImportProgress(0);
        setImportStatus('');
      }, 500);
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
            inset: 0,
            background: 'rgba(4, 8, 22, 0.82)',
            backdropFilter: 'blur(6px)',
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '1.5rem',
            overflowY: 'auto',
            animation: 'fadeInScale 0.25s ease-out',
          }}
          onClick={() => {
            if (importing) return;
            setShowImportModal(false);
            setValidation(null);
            setImportFile(null);
          }}
        >
          <div
            style={{
              background: 'linear-gradient(135deg, #070E28 0%, #0F1E48 60%, #0A1434 100%)',
              borderRadius: '20px',
              maxWidth: '560px',
              width: '100%',
              maxHeight: '92vh',
              boxShadow: '0 24px 64px rgba(0,0,0,0.6), 0 0 32px rgba(27,58,140,0.25)',
              marginTop: '2rem',
              borderTop: '2px solid rgba(27,58,140,0.4)',
              borderRight: '2px solid rgba(27,58,140,0.4)',
              borderBottom: '2px solid rgba(27,58,140,0.4)',
              borderLeft: '4px solid #C9A84C',
              position: 'relative',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                position: 'absolute',
                top: 0,
                right: 0,
                width: '280px',
                height: '180px',
                background: 'radial-gradient(circle, rgba(201,168,76,0.10) 0%, transparent 70%)',
                pointerEvents: 'none',
              }}
            />
            <div
              style={{
                position: 'absolute',
                inset: '0 0 auto 0',
                height: '1px',
                background: 'linear-gradient(90deg, transparent, rgba(201,168,76,0.5), transparent)',
              }}
            />

            <div
              style={{
                position: 'relative',
                padding: '1.5rem 1.75rem 1.25rem',
                borderBottom: '1px solid rgba(27,58,140,0.35)',
                display: 'flex',
                alignItems: 'center',
                flexShrink: 0,
                gap: '1rem',
              }}
            >
              <div
                style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '14px',
                  background: 'linear-gradient(135deg, #1B3A8C 0%, #2e5bb8 100%)',
                  border: '1px solid rgba(201,168,76,0.4)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  boxShadow: '0 6px 20px rgba(27,58,140,0.45)',
                }}
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#C9A84C" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '10px', fontWeight: 800, letterSpacing: '0.2em', color: '#C9A84C', textTransform: 'uppercase', marginBottom: '2px' }}>
                  Paramétrage PCB
                </div>
                <h3 style={{ margin: 0, fontSize: '1.3rem', fontWeight: 800, color: '#fff', letterSpacing: '-0.01em' }}>
                  Importer des comptes GL
                </h3>
                <p style={{ margin: '2px 0 0 0', fontSize: '0.78rem', color: 'rgba(255,255,255,0.55)' }}>
                  Chargez votre balance Excel pour alimenter le plan comptable bancaire.
                </p>
              </div>
              <button
                onClick={() => {
                  if (importing) return;
                  setShowImportModal(false);
                  setValidation(null);
                  setImportFile(null);
                }}
                disabled={importing}
                aria-label="Fermer"
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '10px',
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.12)',
                  color: 'rgba(255,255,255,0.6)',
                  cursor: importing ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  transition: 'all 0.2s',
                }}
                onMouseEnter={(e) => !importing && (e.currentTarget.style.background = 'rgba(248,113,113,0.15)', e.currentTarget.style.color = '#F87171', e.currentTarget.style.borderColor = 'rgba(248,113,113,0.4)')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.05)', e.currentTarget.style.color = 'rgba(255,255,255,0.6)', e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)')}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            <div style={{ position: 'relative', padding: '1.5rem 1.75rem', overflowY: 'auto', flex: '1 1 auto', minHeight: 0 }}>

            <div style={{ marginBottom: '1.25rem' }}>
              <label style={{ display: 'block', marginBottom: '0.6rem', fontSize: '0.78rem', fontWeight: 700, color: '#C9A84C', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                Fichier Excel
              </label>
              <label
                htmlFor="gl-import-file"
                style={{
                  display: 'block',
                  position: 'relative',
                  padding: importFile ? '1rem 1.25rem' : '1.75rem 1.25rem',
                  borderRadius: '14px',
                  border: `2px dashed ${
                    validation?.blocking
                      ? 'rgba(248,113,113,0.5)'
                      : validation?.severity === 'warning'
                        ? 'rgba(252,211,77,0.5)'
                        : validation?.severity === 'ok'
                          ? 'rgba(52,211,153,0.5)'
                          : 'rgba(201,168,76,0.35)'
                  }`,
                  background: validation?.blocking
                    ? 'rgba(220,38,38,0.05)'
                    : validation?.severity === 'warning'
                      ? 'rgba(252,211,77,0.05)'
                      : validation?.severity === 'ok'
                        ? 'rgba(5,150,105,0.05)'
                        : 'rgba(27,58,140,0.12)',
                  cursor: importing ? 'not-allowed' : 'pointer',
                  transition: 'all 0.25s',
                  textAlign: 'center',
                }}
              >
                <input
                  id="gl-import-file"
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={(e) => handleFileSelect(e.target.files?.[0] || null)}
                  disabled={importing}
                  style={{ position: 'absolute', inset: 0, opacity: 0, cursor: importing ? 'not-allowed' : 'pointer' }}
                />
                {!importFile ? (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.6rem' }}>
                    <div
                      style={{
                        width: '48px',
                        height: '48px',
                        borderRadius: '12px',
                        background: 'rgba(201,168,76,0.1)',
                        border: '1px solid rgba(201,168,76,0.25)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#C9A84C" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                        <polyline points="14 2 14 8 20 8" />
                        <line x1="12" y1="18" x2="12" y2="12" />
                        <line x1="9" y1="15" x2="15" y2="15" />
                      </svg>
                    </div>
                    <div>
                      <p style={{ margin: 0, fontSize: '0.9rem', fontWeight: 700, color: '#fff' }}>
                        Cliquez pour sélectionner un fichier
                      </p>
                      <p style={{ margin: '2px 0 0 0', fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)' }}>
                        Format .xlsx ou .xls — max 25 Mo
                      </p>
                    </div>
                  </div>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', textAlign: 'left' }}>
                    <div
                      style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: '10px',
                        background: 'linear-gradient(135deg, rgba(5,150,105,0.2), rgba(4,120,87,0.1))',
                        border: '1px solid rgba(52,211,153,0.4)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#34D399" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                        <polyline points="14 2 14 8 20 8" />
                      </svg>
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ margin: 0, fontSize: '0.88rem', fontWeight: 700, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {importFile.name}
                      </p>
                      <p style={{ margin: '2px 0 0 0', fontSize: '0.72rem', color: 'rgba(255,255,255,0.5)' }}>
                        {(importFile.size / 1024).toFixed(1)} Ko — cliquez pour changer
                      </p>
                    </div>
                    {!importing && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setImportFile(null);
                          setValidation(null);
                        }}
                        aria-label="Retirer le fichier"
                        style={{
                          width: '28px',
                          height: '28px',
                          borderRadius: '8px',
                          background: 'rgba(248,113,113,0.1)',
                          border: '1px solid rgba(248,113,113,0.3)',
                          color: '#F87171',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                        }}
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <line x1="18" y1="6" x2="6" y2="18" />
                          <line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                      </button>
                    )}
                  </div>
                )}
              </label>

              <details
                style={{
                  marginTop: '0.75rem',
                  padding: '0.7rem 0.9rem',
                  borderRadius: '10px',
                  background: 'rgba(255,255,255,0.02)',
                  border: '1px solid rgba(255,255,255,0.08)',
                }}
              >
                <summary style={{ cursor: 'pointer', fontSize: '0.78rem', fontWeight: 600, color: 'rgba(255,255,255,0.65)', userSelect: 'none', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#C9A84C" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="16" x2="12" y2="12" />
                    <line x1="12" y1="8" x2="12.01" y2="8" />
                  </svg>
                  Format attendu
                </summary>
                <ul style={{ margin: '0.6rem 0 0 0', paddingLeft: '1.25rem', fontSize: '0.76rem', color: 'rgba(255,255,255,0.6)', lineHeight: 1.65 }}>
                  <li>Feuille <strong style={{ color: '#C9A84C' }}>GL_Import</strong> (ou première feuille si absente)</li>
                  <li>En-têtes dans les <strong>10 premières lignes</strong></li>
                  <li>
                    <strong style={{ color: '#fff' }}>Colonnes obligatoires</strong> : Code_GL, Libelle_GL, Classe
                  </li>
                  <li>
                    <strong style={{ color: '#fff' }}>Classe</strong> : 1-7 ou 9 — <em style={{ color: '#FCA5A5' }}>la classe 8 n&apos;existe pas</em>
                  </li>
                  <li>
                    <strong style={{ color: '#fff' }}>Optionnelles</strong> : Sous_classe, Solde_Debit, Solde_Credit, Solde_Net, Date_Solde, Devise, Type
                  </li>
                </ul>
              </details>
            </div>

            {(validating || validation) && (
              <div style={{ marginBottom: '1.25rem' }}>
                {validating && (
                  <div
                    style={{
                      padding: '0.85rem 1rem',
                      borderRadius: '10px',
                      background: 'rgba(27,58,140,0.15)',
                      border: '1px solid rgba(201,168,76,0.3)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.75rem',
                    }}
                  >
                    <div
                      style={{
                        width: '16px',
                        height: '16px',
                        border: '2px solid rgba(201,168,76,0.3)',
                        borderTopColor: '#C9A84C',
                        borderRadius: '50%',
                        animation: 'spin 0.8s linear infinite',
                      }}
                    />
                    <span style={{ fontSize: '0.85rem', color: '#CBD5E1' }}>Analyse du fichier en cours…</span>
                  </div>
                )}

                {!validating && validation && validation.severity === 'ok' && (
                  <div
                    style={{
                      padding: '1rem',
                      borderRadius: '10px',
                      background: 'linear-gradient(135deg, rgba(5,150,105,0.15) 0%, rgba(4,120,87,0.06) 100%)',
                      border: '1px solid rgba(52,211,153,0.4)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
                      <div
                        style={{
                          width: '32px',
                          height: '32px',
                          borderRadius: '8px',
                          background: 'rgba(52,211,153,0.15)',
                          border: '1px solid rgba(52,211,153,0.4)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                        }}
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#34D399" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ margin: '0 0 0.25rem 0', fontSize: '0.9rem', fontWeight: 700, color: '#6EE7B7' }}>
                          Fichier conforme
                        </p>
                        <p style={{ margin: 0, fontSize: '0.8rem', color: 'rgba(255,255,255,0.72)', lineHeight: 1.5 }}>
                          Feuille <strong style={{ color: '#fff' }}>{validation.sheetName}</strong> — en-têtes ligne{' '}
                          <strong style={{ color: '#fff' }}>{validation.headerRow}</strong> —{' '}
                          <strong style={{ color: '#fff' }}>{validation.rowCount}</strong> ligne(s) valide(s)
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {!validating && validation && validation.severity === 'warning' && (
                  <div
                    style={{
                      padding: '1rem',
                      borderRadius: '10px',
                      background: 'linear-gradient(135deg, rgba(252,211,77,0.12) 0%, rgba(202,138,4,0.05) 100%)',
                      border: '1px solid rgba(252,211,77,0.4)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
                      <div
                        style={{
                          width: '32px',
                          height: '32px',
                          borderRadius: '8px',
                          background: 'rgba(252,211,77,0.15)',
                          border: '1px solid rgba(252,211,77,0.4)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                        }}
                      >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#FCD34D" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                          <line x1="12" y1="9" x2="12" y2="13" />
                          <line x1="12" y1="17" x2="12.01" y2="17" />
                        </svg>
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ margin: '0 0 0.35rem 0', fontSize: '0.9rem', fontWeight: 700, color: '#FCD34D' }}>
                          Vérification indicative
                        </p>
                        <p style={{ margin: '0 0 0.4rem 0', fontSize: '0.78rem', color: 'rgba(255,255,255,0.65)', lineHeight: 1.5 }}>
                          L&apos;analyse côté navigateur n&apos;est pas concluante. Vous pouvez tenter l&apos;import — le serveur fera la validation finale.
                        </p>
                        <ul style={{ margin: 0, padding: '0 0 0 1rem', fontSize: '0.78rem', color: 'rgba(255,255,255,0.75)', lineHeight: 1.55 }}>
                          {validation.warnings.map((w, i) => (
                            <li key={i}>{w}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                )}

                {!validating && validation && validation.stats && validation.stats.totalAccounts > 0 && (
                  <div
                    style={{
                      marginTop: '0.75rem',
                      padding: '1.1rem 1.2rem',
                      borderRadius: '12px',
                      background: 'linear-gradient(135deg, rgba(27,58,140,0.25) 0%, rgba(15,30,72,0.15) 100%)',
                      border: '1px solid rgba(201,168,76,0.25)',
                      position: 'relative',
                      overflow: 'hidden',
                    }}
                  >
                    <div
                      style={{
                        position: 'absolute',
                        top: 0,
                        right: 0,
                        width: '140px',
                        height: '80px',
                        background: 'radial-gradient(circle, rgba(201,168,76,0.10) 0%, transparent 70%)',
                        pointerEvents: 'none',
                      }}
                    />
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.85rem', position: 'relative' }}>
                      <div
                        style={{
                          width: '26px',
                          height: '26px',
                          borderRadius: '7px',
                          background: 'rgba(201,168,76,0.15)',
                          border: '1px solid rgba(201,168,76,0.4)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#C9A84C" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M3 3v18h18" />
                          <path d="M18 17V9" />
                          <path d="M13 17V5" />
                          <path d="M8 17v-3" />
                        </svg>
                      </div>
                      <span style={{ fontSize: '10px', fontWeight: 800, letterSpacing: '0.15em', color: '#C9A84C', textTransform: 'uppercase' }}>
                        État des lieux
                      </span>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.6rem', marginBottom: '0.85rem' }}>
                      <div style={{ padding: '0.65rem 0.8rem', borderRadius: '8px', background: 'rgba(7,14,40,0.5)', border: '1px solid rgba(27,58,140,0.4)' }}>
                        <div style={{ fontSize: '9px', fontWeight: 700, color: 'rgba(255,255,255,0.45)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '2px' }}>
                          Comptes GL
                        </div>
                        <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#fff', letterSpacing: '-0.01em' }}>
                          {validation.stats.totalAccounts.toLocaleString('fr-FR')}
                        </div>
                        {validation.stats.skippedRows > 0 && (
                          <div style={{ fontSize: '10px', color: '#FCD34D', marginTop: '2px' }}>
                            +{validation.stats.skippedRows} ignorée(s)
                          </div>
                        )}
                      </div>
                      <div style={{ padding: '0.65rem 0.8rem', borderRadius: '8px', background: 'rgba(7,14,40,0.5)', border: '1px solid rgba(27,58,140,0.4)' }}>
                        <div style={{ fontSize: '9px', fontWeight: 700, color: 'rgba(255,255,255,0.45)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '2px' }}>
                          Équilibre
                        </div>
                        <div
                          style={{
                            fontSize: '0.95rem',
                            fontWeight: 800,
                            letterSpacing: '-0.01em',
                            color:
                              Math.abs(validation.stats.totalDebit - validation.stats.totalCredit) < 1
                                ? '#6EE7B7'
                                : '#FCD34D',
                          }}
                        >
                          {Math.abs(validation.stats.totalDebit - validation.stats.totalCredit) < 1 ? 'Équilibré' : 'Écart détecté'}
                        </div>
                        {Math.abs(validation.stats.totalDebit - validation.stats.totalCredit) >= 1 && (
                          <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.5)', marginTop: '2px' }}>
                            Δ {(validation.stats.totalDebit - validation.stats.totalCredit).toLocaleString('fr-FR', { maximumFractionDigits: 0 })}
                          </div>
                        )}
                      </div>
                      <div style={{ padding: '0.65rem 0.8rem', borderRadius: '8px', background: 'rgba(7,14,40,0.5)', border: '1px solid rgba(27,58,140,0.4)' }}>
                        <div style={{ fontSize: '9px', fontWeight: 700, color: 'rgba(255,255,255,0.45)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '2px' }}>
                          Total Débit
                        </div>
                        <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#fff', wordBreak: 'break-all' }}>
                          {validation.stats.totalDebit.toLocaleString('fr-FR', { maximumFractionDigits: 0 })}
                        </div>
                      </div>
                      <div style={{ padding: '0.65rem 0.8rem', borderRadius: '8px', background: 'rgba(7,14,40,0.5)', border: '1px solid rgba(27,58,140,0.4)' }}>
                        <div style={{ fontSize: '9px', fontWeight: 700, color: 'rgba(255,255,255,0.45)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '2px' }}>
                          Total Crédit
                        </div>
                        <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#fff', wordBreak: 'break-all' }}>
                          {validation.stats.totalCredit.toLocaleString('fr-FR', { maximumFractionDigits: 0 })}
                        </div>
                      </div>
                    </div>

                    {(validation.stats.dates.length > 0 || validation.stats.currencies.length > 0) && (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginBottom: '0.85rem' }}>
                        {validation.stats.dates.length > 0 && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', padding: '0.3rem 0.6rem', borderRadius: '999px', background: 'rgba(27,58,140,0.35)', border: '1px solid rgba(201,168,76,0.3)', fontSize: '10px', color: 'rgba(255,255,255,0.8)' }}>
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#C9A84C" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                              <rect x="3" y="4" width="18" height="18" rx="2" />
                              <line x1="16" y1="2" x2="16" y2="6" />
                              <line x1="8" y1="2" x2="8" y2="6" />
                              <line x1="3" y1="10" x2="21" y2="10" />
                            </svg>
                            {validation.stats.dates.length === 1
                              ? new Date(validation.stats.dates[0]).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
                              : `${validation.stats.dates.length} dates (${new Date(validation.stats.dates[0]).toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' })} → ${new Date(validation.stats.dates[validation.stats.dates.length - 1]).toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' })})`}
                          </div>
                        )}
                        {validation.stats.currencies.map((c) => (
                          <div key={c} style={{ padding: '0.3rem 0.6rem', borderRadius: '999px', background: 'rgba(27,58,140,0.35)', border: '1px solid rgba(201,168,76,0.3)', fontSize: '10px', fontWeight: 700, color: '#C9A84C' }}>
                            {c}
                          </div>
                        ))}
                      </div>
                    )}

                    {validation.stats.classDistribution.length > 0 && (
                      <div>
                        <div style={{ fontSize: '10px', fontWeight: 700, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.5rem' }}>
                          Répartition par classe
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                          {validation.stats.classDistribution.map(({ classe, label, count }) => {
                            const pct = (count / validation.stats!.totalAccounts) * 100;
                            return (
                              <div key={classe} style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                                <div
                                  style={{
                                    width: '22px',
                                    height: '22px',
                                    borderRadius: '6px',
                                    background: 'linear-gradient(135deg, rgba(27,58,140,0.6), rgba(46,91,184,0.4))',
                                    border: '1px solid rgba(201,168,76,0.35)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: '11px',
                                    fontWeight: 800,
                                    color: '#C9A84C',
                                    flexShrink: 0,
                                  }}
                                >
                                  {classe}
                                </div>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2px', gap: '0.5rem' }}>
                                    <span style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.75)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                      {label}
                                    </span>
                                    <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#fff', flexShrink: 0 }}>
                                      {count}
                                    </span>
                                  </div>
                                  <div style={{ width: '100%', height: '3px', borderRadius: '999px', background: 'rgba(7,14,40,0.6)', overflow: 'hidden' }}>
                                    <div
                                      style={{
                                        width: `${pct}%`,
                                        height: '100%',
                                        background: 'linear-gradient(90deg, #1B3A8C 0%, #C9A84C 100%)',
                                        borderRadius: '999px',
                                      }}
                                    />
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {Math.abs(validation.stats.totalDebit - validation.stats.totalCredit) >= 1 && (
                      <div
                        style={{
                          marginTop: '1rem',
                          padding: '0.9rem 1rem',
                          borderRadius: '10px',
                          background: 'linear-gradient(135deg, rgba(252,211,77,0.1) 0%, rgba(202,138,4,0.04) 100%)',
                          border: '1px solid rgba(252,211,77,0.35)',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.6rem' }}>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#FCD34D" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="12" cy="12" r="10" />
                            <line x1="12" y1="8" x2="12" y2="12" />
                            <line x1="12" y1="16" x2="12.01" y2="16" />
                          </svg>
                          <span style={{ fontSize: '10px', fontWeight: 800, letterSpacing: '0.12em', color: '#FCD34D', textTransform: 'uppercase' }}>
                            Détection d&apos;écart
                          </span>
                        </div>
                        <p style={{ margin: '0 0 0.75rem 0', fontSize: '0.75rem', color: 'rgba(255,255,255,0.68)', lineHeight: 1.5 }}>
                          Le total Débit ne correspond pas au total Crédit. Voici la ventilation par classe pour vous aider à localiser l&apos;origine :
                        </p>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', marginBottom: '0.75rem' }}>
                          {validation.stats.classDistribution.map(({ classe, debit, credit }) => {
                            const ecart = debit - credit;
                            const hasEcart = Math.abs(ecart) >= 1;
                            return (
                              <div
                                key={`ecart-${classe}`}
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '0.6rem',
                                  padding: '0.5rem 0.65rem',
                                  borderRadius: '8px',
                                  background: hasEcart ? 'rgba(248,113,113,0.08)' : 'rgba(7,14,40,0.5)',
                                  border: `1px solid ${hasEcart ? 'rgba(248,113,113,0.3)' : 'rgba(27,58,140,0.3)'}`,
                                }}
                              >
                                <div
                                  style={{
                                    width: '20px',
                                    height: '20px',
                                    borderRadius: '5px',
                                    background: hasEcart
                                      ? 'rgba(248,113,113,0.2)'
                                      : 'linear-gradient(135deg, rgba(27,58,140,0.6), rgba(46,91,184,0.4))',
                                    border: `1px solid ${hasEcart ? 'rgba(248,113,113,0.45)' : 'rgba(201,168,76,0.3)'}`,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: '10px',
                                    fontWeight: 800,
                                    color: hasEcart ? '#FCA5A5' : '#C9A84C',
                                    flexShrink: 0,
                                  }}
                                >
                                  {classe}
                                </div>
                                <div style={{ flex: 1, minWidth: 0, display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.4rem', fontSize: '0.7rem' }}>
                                  <div>
                                    <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Débit</div>
                                    <div style={{ color: '#fff', fontWeight: 600 }}>
                                      {debit.toLocaleString('fr-FR', { maximumFractionDigits: 0 })}
                                    </div>
                                  </div>
                                  <div>
                                    <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Crédit</div>
                                    <div style={{ color: '#fff', fontWeight: 600 }}>
                                      {credit.toLocaleString('fr-FR', { maximumFractionDigits: 0 })}
                                    </div>
                                  </div>
                                  <div>
                                    <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Écart</div>
                                    <div style={{ color: hasEcart ? '#FCA5A5' : '#6EE7B7', fontWeight: 700 }}>
                                      {hasEcart
                                        ? `${ecart > 0 ? '+' : ''}${ecart.toLocaleString('fr-FR', { maximumFractionDigits: 0 })}`
                                        : '0'}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>

                        {validation.stats.topContributors.length > 0 && (
                          <details style={{ marginTop: '0.5rem' }}>
                            <summary
                              style={{
                                cursor: 'pointer',
                                fontSize: '0.72rem',
                                fontWeight: 700,
                                color: '#FCD34D',
                                padding: '0.4rem 0.6rem',
                                borderRadius: '6px',
                                background: 'rgba(252,211,77,0.06)',
                                border: '1px solid rgba(252,211,77,0.2)',
                                userSelect: 'none',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.35rem',
                              }}
                            >
                              Top 5 comptes par montant (pistes à vérifier)
                            </summary>
                            <div style={{ marginTop: '0.55rem', display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                              {validation.stats.topContributors.map((c, idx) => (
                                <div
                                  key={`${c.code}-${idx}`}
                                  style={{
                                    padding: '0.45rem 0.6rem',
                                    borderRadius: '7px',
                                    background: 'rgba(7,14,40,0.6)',
                                    border: '1px solid rgba(27,58,140,0.4)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.5rem',
                                  }}
                                >
                                  <div
                                    style={{
                                      fontSize: '9px',
                                      fontWeight: 700,
                                      color: '#C9A84C',
                                      background: 'rgba(201,168,76,0.1)',
                                      padding: '1px 5px',
                                      borderRadius: '4px',
                                      border: '1px solid rgba(201,168,76,0.3)',
                                      flexShrink: 0,
                                    }}
                                  >
                                    C{c.classe}
                                  </div>
                                  <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#fff' }}>{c.code}</div>
                                    <div style={{ fontSize: '0.66rem', color: 'rgba(255,255,255,0.55)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                      {c.libelle}
                                    </div>
                                  </div>
                                  <div
                                    style={{
                                      fontSize: '0.72rem',
                                      fontWeight: 700,
                                      color: c.net >= 0 ? '#6EE7B7' : '#FCA5A5',
                                      flexShrink: 0,
                                    }}
                                  >
                                    {c.net >= 0 ? '+' : ''}
                                    {c.net.toLocaleString('fr-FR', { maximumFractionDigits: 0 })}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </details>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {!validating && validation && validation.severity === 'error' && validation.blocking && (
                  <div
                    style={{
                      padding: '1rem',
                      borderRadius: '10px',
                      background: 'linear-gradient(135deg, rgba(220,38,38,0.15) 0%, rgba(185,28,28,0.06) 100%)',
                      border: '1px solid rgba(248,113,113,0.4)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
                      <div
                        style={{
                          width: '32px',
                          height: '32px',
                          borderRadius: '8px',
                          background: 'rgba(248,113,113,0.15)',
                          border: '1px solid rgba(248,113,113,0.4)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                        }}
                      >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#F87171" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <circle cx="12" cy="12" r="10" />
                          <line x1="12" y1="8" x2="12" y2="12" />
                          <line x1="12" y1="16" x2="12.01" y2="16" />
                        </svg>
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ margin: '0 0 0.35rem 0', fontSize: '0.9rem', fontWeight: 700, color: '#FCA5A5' }}>
                          Fichier invalide
                        </p>
                        <ul style={{ margin: 0, padding: '0 0 0 1rem', fontSize: '0.8rem', color: 'rgba(255,255,255,0.78)', lineHeight: 1.55 }}>
                          {validation.errors.map((err, i) => (
                            <li key={i}>{err}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
            <div style={{ marginBottom: '1.25rem' }}>
              <label style={{ display: 'block', marginBottom: '0.6rem', fontSize: '0.78rem', fontWeight: 700, color: '#C9A84C', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                Date de clôture
              </label>
              <div style={{ position: 'relative' }}>
                <div
                  style={{
                    position: 'absolute',
                    left: '0.9rem',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    pointerEvents: 'none',
                    color: '#C9A84C',
                  }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                    <line x1="16" y1="2" x2="16" y2="6" />
                    <line x1="8" y1="2" x2="8" y2="6" />
                    <line x1="3" y1="10" x2="21" y2="10" />
                  </svg>
                </div>
                <input
                  type="date"
                  value={importDate}
                  onChange={(e) => setImportDate(e.target.value)}
                  disabled={importing}
                  style={{
                    width: '100%',
                    padding: '0.85rem 0.9rem 0.85rem 2.4rem',
                    borderRadius: '12px',
                    border: '1px solid rgba(27,58,140,0.5)',
                    background: 'rgba(11,16,38,0.7)',
                    color: '#fff',
                    fontSize: '0.88rem',
                    fontWeight: 500,
                    outline: 'none',
                    colorScheme: 'dark',
                    transition: 'all 0.2s',
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = 'rgba(201,168,76,0.6)';
                    e.currentTarget.style.boxShadow = '0 0 0 3px rgba(201,168,76,0.1)';
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = 'rgba(27,58,140,0.5)';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                />
              </div>
            </div>
            {importing && (
              <div style={{ marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.8rem', color: '#CBD5E1' }}>
                  <span>{importStatus || 'Import en cours…'}</span>
                  <span style={{ fontWeight: 700, color: '#C9A84C' }}>{Math.round(importProgress)}%</span>
                </div>
                <div style={{ width: '100%', height: '8px', background: '#0B1026', borderRadius: '999px', overflow: 'hidden', border: '1px solid #1B3A8C60' }}>
                  <div
                    style={{
                      width: `${importProgress}%`,
                      height: '100%',
                      background: 'linear-gradient(90deg, #1B3A8C 0%, #2e5bb8 50%, #C9A84C 100%)',
                      borderRadius: '999px',
                      transition: 'width 0.25s ease-out',
                      boxShadow: '0 0 12px rgba(201,168,76,0.5)',
                    }}
                  />
                </div>
              </div>
            )}
            </div>

            <div
              style={{
                padding: '1rem 1.75rem 1.5rem',
                borderTop: '1px solid rgba(27,58,140,0.3)',
                background: 'rgba(7,14,40,0.85)',
                display: 'flex',
                gap: '0.75rem',
                justifyContent: 'flex-end',
                position: 'relative',
                flexShrink: 0,
                backdropFilter: 'blur(4px)',
              }}
            >
              <button
                onClick={() => {
                  setShowImportModal(false);
                  setValidation(null);
                  setImportFile(null);
                }}
                disabled={importing}
                style={{
                  padding: '0.75rem 1.4rem',
                  background: 'rgba(255,255,255,0.05)',
                  color: 'rgba(255,255,255,0.75)',
                  border: '1px solid rgba(255,255,255,0.15)',
                  borderRadius: '12px',
                  cursor: importing ? 'not-allowed' : 'pointer',
                  fontWeight: 600,
                  fontSize: '0.85rem',
                  transition: 'all 0.2s',
                  opacity: importing ? 0.5 : 1,
                }}
                onMouseEnter={(e) => !importing && (e.currentTarget.style.background = 'rgba(255,255,255,0.1)')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.05)')}
              >
                Annuler
              </button>
              <button
                onClick={handleImport}
                disabled={importing || !importFile || validating || validation?.blocking === true}
                style={{
                  padding: '0.75rem 1.6rem',
                  background:
                    importing || !importFile || validating || validation?.blocking === true
                      ? 'rgba(107,114,128,0.4)'
                      : 'linear-gradient(135deg, #1B3A8C 0%, #2e5bb8 50%, #C9A84C 100%)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '12px',
                  cursor:
                    importing || !importFile || validating || validation?.blocking === true
                      ? 'not-allowed'
                      : 'pointer',
                  fontWeight: 700,
                  fontSize: '0.85rem',
                  transition: 'all 0.25s',
                  opacity:
                    importing || !importFile || validating || validation?.blocking === true ? 0.55 : 1,
                  boxShadow:
                    importing || !importFile || validating || validation?.blocking === true
                      ? 'none'
                      : '0 6px 20px rgba(27,58,140,0.4), 0 0 0 1px rgba(201,168,76,0.3)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                }}
              >
                {importing ? (
                  <>
                    <div
                      style={{
                        width: '14px',
                        height: '14px',
                        border: '2px solid rgba(255,255,255,0.3)',
                        borderTopColor: '#fff',
                        borderRadius: '50%',
                        animation: 'spin 0.8s linear infinite',
                      }}
                    />
                    Import en cours…
                  </>
                ) : validating ? (
                  <>
                    <div
                      style={{
                        width: '14px',
                        height: '14px',
                        border: '2px solid rgba(255,255,255,0.3)',
                        borderTopColor: '#fff',
                        borderRadius: '50%',
                        animation: 'spin 0.8s linear infinite',
                      }}
                    />
                    Analyse…
                  </>
                ) : (
                  <>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                      <polyline points="17 8 12 3 7 8" />
                      <line x1="12" y1="3" x2="12" y2="15" />
                    </svg>
                    Importer
                  </>
                )}
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
          onClick={() => {
            if (deleting) return;
            setShowDeleteModal(false);
            setConfirmingDelete(false);
          }}
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

            {deleteSuccess && (
              <div
                style={{
                  padding: '1.5rem',
                  borderRadius: '12px',
                  background: 'linear-gradient(135deg, rgba(5,150,105,0.18) 0%, rgba(4,120,87,0.08) 100%)',
                  border: '1px solid rgba(52,211,153,0.4)',
                  boxShadow: '0 0 28px rgba(5,150,105,0.2)',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '1rem',
                  animation: 'fadeInScale 0.35s ease-out',
                }}
              >
                <div
                  style={{
                    width: '44px',
                    height: '44px',
                    borderRadius: '12px',
                    background: 'rgba(52,211,153,0.18)',
                    border: '1px solid rgba(52,211,153,0.5)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#34D399" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ margin: '0 0 0.35rem 0', fontSize: '1rem', fontWeight: 700, color: '#6EE7B7', letterSpacing: '-0.01em' }}>
                    Suppression réussie
                  </p>
                  <p style={{ margin: 0, fontSize: '0.88rem', color: 'rgba(255,255,255,0.78)', lineHeight: 1.55 }}>
                    {deleteSuccess.all ? (
                      <>
                        <strong style={{ color: '#6EE7B7' }}>{deleteSuccess.count}</strong> compte(s) GL supprimé(s) pour
                        l&apos;ensemble de l&apos;organisation.
                      </>
                    ) : (
                      <>
                        <strong style={{ color: '#6EE7B7' }}>{deleteSuccess.count}</strong> compte(s) GL supprimé(s) avec
                        succès.
                      </>
                    )}
                  </p>
                </div>
              </div>
            )}

            {!deleteSuccess && (<>

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

            {confirmingDelete && !deleting && (
              <div
                style={{
                  marginBottom: '1.5rem',
                  padding: '1.25rem',
                  borderRadius: '12px',
                  background: 'linear-gradient(135deg, rgba(220,38,38,0.15) 0%, rgba(185,28,28,0.08) 100%)',
                  border: '1px solid rgba(248,113,113,0.4)',
                  boxShadow: '0 0 24px rgba(220,38,38,0.15)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.85rem' }}>
                  <div
                    style={{
                      width: '38px',
                      height: '38px',
                      borderRadius: '10px',
                      background: 'rgba(248,113,113,0.15)',
                      border: '1px solid rgba(248,113,113,0.4)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#F87171" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                      <line x1="12" y1="9" x2="12" y2="13" />
                      <line x1="12" y1="17" x2="12.01" y2="17" />
                    </svg>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ margin: '0 0 0.35rem 0', fontSize: '0.95rem', fontWeight: 700, color: '#FCA5A5', letterSpacing: '-0.01em' }}>
                      Action irréversible
                    </p>
                    <p style={{ margin: 0, fontSize: '0.85rem', color: 'rgba(255,255,255,0.75)', lineHeight: 1.55 }}>
                      {deleteAll ? (
                        <>
                          Vous êtes sur le point de supprimer <strong style={{ color: '#FCA5A5' }}>TOUS les comptes GL</strong> de
                          l&apos;organisation, toutes dates confondues. Cette action est définitive et ne peut pas être annulée.
                        </>
                      ) : (
                        <>
                          Vous êtes sur le point de supprimer tous les comptes GL importés pour la date{' '}
                          <strong style={{ color: '#FCA5A5' }}>
                            {new Date(selectedDeleteDate).toLocaleDateString('fr-FR', { year: 'numeric', month: 'long', day: 'numeric' })}
                          </strong>
                          . Cette action est définitive.
                        </>
                      )}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {deleting && (
              <div style={{ marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.8rem', color: '#CBD5E1' }}>
                  <span>{deleteStatus || 'Suppression en cours…'}</span>
                  <span style={{ fontWeight: 700, color: '#F87171' }}>{Math.round(deleteProgress)}%</span>
                </div>
                <div style={{ width: '100%', height: '8px', background: '#0B1026', borderRadius: '999px', overflow: 'hidden', border: '1px solid #DC262640' }}>
                  <div
                    style={{
                      width: `${deleteProgress}%`,
                      height: '100%',
                      background: 'linear-gradient(90deg, #e74c3c 0%, #c0392b 100%)',
                      borderRadius: '999px',
                      transition: 'width 0.25s ease-out',
                      boxShadow: '0 0 12px rgba(231,76,60,0.5)',
                    }}
                  />
                </div>
              </div>
            )}
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
              <button
                onClick={() => {
                  if (confirmingDelete) {
                    setConfirmingDelete(false);
                    return;
                  }
                  setShowDeleteModal(false);
                  setDeleteAll(false);
                  setSelectedDeleteDate('');
                  setConfirmingDelete(false);
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
                {confirmingDelete ? 'Retour' : 'Annuler'}
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
                {deleting
                  ? 'Suppression...'
                  : confirmingDelete
                    ? 'Confirmer la suppression'
                    : deleteAll
                      ? 'Tout supprimer'
                      : 'Supprimer'}
              </button>
            </div>
            </>)}
          </div>
        </div>
      )}

      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @keyframes fadeInScale {
          0% { opacity: 0; transform: scale(0.92); }
          100% { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  );
};

export default GLAccountsTab;

