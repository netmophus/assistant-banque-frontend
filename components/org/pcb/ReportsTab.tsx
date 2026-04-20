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
  const [generationStep, setGenerationStep] = useState(0);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [analysing, setAnalysing] = useState(false);
  const [analysisStep, setAnalysisStep] = useState(0);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [iframeKey, setIframeKey] = useState(0);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [pdfError, setPdfError] = useState<string | null>(null);
  // Import Excel
  const [showImportModal, setShowImportModal] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [importForm, setImportForm] = useState<{
    file: File | null;
    type: string;
    date_cloture: string;
    date_n1: string;
    date_realisation: string;
  }>({
    file: null,
    type: 'bilan_reglementaire',
    date_cloture: '',
    date_n1: '',
    date_realisation: '',
  });
  const [generateForm, setGenerateForm] = useState({
    type: 'bilan_reglementaire',
    section: '',
    date_cloture: '',
    date_realisation: '',
    date_debut: '',
    // IA désactivée par défaut à la génération : on produit d'abord le rapport,
    // l'utilisateur déclenche l'analyse IA ensuite depuis l'aperçu.
    include_ia: false,
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

  // Prépare le HTML pour l'ouverture dans un nouvel onglet imprimable.
  // Les graphiques sont en SVG/CSS inline → pas de dépendance JS, rendu instantané.
  const enrichHtmlForPrint = (rawHtml: string): string => {
    const toolbarHtml = `
<div id="miznas-print-toolbar" style="
  position: fixed; top: 0; left: 0; right: 0; z-index: 999999;
  background: linear-gradient(135deg, #0F4C75 0%, #3282B8 100%);
  color: white; padding: 14px 24px;
  display: flex; gap: 12px; align-items: center;
  box-shadow: 0 4px 16px rgba(0,0,0,0.2);
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  font-size: 13px;
">
  <span style="font-weight: 700; font-size: 14px; flex-shrink: 0;">📊 Analyse IA — Miznas Pilot</span>
  <span style="font-size: 11px; opacity: 0.85; flex: 1; line-height: 1.4;">
    Clique <strong>Imprimer</strong> → dans le dialog du navigateur, <strong>décoche « En-têtes et pieds de page »</strong> pour un PDF propre, puis choisis « Enregistrer en PDF »
  </span>
  <button onclick="window.print()" style="
    padding: 9px 18px; background: #DC2626; color: white;
    border: none; border-radius: 6px; cursor: pointer; font-weight: 600;
    font-size: 13px; flex-shrink: 0;
    box-shadow: 0 2px 8px rgba(220,38,38,0.4);
  ">
    🖨 Imprimer / PDF
  </button>
  <button onclick="window.close()" style="
    padding: 9px 18px; background: rgba(255,255,255,0.12);
    color: white; border: 1px solid rgba(255,255,255,0.3);
    border-radius: 6px; cursor: pointer; font-weight: 500; font-size: 13px; flex-shrink: 0;
  ">
    Fermer
  </button>
</div>
<style>
  body { padding-top: 70px !important; }

  @page {
    size: A4 portrait;
    margin: 14mm 12mm 14mm 12mm;
  }

  @media print {
    /* Masque la toolbar à l'impression */
    #miznas-print-toolbar { display: none !important; }

    /* Forcer les couleurs/fonds à s'imprimer (backgrounds, gradients, etc.) */
    * {
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
      color-adjust: exact !important;
    }

    html, body {
      padding-top: 0 !important;
      background: #fff !important;
      height: auto !important;
      overflow: visible !important;
    }

    /* Le conteneur principal ne doit pas avoir d'ombre ou de rayon à l'impression */
    .report {
      box-shadow: none !important;
      border-radius: 0 !important;
      max-width: 100% !important;
    }

    /* En-tête du rapport : toujours sur la 1ère page, pas de coupure */
    .header-main, .header-meta, .kpi-grid {
      page-break-inside: avoid !important;
      break-inside: avoid !important;
    }

    /* Sections principales : on évite les coupures au milieu d'un bloc */
    .section {
      page-break-inside: auto;
      break-inside: auto;
      padding: 20px 24px !important;
    }

    /* Cartes individuelles : ne pas les couper */
    .kpi-card,
    .chart-card,
    .diag-card,
    .verdict-banner {
      page-break-inside: avoid !important;
      break-inside: avoid !important;
    }

    /* Grilles 2x2 des axes de diagnostic : chaque carte sur une page ou regroupée */
    .diag-grid { page-break-inside: avoid; }

    /* Tableaux : header répété sur chaque page, lignes non coupées */
    table {
      page-break-inside: auto;
      break-inside: auto;
    }
    thead { display: table-header-group; }
    tr {
      page-break-inside: avoid !important;
      break-inside: avoid !important;
    }

    /* Titres : ne doivent jamais être seuls en bas de page, ni tronqués */
    .section-title, h1, h2, h3, h4, h5, h6 {
      page-break-after: avoid !important;
      break-after: avoid !important;
      page-break-inside: avoid !important;
      break-inside: avoid !important;
      /* Laisser 3 lignes minimum après un titre sur la page courante */
      orphans: 3;
      widows: 3;
    }

    /* "Keep with next" : l'élément qui suit immédiatement un titre
       ne peut pas commencer sur la page suivante tout seul.
       Évite que le titre reste en bas et le contenu aille sur la page d'après. */
    h1 + *, h2 + *, h3 + *, h4 + *, h5 + *, h6 + *,
    .section-title + * {
      page-break-before: avoid !important;
      break-before: avoid !important;
    }

    /* Paragraphes et listes : pas de veuves/orphelines */
    p, li, td { orphans: 3; widows: 3; }

    /* Section 7 (graphiques) : chaque graphique sur sa propre zone */
    .chart-card { margin-bottom: 12px !important; }

    /* Pas de doubles bordures aux points de pliure */
    .section + .section { border-top: none !important; }
  }
</style>
<script>
  // Vide le titre du document pour que le navigateur n'ajoute pas
  // "localhost:3000 | Rapport" comme en-tête d'impression.
  try { document.title = ''; } catch (e) {}
</script>`;

    return rawHtml.replace(
      /(<body[^>]*>)/i,
      (match) => match + toolbarHtml,
    );
  };

  const handleImportExcel = async () => {
    if (!importForm.file) {
      setImportError('Sélectionne un fichier .xlsx à importer.');
      return;
    }
    if (!importForm.date_cloture) {
      setImportError('La date de clôture est obligatoire.');
      return;
    }
    setImporting(true);
    setImportError(null);
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      const fd = new FormData();
      fd.append('file', importForm.file);
      fd.append('type_rapport', importForm.type);
      fd.append('date_cloture', importForm.date_cloture);
      if (importForm.date_n1) fd.append('date_n1', importForm.date_n1);
      if (importForm.date_realisation) fd.append('date_realisation', importForm.date_realisation);

      const res = await fetch('/api/pcb/reports/import', {
        method: 'POST',
        headers: token ? { 'Authorization': `Bearer ${token}` } : {},
        body: fd,
      });
      if (!res.ok) {
        let msg = `Erreur ${res.status}`;
        try {
          const data = await res.json();
          msg = data?.detail || data?.error || msg;
        } catch { /* ignore */ }
        throw new Error(msg);
      }
      const created = await res.json();
      setShowImportModal(false);
      setImportForm({ file: null, type: 'bilan_reglementaire', date_cloture: '', date_n1: '', date_realisation: '' });
      await fetchReports();
      setSelectedReport(created);
    } catch (e) {
      setImportError(e instanceof Error ? e.message : 'Erreur inconnue');
    } finally {
      setImporting(false);
    }
  };

  const downloadPdf = async () => {
    if (!selectedReport?.id) return;
    setPdfLoading(true);
    setPdfError(null);
    try {
      const res = await fetch(`/api/pcb/reports/${selectedReport.id}`, {
        method: 'GET',
        headers: getAuthHeaders(),
      });
      if (!res.ok) throw new Error(`Erreur ${res.status}`);
      const data = await res.json();
      let html = (data?.interpretation_ia || '').trim();
      if (!html) throw new Error('Aucune analyse IA disponible pour ce rapport.');

      html = enrichHtmlForPrint(html);

      const blob = new Blob([html], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const win = window.open(url, '_blank');
      if (!win) {
        throw new Error('Le navigateur a bloqué l\'ouverture de l\'onglet. Autorise les pop-ups pour ce site.');
      }
      setTimeout(() => URL.revokeObjectURL(url), 300000);
    } catch (e) {
      setPdfError(e instanceof Error ? e.message : 'Erreur ouverture analyse');
    } finally {
      setPdfLoading(false);
    }
  };

  const runAiAnalysis = async () => {
    if (!selectedReport?.id) return;
    setAnalysing(true);
    setAnalysisError(null);
    setAnalysisStep(0);

    const stepTimer = setInterval(() => {
      setAnalysisStep((s) => (s < 3 ? s + 1 : s));
    }, 10000);

    try {
      const res = await fetch(`/api/pcb/reports/${selectedReport.id}/analyser-ia`, {
        method: 'POST',
        headers: getAuthHeaders(),
      });
      if (!res.ok) {
        const txt = await res.text().catch(() => '');
        throw new Error(txt || `Erreur ${res.status}`);
      }
      const updated = await res.json();
      clearInterval(stepTimer);
      setAnalysisStep(4);
      setSelectedReport(updated);
      setIframeKey((k) => k + 1); // force reload de l'iframe
      await new Promise((r) => setTimeout(r, 600));
    } catch (e) {
      clearInterval(stepTimer);
      setAnalysisError(e instanceof Error ? e.message : 'Erreur inconnue');
    } finally {
      clearInterval(stepTimer);
      setAnalysing(false);
      setAnalysisStep(0);
    }
  };

  const handleGenerate = async () => {
    if (!generateForm.type || !generateForm.date_cloture) {
      alert('Veuillez remplir tous les champs obligatoires');
      return;
    }

    setGenerating(true);
    setGenerationStep(0);

    // Avance les étapes visuellement pendant l'appel (simulation pacée)
    const totalSteps = 4;
    const stepDuration = 3000;
    const stepTimer = setInterval(() => {
      setGenerationStep((s) => (s < totalSteps - 1 ? s + 1 : s));
    }, stepDuration);

    try {
      const params = new URLSearchParams({
        type_rapport: generateForm.type,
        date_cloture: generateForm.date_cloture,
      });
      if (generateForm.section) params.append('section', generateForm.section);
      if (generateForm.date_realisation) params.append('date_realisation', generateForm.date_realisation);
      if (generateForm.date_debut) params.append('date_debut', generateForm.date_debut);
      // Date N-1 saisie dans l'onglet Postes réglementaires (persistée en localStorage par exercice)
      if (typeof window !== 'undefined' && generateForm.date_cloture) {
        const exercice = String(new Date(generateForm.date_cloture).getFullYear());
        const n1Date = localStorage.getItem(`pcb_n1_reference_date_${exercice}`);
        if (n1Date) params.append('date_n1', n1Date);
      }
      // Transmet explicitement include_ia=false pour sauter complètement l'analyse IA côté backend
      params.append('include_ia', generateForm.include_ia ? 'true' : 'false');

      const response = await fetch(`/api/pcb/reports/generate?${params.toString()}`, {
        method: 'POST',
        headers: getAuthHeaders(),
      });

      if (!response.ok) throw new Error('Erreur');
      const data = await response.json();

      // Finalise la progression
      clearInterval(stepTimer);
      setGenerationStep(totalSteps);

      // Petit délai pour que l'utilisateur voie l'état "terminé"
      await new Promise((r) => setTimeout(r, 500));

      setShowGenerateModal(false);
      fetchReports();
      setSelectedReport(data);
    } catch (err) {
      clearInterval(stepTimer);
      alert('Erreur: ' + (err instanceof Error ? err.message : 'Erreur inconnue'));
    } finally {
      clearInterval(stepTimer);
      setGenerating(false);
      setGenerationStep(0);
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
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button
            onClick={() => setShowImportModal(true)}
            style={{
              padding: '0.75rem 1.25rem',
              background: 'rgba(5, 150, 105, 0.15)',
              color: '#6EE7B7',
              border: '1px solid rgba(5, 150, 105, 0.4)',
              borderRadius: '12px',
              cursor: 'pointer',
              fontWeight: '600',
              fontSize: '0.9rem',
            }}
          >
            📤 Importer un bilan (Excel)
          </button>
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

      {/* Overlay de progression pendant la génération */}
      {generating && (() => {
        const steps = [
          { label: 'Chargement de la configuration PCB', detail: 'Postes réglementaires, mapping GL, ratios configurés' },
          { label: 'Calcul de la structure comptable', detail: 'Agrégation des soldes par poste à la date de clôture' },
          { label: 'Calcul des ratios bancaires', detail: 'Application des formules et vérification des seuils BCEAO' },
          { label: 'Finalisation du rapport', detail: 'Enregistrement en base et préparation de l\'aperçu' },
        ];

        return (
          <div
            style={{
              position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
              background: 'rgba(7, 14, 40, 0.85)',
              backdropFilter: 'blur(4px)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              zIndex: 2000, padding: '1rem',
            }}
          >
            <div
              style={{
                background: 'linear-gradient(135deg, #0A1434 0%, #0F1E48 100%)',
                borderRadius: '16px',
                border: '1px solid rgba(201,168,76,0.35)',
                boxShadow: '0 20px 60px rgba(0,0,0,0.5), 0 0 40px rgba(27,58,140,0.3)',
                maxWidth: '560px', width: '100%',
                padding: '2rem',
              }}
            >
              {/* En-tête avec spinner */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.25rem' }}>
                <div style={{ position: 'relative', width: 48, height: 48, flexShrink: 0 }}>
                  <div style={{
                    position: 'absolute', inset: 0,
                    border: '3px solid rgba(201,168,76,0.2)', borderRadius: '50%',
                  }} />
                  <div style={{
                    position: 'absolute', inset: 0,
                    border: '3px solid transparent',
                    borderTopColor: '#C9A84C',
                    borderRightColor: '#C9A84C',
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite',
                  }} />
                </div>
                <div>
                  <h3 style={{ color: '#fff', fontSize: '1.1rem', fontWeight: 800, margin: 0 }}>
                    Génération du rapport en cours…
                  </h3>
                  <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: '0.8rem', margin: '0.25rem 0 0 0' }}>
                    Durée estimée : 10 à 20 secondes
                  </p>
                </div>
              </div>

              {/* Liste des étapes */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.25rem' }}>
                {steps.map((step, idx) => {
                  const isDone = idx < generationStep;
                  const isCurrent = idx === generationStep;
                  const isPending = idx > generationStep;

                  return (
                    <div
                      key={idx}
                      style={{
                        display: 'flex', alignItems: 'flex-start', gap: '0.75rem',
                        padding: '0.75rem',
                        borderRadius: '10px',
                        background: isCurrent
                          ? 'rgba(201,168,76,0.1)'
                          : isDone
                            ? 'rgba(5,150,105,0.08)'
                            : 'rgba(255,255,255,0.03)',
                        border: `1px solid ${isCurrent ? 'rgba(201,168,76,0.4)' : isDone ? 'rgba(5,150,105,0.25)' : 'rgba(255,255,255,0.06)'}`,
                        transition: 'all 0.3s ease',
                      }}
                    >
                      {/* Icône */}
                      <div style={{
                        width: 22, height: 22, borderRadius: '50%', flexShrink: 0,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        background: isDone ? '#059669' : isCurrent ? '#C9A84C' : 'rgba(255,255,255,0.08)',
                        color: '#fff',
                        fontSize: '0.7rem', fontWeight: 900,
                        marginTop: '0.1rem',
                      }}>
                        {isDone ? '✓' : isCurrent ? (
                          <div style={{
                            width: 8, height: 8, borderRadius: '50%',
                            background: '#fff',
                            animation: 'pulse 1s ease-in-out infinite',
                          }} />
                        ) : idx + 1}
                      </div>

                      {/* Texte */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{
                          color: isPending ? 'rgba(255,255,255,0.35)' : '#fff',
                          fontSize: '0.875rem', fontWeight: isCurrent ? 700 : 600,
                        }}>
                          {step.label}
                          {isCurrent && <span style={{ color: '#C9A84C', marginLeft: '0.5rem' }}>…</span>}
                        </div>
                        <div style={{
                          color: isPending ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.5)',
                          fontSize: '0.75rem', marginTop: '0.125rem',
                        }}>
                          {step.detail}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Message rassurant */}
              <div style={{
                padding: '0.75rem 1rem',
                background: 'rgba(27,58,140,0.15)',
                border: '1px solid rgba(27,58,140,0.3)',
                borderRadius: '8px',
                color: 'rgba(255,255,255,0.75)',
                fontSize: '0.8rem',
                display: 'flex', alignItems: 'center', gap: '0.5rem',
              }}>
                <svg style={{ width: 18, height: 18, flexShrink: 0, color: '#93C5FD' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>Ne fermez pas cette fenêtre. Le traitement se poursuit côté serveur.</span>
              </div>

              <style jsx>{`
                @keyframes spin { to { transform: rotate(360deg); } }
                @keyframes pulse {
                  0%, 100% { opacity: 1; transform: scale(1); }
                  50% { opacity: 0.5; transform: scale(0.85); }
                }
              `}</style>
            </div>
          </div>
        );
      })()}

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
            alignItems: 'flex-start',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '2rem 1rem',
            overflowY: 'auto',
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
              maxHeight: 'calc(100vh - 4rem)',
              overflowY: 'auto',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)',
              border: '1px solid #3B82F6',
              marginTop: 'auto',
              marginBottom: 'auto',
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

            <div style={{
              marginBottom: '1.5rem',
              padding: '0.75rem 1rem',
              background: 'rgba(59,130,246,0.08)',
              border: '1px solid rgba(59,130,246,0.25)',
              borderRadius: '8px',
              fontSize: '0.8rem',
              color: 'rgba(203,213,225,0.85)',
              display: 'flex',
              gap: '0.5rem',
              alignItems: 'flex-start',
            }}>
              <svg style={{ width: 18, height: 18, flexShrink: 0, color: '#93C5FD', marginTop: 2 }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>
                L&apos;analyse IA sera déclenchée séparément depuis l&apos;aperçu du rapport, via un bouton dédié.
                Cette étape génère uniquement les états financiers.
              </span>
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
                key={iframeKey}
                src={`/m3/pcb/reports/${selectedReport.id}/print?embed=1`}
                style={{ width: '100%', height: '70vh', border: 'none', background: '#fff' }}
              />
            </div>
            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
              <button
                onClick={() => {
                  if (!selectedReport?.id) return;
                  window.open(`/m3/pcb/reports/${selectedReport.id}/print`, '_blank');
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

              {(selectedReport.type === 'bilan_reglementaire' || selectedReport.type === 'compte_resultat') && (
                selectedReport.interpretation_ia ? (
                  <>
                    <button
                      onClick={downloadPdf}
                      disabled={pdfLoading}
                      style={{
                        padding: '0.75rem 1.5rem',
                        background: pdfLoading
                          ? '#6B7280'
                          : 'linear-gradient(135deg, #DC2626 0%, #EA580C 100%)',
                        color: '#ffffff',
                        border: 'none',
                        borderRadius: '8px',
                        cursor: pdfLoading ? 'not-allowed' : 'pointer',
                        fontWeight: '600',
                        boxShadow: '0 4px 14px rgba(220,38,38,0.3)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                      }}
                    >
                      {pdfLoading ? (
                        <>
                          <div style={{
                            width: 14, height: 14, border: '2px solid rgba(255,255,255,0.3)',
                            borderTopColor: '#fff', borderRadius: '50%',
                            animation: 'spinPDF 0.8s linear infinite',
                          }} />
                          Préparation…
                        </>
                      ) : (
                        <>
                          <svg width={16} height={16} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                              d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                          </svg>
                          📥 Télécharger l&apos;analyse IA (PDF)
                        </>
                      )}
                    </button>
                    <button
                      onClick={runAiAnalysis}
                      disabled={analysing}
                      title="Relance l'analyse IA (remplace l'analyse existante par une nouvelle avec le prompt le plus récent)"
                      style={{
                        padding: '0.75rem 1rem',
                        background: analysing ? '#6B7280' : 'rgba(255,255,255,0.08)',
                        color: '#ffffff',
                        border: '1px solid rgba(255,255,255,0.25)',
                        borderRadius: '8px',
                        cursor: analysing ? 'not-allowed' : 'pointer',
                        fontWeight: '500',
                        fontSize: '0.85rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                      }}
                    >
                      <svg width={14} height={14} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                          d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      {analysing ? 'Analyse…' : 'Re-analyser'}
                    </button>
                    <style jsx>{`
                      @keyframes spinPDF { to { transform: rotate(360deg); } }
                    `}</style>
                  </>
                ) : (
                  <button
                    onClick={runAiAnalysis}
                    disabled={analysing}
                    style={{
                      padding: '0.75rem 1.5rem',
                      background: analysing
                        ? '#6B7280'
                        : 'linear-gradient(135deg, #1B3A8C 0%, #7C3AED 100%)',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: '8px',
                      cursor: analysing ? 'not-allowed' : 'pointer',
                      fontWeight: '600',
                      boxShadow: '0 4px 14px rgba(27,58,140,0.3)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                    }}
                  >
                    <svg width={16} height={16} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                    </svg>
                    {analysing ? 'Analyse en cours…' : 'Analyser par l\'IA'}
                  </button>
                )
              )}

              <button
                onClick={() => setSelectedReport(null)}
                style={{
                  padding: '0.75rem 1.5rem',
                  background: '#1D4ED8',
                  color: '#E2E8F0',
                  border: '1px solid #3B82F6',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontWeight: '600',
                  marginLeft: 'auto',
                }}
              >
                Fermer
              </button>
            </div>

            {analysisError && (
              <div style={{
                marginTop: '1rem', padding: '12px 16px',
                background: '#FEE2E2', border: '1px solid #FCA5A5',
                borderRadius: '8px', color: '#991B1B', fontSize: '13px',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem',
              }}>
                <span>⚠ Erreur lors de l&apos;analyse IA : {analysisError}</span>
                <button onClick={() => setAnalysisError(null)} style={{
                  background: 'transparent', border: '1px solid #991B1B',
                  color: '#991B1B', padding: '4px 10px', borderRadius: '4px', cursor: 'pointer',
                }}>
                  Fermer
                </button>
              </div>
            )}

            {pdfError && (
              <div style={{
                marginTop: '1rem', padding: '12px 16px',
                background: '#FEE2E2', border: '1px solid #FCA5A5',
                borderRadius: '8px', color: '#991B1B', fontSize: '13px',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem',
              }}>
                <span>⚠ Erreur PDF : {pdfError}</span>
                <button onClick={() => setPdfError(null)} style={{
                  background: 'transparent', border: '1px solid #991B1B',
                  color: '#991B1B', padding: '4px 10px', borderRadius: '4px', cursor: 'pointer',
                }}>
                  Fermer
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal d'import Excel */}
      {showImportModal && (
        <div
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 1500, padding: '1rem',
          }}
          onClick={() => !importing && setShowImportModal(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: '#0B1026', border: '1px solid #3B82F6',
              borderRadius: '12px', maxWidth: 560, width: '100%', padding: '1.5rem',
            }}
          >
            <h3 style={{ color: '#fff', fontSize: '1.2rem', fontWeight: 800, marginBottom: '0.5rem' }}>
              📤 Importer un bilan Excel
            </h3>
            <p style={{ color: 'rgba(203,213,225,0.7)', fontSize: '0.8rem', marginBottom: '1.25rem' }}>
              Fichier .xlsx contenant une colonne avec les codes PCB (A100, P200, A1500, P1000…) et jusqu&apos;à 3 colonnes de valeurs (N-1, Référence, Clôture) en <strong>millions de FCFA</strong>.
            </p>

            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', color: '#CBD5E1' }}>
                Fichier Excel *
              </label>
              <input
                type="file"
                accept=".xlsx"
                onChange={(e) => setImportForm({ ...importForm, file: e.target.files?.[0] || null })}
                disabled={importing}
                style={{
                  width: '100%', padding: '0.5rem',
                  borderRadius: '8px', border: '1px solid #3B82F6',
                  background: '#1E3A8A', color: '#fff',
                }}
              />
              {importForm.file && (
                <div style={{ marginTop: '0.25rem', fontSize: '0.75rem', color: '#6EE7B7' }}>
                  ✓ {importForm.file.name} ({(importForm.file.size / 1024).toFixed(1)} Ko)
                </div>
              )}
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', color: '#CBD5E1' }}>
                Type de rapport
              </label>
              <select
                value={importForm.type}
                onChange={(e) => setImportForm({ ...importForm, type: e.target.value })}
                disabled={importing}
                style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #3B82F6', background: '#1E3A8A', color: '#fff' }}
              >
                <option value="bilan_reglementaire" style={{ background: '#1E3A8A' }}>Bilan réglementaire</option>
                <option value="hors_bilan" style={{ background: '#1E3A8A' }}>Hors bilan</option>
                <option value="compte_resultat" style={{ background: '#1E3A8A' }}>Compte de résultat</option>
              </select>
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', color: '#CBD5E1' }}>
                Date de clôture *
              </label>
              <input
                type="date" required
                value={importForm.date_cloture}
                onChange={(e) => setImportForm({ ...importForm, date_cloture: e.target.value })}
                disabled={importing}
                style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #3B82F6', background: '#1E3A8A', color: '#fff', colorScheme: 'dark' }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1rem' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', color: '#CBD5E1', fontSize: '0.85rem' }}>
                  Date N-1 (référence)
                </label>
                <input
                  type="date"
                  value={importForm.date_n1}
                  onChange={(e) => setImportForm({ ...importForm, date_n1: e.target.value })}
                  disabled={importing}
                  style={{ width: '100%', padding: '0.6rem', borderRadius: '8px', border: '1px solid #3B82F6', background: '#1E3A8A', color: '#fff', colorScheme: 'dark' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', color: '#CBD5E1', fontSize: '0.85rem' }}>
                  Date Réalisation (intermédiaire)
                </label>
                <input
                  type="date"
                  value={importForm.date_realisation}
                  onChange={(e) => setImportForm({ ...importForm, date_realisation: e.target.value })}
                  disabled={importing}
                  style={{ width: '100%', padding: '0.6rem', borderRadius: '8px', border: '1px solid #3B82F6', background: '#1E3A8A', color: '#fff', colorScheme: 'dark' }}
                />
              </div>
            </div>

            {importError && (
              <div style={{
                padding: '0.75rem 1rem', marginBottom: '1rem',
                background: '#FEE2E2', border: '1px solid #FCA5A5',
                borderRadius: '8px', color: '#991B1B', fontSize: '0.85rem',
              }}>
                ⚠ {importError}
              </div>
            )}

            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setShowImportModal(false)}
                disabled={importing}
                style={{
                  padding: '0.75rem 1.25rem', background: '#1D4ED8',
                  color: '#E2E8F0', border: '1px solid #3B82F6',
                  borderRadius: '8px', cursor: importing ? 'not-allowed' : 'pointer',
                  fontWeight: '600', opacity: importing ? 0.6 : 1,
                }}
              >
                Annuler
              </button>
              <button
                onClick={handleImportExcel}
                disabled={importing || !importForm.file || !importForm.date_cloture}
                style={{
                  padding: '0.75rem 1.5rem',
                  background: importing ? '#6B7280' : 'linear-gradient(135deg, #059669 0%, #10B981 100%)',
                  color: '#fff', border: 'none', borderRadius: '8px',
                  cursor: (importing || !importForm.file || !importForm.date_cloture) ? 'not-allowed' : 'pointer',
                  fontWeight: '700',
                  opacity: (importing || !importForm.file || !importForm.date_cloture) ? 0.6 : 1,
                }}
              >
                {importing ? '⏳ Import en cours…' : '📤 Importer le bilan'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Overlay de progression de l'analyse IA */}
      {analysing && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(7,14,40,0.85)',
          backdropFilter: 'blur(4px)', zIndex: 3000,
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem',
        }}>
          <div style={{
            background: 'linear-gradient(135deg, #0A1434 0%, #0F1E48 100%)',
            borderRadius: '16px', border: '1px solid rgba(124,58,237,0.4)',
            boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
            maxWidth: 540, width: '100%', padding: '2rem', color: '#fff',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.25rem' }}>
              <div style={{ position: 'relative', width: 48, height: 48 }}>
                <div style={{ position: 'absolute', inset: 0, border: '3px solid rgba(124,58,237,0.2)', borderRadius: '50%' }} />
                <div style={{
                  position: 'absolute', inset: 0,
                  border: '3px solid transparent',
                  borderTopColor: '#C4B5FD', borderRightColor: '#C4B5FD',
                  borderRadius: '50%',
                  animation: 'spinAI 1s linear infinite',
                }} />
              </div>
              <div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 800, margin: 0 }}>Analyse IA en cours…</h3>
                <p style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.55)', margin: '4px 0 0 0' }}>
                  Miznas AI analyse ton bilan selon la méthode Miznas Pilot (30 à 60 s)
                </p>
              </div>
            </div>

            {[
              { label: 'Préparation du contexte (postes du bilan)', detail: 'Sélection des postes avec valeurs, dates de référence' },
              { label: 'Envoi à Miznas AI (analyse PCB UEMOA)', detail: 'Contrôle qualité, mode de comparaison, 12 indicateurs' },
              { label: 'Génération du rapport HTML structuré', detail: 'Tableaux, graphiques Chart.js, diagnostic en 4 axes' },
              { label: 'Enregistrement et finalisation', detail: 'Stockage de l\'analyse dans le rapport' },
            ].map((step, idx) => {
              const isDone = idx < analysisStep;
              const isCurrent = idx === analysisStep;
              return (
                <div key={idx} style={{
                  display: 'flex', alignItems: 'flex-start', gap: '0.75rem',
                  padding: '0.75rem', borderRadius: '10px', marginBottom: '0.5rem',
                  background: isCurrent ? 'rgba(124,58,237,0.15)' : isDone ? 'rgba(5,150,105,0.08)' : 'rgba(255,255,255,0.03)',
                  border: `1px solid ${isCurrent ? 'rgba(124,58,237,0.4)' : isDone ? 'rgba(5,150,105,0.25)' : 'rgba(255,255,255,0.06)'}`,
                  transition: 'all 0.3s ease',
                }}>
                  <div style={{
                    width: 22, height: 22, borderRadius: '50%', flexShrink: 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: isDone ? '#059669' : isCurrent ? '#7C3AED' : 'rgba(255,255,255,0.08)',
                    color: '#fff', fontSize: '0.7rem', fontWeight: 900, marginTop: 2,
                  }}>
                    {isDone ? '✓' : isCurrent ? (
                      <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#fff', animation: 'pulseAI 1s ease-in-out infinite' }} />
                    ) : idx + 1}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '0.875rem', fontWeight: isCurrent ? 700 : 600, color: idx > analysisStep ? 'rgba(255,255,255,0.35)' : '#fff' }}>
                      {step.label}{isCurrent && <span style={{ color: '#C4B5FD', marginLeft: 6 }}>…</span>}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: idx > analysisStep ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.5)', marginTop: 2 }}>
                      {step.detail}
                    </div>
                  </div>
                </div>
              );
            })}

            <div style={{
              padding: '0.75rem 1rem', marginTop: '1rem',
              background: 'rgba(27,58,140,0.15)', border: '1px solid rgba(27,58,140,0.3)',
              borderRadius: '8px', fontSize: '0.8rem', color: 'rgba(255,255,255,0.75)',
            }}>
              Ne ferme pas cette fenêtre. L&apos;analyse se termine automatiquement.
            </div>

            <style jsx>{`
              @keyframes spinAI { to { transform: rotate(360deg); } }
              @keyframes pulseAI { 0%,100% { opacity: 1; transform: scale(1); } 50% { opacity: 0.5; transform: scale(0.85); } }
            `}</style>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReportsTab;
