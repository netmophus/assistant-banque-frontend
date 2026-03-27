'use client';

import React, { useState, useEffect } from 'react';
import { apiClient } from '@/lib/api/client';
import Pagination from '@/components/common/Pagination';

interface Promesse {
  id: string;
  promesse_id: string;
  ref_credit: string;
  nom_client: string;
  montant_promis: number;
  montant_recu: number | null;
  date_promesse: string;
  date_creation: string;
  statut: string;
  commentaire: string | null;
  created_by: string;
  updated_at: string | null;
}

interface PromesseStats {
  total: number;
  en_attente: number;
  tenues: number;
  non_tenues: number;
  annulees: number;
  montant_total_promis: number;
  montant_total_recu: number;
  taux_tenue: number;
}

const STATUT_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  en_attente: { label: 'En attente', color: '#f59e0b', bg: 'rgba(245,158,11,0.15)' },
  tenue: { label: 'Tenue', color: '#22c55e', bg: 'rgba(34,197,94,0.15)' },
  non_tenue: { label: 'Non tenue', color: '#ef4444', bg: 'rgba(239,68,68,0.15)' },
  annulee: { label: 'Annulee', color: '#6b7280', bg: 'rgba(107,114,128,0.15)' },
};

const PromessesTab = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [promesses, setPromesses] = useState<Promesse[]>([]);
  const [total, setTotal] = useState(0);
  const [stats, setStats] = useState<PromesseStats | null>(null);
  const [page, setPage] = useState(1);
  const limit = 20;

  const [filtreStatut, setFiltreStatut] = useState('');
  const [filtreRef, setFiltreRef] = useState('');

  // Formulaire
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    ref_credit: '',
    nom_client: '',
    montant_promis: '',
    date_promesse: '',
    commentaire: '',
  });

  // Modal MAJ statut
  const [updateModal, setUpdateModal] = useState<Promesse | null>(null);
  const [updateStatut, setUpdateStatut] = useState('');
  const [updateMontant, setUpdateMontant] = useState('');
  const [updateComment, setUpdateComment] = useState('');

  useEffect(() => {
    loadPromesses();
    loadStats();
  }, [page, filtreStatut]);

  const loadPromesses = async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      if (filtreStatut) params.set('statut', filtreStatut);
      if (filtreRef) params.set('ref_credit', filtreRef);
      params.set('limit', String(limit));
      params.set('skip', String((page - 1) * limit));

      const data = await apiClient.get<any>(`/impayes/promesses?${params}`);
      setPromesses(data.promesses || []);
      setTotal(data.total || 0);
    } catch (err: any) {
      setError(err.message || 'Erreur chargement');
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const data = await apiClient.get<PromesseStats>('/impayes/promesses/stats');
      setStats(data);
    } catch { /* ignore */ }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.ref_credit || !form.montant_promis || !form.date_promesse) {
      setError('Remplir les champs obligatoires');
      return;
    }
    try {
      setLoading(true);
      await apiClient.post('/impayes/promesses', {
        ref_credit: form.ref_credit,
        nom_client: form.nom_client,
        montant_promis: parseFloat(form.montant_promis),
        date_promesse: form.date_promesse,
        commentaire: form.commentaire || undefined,
      });
      setForm({ ref_credit: '', nom_client: '', montant_promis: '', date_promesse: '', commentaire: '' });
      setShowForm(false);
      loadPromesses();
      loadStats();
    } catch (err: any) {
      setError(err.message || 'Erreur creation');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatut = async () => {
    if (!updateModal || !updateStatut) return;
    try {
      await apiClient.put(`/impayes/promesses/${updateModal.promesse_id}`, {
        statut: updateStatut,
        montant_recu: updateMontant ? parseFloat(updateMontant) : undefined,
        commentaire: updateComment || undefined,
      });
      setUpdateModal(null);
      setUpdateStatut('');
      setUpdateMontant('');
      setUpdateComment('');
      loadPromesses();
      loadStats();
    } catch (err: any) {
      alert('Erreur: ' + (err.message || 'Erreur MAJ'));
    }
  };

  const handleVerifierEchues = async () => {
    try {
      const data = await apiClient.post<any>('/impayes/promesses/verifier-echues', {});
      if (data.count > 0) {
        alert(`${data.count} promesse(s) marquee(s) comme non tenue(s)`);
        loadPromesses();
        loadStats();
      } else {
        alert('Aucune promesse echue');
      }
    } catch (err: any) {
      alert('Erreur: ' + err.message);
    }
  };

  const handlePrintPromesses = () => {
    const date = new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });
    const fmt = (n: number) => n.toLocaleString('fr-FR');

    const statsByStatut = Object.entries(STATUT_CONFIG).map(([key, cfg]) => {
      const items = promesses.filter(p => p.statut === key);
      const montant = items.reduce((s, p) => s + p.montant_promis, 0);
      return { key, label: cfg.label, color: cfg.color, count: items.length, montant };
    });

    const kpis = stats ? `
      <div class="kpi-grid">
        <div class="kpi"><div class="kpi-label">Total promesses</div><div class="kpi-value" style="color:#3b82f6">${stats.total}</div></div>
        <div class="kpi"><div class="kpi-label">En attente</div><div class="kpi-value" style="color:#f59e0b">${stats.en_attente}</div></div>
        <div class="kpi"><div class="kpi-label">Tenues</div><div class="kpi-value" style="color:#22c55e">${stats.tenues}</div></div>
        <div class="kpi"><div class="kpi-label">Non tenues</div><div class="kpi-value" style="color:#ef4444">${stats.non_tenues}</div></div>
        <div class="kpi"><div class="kpi-label">Taux de tenue</div><div class="kpi-value" style="color:${stats.taux_tenue >= 50 ? '#22c55e' : '#ef4444'}">${stats.taux_tenue}%</div></div>
        <div class="kpi"><div class="kpi-label">Montant total promis</div><div class="kpi-value" style="color:#8b5cf6;font-size:16px">${fmt(stats.montant_total_promis)} FCFA</div></div>
        <div class="kpi"><div class="kpi-label">Montant total reçu</div><div class="kpi-value" style="color:#10b981;font-size:16px">${fmt(stats.montant_total_recu)} FCFA</div></div>
      </div>` : '';

    const rowsStatut = statsByStatut.map(s =>
      `<tr><td style="padding:8px 12px;border-bottom:1px solid #e2e8f0"><span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:${s.color};margin-right:8px"></span>${s.label}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #e2e8f0;text-align:center;font-weight:700">${s.count}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #e2e8f0;text-align:right">${fmt(s.montant)} FCFA</td></tr>`
    ).join('');

    const rows = promesses.map(p => {
      const sc = STATUT_CONFIG[p.statut] || STATUT_CONFIG.en_attente;
      const echeance = p.date_promesse ? new Date(p.date_promesse) : null;
      const isLate = echeance && p.statut === 'en_attente' && echeance < new Date();
      return `<tr>
        <td style="padding:6px 10px;border-bottom:1px solid #f1f5f9;font-size:11px">${p.ref_credit}</td>
        <td style="padding:6px 10px;border-bottom:1px solid #f1f5f9;font-size:11px">${p.nom_client || '—'}</td>
        <td style="padding:6px 10px;border-bottom:1px solid #f1f5f9;font-size:11px">
          <span style="display:inline-block;padding:2px 8px;border-radius:4px;background:${sc.color}20;color:${sc.color};font-weight:600">${sc.label}</span>
        </td>
        <td style="padding:6px 10px;border-bottom:1px solid #f1f5f9;font-size:11px;text-align:right;font-weight:700">${fmt(p.montant_promis)}</td>
        <td style="padding:6px 10px;border-bottom:1px solid #f1f5f9;font-size:11px;text-align:right;color:#22c55e">${p.montant_recu != null ? fmt(p.montant_recu) : '—'}</td>
        <td style="padding:6px 10px;border-bottom:1px solid #f1f5f9;font-size:11px;${isLate ? 'color:#ef4444;font-weight:700' : ''}">${p.date_promesse || '—'}</td>
        <td style="padding:6px 10px;border-bottom:1px solid #f1f5f9;font-size:11px;color:#64748b">${p.commentaire || '—'}</td>
      </tr>`;
    }).join('');

    const html = `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8">
<title>Rapport Promesses de Paiement — ${date}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Segoe UI', Arial, sans-serif; color: #1e293b; font-size: 12px; background: #fff; }
  .page { max-width: 1000px; margin: 0 auto; padding: 28px; }
  .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 3px solid #3b82f6; padding-bottom: 16px; margin-bottom: 24px; }
  .header h1 { font-size: 22px; font-weight: 800; color: #1e293b; }
  .header p { color: #64748b; font-size: 11px; margin-top: 4px; }
  .kpi-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-bottom: 24px; }
  .kpi { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 12px; text-align: center; }
  .kpi-label { font-size: 10px; color: #64748b; margin-bottom: 4px; text-transform: uppercase; letter-spacing: 0.5px; }
  .kpi-value { font-size: 20px; font-weight: 800; color: #1e293b; }
  .section { margin-bottom: 28px; }
  .section-title { font-size: 13px; font-weight: 700; color: #334155; padding: 8px 12px; background: #f1f5f9; border-left: 4px solid #3b82f6; margin-bottom: 0; }
  table { width: 100%; border-collapse: collapse; }
  thead { background: #f8fafc; }
  th { padding: 8px 12px; text-align: left; font-size: 10px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 2px solid #e2e8f0; }
  th.right { text-align: right; }
  th.center { text-align: center; }
  .footer { margin-top: 24px; padding-top: 12px; border-top: 1px solid #e2e8f0; text-align: center; color: #94a3b8; font-size: 10px; }
  @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } .page { padding: 16px; } }
</style></head><body><div class="page">
<div class="header">
  <div>
    <h1>Rapport des Promesses de Paiement</h1>
    <p>Imprimé le ${date} &nbsp;•&nbsp; ${promesses.length} promesse(s) affichée(s)${filtreStatut ? ` — filtre : ${STATUT_CONFIG[filtreStatut]?.label || filtreStatut}` : ''}</p>
  </div>
  ${stats ? `<div style="text-align:right">
    <div style="font-size:11px;color:#64748b">Taux de tenue</div>
    <div style="font-size:24px;font-weight:800;color:${stats.taux_tenue >= 50 ? '#22c55e' : '#ef4444'}">${stats.taux_tenue}%</div>
  </div>` : ''}
</div>

${kpis}

<div class="section">
  <div class="section-title">Répartition par statut</div>
  <table><thead><tr>
    <th>Statut</th><th class="center">Nombre</th><th class="right">Montant promis</th>
  </tr></thead><tbody>${rowsStatut}</tbody></table>
</div>

<div class="section">
  <div class="section-title">Détail des promesses</div>
  <table><thead><tr>
    <th>Réf. Crédit</th><th>Client</th><th>Statut</th>
    <th class="right">Promis (FCFA)</th><th class="right">Reçu (FCFA)</th>
    <th>Date promise</th><th>Commentaire</th>
  </tr></thead><tbody>${rows}</tbody></table>
</div>

<div class="footer">Rapport Promesses de Paiement &nbsp;•&nbsp; ${date}</div>
</div></body></html>`;

    const win = window.open('', '_blank');
    if (!win) return;
    win.document.write(html);
    win.document.close();
    win.onload = () => { win.focus(); win.print(); };
  };

  return (
    <div>
      {/* Stats Cards */}
      {stats && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '12px', marginBottom: '20px' }}>
          {[
            { label: 'Total', value: stats.total, color: '#3b82f6' },
            { label: 'En attente', value: stats.en_attente, color: '#f59e0b' },
            { label: 'Tenues', value: stats.tenues, color: '#22c55e' },
            { label: 'Non tenues', value: stats.non_tenues, color: '#ef4444' },
            { label: 'Taux de tenue', value: `${stats.taux_tenue}%`, color: stats.taux_tenue >= 50 ? '#22c55e' : '#ef4444' },
            { label: 'Montant promis', value: `${stats.montant_total_promis.toLocaleString()}`, color: '#8b5cf6' },
            { label: 'Montant recu', value: `${stats.montant_total_recu.toLocaleString()}`, color: '#10b981' },
          ].map((card) => (
            <div
              key={card.label}
              style={{
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '10px',
                padding: '14px',
                textAlign: 'center',
              }}
            >
              <div style={{ fontSize: '0.75rem', color: '#9ca3af', marginBottom: '4px' }}>{card.label}</div>
              <div style={{ fontSize: '1.3rem', fontWeight: '700', color: card.color }}>{card.value}</div>
            </div>
          ))}
        </div>
      )}

      {/* Actions */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
        <button
          onClick={() => setShowForm(!showForm)}
          style={{
            padding: '8px 18px',
            background: showForm ? 'rgba(255,255,255,0.1)' : 'linear-gradient(135deg, #3b82f6, #2563eb)',
            color: '#fff',
            border: 'none',
            borderRadius: '8px',
            fontWeight: '600',
            fontSize: '0.85rem',
            cursor: 'pointer',
          }}
        >
          {showForm ? 'Fermer' : '+ Nouvelle promesse'}
        </button>
        <button
          onClick={handleVerifierEchues}
          style={{
            padding: '8px 18px',
            background: 'linear-gradient(135deg, #f59e0b, #d97706)',
            color: '#fff',
            border: 'none',
            borderRadius: '8px',
            fontWeight: '600',
            fontSize: '0.85rem',
            cursor: 'pointer',
          }}
        >
          Verifier echues
        </button>
        <select
          value={filtreStatut}
          onChange={(e) => { setFiltreStatut(e.target.value); setPage(1); }}
          style={selectStyle}
        >
          <option value="" style={selectOptionStyle}>Tous les statuts</option>
          <option value="en_attente" style={selectOptionStyle}>En attente</option>
          <option value="tenue" style={selectOptionStyle}>Tenue</option>
          <option value="non_tenue" style={selectOptionStyle}>Non tenue</option>
          <option value="annulee" style={selectOptionStyle}>Annulee</option>
        </select>
        <button
          onClick={handlePrintPromesses}
          style={{
            padding: '8px 18px',
            background: 'rgba(239,68,68,0.15)',
            color: '#f87171',
            border: '1px solid rgba(239,68,68,0.3)',
            borderRadius: '8px',
            fontWeight: '600',
            fontSize: '0.85rem',
            cursor: 'pointer',
            marginLeft: 'auto',
          }}
        >
          🖨️ Imprimer rapport
        </button>
      </div>

      {/* Formulaire creation */}
      {showForm && (
        <form
          onSubmit={handleCreate}
          style={{
            background: 'rgba(59,130,246,0.08)',
            border: '1px solid rgba(59,130,246,0.3)',
            borderRadius: '12px',
            padding: '20px',
            marginBottom: '20px',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '12px',
          }}
        >
          <div>
            <label style={labelStyle}>Ref credit *</label>
            <input
              value={form.ref_credit}
              onChange={(e) => setForm({ ...form, ref_credit: e.target.value })}
              style={inputStyle}
              placeholder="REF-001"
              required
            />
          </div>
          <div>
            <label style={labelStyle}>Nom client</label>
            <input
              value={form.nom_client}
              onChange={(e) => setForm({ ...form, nom_client: e.target.value })}
              style={inputStyle}
              placeholder="Nom du client"
            />
          </div>
          <div>
            <label style={labelStyle}>Montant promis (FCFA) *</label>
            <input
              type="number"
              value={form.montant_promis}
              onChange={(e) => setForm({ ...form, montant_promis: e.target.value })}
              style={inputStyle}
              placeholder="500000"
              required
            />
          </div>
          <div>
            <label style={labelStyle}>Date promesse *</label>
            <input
              type="date"
              value={form.date_promesse}
              onChange={(e) => setForm({ ...form, date_promesse: e.target.value })}
              style={inputStyle}
              required
            />
          </div>
          <div style={{ gridColumn: '1 / -1' }}>
            <label style={labelStyle}>Commentaire</label>
            <input
              value={form.commentaire}
              onChange={(e) => setForm({ ...form, commentaire: e.target.value })}
              style={inputStyle}
              placeholder="Details..."
            />
          </div>
          <div style={{ gridColumn: '1 / -1' }}>
            <button
              type="submit"
              disabled={loading}
              style={{
                padding: '10px 24px',
                background: loading ? '#4b5563' : 'linear-gradient(135deg, #3b82f6, #2563eb)',
                color: '#fff',
                border: 'none',
                borderRadius: '8px',
                fontWeight: '600',
                cursor: loading ? 'not-allowed' : 'pointer',
              }}
            >
              {loading ? 'Enregistrement...' : 'Enregistrer'}
            </button>
          </div>
        </form>
      )}

      {error && (
        <div style={{ padding: '12px', background: 'rgba(239,68,68,0.15)', borderRadius: '8px', color: '#f87171', marginBottom: '12px' }}>
          {error}
        </div>
      )}

      {/* Tableau */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px', color: '#CBD5E1' }}>Chargement...</div>
      ) : promesses.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>Aucune promesse</div>
      ) : (
        <>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: 'rgba(255,255,255,0.05)' }}>
                  <th style={thStyle}>Statut</th>
                  <th style={thStyle}>Client</th>
                  <th style={thStyle}>Ref Credit</th>
                  <th style={thStyle}>Montant promis</th>
                  <th style={thStyle}>Montant recu</th>
                  <th style={thStyle}>Date promesse</th>
                  <th style={thStyle}>Date creation</th>
                  <th style={thStyle}>Commentaire</th>
                  <th style={{ ...thStyle, textAlign: 'center' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {promesses.map((p) => {
                  const sc = STATUT_CONFIG[p.statut] || STATUT_CONFIG.en_attente;
                  return (
                    <tr key={p.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                      <td style={tdStyle}>
                        <span
                          style={{
                            padding: '3px 10px',
                            borderRadius: '6px',
                            background: sc.bg,
                            color: sc.color,
                            fontWeight: '600',
                            fontSize: '0.8rem',
                          }}
                        >
                          {sc.label}
                        </span>
                      </td>
                      <td style={tdStyle}>{p.nom_client}</td>
                      <td style={{ ...tdStyle, fontSize: '0.8rem', color: '#9ca3af' }}>{p.ref_credit}</td>
                      <td style={{ ...tdStyle, fontWeight: '600' }}>{p.montant_promis.toLocaleString()} FCFA</td>
                      <td style={tdStyle}>
                        {p.montant_recu != null ? `${p.montant_recu.toLocaleString()} FCFA` : '—'}
                      </td>
                      <td style={tdStyle}>{p.date_promesse}</td>
                      <td style={{ ...tdStyle, fontSize: '0.8rem', color: '#9ca3af' }}>
                        {p.date_creation ? new Date(p.date_creation).toLocaleDateString('fr-FR') : ''}
                      </td>
                      <td style={{ ...tdStyle, maxWidth: '150px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {p.commentaire || '—'}
                      </td>
                      <td style={{ ...tdStyle, textAlign: 'center' }}>
                        {p.statut === 'en_attente' && (
                          <button
                            onClick={() => setUpdateModal(p)}
                            style={{
                              padding: '4px 12px',
                              background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
                              color: '#fff',
                              border: 'none',
                              borderRadius: '6px',
                              fontSize: '0.8rem',
                              fontWeight: '600',
                              cursor: 'pointer',
                            }}
                          >
                            MAJ
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {total > limit && (
            <Pagination
              currentPage={page}
              totalItems={total}
              itemsPerPage={limit}
              currentItemsCount={promesses.length}
              onPageChange={(p) => setPage(p)}
            />
          )}
        </>
      )}

      {/* Modal MAJ statut */}
      {updateModal && (
        <div
          style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.7)', display: 'flex',
            alignItems: 'center', justifyContent: 'center', zIndex: 9999,
          }}
          onClick={() => setUpdateModal(null)}
        >
          <div
            style={{
              background: '#1e293b', borderRadius: '16px', padding: '24px',
              maxWidth: '420px', width: '90%', border: '1px solid rgba(255,255,255,0.1)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ color: '#fff', margin: '0 0 16px 0' }}>
              Mettre a jour : {updateModal.nom_client}
            </h3>
            <p style={{ color: '#9ca3af', fontSize: '0.85rem', margin: '0 0 16px 0' }}>
              Promesse : {updateModal.montant_promis.toLocaleString()} FCFA pour le {updateModal.date_promesse}
            </p>
            <div style={{ marginBottom: '12px' }}>
              <label style={labelStyle}>Nouveau statut</label>
              <select
                value={updateStatut}
                onChange={(e) => setUpdateStatut(e.target.value)}
                style={{ ...selectStyle, width: '100%' }}
              >
                <option value="" style={selectOptionStyle}>Choisir...</option>
                <option value="tenue" style={selectOptionStyle}>Tenue</option>
                <option value="non_tenue" style={selectOptionStyle}>Non tenue</option>
                <option value="annulee" style={selectOptionStyle}>Annulee</option>
              </select>
            </div>
            {updateStatut === 'tenue' && (
              <div style={{ marginBottom: '12px' }}>
                <label style={labelStyle}>Montant recu (FCFA)</label>
                <input
                  type="number"
                  value={updateMontant}
                  onChange={(e) => setUpdateMontant(e.target.value)}
                  style={{ ...inputStyle, width: '100%' }}
                  placeholder={String(updateModal.montant_promis)}
                />
              </div>
            )}
            <div style={{ marginBottom: '16px' }}>
              <label style={labelStyle}>Commentaire</label>
              <input
                value={updateComment}
                onChange={(e) => setUpdateComment(e.target.value)}
                style={{ ...inputStyle, width: '100%' }}
                placeholder="Note..."
              />
            </div>
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setUpdateModal(null)}
                style={{ padding: '8px 20px', background: 'rgba(255,255,255,0.1)', color: '#CBD5E1', border: 'none', borderRadius: '8px', cursor: 'pointer' }}
              >
                Annuler
              </button>
              <button
                onClick={handleUpdateStatut}
                disabled={!updateStatut}
                style={{
                  padding: '8px 20px',
                  background: !updateStatut ? '#4b5563' : 'linear-gradient(135deg, #3b82f6, #2563eb)',
                  color: '#fff', border: 'none', borderRadius: '8px', fontWeight: '600',
                  cursor: !updateStatut ? 'not-allowed' : 'pointer',
                }}
              >
                Confirmer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const labelStyle: React.CSSProperties = { color: '#CBD5E1', fontSize: '0.8rem', display: 'block', marginBottom: '4px' };
const inputStyle: React.CSSProperties = {
  padding: '8px 12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.2)',
  background: 'rgba(255,255,255,0.05)', color: '#fff', fontSize: '0.85rem', width: '100%',
};
const selectStyle: React.CSSProperties = {
  padding: '8px 12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.2)',
  background: 'rgba(255,255,255,0.05)', color: '#fff', fontSize: '0.85rem', cursor: 'pointer',
};
const selectOptionStyle: React.CSSProperties = {
  background: '#1e293b',
  color: '#fff',
};
const thStyle: React.CSSProperties = {
  padding: '10px 12px', textAlign: 'left', color: '#CBD5E1', fontSize: '0.8rem',
  fontWeight: '600', borderBottom: '1px solid rgba(255,255,255,0.1)',
};
const tdStyle: React.CSSProperties = { padding: '10px 12px', color: '#CBD5E1', fontSize: '0.85rem' };

export default PromessesTab;
