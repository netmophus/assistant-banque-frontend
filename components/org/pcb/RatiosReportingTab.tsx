'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';

interface Ratio {
  id: string;
  code: string;
  libelle: string;
  description?: string;
  formule: string;
  type_rapport: string;
  categorie: string;
  seuil_min?: number | null;
  seuil_max?: number | null;
  unite: string;
  is_reglementaire: boolean;
  is_active: boolean;
  postes_requis?: string[];
  ordre_affichage?: number;
}

const CATEGORIE_OPTIONS: { key: string; label: string; accent: string }[] = [
  { key: 'all',                   label: 'Toutes',                accent: '#7C3AED' },
  { key: 'solvabilite',           label: 'Solvabilité',           accent: '#1B3A8C' },
  { key: 'division_risques',      label: 'Division risques',      accent: '#B91C1C' },
  { key: 'levier',                label: 'Levier',                accent: '#7C2D12' },
  { key: 'participations',        label: 'Participations',        accent: '#0F766E' },
  { key: 'immobilisations',       label: 'Immobilisations',       accent: '#6366F1' },
  { key: 'parties_liees',         label: 'Parties liées',         accent: '#A21CAF' },
  { key: 'liquidite',             label: 'Liquidité',             accent: '#0284C7' },
  { key: 'rentabilite',           label: 'Rentabilité',           accent: '#059669' },
  { key: 'efficacite',            label: 'Efficacité',            accent: '#D97706' },
  { key: 'qualite_portefeuille',  label: 'Qualité portefeuille',  accent: '#DC2626' },
];

const TYPE_RAPPORT_OPTIONS: { key: string; label: string }[] = [
  { key: 'all',                 label: 'Tous'                 },
  { key: 'bilan_reglementaire', label: 'Bilan réglementaire'  },
  { key: 'compte_resultat',     label: 'Compte de résultat'   },
  { key: 'les_deux',            label: 'Les deux'             },
];

const CATEGORIE_LABELS: Record<string, string> = {
  solvabilite: 'Solvabilité',
  division_risques: 'Division risques',
  levier: 'Levier',
  participations: 'Participations',
  immobilisations: 'Immobilisations',
  parties_liees: 'Parties liées',
  liquidite: 'Liquidité',
  rentabilite: 'Rentabilité',
  efficacite: 'Efficacité',
  qualite_portefeuille: 'Qualité portefeuille',
};

const TYPE_RAPPORT_LABELS: Record<string, string> = {
  bilan_reglementaire: 'Bilan rég.',
  compte_resultat: 'Compte résultat',
  les_deux: 'Les deux',
};

const getAuthHeaders = (): HeadersInit => {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  const headers: HeadersInit = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return headers;
};

const formatSeuil = (v: number | null | undefined, unite: string): string => {
  if (v === null || v === undefined || !Number.isFinite(v)) return '—';
  return `${v}${unite === '%' ? ' %' : unite ? ' ' + unite : ''}`;
};

