'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';

type Report = {
  id: string;
  type: string;
  section?: string;
  date_cloture: string;
  date_realisation?: string;
  exercice?: string;
  ratios_bancaires?: Record<string, any>;
  interpretation_ia?: string;
  structure?: {
    postes?: any[];
    postes_hierarchiques?: any[];
    totaux?: Record<string, any>;
    meta?: {
      date_realisation?: string;
      date_cloture?: string;
    };
  };
};

function toNumber(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value === 'string') {
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  }

  // Mongo extended JSON (possible when reading stored reports)
  if (typeof value === 'object') {
    const v = value as any;
    const ext = v?.$numberDecimal ?? v?.$numberDouble ?? v?.$numberInt ?? v?.$numberLong;
    if (typeof ext === 'string') {
      const n = Number(ext);
      return Number.isFinite(n) ? n : null;
    }
    if (typeof ext === 'number') return Number.isFinite(ext) ? ext : null;
  }

  const n = Number(value as any);
  return Number.isFinite(n) ? n : null;
}

function formatNumber(value: unknown) {
  const n = toNumber(value);
  if (n === null) return '';
  return new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(n);
}

function formatNumber2(value: unknown) {
  const n = toNumber(value);
  if (n === null) return '';
  return new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);
}

function formatMillionsCeil(value: unknown) {
  const n = toNumber(value);
  if (n === null) return '';
  const scaled = Math.floor(n / 1_000_000);
  return new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(scaled);
}

function toMillionsCeilNumber(value: unknown): number | null {
  const n = toNumber(value);
  if (n === null) return null;
  return Math.floor(n / 1_000_000);
}

function getMontant(poste: any): unknown {
  // Priorité: solde_brut (signé) puis solde (compat), puis solde_affiche
  if (poste?.solde_brut !== undefined && poste?.solde_brut !== null) return poste.solde_brut;
  if (poste?.solde !== undefined && poste?.solde !== null) return poste.solde;
  if (poste?.solde_affiche !== undefined && poste?.solde_affiche !== null) return poste.solde_affiche;
  return 0;
}

function getSectionLabel(type: string, section?: string) {
  if (!section) return '';
  if (type === 'bilan_reglementaire') {
    return section === 'actif' ? 'Actif' : section === 'passif' ? 'Passif' : section;
  }
  if (type === 'compte_resultat') {
    return section === 'produits' ? 'Compte de résultat' : section === 'charges' ? "COMPTES D'EXPLOITATION BANCAIRES" : section;
  }
  return section;
}

function getTypeLabel(type: string) {
  if (type === 'bilan_reglementaire') return 'Bilan réglementaire';
  if (type === 'compte_resultat') return 'Compte de résultat';
  if (type === 'hors_bilan') return 'Hors bilan';
  if (type === 'ratios_gestion') return 'Ratios de gestion';
  if (type === 'ratios_bancaires') return 'Ratios bancaires';
  return type;
}

function flattenHierarchique(nodes: any[], level = 0): any[] {
  const rows: any[] = [];
  for (const n of nodes || []) {
    rows.push({ ...n, __level: level });
    const enfants = n?.enfants || [];
    rows.push(...flattenHierarchique(enfants, level + 1));
  }
  return rows;
}

