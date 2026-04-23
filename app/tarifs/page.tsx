import type { Metadata } from 'next';
import Link from 'next/link';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import { OfferCTA } from '@/components/tarifs/OfferCTA';
import { QrCodeBlock } from '@/components/tarifs/QrCodeBlock';

export const metadata: Metadata = {
  title: 'Tarifs | Miznas Pilot',
  description:
    "Abonnement mobile Miznas Pilot pour les professionnels bancaires UEMOA : base de connaissance réglementaire + plus de 100 formations. Mensuel 7 500 FCFA, semestriel 35 000 FCFA, annuel 60 000 FCFA. Solutions sur-mesure pour les institutions.",
};

// ── Constantes ──────────────────────────────────────────────────────────────
const WA_NUMBER = '22796648383'; // +227 96 64 83 83 (format wa.me sans + ni espaces)
const MOBILE_APP_URL = 'https://app.miznas.co';

const buildWaLink = (message: string) =>
  `https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(message)}`;

const WA_MESSAGES = {
  monthly:
    "Bonjour, je souhaite souscrire à l'offre Mensuelle de Miznas Pilot (7 500 FCFA/mois). Merci de me guider dans la procédure.",
  semester:
    "Bonjour, je souhaite souscrire à l'offre Semestrielle de Miznas Pilot (35 000 FCFA / 6 mois). Merci de me guider dans la procédure.",
  annual:
    "Bonjour, je souhaite souscrire à l'offre Annuelle de Miznas Pilot (60 000 FCFA / an). Merci de me guider dans la procédure.",
  generic:
    "Bonjour, je suis intéressé par Miznas Pilot. Pouvez-vous m'informer sur vos offres ?",
  institution:
    "Bonjour, je représente une institution financière et je souhaite en savoir plus sur les modules Miznas Pilot pour les banques (crédit, impayés, PCB UEMOA). Pouvez-vous me rappeler ?",
};

// ── Icônes inline SVG ───────────────────────────────────────────────────────
const IcCheck = () => (
  <svg
    className="w-4 h-4 flex-shrink-0"
    fill="none"
    stroke="currentColor"
    strokeWidth={3}
    viewBox="0 0 24 24"
    aria-hidden
  >
    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
  </svg>
);

const IcWhatsApp = () => (
  <svg
    className="w-5 h-5"
    viewBox="0 0 24 24"
    fill="currentColor"
    aria-hidden
  >
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.821 11.821 0 0020.885 3.488" />
  </svg>
);

const IcBook = () => (
  <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
  </svg>
);

const IcGraduation = () => (
  <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
    <path strokeLinecap="round" strokeLinejoin="round" d="M4.26 10.147a60.438 60.438 0 0 0-.491 6.347A48.62 48.62 0 0 1 12 20.904a48.62 48.62 0 0 1 8.232-4.41 60.46 60.46 0 0 0-.491-6.347m-15.482 0a50.636 50.636 0 0 0-2.658-.813A59.906 59.906 0 0 1 12 3.493a59.903 59.903 0 0 1 10.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.717 50.717 0 0 1 12 13.489a50.702 50.702 0 0 1 7.74-3.342M6.75 15a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Zm0 0v-3.675A55.378 55.378 0 0 1 12 8.443m-7.007 11.55A5.981 5.981 0 0 0 6.75 15.75v-1.5" />
  </svg>
);

const IcCredit = () => (
  <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 0 0 2.25-2.25V6.75A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25v10.5A2.25 2.25 0 0 0 4.5 19.5Z" />
  </svg>
);

const IcTrendingDown = () => (
  <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6 9 12.75l4.286-4.286a11.948 11.948 0 0 1 4.306 6.43l.776 2.898m0 0 3.182-5.511m-3.182 5.51-5.511-3.181" />
  </svg>
);

const IcChartBar = () => (
  <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z" />
  </svg>
);

// ── Offre type ──────────────────────────────────────────────────────────────
interface Offer {
  key: 'monthly' | 'semester' | 'annual';
  title: string;
  price: string;
  period: string;
  subtitle: string;
  subtitleGold?: boolean;
  features: string[];
  badge?: string;
  featured?: boolean;
}

