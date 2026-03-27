'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { apiClient } from '@/lib/api/client';
import { authApi } from '@/lib/api/auth';
import ScrollReveal from '@/components/home/ScrollReveal';
import CreditPolicySettings from '@/components/org/CreditPolicySettings';
import CreditPMEPolicySettings from '@/components/org/CreditPMEPolicySettings';

export default function CreditSettingsPage() {
  const router = useRouter();
  const [hasActiveLicense, setHasActiveLicense] = useState(false);
  const [showPME, setShowPME] = useState(false);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);

  useEffect(() => {
    const user = authApi.getCurrentUser();
    if (!user || user.role !== 'admin') {
      router.push('/login');
      return;
    }
    setCurrentUser(user);
  }, [router]);

  useEffect(() => {
    if (currentUser) checkLicense();
  }, [currentUser]);

  const checkLicense = async () => {
    try {
      const licenseCheck = await apiClient.get<{ has_active_license: boolean; organization_id: string | null }>('/licenses/check-active');
      setHasActiveLicense(licenseCheck.has_active_license);
    } catch {
      setHasActiveLicense(false);
    } finally {
      setLoading(false);
    }
  };

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
          style={{ borderTop: '2px solid rgba(27,58,140,0.4)', borderRight: '2px solid rgba(27,58,140,0.4)', borderBottom: '2px solid rgba(27,58,140,0.4)', borderLeft: '4px solid #C9A84C', background: 'linear-gradient(135deg, #070E28 0%, #0F1E48 60%, #0A1434 100%)', boxShadow: '0 0 32px rgba(27,58,140,0.15)' }}>
          <div className="absolute top-0 right-0 w-72 h-52 bg-[#1B3A8C]/15 rounded-full blur-[80px] pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-48 h-40 bg-[#C9A84C]/6 rounded-full blur-[60px] pointer-events-none" />
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#C9A84C]/50 to-transparent" />

          <div className="relative z-10 p-6 sm:p-8 flex flex-col sm:flex-row sm:items-center gap-5">
            {/* Icon */}
            <div className="w-14 h-14 rounded-2xl bg-[#1B3A8C] border border-[#C9A84C]/25 flex items-center justify-center shadow-xl shadow-[#1B3A8C]/30 flex-shrink-0">
              <svg className="w-7 h-7 text-[#C9A84C]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>

            {/* Text */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[#C9A84C]">Paramétrage</span>
                <span className="w-1 h-1 rounded-full bg-[#C9A84C]/50" />
                <span className="text-[10px] font-semibold text-white/40 uppercase tracking-wider">Moteur de Décision</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-white mb-1">
                Politique de <span style={{ background: 'linear-gradient(90deg, #C9A84C, #e8c97a)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Crédit</span>
              </h1>
              <p className="text-sm text-white/55 max-w-xl leading-relaxed">
                Configurez le moteur de décision : seuils, scoring, ratios, types de prêts et stratégie d'approbation.
              </p>
            </div>

            {/* Badges */}
            <div className="flex gap-2 flex-wrap sm:flex-nowrap">
              {[
                { label: 'Particulier', color: '#1B3A8C' },
                { label: 'PME/PMI', color: '#C9A84C' },
                { label: 'BCEAO', color: '#059669' },
              ].map(b => (
                <span key={b.label} className="px-3 py-1.5 rounded-xl text-[10px] font-bold border flex-shrink-0"
                  style={{ background: `${b.color}15`, borderColor: `${b.color}40`, color: b.color }}>
                  {b.label}
                </span>
              ))}
            </div>

            {/* Back link */}
            <Link href="/org/dashboard"
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

      {/* ── License warning ── */}
      {!hasActiveLicense && (
        <ScrollReveal direction="up" delay={100}>
          <div className="mb-6 p-5 rounded-2xl flex items-start gap-4"
            style={{ background: 'rgba(217,119,6,0.08)', borderTop: '1px solid rgba(217,119,6,0.3)', borderRight: '1px solid rgba(217,119,6,0.3)', borderBottom: '1px solid rgba(217,119,6,0.3)', borderLeft: '4px solid #D97706' }}>
            <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: 'rgba(217,119,6,0.15)', border: '1px solid rgba(217,119,6,0.3)' }}>
              <svg className="w-5 h-5 text-[#D97706]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-black text-white mb-1">Licence Active Requise</h3>
              <p className="text-xs text-white/55 mb-3">
                Le paramétrage de la politique de crédit nécessite une licence active.
              </p>
              <button onClick={() => router.push('/org/dashboard')}
                className="px-4 py-2 rounded-xl text-xs font-bold text-white transition-all hover:scale-[1.02]"
                style={{ background: 'linear-gradient(135deg, #1B3A8C 0%, #2e5bb8 50%, #C9A84C 100%)' }}>
                Voir les détails de la licence
              </button>
            </div>
          </div>
        </ScrollReveal>
      )}

      {/* ── Tab switcher ── */}
      <ScrollReveal direction="up" delay={150}>
        <div className="rounded-2xl p-1.5 mb-6 flex gap-1.5"
          style={{ background: '#0A1434', border: '1px solid rgba(27,58,140,0.3)' }}>
          {/* Particulier */}
          <button
            onClick={() => setShowPME(false)}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all duration-300"
            style={!showPME
              ? { background: 'linear-gradient(135deg, #1B3A8C, #2e5bb8)', color: '#fff', boxShadow: '0 4px 16px rgba(27,58,140,0.35)' }
              : { background: 'transparent', color: 'rgba(255,255,255,0.45)' }}>
            <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            Crédit Particulier
          </button>

          {/* PME */}
          <button
            onClick={() => setShowPME(true)}
            disabled={!hasActiveLicense}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all duration-300 disabled:opacity-40 disabled:cursor-not-allowed"
            style={showPME
              ? { background: 'linear-gradient(135deg, #C9A84C, #e8c97a)', color: '#070E28', boxShadow: '0 4px 16px rgba(201,168,76,0.3)' }
              : { background: 'transparent', color: 'rgba(255,255,255,0.45)' }}>
            <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
            PME / PMI
            {!hasActiveLicense && (
              <svg className="w-3.5 h-3.5 opacity-60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            )}
          </button>
        </div>
      </ScrollReveal>

      {/* ── Content ── */}
      <ScrollReveal direction="up" delay={200}>
        {!showPME ? (
          <div className="rounded-3xl overflow-hidden"
            style={{ borderTop: '2px solid rgba(27,58,140,0.35)', borderRight: '2px solid rgba(27,58,140,0.35)', borderBottom: '2px solid rgba(27,58,140,0.35)', borderLeft: '4px solid #1B3A8C', background: '#070E28', boxShadow: '0 0 28px rgba(27,58,140,0.10)' }}>
            <CreditPolicySettings hasActiveLicense={hasActiveLicense} />
          </div>
        ) : (
          <div className="rounded-3xl overflow-hidden"
            style={{ borderTop: '2px solid rgba(201,168,76,0.3)', borderRight: '2px solid rgba(201,168,76,0.3)', borderBottom: '2px solid rgba(201,168,76,0.3)', borderLeft: '4px solid #C9A84C', background: '#070E28', boxShadow: '0 0 28px rgba(201,168,76,0.06)' }}>
            <CreditPMEPolicySettings hasActiveLicense={hasActiveLicense} />
          </div>
        )}
      </ScrollReveal>
    </div>
  );
}
