'use client';

import React, { useState } from 'react';

/**
 * Onglet "Génération auto" — permet d'importer une balance GL au format Excel
 * et de générer automatiquement le bilan + compte de résultat selon le
 * mapping officiel PCB UMOA (préfixes de comptes GL → postes réglementaires).
 *
 * Backend : POST /api/pcb/generation-auto (à implémenter à l'étape 2).
 *
 * Colonnes Excel attendues :
 *   Code_GL, Libelle_GL, Classe, Solde_Debit, Solde_Credit, Date_Solde, Devise
 */

interface PosteGenere {
  code: string;
  libelle: string;
  solde: number;
  nb_gl: number;
}

interface GenerationResult {
  bilan_actif: PosteGenere[];
  bilan_passif: PosteGenere[];
  compte_resultat: PosteGenere[];
  totaux: {
    total_actif: number;
    total_passif: number;
    total_produits: number;
    total_charges: number;
    resultat_net: number;
  };
  meta: {
    date_cloture: string;
    date_n1?: string;
    date_realisation?: string;
    nb_lignes_gl: number;
    nb_gl_distincts: number;
  };
}

const GenerationAutoTab = () => {
  const [file, setFile] = useState<File | null>(null);
  const [dateCloture, setDateCloture] = useState('');
  const [dateN1, setDateN1] = useState('');
  const [dateRealisation, setDateRealisation] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<GenerationResult | null>(null);
  const [step, setStep] = useState(0);

  const getAuthHeaders = (): HeadersInit => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  const fmt = (v: number): string =>
    new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(v);

  const handleGenerate = async () => {
    if (!file) {
      setError('Sélectionne un fichier Excel de balance GL.');
      return;
    }
    if (!dateCloture) {
      setError('La date de clôture est obligatoire.');
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);
    setStep(0);

    const stepTimer = setInterval(() => {
      setStep((s) => (s < 3 ? s + 1 : s));
    }, 1500);

    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('date_cloture', dateCloture);
      if (dateN1) fd.append('date_n1', dateN1);
      if (dateRealisation) fd.append('date_realisation', dateRealisation);

      const res = await fetch('/api/pcb/generation-auto', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: fd,
      });
      clearInterval(stepTimer);

      if (!res.ok) {
        let msg = `Erreur ${res.status}`;
        try {
          const data = await res.json();
          msg = data?.detail || data?.error || msg;
        } catch { /* ignore */ }
        throw new Error(msg);
      }
      const data = await res.json();
      setResult(data);
      setStep(4);
    } catch (e) {
      clearInterval(stepTimer);
      setError(e instanceof Error ? e.message : 'Erreur inconnue');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* ── En-tête ── */}
      <div className="flex items-center gap-3 p-4 rounded-xl"
        style={{ background: '#0A1434', border: '1px solid rgba(14,165,233,0.3)' }}>
        <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ background: 'rgba(14,165,233,0.15)', border: '1px solid rgba(14,165,233,0.4)' }}>
          <svg className="w-5 h-5 text-[#0EA5E9]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-black text-white">Génération auto — Bilan + Compte de résultat</h4>
          <p className="text-xs text-white/60 mt-0.5">
            Importe une balance GL Excel et génère automatiquement les états financiers via le mapping officiel PCB UMOA.
          </p>
        </div>
      </div>

      {/* ── Formulaire d'upload ── */}
      <div className="p-5 rounded-xl space-y-4"
        style={{ background: '#070E28', border: '1px solid rgba(14,165,233,0.25)' }}>

        {/* Fichier */}
        <div>
          <label className="block text-xs font-bold text-white/70 mb-2 uppercase tracking-wider">
            Fichier Excel de balance GL (.xlsx)
          </label>
          <input
            type="file"
            accept=".xlsx"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
            disabled={loading}
            className="w-full text-sm text-white"
            style={{
              padding: '0.75rem',
              borderRadius: '10px',
              border: '1px solid rgba(14,165,233,0.4)',
              background: '#0A1434',
            }}
          />
          {file && (
            <div className="mt-2 text-xs text-[#6EE7B7]">
              ✓ {file.name} ({(file.size / 1024).toFixed(1)} Ko)
            </div>
          )}
          <div className="mt-2 text-[11px] text-white/45 leading-relaxed">
            Colonnes attendues : <code className="text-[#93C5FD] bg-white/5 px-1 rounded">Code_GL</code>,{' '}
            <code className="text-[#93C5FD] bg-white/5 px-1 rounded">Libelle_GL</code>,{' '}
            <code className="text-[#93C5FD] bg-white/5 px-1 rounded">Classe</code>,{' '}
            <code className="text-[#93C5FD] bg-white/5 px-1 rounded">Solde_Debit</code>,{' '}
            <code className="text-[#93C5FD] bg-white/5 px-1 rounded">Solde_Credit</code>,{' '}
            <code className="text-[#93C5FD] bg-white/5 px-1 rounded">Date_Solde</code>,{' '}
            <code className="text-[#93C5FD] bg-white/5 px-1 rounded">Devise</code>.
          </div>
        </div>

        {/* Dates */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-bold text-white/70 mb-2 uppercase tracking-wider">
              Date de clôture *
            </label>
            <input
              type="date"
              value={dateCloture}
              onChange={(e) => setDateCloture(e.target.value)}
              disabled={loading}
              required
              className="w-full text-sm text-white"
              style={{
                padding: '0.7rem',
                borderRadius: '10px',
                border: '1px solid rgba(14,165,233,0.4)',
                background: '#0A1434',
                colorScheme: 'dark',
              }}
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-white/70 mb-2 uppercase tracking-wider">
              Date N-1
            </label>
            <input
              type="date"
              value={dateN1}
              onChange={(e) => setDateN1(e.target.value)}
              disabled={loading}
              className="w-full text-sm text-white"
              style={{
                padding: '0.7rem',
                borderRadius: '10px',
                border: '1px solid rgba(14,165,233,0.4)',
                background: '#0A1434',
                colorScheme: 'dark',
              }}
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-white/70 mb-2 uppercase tracking-wider">
              Date Réalisation (référence)
            </label>
            <input
              type="date"
              value={dateRealisation}
              onChange={(e) => setDateRealisation(e.target.value)}
              disabled={loading}
              className="w-full text-sm text-white"
              style={{
                padding: '0.7rem',
                borderRadius: '10px',
                border: '1px solid rgba(14,165,233,0.4)',
                background: '#0A1434',
                colorScheme: 'dark',
              }}
            />
          </div>
        </div>

        {/* Erreur */}
        {error && (
          <div className="px-4 py-3 rounded-lg text-sm"
            style={{ background: 'rgba(220,38,38,0.12)', border: '1px solid rgba(220,38,38,0.35)', color: '#FCA5A5' }}>
            ⚠ {error}
          </div>
        )}

        {/* Bouton */}
        <div className="flex gap-2 justify-end">
          <button
            onClick={handleGenerate}
            disabled={loading || !file || !dateCloture}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            style={{
              background: loading ? '#6B7280' : 'linear-gradient(135deg, #0EA5E9 0%, #3B82F6 100%)',
              color: '#fff',
              boxShadow: '0 4px 14px rgba(14,165,233,0.35)',
            }}
          >
            {loading ? (
              <>
                <div style={{
                  width: 14, height: 14,
                  border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff',
                  borderRadius: '50%', animation: 'spinGA 0.8s linear infinite',
                }} />
                Génération en cours…
              </>
            ) : (
              <>
                <svg width={16} height={16} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                Générer le bilan + compte de résultat
              </>
            )}
          </button>
        </div>

        <style jsx>{`@keyframes spinGA { to { transform: rotate(360deg); } }`}</style>
      </div>

      {/* ── Progression ── */}
      {loading && (
        <div className="p-4 rounded-xl"
          style={{ background: '#0A1434', border: '1px solid rgba(14,165,233,0.3)' }}>
          {[
            'Lecture du fichier Excel',
            'Agrégation des comptes GL par code',
            'Application du mapping PCB UMOA',
            'Calcul des totaux (bilan + CR)',
          ].map((label, idx) => {
            const done = idx < step;
            const current = idx === step;
            return (
              <div key={idx} className="flex items-center gap-3 py-1.5 text-sm"
                style={{ color: done ? '#6EE7B7' : current ? '#93C5FD' : 'rgba(255,255,255,0.4)' }}>
                <span style={{
                  width: 18, height: 18, borderRadius: '50%',
                  background: done ? '#059669' : current ? '#0EA5E9' : 'rgba(255,255,255,0.1)',
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 10, fontWeight: 900, color: '#fff',
                }}>
                  {done ? '✓' : idx + 1}
                </span>
                {label}{current && '…'}
              </div>
            );
          })}
        </div>
      )}

      {/* ── Résultats ── */}
      {result && !loading && (
        <div className="space-y-4">
          {/* Méta */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: 'Lignes GL lues', value: result.meta.nb_lignes_gl },
              { label: 'GL distincts', value: result.meta.nb_gl_distincts },
              { label: 'Total Actif', value: fmt(result.totaux.total_actif) + ' M' },
              { label: 'Total Passif', value: fmt(result.totaux.total_passif) + ' M' },
            ].map((kpi) => (
              <div key={kpi.label} className="p-3 rounded-lg"
                style={{ background: '#0A1434', border: '1px solid rgba(14,165,233,0.2)' }}>
                <div className="text-[10px] font-bold uppercase text-white/50 tracking-wider">{kpi.label}</div>
                <div className="text-base font-black text-white font-mono mt-1">{kpi.value}</div>
              </div>
            ))}
          </div>

          {/* Bilan Actif */}
          <div className="rounded-xl overflow-hidden"
            style={{ background: '#070E28', border: '1px solid rgba(27,58,140,0.35)' }}>
            <div className="px-4 py-2.5 font-bold text-white text-sm"
              style={{ background: 'linear-gradient(90deg, rgba(27,58,140,0.25), transparent)' }}>
              🟦 BILAN — ACTIF
            </div>
            <table className="w-full text-xs">
              <thead>
                <tr style={{ background: 'rgba(27,58,140,0.08)' }}>
                  <th className="px-3 py-2 text-left text-[10px] font-bold text-white/60 uppercase">Code</th>
                  <th className="px-3 py-2 text-left text-[10px] font-bold text-white/60 uppercase">Libellé</th>
                  <th className="px-3 py-2 text-right text-[10px] font-bold text-white/60 uppercase">GL</th>
                  <th className="px-3 py-2 text-right text-[10px] font-bold text-white/60 uppercase">Solde (M FCFA)</th>
                </tr>
              </thead>
              <tbody>
                {result.bilan_actif.map((p) => (
                  <tr key={p.code} style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}>
                    <td className="px-3 py-1.5 font-mono font-bold text-[#93C5FD]">{p.code}</td>
                    <td className="px-3 py-1.5 text-white/85">{p.libelle}</td>
                    <td className="px-3 py-1.5 text-right text-white/55">{p.nb_gl}</td>
                    <td className="px-3 py-1.5 text-right font-mono text-white font-bold">{fmt(p.solde)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Bilan Passif */}
          <div className="rounded-xl overflow-hidden"
            style={{ background: '#070E28', border: '1px solid rgba(124,58,237,0.35)' }}>
            <div className="px-4 py-2.5 font-bold text-white text-sm"
              style={{ background: 'linear-gradient(90deg, rgba(124,58,237,0.25), transparent)' }}>
              🟪 BILAN — PASSIF
            </div>
            <table className="w-full text-xs">
              <thead>
                <tr style={{ background: 'rgba(124,58,237,0.08)' }}>
                  <th className="px-3 py-2 text-left text-[10px] font-bold text-white/60 uppercase">Code</th>
                  <th className="px-3 py-2 text-left text-[10px] font-bold text-white/60 uppercase">Libellé</th>
                  <th className="px-3 py-2 text-right text-[10px] font-bold text-white/60 uppercase">GL</th>
                  <th className="px-3 py-2 text-right text-[10px] font-bold text-white/60 uppercase">Solde (M FCFA)</th>
                </tr>
              </thead>
              <tbody>
                {result.bilan_passif.map((p) => (
                  <tr key={p.code} style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}>
                    <td className="px-3 py-1.5 font-mono font-bold text-[#C4B5FD]">{p.code}</td>
                    <td className="px-3 py-1.5 text-white/85">{p.libelle}</td>
                    <td className="px-3 py-1.5 text-right text-white/55">{p.nb_gl}</td>
                    <td className="px-3 py-1.5 text-right font-mono text-white font-bold">{fmt(p.solde)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Compte de résultat */}
          <div className="rounded-xl overflow-hidden"
            style={{ background: '#070E28', border: '1px solid rgba(201,168,76,0.35)' }}>
            <div className="px-4 py-2.5 font-bold text-white text-sm"
              style={{ background: 'linear-gradient(90deg, rgba(201,168,76,0.25), transparent)' }}>
              🟨 COMPTE DE RÉSULTAT
            </div>
            <table className="w-full text-xs">
              <thead>
                <tr style={{ background: 'rgba(201,168,76,0.08)' }}>
                  <th className="px-3 py-2 text-left text-[10px] font-bold text-white/60 uppercase">Code</th>
                  <th className="px-3 py-2 text-left text-[10px] font-bold text-white/60 uppercase">Libellé</th>
                  <th className="px-3 py-2 text-right text-[10px] font-bold text-white/60 uppercase">GL</th>
                  <th className="px-3 py-2 text-right text-[10px] font-bold text-white/60 uppercase">Solde (M FCFA)</th>
                </tr>
              </thead>
              <tbody>
                {result.compte_resultat.map((p) => (
                  <tr key={p.code} style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}>
                    <td className="px-3 py-1.5 font-mono font-bold text-[#FDE68A]">{p.code}</td>
                    <td className="px-3 py-1.5 text-white/85">{p.libelle}</td>
                    <td className="px-3 py-1.5 text-right text-white/55">{p.nb_gl}</td>
                    <td className="px-3 py-1.5 text-right font-mono text-white font-bold">{fmt(p.solde)}</td>
                  </tr>
                ))}
                <tr style={{ borderTop: '2px solid rgba(201,168,76,0.3)', background: 'rgba(201,168,76,0.06)' }}>
                  <td className="px-3 py-2 font-mono font-black text-[#FDE68A]">RN</td>
                  <td className="px-3 py-2 font-bold text-white">Résultat Net</td>
                  <td className="px-3 py-2 text-right text-white/55">—</td>
                  <td className="px-3 py-2 text-right font-mono font-black"
                    style={{ color: result.totaux.resultat_net >= 0 ? '#6EE7B7' : '#FCA5A5' }}>
                    {fmt(result.totaux.resultat_net)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="text-xs text-white/40 italic text-center">
            Les résultats peuvent être enregistrés comme rapports PCB réguliers (étape 3 à venir).
          </div>
        </div>
      )}

      {/* ── Message si pas encore implémenté ── */}
      {!result && !loading && !error && (
        <div className="p-8 rounded-xl text-center"
          style={{ background: '#070E28', border: '1px dashed rgba(14,165,233,0.35)' }}>
          <div className="text-4xl mb-3">📥</div>
          <p className="text-sm text-white/55">
            Importe un fichier Excel de balance GL pour générer automatiquement le bilan et le compte de résultat selon le mapping PCB UMOA officiel.
          </p>
          <p className="text-xs text-white/35 mt-2 italic">
            Le backend de traitement sera livré à l&apos;étape 2 — cet écran est le squelette UI.
          </p>
        </div>
      )}
    </div>
  );
};

export default GenerationAutoTab;