const OFFERS: Offer[] = [
  {
    key: 'monthly',
    title: 'Mensuel',
    price: '7 500 FCFA',
    period: '/ mois',
    subtitle: 'Sans engagement',
    features: [
      '70 questions IA par mois',
      'Base de connaissance + plus de 100 formations',
      'QCM et évaluations illimités',
      'Résiliable à tout moment',
    ],
  },
  {
    key: 'semester',
    title: 'Semestriel',
    price: '35 000 FCFA',
    period: '/ 6 mois',
    subtitle: 'Économisez 10 000 FCFA',
    subtitleGold: true,
    badge: 'Populaire',
    featured: true,
    features: [
      '380 questions IA sur 6 mois',
      'Base de connaissance + plus de 100 formations',
      'QCM et évaluations illimités',
      'Support prioritaire WhatsApp',
    ],
  },
  {
    key: 'annual',
    title: 'Annuel',
    price: '60 000 FCFA',
    period: '/ an',
    subtitle: 'Économisez 30 000 FCFA',
    subtitleGold: true,
    badge: 'Meilleure valeur',
    features: [
      '780 questions IA sur 12 mois',
      'Base de connaissance + plus de 100 formations',
      'QCM et évaluations illimités',
      'Support prioritaire WhatsApp',
    ],
  },
];

// ── Modules institution ─────────────────────────────────────────────────────
const INSTITUTION_MODULES = [
  {
    Icon: IcCredit,
    title: 'Analyse de Crédit assistée par l\'IA',
    desc: "Automatise l'analyse des dossiers particuliers et PME/PMI : identification des zones de risque, synthèse structurée, décision plus rapide.",
  },
  {
    Icon: IcTrendingDown,
    title: 'Gestion des impayés & recouvrement',
    desc: 'Centralise l\'import et la qualification des impayés, automatise les relances SMS, suit les régularisations en temps réel et fournit les KPI de pilotage du recouvrement.',
  },
  {
    Icon: IcChartBar,
    title: 'États financiers PCB UEMOA',
    desc: 'Génère bilan, compte de résultat et hors-bilan, calcule les ratios prudentiels, interprète les résultats et fournit alertes & recommandations conformes au cadre PCB UEMOA.',
  },
];

// ── FAQ ─────────────────────────────────────────────────────────────────────
const FAQ: { q: string; a: string }[] = [
  {
    q: 'Comment souscrire ?',
    a: "Contactez-nous sur WhatsApp, nous vous guiderons dans l'inscription et l'activation de votre compte après paiement.",
  },
  {
    q: 'Quels sont les modes de paiement acceptés ?',
    a: 'Virement bancaire, Mobile Money (Airtel, Moov, Orange), ou espèces.',
  },
  {
    q: "Puis-je changer de plan en cours d'abonnement ?",
    a: 'Oui, vous pouvez upgrader à tout moment. Le tarif est ajusté au prorata.',
  },
  {
    q: "Que se passe-t-il si j'atteins ma limite de questions ?",
    a: 'Vous pouvez continuer à consulter toutes les formations. Pour plus de questions IA, contactez-nous pour un top-up ou un upgrade.',
  },
  {
    q: "Quelle différence entre l'abonnement mobile et le déploiement institutionnel ?",
    a: "L'abonnement mobile (7 500 – 60 000 FCFA) est un compte individuel donnant accès à la base de connaissance et aux formations via l'app mobile. Le déploiement institutionnel s'adresse aux banques qui souhaitent mettre à disposition de leurs équipes les modules professionnels (crédit, impayés, PCB UEMOA) avec administration centralisée et tarification négociée.",
  },
];

