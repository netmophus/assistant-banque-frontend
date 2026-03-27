'use client';

import React, { useState, useEffect } from 'react';
import { apiClient } from '@/lib/api/client';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from 'recharts';

interface AgenceRank {
  agence: string;
  rang: number;
  total_credits: number;
  montant_total_impaye: number;
  montant_recouvre: number;
  taux_recouvrement: number;
  promesses_tenues: number;
  promesses_non_tenues: number;
  score_performance: number;
  repartition_tranches: Record<string, number>;
}

const MEDAL = ['🥇', '🥈', '🥉'];
const COLORS_BAR = ['#22c55e', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'];

const AgencesDashboardTab = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [ranking, setRanking] = useState<AgenceRank[]>([]);
  const [totalAgences, setTotalAgences] = useState(0);
  const [expandedAgence, setExpandedAgence] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await apiClient.get<any>('/impayes/dashboard/agences');
      setRanking(data.ranking || []);
      setTotalAgences(data.total_agences || 0);
    } catch (err: any) {
      setError(err.message || 'Erreur chargement');
    } finally {
      setLoading(false);
    }
  };

  const chartData = ranking.map((r) => ({
    name: r.agence.length > 12 ? r.agence.slice(0, 12) + '...' : r.agence,
    score: r.score_performance,
    credits: r.total_credits,
    fullName: r.agence,
  }));

  return (
    <div>
      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '12px', marginBottom: '24px' }}>
        <div style={kpiCard}>
          <div style={kpiLabel}>Agences</div>
          <div style={{ ...kpiValue, color: '#3b82f6' }}>{totalAgences}</div>
        </div>
        <div style={kpiCard}>
          <div style={kpiLabel}>Meilleur score</div>
          <div style={{ ...kpiValue, color: '#22c55e' }}>
            {ranking.length > 0 ? `${ranking[0].score_performance}` : '—'}
          </div>
        </div>
        <div style={kpiCard}>
          <div style={kpiLabel}>Total credits</div>
          <div style={{ ...kpiValue, color: '#f59e0b' }}>
            {ranking.reduce((s, r) => s + r.total_credits, 0)}
          </div>
        </div>
        <div style={kpiCard}>
          <div style={kpiLabel}>Total impaye</div>
          <div style={{ ...kpiValue, color: '#ef4444', fontSize: '1rem' }}>
            {ranking.reduce((s, r) => s + r.montant_total_impaye, 0).toLocaleString()} FCFA
          </div>
        </div>
      </div>

      {error && (
        <div style={{ padding: '12px', background: 'rgba(239,68,68,0.15)', borderRadius: '8px', color: '#f87171', marginBottom: '16px' }}>{error}</div>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px', color: '#CBD5E1' }}>Chargement...</div>
      ) : ranking.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>Aucune donnee agence</div>
      ) : (
        <>
          {/* Graphique scores */}
          {chartData.length > 0 && (
            <div style={chartCard}>
              <h4 style={chartTitle}>Score de performance par agence</h4>
              <ResponsiveContainer width="100%" height={Math.max(250, chartData.length * 36)}>
                <BarChart data={chartData} layout="vertical" margin={{ left: 100 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.07)" />
                  <XAxis type="number" domain={[0, 100]} tick={{ fill: '#9ca3af', fontSize: 11 }} />
                  <YAxis type="category" dataKey="name" tick={{ fill: '#CBD5E1', fontSize: 11 }} width={100} />
                  <Tooltip
                    contentStyle={{ background: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#CBD5E1' }}
                    formatter={(value: any, name: any, props: any) => [`${Number(value).toFixed(1)}`, 'Score']}
                    labelFormatter={(label: any, payload: any) => payload?.[0]?.payload?.fullName || label}
                  />
                  <Bar dataKey="score" radius={[0, 6, 6, 0]}>
                    {chartData.map((_, i) => (
                      <Cell key={i} fill={COLORS_BAR[i % COLORS_BAR.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Tableau ranking */}
          <div style={{ marginTop: '20px', overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: 'rgba(255,255,255,0.05)' }}>
                  <th style={thStyle}>Rang</th>
                  <th style={thStyle}>Agence</th>
                  <th style={thStyle}>Score</th>
                  <th style={thStyle}>Credits</th>
                  <th style={thStyle}>Montant impaye</th>
                  <th style={thStyle}>Recouvre</th>
                  <th style={thStyle}>Taux</th>
                  <th style={thStyle}>Promesses T/NT</th>
                </tr>
              </thead>
              <tbody>
                {ranking.map((r) => (
                  <React.Fragment key={r.agence}>
                    <tr
                      style={{
                        borderBottom: '1px solid rgba(255,255,255,0.05)',
                        cursor: 'pointer',
                        background: expandedAgence === r.agence ? 'rgba(255,255,255,0.03)' : 'transparent',
                      }}
                      onClick={() => setExpandedAgence(expandedAgence === r.agence ? null : r.agence)}
                    >
                      <td style={{ ...tdStyle, textAlign: 'center', fontSize: '1.1rem' }}>
                        {r.rang <= 3 ? MEDAL[r.rang - 1] : <span style={{ color: '#6b7280' }}>{r.rang}</span>}
                      </td>
                      <td style={{ ...tdStyle, fontWeight: '600' }}>{r.agence}</td>
                      <td style={tdStyle}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <div style={{
                            width: '50px', height: '6px', background: 'rgba(255,255,255,0.08)',
                            borderRadius: '3px', overflow: 'hidden',
                          }}>
                            <div style={{
                              width: `${Math.min(r.score_performance, 100)}%`, height: '100%',
                              background: r.score_performance >= 50 ? '#22c55e' : r.score_performance >= 25 ? '#f59e0b' : '#ef4444',
                              borderRadius: '3px',
                            }} />
                          </div>
                          <span style={{ color: '#CBD5E1', fontWeight: '600', fontSize: '0.85rem' }}>
                            {r.score_performance}
                          </span>
                        </div>
                      </td>
                      <td style={tdStyle}>{r.total_credits}</td>
                      <td style={{ ...tdStyle, fontWeight: '600', color: '#ef4444' }}>
                        {r.montant_total_impaye.toLocaleString()} FCFA
                      </td>
                      <td style={{ ...tdStyle, color: '#22c55e' }}>
                        {r.montant_recouvre.toLocaleString()} FCFA
                      </td>
                      <td style={tdStyle}>
                        <span style={{
                          color: r.taux_recouvrement >= 30 ? '#22c55e' : r.taux_recouvrement >= 10 ? '#f59e0b' : '#ef4444',
                          fontWeight: '600',
                        }}>
                          {r.taux_recouvrement}%
                        </span>
                      </td>
                      <td style={tdStyle}>
                        <span style={{ color: '#22c55e' }}>{r.promesses_tenues}</span>
                        {' / '}
                        <span style={{ color: '#ef4444' }}>{r.promesses_non_tenues}</span>
                      </td>
                    </tr>
                    {expandedAgence === r.agence && (
                      <tr>
                        <td colSpan={8} style={{ padding: '12px 16px', background: 'rgba(255,255,255,0.02)' }}>
                          <h5 style={{ color: '#CBD5E1', margin: '0 0 8px 0', fontSize: '0.85rem' }}>
                            Repartition par tranche de retard
                          </h5>
                          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                            {Object.entries(r.repartition_tranches || {}).map(([tranche, count]) => (
                              <div
                                key={tranche}
                                style={{
                                  padding: '6px 12px', background: 'rgba(255,255,255,0.05)',
                                  borderRadius: '6px', fontSize: '0.8rem', color: '#CBD5E1',
                                }}
                              >
                                <span style={{ fontWeight: '600' }}>{tranche}</span>
                                {': '}
                                <span style={{ color: '#f59e0b' }}>{count}</span>
                              </div>
                            ))}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
};

const kpiCard: React.CSSProperties = {
  background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: '10px', padding: '14px', textAlign: 'center',
};
const kpiLabel: React.CSSProperties = { fontSize: '0.75rem', color: '#9ca3af', marginBottom: '4px' };
const kpiValue: React.CSSProperties = { fontSize: '1.3rem', fontWeight: '700' };
const chartCard: React.CSSProperties = {
  background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: '14px', padding: '20px',
};
const chartTitle: React.CSSProperties = {
  color: '#CBD5E1', fontSize: '0.95rem', fontWeight: '600', margin: '0 0 16px 0',
};
const thStyle: React.CSSProperties = {
  padding: '10px 12px', textAlign: 'left', color: '#CBD5E1', fontSize: '0.8rem',
  fontWeight: '600', borderBottom: '1px solid rgba(255,255,255,0.1)',
};
const tdStyle: React.CSSProperties = { padding: '10px 12px', color: '#CBD5E1', fontSize: '0.85rem' };

export default AgencesDashboardTab;
