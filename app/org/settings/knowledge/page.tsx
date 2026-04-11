'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { apiClient } from '@/lib/api/client';
import { authApi } from '@/lib/api/auth';
import ScrollReveal from '@/components/home/ScrollReveal';
import DocumentsManagementSection from '@/components/org/DocumentsManagementSection';
import AISearchConfigSection from '@/components/org/AISearchConfigSection';
import AIResponseConfigSection from '@/components/org/AIResponseConfigSection';
import QuotasManagementSection from '@/components/org/QuotasManagementSection';
import TabPermissionsSection from '@/components/org/TabPermissionsSection';

interface License {
  id: string;
  organization_id: string;
  plan: string;
  max_users: number;
  start_date: string;
  end_date: string;
  status: string;
  features: string[];
}

export default function KnowledgeSettingsPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'documents' | 'qa' | 'ai-search' | 'ai-response' | 'quotas' | 'permissions'>('documents');
  const [license, setLicense] = useState<License | null>(null);
  const [hasActiveLicense, setHasActiveLicense] = useState(false);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);

  const [ragQuestion, setRagQuestion] = useState('');
  const [ragBusy, setRagBusy] = useState(false);
  const [ragError, setRagError] = useState<string | null>(null);
  const [ragAnswer, setRagAnswer] = useState<string | null>(null);
  const [ragStrategy, setRagStrategy] = useState<string | null>(null);
  const [ragSources, setRagSources] = useState<any[]>([]);

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
    setLoading(true);
    try {
      const licenseCheck = await apiClient.get<{ has_active_license: boolean; organization_id: string | null }>('/licenses/check-active');
      setHasActiveLicense(licenseCheck.has_active_license);
      if (licenseCheck.has_active_license && currentUser?.organization_id) {
        try {
          const licensesRes = await apiClient.get<License[]>(`/licenses/by-org/${currentUser.organization_id}`).catch(() => []);
          const activeLicense = licensesRes.find((l: License) => l.status === 'active') || licensesRes[0] || null;
          setLicense(activeLicense);
        } catch (err) {
          console.error('Erreur licence:', err);
        }
      }
    } catch (error: any) {
      console.error('Erreur vérification licence:', error);
      setHasActiveLicense(false);
    } finally {
      setLoading(false);
    }
  };

  const handleRagQuery = async () => {
    try {
      setRagError(null);
      setRagAnswer(null);
      setRagStrategy(null);
      setRagSources([]);
      if (!ragQuestion.trim()) { setRagError('Veuillez saisir une question.'); return; }
      setRagBusy(true);
      const questionToSend = `${ragQuestion.trim()}\n\nAgis comme un expert senior en banque et réglementation bancaire (UEMOA). Adresse-toi à un public professionnel (direction, conformité, risques, exploitation bancaire) et adopte un ton technique. Donne une réponse la plus complète et détaillée possible, et ajoute des informations complémentaires utiles (contexte bancaire, implications pratiques, points de vigilance, et exemples si pertinent), tout en restant strictement dans le sujet de la question. Évite les conseils grand public du type \"vérifiez vos comptes\" ; si tu dois proposer des éléments destinés aux clients, présente-les explicitement comme \"message à communiquer au client\".`;
      const data = await apiClient.post<any>('/api/rag-new/query', { question: questionToSend });
      setRagAnswer(data?.answer || '');
      setRagStrategy(data?.strategy || null);
      // Sources web : filtrer uniquement les sources WEB avec URL
      const webSources = (data?.sources_used || []).filter((s: any) => s.scope === 'WEB' && s.url);
      setRagSources(webSources);
    } catch (e: any) {
      setRagError(e?.message || 'Erreur lors de la requête.');
    } finally {
      setRagBusy(false);
    }
  };

  /* ── Tab definitions ─────────────────────────────────────── */
  const tabs = [
    {
      id: 'documents' as const,
      label: 'Documents',
      fullLabel: 'Documents Organisationnels',
      requiresLicense: false,
      accent: '#1B3A8C',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
        </svg>
      ),
    },
    {
      id: 'qa' as const,
      label: 'Questions IA',
      fullLabel: 'Questions IA',
      requiresLicense: false,
      accent: '#C9A84C',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
      ),
    },
    {
      id: 'ai-search' as const,
      label: 'Recherche IA',
      fullLabel: 'Configuration Recherche IA',
      requiresLicense: true,
      accent: '#059669',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      ),
    },
    {
      id: 'ai-response' as const,
      label: 'Réponses IA',
      fullLabel: 'Personnalisation Réponses IA',
      requiresLicense: true,
      accent: '#7C3AED',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17H3a2 2 0 01-2-2V5a2 2 0 012-2h14a2 2 0 012 2v10a2 2 0 01-2 2h-2" />
        </svg>
      ),
    },
    {
      id: 'quotas' as const,
      label: 'Quotas',
      fullLabel: 'Gestion Quotas',
      requiresLicense: true,
      accent: '#D97706',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      ),
    },
    {
      id: 'permissions' as const,
      label: 'Permissions',
      fullLabel: 'Permissions Onglets',
      requiresLicense: false,
      accent: '#0891B2',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
        </svg>
      ),
    },
  ];

  const activeTabData = tabs.find(t => t.id === activeTab)!;

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
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </div>

            {/* Text */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[#C9A84C]">Paramétrage</span>
                <span className="w-1 h-1 rounded-full bg-[#C9A84C]/50" />
                <span className="text-[10px] font-semibold text-white/40 uppercase tracking-wider">Administration</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-white mb-1">
                Base de Connaissances &amp; <span style={{ background: 'linear-gradient(90deg, #C9A84C, #e8c97a)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>IA</span>
              </h1>
              <p className="text-sm text-white/55 max-w-xl leading-relaxed">
                Configurez la base de connaissances de votre organisation et personnalisez les réponses de l'IA.
              </p>
            </div>

            {/* License badge */}
            {hasActiveLicense && license && (
              <div className="flex-shrink-0 px-3 py-2 rounded-xl" style={{ background: 'rgba(5,150,105,0.12)', border: '1px solid rgba(5,150,105,0.25)' }}>
                <div className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#059669] mb-0.5">Licence</div>
                <div className="text-xs font-black text-white">{license.plan}</div>
              </div>
            )}

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

      {/* ── License warning banner ── */}
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
                Certaines fonctionnalités de paramétrage nécessitent une licence active. Contactez votre administrateur pour activer votre licence.
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

      {/* ── Tab Nav ── */}
      <ScrollReveal direction="up" delay={150}>
        <div className="rounded-2xl p-1.5 mb-6 overflow-x-auto"
          style={{ background: '#0A1434', border: '1px solid rgba(27,58,140,0.3)', scrollbarWidth: 'none' }}>
          <div className="flex gap-1.5 min-w-max sm:min-w-0 sm:flex-wrap">
          {tabs.map((tab) => {
            const isDisabled = tab.requiresLicense && !hasActiveLicense;
            const isActive = activeTab === tab.id;
            return (
              <button key={tab.id}
                onClick={() => !isDisabled && setActiveTab(tab.id)}
                disabled={isDisabled}
                title={isDisabled ? 'Licence active requise' : tab.fullLabel}
                className="flex items-center gap-2 px-3 sm:px-4 py-2.5 rounded-xl text-xs font-bold transition-all duration-300 whitespace-nowrap flex-shrink-0"
                style={isActive
                  ? { background: `linear-gradient(135deg, ${tab.accent}cc, ${tab.accent})`, color: '#fff', boxShadow: `0 4px 16px ${tab.accent}30` }
                  : isDisabled
                  ? { background: 'transparent', color: 'rgba(255,255,255,0.2)', cursor: 'not-allowed' }
                  : { background: 'transparent', color: 'rgba(255,255,255,0.5)' }}>
                <span style={{ color: isActive ? '#fff' : isDisabled ? 'rgba(255,255,255,0.2)' : tab.accent }}>{tab.icon}</span>
                <span className="hidden xs:inline sm:inline">{tab.label}</span>
                {/* Mobile : show label only for active tab */}
                <span className="inline xs:hidden sm:hidden" style={{ display: isActive ? 'inline' : 'none' }}>{tab.label}</span>
                {isDisabled && (
                  <svg className="w-3 h-3 opacity-40 hidden sm:block" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                )}
              </button>
            );
          })}
          </div>
        </div>
      </ScrollReveal>

      {/* ── Content ── */}
      <div>
        {activeTab === 'documents' && <DocumentsManagementSection />}

        {activeTab === 'qa' && (
          <ScrollReveal direction="up" delay={0}>
            <div className="rounded-3xl overflow-hidden"
              style={{ borderTop: '2px solid rgba(201,168,76,0.25)', borderRight: '2px solid rgba(201,168,76,0.25)', borderBottom: '2px solid rgba(201,168,76,0.25)', borderLeft: '4px solid #C9A84C', background: '#070E28', boxShadow: '0 0 28px rgba(201,168,76,0.06)' }}>
              {/* Header */}
              <div className="px-4 sm:px-6 py-4 sm:py-5 flex items-center gap-3 sm:gap-4"
                style={{ borderBottom: '1px solid rgba(201,168,76,0.15)', background: 'rgba(201,168,76,0.05)' }}>
                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: 'rgba(201,168,76,0.15)', border: '1px solid rgba(201,168,76,0.3)' }}>
                  <svg className="w-4 h-4 sm:w-5 sm:h-5 text-[#C9A84C]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                </div>
                <div className="min-w-0">
                  <h2 className="text-base sm:text-lg font-black text-white leading-tight">Questions sur votre base de connaissances</h2>
                  <p className="text-xs text-white/45 mt-0.5">Testez la recherche RAG sur vos documents organisationnels</p>
                </div>
              </div>

              <div className="p-4 sm:p-6">
                <p className="text-xs text-white/50 mb-5 leading-relaxed">
                  Posez une question. Si votre licence le permet, l'IA cherche d'abord dans la base globale <span className="font-bold text-[#1B3A8C]">GLOBAL</span>, puis dans les documents de votre organisation <span className="font-bold text-[#C9A84C]">LOCAL</span>, puis répond sans contexte <span className="font-bold text-white/60">LLM_ONLY</span> si aucune source pertinente n'est trouvée.
                </p>

                {ragError && (
                  <div className="mb-4 p-4 rounded-xl text-sm text-red-300"
                    style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
                    {ragError}
                  </div>
                )}

                <div className="space-y-3">
                  <textarea
                    value={ragQuestion}
                    onChange={(e) => setRagQuestion(e.target.value)}
                    placeholder="Ex: Quelles sont les valeurs et la vision fondamentale du dispositif de crédit à la BSIC Niger ?"
                    className="w-full min-h-[120px] p-4 rounded-xl text-white text-sm placeholder-white/25 focus:outline-none transition-all resize-none"
                    style={{ background: '#040B1E', border: '1px solid rgba(27,58,140,0.4)' }}
                    onFocus={e => { e.target.style.borderColor = 'rgba(201,168,76,0.5)'; }}
                    onBlur={e => { e.target.style.borderColor = 'rgba(27,58,140,0.4)'; }}
                  />

                  <div className="flex flex-wrap items-center gap-3">
                    <button onClick={handleRagQuery} disabled={ragBusy}
                      className="px-5 py-2.5 rounded-xl text-sm font-bold text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:scale-[1.02] flex-shrink-0"
                      style={{ background: ragBusy ? 'rgba(27,58,140,0.3)' : 'linear-gradient(135deg, #1B3A8C 0%, #2e5bb8 50%, #C9A84C 100%)', boxShadow: ragBusy ? 'none' : '0 4px 16px rgba(27,58,140,0.3)' }}>
                      {ragBusy ? (
                        <span className="flex items-center gap-2">
                          <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                          </svg>
                          Recherche en cours…
                        </span>
                      ) : (
                        <span className="flex items-center gap-2">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                          </svg>
                          Envoyer
                        </span>
                      )}
                    </button>

                    {ragStrategy && (
                      <div className="flex items-center gap-2 text-xs text-white/45">
                        <span className="hidden sm:inline">Stratégie :</span>
                        <span className="px-2 py-1 rounded-lg font-black text-[#C9A84C]"
                          style={{ background: 'rgba(201,168,76,0.1)', border: '1px solid rgba(201,168,76,0.2)' }}>
                          {ragStrategy}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {ragAnswer && (
                  <div className="mt-6 space-y-4">
                    {/* Badge stratégie WEB */}
                    {ragStrategy === 'WEB' && (
                      <div className="flex items-center gap-2 px-3 py-2 rounded-xl w-fit"
                        style={{ background: 'rgba(5,150,105,0.1)', border: '1px solid rgba(5,150,105,0.25)' }}>
                        <svg className="w-3.5 h-3.5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                        </svg>
                        <span className="text-xs font-bold text-emerald-400">Réponse enrichie par recherche web</span>
                      </div>
                    )}

                    {/* Réponse */}
                    <div>
                      <div className="flex items-center gap-3 mb-3 pb-3"
                        style={{ borderBottom: '1px solid rgba(201,168,76,0.2)' }}>
                        <span className="w-1 h-5 rounded-full flex-shrink-0" style={{ background: '#C9A84C' }} />
                        <h3 className="text-sm font-black uppercase tracking-[0.12em] text-white">Réponse</h3>
                      </div>
                      <div className="p-5 rounded-2xl text-white/80 text-sm whitespace-pre-wrap leading-relaxed"
                        style={{ background: '#040B1E', border: '1px solid rgba(27,58,140,0.25)' }}>
                        {ragAnswer}
                      </div>
                    </div>

                    {/* Sources web */}
                    {ragSources.length > 0 && (
                      <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid rgba(5,150,105,0.2)' }}>
                        <div className="px-4 py-2.5 flex items-center gap-2" style={{ background: 'rgba(5,150,105,0.08)', borderBottom: '1px solid rgba(5,150,105,0.15)' }}>
                          <svg className="w-3.5 h-3.5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                          </svg>
                          <span className="text-xs font-black uppercase tracking-[0.12em] text-emerald-400">Sources web consultées</span>
                        </div>
                        <div className="p-3 space-y-2" style={{ background: '#040B1E' }}>
                          {ragSources.map((src: any, i: number) => (
                            <a key={i} href={src.url} target="_blank" rel="noopener noreferrer"
                              className="flex items-start gap-3 px-3 py-2.5 rounded-xl group transition-all hover:scale-[1.01]"
                              style={{ background: 'rgba(5,150,105,0.06)', border: '1px solid rgba(5,150,105,0.15)' }}>
                              <svg className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                              </svg>
                              <div className="min-w-0">
                                <p className="text-xs font-semibold text-white group-hover:text-emerald-300 transition-colors truncate">{src.documentName || src.url}</p>
                                <p className="text-[10px] text-white/35 truncate mt-0.5">{src.url}</p>
                              </div>
                              {src.url?.endsWith('.pdf') && (
                                <span className="flex-shrink-0 px-1.5 py-0.5 rounded text-[9px] font-bold text-red-300" style={{ background: 'rgba(239,68,68,0.15)' }}>PDF</span>
                              )}
                            </a>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </ScrollReveal>
        )}

        {activeTab === 'ai-search' && <AISearchConfigSection />}
        {activeTab === 'ai-response' && <AIResponseConfigSection />}
        {activeTab === 'quotas' && <QuotasManagementSection />}
        {activeTab === 'permissions' && <TabPermissionsSection />}
      </div>
    </div>
  );
}
