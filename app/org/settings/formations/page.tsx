'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { authApi } from '@/lib/api/auth';
import ScrollReveal from '@/components/home/ScrollReveal';
import FormationsTab from '@/components/org/formations/FormationsTab';

export default function FormationsSettingsPage() {
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
          style={{ borderTop: '2px solid rgba(27,58,140,0.4)', borderRight: '2px solid rgba(27,58,140,0.4)', borderBottom: '2px solid rgba(27,58,140,0.4)', borderLeft: '4px solid #7C3AED', background: 'linear-gradient(135deg, #070E28 0%, #0F1E48 60%, #0A1434 100%)', boxShadow: '0 0 32px rgba(27,58,140,0.15)' }}>
          <div className="absolute top-0 right-0 w-72 h-52 bg-[#1B3A8C]/15 rounded-full blur-[80px] pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-48 h-40 bg-[#7C3AED]/6 rounded-full blur-[60px] pointer-events-none" />
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#7C3AED]/50 to-transparent" />

          <div className="relative z-10 p-6 sm:p-8 flex flex-col sm:flex-row sm:items-center gap-5">
            {/* Icon */}
            <div className="w-14 h-14 rounded-2xl bg-[#1B3A8C] border border-[#7C3AED]/25 flex items-center justify-center shadow-xl shadow-[#1B3A8C]/30 flex-shrink-0">
              <svg className="w-7 h-7 text-[#7C3AED]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </div>

            {/* Text */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[#7C3AED]">Gestion</span>
                <span className="w-1 h-1 rounded-full bg-[#7C3AED]/50" />
                <span className="text-[10px] font-semibold text-white/40 uppercase tracking-wider">IA & Apprentissage</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-white mb-1">
                Gestion des <span style={{ background: 'linear-gradient(90deg, #7C3AED, #a78bfa)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Formations</span>
              </h1>
              <p className="text-sm text-white/55 max-w-xl leading-relaxed">
                Créez et gérez des modules de formation avec génération automatique de contenu par IA.
              </p>
            </div>

            {/* Badges */}
            <div className="flex gap-2 flex-wrap sm:flex-nowrap">
              {[
                { label: 'Modules IA', color: '#7C3AED' },
                { label: 'Quiz & Éval.', color: '#C9A84C' },
                { label: 'Certification', color: '#059669' },
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

      {/* ── Content ── */}
      <ScrollReveal direction="up" delay={150}>
        <div className="rounded-3xl overflow-hidden"
          style={{ borderTop: '2px solid rgba(124,58,237,0.25)', borderRight: '2px solid rgba(124,58,237,0.25)', borderBottom: '2px solid rgba(124,58,237,0.25)', borderLeft: '4px solid #7C3AED', background: '#070E28', boxShadow: '0 0 28px rgba(124,58,237,0.06)' }}>
          <FormationsTab />
        </div>
      </ScrollReveal>
    </div>
  );
}
