'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useEffect, useState, useRef } from 'react';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import ScrollReveal from '@/components/home/ScrollReveal';
import { authApi } from '@/lib/api/auth';

/* ─── Animated Counter ─────────────────────────────────────────────────── */
function AnimatedCounter({
  end,
  suffix = '',
  prefix = '',
  duration = 2200,
}: {
  end: number;
  suffix?: string;
  prefix?: string;
  duration?: number;
}) {
  const [count, setCount] = useState(0);
  const [started, setStarted] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => { if (entries[0].isIntersecting && !started) setStarted(true); },
      { threshold: 0.5 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [started]);

  useEffect(() => {
    if (!started) return;
    let startTime: number | null = null;
    const animate = (ts: number) => {
      if (!startTime) startTime = ts;
      const progress = Math.min((ts - startTime) / duration, 1);
      setCount(Math.floor((1 - Math.pow(1 - progress, 3)) * end));
      if (progress < 1) requestAnimationFrame(animate);
      else setCount(end);
    };
    requestAnimationFrame(animate);
  }, [started, end, duration]);

  return <span ref={ref}>{prefix}{count}{suffix}</span>;
}

/* ─── SVG Icons ────────────────────────────────────────────────────────── */
const IcShield   = () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" /></svg>;
const IcBolt     = () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" /></svg>;
const IcUsers    = () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" /></svg>;
const IcChart    = () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" /></svg>;
const IcCheck    = () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4.5 12.75l6 6 9-13.5" /></svg>;
const IcArrow    = () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" /></svg>;
const IcLock     = () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" /></svg>;
const IcDatabase = () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M20.25 6.375c0 2.278-3.694 4.125-8.25 4.125S3.75 8.653 3.75 6.375m16.5 0c0-2.278-3.694-4.125-8.25-4.125S3.75 4.097 3.75 6.375m16.5 0v11.25c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125V6.375m16.5 2.625c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125" /></svg>;
const IcEye      = () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>;
const IcGlobe    = () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418" /></svg>;

/* ─── Data ─────────────────────────────────────────────────────────────── */
const bankTypes = [
  'Banques Commerciales', 'Établissements de Microfinance', 'Caisses d\'Épargne',
  'Banques d\'Affaires', 'Sociétés de Financement', 'Groupes Bancaires Régionaux',
  'Institutions Financières UEMOA', 'Banques de Développement',
];

const features = [
  { image: '/imageA.jpg', tag: 'Réglementation', title: 'Base de Connaissance Réglementaire', description: 'Base structurée regroupant les référentiels PCB et la documentation interne. L\'IA répond avec précision et conformité.' },
  { image: '/imageB.jpg', tag: 'Crédit', title: 'Analyse de Crédit Intelligente', description: 'Accélère l\'analyse des dossiers Particuliers et PME/PMI. Structure automatiquement les données, identifie les risques et génère des synthèses pour la décision.' },
  { image: '/imageC.jpg', tag: 'Recouvrement', title: 'Recouvrement Automatisé des Impayés', description: 'Automatise le recouvrement en 3 étapes : import et qualification, relances personnalisées par tranche de retard, suivi et restructuration des dossiers.' },
  { image: '/imageD.jpg', tag: 'Finance', title: 'États Financiers PCB UEMOA', description: 'Génère automatiquement le bilan, le compte de résultat et le hors-bilan. Calcule les ratios prudentiels, interprète les résultats et fournit des alertes et recommandations conformes.' },
  { image: '/imageE.jpg', tag: 'Formation', title: 'Génération de Contenus de Formation', description: 'Produit des contenus pédagogiques adaptés au contexte UEMOA. Génère chapitres, modules et supports pour accélérer la montée en compétence des équipes.' },
];

const metrics = [
  { value: 70,  suffix: '%', prefix: '-', label: 'Réduction du temps d\'analyse crédit',    gold: false },
  { value: 40,  suffix: '%', prefix: '+', label: 'Amélioration taux de recouvrement',        gold: true  },
  { value: 100, suffix: '%', prefix: '',  label: 'Conformité réglementation BCEAO/UEMOA',   gold: false },
  { value: 5,   suffix: '',  prefix: '',  label: 'Modules intégrés en une seule plateforme', gold: true  },
];

