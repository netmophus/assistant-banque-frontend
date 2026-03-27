'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { authApi } from '@/lib/api/auth';
import ScrollReveal from '@/components/home/ScrollReveal';
import CreditDecisionForm from '@/components/user/CreditDecisionForm';
import CreditPMEAnalysisForm from '@/components/user/CreditPMEAnalysisForm';
import CreditHistory from '@/components/user/CreditHistory';
import CreditPMEHistory from '@/components/user/CreditPMEHistory';

export default function CreditAnalysisPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'particulier' | 'pme' | 'historique'>('particulier');
  const [historyTab, setHistoryTab] = useState<'particulier' | 'pme'>('particulier');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const user = authApi.getCurrentUser();
    if (!user || user.role !== 'user') { router.push('/login'); return; }
    setLoading(false);
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center">
          <div className="relative w-14 h-14 mx-auto mb-4">
            <div className="absolute inset-0 border-2 border-[#1B3A8C]/30 rounded-full" />
            <div className="absolute inset-0 border-2 border-transparent border-t-[#C9A84C] rounded-full animate-spin" />
          </div>
          <p className="text-white/60 text-sm">Chargement…</p>
        </div>
      </div>
    );
  }

  const tabs = [
    {
      id: 'particulier' as const,
      label: 'Crédit Particulier',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      ),
      accentColor: '#1B3A8C',
    },
    {
      id: 'pme' as const,
      label: 'Crédit PME/PMI',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
        </svg>
      ),
      accentColor: '#C9A84C',
    },
    {
      id: 'historique' as const,
      label: 'Historique',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      accentColor: '#059669',
    },
  ] as const;

  const activeTabData = tabs.find(t => t.id === activeTab)!;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-4">

      {/* ── Hero ── */}
      <ScrollReveal direction="down" delay={0}>
        <div className="relative rounded-3xl overflow-hidden mb-5"
          style={{ borderTop: '2px solid rgba(27,58,140,0.4)', borderRight: '2px solid rgba(27,58,140,0.4)', borderBottom: '2px solid rgba(27,58,140,0.4)', borderLeft: '4px solid #C9A84C', background: 'linear-gradient(135deg, #070E28 0%, #0F1E48 60%, #0A1434 100%)', boxShadow: '0 0 32px rgba(27,58,140,0.15)' }}>
          {/* Glows */}
          <div className="absolute top-0 right-0 w-72 h-52 bg-[#1B3A8C]/15 rounded-full blur-[80px] pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-48 h-40 bg-[#C9A84C]/6 rounded-full blur-[60px] pointer-events-none" />
          {/* Gold top line */}
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#C9A84C]/50 to-transparent" />

          <div className="relative z-10 p-6 sm:p-8 flex flex-col sm:flex-row sm:items-center gap-5">
            <div className="w-14 h-14 rounded-2xl bg-[#1B3A8C] border border-[#C9A84C]/25 flex items-center justify-center shadow-xl shadow-[#1B3A8C]/30 flex-shrink-0">
              <svg className="w-7 h-7 text-[#C9A84C]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[#C9A84C]">Module Crédit</span>
                <span className="w-1 h-1 rounded-full bg-[#C9A84C]/50" />
                <span className="text-[10px] font-semibold text-white/40 uppercase tracking-wider">Analyse IA</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-white mb-1">Analyse de Dossier de Crédit</h1>
              <p className="text-sm text-white/55 max-w-xl leading-relaxed">
                Intelligence artificielle au service de vos décisions de crédit — Particuliers, PME/PMI, conformité BCEAO.
              </p>
            </div>
            {/* Stats pills */}
            <div className="flex gap-2 flex-wrap sm:flex-nowrap">
              {[
                { label: 'Particulier', color: '#1B3A8C' },
                { label: 'PME / PMI', color: '#C9A84C' },
                { label: 'BCEAO', color: '#059669' },
              ].map(b => (
                <span key={b.label} className="px-3 py-1.5 rounded-xl text-[10px] font-bold border flex-shrink-0"
                  style={{ background: `${b.color}15`, borderColor: `${b.color}40`, color: b.color }}>
                  {b.label}
                </span>
              ))}
            </div>
          </div>
        </div>
      </ScrollReveal>

      {/* ── Onglets ── */}
      <ScrollReveal direction="up" delay={100}>
        <div className="mb-5 p-1 rounded-2xl border-2 border-[#1B3A8C]/30 flex gap-1"
          style={{ background: '#0A1434', boxShadow: '0 0 20px rgba(27,58,140,0.08)' }}>
          {tabs.map(tab => {
            const isActive = activeTab === tab.id;
            return (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm transition-all duration-200"
                style={{
                  background: isActive ? tab.accentColor : 'transparent',
                  color: isActive ? '#ffffff' : 'rgba(255,255,255,0.5)',
                  boxShadow: isActive ? `0 4px 16px ${tab.accentColor}40` : 'none',
                  borderBottom: isActive ? `2px solid ${tab.accentColor === '#C9A84C' ? '#C9A84C' : 'rgba(201,168,76,0.4)'}` : '2px solid transparent',
                }}
              >
                {tab.icon}
                <span className="hidden sm:inline">{tab.label}</span>
                <span className="sm:hidden">{tab.id === 'particulier' ? 'Particulier' : tab.id === 'pme' ? 'PME' : 'Historique'}</span>
                {isActive && <span className="w-1.5 h-1.5 rounded-full bg-white/70" />}
              </button>
            );
          })}
        </div>
      </ScrollReveal>

      {/* ── Contenu ── */}
      {activeTab === 'particulier' && (
        <ScrollReveal direction="up" delay={150}>
          <div className="rounded-3xl overflow-hidden"
            style={{ borderTop: '2px solid rgba(27,58,140,0.4)', borderRight: '2px solid rgba(27,58,140,0.4)', borderBottom: '2px solid rgba(27,58,140,0.4)', borderLeft: '4px solid #1B3A8C', background: '#070E28', boxShadow: '0 0 28px rgba(27,58,140,0.12)' }}>
            {/* Header section */}
            <div className="px-6 sm:px-8 py-5 border-b flex items-center gap-4"
              style={{ borderColor: 'rgba(27,58,140,0.2)', background: 'rgba(27,58,140,0.08)' }}>
              <div className="w-10 h-10 rounded-xl bg-[#1B3A8C] border border-[#C9A84C]/20 flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <div>
                <h2 className="text-lg font-black text-white">Crédit Particulier</h2>
                <p className="text-xs text-white/50">Analyse complète — immobilier, consommation, auto</p>
              </div>
            </div>
            <div className="p-6 sm:p-8">
              <CreditDecisionForm />
            </div>
          </div>
        </ScrollReveal>
      )}

      {activeTab === 'pme' && (
        <ScrollReveal direction="up" delay={150}>
          <div className="rounded-3xl overflow-hidden"
            style={{ borderTop: '2px solid rgba(201,168,76,0.35)', borderRight: '2px solid rgba(201,168,76,0.35)', borderBottom: '2px solid rgba(201,168,76,0.35)', borderLeft: '4px solid #C9A84C', background: '#070E28', boxShadow: '0 0 28px rgba(201,168,76,0.08)' }}>
            <div className="px-6 sm:px-8 py-5 border-b flex items-center gap-4"
              style={{ borderColor: 'rgba(201,168,76,0.15)', background: 'rgba(201,168,76,0.05)' }}>
              <div className="w-10 h-10 rounded-xl border border-[#C9A84C]/25 flex items-center justify-center flex-shrink-0"
                style={{ background: 'rgba(201,168,76,0.15)' }}>
                <svg className="w-5 h-5 text-[#C9A84C]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              <div>
                <h2 className="text-lg font-black text-white">Crédit PME/PMI</h2>
                <p className="text-xs text-white/50">Analyse spécialisée — professionnels et entreprises</p>
              </div>
            </div>
            <div className="p-6 sm:p-8">
              <CreditPMEAnalysisForm />
            </div>
          </div>
        </ScrollReveal>
      )}

      {activeTab === 'historique' && (
        <ScrollReveal direction="up" delay={150}>
          <div className="rounded-3xl overflow-hidden"
            style={{ borderTop: '2px solid rgba(5,150,105,0.3)', borderRight: '2px solid rgba(5,150,105,0.3)', borderBottom: '2px solid rgba(5,150,105,0.3)', borderLeft: '4px solid #059669', background: '#070E28', boxShadow: '0 0 24px rgba(5,150,105,0.08)' }}>
            <div className="px-6 sm:px-8 py-5 border-b flex items-center gap-4"
              style={{ borderColor: 'rgba(5,150,105,0.15)', background: 'rgba(5,150,105,0.05)' }}>
              <div className="w-10 h-10 rounded-xl border border-green-500/25 flex items-center justify-center flex-shrink-0"
                style={{ background: 'rgba(5,150,105,0.15)' }}>
                <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <h2 className="text-lg font-black text-white">Historique des analyses</h2>
                <p className="text-xs text-white/50">Toutes vos analyses de crédit archivées</p>
              </div>
            </div>

            <div className="px-6 sm:px-8 pt-5">
              {/* Sous-onglets historique */}
              <div className="flex gap-2 mb-6">
                <button onClick={() => setHistoryTab('particulier')}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all"
                  style={{
                    background: historyTab === 'particulier' ? 'rgba(27,58,140,0.3)' : 'rgba(255,255,255,0.04)',
                    borderTop: '1px solid ' + (historyTab === 'particulier' ? 'rgba(27,58,140,0.6)' : 'rgba(255,255,255,0.08)'),
                    borderRight: '1px solid ' + (historyTab === 'particulier' ? 'rgba(27,58,140,0.6)' : 'rgba(255,255,255,0.08)'),
                    borderBottom: '1px solid ' + (historyTab === 'particulier' ? 'rgba(27,58,140,0.6)' : 'rgba(255,255,255,0.08)'),
                    borderLeft: (historyTab === 'particulier' ? '3px solid #1B3A8C' : '1px solid rgba(255,255,255,0.08)'),
                    color: historyTab === 'particulier' ? '#ffffff' : 'rgba(255,255,255,0.45)',
                  }}
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  Particulier
                </button>
                <button onClick={() => setHistoryTab('pme')}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all"
                  style={{
                    background: historyTab === 'pme' ? 'rgba(201,168,76,0.15)' : 'rgba(255,255,255,0.04)',
                    borderTop: '1px solid ' + (historyTab === 'pme' ? 'rgba(201,168,76,0.5)' : 'rgba(255,255,255,0.08)'),
                    borderRight: '1px solid ' + (historyTab === 'pme' ? 'rgba(201,168,76,0.5)' : 'rgba(255,255,255,0.08)'),
                    borderBottom: '1px solid ' + (historyTab === 'pme' ? 'rgba(201,168,76,0.5)' : 'rgba(255,255,255,0.08)'),
                    borderLeft: (historyTab === 'pme' ? '3px solid #C9A84C' : '1px solid rgba(255,255,255,0.08)'),
                    color: historyTab === 'pme' ? '#C9A84C' : 'rgba(255,255,255,0.45)',
                  }}
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                  PME/PMI
                </button>
              </div>
            </div>

            <div className="px-6 sm:px-8 pb-8">
              {historyTab === 'particulier' ? <CreditHistory /> : <CreditPMEHistory />}
            </div>
          </div>
        </ScrollReveal>
      )}

    </div>
  );
}