// ── Page ────────────────────────────────────────────────────────────────────
export default function TarifsPage() {
  return (
    <div className="min-h-screen flex flex-col bg-[#070E28]">
      <Navbar />

      {/* ══════════════ HERO ══════════════════════════════════════════ */}
      <section className="relative px-4 sm:px-6 lg:px-8 pt-32 pb-12 sm:pt-40 sm:pb-16 overflow-hidden">
        {/* Orbes décoratifs */}
        <div className="absolute top-10 left-1/4 w-[420px] h-[420px] bg-[#1B3A8C]/25 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute top-40 right-1/4 w-[320px] h-[320px] bg-[#C9A84C]/10 rounded-full blur-[100px] pointer-events-none" />

        <div className="relative max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#C9A84C]/10 border border-[#C9A84C]/25 mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-[#C9A84C]" />
            <span className="text-xs font-bold uppercase tracking-[0.2em] text-[#C9A84C]">
              Tarifs
            </span>
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-white leading-tight mb-5">
            Tarifs Miznas Pilot
          </h1>
          <p className="text-base sm:text-lg text-white/70 leading-relaxed max-w-2xl mx-auto">
            Les tarifs ci-dessous concernent <strong className="text-white">l&apos;application mobile
            Miznas Pilot</strong>, dédiée aux cadres, gestionnaires et agents des banques
            et institutions financières UEMOA. Vous y accédez à deux modules essentiels :
            la <strong className="text-[#C9A84C]">Base de connaissance réglementaire</strong> et
            le <strong className="text-[#C9A84C]">Catalogue de formation à très haute valeur
            ajoutée, à usage opérationnel en milieu bancaire</strong>.
          </p>
        </div>
      </section>

      {/* ══════════════ CE QUE CONTIENT L'ABONNEMENT MOBILE ═══════════ */}
      <section className="relative px-4 sm:px-6 lg:px-8 pb-12">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-8">
            <h2 className="text-xl sm:text-2xl font-black text-white mb-2">
              Votre abonnement mobile comprend
            </h2>
            <p className="text-sm text-white/50">
              Deux modules pensés pour vous accompagner au quotidien
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Module 1 — Base de connaissance */}
            <div className="rounded-2xl p-6 bg-[#0F1E48]/70 border border-[#1B3A8C]/40 hover:border-[#C9A84C]/40 transition-colors">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-[#C9A84C]/15 border border-[#C9A84C]/30 flex items-center justify-center text-[#C9A84C] flex-shrink-0">
                  <IcBook />
                </div>
                <div>
                  <h3 className="text-base font-black text-white mb-2">
                    Base de connaissance réglementaire
                  </h3>
                  <p className="text-sm text-white/70 leading-relaxed">
                    Posez vos questions sur la réglementation bancaire UEMOA (BCEAO, PCB,
                    circulaires) et obtenez des réponses immédiates, sourcées et conformes
                    au cadre réglementaire.
                  </p>
                </div>
              </div>
            </div>

            {/* Module 2 — Formations */}
            <div className="rounded-2xl p-6 bg-[#0F1E48]/70 border border-[#1B3A8C]/40 hover:border-[#C9A84C]/40 transition-colors">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-[#C9A84C]/15 border border-[#C9A84C]/30 flex items-center justify-center text-[#C9A84C] flex-shrink-0">
                  <IcGraduation />
                </div>
                <div>
                  <h3 className="text-base font-black text-white mb-2">
                    Catalogue de formations spécialisées
                  </h3>
                  <p className="text-sm text-white/70 leading-relaxed">
                    Accédez à plus de 100 modules de formation en banque et finance, avec
                    QCM intégrés pour valider vos acquis. Progressez à votre rythme, sur mobile.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <p className="text-center text-xs text-white/40 mt-6 italic">
            Les 3 autres modules Miznas Pilot (crédit, impayés, PCB UEMOA) sont réservés
            aux déploiements institutionnels —{' '}
            <a href="#institution" className="text-[#C9A84C]/80 hover:text-[#C9A84C] underline underline-offset-2">
              voir plus bas
            </a>
            .
          </p>
        </div>
      </section>

      {/* ══════════════ 3 OFFRES ═══════════════════════════════════════ */}
      <section className="relative px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
            {OFFERS.map((offer) => (
              <div
                key={offer.key}
                className={`relative rounded-3xl p-6 sm:p-8 flex flex-col transition-all duration-300 hover:scale-[1.02] ${
                  offer.featured
                    ? 'bg-gradient-to-b from-[#0F1E48] to-[#0A1434] border-2 border-[#C9A84C] shadow-xl shadow-[#C9A84C]/10 md:scale-105'
                    : 'bg-[#0F1E48]/80 border border-[#1B3A8C]/40 shadow-lg shadow-[#1B3A8C]/10'
                }`}
              >
                {/* Badge */}
                {offer.badge && (
                  <div
                    className={`absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-[0.15em] ${
                      offer.featured
                        ? 'bg-[#C9A84C] text-[#0A1434]'
                        : 'bg-[#1B3A8C] text-[#C9A84C] border border-[#C9A84C]/30'
                    }`}
                  >
                    {offer.badge}
                  </div>
                )}

                {/* Titre */}
                <h2 className="text-xl font-black text-white mb-2">
                  {offer.title}
                </h2>

                {/* Prix */}
                <div className="mb-1">
                  <span className="text-3xl sm:text-4xl font-black text-white">
                    {offer.price}
                  </span>
                  <span className="text-sm text-white/60 ml-1">
                    {offer.period}
                  </span>
                </div>

                {/* Sous-titre */}
                <p
                  className={`text-sm mb-6 ${
                    offer.subtitleGold
                      ? 'text-[#C9A84C] font-semibold'
                      : 'text-white/50'
                  }`}
                >
                  {offer.subtitle}
                </p>

                {/* Séparateur */}
                <div className="h-px bg-gradient-to-r from-transparent via-[#C9A84C]/30 to-transparent mb-6" />

                {/* Features */}
                <ul className="space-y-3 mb-8 flex-1">
                  {offer.features.map((f, i) => (
                    <li
                      key={i}
                      className="flex items-start gap-3 text-sm text-white/80 leading-relaxed"
                    >
                      <span className="text-[#C9A84C] mt-0.5">
                        <IcCheck />
                      </span>
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>

                {/* CTA : bouton principal "Demander cette offre" + lien WhatsApp secondaire */}
                <OfferCTA
                  planKey={offer.key}
                  waLink={buildWaLink(WA_MESSAGES[offer.key])}
                  featured={offer.featured}
                />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════ TÉLÉCHARGER L'APP MOBILE ═══════════════════════ */}
      <section className="relative px-4 sm:px-6 lg:px-8 py-16 sm:py-20 bg-[#0A1434]/50">
        <div className="max-w-5xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-10 items-center">
            {/* Texte */}
            <div className="order-2 md:order-1">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#C9A84C]/10 border border-[#C9A84C]/25 mb-5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#C9A84C]" />
                <span className="text-xs font-bold uppercase tracking-[0.2em] text-[#C9A84C]">
                  App mobile
                </span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-black text-white mb-4">
                Téléchargez Miznas Pilot sur votre mobile
              </h2>
              <p className="text-base text-white/70 leading-relaxed mb-5">
                Scannez ce QR code avec votre téléphone pour accéder directement à
                l&apos;application. Compatible Android et iOS, fonctionne également
                depuis votre navigateur web.
              </p>
              <a
                href={MOBILE_APP_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-base font-bold text-[#C9A84C] hover:text-[#E8D08A] transition-colors"
              >
                app.miznas.co
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 0 0 3 8.25v10.5A2.25 2.25 0 0 0 5.25 21h10.5A2.25 2.25 0 0 0 18 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
                </svg>
              </a>
              <p className="mt-5 text-xs text-white/50 italic">
                Essayez gratuitement en mode DEMO avant de souscrire — limite de questions
                réduite, accès à une sélection de formations.
              </p>
            </div>

            {/* QR Code */}
            <div className="order-1 md:order-2 flex justify-center">
              <QrCodeBlock url={MOBILE_APP_URL} size={200} />
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════ SOLUTIONS POUR INSTITUTIONS ═══════════════════ */}
      <section id="institution" className="relative px-4 sm:px-6 lg:px-8 py-16 sm:py-20 scroll-mt-24">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-10">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#1B3A8C]/20 border border-[#1B3A8C]/40 mb-5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#C9A84C]" />
              <span className="text-xs font-bold uppercase tracking-[0.2em] text-[#C9A84C]">
                Solutions Institution
              </span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-white mb-4">
              Vous êtes une banque ou une institution financière ?
            </h2>
            <p className="text-base sm:text-lg text-white/70 leading-relaxed max-w-3xl mx-auto">
              En plus de l&apos;abonnement mobile individuel, Miznas Pilot propose{' '}
              <strong className="text-white">trois modules professionnels</strong> conçus
              pour les équipes et les directions des banques UEMOA. Déploiement sur-mesure,
              multi-utilisateurs, tableau de bord d&apos;administration.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {INSTITUTION_MODULES.map(({ Icon, title, desc }) => (
              <div
                key={title}
                className="rounded-2xl p-6 bg-[#0F1E48]/70 border border-[#1B3A8C]/40 hover:border-[#C9A84C]/40 transition-colors"
              >
                <div className="w-12 h-12 rounded-xl bg-[#C9A84C]/15 border border-[#C9A84C]/30 flex items-center justify-center text-[#C9A84C] mb-4">
                  <Icon />
                </div>
                <h3 className="text-base font-black text-white mb-2 leading-snug">
                  {title}
                </h3>
                <p className="text-sm text-white/70 leading-relaxed">
                  {desc}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-10 rounded-3xl p-6 sm:p-8 bg-gradient-to-br from-[#1B3A8C]/30 to-[#0A1434] border border-[#C9A84C]/30 text-center">
            <p className="text-base sm:text-lg text-white/80 leading-relaxed mb-5 max-w-2xl mx-auto">
              Ces modules sont déployés en mode institutionnel avec{' '}
              <strong className="text-[#C9A84C]">tarification sur devis</strong>.
              Contactez-nous pour étudier votre besoin.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center items-center">
              <a
                href={buildWaLink(WA_MESSAGES.institution)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[#C9A84C] text-[#0A1434] font-black text-sm hover:bg-[#E8D08A] shadow-lg shadow-[#C9A84C]/20 transition-all"
              >
                <IcWhatsApp />
                Demander une démonstration institution
              </a>
              <span className="text-xs text-white/40">
                ou WhatsApp : +227 96 64 83 83
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════ FAQ ═══════════════════════════════════════════ */}
      <section className="relative px-4 sm:px-6 lg:px-8 py-16 sm:py-20 bg-[#0A1434]/50">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-2xl sm:text-3xl font-black text-white mb-3">
              Questions fréquentes
            </h2>
            <p className="text-sm text-white/60">
              Tout ce que vous devez savoir avant de souscrire
            </p>
          </div>

          <div className="space-y-3">
            {FAQ.map((item, i) => (
              <details
                key={i}
                className="group rounded-2xl bg-[#0F1E48]/80 border border-[#1B3A8C]/30 overflow-hidden hover:border-[#C9A84C]/40 transition-colors"
              >
                <summary className="flex items-center justify-between gap-4 px-5 py-4 cursor-pointer list-none">
                  <span className="text-base font-bold text-white">
                    {item.q}
                  </span>
                  <span className="flex-shrink-0 w-7 h-7 rounded-full bg-[#C9A84C]/15 flex items-center justify-center text-[#C9A84C] transition-transform duration-300 group-open:rotate-45">
                    <svg
                      className="w-3.5 h-3.5"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={3}
                      aria-hidden
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M12 4v16m8-8H4"
                      />
                    </svg>
                  </span>
                </summary>
                <div className="px-5 pb-5 text-sm text-white/70 leading-relaxed border-t border-[#1B3A8C]/20 pt-4">
                  {item.a}
                </div>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════ CTA FINAL ══════════════════════════════════════ */}
      <section className="relative px-4 sm:px-6 lg:px-8 py-16 sm:py-24 overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] bg-[#C9A84C]/10 rounded-full blur-[120px] pointer-events-none" />

        <div className="relative max-w-3xl mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl font-black text-white mb-4">
            Prêt à démarrer ?
          </h2>
          <p className="text-base sm:text-lg text-white/70 mb-8 leading-relaxed">
            Rejoignez les professionnels bancaires UEMOA qui utilisent
            Miznas Pilot au quotidien.
          </p>

          <a
            href={buildWaLink(WA_MESSAGES.generic)}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Contacter sur WhatsApp"
            className="inline-flex items-center gap-3 px-8 py-4 sm:px-10 sm:py-5 rounded-2xl bg-[#C9A84C] text-[#0A1434] font-black text-base sm:text-lg hover:bg-[#E8D08A] shadow-xl shadow-[#C9A84C]/30 hover:shadow-[#C9A84C]/50 hover:scale-105 transition-all duration-300"
          >
            <IcWhatsApp />
            Contactez-nous sur WhatsApp
          </a>

          <p className="mt-6 text-xs text-white/40">
            +227 96 64 83 83 · Réponse rapide
          </p>

          <div className="mt-10">
            <Link
              href="/"
              className="inline-flex items-center gap-2 text-sm text-white/50 hover:text-white transition-colors"
            >
              ← Revenir à l&apos;accueil
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
