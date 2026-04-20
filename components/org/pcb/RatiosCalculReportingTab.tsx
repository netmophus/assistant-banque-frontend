'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';

interface RatioDetail {
  code?: string;
  libelle?: string;
  valeur?: number | null;
  unite?: string;
  statut?: string | null;
  seuil_min?: number | null;
  seuil_max?: number | null;
  categorie?: string;
}

const TYPE_RAPPORT_OPTIONS: { key: string; label: string }[] = [
  { key: 'bilan_reglementaire', label: 'Bilan réglementaire' },
  { key: 'compte_resultat',     label: 'Compte de résultat'   },
  { key: 'les_deux',            label: 'Les deux'             },
];

const TYPE_RAPPORT_LABELS: Record<string, string> = {
  bilan_reglementaire: 'Bilan réglementaire',
  compte_resultat: 'Compte de résultat',
  les_deux: 'Les deux',
};

const getAuthHeaders = (): HeadersInit => {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  const headers: HeadersInit = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return headers;
};

const formatValue = (v: number | null | undefined, unite?: string): string => {
  if (v === null || v === undefined || !Number.isFinite(v)) return '—';
  const formatted = Number(v).toLocaleString('fr-FR', { maximumFractionDigits: 4 });
  return `${formatted}${unite === '%' ? ' %' : unite ? ' ' + unite : ''}`;
};

const normalizeRatios = (details: any): RatioDetail[] => {
  if (!details || typeof details !== 'object') return [];
  const rows: RatioDetail[] = [];
  Object.entries(details).forEach(([code, v]) => {
    if (v && typeof v === 'object') {
      const obj = v as any;
      if ('valeur' in obj || 'libelle' in obj) {
        rows.push({
          code,
          libelle: obj.libelle || code,
          valeur: obj.valeur ?? null,
          unite: obj.unite || '',
          statut: obj.statut ?? null,
          seuil_min: obj.seuil_min ?? null,
          seuil_max: obj.seuil_max ?? null,
          categorie: obj.categorie || '',
        });
        return;
      }
    }
    rows.push({ code, libelle: code, valeur: (typeof v === 'number' ? v : null) });
  });
  return rows;
};

const statutColor = (s?: string | null): { bg: string; fg: string; label: string } => {
  const v = (s || '').toLowerCase();
  if (v.includes('conforme') || v === 'ok' || v === 'green') return { bg: 'rgba(5,150,105,0.2)', fg: '#6EE7B7', label: s || 'Conforme' };
  if (v.includes('alerte') || v === 'warning' || v === 'yellow') return { bg: 'rgba(217,119,6,0.2)', fg: '#FCD34D', label: s || 'Alerte' };
  if (v.includes('non') || v === 'ko' || v === 'red') return { bg: 'rgba(220,38,38,0.2)', fg: '#FCA5A5', label: s || 'Non conforme' };
  return { bg: 'rgba(255,255,255,0.06)', fg: 'rgba(255,255,255,0.6)', label: s || '—' };
};

