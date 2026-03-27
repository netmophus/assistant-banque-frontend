'use client';

import React, { useState, useEffect } from 'react';
import { apiClient } from '@/lib/api/client';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  AreaChart, Area,
} from 'recharts';

interface EvolutionData {
  evolution_montant: { date: string; montant: number }[];
  evolution_credits: { date: string; credits: number }[];
  evolution_tranches: { date: string; tranches: Record<string, number> }[];
}

const COLORS = ['#3b82f6', '#ef4444', '#f59e0b', '#22c55e', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'];

const formatMontant = (val: number) => {
  if (val >= 1_000_000_000) return `${(val / 1_000_000_000).toFixed(1)}Md`;
  if (val >= 1_000_000) return `${(val / 1_000_000).toFixed(1)}M`;
  if (val >= 1_000) return `${(val / 1_000).toFixed(0)}K`;
  return String(val);
};

const DashboardChartsTab = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [evolution, setEvolution] = useState<EvolutionData | null>(null);
  const [stats, setStats] = useState<any>(null);
  const [promesseStats, setPromesseStats] = useState<any>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    setError('');
    try {
      const [evoData, statsData, promData] = await Promise.all([
        apiClient.get<EvolutionData>('/impayes/dashboard/evolution?limit=12'),
        apiClient.get<any>('/impayes/statistiques'),
        apiClient.get<any>('/impayes/promesses/stats').catch(() => null),
      ]);
      setEvolution(evoData);
      setStats(statsData);
      setPromesseStats(promData);
    } catch (err: any) {
      setError(err.message || 'Erreur chargement');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div style={{ textAlign: 'center', padding: '60px', color: '#CBD5E1' }}>Chargement des graphiques...</div>;
  }

  if (error) {
    return (
      <div style={{ padding: '16px', background: 'rgba(239,68,68,0.15)', borderRadius: '10px', color: '#f87171' }}>
        {error}
      </div>
    );
  }

  const tranchesData = stats?.repartition_tranches
    ? Object.entries(stats.repartition_tranches).map(([name, value]) => ({ name, value: value as number }))
    : [];

  const segmentsData = stats?.repartition_segments
    ? Object.entries(stats.repartition_segments).map(([name, value]) => ({ name, value: value as number }))
    : [];

  const agencesData = stats?.repartition_agences
    ? Object.entries(stats.repartition_agences)
        .map(([name, value]) => ({ name, value: value as number }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 10)
    : [];

  // Barres empilees pour tranches dans le temps
  const trancheKeys = new Set<string>();
  evolution?.evolution_tranches?.forEach((item) => {
    Object.keys(item.tranches || {}).forEach((k) => trancheKeys.add(k));
  });
  const trancheTimeData = evolution?.evolution_tranches?.map((item) => ({
    date: item.date,
    ...item.tranches,
  })) || [];

  return (
    <div>
      {/* KPIs rapides */}
      {stats && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', marginBottom: '24px' }}>
          {[
            { label: 'Montant total impaye', value: `${(stats.total_montant_impaye || 0).toLocaleString()} FCFA`, color: '#ef4444' },
            { label: 'Nombre de credits', value: stats.total_credits || 0, color: '#3b82f6' },
            { label: 'Candidats restructuration', value: stats.candidats_restructuration || 0, color: '#f59e0b' },
            { label: 'Ratio moyen', value: `${(stats.ratio_impaye_encours_moyen || 0).toFixed(1)}%`, color: '#8b5cf6' },
          ].map((kpi) => (
            <div
              key={kpi.label}
              style={{
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '12px',
                padding: '18px',
                borderLeft: `4px solid ${kpi.color}`,
              }}
            >
              <div style={{ fontSize: '0.75rem', color: '#9ca3af', marginBottom: '6px' }}>{kpi.label}</div>
              <div style={{ fontSize: '1.4rem', fontWeight: '700', color: kpi.color }}>{kpi.value}</div>
            </div>
          ))}
        </div>
      )}

      {/* Graphiques principaux */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(450px, 1fr))', gap: '20px', marginBottom: '24px' }}>
        {/* Evolution montant impaye */}
        {evolution?.evolution_montant && evolution.evolution_montant.length > 1 && (
          <div style={chartCardStyle}>
            <h4 style={chartTitleStyle}>Evolution du montant impaye</h4>
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={evolution.evolution_montant}>
                <defs>
                  <linearGradient id="colorMontant" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.07)" />
                <XAxis dataKey="date" tick={{ fill: '#9ca3af', fontSize: 11 }} />
                <YAxis tickFormatter={formatMontant} tick={{ fill: '#9ca3af', fontSize: 11 }} />
                <Tooltip
                  contentStyle={{ background: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#CBD5E1' }}
                  formatter={(value: any) => [`${Number(value).toLocaleString()} FCFA`, 'Montant']}
                />
                <Area type="monotone" dataKey="montant" stroke="#ef4444" strokeWidth={2} fill="url(#colorMontant)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Evolution nombre de credits */}
        {evolution?.evolution_credits && evolution.evolution_credits.length > 1 && (
          <div style={chartCardStyle}>
            <h4 style={chartTitleStyle}>Evolution du nombre de credits</h4>
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={evolution.evolution_credits}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.07)" />
                <XAxis dataKey="date" tick={{ fill: '#9ca3af', fontSize: 11 }} />
                <YAxis tick={{ fill: '#9ca3af', fontSize: 11 }} />
                <Tooltip
                  contentStyle={{ background: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#CBD5E1' }}
                />
                <Line type="monotone" dataKey="credits" stroke="#3b82f6" strokeWidth={2} dot={{ fill: '#3b82f6', r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Repartitions */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '20px', marginBottom: '24px' }}>
        {/* Camembert tranches */}
        {tranchesData.length > 0 && (
          <div style={chartCardStyle}>
            <h4 style={chartTitleStyle}>Repartition par tranche de retard</h4>
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={tranchesData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={100}
                  paddingAngle={3}
                  dataKey="value"
                  label={({ name, percent }) => `${name} (${((percent || 0) * 100).toFixed(0)}%)`}
                >
                  {tranchesData.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ background: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#CBD5E1' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Camembert segments */}
        {segmentsData.length > 0 && (
          <div style={chartCardStyle}>
            <h4 style={chartTitleStyle}>Repartition par segment</h4>
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={segmentsData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={100}
                  paddingAngle={3}
                  dataKey="value"
                  label={({ name, percent }) => `${name} (${((percent || 0) * 100).toFixed(0)}%)`}
                >
                  {segmentsData.map((_, i) => (
                    <Cell key={i} fill={COLORS[(i + 3) % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ background: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#CBD5E1' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Barres par agence */}
      {agencesData.length > 0 && (
        <div style={{ ...chartCardStyle, marginBottom: '24px' }}>
          <h4 style={chartTitleStyle}>Top agences par nombre de credits impayes</h4>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={agencesData} layout="vertical" margin={{ left: 80 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.07)" />
              <XAxis type="number" tick={{ fill: '#9ca3af', fontSize: 11 }} />
              <YAxis type="category" dataKey="name" tick={{ fill: '#CBD5E1', fontSize: 11 }} width={80} />
              <Tooltip
                contentStyle={{ background: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#CBD5E1' }}
              />
              <Bar dataKey="value" fill="#3b82f6" radius={[0, 6, 6, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Barres empilees evolution tranches dans le temps */}
      {trancheTimeData.length > 1 && (
        <div style={{ ...chartCardStyle, marginBottom: '24px' }}>
          <h4 style={chartTitleStyle}>Evolution des tranches de retard dans le temps</h4>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={trancheTimeData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.07)" />
              <XAxis dataKey="date" tick={{ fill: '#9ca3af', fontSize: 11 }} />
              <YAxis tick={{ fill: '#9ca3af', fontSize: 11 }} />
              <Tooltip
                contentStyle={{ background: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#CBD5E1' }}
              />
              <Legend wrapperStyle={{ color: '#CBD5E1', fontSize: '0.8rem' }} />
              {[...trancheKeys].map((key, i) => (
                <Bar key={key} dataKey={key} stackId="a" fill={COLORS[i % COLORS.length]} />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Promesses stats visuel */}
      {promesseStats && promesseStats.total > 0 && (
        <div style={chartCardStyle}>
          <h4 style={chartTitleStyle}>Promesses de paiement</h4>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={[
                  { name: 'Tenues', value: promesseStats.tenues },
                  { name: 'Non tenues', value: promesseStats.non_tenues },
                  { name: 'En attente', value: promesseStats.en_attente },
                  { name: 'Annulees', value: promesseStats.annulees },
                ].filter((d) => d.value > 0)}
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={90}
                paddingAngle={3}
                dataKey="value"
                label={({ name, value }) => `${name}: ${value}`}
              >
                <Cell fill="#22c55e" />
                <Cell fill="#ef4444" />
                <Cell fill="#f59e0b" />
                <Cell fill="#6b7280" />
              </Pie>
              <Tooltip
                contentStyle={{ background: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#CBD5E1' }}
              />
            </PieChart>
          </ResponsiveContainer>
          <div style={{ textAlign: 'center', color: '#CBD5E1', fontSize: '0.9rem', marginTop: '8px' }}>
            Taux de tenue : <strong style={{ color: promesseStats.taux_tenue >= 50 ? '#22c55e' : '#ef4444' }}>{promesseStats.taux_tenue}%</strong>
          </div>
        </div>
      )}
    </div>
  );
};

const chartCardStyle: React.CSSProperties = {
  background: 'rgba(255,255,255,0.03)',
  border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: '14px',
  padding: '20px',
};

const chartTitleStyle: React.CSSProperties = {
  color: '#CBD5E1',
  fontSize: '0.95rem',
  fontWeight: '600',
  margin: '0 0 16px 0',
};

export default DashboardChartsTab;
