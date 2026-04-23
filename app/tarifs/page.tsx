import type { Metadata } from 'next';
import Link from 'next/link';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import { OfferCTA } from '@/components/tarifs/OfferCTA';

export const metadata: Metadata = {
  title: 'Tarifs | Miznas Pilot',
  description:
    "Découvrez les offres Miznas Pilot pour les professionnels bancaires UEMOA : mensuel 7 500 FCFA, semestriel 35 000 FCFA, annuel 60 000 FCFA. IA, formations, analyse de crédit.",
};

// ── Constantes WhatsApp ─────────────────────────────────────────────────────
const WA_NUMBER = '22796648383'; // +227 96 64 83 83 (format wa.me sans + ni espaces)

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
      'Accès à toute la bibliothèque de formations',
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
      'Accès à toute la bibliothèque de formations',
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
      'Accès à toute la bibliothèque de formations',
      'QCM et évaluations illimités',
      'Support prioritaire WhatsApp',
    ],
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
            L&apos;IA au service de la décision bancaire pour les cadres
            et gestionnaires des institutions financières UEMOA.
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

      {/* ══════════════ PUBLIC CIBLE ═══════════════════════════════════ */}
      <section className="relative px-4 sm:px-6 lg:px-8 py-16 sm:py-20 bg-[#0A1434]/50">
        <div className="max-w-3xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#1B3A8C]/20 border border-[#1B3A8C]/40 mb-5">
            <span className="w-1.5 h-1.5 rounded-full bg-[#C9A84C]" />
            <span className="text-xs font-bold uppercase tracking-[0.2em] text-[#C9A84C]">
              Notre public
            </span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-white mb-5">
            Conçu pour les banquiers professionnels
          </h2>
          <p className="text-base sm:text-lg text-white/70 leading-relaxed">
            Miznas Pilot accompagne les <strong className="text-white">cadres, gestionnaires
            et agents</strong> des banques et institutions financières dans leurs décisions
            quotidiennes : <strong className="text-[#C9A84C]">réglementation UEMOA</strong>,
            analyse de crédit, formations continues, gestion des impayés.
          </p>
        </div>
      </section>

      {/* ══════════════ FAQ ═══════════════════════════════════════════ */}
      <section className="relative px-4 sm:px-6 lg:px-8 py-16 sm:py-20">
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
