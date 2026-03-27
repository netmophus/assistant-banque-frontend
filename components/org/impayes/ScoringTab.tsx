'use client';

import React, { useState, useEffect } from 'react';
import { apiClient } from '@/lib/api/client';

interface ScoreItem {
  ref_credit: string;
  nom_client: string;
  score: number;
  niveau_risque: string;
  couleur: string;
  facteurs: Record<string, number>;
  recommandation: string;
  montant_impaye: number;
  jours_retard: number;
  agence: string;
  segment: string;
}

const FACTEUR_LABELS: Record<string, string> = {
  jours_retard: 'Jours de retard',
  ratio_impaye: 'Ratio impaye/encours',
  garanties: 'Garanties',
  joignabilite: 'Joignabilite',
  historique_promesses: 'Historique promesses',
  echeances_impayees: 'Echeances impayees',
};

const NIVEAU_LABELS: Record<string, string> = {
  faible: 'Risque faible',
  moyen: 'Risque moyen',
  eleve: 'Risque eleve',
  critique: 'Risque critique',
};

const ScoringTab = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [scores, setScores] = useState<ScoreItem[]>([]);
  const [expandedRef, setExpandedRef] = useState<string | null>(null);
  const [filtreNiveau, setFiltreNiveau] = useState('');
  const [filtreAgence, setFiltreAgence] = useState('');
  const [search, setSearch] = useState('');

  useEffect(() => {
    loadScores();
  }, []);

  const loadScores = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await apiClient.get<ScoreItem[]>('/impayes/scoring');
      setScores(data || []);
    } catch (err: any) {
      setError(err.message || 'Erreur chargement');
    } finally {
      setLoading(false);
    }
  };

  const filtered = scores.filter((s) => {
    if (filtreNiveau && s.niveau_risque !== filtreNiveau) return false;
    if (filtreAgence && s.agence !== filtreAgence) return false;
    if (search) {
      const q = search.toLowerCase();
      if (!s.nom_client.toLowerCase().includes(q) && !s.ref_credit.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  const agences = [...new Set(scores.map((s) => s.agence))].sort();

  // Stats rapides
  const statsNiveau = {
    faible: scores.filter((s) => s.niveau_risque === 'faible').length,
    moyen: scores.filter((s) => s.niveau_risque === 'moyen').length,
    eleve: scores.filter((s) => s.niveau_risque === 'eleve').length,
    critique: scores.filter((s) => s.niveau_risque === 'critique').length,
  };

  const scoreMoyen = scores.length > 0
    ? Math.round(scores.reduce((sum, s) => sum + s.score, 0) / scores.length)
    : 0;

  return (
    <div>
      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '10px', marginBottom: '20px' }}>
        <div style={statCard('#3b82f6')}>
          <div style={statLabel}>Score moyen</div>
          <div style={{ ...statValue, color: '#3b82f6' }}>{scoreMoyen}/100</div>
        </div>
        <div style={statCard('#22c55e')}>
          <div style={statLabel}>Faible</div>
          <div style={{ ...statValue, color: '#22c55e' }}>{statsNiveau.faible}</div>
        </div>
        <div style={statCard('#f59e0b')}>
          <div style={statLabel}>Moyen</div>
          <div style={{ ...statValue, color: '#f59e0b' }}>{statsNiveau.moyen}</div>
        </div>
        <div style={statCard('#ef4444')}>
          <div style={statLabel}>Eleve</div>
          <div style={{ ...statValue, color: '#ef4444' }}>{statsNiveau.eleve}</div>
        </div>
        <div style={statCard('#7f1d1d')}>
          <div style={statLabel}>Critique</div>
          <div style={{ ...statValue, color: '#f87171' }}>{statsNiveau.critique}</div>
        </div>
      </div>

      {/* Filtres */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '16px', flexWrap: 'wrap' }}>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Rechercher client ou ref..."
          style={inputStyle}
        />
        <select value={filtreNiveau} onChange={(e) => setFiltreNiveau(e.target.value)} style={selectStyle}>
          <option value="" style={selectOptionStyle}>Tous les niveaux</option>
          <option value="faible" style={selectOptionStyle}>Faible</option>
          <option value="moyen" style={selectOptionStyle}>Moyen</option>
          <option value="eleve" style={selectOptionStyle}>Eleve</option>
          <option value="critique" style={selectOptionStyle}>Critique</option>
        </select>
        <select value={filtreAgence} onChange={(e) => setFiltreAgence(e.target.value)} style={selectStyle}>
          <option value="" style={selectOptionStyle}>Toutes les agences</option>
          {agences.map((a) => <option key={a} value={a} style={selectOptionStyle}>{a}</option>)}
        </select>
        <span style={{ color: '#9ca3af', fontSize: '0.85rem', alignSelf: 'center' }}>
          {filtered.length} dossier{filtered.length > 1 ? 's' : ''}
        </span>
      </div>

      {error && (
        <div style={{ padding: '12px', background: 'rgba(239,68,68,0.15)', borderRadius: '8px', color: '#f87171', marginBottom: '12px' }}>{error}</div>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px', color: '#CBD5E1' }}>Chargement...</div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>Aucun dossier</div>
      ) : (
        <div style={{ display: 'grid', gap: '10px' }}>
          {filtered.map((s) => (
            <div
              key={s.ref_credit}
              style={{
                background: 'rgba(255,255,255,0.03)',
                border: `1px solid ${s.couleur}30`,
                borderLeft: `4px solid ${s.couleur}`,
                borderRadius: '10px',
                padding: '14px 18px',
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
              onClick={() => setExpandedRef(expandedRef === s.ref_credit ? null : s.ref_credit)}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                <div>
                  <span style={{ fontWeight: '700', color: '#fff', marginRight: '12px' }}>{s.nom_client}</span>
                  <span style={{ color: '#9ca3af', fontSize: '0.8rem' }}>{s.ref_credit}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span style={{ color: '#9ca3af', fontSize: '0.8rem' }}>{s.agence}</span>
                  <span style={{ color: '#9ca3af', fontSize: '0.8rem' }}>{s.montant_impaye.toLocaleString()} FCFA</span>
                  <span style={{ color: '#9ca3af', fontSize: '0.8rem' }}>{s.jours_retard}j</span>
                  {/* Score badge */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '4px 14px',
                      borderRadius: '20px',
                      background: `${s.couleur}20`,
                      border: `1px solid ${s.couleur}50`,
                    }}
                  >
                    <div
                      style={{
                        width: '28px',
                        height: '28px',
                        borderRadius: '50%',
                        background: `conic-gradient(${s.couleur} ${s.score * 3.6}deg, rgba(255,255,255,0.1) 0deg)`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '0.65rem',
                        fontWeight: '800',
                        color: '#fff',
                      }}
                    >
                      {s.score}
                    </div>
                    <span style={{ color: s.couleur, fontWeight: '600', fontSize: '0.8rem' }}>
                      {NIVEAU_LABELS[s.niveau_risque] || s.niveau_risque}
                    </span>
                  </div>
                </div>
              </div>

              {expandedRef === s.ref_credit && (
                <div style={{ marginTop: '14px', borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '14px' }}>
                  <div style={{ marginBottom: '12px', color: '#CBD5E1', fontSize: '0.85rem', fontStyle: 'italic' }}>
                    {s.recommandation}
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '8px' }}>
                    {Object.entries(s.facteurs).map(([key, val]) => (
                      <div key={key} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ color: '#9ca3af', fontSize: '0.8rem', minWidth: '140px' }}>
                          {FACTEUR_LABELS[key] || key}
                        </span>
                        <div style={{ flex: 1, height: '8px', background: 'rgba(255,255,255,0.08)', borderRadius: '4px', overflow: 'hidden' }}>
                          <div
                            style={{
                              width: `${val}%`,
                              height: '100%',
                              background: val >= 70 ? '#22c55e' : val >= 40 ? '#f59e0b' : '#ef4444',
                              borderRadius: '4px',
                              transition: 'width 0.5s',
                            }}
                          />
                        </div>
                        <span style={{ color: '#CBD5E1', fontSize: '0.75rem', minWidth: '30px', textAlign: 'right' }}>
                          {val}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const statCard = (borderColor: string): React.CSSProperties => ({
  background: 'rgba(255,255,255,0.04)',
  border: '1px solid rgba(255,255,255,0.08)',
  borderTop: `3px solid ${borderColor}`,
  borderRadius: '10px',
  padding: '14px',
  textAlign: 'center',
});
const statLabel: React.CSSProperties = { fontSize: '0.75rem', color: '#9ca3af', marginBottom: '4px' };
const statValue: React.CSSProperties = { fontSize: '1.4rem', fontWeight: '700' };
const inputStyle: React.CSSProperties = {
  padding: '8px 12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.2)',
  background: 'rgba(255,255,255,0.05)', color: '#fff', fontSize: '0.85rem', minWidth: '200px',
};
const selectStyle: React.CSSProperties = {
  padding: '8px 12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.2)',
  background: 'rgba(255,255,255,0.05)', color: '#fff', fontSize: '0.85rem', cursor: 'pointer',
};
const selectOptionStyle: React.CSSProperties = {
  background: '#1e293b',
  color: '#fff',
};

export default ScoringTab;
