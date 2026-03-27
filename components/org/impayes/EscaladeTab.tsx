'use client';

import React, { useState, useEffect } from 'react';
import { apiClient } from '@/lib/api/client';
import Pagination from '@/components/common/Pagination';

interface EscaladeDossier {
  ref_credit: string;
  nom_client: string;
  niveau_actuel: string;
  niveau_label: string;
  niveau_couleur: string;
  date_escalade: string;
  jours_retard: number;
  montant_impaye: number;
  agence: string;
  segment: string;
  telephone: string;
  agent_attribue?: string;
  agent_nom?: string;
  responsable_escalade?: string;
  historique_escalade: any[];
  prochaine_escalade?: string;
  jours_avant_prochaine?: number;
}

interface NiveauConfig {
  niveau: string;
  label: string;
  description: string;
  jours_declenchement: number;
  actions_auto: string[];
  couleur: string;
}

const NIVEAU_ICONS: Record<string, string> = {
  relance_1: '📨',
  relance_2: '📞',
  mise_en_demeure: '⚠️',
  contentieux: '⚖️',
};

const EscaladeTab = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [dossiers, setDossiers] = useState<EscaladeDossier[]>([]);
  const [total, setTotal] = useState(0);
  const [statsNiveaux, setStatsNiveaux] = useState<Record<string, number>>({});
  const [niveauxConfig, setNiveauxConfig] = useState<NiveauConfig[]>([]);
  const [page, setPage] = useState(1);
  const limit = 20;

  const [filtreNiveau, setFiltreNiveau] = useState('');
  const [filtreAgence, setFiltreAgence] = useState('');
  const [expandedDossier, setExpandedDossier] = useState<string | null>(null);
  const [showRapport, setShowRapport] = useState(false);

  // Modal escalade manuelle
  const [escaladeModal, setEscaladeModal] = useState<EscaladeDossier | null>(null);
  const [nouveauNiveau, setNouveauNiveau] = useState('');
  const [commentaire, setCommentaire] = useState('');

  // Modal promesse de paiement
  const [promesseModal, setPromesseModal] = useState<EscaladeDossier | null>(null);
  const [promesseMontant, setPromesseMontant] = useState('');
  const [promesseDate, setPromesseDate] = useState('');
  const [promesseComment, setPromesseComment] = useState('');
  const [promesseSaving, setPromesseSaving] = useState(false);
  const [promesseSuccess, setPromesseSuccess] = useState('');

  // Modal SMS de rappel
  const [smsModal, setSmsModal] = useState<EscaladeDossier | null>(null);
  const [smsMessage, setSmsMessage] = useState('');
  const [smsSaving, setSmsSaving] = useState(false);
  const [smsSuccess, setSmsSuccess] = useState('');

  useEffect(() => {
    loadDossiers();
  }, [page, filtreNiveau, filtreAgence]);

  const loadDossiers = async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      if (filtreNiveau) params.set('niveau', filtreNiveau);
      if (filtreAgence) params.set('agence', filtreAgence);
      params.set('limit', String(limit));
      params.set('skip', String((page - 1) * limit));

      const data = await apiClient.get<any>(`/impayes/escalade/dossiers?${params}`);
      setDossiers(data.dossiers || []);
      setTotal(data.total || 0);
      setStatsNiveaux(data.stats_niveaux || {});
      setNiveauxConfig(data.niveaux_config || []);
    } catch (err: any) {
      setError(err.message || 'Erreur chargement');
    } finally {
      setLoading(false);
    }
  };

  const handleEscalade = async () => {
    if (!escaladeModal || !nouveauNiveau) return;
    try {
      await apiClient.post('/impayes/escalade/action', {
        ref_credit: escaladeModal.ref_credit,
        nouveau_niveau: nouveauNiveau,
        commentaire: commentaire || undefined,
      });
      setEscaladeModal(null);
      setNouveauNiveau('');
      setCommentaire('');
      loadDossiers();
    } catch (err: any) {
      alert('Erreur: ' + (err.message || 'Erreur escalade'));
    }
  };

  const handlePromesse = async () => {
    if (!promesseModal || !promesseMontant || !promesseDate) return;
    setPromesseSaving(true);
    try {
      await apiClient.post('/impayes/promesses', {
        ref_credit: promesseModal.ref_credit,
        nom_client: promesseModal.nom_client,
        montant_promis: parseFloat(promesseMontant),
        date_promesse: promesseDate,
        commentaire: promesseComment || undefined,
      });
      setPromesseSuccess('Promesse enregistrée ✓');
      setTimeout(() => {
        setPromesseModal(null);
        setPromesseMontant('');
        setPromesseDate('');
        setPromesseComment('');
        setPromesseSuccess('');
      }, 1500);
    } catch (err: any) {
      alert('Erreur : ' + (err.message || 'Erreur création promesse'));
    } finally {
      setPromesseSaving(false);
    }
  };

  const formatMontantSms = (n: number) => {
    return Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  };

  const getDefaultSmsMessage = (d: EscaladeDossier) => {
    return `Cher(e) ${d.nom_client}, votre credit ${d.ref_credit} presente un retard de ${d.jours_retard} jours pour un montant de ${formatMontantSms(d.montant_impaye)} FCFA. Merci de regulariser votre situation au plus vite ou de contacter votre agence ${d.agence}.`;
  };

  const handleSmsRappel = async () => {
    if (!smsModal || !smsMessage) return;
    setSmsSaving(true);
    try {
      const res = await apiClient.post<any>('/impayes/escalade/sms-rappel', {
        ref_credit: smsModal.ref_credit,
        nom_client: smsModal.nom_client,
        telephone: smsModal.telephone,
        message: smsMessage,
        niveau_actuel: smsModal.niveau_actuel,
      });
      if (res.success === false) {
        alert('Erreur : ' + (res.message || "Échec de l'envoi SMS"));
      } else {
        setSmsSuccess('SMS envoyé avec succès ✓');
        setTimeout(() => {
          setSmsModal(null);
          setSmsMessage('');
          setSmsSuccess('');
        }, 2000);
      }
    } catch (err: any) {
      alert('Erreur : ' + (err.message || "Échec de l'envoi SMS"));
    } finally {
      setSmsSaving(false);
    }
  };

  // ── Calculs reporting ────────────────────────────────────────
  const reportParNiveau = niveauxConfig.map(niv => {
    const items = dossiers.filter(d => d.niveau_actuel === niv.niveau);
    return {
      niveau: niv.niveau,
      label: niv.label,
      couleur: niv.couleur,
      count: items.length,
      montant: items.reduce((s, d) => s + d.montant_impaye, 0),
      jours_moy: items.length ? Math.round(items.reduce((s, d) => s + d.jours_retard, 0) / items.length) : 0,
    };
  });

  const reportParResponsable = Object.values(
    dossiers.reduce((acc, d) => {
      const key = d.responsable_escalade || 'Non défini';
      if (!acc[key]) acc[key] = { responsable: key, count: 0, montant: 0, niveaux: new Set<string>() };
      acc[key].count++;
      acc[key].montant += d.montant_impaye;
      acc[key].niveaux.add(d.niveau_label);
      return acc;
    }, {} as Record<string, { responsable: string; count: number; montant: number; niveaux: Set<string> }>)
  ).sort((a, b) => b.count - a.count);

  const handlePrintRapport = () => {
    const date = new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });
    const totalDossiers = dossiers.length;
    const totalMontant = dossiers.reduce((s, d) => s + d.montant_impaye, 0);
    const fmt = (n: number) => n.toLocaleString('fr-FR');

    const rowsNiveau = reportParNiveau.map(r =>
      `<tr><td style="padding:8px 12px;border-bottom:1px solid #e2e8f0;">
        <span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:${r.couleur};margin-right:8px"></span>${r.label}
      </td><td style="padding:8px 12px;border-bottom:1px solid #e2e8f0;text-align:center;font-weight:700">${r.count}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #e2e8f0;text-align:right">${fmt(r.montant)} FCFA</td>
      <td style="padding:8px 12px;border-bottom:1px solid #e2e8f0;text-align:center">${r.jours_moy}j</td></tr>`
    ).join('');

    const rowsResp = reportParResponsable.map(r =>
      `<tr><td style="padding:8px 12px;border-bottom:1px solid #e2e8f0;font-weight:600">${r.responsable}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #e2e8f0;text-align:center;font-weight:700">${r.count}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #e2e8f0;text-align:right">${fmt(r.montant)} FCFA</td>
      <td style="padding:8px 12px;border-bottom:1px solid #e2e8f0;font-size:11px;color:#64748b">${[...r.niveaux].join(', ')}</td></tr>`
    ).join('');

    const rowsDossiers = dossiers.map(d =>
      `<tr><td style="padding:6px 10px;border-bottom:1px solid #f1f5f9;font-size:11px">${d.ref_credit}</td>
      <td style="padding:6px 10px;border-bottom:1px solid #f1f5f9;font-size:11px">${d.nom_client}</td>
      <td style="padding:6px 10px;border-bottom:1px solid #f1f5f9;font-size:11px;color:${d.niveau_couleur};font-weight:600">${d.niveau_label}</td>
      <td style="padding:6px 10px;border-bottom:1px solid #f1f5f9;font-size:11px;text-align:center;color:#ef4444;font-weight:700">${d.jours_retard}j</td>
      <td style="padding:6px 10px;border-bottom:1px solid #f1f5f9;font-size:11px;text-align:right">${fmt(d.montant_impaye)}</td>
      <td style="padding:6px 10px;border-bottom:1px solid #f1f5f9;font-size:11px">${d.agence}</td>
      <td style="padding:6px 10px;border-bottom:1px solid #f1f5f9;font-size:11px;color:#d97706">${d.responsable_escalade || '—'}</td></tr>`
    ).join('');

    const html = `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8">
<title>Rapport Escalade — ${date}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Segoe UI', Arial, sans-serif; color: #1e293b; font-size: 12px; background: #fff; }
  .page { max-width: 1000px; margin: 0 auto; padding: 28px; }
  .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 3px solid #ef4444; padding-bottom: 16px; margin-bottom: 24px; }
  .header h1 { font-size: 22px; font-weight: 800; color: #1e293b; }
  .header p { color: #64748b; font-size: 11px; margin-top: 4px; }
  .kpi-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 24px; }
  .kpi { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 14px; text-align: center; }
  .kpi-label { font-size: 10px; color: #64748b; margin-bottom: 4px; text-transform: uppercase; letter-spacing: 0.5px; }
  .kpi-value { font-size: 22px; font-weight: 800; color: #1e293b; }
  .section { margin-bottom: 28px; }
  .section-title { font-size: 13px; font-weight: 700; color: #334155; padding: 8px 12px; background: #f1f5f9; border-left: 4px solid #ef4444; margin-bottom: 0; }
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
    <h1>Rapport d'Escalade des Impayés</h1>
    <p>Imprimé le ${date} &nbsp;•&nbsp; ${totalDossiers} dossiers en escalade</p>
  </div>
  <div style="text-align:right">
    <div style="font-size:11px;color:#64748b">Montant total impayé</div>
    <div style="font-size:20px;font-weight:800;color:#ef4444">${fmt(totalMontant)} FCFA</div>
  </div>
</div>

<div class="kpi-grid">
  ${reportParNiveau.map(r => `<div class="kpi"><div class="kpi-label" style="color:${r.couleur}">${r.label}</div><div class="kpi-value" style="color:${r.couleur}">${r.count}</div><div style="font-size:10px;color:#94a3b8">${fmt(r.montant)} FCFA</div></div>`).join('')}
</div>

<div class="section">
  <div class="section-title">Répartition par niveau d'escalade</div>
  <table><thead><tr>
    <th>Niveau</th><th class="center">Dossiers</th><th class="right">Montant impayé</th><th class="center">Retard moyen</th>
  </tr></thead><tbody>${rowsNiveau}</tbody></table>
</div>

<div class="section">
  <div class="section-title">Répartition par responsable</div>
  <table><thead><tr>
    <th>Responsable</th><th class="center">Dossiers</th><th class="right">Montant impayé</th><th>Niveaux concernés</th>
  </tr></thead><tbody>${rowsResp}</tbody></table>
</div>

<div class="section">
  <div class="section-title">Détail des dossiers</div>
  <table><thead><tr>
    <th>Réf. Crédit</th><th>Client</th><th>Niveau</th><th class="center">Retard</th><th class="right">Montant (FCFA)</th><th>Agence</th><th>Responsable</th>
  </tr></thead><tbody>${rowsDossiers}</tbody></table>
</div>

<div class="footer">Rapport Escalade Impayés &nbsp;•&nbsp; ${date}</div>
</div></body></html>`;

    const win = window.open('', '_blank');
    if (!win) return;
    win.document.write(html);
    win.document.close();
    win.onload = () => { win.focus(); win.print(); };
  };

  const agences = [...new Set(dossiers.map((d) => d.agence))].sort();

  return (
    <div style={{ padding: '0' }}>
      {/* Workflow visuel */}
      <div
        style={{
          display: 'flex',
          gap: '12px',
          marginBottom: '24px',
          flexWrap: 'wrap',
        }}
      >
        {niveauxConfig.map((niv, idx) => {
          const count = statsNiveaux[niv.niveau] || 0;
          const isActive = filtreNiveau === niv.niveau;
          return (
            <div
              key={niv.niveau}
              onClick={() => setFiltreNiveau(isActive ? '' : niv.niveau)}
              style={{
                flex: '1 1 180px',
                background: isActive
                  ? `${niv.couleur}30`
                  : 'rgba(255,255,255,0.05)',
                border: `2px solid ${isActive ? niv.couleur : 'rgba(255,255,255,0.1)'}`,
                borderRadius: '12px',
                padding: '16px',
                cursor: 'pointer',
                transition: 'all 0.2s',
                position: 'relative',
                overflow: 'hidden',
              }}
            >
              {idx < niveauxConfig.length - 1 && (
                <div
                  style={{
                    position: 'absolute',
                    right: '-8px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    fontSize: '20px',
                    color: '#6b7280',
                    zIndex: 1,
                  }}
                >
                  →
                </div>
              )}
              <div style={{ fontSize: '24px', marginBottom: '8px' }}>
                {NIVEAU_ICONS[niv.niveau] || '📋'}
              </div>
              <div style={{ fontWeight: '700', color: niv.couleur, fontSize: '0.95rem' }}>
                {niv.label}
              </div>
              <div style={{ color: '#CBD5E1', fontSize: '0.8rem', marginTop: '4px' }}>
                {niv.description}
              </div>
              <div
                style={{
                  marginTop: '8px',
                  fontSize: '1.5rem',
                  fontWeight: '800',
                  color: '#fff',
                }}
              >
                {count}
              </div>
              <div style={{ color: '#9ca3af', fontSize: '0.75rem' }}>
                dossier{count > 1 ? 's' : ''}
              </div>
              <div
                style={{
                  marginTop: '6px',
                  fontSize: '0.7rem',
                  color: '#6b7280',
                  background: 'rgba(255,255,255,0.05)',
                  padding: '2px 8px',
                  borderRadius: '4px',
                  display: 'inline-block',
                }}
              >
                +{niv.jours_declenchement}j retard
              </div>
            </div>
          );
        })}
      </div>

      {/* Filtres */}
      <div
        style={{
          display: 'flex',
          gap: '12px',
          marginBottom: '16px',
          flexWrap: 'wrap',
          alignItems: 'center',
        }}
      >
        <select
          value={filtreAgence}
          onChange={(e) => {
            setFiltreAgence(e.target.value);
            setPage(1);
          }}
          style={selectStyles}
        >
          <option value="" style={selectOptionStyle}>Toutes les agences</option>
          {agences.map((a) => (
            <option key={a} value={a} style={selectOptionStyle}>
              {a}
            </option>
          ))}
        </select>
        <span style={{ color: '#9ca3af', fontSize: '0.85rem' }}>
          {total} dossier{total > 1 ? 's' : ''}
        </span>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px' }}>
          <button
            onClick={() => setShowRapport(!showRapport)}
            style={{
              padding: '7px 16px',
              background: showRapport ? 'linear-gradient(135deg,#6366f1,#4f46e5)' : 'rgba(99,102,241,0.15)',
              color: showRapport ? '#fff' : '#a5b4fc',
              border: `1px solid ${showRapport ? 'transparent' : 'rgba(99,102,241,0.3)'}`,
              borderRadius: '8px',
              fontSize: '0.82rem',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
          >
            📊 {showRapport ? 'Masquer rapport' : 'Voir rapport'}
          </button>
          <button
            onClick={handlePrintRapport}
            style={{
              padding: '7px 16px',
              background: 'rgba(239,68,68,0.15)',
              color: '#f87171',
              border: '1px solid rgba(239,68,68,0.3)',
              borderRadius: '8px',
              fontSize: '0.82rem',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
          >
            🖨️ Imprimer
          </button>
        </div>
      </div>

      {/* Section reporting */}
      {showRapport && dossiers.length > 0 && (
        <div style={{ marginBottom: '24px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: '14px', padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
            <h3 style={{ color: '#a5b4fc', margin: 0, fontSize: '1rem', fontWeight: '700' }}>📊 Rapport d'escalade</h3>
            <span style={{ color: '#64748b', fontSize: '0.78rem' }}>{dossiers.length} dossiers — {dossiers.reduce((s,d) => s + d.montant_impaye, 0).toLocaleString('fr-FR')} FCFA</span>
          </div>

          {/* KPI par niveau */}
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '20px' }}>
            {reportParNiveau.filter(r => r.count > 0).map(r => (
              <div key={r.niveau} style={{ flex: '1 1 140px', background: `${r.couleur}10`, border: `1px solid ${r.couleur}40`, borderRadius: '10px', padding: '12px 14px' }}>
                <div style={{ fontSize: '10px', color: r.couleur, fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>{r.label}</div>
                <div style={{ fontSize: '1.6rem', fontWeight: '800', color: '#fff', lineHeight: 1 }}>{r.count}</div>
                <div style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '4px' }}>{r.montant.toLocaleString('fr-FR')} FCFA</div>
                <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>Retard moy. {r.jours_moy}j</div>
              </div>
            ))}
          </div>

          {/* Tables côte à côte */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            {/* Par niveau */}
            <div>
              <div style={{ fontSize: '0.78rem', fontWeight: '700', color: '#94a3b8', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Répartition par niveau</div>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
                <thead>
                  <tr style={{ background: 'rgba(255,255,255,0.04)' }}>
                    <th style={{ padding: '6px 10px', color: '#64748b', fontWeight: '600', textAlign: 'left', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>Niveau</th>
                    <th style={{ padding: '6px 10px', color: '#64748b', fontWeight: '600', textAlign: 'center', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>Nb</th>
                    <th style={{ padding: '6px 10px', color: '#64748b', fontWeight: '600', textAlign: 'right', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>Montant</th>
                    <th style={{ padding: '6px 10px', color: '#64748b', fontWeight: '600', textAlign: 'center', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>Moy.</th>
                  </tr>
                </thead>
                <tbody>
                  {reportParNiveau.map(r => (
                    <tr key={r.niveau} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                      <td style={{ padding: '7px 10px', color: r.couleur, fontWeight: '600' }}>
                        <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', background: r.couleur, marginRight: '6px' }} />
                        {r.label}
                      </td>
                      <td style={{ padding: '7px 10px', textAlign: 'center', fontWeight: '700', color: '#fff' }}>{r.count}</td>
                      <td style={{ padding: '7px 10px', textAlign: 'right', color: '#CBD5E1', fontSize: '0.75rem' }}>{r.montant.toLocaleString('fr-FR')}</td>
                      <td style={{ padding: '7px 10px', textAlign: 'center', color: '#94a3b8', fontSize: '0.75rem' }}>{r.jours_moy}j</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Par responsable */}
            <div>
              <div style={{ fontSize: '0.78rem', fontWeight: '700', color: '#94a3b8', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Répartition par responsable</div>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
                <thead>
                  <tr style={{ background: 'rgba(255,255,255,0.04)' }}>
                    <th style={{ padding: '6px 10px', color: '#64748b', fontWeight: '600', textAlign: 'left', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>Responsable</th>
                    <th style={{ padding: '6px 10px', color: '#64748b', fontWeight: '600', textAlign: 'center', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>Nb</th>
                    <th style={{ padding: '6px 10px', color: '#64748b', fontWeight: '600', textAlign: 'right', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>Montant</th>
                  </tr>
                </thead>
                <tbody>
                  {reportParResponsable.map((r, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                      <td style={{ padding: '7px 10px', color: '#CBD5E1', fontWeight: '600' }}>
                        {r.responsable}
                        <div style={{ fontSize: '0.68rem', color: '#64748b', marginTop: '1px' }}>{[...r.niveaux].join(', ')}</div>
                      </td>
                      <td style={{ padding: '7px 10px', textAlign: 'center', fontWeight: '700', color: '#fff' }}>{r.count}</td>
                      <td style={{ padding: '7px 10px', textAlign: 'right', color: '#CBD5E1', fontSize: '0.75rem' }}>{r.montant.toLocaleString('fr-FR')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {error && (
        <div
          style={{
            padding: '12px',
            background: 'rgba(239,68,68,0.15)',
            borderRadius: '8px',
            color: '#f87171',
            marginBottom: '16px',
          }}
        >
          {error}
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px', color: '#CBD5E1' }}>
          Chargement...
        </div>
      ) : dossiers.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>
          Aucun dossier
        </div>
      ) : (
        <>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: 'rgba(255,255,255,0.05)' }}>
                  <th style={thStyle}>Niveau</th>
                  <th style={thStyle}>Client</th>
                  <th style={thStyle}>Ref Credit</th>
                  <th style={thStyle}>Montant</th>
                  <th style={thStyle}>Retard</th>
                  <th style={thStyle}>Agence</th>
                  <th style={thStyle}>Agent</th>
                  <th style={thStyle}>Prochaine</th>
                  <th style={{ ...thStyle, textAlign: 'center' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {dossiers.map((d) => (
                  <React.Fragment key={d.ref_credit}>
                    <tr
                      style={{
                        borderBottom: '1px solid rgba(255,255,255,0.05)',
                        cursor: 'pointer',
                      }}
                      onClick={() =>
                        setExpandedDossier(
                          expandedDossier === d.ref_credit ? null : d.ref_credit
                        )
                      }
                    >
                      <td style={tdStyle}>
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            padding: '4px 10px',
                            borderRadius: '6px',
                            background: `${d.niveau_couleur}20`,
                            border: `1px solid ${d.niveau_couleur}50`,
                            color: d.niveau_couleur,
                            fontWeight: '600',
                            fontSize: '0.8rem',
                          }}
                        >
                          {NIVEAU_ICONS[d.niveau_actuel] || ''} {d.niveau_label}
                        </span>
                      </td>
                      <td style={tdStyle}>{d.nom_client}</td>
                      <td style={{ ...tdStyle, fontSize: '0.8rem', color: '#9ca3af' }}>
                        {d.ref_credit}
                      </td>
                      <td style={{ ...tdStyle, fontWeight: '600' }}>
                        {d.montant_impaye.toLocaleString()} FCFA
                      </td>
                      <td
                        style={{
                          ...tdStyle,
                          color: d.jours_retard > 90 ? '#ef4444' : d.jours_retard > 30 ? '#f59e0b' : '#22c55e',
                          fontWeight: '700',
                        }}
                      >
                        {d.jours_retard}j
                      </td>
                      <td style={tdStyle}>{d.agence}</td>
                      <td style={tdStyle}>
                        {d.responsable_escalade ? (
                          <span style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                            <span style={{ fontWeight: '600', color: '#CBD5E1' }}>
                              {d.responsable_escalade}
                            </span>
                            {d.agent_nom && (
                              <span style={{ fontSize: '0.72rem', color: '#64748b' }}>
                                Attribué : {d.agent_nom}
                              </span>
                            )}
                          </span>
                        ) : d.agent_nom ? (
                          <span style={{ fontWeight: '600', color: '#CBD5E1' }}>{d.agent_nom}</span>
                        ) : (
                          <span style={{ color: '#6b7280', fontStyle: 'italic' }}>Non défini</span>
                        )}
                      </td>
                      <td style={{ ...tdStyle, fontSize: '0.8rem' }}>
                        {d.prochaine_escalade ? (
                          <span style={{ color: '#f59e0b' }}>
                            {d.prochaine_escalade} ({d.jours_avant_prochaine}j)
                          </span>
                        ) : (
                          <span style={{ color: '#6b7280' }}>Niveau max</span>
                        )}
                      </td>
                      <td style={{ ...tdStyle, textAlign: 'center' }}>
                        <div style={{ display: 'flex', gap: '6px', justifyContent: 'center', flexWrap: 'wrap' }}>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setEscaladeModal(d);
                            }}
                            style={{
                              padding: '4px 10px',
                              background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                              color: '#fff',
                              border: 'none',
                              borderRadius: '6px',
                              fontSize: '0.78rem',
                              fontWeight: '600',
                              cursor: 'pointer',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            ⬆ Escalader
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSmsModal(d);
                              setSmsMessage(getDefaultSmsMessage(d));
                              setSmsSuccess('');
                            }}
                            disabled={!d.telephone}
                            style={{
                              padding: '4px 10px',
                              background: !d.telephone ? '#374151' : 'linear-gradient(135deg, #3b82f6, #2563eb)',
                              color: '#fff',
                              border: 'none',
                              borderRadius: '6px',
                              fontSize: '0.78rem',
                              fontWeight: '600',
                              cursor: !d.telephone ? 'not-allowed' : 'pointer',
                              whiteSpace: 'nowrap',
                              opacity: !d.telephone ? 0.5 : 1,
                            }}
                            title={!d.telephone ? 'Pas de numéro de téléphone' : 'Envoyer un SMS de rappel'}
                          >
                            💬 SMS
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setPromesseModal(d);
                              setPromesseMontant('');
                              setPromesseDate('');
                              setPromesseComment('');
                              setPromesseSuccess('');
                            }}
                            style={{
                              padding: '4px 10px',
                              background: 'linear-gradient(135deg, #22c55e, #16a34a)',
                              color: '#fff',
                              border: 'none',
                              borderRadius: '6px',
                              fontSize: '0.78rem',
                              fontWeight: '600',
                              cursor: 'pointer',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            🤝 Promesse
                          </button>
                        </div>
                      </td>
                    </tr>
                    {expandedDossier === d.ref_credit && (
                      <tr>
                        <td colSpan={9} style={{ padding: '16px', background: 'rgba(255,255,255,0.02)' }}>
                          <div
                            style={{
                              display: 'grid',
                              gridTemplateColumns: '1fr 1fr',
                              gap: '16px',
                            }}
                          >
                            <div>
                              <h4 style={{ color: '#CBD5E1', margin: '0 0 8px 0', fontSize: '0.9rem' }}>
                                Informations
                              </h4>
                              <div style={{ fontSize: '0.85rem', color: '#9ca3af', lineHeight: '1.8' }}>
                                <div>Segment : {d.segment}</div>
                                <div>Téléphone : {d.telephone || 'N/A'}</div>
                                <div>Date situation : {d.date_escalade}</div>
                                {d.responsable_escalade && (
                                  <div style={{ marginTop: '4px' }}>
                                    <span style={{ color: '#CBD5E1', fontWeight: '600' }}>Responsable escalade : </span>
                                    <span style={{ color: '#f59e0b', fontWeight: '700' }}>{d.responsable_escalade}</span>
                                    <span style={{ fontSize: '0.7rem', color: '#64748b', marginLeft: '6px' }}>(selon paramétrage)</span>
                                  </div>
                                )}
                                {d.agent_nom && (
                                  <div>
                                    <span style={{ color: '#CBD5E1' }}>Agent portefeuille : </span>
                                    {d.agent_nom}
                                  </div>
                                )}
                              </div>
                            </div>
                            <div>
                              <h4 style={{ color: '#CBD5E1', margin: '0 0 8px 0', fontSize: '0.9rem' }}>
                                Historique escalade
                              </h4>
                              {d.historique_escalade.length === 0 ? (
                                <div style={{ color: '#6b7280', fontSize: '0.85rem' }}>
                                  Aucun historique (escalade automatique)
                                </div>
                              ) : (
                                <div style={{ maxHeight: '150px', overflowY: 'auto' }}>
                                  {d.historique_escalade.map((h: any, i: number) => (
                                    <div
                                      key={i}
                                      style={{
                                        padding: '6px 10px',
                                        marginBottom: '4px',
                                        background: 'rgba(255,255,255,0.05)',
                                        borderRadius: '6px',
                                        fontSize: '0.8rem',
                                        color: '#CBD5E1',
                                      }}
                                    >
                                      <span style={{ fontWeight: '600' }}>{h.niveau}</span>
                                      {' — '}
                                      <span style={{ color: '#9ca3af' }}>
                                        {h.date ? new Date(h.date).toLocaleDateString('fr-FR') : ''}
                                      </span>
                                      {h.commentaire && (
                                        <div style={{ color: '#6b7280', marginTop: '2px' }}>
                                          {h.commentaire}
                                        </div>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>

          {total > limit && (
            <Pagination
              currentPage={page}
              totalItems={total}
              itemsPerPage={limit}
              currentItemsCount={dossiers.length}
              onPageChange={(p) => setPage(p)}
            />
          )}
        </>
      )}

      {/* Modal promesse de paiement */}
      {promesseModal && (
        <div
          style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}
          onClick={() => setPromesseModal(null)}
        >
          <div
            style={{ background: '#0f172a', borderRadius: '20px', padding: '28px', maxWidth: '460px', width: '90%', border: '1px solid rgba(34,197,94,0.25)', boxShadow: '0 25px 60px rgba(0,0,0,0.5)' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* En-tête */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'linear-gradient(135deg,#22c55e,#16a34a)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' }}>🤝</div>
              <div>
                <h3 style={{ color: '#fff', margin: 0, fontSize: '1.05rem', fontWeight: '700' }}>Saisir une promesse de paiement</h3>
                <p style={{ color: '#64748b', margin: '2px 0 0 0', fontSize: '0.8rem' }}>{promesseModal.nom_client} — {promesseModal.ref_credit}</p>
              </div>
            </div>

            {/* Contexte dossier */}
            <div style={{ padding: '10px 14px', background: 'rgba(255,255,255,0.04)', borderRadius: '10px', marginBottom: '18px', display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
              <div style={{ fontSize: '0.78rem', color: '#94a3b8' }}>
                <div style={{ color: '#64748b', marginBottom: '2px' }}>Niveau</div>
                <span style={{ color: promesseModal.niveau_couleur, fontWeight: '700' }}>{promesseModal.niveau_label}</span>
              </div>
              <div style={{ fontSize: '0.78rem', color: '#94a3b8' }}>
                <div style={{ color: '#64748b', marginBottom: '2px' }}>Retard</div>
                <span style={{ color: '#ef4444', fontWeight: '700' }}>{promesseModal.jours_retard}j</span>
              </div>
              <div style={{ fontSize: '0.78rem', color: '#94a3b8' }}>
                <div style={{ color: '#64748b', marginBottom: '2px' }}>Montant impayé</div>
                <span style={{ fontWeight: '700', color: '#fff' }}>{promesseModal.montant_impaye.toLocaleString('fr-FR')} FCFA</span>
              </div>
            </div>

            {promesseSuccess ? (
              <div style={{ textAlign: 'center', padding: '24px', color: '#22c55e', fontSize: '1.1rem', fontWeight: '700' }}>
                ✓ {promesseSuccess}
              </div>
            ) : (
              <>
                {/* Montant */}
                <div style={{ marginBottom: '14px' }}>
                  <label style={{ display: 'block', color: '#CBD5E1', fontSize: '0.82rem', fontWeight: '600', marginBottom: '6px' }}>
                    Montant promis <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={promesseMontant}
                    onChange={(e) => setPromesseMontant(e.target.value)}
                    placeholder={`Max: ${promesseModal.montant_impaye.toLocaleString('fr-FR')} FCFA`}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', border: '1px solid rgba(34,197,94,0.3)', background: 'rgba(34,197,94,0.05)', color: '#fff', fontSize: '0.9rem', boxSizing: 'border-box' }}
                  />
                </div>

                {/* Date */}
                <div style={{ marginBottom: '14px' }}>
                  <label style={{ display: 'block', color: '#CBD5E1', fontSize: '0.82rem', fontWeight: '600', marginBottom: '6px' }}>
                    Date de paiement promise <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <input
                    type="date"
                    value={promesseDate}
                    min={new Date().toISOString().split('T')[0]}
                    onChange={(e) => setPromesseDate(e.target.value)}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', border: '1px solid rgba(34,197,94,0.3)', background: 'rgba(34,197,94,0.05)', color: '#fff', fontSize: '0.9rem', boxSizing: 'border-box', colorScheme: 'dark' }}
                  />
                </div>

                {/* Commentaire */}
                <div style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'block', color: '#CBD5E1', fontSize: '0.82rem', fontWeight: '600', marginBottom: '6px' }}>
                    Commentaire <span style={{ color: '#64748b' }}>(optionnel)</span>
                  </label>
                  <textarea
                    value={promesseComment}
                    onChange={(e) => setPromesseComment(e.target.value)}
                    placeholder="Ex: client s'engage à payer à réception de son salaire..."
                    rows={3}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.04)', color: '#fff', fontSize: '0.85rem', resize: 'none', boxSizing: 'border-box', fontFamily: 'inherit' }}
                  />
                </div>

                {/* Boutons */}
                <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                  <button
                    onClick={() => setPromesseModal(null)}
                    style={{ padding: '9px 20px', background: 'rgba(255,255,255,0.08)', color: '#CBD5E1', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', cursor: 'pointer', fontWeight: '600', fontSize: '0.85rem' }}
                  >
                    Annuler
                  </button>
                  <button
                    onClick={handlePromesse}
                    disabled={promesseSaving || !promesseMontant || !promesseDate}
                    style={{ padding: '9px 22px', background: (!promesseMontant || !promesseDate) ? '#374151' : 'linear-gradient(135deg,#22c55e,#16a34a)', color: '#fff', border: 'none', borderRadius: '10px', fontWeight: '700', cursor: (!promesseMontant || !promesseDate) ? 'not-allowed' : 'pointer', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '6px' }}
                  >
                    {promesseSaving ? (
                      <><span style={{ width: '14px', height: '14px', border: '2px solid #fff', borderTopColor: 'transparent', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.8s linear infinite' }} />Enregistrement...</>
                    ) : (
                      <>🤝 Enregistrer la promesse</>
                    )}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Modal SMS de rappel */}
      {smsModal && (
        <div
          style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}
          onClick={() => setSmsModal(null)}
        >
          <div
            style={{ background: '#0f172a', borderRadius: '20px', padding: '28px', maxWidth: '500px', width: '90%', border: '1px solid rgba(59,130,246,0.25)', boxShadow: '0 25px 60px rgba(0,0,0,0.5)' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* En-tête */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'linear-gradient(135deg,#3b82f6,#2563eb)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' }}>💬</div>
              <div>
                <h3 style={{ color: '#fff', margin: 0, fontSize: '1.05rem', fontWeight: '700' }}>Envoyer un SMS de rappel</h3>
                <p style={{ color: '#64748b', margin: '2px 0 0 0', fontSize: '0.8rem' }}>{smsModal.nom_client} — {smsModal.ref_credit}</p>
              </div>
            </div>

            {/* Contexte dossier */}
            <div style={{ padding: '10px 14px', background: 'rgba(255,255,255,0.04)', borderRadius: '10px', marginBottom: '18px', display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
              <div style={{ fontSize: '0.78rem', color: '#94a3b8' }}>
                <div style={{ color: '#64748b', marginBottom: '2px' }}>Niveau</div>
                <span style={{ color: smsModal.niveau_couleur, fontWeight: '700' }}>{smsModal.niveau_label}</span>
              </div>
              <div style={{ fontSize: '0.78rem', color: '#94a3b8' }}>
                <div style={{ color: '#64748b', marginBottom: '2px' }}>Retard</div>
                <span style={{ color: '#ef4444', fontWeight: '700' }}>{smsModal.jours_retard}j</span>
              </div>
              <div style={{ fontSize: '0.78rem', color: '#94a3b8' }}>
                <div style={{ color: '#64748b', marginBottom: '2px' }}>Montant impayé</div>
                <span style={{ fontWeight: '700', color: '#fff' }}>{smsModal.montant_impaye.toLocaleString('fr-FR')} FCFA</span>
              </div>
              <div style={{ fontSize: '0.78rem', color: '#94a3b8' }}>
                <div style={{ color: '#64748b', marginBottom: '2px' }}>Téléphone</div>
                <span style={{ fontWeight: '700', color: '#3b82f6' }}>{smsModal.telephone || 'N/A'}</span>
              </div>
            </div>

            {smsSuccess ? (
              <div style={{ textAlign: 'center', padding: '24px', color: '#3b82f6', fontSize: '1.1rem', fontWeight: '700' }}>
                ✓ {smsSuccess}
              </div>
            ) : (
              <>
                {/* Message */}
                <div style={{ marginBottom: '14px' }}>
                  <label style={{ display: 'block', color: '#CBD5E1', fontSize: '0.82rem', fontWeight: '600', marginBottom: '6px' }}>
                    Message SMS <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <textarea
                    value={smsMessage}
                    onChange={(e) => setSmsMessage(e.target.value)}
                    rows={5}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', border: '1px solid rgba(59,130,246,0.3)', background: 'rgba(59,130,246,0.05)', color: '#fff', fontSize: '0.85rem', resize: 'vertical', boxSizing: 'border-box', fontFamily: 'inherit', lineHeight: '1.5' }}
                  />
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
                    <span style={{ fontSize: '0.72rem', color: '#64748b' }}>
                      {smsMessage.length} caractère{smsMessage.length > 1 ? 's' : ''}
                      {smsMessage.length > 160 && <span style={{ color: '#f59e0b' }}> ({Math.ceil(smsMessage.length / 160)} SMS)</span>}
                    </span>
                    <button
                      onClick={() => setSmsMessage(getDefaultSmsMessage(smsModal))}
                      style={{ fontSize: '0.72rem', color: '#3b82f6', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}
                    >
                      Réinitialiser le message
                    </button>
                  </div>
                </div>

                {!smsModal.telephone && (
                  <div style={{ padding: '10px 14px', background: 'rgba(239,68,68,0.1)', borderRadius: '8px', marginBottom: '14px', fontSize: '0.82rem', color: '#f87171', border: '1px solid rgba(239,68,68,0.2)' }}>
                    ⚠️ Aucun numéro de téléphone enregistré pour ce client. L'envoi n'est pas possible.
                  </div>
                )}

                {/* Boutons */}
                <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                  <button
                    onClick={() => setSmsModal(null)}
                    style={{ padding: '9px 20px', background: 'rgba(255,255,255,0.08)', color: '#CBD5E1', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', cursor: 'pointer', fontWeight: '600', fontSize: '0.85rem' }}
                  >
                    Annuler
                  </button>
                  <button
                    onClick={handleSmsRappel}
                    disabled={smsSaving || !smsMessage || !smsModal.telephone}
                    style={{ padding: '9px 22px', background: (!smsMessage || !smsModal.telephone) ? '#374151' : 'linear-gradient(135deg,#3b82f6,#2563eb)', color: '#fff', border: 'none', borderRadius: '10px', fontWeight: '700', cursor: (!smsMessage || !smsModal.telephone) ? 'not-allowed' : 'pointer', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '6px' }}
                  >
                    {smsSaving ? (
                      <><span style={{ width: '14px', height: '14px', border: '2px solid #fff', borderTopColor: 'transparent', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.8s linear infinite' }} />Envoi en cours...</>
                    ) : (
                      <>💬 Envoyer le SMS</>
                    )}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Modal escalade manuelle */}
      {escaladeModal && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
          }}
          onClick={() => setEscaladeModal(null)}
        >
          <div
            style={{
              background: '#1e293b',
              borderRadius: '16px',
              padding: '24px',
              maxWidth: '480px',
              width: '90%',
              border: '1px solid rgba(255,255,255,0.1)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ color: '#fff', margin: '0 0 16px 0' }}>
              Escalader : {escaladeModal.nom_client}
            </h3>
            <p style={{ color: '#9ca3af', fontSize: '0.85rem', margin: '0 0 16px 0' }}>
              Ref: {escaladeModal.ref_credit} — Niveau actuel :{' '}
              <span style={{ color: escaladeModal.niveau_couleur, fontWeight: '600' }}>
                {escaladeModal.niveau_label}
              </span>
            </p>
            <div style={{ marginBottom: '12px' }}>
              <label style={{ color: '#CBD5E1', fontSize: '0.85rem', display: 'block', marginBottom: '4px' }}>
                Nouveau niveau
              </label>
              <select
                value={nouveauNiveau}
                onChange={(e) => setNouveauNiveau(e.target.value)}
                style={{ ...selectStyles, width: '100%' }}
              >
                <option value="" style={selectOptionStyle}>Choisir...</option>
                {niveauxConfig.map((n) => (
                  <option key={n.niveau} value={n.niveau} style={selectOptionStyle}>
                    {n.label} (+{n.jours_declenchement}j)
                  </option>
                ))}
              </select>
            </div>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ color: '#CBD5E1', fontSize: '0.85rem', display: 'block', marginBottom: '4px' }}>
                Commentaire
              </label>
              <textarea
                value={commentaire}
                onChange={(e) => setCommentaire(e.target.value)}
                placeholder="Raison de l'escalade..."
                style={{
                  width: '100%',
                  padding: '10px',
                  borderRadius: '8px',
                  border: '1px solid rgba(255,255,255,0.2)',
                  background: 'rgba(255,255,255,0.05)',
                  color: '#fff',
                  minHeight: '80px',
                  resize: 'vertical',
                }}
              />
            </div>
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setEscaladeModal(null)}
                style={{
                  padding: '8px 20px',
                  background: 'rgba(255,255,255,0.1)',
                  color: '#CBD5E1',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                }}
              >
                Annuler
              </button>
              <button
                onClick={handleEscalade}
                disabled={!nouveauNiveau}
                style={{
                  padding: '8px 20px',
                  background: !nouveauNiveau ? '#4b5563' : 'linear-gradient(135deg, #f59e0b, #d97706)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '8px',
                  fontWeight: '600',
                  cursor: !nouveauNiveau ? 'not-allowed' : 'pointer',
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

const thStyle: React.CSSProperties = {
  padding: '10px 12px',
  textAlign: 'left',
  color: '#CBD5E1',
  fontSize: '0.8rem',
  fontWeight: '600',
  borderBottom: '1px solid rgba(255,255,255,0.1)',
};

const tdStyle: React.CSSProperties = {
  padding: '10px 12px',
  color: '#CBD5E1',
  fontSize: '0.85rem',
};

const selectStyle: React.CSSProperties = {
  padding: '8px 12px',
  borderRadius: '8px',
  border: '1px solid rgba(255,255,255,0.2)',
  background: 'rgba(255,255,255,0.05)',
  color: '#fff',
  fontSize: '0.85rem',
  cursor: 'pointer',
};

const selectOptionStyle: React.CSSProperties = {
  background: '#1e293b',
  color: '#fff',
};

const selectStyles = {
  ...selectStyle,
  '& option': {
    background: '#1e293b',
    color: '#fff',
  },
  '&:focus': {
    outline: 'none',
    borderColor: '#3b82f6',
  },
} as React.CSSProperties;

export default EscaladeTab;