function renderBilanSection(
  heading: string | null,
  accent: string,
  rowsList: any[],
  hasComparisonColumns: boolean,
  dateRealisationLabel: string,
  n1Label: string,
  dateClotureLabel: string,
) {
  return (
    <div className="bilan-section" style={{ marginBottom: 20 }}>
      {heading && (
        <div
          className="bilan-heading"
          style={{
            padding: '10px 14px',
            background: accent,
            color: '#ffffff',
            fontSize: 14,
            fontWeight: 800,
            letterSpacing: 1,
            borderTopLeftRadius: 6,
            borderTopRightRadius: 6,
            WebkitPrintColorAdjust: 'exact',
            printColorAdjust: 'exact',
          }}
        >
          {heading}
        </div>
      )}
      <table style={{ marginTop: 0, borderTop: heading ? `2px solid ${accent}` : undefined }}>
        <thead>
          <tr>
            <th style={{ width: hasComparisonColumns ? '40%' : '70%' }}>Poste</th>
            {hasComparisonColumns ? (
              <>
                <th style={{ width: '15%', textAlign: 'right' }}>{n1Label}</th>
                <th style={{ width: '15%', textAlign: 'right' }}>{`Réalisation ${dateRealisationLabel || ''}`}</th>
                <th style={{ width: '15%', textAlign: 'right' }}>{`Réalisation ${dateClotureLabel || 'clôture'}`}</th>
                <th style={{ width: '15%', textAlign: 'right' }}>Taux</th>
              </>
            ) : (
              <th style={{ width: '30%', textAlign: 'right' }}>Montant</th>
            )}
          </tr>
        </thead>
        <tbody>
          {rowsList.length === 0 ? (
            <tr>
              <td colSpan={hasComparisonColumns ? 5 : 2} style={{ color: '#6B7280' }}>
                Aucune donnée.
              </td>
            </tr>
          ) : (
            rowsList.map((p: any, idx: number) => {
              const level = Number(p?.__level || 0);
              const code = p?.code ? `${p.code} - ` : '';
              const libelle = p?.libelle || '';
              const amount = getMontant(p);
              const isParent = Array.isArray(p?.enfants) && p.enfants.length > 0;

              return (
                <tr key={`${p?.id || p?.code || idx}-${idx}`}>
                  <td>
                    <div style={{ paddingLeft: `${Math.max(0, level) * 14}px`, fontWeight: isParent ? 700 : 400 }}>
                      {code}{libelle}
                    </div>
                  </td>
                  {hasComparisonColumns ? (
                    <>
                      <td style={{ textAlign: 'right', fontWeight: isParent ? 700 : 400 }}>{formatNumber(p?.n_1)}</td>
                      <td style={{ textAlign: 'right', fontWeight: isParent ? 700 : 400 }}>{formatNumber(p?.realisation_reference)}</td>
                      <td style={{ textAlign: 'right', fontWeight: isParent ? 700 : 400 }}>{formatMillionsCeil(p?.realisation_cloture ?? amount)}</td>
                      <td style={{ textAlign: 'right', fontWeight: isParent ? 700 : 400 }}>
                        {(() => {
                          const n1 = toNumber(p?.n_1);
                          const clotureFinal = toMillionsCeilNumber(p?.realisation_cloture ?? amount);
                          if (n1 === null || n1 === 0 || clotureFinal === null) return '';
                          const taux = ((clotureFinal - n1) / n1) * 100;
                          return `${new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(taux)}%`;
                        })()}
                      </td>
                    </>
                  ) : (
                    <td style={{ textAlign: 'right', fontWeight: isParent ? 700 : 400 }}>{formatNumber(amount)}</td>
                  )}
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}

export default function PrintReportPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const reportId = params?.id;
  const isEmbed = searchParams?.get('embed') === '1';

  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<Report | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [analysing, setAnalysing] = useState(false);
  const [analysisStep, setAnalysisStep] = useState(0);
  const [analysisError, setAnalysisError] = useState<string | null>(null);

  // Vide le titre du document — le navigateur utilise ce titre dans l'en-tête
  // d'impression ("Miznas Pilot - localhost:3000"). Vide = en-tête vide.
  useEffect(() => {
    const prev = document.title;
    document.title = '';
    return () => { document.title = prev; };
  }, []);

  useEffect(() => {
    const load = async () => {
      if (!reportId) return;
      setLoading(true);
      setError(null);
      try {
        const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
        const headers: Record<string, string> = {};
        if (token) headers['Authorization'] = `Bearer ${token}`;

        const response = await fetch(`/api/pcb/reports/${reportId}`, { headers });
        if (!response.ok) throw new Error(`Erreur ${response.status}`);
        const data = await response.json();
        setReport(data);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Erreur');
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [reportId]);

  const runAiAnalysis = async () => {
    if (!reportId) return;
    setAnalysing(true);
    setAnalysisError(null);
    setAnalysisStep(0);

    const steps = [
      'Préparation du contexte (postes du bilan)',
      'Envoi à Miznas AI (analyse PCB UEMOA)',
      'Génération du rapport HTML structuré',
      'Enregistrement et finalisation',
    ];
    const stepTimer = setInterval(() => {
      setAnalysisStep((s) => (s < steps.length - 1 ? s + 1 : s));
    }, 10000);

    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch(`/api/pcb/reports/${reportId}/analyser-ia`, {
        method: 'POST',
        headers,
      });
      if (!res.ok) {
        const txt = await res.text().catch(() => '');
        throw new Error(txt || `Erreur ${res.status}`);
      }
      const updated = await res.json();
      clearInterval(stepTimer);
      setAnalysisStep(steps.length);
      setReport(updated);
      // Brève pause pour afficher l'état "terminé"
      await new Promise((r) => setTimeout(r, 600));
      // L'analyse est stockée. Le bouton se transforme en "Télécharger PDF".
      // L'utilisateur clique pour récupérer le PDF.
    } catch (e) {
      clearInterval(stepTimer);
      setAnalysisError(e instanceof Error ? e.message : 'Erreur inconnue');
    } finally {
      clearInterval(stepTimer);
      setAnalysing(false);
      setAnalysisStep(0);
    }
  };

  const ratiosGestionRows = useMemo(() => {
    const items = (report?.structure as any)?.ratios_gestion;
    return Array.isArray(items) ? items : [];
  }, [report]);

  const ratiosBancairesRows = useMemo(() => {
    const raw = (report as any)?.ratios_bancaires;
    const obj = raw && typeof raw === 'object' ? raw : {};
    return Object.entries(obj)
      .map(([code, v]) => ({ code, ...(v as any) }))
      .sort((a: any, b: any) => String(a?.code || '').localeCompare(String(b?.code || '')));
  }, [report]);

  const rows = useMemo(() => {
    const structure = report?.structure;
    const hier = structure?.postes_hierarchiques;
    if (Array.isArray(hier) && hier.length > 0) {
      return flattenHierarchique(hier);
    }

    const flat = structure?.postes;
    if (Array.isArray(flat) && flat.length > 0) {
      return flat.map((p: any) => ({ ...p, __level: Number(p?.niveau || 0) }));
    }

    return [];
  }, [report]);

  const isBilanGroupe = useMemo(() => {
    if (report?.type !== 'bilan_reglementaire') return false;
    if (report?.section) return false;
    if (!rows || rows.length === 0) return false;
    const types = new Set(rows.map((r: any) => r?.type).filter(Boolean));
    return types.has('bilan_actif') && types.has('bilan_passif');
  }, [report, rows]);

  const rowsPassif = useMemo(
    () => (isBilanGroupe ? rows.filter((r: any) => r?.type === 'bilan_passif') : []),
    [rows, isBilanGroupe],
  );
  const rowsActif = useMemo(
    () => (isBilanGroupe ? rows.filter((r: any) => r?.type === 'bilan_actif') : []),
    [rows, isBilanGroupe],
  );

  const hasComparisonColumns = useMemo(() => {
    if (!rows || rows.length === 0) return false;
    return rows.some((r: any) => r?.n_1 !== undefined || r?.realisation_reference !== undefined || r?.taux_evaluation !== undefined);
  }, [rows]);

  const dateRealisationLabel = useMemo(() => {
    const d = report?.structure?.meta?.date_realisation || report?.date_realisation;
    if (!d) return '';
    return new Date(d).toLocaleDateString('fr-FR');
  }, [report]);

  const dateClotureLabel = useMemo(() => {
    const d = report?.date_cloture;
    if (!d) return '';
    return new Date(d).toLocaleDateString('fr-FR');
  }, [report]);

  const n1Label = useMemo(() => {
    // 1) date N-1 stockée dans la méta du rapport (saisie à la génération)
    const metaN1 = (report?.structure?.meta as any)?.date_n1;
    if (metaN1) return new Date(metaN1).toLocaleDateString('fr-FR');
    // 2) fallback localStorage (même navigateur)
    if (typeof window !== 'undefined' && report?.exercice) {
      const stored = localStorage.getItem(`pcb_n1_reference_date_${report.exercice}`);
      if (stored) {
        const [y, m, d] = stored.split('-');
        if (y && m && d) return `${d}/${m}/${y}`;
      }
    }
    // 3) convention comptable : 31/12 de l'année précédente
    if (report?.exercice) {
      const y = parseInt(report.exercice, 10);
      if (Number.isFinite(y)) return `31/12/${y - 1}`;
    }
    return 'N-1';
  }, [report]);

  const title = report ? `${getTypeLabel(report.type)}${report.section ? ` - ${getSectionLabel(report.type, report.section)}` : ''}` : 'Rapport';

  // Indicateur : l'analyse IA HTML existe-t-elle pour ce rapport ?
  // (utilisé pour afficher / masquer les boutons IA — le HTML lui-même ne s'affiche jamais)
  const hasHtmlAnalysis = useMemo(() => {
    const raw = (report?.interpretation_ia || '').trim();
    if (!raw) return false;
    const head = raw.slice(0, 200).toLowerCase();
    return head.includes('<!doctype html') || head.startsWith('<html');
  }, [report]);

  // Ouvre l'analyse IA HTML dans un nouvel onglet avec une toolbar visible
  // (bouton Imprimer + Fermer). L'utilisateur clique Imprimer quand les
  // graphiques sont visibles, puis "Enregistrer en PDF" dans le dialog navigateur.
  const downloadAnalysisPdf = async () => {
    if (!reportId) return;
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    try {
      const r = await fetch(`/api/pcb/reports/${reportId}`, {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {},
      });
      if (!r.ok) {
        alert('Erreur ' + r.status);
        return;
      }
      const data = await r.json();
      let html = (data?.interpretation_ia || '').trim();
      if (!html) {
        alert('Aucune analyse IA disponible pour ce rapport.');
        return;
      }

      // Toolbar simple + CSS print robuste (graphiques en SVG/CSS)
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
    Clique <strong>Imprimer</strong> → <strong>décoche « En-têtes et pieds de page »</strong> → « Enregistrer en PDF »
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
  @page { size: A4 portrait; margin: 14mm 12mm; }
  @media print {
    #miznas-print-toolbar { display: none !important; }
    * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; color-adjust: exact !important; }
    html, body { padding-top: 0 !important; background: #fff !important; height: auto !important; overflow: visible !important; }
    .report { box-shadow: none !important; border-radius: 0 !important; max-width: 100% !important; }
    .header-main, .header-meta, .kpi-grid { page-break-inside: avoid !important; break-inside: avoid !important; }
    .section { page-break-inside: auto; break-inside: auto; padding: 20px 24px !important; }
    .kpi-card, .chart-card, .diag-card, .verdict-banner { page-break-inside: avoid !important; break-inside: avoid !important; }
    .diag-grid { page-break-inside: avoid; }
    table { page-break-inside: auto; break-inside: auto; }
    thead { display: table-header-group; }
    tr { page-break-inside: avoid !important; break-inside: avoid !important; }
    .section-title, h1, h2, h3, h4, h5, h6 { page-break-after: avoid !important; break-after: avoid !important; page-break-inside: avoid !important; break-inside: avoid !important; orphans: 3; widows: 3; }
    h1 + *, h2 + *, h3 + *, h4 + *, h5 + *, h6 + *, .section-title + * { page-break-before: avoid !important; break-before: avoid !important; }
    p, li, td { orphans: 3; widows: 3; }
    .chart-card { margin-bottom: 12px !important; }
    .section + .section { border-top: none !important; }
  }
</style>
<script>
  try { document.title = ''; } catch (e) {}
</script>`;
      html = html.replace(
        /(<body[^>]*>)/i,
        (match: string) => match + toolbarHtml,
      );

      const blob = new Blob([html], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const win = window.open(url, '_blank');
      if (!win) {
        alert('Le navigateur a bloqué l\'ouverture de l\'onglet. Autorise les pop-ups pour ce site.');
        return;
      }
      setTimeout(() => URL.revokeObjectURL(url), 300000);
    } catch (e) {
      alert('Erreur : ' + (e instanceof Error ? e.message : 'inconnue'));
    }
  };

  return (
    <div className="print-shell" style={{ background: '#fff', color: '#111827', minHeight: '100vh' }}>
      <style>{`
        table { border-collapse: collapse; width: 100%; }
        th, td { border: 1px solid #E5E7EB; padding: 8px; font-size: 12px; }
        th { background: #F3F4F6; text-align: left; }

        /* @page margin : appliqué à CHAQUE page imprimée (pas seulement la 1re).
           Les navigateurs (Firefox, Chrome) utilisent ces marges pour leurs
           en-têtes/pieds de page automatiques. Pour un PDF 100 % propre,
           décoche « En-têtes et pieds de page » dans le dialog d'impression
           (à faire une seule fois, le navigateur s'en souvient). */
        @page {
          size: A4 portrait;
          margin: 18mm 10mm;
        }

        @media print {
          *, *::before, *::after { box-sizing: border-box !important; }

          .no-print { display: none !important; }

          html, body {
            margin: 0 !important;
            padding: 0 !important;
            background: #fff !important;
            width: 100% !important;
            max-width: 100% !important;
          }

          .print-shell {
            min-height: 0 !important;
            height: auto !important;
            width: 100% !important;
          }

          .print-area {
            max-width: 100% !important;
            padding: 0 !important;
            margin: 0 !important;
            width: 100% !important;
          }

          .print-area > *:first-child {
            margin-top: 0 !important;
          }

          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          thead { display: table-header-group; }
          tr { page-break-inside: avoid; }
          h1, h2, h3 { page-break-after: avoid; }
          .bilan-section + .bilan-section { page-break-before: always; }
        }
      `}</style>

      {!isEmbed && (
        <div className="no-print" style={{ padding: '16px', borderBottom: '1px solid #E5E7EB', display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
          <button
            onClick={() => router.back()}
            style={{ padding: '10px 14px', borderRadius: '8px', border: '1px solid #D1D5DB', background: '#fff', cursor: 'pointer' }}
          >
            Retour
          </button>
          <button
            onClick={() => {
              // Vide le titre une dernière fois avant d'ouvrir le dialog d'impression
              try { document.title = ''; } catch (e) {}
              window.print();
            }}
            style={{ padding: '10px 14px', borderRadius: '8px', border: '1px solid #111827', background: '#111827', color: '#fff', cursor: 'pointer' }}
          >
            Imprimer / Enregistrer en PDF
          </button>
          {(report?.type === 'bilan_reglementaire' || report?.type === 'compte_resultat') && (
            hasHtmlAnalysis ? (
              <button
                onClick={downloadAnalysisPdf}
                style={{
                  padding: '10px 16px', borderRadius: '8px', border: 'none',
                  background: 'linear-gradient(135deg, #DC2626 0%, #EA580C 100%)',
                  color: '#fff', cursor: 'pointer', fontWeight: 600,
                  boxShadow: '0 4px 14px rgba(220,38,38,0.3)',
                  display: 'inline-flex', alignItems: 'center', gap: '6px',
                }}
              >
                <svg width={14} height={14} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                📥 Télécharger l&apos;analyse IA (PDF)
              </button>
            ) : (
              <button
                onClick={runAiAnalysis}
                disabled={analysing}
                style={{
                  padding: '10px 16px', borderRadius: '8px', border: 'none',
                  background: analysing ? '#9CA3AF' : 'linear-gradient(135deg, #1B3A8C 0%, #7C3AED 100%)',
                  color: '#fff', cursor: analysing ? 'not-allowed' : 'pointer', fontWeight: 600,
                  boxShadow: '0 4px 14px rgba(27,58,140,0.3)',
                  display: 'flex', alignItems: 'center', gap: '8px',
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
          <div style={{ marginLeft: 'auto', fontSize: '11px', color: '#6B7280', lineHeight: 1.4, maxWidth: '320px' }}>
            Dans le dialog d&apos;impression : <strong>décoche « En-têtes et pieds de page »</strong> et choisis <strong>« Enregistrer en PDF »</strong>.
          </div>
        </div>
      )}

      {/* Overlay de progression pendant l'analyse IA */}
      {analysing && (
        <div className="no-print" style={{
          position: 'fixed', inset: 0, background: 'rgba(7,14,40,0.85)',
          backdropFilter: 'blur(4px)', zIndex: 2000,
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
                  animation: 'spin 1s linear infinite',
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
                      <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#fff', animation: 'pulse 1s ease-in-out infinite' }} />
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
              @keyframes spin { to { transform: rotate(360deg); } }
              @keyframes pulse { 0%,100% { opacity: 1; transform: scale(1); } 50% { opacity: 0.5; transform: scale(0.85); } }
            `}</style>
          </div>
        </div>
      )}

      {/* Message d'erreur après tentative d'analyse IA */}
      {analysisError && !analysing && (
        <div className="no-print" style={{
          margin: '12px 16px', padding: '12px 16px',
          background: '#FEE2E2', border: '1px solid #FCA5A5',
          borderRadius: '8px', color: '#991B1B', fontSize: '13px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
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

      <div className="print-area" style={{ padding: '24px 24px 48px 24px', maxWidth: '1100px', margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '24px', alignItems: 'flex-start', marginBottom: '16px' }}>
          <div>
            <h1 style={{ fontSize: '20px', margin: 0 }}>{title}</h1>
            <div style={{ marginTop: '6px', color: '#6B7280', fontSize: '12px' }}>
              {report?.date_cloture ? `Date de clôture: ${new Date(report.date_cloture).toLocaleDateString('fr-FR')}` : ''}
              {report?.exercice ? ` • Exercice ${report.exercice}` : ''}
            </div>
          </div>
          <div style={{ textAlign: 'right', fontSize: '12px', color: '#6B7280' }}>
            Généré le {new Date().toLocaleDateString('fr-FR')}
          </div>
        </div>

        {loading ? (
          <div>Chargement...</div>
        ) : error ? (
          <div style={{ color: '#B91C1C' }}>{error}</div>
        ) : (
          <>
            {/* Bloc Analyse IA : n'affiche plus l'analyse dans le bilan.
                Si elle existe au format HTML, elle est accessible via le bouton "Télécharger PDF" en haut.
                Le rendu texte brut est conservé uniquement pour les anciens rapports
                qui n'ont pas de HTML (format legacy avant Miznas Pilot). */}
            {report?.interpretation_ia && !hasHtmlAnalysis ? (
              <div style={{ marginBottom: '16px', padding: '12px', border: '1px solid #E5E7EB', borderRadius: '8px', background: '#F9FAFB' }}>
                <div style={{ fontSize: '12px', color: '#111827', fontWeight: 700, marginBottom: '6px' }}>Analyse IA</div>
                <div style={{ whiteSpace: 'pre-wrap', fontSize: '12px', color: '#111827', lineHeight: 1.4 }}>{report.interpretation_ia}</div>
              </div>
            ) : null}

            {report?.type === 'ratios_gestion' ? (
          <div>
            <table>
              <thead>
                <tr>
                  <th style={{ width: '36%' }}>Ratio</th>
                  <th style={{ width: '16%', textAlign: 'right' }}>{n1Label}</th>
                  <th style={{ width: '16%', textAlign: 'right' }}>{`Réalisation ${dateRealisationLabel || ''}`}</th>
                  <th style={{ width: '16%', textAlign: 'right' }}>{dateClotureLabel || 'Clôture'}</th>
                  <th style={{ width: '16%', textAlign: 'right' }}>Évolution</th>
                </tr>
              </thead>
              <tbody>
                {ratiosGestionRows.length === 0 ? (
                  <tr>
                    <td colSpan={5}>Aucun ratio de gestion.</td>
                  </tr>
                ) : (
                  ratiosGestionRows.map((r: any) => {
                    const unite = typeof r?.unite === 'string' ? r.unite : '';
                    const n1Txt = `${formatNumber2(r?.n_1)}${unite ? ` ${unite}` : ''}`.trim();
                    const realTxt = `${formatNumber2(r?.realisation_reference)}${unite ? ` ${unite}` : ''}`.trim();
                    const clotTxt = `${formatNumber2(r?.realisation_cloture)}${unite ? ` ${unite}` : ''}`.trim();

                    const evo = r?.evolution_pct ?? r?.evolution;
                    const evoTxt = evo === null || evo === undefined ? '' : `${formatNumber2(evo)}${r?.evolution_pct !== null && r?.evolution_pct !== undefined ? ' %' : ''}`;
                    return (
                      <tr key={String(r?.code || r?.libelle || Math.random())}>
                        <td>
                          <div style={{ fontWeight: 700 }}>{r?.code || ''}</div>
                          <div>{r?.libelle || ''}</div>
                        </td>
                        <td style={{ textAlign: 'right' }}>{n1Txt}</td>
                        <td style={{ textAlign: 'right' }}>{realTxt}</td>
                        <td style={{ textAlign: 'right' }}>{clotTxt}</td>
                        <td style={{ textAlign: 'right' }}>{evoTxt}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
            ) : report?.type === 'ratios_bancaires' ? (
          <div>
            <table>
              <thead>
                <tr>
                  <th style={{ width: '40%' }}>Ratio</th>
                  <th style={{ width: '15%' }}>Catégorie</th>
                  <th style={{ width: '15%' }}>Type</th>
                  <th style={{ width: '15%', textAlign: 'right' }}>Valeur</th>
                  <th style={{ width: '15%' }}>Statut</th>
                </tr>
              </thead>
              <tbody>
                {ratiosBancairesRows.length === 0 ? (
                  <tr>
                    <td colSpan={5}>Aucun ratio bancaire.</td>
                  </tr>
                ) : (
                  ratiosBancairesRows.map((r: any) => {
                    const unite = typeof r?.unite === 'string' ? r.unite : '';
                    const vTxt = `${formatNumber2(r?.valeur)}${unite ? ` ${unite}` : ''}`.trim();
                    const cat = r?.categorie ? String(r.categorie) : '';
                    const typeTxt = r?.is_reglementaire ? 'Réglementaire' : 'Personnalisé';
                    const statutTxt = r?.statut ? String(r.statut) : '';
                    return (
                      <tr key={String(r?.code || Math.random())}>
                        <td>
                          <div style={{ fontWeight: 700 }}>{r?.code || ''}</div>
                          <div>{r?.libelle || ''}</div>
                        </td>
                        <td>{cat}</td>
                        <td>{typeTxt}</td>
                        <td style={{ textAlign: 'right' }}>{vTxt}</td>
                        <td>{statutTxt}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
            ) : rows.length === 0 ? (
          <div style={{ color: '#6B7280' }}>Aucune donnée à afficher.</div>
            ) : isBilanGroupe ? (
          <>
            {renderBilanSection('BILAN — PASSIF', '#7C3AED', rowsPassif, hasComparisonColumns, dateRealisationLabel, n1Label, dateClotureLabel)}
            {renderBilanSection('BILAN — ACTIF', '#1B3A8C', rowsActif, hasComparisonColumns, dateRealisationLabel, n1Label, dateClotureLabel)}
          </>
            ) : (
          renderBilanSection(null, '#111827', rows, hasComparisonColumns, dateRealisationLabel, n1Label, dateClotureLabel)
            )}

            {/* Le bloc "Totaux" JSON est supprimé : il était un vestige de debug
                et polluait le rendu PDF (données non explicatives + non cohérentes
                avec les totaux A1500/P1000 du bilan). */}
          </>
        )}
      </div>
    </div>
  );
}