const steps = [
  { n: '1', title: 'Configurez votre espace', desc: 'Importez vos documents réglementaires, politiques internes et données financières. Paramétrez les accès par rôle en quelques minutes.' },
  { n: '2', title: 'Analysez en temps réel',  desc: 'L\'IA traite vos données, génère les états financiers, analyse les dossiers de crédit et qualifie les impayés automatiquement.' },
  { n: '3', title: 'Décidez avec confiance', desc: 'Obtenez des synthèses claires, des recommandations actionnables et des rapports conformes BCEAO prêts à soumettre.' },
];

const benefits = [
  { title: 'Gain de temps opérationnel',    desc: 'Réduction drastique des tâches répétitives. Accès instantané à l\'information réglementaire sans recherche manuelle.', icon: <IcBolt /> },
  { title: 'Maîtrise du risque crédit',     desc: 'Analyses homogènes, documentées et reproductibles. Identification automatique des zones de risque dans les dossiers.', icon: <IcShield /> },
  { title: 'Recouvrement optimisé',         desc: 'Structuration et automatisation du processus avec suivi de performance et identification des dossiers éligibles.', icon: <IcChart /> },
  { title: 'Montée en compétence continue', desc: 'Accès à la demande aux formations adaptées au contexte UEMOA. Contenu généré automatiquement, cohérent et à jour.', icon: <IcUsers /> },
];

const security = [
  { icon: <IcLock />,     title: 'Chiffrement AES-256',   desc: 'Données chiffrées en transit et au repos' },
  { icon: <IcDatabase />, title: 'Hébergement Afrique',   desc: 'Infrastructure localisée dans la zone UEMOA' },
  { icon: <IcEye />,      title: 'Audit Trail Complet',   desc: 'Traçabilité totale de toutes les actions' },
  { icon: <IcGlobe />,    title: 'Conformité BCEAO',      desc: 'Aligné sur les instructions réglementaires' },
  { icon: <IcShield />,   title: 'Accès Multi-niveaux',   desc: 'Contrôle des droits par rôle et entité' },
  { icon: <IcChart />,    title: 'Disponibilité 99.9%',   desc: 'Infrastructure haute disponibilité 24/7' },
];

const testimonials = [
  { quote: 'NovaBanque a transformé notre processus d\'analyse de crédit. Ce qui prenait 3 jours se fait désormais en quelques heures. Un gain de productivité remarquable pour nos équipes.', name: 'Directeur des Risques', org: 'Banque Commerciale — Niger', initials: 'DR' },
  { quote: 'La conformité réglementaire n\'a jamais été aussi simple. Les états financiers PCB se génèrent automatiquement avec une précision que nos auditeurs ont saluée.', name: 'Directrice Financière', org: 'Institution Financière — Niger', initials: 'DF' },
  { quote: 'Notre taux de recouvrement des impayés a progressé de 40% depuis l\'implémentation. L\'automatisation des relances et la qualification intelligente font la différence.', name: 'Responsable Recouvrement', org: 'Établissement Bancaire — Niger', initials: 'RR' },
];

/* ─── Gradient Button ───────────────────────────────────────────────────── */
function GoldBtn({ href, children, outline = false }: { href: string; children: React.ReactNode; outline?: boolean }) {
  if (outline) {
    return (
      <Link href={href} className="px-8 py-4 text-sm font-bold text-[#0C1B3A] rounded-2xl border-2 border-[#C9A84C] bg-transparent hover:bg-[#C9A84C]/10 transition-all duration-300 hover:scale-105 flex items-center gap-2">
        {children}
      </Link>
    );
  }
  return (
    <Link href={href} className="group relative px-8 py-4 text-sm font-bold text-white rounded-2xl overflow-hidden transition-all duration-300 hover:scale-105 shadow-lg shadow-[#1B3A8C]/30 hover:shadow-[#1B3A8C]/50 flex items-center gap-2">
      <div className="absolute inset-0 bg-[#1B3A8C]" />
      <div className="absolute inset-0 bg-gradient-to-r from-[#1B3A8C] to-[#0F2864] opacity-100" />
      <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-[#C9A84C] to-transparent" />
      <span className="relative z-10 flex items-center gap-2">{children}</span>
    </Link>
  );
}

/* ─── Section label ─────────────────────────────────────────────────────── */
function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#1B3A8C]/10 border border-[#1B3A8C]/20 mb-4">
      <span className="w-1.5 h-1.5 rounded-full bg-[#C9A84C]" />
      <span className="text-xs font-bold uppercase tracking-[0.2em] text-[#1B3A8C]">{children}</span>
    </div>
  );
}

