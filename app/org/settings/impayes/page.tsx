'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { authApi } from '@/lib/api/auth';
import ScrollReveal from '@/components/home/ScrollReveal';
import ImpayesTab from '@/components/org/impayes/ImpayesTab';

export default function ImpayesSettingsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);

  useEffect(() => {
    const user = authApi.getCurrentUser();
    if (!user || user.role !== 'admin') {
      router.push('/login');
      return;
    }
    setCurrentUser(user);
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

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-8">

      {/* ── Hero ── */}
      <ScrollReveal direction="down" delay={0}>
        <div className="relative rounded-3xl overflow-hidden mb-6"
          style={{ borderTop: '2px solid rgba(27,58,140,0.4)', borderRight: '2px solid rgba(27,58,140,0.4)', borderBottom: '2px solid rgba(27,58,140,0.4)', borderLeft: '4px solid #EF4444', background: 'linear-gradient(135deg, #070E28 0%, #0F1E48 60%, #0A1434 100%)', boxShadow: '0 0 32px rgba(27,58,140,0.15)' }}>
          <div className="absolute top-0 right-0 w-72 h-52 bg-[#1B3A8C]/15 rounded-full blur-[80px] pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-48 h-40 bg-[#EF4444]/6 rounded-full blur-[60px] pointer-events-none" />
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#EF4444]/40 to-transparent" />

          <div className="relative z-10 p-6 sm:p-8 flex flex-col sm:flex-row sm:items-center gap-5">
            {/* Icon */}
            <div className="w-14 h-14 rounded-2xl bg-[#1B3A8C] border border-[#EF4444]/25 flex items-center justify-center shadow-xl shadow-[#1B3A8C]/30 flex-shrink-0">
              <svg className="w-7 h-7 text-[#EF4444]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>

            {/* Text */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[#EF4444]">Gestion</span>
                <span className="w-1 h-1 rounded-full bg-[#EF4444]/50" />
                <span className="text-[10px] font-semibold text-white/40 uppercase tracking-wider">Recouvrement</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-white mb-1">
                Gestion des <span style={{ background: 'linear-gradient(90deg, #EF4444, #f87171)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Impayés</span>
              </h1>
              <p className="text-sm text-white/55 max-w-xl leading-relaxed">
                Importez, analysez et gérez les impayés avec génération automatique de SMS de relance.
              </p>
            </div>

            {/* Badges */}
            <div className="flex gap-2 flex-wrap sm:flex-nowrap">
              {[
                { label: 'Impayés', color: '#EF4444' },
                { label: 'SMS Relance', color: '#D97706' },
                { label: 'Recouvrement', color: '#1B3A8C' },
              ].map(b => (
                <span key={b.label} className="px-3 py-1.5 rounded-xl text-[10px] font-bold border flex-shrink-0"
                  style={{ background: `${b.color}15`, borderColor: `${b.color}40`, color: b.color }}>
                  {b.label}
                </span>
              ))}
            </div>

            {/* Back link */}
            <Link href="/m2/dashboard"
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all flex-shrink-0"
              style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.7)' }}>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              <span className="hidden sm:inline">Dashboard</span>
            </Link>
          </div>
        </div>
      </ScrollReveal>

      {/* ── Content ── */}
      <ScrollReveal direction="up" delay={150}>
        <div className="rounded-3xl overflow-hidden"
          style={{ borderTop: '2px solid rgba(239,68,68,0.25)', borderRight: '2px solid rgba(239,68,68,0.25)', borderBottom: '2px solid rgba(239,68,68,0.25)', borderLeft: '4px solid #EF4444', background: '#070E28', boxShadow: '0 0 28px rgba(239,68,68,0.06)' }}>
          <ImpayesTab />
        </div>
      </ScrollReveal>
    </div>
  );
}
