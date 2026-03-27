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

export default function PrintReportPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const reportId = params?.id;
  const isEmbed = searchParams?.get('embed') === '1';

  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<Report | null>(null);
  const [error, setError] = useState<string | null>(null);

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

  const hasComparisonColumns = useMemo(() => {
    if (!rows || rows.length === 0) return false;
    return rows.some((r: any) => r?.n_1 !== undefined || r?.realisation_reference !== undefined || r?.taux_evaluation !== undefined);
  }, [rows]);

  const dateRealisationLabel = useMemo(() => {
    const d = report?.structure?.meta?.date_realisation || report?.date_realisation;
    if (!d) return '';
    return new Date(d).toLocaleDateString('fr-FR');
  }, [report]);

  const title = report ? `${getTypeLabel(report.type)}${report.section ? ` - ${getSectionLabel(report.type, report.section)}` : ''}` : 'Rapport';

  return (
    <div style={{ background: '#fff', color: '#111827', minHeight: '100vh' }}>
      <style>{`
        @page { margin: 12mm; }
        @media print {
          .no-print { display: none !important; }
          html, body { margin: 0 !important; padding: 0 !important; height: auto; }
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
        table { border-collapse: collapse; width: 100%; }
        thead { display: table-header-group; }
        tfoot { display: table-footer-group; }
        tr { break-inside: avoid; page-break-inside: avoid; }
        th, td { border: 1px solid #E5E7EB; padding: 8px; font-size: 12px; }
        th { background: #F3F4F6; text-align: left; }
      `}</style>

      {!isEmbed && (
        <div className="no-print" style={{ padding: '16px', borderBottom: '1px solid #E5E7EB', display: 'flex', gap: '12px', alignItems: 'center' }}>
          <button
            onClick={() => router.back()}
            style={{ padding: '10px 14px', borderRadius: '8px', border: '1px solid #D1D5DB', background: '#fff', cursor: 'pointer' }}
          >
            Retour
          </button>
          <button
            onClick={() => window.print()}
            style={{ padding: '10px 14px', borderRadius: '8px', border: '1px solid #111827', background: '#111827', color: '#fff', cursor: 'pointer' }}
          >
            Imprimer / Enregistrer en PDF
          </button>
          <div style={{ marginLeft: 'auto', fontSize: '12px', color: '#6B7280' }}>
            Astuce: Dans la fenêtre d’impression, choisis “Enregistrer en PDF”.
          </div>
        </div>
      )}

      <div style={{ padding: '24px 24px 48px 24px', maxWidth: '1100px', margin: '0 auto' }}>
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
            {report?.interpretation_ia ? (
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
                  <th style={{ width: '16%', textAlign: 'right' }}>N-1</th>
                  <th style={{ width: '16%', textAlign: 'right' }}>{`Réalisation ${dateRealisationLabel || ''}`}</th>
                  <th style={{ width: '16%', textAlign: 'right' }}>Clôture</th>
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
            ) : (
          <table>
            <thead>
              <tr>
                <th style={{ width: hasComparisonColumns ? '40%' : '70%' }}>Poste</th>
                {hasComparisonColumns ? (
                  <>
                    <th style={{ width: '15%', textAlign: 'right' }}>N-1</th>
                    <th style={{ width: '15%', textAlign: 'right' }}>{`Réalisation ${dateRealisationLabel || ''}`}</th>
                    <th style={{ width: '15%', textAlign: 'right' }}>Réalisation clôture</th>
                    <th style={{ width: '15%', textAlign: 'right' }}>Taux</th>
                  </>
                ) : (
                  <th style={{ width: '30%', textAlign: 'right' }}>Montant</th>
                )}
              </tr>
            </thead>
            <tbody>
              {rows.map((p: any, idx: number) => {
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
              })}
            </tbody>
          </table>
            )}

            {report?.structure?.totaux && (
              <div style={{ marginTop: '16px', borderTop: '1px solid #E5E7EB', paddingTop: '12px' }}>
                <div style={{ fontSize: '12px', color: '#374151', fontWeight: 700, marginBottom: '6px' }}>Totaux</div>
                <pre style={{ fontSize: '11px', background: '#F9FAFB', border: '1px solid #E5E7EB', padding: '12px', borderRadius: '8px', overflowX: 'auto' }}>
                  {JSON.stringify(report.structure.totaux, null, 2)}
                </pre>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