/* ─── Page ──────────────────────────────────────────────────────────────── */
export default function Home() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);

  useEffect(() => {
    const user = authApi.getCurrentUser();
    setIsAuthenticated(!!user);
    setUserRole(user?.role || null);
  }, []);

  const dashboardHref =
    userRole === 'admin' ? '/org/dashboard' :
    userRole === 'superadmin' ? '/admin/dashboard' : '/user/dashboard';

  return (
    <div className="min-h-screen flex flex-col overflow-x-hidden">

      <Navbar />

      {/* ══════════════ HERO — Bleu Nuit Royal ══════════════════════════ */}
      <section className="relative flex items-center justify-center min-h-screen px-4 sm:px-6 lg:px-8 pt-20 pb-16 overflow-hidden bg-[#070E28]">
        {/* Animated orbs */}
        <div className="absolute inset-0 bg-grid-pattern pointer-events-none opacity-60" />
        <div className="absolute top-1/4 left-1/6  w-[480px] h-[480px] bg-[#1B3A8C]/25 rounded-full blur-[120px] animate-float-1 pointer-events-none" />
        <div className="absolute top-1/3 right-1/6 w-[360px] h-[360px] bg-[#0F2864]/30 rounded-full blur-[100px] animate-float-2 pointer-events-none" />
        <div className="absolute bottom-1/4 left-1/3 w-[300px] h-[300px] bg-[#C9A84C]/8  rounded-full blur-[80px]  animate-float-3 pointer-events-none" />

        <div className="relative z-10 max-w-5xl mx-auto text-center w-full">

          {/* Live badge */}
          <ScrollReveal direction="fade" delay={0}>
            <div className="inline-flex items-center gap-2.5 px-5 py-2.5 mb-8 bg-white/5 backdrop-blur-xl rounded-full border border-white/10">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#C9A84C] opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-[#C9A84C]" />
              </span>
              <span className="text-sm font-semibold text-white/80 tracking-wide">
                Plateforme — conforme PCB UEMOA
              </span>
            </div>
          </ScrollReveal>

          {/* Title */}
          <ScrollReveal direction="down" delay={100}>
            <h1 className="text-6xl sm:text-7xl md:text-8xl lg:text-[96px] font-black mb-6 leading-[0.9] tracking-tight">
              <span className="block text-white">Nova</span>
              <span className="block text-[#C9A84C] animate-text-shimmer"
                style={{ backgroundImage: 'linear-gradient(90deg,#C9A84C,#E8D08A,#C9A84C,#9A7A30,#C9A84C)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundSize: '200% auto' }}>
                Banque
              </span>
            </h1>
          </ScrollReveal>

          {/* Tagline */}
          <ScrollReveal direction="up" delay={200}>
            <p className="text-xl sm:text-2xl md:text-3xl mb-5 font-medium text-white/60 leading-snug max-w-3xl mx-auto">
              L&apos;intelligence artificielle au service de la{' '}
              <span className="text-white font-bold">décision bancaire africaine</span>
            </p>
          </ScrollReveal>

          {/* Description */}
          <ScrollReveal direction="up" delay={280}>
            <p className="text-base sm:text-lg mb-12 leading-relaxed text-white/40 max-w-2xl mx-auto">
              Assistance réglementaire, analyse de crédit, recouvrement des impayés, états financiers PCB
              UEMOA et formation — tout en un, en parfaite conformité BCEAO.
            </p>
          </ScrollReveal>

          {/* CTAs */}
          <ScrollReveal direction="up" delay={360}>
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-14">
              {isAuthenticated && userRole ? (
                <GoldBtn href={dashboardHref}>
                  <IcChart /> Accéder au Dashboard
                </GoldBtn>
              ) : (
                <>
                  <GoldBtn href="/login">
                    Démarrer maintenant <IcArrow />
                  </GoldBtn>
                  <a href="#features"
                    className="px-8 py-4 text-sm font-semibold text-white/70 hover:text-white rounded-2xl border border-white/15 hover:border-white/30 bg-white/5 hover:bg-white/10 backdrop-blur-sm transition-all duration-300 hover:scale-105">
                    Voir les fonctionnalités
                  </a>
                </>
              )}
            </div>
          </ScrollReveal>

          {/* Trust chips */}
          <ScrollReveal direction="fade" delay={420}>
            <div className="flex flex-wrap justify-center gap-2.5 mb-16">
              {['BCEAO Compatible', 'PCB UEMOA', 'Données Sécurisées', 'Audit Trail', 'ISO 27001'].map((b) => (
                <span key={b} className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs font-semibold text-white/50">
                  <IcCheck /> {b}
                </span>
              ))}
            </div>
          </ScrollReveal>

          {/* Stats row */}
          <ScrollReveal direction="up" delay={480}>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-3xl mx-auto">
              {[
                { icon: <IcShield />, n: '100%', l: 'Sécurisé' },
                { icon: <IcBolt />,   n: '24/7',  l: 'Disponible' },
                { icon: <IcUsers />,  n: '5',     l: 'Modules IA' },
                { icon: <IcChart />,  n: '99.9%', l: 'Uptime' },
              ].map((s, i) => (
                <ScrollReveal key={i} direction="fade" delay={560 + i * 60}>
                  <div className="group p-5 bg-white/[0.04] backdrop-blur-xl rounded-2xl border border-white/[0.08] hover:border-[#C9A84C]/30 hover:bg-white/[0.07] transition-all duration-400 cursor-default">
                    <div className="flex justify-center mb-2 text-[#C9A84C]/70 group-hover:text-[#C9A84C] transition-colors">{s.icon}</div>
                    <div className="text-2xl font-black mb-1 text-white">{s.n}</div>
                    <div className="text-[10px] font-bold text-white/40 uppercase tracking-widest">{s.l}</div>
                  </div>
                </ScrollReveal>
              ))}
            </div>
          </ScrollReveal>
        </div>

        <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-[#F8F9FC] to-transparent pointer-events-none" />
      </section>

      {/* ══════════════ MARQUEE ══════════════════════════════════════════ */}
      <div className="relative py-6 overflow-hidden border-y border-[#1B3A8C]/15 bg-white">
        <div className="absolute left-0 top-0 bottom-0 w-24 bg-gradient-to-r from-white to-transparent z-10 pointer-events-none" />
        <div className="absolute right-0 top-0 bottom-0 w-24 bg-gradient-to-l from-white to-transparent z-10 pointer-events-none" />
        <div className="flex gap-0 animate-marquee whitespace-nowrap">
          {[...bankTypes, ...bankTypes].map((t, i) => (
            <span key={i} className="inline-flex items-center gap-3 px-8 text-sm font-semibold text-[#1B3A8C]/60">
              <span className="w-1.5 h-1.5 rounded-full bg-[#C9A84C] flex-shrink-0" />
              {t}
            </span>
          ))}
        </div>
      </div>

      {/* ══════════════ METRICS ══════════════════════════════════════════ */}
      <section className="py-20 sm:py-28 px-4 sm:px-6 lg:px-8 bg-[#F8F9FC]">
        <div className="max-w-6xl mx-auto">
          <ScrollReveal direction="up" delay={0}>
            <div className="text-center mb-16">
              <SectionLabel>Impact mesurable</SectionLabel>
              <h2 className="text-4xl sm:text-5xl font-black text-[#0C1B3A] mb-4">
                Des résultats qui parlent
              </h2>
              <p className="text-lg text-[#64748B] max-w-xl mx-auto">
                Nos clients constatent des améliorations significatives dès les premières semaines.
              </p>
            </div>
          </ScrollReveal>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {metrics.map((m, i) => (
              <ScrollReveal key={i} direction="up" delay={i * 100}>
                <div className={`group relative p-8 rounded-3xl border text-center transition-all duration-500 hover:scale-[1.03] hover:shadow-xl overflow-hidden ${
                  m.gold
                    ? 'bg-[#1B3A8C] border-[#1B3A8C] text-white hover:shadow-[#1B3A8C]/20'
                    : 'bg-white border-[#E2E8F0] hover:border-[#1B3A8C]/30 hover:shadow-[#1B3A8C]/10'
                }`}>
                  {m.gold && <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-transparent via-[#C9A84C] to-transparent" />}
                  <div className={`text-5xl sm:text-6xl font-black mb-3 ${m.gold ? 'text-[#C9A84C]' : 'text-[#1B3A8C]'}`}>
                    <AnimatedCounter end={m.value} suffix={m.suffix} prefix={m.prefix} />
                  </div>
                  <p className={`text-sm font-medium leading-snug ${m.gold ? 'text-white/70' : 'text-[#64748B]'}`}>{m.label}</p>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════ FEATURES ═════════════════════════════════════════ */}
      <section id="features" className="py-20 sm:py-28 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-7xl mx-auto">
          <ScrollReveal direction="up" delay={0}>
            <div className="text-center mb-16">
              <SectionLabel>5 modules intégrés</SectionLabel>
              <h2 className="text-4xl sm:text-5xl md:text-6xl font-black text-[#0C1B3A] mb-4">
                Fonctionnalités
              </h2>
              <p className="text-lg text-[#64748B] max-w-2xl mx-auto">
                Une plateforme complète pour couvrir l&apos;ensemble de vos besoins opérationnels bancaires.
              </p>
            </div>
          </ScrollReveal>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((f, i) => (
              <ScrollReveal key={i} direction="up" delay={i * 80}>
                <div className="group relative overflow-hidden bg-white rounded-[28px] border border-[#E2E8F0] hover:border-[#1B3A8C]/30 transition-all duration-500 hover:scale-[1.02] hover:shadow-2xl hover:shadow-[#1B3A8C]/10 flex flex-col h-full">
                  {/* Tag */}
                  <div className="absolute top-4 right-4 z-20 px-3 py-1 bg-[#1B3A8C] rounded-full text-[10px] font-bold text-white uppercase tracking-wider">
                    {f.tag}
                  </div>

                  {/* Image */}
                  <div className="relative h-52 w-full overflow-hidden flex-shrink-0">
                    <div className="absolute inset-0 bg-gradient-to-t from-white/80 via-transparent to-transparent z-10" />
                    <div className="absolute inset-0 bg-gradient-to-br from-[#1B3A8C]/10 via-transparent to-[#C9A84C]/5 z-10" />
                    <Image
                      src={f.image} alt={f.title} fill
                      className="object-cover group-hover:scale-110 transition-transform duration-700"
                      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                    />
                  </div>

                  {/* Content */}
                  <div className="relative p-7 flex flex-col flex-1">
                    <h3 className="text-base font-bold text-[#0C1B3A] mb-3 group-hover:text-[#1B3A8C] transition-colors duration-300 leading-snug">
                      {f.title}
                    </h3>
                    <p className="text-[#64748B] leading-relaxed text-sm flex-1">{f.description}</p>
                    {/* Gold bottom line */}
                    <div className="mt-6 h-0.5 w-0 group-hover:w-full bg-gradient-to-r from-[#1B3A8C] to-[#C9A84C] transition-all duration-500 rounded-full" />
                  </div>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════ HOW IT WORKS ══════════════════════════════════════ */}
      <section className="py-20 sm:py-28 px-4 sm:px-6 lg:px-8 bg-[#F8F9FC]">
        <div className="max-w-5xl mx-auto">
          <ScrollReveal direction="up" delay={0}>
            <div className="text-center mb-16">
              <SectionLabel>Simple à adopter</SectionLabel>
              <h2 className="text-4xl sm:text-5xl font-black text-[#0C1B3A] mb-4">
                Comment ça marche ?
              </h2>
              <p className="text-lg text-[#64748B] max-w-xl mx-auto">
                Opérationnel en quelques heures. Pas de formation longue, pas d&apos;intégration complexe.
              </p>
            </div>
          </ScrollReveal>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
            {/* Connector (desktop) */}
            <div className="hidden md:block absolute top-[52px] left-[33%] right-[33%] h-px bg-gradient-to-r from-[#1B3A8C]/30 via-[#C9A84C]/40 to-[#1B3A8C]/30" />

            {steps.map((s, i) => (
              <ScrollReveal key={i} direction="up" delay={i * 150}>
                <div className="group relative flex flex-col items-center text-center p-8 bg-white rounded-3xl border border-[#E2E8F0] hover:border-[#1B3A8C]/30 hover:shadow-xl hover:shadow-[#1B3A8C]/8 transition-all duration-400">
                  {/* Number circle */}
                  <div className="relative mb-6">
                    <div className="w-16 h-16 rounded-full bg-[#1B3A8C] flex items-center justify-center shadow-lg shadow-[#1B3A8C]/30 group-hover:scale-110 transition-transform duration-400">
                      <span className="text-2xl font-black text-white">{s.n}</span>
                    </div>
                    {/* Gold ring on hover */}
                    <div className="absolute inset-0 rounded-full border-2 border-[#C9A84C] opacity-0 group-hover:opacity-100 scale-110 group-hover:scale-125 transition-all duration-400" />
                  </div>
                  <h3 className="text-lg font-bold text-[#0C1B3A] mb-3">{s.title}</h3>
                  <p className="text-sm text-[#64748B] leading-relaxed">{s.desc}</p>
                  {/* Gold accent bottom */}
                  <div className="mt-6 h-0.5 w-10 group-hover:w-full bg-gradient-to-r from-[#1B3A8C] to-[#C9A84C] transition-all duration-500 rounded-full" />
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════ BENEFITS ══════════════════════════════════════════ */}
      <section id="benefits" className="py-20 sm:py-28 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-5xl mx-auto">
          <ScrollReveal direction="up" delay={0}>
            <div className="text-center mb-16">
              <SectionLabel>Pourquoi NovaBanque ?</SectionLabel>
              <h2 className="text-4xl sm:text-5xl font-black text-[#0C1B3A] mb-4">
                Conçu pour la performance bancaire
              </h2>
              <p className="text-lg text-[#64748B] max-w-xl mx-auto">
                Chaque fonctionnalité répond à un besoin opérationnel concret des institutions financières.
              </p>
            </div>
          </ScrollReveal>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {benefits.map((b, i) => (
              <ScrollReveal key={i} direction={i % 2 === 0 ? 'left' : 'right'} delay={i * 100}>
                <div className="group flex items-start gap-5 p-7 rounded-3xl bg-white border border-[#E2E8F0] hover:border-[#1B3A8C]/25 hover:shadow-lg hover:shadow-[#1B3A8C]/8 transition-all duration-400 hover:scale-[1.02]">
                  <div className="flex-shrink-0 w-12 h-12 rounded-2xl bg-[#1B3A8C] flex items-center justify-center text-white shadow-md shadow-[#1B3A8C]/25 group-hover:scale-110 transition-transform duration-300">
                    {b.icon}
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-[#0C1B3A] mb-2">{b.title}</h3>
                    <p className="text-sm text-[#64748B] leading-relaxed">{b.desc}</p>
                  </div>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════ SECURITY ══════════════════════════════════════════ */}
      <section className="py-20 sm:py-28 px-4 sm:px-6 lg:px-8 bg-[#0C1B3A] overflow-hidden relative">
        <div className="absolute inset-0 bg-grid-pattern opacity-30" />
        <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-[#1B3A8C]/20 rounded-full blur-[100px] pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-[#C9A84C]/8  rounded-full blur-[80px]  pointer-events-none" />

        <div className="relative max-w-5xl mx-auto">
          <ScrollReveal direction="up" delay={0}>
            <div className="text-center mb-16">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#C9A84C]/15 border border-[#C9A84C]/25 mb-4">
                <span className="w-1.5 h-1.5 rounded-full bg-[#C9A84C]" />
                <span className="text-xs font-bold uppercase tracking-[0.2em] text-[#C9A84C]">Sécurité & Conformité</span>
              </div>
              <h2 className="text-4xl sm:text-5xl font-black text-white mb-4">
                Fiabilité de niveau bancaire
              </h2>
              <p className="text-lg text-white/50 max-w-xl mx-auto">
                Architecturé pour répondre aux exigences les plus strictes des régulateurs et auditeurs.
              </p>
            </div>
          </ScrollReveal>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {security.map((s, i) => (
              <ScrollReveal key={i} direction="up" delay={i * 80}>
                <div className="group flex items-start gap-4 p-6 bg-white/[0.04] backdrop-blur-xl rounded-2xl border border-white/[0.08] hover:border-[#C9A84C]/30 hover:bg-white/[0.07] transition-all duration-300">
                  <div className="flex-shrink-0 w-11 h-11 rounded-xl bg-[#C9A84C]/15 border border-[#C9A84C]/20 flex items-center justify-center text-[#C9A84C] group-hover:scale-110 transition-transform duration-300">
                    {s.icon}
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white mb-1">{s.title}</h4>
                    <p className="text-xs text-white/40 leading-relaxed">{s.desc}</p>
                  </div>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════ TESTIMONIALS ═════════════════════════════════════ */}
      <section className="py-20 sm:py-28 px-4 sm:px-6 lg:px-8 bg-[#F8F9FC]">
        <div className="max-w-6xl mx-auto">
          <ScrollReveal direction="up" delay={0}>
            <div className="text-center mb-16">
              <SectionLabel>Témoignages</SectionLabel>
              <h2 className="text-4xl sm:text-5xl font-black text-[#0C1B3A] mb-4">
                Ils nous font confiance
              </h2>
              <p className="text-lg text-[#64748B] max-w-xl mx-auto">
                Des professionnels bancaires de la zone UEMOA partagent leur expérience.
              </p>
            </div>
          </ScrollReveal>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {testimonials.map((t, i) => (
              <ScrollReveal key={i} direction="up" delay={i * 120}>
                <div className="group flex flex-col h-full p-8 bg-white rounded-3xl border border-[#E2E8F0] hover:border-[#1B3A8C]/25 hover:shadow-xl hover:shadow-[#1B3A8C]/10 transition-all duration-500 overflow-hidden relative">
                  {/* Big quote */}
                  <div className="absolute top-4 right-6 text-7xl font-black text-[#1B3A8C]/5 leading-none select-none">"</div>

                  {/* Stars */}
                  <div className="flex gap-1 mb-5">
                    {[...Array(5)].map((_, s) => (
                      <svg key={s} className="w-4 h-4 text-[#C9A84C]" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                    ))}
                  </div>

                  <blockquote className="text-[#334155] text-sm leading-relaxed flex-1 mb-6">
                    &ldquo;{t.quote}&rdquo;
                  </blockquote>

                  <div className="flex items-center gap-3 pt-5 border-t border-[#E2E8F0]">
                    <div className="w-10 h-10 rounded-full bg-[#1B3A8C] flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                      {t.initials}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-[#0C1B3A]">{t.name}</p>
                      <p className="text-xs text-[#94A3B8]">{t.org}</p>
                    </div>
                  </div>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════ CTA FINAL ════════════════════════════════════════ */}
      <section className="py-20 sm:py-28 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-4xl mx-auto">
          <ScrollReveal direction="up" delay={0}>
            <div className="relative overflow-hidden rounded-[40px] p-12 sm:p-16 text-center bg-[#070E28]">
              {/* Background effects */}
              <div className="absolute inset-0 bg-grid-pattern opacity-40" />
              <div className="absolute top-0 right-0 w-80 h-80 bg-[#1B3A8C]/25 rounded-full blur-[80px] animate-float-1" />
              <div className="absolute bottom-0 left-0 w-64 h-64 bg-[#C9A84C]/8  rounded-full blur-[60px] animate-float-2" />
              {/* Gold top border */}
              <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#C9A84C]/50 to-transparent" />
              <div className="absolute inset-0 rounded-[40px] border border-white/[0.06]" />

              <div className="relative z-10">
                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#C9A84C]/15 border border-[#C9A84C]/25 mb-6">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#C9A84C]" />
                  <span className="text-xs font-bold uppercase tracking-[0.2em] text-[#C9A84C]">Commencez dès aujourd&apos;hui</span>
                </div>
                <h2 className="text-4xl sm:text-5xl md:text-6xl font-black text-white mb-6 leading-tight">
                  Prêt à transformer{' '}
                  <span className="text-[#C9A84C]">votre banque ?</span>
                </h2>
                <p className="text-lg text-white/50 mb-10 max-w-xl mx-auto leading-relaxed">
                  Rejoignez les institutions financières de la zone UEMOA qui font confiance à
                  NovaBanque pour leurs opérations bancaires quotidiennes.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Link href="/login"
                    className="group relative px-10 py-4 text-sm font-bold text-white rounded-2xl overflow-hidden transition-all duration-300 hover:scale-105 shadow-lg shadow-[#1B3A8C]/30 hover:shadow-[#1B3A8C]/50">
                    <div className="absolute inset-0 bg-[#1B3A8C]" />
                    <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-[#C9A84C] to-transparent" />
                    <span className="relative z-10 flex items-center gap-2">
                      Accéder à la plateforme <IcArrow />
                    </span>
                  </Link>
                  <a href="mailto:support@novabanque.com"
                    className="px-10 py-4 text-sm font-semibold text-white/70 hover:text-white rounded-2xl border border-white/15 hover:border-[#C9A84C]/40 bg-white/5 hover:bg-white/8 backdrop-blur-sm transition-all duration-300 hover:scale-105">
                    Contacter notre équipe
                  </a>
                </div>
              </div>
            </div>
          </ScrollReveal>
        </div>
      </section>

      <Footer />
    </div>
  );
}
