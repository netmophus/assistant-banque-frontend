'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';

interface GLCode {
  code: string;
  signe: '+' | '-';
}

interface Poste {
  id: string;
  code: string;
  libelle: string;
  type: string;
  niveau: number;
  parent_id?: string;
  parent_code?: string;
  contribution_signe?: '+' | '-';
  ordre: number;
  gl_codes: GLCode[];
  calculation_mode?: 'gl' | 'parents_formula';
  parents_formula?: { poste_id?: string; op: '+' | '-' | '*' | '/' | '(' | ')' }[];
  formule?: string;
  formule_custom?: string;
  is_active: boolean;
}

const TYPE_OPTIONS: { key: string; label: string; accent: string }[] = [
  { key: 'all',             label: 'Tous',                  accent: '#7C3AED' },
  { key: 'bilan_actif',     label: 'Bilan — Actif',         accent: '#1B3A8C' },
  { key: 'bilan_passif',    label: 'Bilan — Passif',        accent: '#7C3AED' },
  { key: 'hors_bilan',      label: 'Hors Bilan',            accent: '#059669' },
  { key: 'cr_produit',      label: 'Compte de résultat',    accent: '#D97706' },
  { key: 'cr_exploitation', label: 'Exploitation bancaire', accent: '#0284C7' },
  { key: 'cr_charge',       label: 'Ratio C. de Gestion',   accent: '#DC2626' },
];

const TYPE_LABELS: Record<string, string> = {
  bilan_actif: 'Bilan Actif',
  bilan_passif: 'Bilan Passif',
  hors_bilan: 'Hors Bilan',
  cr_produit: 'CR - Produit',
  cr_exploitation: 'CR - Exploitation',
  cr_charge: 'Ratio C. Gestion',
};

const getAuthHeaders = (): HeadersInit => {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  const headers: HeadersInit = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return headers;
};

function buildTree(list: Poste[]) {
  const map = new Map<string, Poste & { children: (Poste & { children: any[] })[] }>();
  const roots: (Poste & { children: any[] })[] = [];
  list.forEach((p) => map.set(p.id, { ...p, children: [] }));
  list.forEach((p) => {
    const node = map.get(p.id)!;
    if (p.parent_id && map.has(p.parent_id)) map.get(p.parent_id)!.children.push(node);
    else roots.push(node);
  });
  const sort = (nodes: (Poste & { children: any[] })[]) => {
    nodes.sort((a, b) => {
      const oa = Number.isFinite(a.ordre) ? a.ordre : 0;
      const ob = Number.isFinite(b.ordre) ? b.ordre : 0;
      if (oa !== ob) return oa - ob;
      return (a.code || '').localeCompare(b.code || '');
    });
    nodes.forEach((n) => n.children.length && sort(n.children));
  };
  sort(roots);
  return roots;
}

function flatten(nodes: (Poste & { children: any[] })[], level = 0): { poste: Poste; level: number }[] {
  const rows: { poste: Poste; level: number }[] = [];
  nodes.forEach((n) => {
    rows.push({ poste: n, level });
    if (n.children?.length) rows.push(...flatten(n.children, level + 1));
  });
  return rows;
}

function formatFormula(
  formula: { poste_id?: string; op: '+' | '-' | '*' | '/' | '(' | ')' }[],
  postesById: Map<string, Poste>,
): string {
  const parts: string[] = [];
  formula.forEach((term, idx) => {
    if (term.op === '(' || term.op === ')') {
      parts.push(term.op);
    } else if (term.poste_id) {
      const code = postesById.get(term.poste_id)?.code || '?';
      if (idx === 0 || formula[idx - 1]?.op === '(') {
        parts.push(term.op === '+' ? code : term.op + code);
      } else {
        parts.push(term.op);
        parts.push(code);
      }
    }
  });
  return parts.join(' ').replace(/\(\s+/g, '(').replace(/\s+\)/g, ')').replace(/\s+/g, ' ').trim();
}