const RatiosReportingTab = () => {
  const [selectedCategorie, setSelectedCategorie] = useState<string>('all');
  const [selectedTypeRapport, setSelectedTypeRapport] = useState<string>('all');
  const [loading, setLoading] = useState(false);
  const [ratios, setRatios] = useState<Ratio[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    const fetchRatios = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (selectedCategorie !== 'all') params.append('categorie', selectedCategorie);
        if (selectedTypeRapport !== 'all') params.append('type_rapport', selectedTypeRapport);
        const qs = params.toString();
        const url = `/api/pcb/ratios${qs ? '?' + qs : ''}`;
        const res = await fetch(url, { headers: getAuthHeaders() });
        if (!res.ok) throw new Error('Erreur');
        const data = (await res.json()) as Ratio[];
        const sorted = [...(data || [])].sort((a, b) => {
          const oa = Number.isFinite(a.ordre_affichage as number) ? (a.ordre_affichage as number) : 0;
          const ob = Number.isFinite(b.ordre_affichage as number) ? (b.ordre_affichage as number) : 0;
          if (oa !== ob) return oa - ob;
          return (a.code || '').localeCompare(b.code || '');
        });
        setRatios(sorted);
      } catch {
        setRatios([]);
      } finally {
        setLoading(false);
      }
    };
    fetchRatios();
  }, [selectedCategorie, selectedTypeRapport]);

  const selectedCategorieLabel = useMemo(
    () => CATEGORIE_OPTIONS.find((c) => c.key === selectedCategorie)?.label || 'Toutes',
    [selectedCategorie],
  );
  const selectedTypeRapportLabel = useMemo(
    () => TYPE_RAPPORT_OPTIONS.find((t) => t.key === selectedTypeRapport)?.label || 'Tous',
    [selectedTypeRapport],
  );

  const handleExportExcel = async () => {
    if (ratios.length === 0) return;
    const XLSX = await import('xlsx');
    const todayStr = new Date().toLocaleDateString('fr-FR');

    const aoa: (string | number)[][] = [
      ['Paramétrage des ratios bancaires'],
      [`Catégorie : ${selectedCategorieLabel}    —    Type : ${selectedTypeRapportLabel}    —    ${ratios.length} ratio${ratios.length > 1 ? 's' : ''}    —    ${todayStr}`],
      [],
      ['Code', 'Libellé', 'Catégorie', 'Type rapport', 'Formule', 'Seuil min', 'Seuil max', 'Unité', 'Régl.', 'Actif'],
      ...ratios.map((r) => [
        r.code,
        r.libelle,
        CATEGORIE_LABELS[r.categorie] || r.categorie,
        TYPE_RAPPORT_LABELS[r.type_rapport] || r.type_rapport,
        r.formule || '',
        r.seuil_min === null || r.seuil_min === undefined ? '' : r.seuil_min,
        r.seuil_max === null || r.seuil_max === undefined ? '' : r.seuil_max,
        r.unite || '',
        r.is_reglementaire ? 'Oui' : 'Non',
        r.is_active ? 'Oui' : 'Non',
      ]),
    ];

    const ws = XLSX.utils.aoa_to_sheet(aoa);

    ws['!cols'] = [
      { wch: 12 }, { wch: 45 }, { wch: 18 }, { wch: 18 },
      { wch: 50 }, { wch: 10 }, { wch: 10 }, { wch: 8 },
      { wch: 7 }, { wch: 7 },
    ];

    ws['!merges'] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: 9 } },
      { s: { r: 1, c: 0 }, e: { r: 1, c: 9 } },
    ];

    const headerRowIdx = 3;
    for (let c = 0; c < 10; c++) {
      const addr = XLSX.utils.encode_cell({ r: headerRowIdx, c });
      if (!ws[addr]) continue;
      ws[addr].s = {
        font: { bold: true, color: { rgb: 'FFFFFFFF' } },
        fill: { fgColor: { rgb: 'FF7C3AED' } },
        alignment: { horizontal: 'left', vertical: 'center', wrapText: true },
        border: {
          top: { style: 'thin', color: { rgb: 'FF888888' } },
          bottom: { style: 'thin', color: { rgb: 'FF888888' } },
          left: { style: 'thin', color: { rgb: 'FF888888' } },
          right: { style: 'thin', color: { rgb: 'FF888888' } },
        },
      };
    }

    const titleAddr = XLSX.utils.encode_cell({ r: 0, c: 0 });
    if (ws[titleAddr]) {
      ws[titleAddr].s = {
        font: { bold: true, sz: 14, color: { rgb: 'FF1B3A8C' } },
        alignment: { horizontal: 'left', vertical: 'center' },
      };
    }
    const subtitleAddr = XLSX.utils.encode_cell({ r: 1, c: 0 });
    if (ws[subtitleAddr]) {
      ws[subtitleAddr].s = {
        font: { italic: true, sz: 10, color: { rgb: 'FF555555' } },
        alignment: { horizontal: 'left', vertical: 'center' },
      };
    }

    (ws as any)['!pageSetup'] = {
      orientation: 'landscape',
      paperSize: 9,
      fitToWidth: 1,
      fitToHeight: 0,
      scale: 100,
    };
    (ws as any)['!printHeader'] = [headerRowIdx + 1, headerRowIdx + 1];
    ws['!margins'] = { left: 0.4, right: 0.4, top: 0.5, bottom: 0.5, header: 0.25, footer: 0.25 };
    (ws as any)['!sheetView'] = { showGridLines: false };

    const lastRow = aoa.length;
    const lastCol = 9;
    ws['!ref'] = `A1:${XLSX.utils.encode_cell({ r: lastRow - 1, c: lastCol })}`;
    (ws as any)['!autofilter'] = {
      ref: `A${headerRowIdx + 1}:${XLSX.utils.encode_col(lastCol)}${lastRow}`,
    };
    ws['!freeze'] = { xSplit: 0, ySplit: headerRowIdx + 1 } as any;

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Paramétrage ratios');

    const today = new Date().toISOString().slice(0, 10);
    const safeCat = selectedCategorieLabel.replace(/[^A-Za-z0-9_-]+/g, '_');
    XLSX.writeFile(wb, `parametrage_ratios_${safeCat}_${today}.xlsx`, {
      bookType: 'xlsx',
      cellStyles: true,
    });
  };

  const handlePrintPdf = () => {
    if (typeof window === 'undefined') return;
    const prevTitle = document.title;
    document.title = '';
    const restore = () => {
      document.title = prevTitle;
      window.removeEventListener('afterprint', restore);
    };
    window.addEventListener('afterprint', restore);
    window.print();
    setTimeout(() => { if (document.title === '') document.title = prevTitle; }, 2000);
  };

  return (
    <div className="space-y-4">

      {/* ── Header ── */}
      <div className="flex items-center gap-3 p-4 rounded-xl"
        style={{ background: '#0A1434', border: '1px solid rgba(124,58,237,0.25)' }}>
        <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ background: 'rgba(124,58,237,0.15)', border: '1px solid rgba(124,58,237,0.35)' }}>
          <svg className="w-5 h-5 text-[#7C3AED]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M9 17v-6h6v6m-3-9V5m-7 4h14a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2v-8a2 2 0 012-2z" />
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-black text-white">Reporting du paramétrage des ratios</h4>
          <p className="text-xs text-white/55 mt-0.5">
            Ratios, formules, seuils et unités associés.
          </p>
        </div>
      </div>

      {/* ── Filters ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="p-3 rounded-xl"
          style={{ background: '#0A1434', border: '1px solid rgba(27,58,140,0.3)' }}>
          <div className="text-[10px] font-bold text-white/50 uppercase tracking-wider mb-2">Catégorie</div>
          <div className="flex flex-wrap gap-2">
            {CATEGORIE_OPTIONS.map((opt) => {
              const active = selectedCategorie === opt.key;
              return (
                <button
                  key={opt.key}
                  type="button"
                  onClick={() => setSelectedCategorie(opt.key)}
                  className="px-3 py-1.5 rounded-lg text-xs font-bold transition-all"
                  style={active
                    ? { background: opt.accent, color: '#ffffff', boxShadow: `0 2px 10px ${opt.accent}50` }
                    : { background: 'transparent', color: 'rgba(255,255,255,0.6)', border: `1px solid ${opt.accent}40` }}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="p-3 rounded-xl"
          style={{ background: '#0A1434', border: '1px solid rgba(27,58,140,0.3)' }}>
          <div className="text-[10px] font-bold text-white/50 uppercase tracking-wider mb-2">Type de rapport</div>
          <div className="flex flex-wrap gap-2">
            {TYPE_RAPPORT_OPTIONS.map((opt) => {
              const active = selectedTypeRapport === opt.key;
              return (
                <button
                  key={opt.key}
                  type="button"
                  onClick={() => setSelectedTypeRapport(opt.key)}
                  className="px-3 py-1.5 rounded-lg text-xs font-bold transition-all"
                  style={active
                    ? { background: '#1B3A8C', color: '#ffffff', boxShadow: '0 2px 10px rgba(27,58,140,0.5)' }
                    : { background: 'transparent', color: 'rgba(255,255,255,0.6)', border: '1px solid rgba(27,58,140,0.4)' }}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Preview table ── */}
      <div className="rounded-xl overflow-hidden"
        style={{ background: '#070E28', border: '1px solid rgba(124,58,237,0.25)' }}>
        <div className="px-4 py-3 flex items-center justify-between"
          style={{ borderBottom: '1px solid rgba(124,58,237,0.2)', background: 'rgba(124,58,237,0.05)' }}>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold text-white/55 uppercase tracking-wider">Aperçu</span>
            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full"
              style={{ background: 'rgba(124,58,237,0.15)', color: '#C4B5FD' }}>
              {ratios.length} ratio{ratios.length > 1 ? 's' : ''}
            </span>
          </div>
        </div>

        {loading ? (
          <div className="p-8 text-center text-white/50 text-sm">Chargement…</div>
        ) : ratios.length === 0 ? (
          <div className="p-8 text-center text-white/40 text-sm italic">Aucun ratio pour ce filtre.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ background: 'rgba(124,58,237,0.08)' }}>
                  <th className="px-3 py-2 text-left text-[10px] font-bold text-white/50 uppercase tracking-wider w-[110px]">Code</th>
                  <th className="px-3 py-2 text-left text-[10px] font-bold text-white/50 uppercase tracking-wider">Libellé</th>
                  <th className="px-3 py-2 text-left text-[10px] font-bold text-white/50 uppercase tracking-wider w-[140px]">Catégorie</th>
                  <th className="px-3 py-2 text-left text-[10px] font-bold text-white/50 uppercase tracking-wider w-[120px]">Type</th>
                  <th className="px-3 py-2 text-left text-[10px] font-bold text-white/50 uppercase tracking-wider">Formule</th>
                  <th className="px-3 py-2 text-left text-[10px] font-bold text-white/50 uppercase tracking-wider w-[90px]">Min</th>
                  <th className="px-3 py-2 text-left text-[10px] font-bold text-white/50 uppercase tracking-wider w-[90px]">Max</th>
                  <th className="px-3 py-2 text-center text-[10px] font-bold text-white/50 uppercase tracking-wider w-[60px]">Régl.</th>
                  <th className="px-3 py-2 text-center text-[10px] font-bold text-white/50 uppercase tracking-wider w-[60px]">Actif</th>
                </tr>
              </thead>
              <tbody>
                {ratios.map((r) => (
                  <tr key={r.id} style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}>
                    <td className="px-3 py-2 align-top">
                      <span className="font-mono text-[12px] font-bold text-[#C9A84C]">{r.code}</span>
                    </td>
                    <td className="px-3 py-2 align-top">
                      <span className="text-white/85">{r.libelle}</span>
                      {r.description && (
                        <div className="text-[10px] text-white/40 mt-0.5">{r.description}</div>
                      )}
                    </td>
                    <td className="px-3 py-2 align-top">
                      <span className="text-[10px] font-bold text-white/70">
                        {CATEGORIE_LABELS[r.categorie] || r.categorie}
                      </span>
                    </td>
                    <td className="px-3 py-2 align-top">
                      <span className="text-[10px] font-bold text-white/55">
                        {TYPE_RAPPORT_LABELS[r.type_rapport] || r.type_rapport}
                      </span>
                    </td>
                    <td className="px-3 py-2 align-top">
                      <span className="inline-block px-2 py-1 rounded-md text-[11px] font-mono"
                        style={{ background: 'rgba(124,58,237,0.12)', color: '#C4B5FD', border: '1px solid rgba(124,58,237,0.3)' }}>
                        {r.formule || '—'}
                      </span>
                    </td>
                    <td className="px-3 py-2 align-top text-[11px] font-mono text-white/75">
                      {formatSeuil(r.seuil_min as any, r.unite)}
                    </td>
                    <td className="px-3 py-2 align-top text-[11px] font-mono text-white/75">
                      {formatSeuil(r.seuil_max as any, r.unite)}
                    </td>
                    <td className="px-3 py-2 align-top text-center">
                      {r.is_reglementaire ? (
                        <span className="inline-block px-2 py-0.5 rounded-md text-[10px] font-bold"
                          style={{ background: 'rgba(27,58,140,0.2)', color: '#93C5FD' }}>Oui</span>
                      ) : (
                        <span className="text-white/30 text-[10px]">Non</span>
                      )}
                    </td>
                    <td className="px-3 py-2 align-top text-center">
                      {r.is_active ? (
                        <span className="inline-block px-2 py-0.5 rounded-md text-[10px] font-bold"
                          style={{ background: 'rgba(5,150,105,0.2)', color: '#6EE7B7' }}>Actif</span>
                      ) : (
                        <span className="inline-block px-2 py-0.5 rounded-md text-[10px] font-bold"
                          style={{ background: 'rgba(220,38,38,0.15)', color: '#FCA5A5' }}>Inactif</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Export buttons ── */}
      <div className="flex flex-wrap gap-2 justify-end no-print">
        <button
          type="button"
          onClick={handleExportExcel}
          disabled={ratios.length === 0 || loading}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          style={{ background: '#059669', color: '#ffffff', boxShadow: '0 4px 14px rgba(5,150,105,0.35)' }}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5 5-5M12 15V3" />
          </svg>
          Exporter Excel
        </button>
        <button
          type="button"
          onClick={handlePrintPdf}
          disabled={ratios.length === 0 || loading}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          style={{ background: '#7C3AED', color: '#ffffff', boxShadow: '0 4px 14px rgba(124,58,237,0.35)' }}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
          </svg>
          Imprimer / PDF
        </button>
      </div>

      {/* ── Print-only view (portal) ── */}
      {mounted && createPortal(
        <div data-print-root="true" className="print-only" style={{ display: 'none' }}>
          <div className="print-header">
            <h1>Paramétrage des ratios bancaires</h1>
            <div className="print-meta">
              <span><strong>Catégorie :</strong> {selectedCategorieLabel}</span>
              <span><strong>Type :</strong> {selectedTypeRapportLabel}</span>
              <span><strong>Nombre :</strong> {ratios.length}</span>
              <span><strong>Date :</strong> {new Date().toLocaleDateString('fr-FR')}</span>
            </div>
          </div>
          <table className="print-table">
            <colgroup>
              <col style={{ width: '8%' }} />
              <col style={{ width: '22%' }} />
              <col style={{ width: '10%' }} />
              <col style={{ width: '10%' }} />
              <col style={{ width: '28%' }} />
              <col style={{ width: '7%' }} />
              <col style={{ width: '7%' }} />
              <col style={{ width: '4%' }} />
              <col style={{ width: '4%' }} />
            </colgroup>
            <thead>
              <tr>
                <th>Code</th>
                <th>Libellé</th>
                <th>Catégorie</th>
                <th>Type</th>
                <th>Formule</th>
                <th>Min</th>
                <th>Max</th>
                <th>Régl.</th>
                <th>Actif</th>
              </tr>
            </thead>
            <tbody>
              {ratios.map((r) => (
                <tr key={r.id}>
                  <td className="cell-mono cell-bold">{r.code}</td>
                  <td>{r.libelle}</td>
                  <td>{CATEGORIE_LABELS[r.categorie] || r.categorie}</td>
                  <td>{TYPE_RAPPORT_LABELS[r.type_rapport] || r.type_rapport}</td>
                  <td className="cell-mono">{r.formule || '—'}</td>
                  <td className="cell-mono">{formatSeuil(r.seuil_min as any, r.unite)}</td>
                  <td className="cell-mono">{formatSeuil(r.seuil_max as any, r.unite)}</td>
                  <td className="cell-center">{r.is_reglementaire ? 'Oui' : 'Non'}</td>
                  <td className="cell-center">{r.is_active ? 'Oui' : 'Non'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>,
        document.body
      )}

    </div>
  );
};

export default RatiosReportingTab;