const renderSimpleMarkdown = (text: string): React.ReactNode => {
  const lines = text.split(/\r?\n/);
  const out: React.ReactNode[] = [];
  let listBuf: string[] = [];
  const flushList = () => {
    if (listBuf.length === 0) return;
    out.push(
      <ul key={`ul-${out.length}`} className="list-disc pl-5 space-y-1 mb-3">
        {listBuf.map((li, i) => (
          <li key={i} className="text-[12px] text-white/80 leading-relaxed">
            {li.replace(/^\s*[-•]\s*/, '')}
          </li>
        ))}
      </ul>,
    );
    listBuf = [];
  };
  lines.forEach((raw, i) => {
    const line = raw.trimEnd();
    if (!line.trim()) { flushList(); return; }
    if (/^\s*[-•]\s+/.test(line)) { listBuf.push(line); return; }
    flushList();
    const h = line.match(/^(\d+)[\.\)]\s+(.*)$/);
    if (h) {
      out.push(
        <h5 key={`h-${i}`} className="text-[13px] font-black text-[#C9A84C] mt-3 mb-1">
          {h[1]}. {h[2]}
        </h5>,
      );
      return;
    }
    if (/^#{1,6}\s+/.test(line)) {
      out.push(
        <h5 key={`h-${i}`} className="text-[13px] font-black text-[#C9A84C] mt-3 mb-1">
          {line.replace(/^#{1,6}\s+/, '')}
        </h5>,
      );
      return;
    }
    const withBold = line.split(/(\*\*[^*]+\*\*)/g).map((part, idx) =>
      part.startsWith('**') && part.endsWith('**')
        ? <strong key={idx} className="text-white">{part.slice(2, -2)}</strong>
        : <React.Fragment key={idx}>{part}</React.Fragment>
    );
    out.push(
      <p key={`p-${i}`} className="text-[12px] text-white/75 leading-relaxed mb-2">{withBold}</p>,
    );
  });
  flushList();
  return out;
};

const RatiosCalculReportingTab = () => {
  const today = new Date().toISOString().slice(0, 10);
  const [typeRapport, setTypeRapport] = useState<string>('bilan_reglementaire');
  const [dateCloture, setDateCloture] = useState<string>(today);

  const [calcLoading, setCalcLoading] = useState(false);
  const [calcError, setCalcError] = useState('');
  const [ratios, setRatios] = useState<RatioDetail[]>([]);

  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState('');
  const [interpretation, setInterpretation] = useState<string>('');

  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  const fetchPreview = async () => {
    setCalcLoading(true);
    setCalcError('');
    setInterpretation('');
    setAiError('');
    try {
      const url = `/api/pcb/ratios/preview?type_rapport=${encodeURIComponent(typeRapport)}&date_cloture=${encodeURIComponent(dateCloture)}`;
      const res = await fetch(url, { headers: getAuthHeaders() });
      if (!res.ok) {
        const txt = await res.text().catch(() => '');
        throw new Error(txt || `Erreur ${res.status}`);
      }
      const data = await res.json();
      setRatios(normalizeRatios(data.ratios_details || data.ratios || {}));
    } catch (e) {
      setRatios([]);
      setCalcError(e instanceof Error ? e.message : 'Erreur inconnue');
    } finally {
      setCalcLoading(false);
    }
  };

  const runAiAnalysis = async () => {
    setAiLoading(true);
    setAiError('');
    try {
      const res = await fetch('/api/pcb/ratios/analyse', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ type_rapport: typeRapport, date_cloture: dateCloture }),
      });
      if (!res.ok) {
        const txt = await res.text().catch(() => '');
        throw new Error(txt || `Erreur ${res.status}`);
      }
      const data = await res.json();
      setInterpretation(data.interpretation_ia || '');
      if (Array.isArray(normalizeRatios(data.ratios_details)) && normalizeRatios(data.ratios_details).length > 0) {
        setRatios(normalizeRatios(data.ratios_details));
      }
    } catch (e) {
      setInterpretation('');
      setAiError(e instanceof Error ? e.message : 'Erreur inconnue');
    } finally {
      setAiLoading(false);
    }
  };

  const typeRapportLabel = useMemo(
    () => TYPE_RAPPORT_LABELS[typeRapport] || typeRapport,
    [typeRapport],
  );

  const handleExportExcel = async () => {
    if (ratios.length === 0) return;
    const XLSX = await import('xlsx');
    const todayStr = new Date().toLocaleDateString('fr-FR');

    const aoa: (string | number)[][] = [
      ['Reporting ratios calculés — Analyse IA'],
      [`Type : ${typeRapportLabel}    —    Date clôture : ${dateCloture}    —    ${ratios.length} ratio${ratios.length > 1 ? 's' : ''}    —    Généré le ${todayStr}`],
      [],
      ['Code', 'Libellé', 'Valeur', 'Unité', 'Seuil min', 'Seuil max', 'Statut'],
      ...ratios.map((r) => [
        r.code || '',
        r.libelle || '',
        r.valeur === null || r.valeur === undefined || !Number.isFinite(r.valeur as number) ? '' : Number(r.valeur),
        r.unite || '',
        r.seuil_min === null || r.seuil_min === undefined ? '' : Number(r.seuil_min),
        r.seuil_max === null || r.seuil_max === undefined ? '' : Number(r.seuil_max),
        r.statut || '',
      ]),
    ];

    if (interpretation) {
      aoa.push([]);
      aoa.push(['ANALYSE IA']);
      interpretation.split(/\r?\n/).forEach((line) => aoa.push([line]));
    }

    const ws = XLSX.utils.aoa_to_sheet(aoa);

    ws['!cols'] = [
      { wch: 12 }, { wch: 50 }, { wch: 14 }, { wch: 8 },
      { wch: 12 }, { wch: 12 }, { wch: 18 },
    ];

    ws['!merges'] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: 6 } },
      { s: { r: 1, c: 0 }, e: { r: 1, c: 6 } },
    ];

    const headerRowIdx = 3;
    for (let c = 0; c < 7; c++) {
      const addr = XLSX.utils.encode_cell({ r: headerRowIdx, c });
      if (!ws[addr]) continue;
      ws[addr].s = {
        font: { bold: true, color: { rgb: 'FFFFFFFF' } },
        fill: { fgColor: { rgb: 'FF1B3A8C' } },
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
    ws['!freeze'] = { xSplit: 0, ySplit: headerRowIdx + 1 } as any;

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Ratios + IA');

    const safe = typeRapportLabel.replace(/[^A-Za-z0-9_-]+/g, '_');
    XLSX.writeFile(wb, `rapport_ratios_${safe}_${dateCloture}.xlsx`, { bookType: 'xlsx', cellStyles: true });
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
        style={{ background: '#0A1434', border: '1px solid rgba(27,58,140,0.25)' }}>
        <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ background: 'rgba(27,58,140,0.15)', border: '1px solid rgba(27,58,140,0.35)' }}>
          <svg className="w-5 h-5 text-[#93C5FD]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-black text-white">Reporting ratios calculés + Analyse IA</h4>
          <p className="text-xs text-white/55 mt-0.5">
            Calcule les ratios à une date de clôture et génère une interprétation par l'IA.
          </p>
        </div>
      </div>

      {/* ── Controls ── */}
      <div className="p-4 rounded-xl grid grid-cols-1 md:grid-cols-3 gap-3 items-end"
        style={{ background: '#0A1434', border: '1px solid rgba(27,58,140,0.3)' }}>
        <div>
          <div className="text-[10px] font-bold text-white/50 uppercase tracking-wider mb-1.5">Type de rapport</div>
          <select
            value={typeRapport}
            onChange={(e) => setTypeRapport(e.target.value)}
            className="w-full px-3 py-2 rounded-lg text-sm text-white"
            style={{ background: '#070E28', border: '1px solid rgba(27,58,140,0.4)' }}
          >
            {TYPE_RAPPORT_OPTIONS.map((t) => (
              <option key={t.key} value={t.key}>{t.label}</option>
            ))}
          </select>
        </div>
        <div>
          <div className="text-[10px] font-bold text-white/50 uppercase tracking-wider mb-1.5">Date de clôture</div>
          <input
            type="date"
            value={dateCloture}
            onChange={(e) => setDateCloture(e.target.value)}
            className="w-full px-3 py-2 rounded-lg text-sm text-white"
            style={{ background: '#070E28', border: '1px solid rgba(27,58,140,0.4)' }}
          />
        </div>
        <div>
          <button
            type="button"
            onClick={fetchPreview}
            disabled={calcLoading || !dateCloture}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all disabled:opacity-40"
            style={{ background: '#1B3A8C', color: '#ffffff', boxShadow: '0 4px 14px rgba(27,58,140,0.4)' }}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 4 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            {calcLoading ? 'Calcul…' : 'Calculer les ratios'}
          </button>
        </div>
      </div>

      {calcError && (
        <div className="p-3 rounded-xl text-xs text-red-300"
          style={{ background: 'rgba(220,38,38,0.1)', border: '1px solid rgba(220,38,38,0.3)' }}>
          {calcError}
        </div>
      )}

      {/* ── Ratios table ── */}
      {ratios.length > 0 && (
        <div className="rounded-xl overflow-hidden"
          style={{ background: '#070E28', border: '1px solid rgba(27,58,140,0.25)' }}>
          <div className="px-4 py-3 flex items-center justify-between flex-wrap gap-2"
            style={{ borderBottom: '1px solid rgba(27,58,140,0.2)', background: 'rgba(27,58,140,0.05)' }}>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold text-white/55 uppercase tracking-wider">Résultats</span>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full"
                style={{ background: 'rgba(27,58,140,0.2)', color: '#93C5FD' }}>
                {ratios.length} ratio{ratios.length > 1 ? 's' : ''}
              </span>
            </div>
            <button
              type="button"
              onClick={runAiAnalysis}
              disabled={aiLoading}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all disabled:opacity-50"
              style={{
                background: 'linear-gradient(135deg, #7C3AED, #C9A84C)',
                color: '#ffffff',
                boxShadow: '0 4px 14px rgba(124,58,237,0.35)',
              }}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
              {aiLoading ? 'Analyse en cours…' : 'Analyser par l\'IA'}
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ background: 'rgba(27,58,140,0.08)' }}>
                  <th className="px-3 py-2 text-left text-[10px] font-bold text-white/50 uppercase tracking-wider w-[110px]">Code</th>
                  <th className="px-3 py-2 text-left text-[10px] font-bold text-white/50 uppercase tracking-wider">Libellé</th>
                  <th className="px-3 py-2 text-right text-[10px] font-bold text-white/50 uppercase tracking-wider w-[140px]">Valeur</th>
                  <th className="px-3 py-2 text-left text-[10px] font-bold text-white/50 uppercase tracking-wider w-[160px]">Seuils</th>
                  <th className="px-3 py-2 text-center text-[10px] font-bold text-white/50 uppercase tracking-wider w-[140px]">Statut</th>
                </tr>
              </thead>
              <tbody>
                {ratios.map((r) => {
                  const st = statutColor(r.statut);
                  const seuilTxt = (r.seuil_min !== null && r.seuil_min !== undefined)
                    ? `≥ ${formatValue(r.seuil_min, r.unite)}`
                    : (r.seuil_max !== null && r.seuil_max !== undefined)
                      ? `≤ ${formatValue(r.seuil_max, r.unite)}`
                      : '—';
                  return (
                    <tr key={r.code} style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}>
                      <td className="px-3 py-2 font-mono text-[12px] font-bold text-[#93C5FD]">{r.code}</td>
                      <td className="px-3 py-2 text-white/85">{r.libelle}</td>
                      <td className="px-3 py-2 text-right font-mono text-[12px] font-bold text-white">
                        {formatValue(r.valeur, r.unite)}
                      </td>
                      <td className="px-3 py-2 font-mono text-[11px] text-white/60">{seuilTxt}</td>
                      <td className="px-3 py-2 text-center">
                        <span className="inline-block px-2 py-0.5 rounded-md text-[10px] font-bold"
                          style={{ background: st.bg, color: st.fg }}>
                          {st.label}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── AI analysis block ── */}
      {(aiLoading || interpretation || aiError) && (
        <div className="rounded-xl overflow-hidden"
          style={{ background: '#070E28', border: '1px solid rgba(124,58,237,0.3)' }}>
          <div className="px-4 py-3 flex items-center gap-2"
            style={{ borderBottom: '1px solid rgba(124,58,237,0.2)', background: 'linear-gradient(90deg, rgba(124,58,237,0.08), rgba(201,168,76,0.06))' }}>
            <svg className="w-4 h-4 text-[#C4B5FD]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
            <span className="text-[11px] font-black uppercase tracking-wider text-[#C4B5FD]">Analyse IA</span>
          </div>
          <div className="p-4">
            {aiLoading && (
              <div className="flex items-center gap-3 text-white/60 text-sm">
                <div className="w-4 h-4 border-2 border-[#7C3AED]/30 border-t-[#7C3AED] rounded-full animate-spin" />
                L'IA analyse les ratios… (peut prendre 10–30 s)
              </div>
            )}
            {aiError && !aiLoading && (
              <div className="text-xs text-red-300">{aiError}</div>
            )}
            {!aiLoading && interpretation && (
              <div className="prose-sm">{renderSimpleMarkdown(interpretation)}</div>
            )}
          </div>
        </div>
      )}

      {/* ── Export buttons ── */}
      {ratios.length > 0 && (
        <div className="flex flex-wrap gap-2 justify-end no-print">
          <button
            type="button"
            onClick={handleExportExcel}
            disabled={ratios.length === 0}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all disabled:opacity-40"
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
            disabled={ratios.length === 0}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all disabled:opacity-40"
            style={{ background: '#7C3AED', color: '#ffffff', boxShadow: '0 4px 14px rgba(124,58,237,0.35)' }}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
            Imprimer / PDF
          </button>
        </div>
      )}

      {/* ── Print-only view (portal) ── */}
      {mounted && createPortal(
        <div data-print-root="true" className="print-only" style={{ display: 'none' }}>
          <div className="print-header">
            <h1>Reporting ratios calculés — Analyse IA</h1>
            <div className="print-meta">
              <span><strong>Type :</strong> {typeRapportLabel}</span>
              <span><strong>Date clôture :</strong> {dateCloture}</span>
              <span><strong>Nombre :</strong> {ratios.length} ratio{ratios.length > 1 ? 's' : ''}</span>
              <span><strong>Généré :</strong> {new Date().toLocaleDateString('fr-FR')}</span>
            </div>
          </div>
          <table className="print-table">
            <colgroup>
              <col style={{ width: '8%' }} />
              <col style={{ width: '40%' }} />
              <col style={{ width: '14%' }} />
              <col style={{ width: '18%' }} />
              <col style={{ width: '20%' }} />
            </colgroup>
            <thead>
              <tr>
                <th>Code</th>
                <th>Libellé</th>
                <th>Valeur</th>
                <th>Seuils</th>
                <th>Statut</th>
              </tr>
            </thead>
            <tbody>
              {ratios.map((r) => {
                const seuilTxt = (r.seuil_min !== null && r.seuil_min !== undefined)
                  ? `≥ ${formatValue(r.seuil_min, r.unite)}`
                  : (r.seuil_max !== null && r.seuil_max !== undefined)
                    ? `≤ ${formatValue(r.seuil_max, r.unite)}`
                    : '—';
                return (
                  <tr key={r.code}>
                    <td className="cell-mono cell-bold">{r.code}</td>
                    <td>{r.libelle}</td>
                    <td className="cell-mono cell-bold">{formatValue(r.valeur, r.unite)}</td>
                    <td className="cell-mono">{seuilTxt}</td>
                    <td>{r.statut || '—'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {interpretation && (
            <div className="print-ai">
              <h2>Analyse IA</h2>
              <pre>{interpretation}</pre>
            </div>
          )}
        </div>,
        document.body
      )}

      <style jsx global>{`
        .print-ai h2 {
          font-size: 12pt;
          font-weight: 700;
          color: #7C3AED;
          border-bottom: 1px solid #7C3AED;
          padding-bottom: 4px;
          margin: 14px 0 6px 0;
          page-break-after: avoid;
        }
        .print-ai pre {
          font-family: Arial, Helvetica, sans-serif;
          font-size: 9.5pt;
          white-space: pre-wrap;
          word-wrap: break-word;
          color: #000;
          background: transparent;
          margin: 0;
          padding: 0;
        }
      `}</style>

    </div>
  );
};

export default RatiosCalculReportingTab;