const PostesReportingTab = () => {
  const [selectedType, setSelectedType] = useState<string>('all');
  const [loading, setLoading] = useState(false);
  const [postes, setPostes] = useState<Poste[]>([]);

  useEffect(() => {
    const fetchPostes = async () => {
      setLoading(true);
      try {
        const url = selectedType === 'all'
          ? '/api/pcb/postes'
          : `/api/pcb/postes?type=${encodeURIComponent(selectedType)}`;
        const res = await fetch(url, { headers: getAuthHeaders() });
        if (!res.ok) throw new Error('Erreur');
        const data = (await res.json()) as Poste[];
        const filtered = selectedType === 'all' ? data : data.filter((p) => p.type === selectedType);
        setPostes(filtered || []);
      } catch {
        setPostes([]);
      } finally {
        setLoading(false);
      }
    };
    fetchPostes();
  }, [selectedType]);

  const postesById = useMemo(() => {
    const m = new Map<string, Poste>();
    postes.forEach((p) => m.set(p.id, p));
    return m;
  }, [postes]);

  const tree = useMemo(() => buildTree(postes), [postes]);
  const rows = useMemo(() => flatten(tree), [tree]);

  const plainCellForPoste = (p: Poste): string => {
    if (p.calculation_mode === 'parents_formula' && p.parents_formula && p.parents_formula.length > 0) {
      const txt = formatFormula(p.parents_formula, postesById);
      return txt ? `ƒ ${txt}` : '';
    }
    if (p.gl_codes && p.gl_codes.length > 0) {
      return p.gl_codes.map((g) => `${g.signe}${g.code}`).join(' ');
    }
    return '';
  };

  const selectedLabel = TYPE_OPTIONS.find((t) => t.key === selectedType)?.label || 'Tous';

  const handleExportExcel = async () => {
    if (rows.length === 0) return;
    const XLSX = await import('xlsx');
    const todayStr = new Date().toLocaleDateString('fr-FR');

    const aoa: (string | number)[][] = [
      ['Paramétrage des postes réglementaires'],
      [`Filtre : ${selectedLabel}    —    ${rows.length} poste${rows.length > 1 ? 's' : ''}    —    ${todayStr}`],
      [],
      ['Code', 'Libellé', 'Niveau', 'Type', 'GL / Formule'],
      ...rows.map(({ poste, level }) => [
        poste.code,
        `${'    '.repeat(level)}${poste.libelle}`,
        level + 1,
        TYPE_LABELS[poste.type] || poste.type,
        plainCellForPoste(poste),
      ]),
    ];

    const ws = XLSX.utils.aoa_to_sheet(aoa);

    ws['!cols'] = [
      { wch: 14 },
      { wch: 60 },
      { wch: 8 },
      { wch: 22 },
      { wch: 55 },
    ];

    ws['!merges'] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: 4 } },
      { s: { r: 1, c: 0 }, e: { r: 1, c: 4 } },
    ];

    const headerRowIdx = 3;
    for (let c = 0; c < 5; c++) {
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
    ws['!margins'] = {
      left: 0.4,
      right: 0.4,
      top: 0.5,
      bottom: 0.5,
      header: 0.25,
      footer: 0.25,
    };
    (ws as any)['!sheetView'] = { showGridLines: false };

    const lastRow = aoa.length;
    const lastCol = 4;
    ws['!ref'] = `A1:${XLSX.utils.encode_cell({ r: lastRow - 1, c: lastCol })}`;
    (ws as any)['!autofilter'] = {
      ref: `A${headerRowIdx + 1}:${XLSX.utils.encode_col(lastCol)}${lastRow}`,
    };
    ws['!freeze'] = { xSplit: 0, ySplit: headerRowIdx + 1 } as any;

    const wb = XLSX.utils.book_new();
    (wb as any).Workbook = {
      Views: [{ RTL: false }],
      Sheets: [{ Hidden: 0 }],
    };
    XLSX.utils.book_append_sheet(wb, ws, 'Paramétrage postes');

    const today = new Date().toISOString().slice(0, 10);
    const safeLabel = selectedLabel.replace(/[^A-Za-z0-9_-]+/g, '_');
    XLSX.writeFile(wb, `parametrage_postes_${safeLabel}_${today}.xlsx`, {
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

  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  const renderGLOrFormula = (p: Poste) => {
    if (p.calculation_mode === 'parents_formula' && p.parents_formula && p.parents_formula.length > 0) {
      const txt = formatFormula(p.parents_formula, postesById);
      return (
        <span className="inline-block px-2 py-1 rounded-md text-[11px] font-mono"
          style={{ background: 'rgba(124,58,237,0.12)', color: '#C4B5FD', border: '1px solid rgba(124,58,237,0.3)' }}>
          ƒ {txt || '—'}
        </span>
      );
    }
    if (p.gl_codes && p.gl_codes.length > 0) {
      return (
        <div className="flex flex-wrap gap-1">
          {p.gl_codes.map((gl, i) => (
            <span key={i} className="px-2 py-0.5 rounded-md text-[11px] font-mono"
              style={{
                background: gl.signe === '+' ? 'rgba(5,150,105,0.12)' : 'rgba(220,38,38,0.12)',
                color: gl.signe === '+' ? '#6EE7B7' : '#FCA5A5',
                border: `1px solid ${gl.signe === '+' ? 'rgba(5,150,105,0.3)' : 'rgba(220,38,38,0.3)'}`,
              }}>
              {gl.signe}{gl.code}
            </span>
          ))}
        </div>
      );
    }
    return <span className="text-white/30 text-[11px] italic">—</span>;
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
          <h4 className="text-sm font-black text-white">Reporting du paramétrage des postes</h4>
          <p className="text-xs text-white/55 mt-0.5">
            Poste / Sous-poste avec leurs comptes GL ou formules associés.
          </p>
        </div>
      </div>

      {/* ── Type selector ── */}
      <div className="p-3 rounded-xl flex flex-wrap gap-2"
        style={{ background: '#0A1434', border: '1px solid rgba(27,58,140,0.3)' }}>
        {TYPE_OPTIONS.map((opt) => {
          const active = selectedType === opt.key;
          return (
            <button
              key={opt.key}
              type="button"
              onClick={() => setSelectedType(opt.key)}
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

      {/* ── Preview table ── */}
      <div className="rounded-xl overflow-hidden"
        style={{ background: '#070E28', border: '1px solid rgba(124,58,237,0.25)' }}>
        <div className="px-4 py-3 flex items-center justify-between"
          style={{ borderBottom: '1px solid rgba(124,58,237,0.2)', background: 'rgba(124,58,237,0.05)' }}>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold text-white/55 uppercase tracking-wider">Aperçu</span>
            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full"
              style={{ background: 'rgba(124,58,237,0.15)', color: '#C4B5FD' }}>
              {rows.length} poste{rows.length > 1 ? 's' : ''}
            </span>
          </div>
        </div>

        {loading ? (
          <div className="p-8 text-center text-white/50 text-sm">Chargement…</div>
        ) : rows.length === 0 ? (
          <div className="p-8 text-center text-white/40 text-sm italic">Aucun poste pour ce filtre.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ background: 'rgba(124,58,237,0.08)' }}>
                  <th className="px-3 py-2 text-left text-[10px] font-bold text-white/50 uppercase tracking-wider w-[120px]">Code</th>
                  <th className="px-3 py-2 text-left text-[10px] font-bold text-white/50 uppercase tracking-wider">Libellé</th>
                  <th className="px-3 py-2 text-left text-[10px] font-bold text-white/50 uppercase tracking-wider w-[140px]">Type</th>
                  <th className="px-3 py-2 text-left text-[10px] font-bold text-white/50 uppercase tracking-wider">GL / Formule</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(({ poste, level }) => {
                  const isRoot = level === 0;
                  return (
                    <tr key={poste.id}
                      style={{
                        borderTop: '1px solid rgba(255,255,255,0.04)',
                        background: isRoot ? 'rgba(27,58,140,0.12)' : 'transparent',
                      }}>
                      <td className="px-3 py-2 align-top">
                        <span className="font-mono text-[12px] font-bold"
                          style={{ color: isRoot ? '#C9A84C' : '#A5B4FC', paddingLeft: `${level * 14}px` }}>
                          {level > 0 && <span className="text-white/20 mr-1">└</span>}
                          {poste.code}
                        </span>
                      </td>
                      <td className="px-3 py-2 align-top">
                        <span className="text-white/85" style={{ fontWeight: isRoot ? 700 : 400 }}>
                          {poste.libelle}
                        </span>
                      </td>
                      <td className="px-3 py-2 align-top">
                        <span className="text-[10px] font-bold text-white/55">
                          {TYPE_LABELS[poste.type] || poste.type}
                        </span>
                      </td>
                      <td className="px-3 py-2 align-top">
                        {renderGLOrFormula(poste)}
                      </td>
                    </tr>
                  );
                })}
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
          disabled={rows.length === 0 || loading}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          style={{
            background: '#059669',
            color: '#ffffff',
            boxShadow: '0 4px 14px rgba(5,150,105,0.35)',
          }}
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
          disabled={rows.length === 0 || loading}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          style={{
            background: '#7C3AED',
            color: '#ffffff',
            boxShadow: '0 4px 14px rgba(124,58,237,0.35)',
          }}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
          </svg>
          Imprimer / PDF
        </button>
      </div>

      {/* ── Print-only view (portal to body) ── */}
      {mounted && createPortal(
        <div data-print-root="true" className="print-only" style={{ display: 'none' }}>
          <div className="print-header">
            <div className="print-title-block">
              <h1>Paramétrage des postes réglementaires</h1>
              <div className="print-meta">
                <span><strong>Filtre :</strong> {selectedLabel}</span>
                <span><strong>Nombre :</strong> {rows.length} poste{rows.length > 1 ? 's' : ''}</span>
                <span><strong>Date :</strong> {new Date().toLocaleDateString('fr-FR')}</span>
              </div>
            </div>
          </div>
          <table className="print-table">
            <colgroup>
              <col style={{ width: '10%' }} />
              <col style={{ width: '38%' }} />
              <col style={{ width: '5%' }} />
              <col style={{ width: '15%' }} />
              <col style={{ width: '32%' }} />
            </colgroup>
            <thead>
              <tr>
                <th>Code</th>
                <th>Libellé</th>
                <th>Niv.</th>
                <th>Type</th>
                <th>GL / Formule</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ poste, level }) => (
                <tr key={poste.id} className={level === 0 ? 'row-root' : ''}>
                  <td className="cell-mono">
                    <span style={{ paddingLeft: level * 8 }}>
                      {level > 0 ? '└ ' : ''}{poste.code}
                    </span>
                  </td>
                  <td className={level === 0 ? 'cell-bold' : ''}>{poste.libelle}</td>
                  <td className="cell-center">{level + 1}</td>
                  <td>{TYPE_LABELS[poste.type] || poste.type}</td>
                  <td className="cell-mono">{plainCellForPoste(poste) || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>,
        document.body
      )}

      <style jsx global>{`
        @media print {
          @page {
            size: A4 landscape;
            margin: 10mm 10mm 14mm 10mm;
          }
          @page {
            @bottom-right {
              content: "Page " counter(page) " / " counter(pages);
              font-size: 9pt;
              color: #555;
            }
          }
          html, body {
            background: #fff !important;
            color: #000 !important;
            margin: 0 !important;
            padding: 0 !important;
            height: auto !important;
            overflow: visible !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          body > *:not([data-print-root]) {
            display: none !important;
          }
          [data-print-root].print-only,
          [data-print-root].print-only * {
            display: revert !important;
            visibility: visible !important;
          }
          [data-print-root].print-only {
            position: static !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            color: #000 !important;
            background: #fff !important;
            font-family: Arial, Helvetica, sans-serif !important;
          }
          .print-only {
            color: #000 !important;
            background: #fff !important;
          }
          .print-header {
            border-bottom: 2px solid #1B3A8C;
            padding-bottom: 6px;
            margin-bottom: 8px;
          }
          .print-header h1 {
            font-size: 14pt;
            font-weight: 700;
            color: #1B3A8C;
            margin: 0 0 2px 0;
          }
          .print-meta {
            font-size: 9pt;
            color: #333;
            display: flex;
            gap: 18px;
            flex-wrap: wrap;
          }
          .print-table {
            width: 100%;
            border-collapse: collapse;
            font-size: 9pt;
            table-layout: fixed;
          }
          .print-table thead {
            display: table-header-group;
          }
          .print-table thead tr {
            background: #7C3AED !important;
            color: #fff !important;
          }
          .print-table thead th {
            border: 1px solid #555;
            padding: 4px 6px;
            text-align: left;
            font-weight: 700;
            font-size: 9pt;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .print-table tbody tr {
            page-break-inside: avoid;
            page-break-after: auto;
          }
          .print-table tbody td {
            border: 1px solid #bbb;
            padding: 3px 6px;
            vertical-align: top;
            word-wrap: break-word;
            overflow-wrap: break-word;
          }
          .print-table tr.row-root td {
            background: #EEF2FF !important;
            font-weight: 700;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .cell-mono { font-family: 'Courier New', Courier, monospace; font-size: 8.5pt; }
          .cell-bold { font-weight: 700; }
          .cell-center { text-align: center; }
          .no-print { display: none !important; }
        }
      `}</style>

    </div>
  );
};

export default PostesReportingTab;
