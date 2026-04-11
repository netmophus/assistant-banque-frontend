'use client';

import { useEffect } from 'react';

/* ─── Données formations par catégorie ─────────────────────── */
const CATEGORIES = [
  {
    label: 'PCB & Comptabilité Bancaire',
    color: '#3B82F6',
    formations: [
      'Maîtriser le cadre conceptuel du PCB révisé de l\'UMOA',
      'Le plan de comptes normalisé — classes 1 à 5 (bilan)',
      'Le plan de comptes normalisé — classes 6 à 9 (résultat et hors-bilan)',
      'Comptabilisation des engagements en souffrance',
      'Évaluation et comptabilisation des titres',
      'Comptabilisation des opérations en devises',
      'Comptabilisation des opérations de crédit-bail et location',
      'Les états financiers annuels — bilan et compte de résultat',
      'Les états financiers consolidés',
      'Les états périodiques et le reporting BCEAO',
      'Première application du PCB révisé',
      'Comptabilisation des cessions d\'éléments d\'actif',
      'Norme IFRS 9 et son impact sur le PCB révisé',
      'Analyse financière d\'un établissement de crédit',
      'Comptabilité des opérations de trésorerie et interbancaire',
    ],
  },
  {
    label: 'Dispositif Prudentiel UMOA',
    color: '#C9A84C',
    formations: [
      'Architecture du dispositif prudentiel UMOA',
      'Composition et calcul des fonds propres réglementaires',
      'Risque de crédit — approche standard',
      'Risque opérationnel',
      'Risque de marché',
      'Exigences de liquidité — LCR et NSFR',
      'Le FODEP — déclaration prudentielle pratique',
      'Accords de classement BCEAO',
      'Supervision sur base consolidée',
      'Bâle III et modélisation des risques',
      'Simulation de crise — stress tests pour les banques',
      'Pilier 3 — discipline de marché et publication d\'informations',
      'Le ratio de levier',
      'Le coussin de conservation et le coussin contracyclique',
      'Établissements d\'importance systémique dans l\'UMOA',
    ],
  },
  {
    label: 'Réglementation & Gouvernance',
    color: '#8B5CF6',
    formations: [
      'La loi portant réglementation bancaire dans l\'UMOA',
      'Agrément et passeport unique UMOA',
      'Gouvernance des établissements de crédit',
      'Contrôle interne des établissements de crédit',
      'Commissariat aux comptes bancaire',
      'Optimiser la gouvernance et l\'appétence aux risques',
      'Contrôles sur pièces et sur place de la Commission Bancaire',
      'Fonctions d\'administrateurs et dirigeants',
      'Éthique et déontologie bancaire',
      'Management stratégique bancaire',
      'Panorama des risques bancaires',
    ],
  },
  {
    label: 'Gestion des Risques & Conformité',
    color: '#EF4444',
    formations: [
      'Gestion du risque de crédit',
      'Classification et provisionnement des créances',
      'Lutte contre le blanchiment de capitaux — LBC/FT',
      'Division des risques et limites de concentration',
      'Gestion du risque de taux d\'intérêt',
      'Gestion actif-passif — ALM bancaire',
      'Gestion du risque opérationnel',
      'Protection de la clientèle bancaire',
      'Conformité réglementaire bancaire',
      'Risque de fraude bancaire',
      'Gestion des risques des institutions de microfinance',
    ],
  },
  {
    label: 'Opérations Bancaires & Marchés',
    color: '#10B981',
    formations: [
      'Opérations de crédit court, moyen et long terme',
      'Bons et obligations du Trésor UEMOA',
      'Systèmes de paiement de l\'UEMOA',
      'Relations financières extérieures et changes',
      'Opérations de pension livrée dans l\'UEMOA',
      'Financement du commerce international',
      'Monnaie électronique et mobile money',
      'Centralisation des incidents de paiement',
      'Mathématiques financières appliquées à la banque',
      'Analyse financière des entreprises pour le banquier',
    ],
  },
  {
    label: 'Résolution & Supervision',
    color: '#F97316',
    formations: [
      'Régime de résolution des crises bancaires',
      'Administration provisoire et liquidation',
      'Mesures administratives et sanctions disciplinaires',
      'Sanctions pécuniaires de la Commission Bancaire',
      'Surveillance macroprudentielle dans l\'UMOA',
      'Fonds de Garantie des Dépôts et de Résolution',
      'Gestion de crise bancaire — cas pratiques',
      'Coopération internationale en matière de supervision',
    ],
  },
  {
    label: 'Digital, FinTech & Innovation',
    color: '#06B6D4',
    formations: [
      'Introduction à la finance digitale',
      'Transformation digitale des banques',
      'Cybersécurité dans le secteur bancaire',
      'Intelligence artificielle dans la banque',
      'Open Banking et API dans l\'UEMOA',
      'Monnaies digitales de banques centrales — CBDC',
      'Blockchain et applications financières',
      'Data analytics et Big Data pour la banque',
      'Réglementation et supervision des FinTech',
      'Interopérabilité des services financiers dans l\'UEMOA',
    ],
  },
  {
    label: 'Finance Verte & ESG',
    color: '#22C55E',
    formations: [
      'Introduction à la finance verte et durable',
      'Risques climatiques pour les banques',
      'Finance climat dans l\'UEMOA',
      'ESG et investissement responsable',
      'Obligations vertes et financement de projets durables',
    ],
  },
  {
    label: 'Microfinance & SFD',
    color: '#A855F7',
    formations: [
      'Cadre réglementaire des SFD dans l\'UMOA',
      'Gouvernance des institutions de microfinance',
      'Analyse financière des institutions de microfinance',
      'Gestion du crédit en microfinance',
      'Transformation digitale des SFD',
      'Éducation financière et protection du consommateur',
      'Inclusion financière dans l\'UEMOA',
      'Accès des SFD aux systèmes de paiement',
    ],
  },
  {
    label: 'Politique Monétaire & Économie',
    color: '#F59E0B',
    formations: [
      'Politique monétaire de la BCEAO',
      'Marché monétaire et interbancaire de l\'UMOA',
      'Zone franc et intégration monétaire',
      'Intelligence économique et secteur bancaire',
      'Financement des infrastructures en Afrique',
      'Évaluation des politiques publiques',
      'Droit bancaire OHADA et recouvrement des créances',
    ],
  },
];

const TOTAL = CATEGORIES.reduce((s, c) => s + c.formations.length, 0);

/* ─── Modal ─────────────────────────────────────────────────── */
export default function FormationsModal({ onClose }: { onClose: () => void }) {
  // Bloquer le scroll du body
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  // Fermer avec Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[998] animate-fade-in"
        onClick={onClose}
      />

      {/* Panel — slide depuis la gauche */}
      <div className="fixed inset-y-0 left-0 w-full sm:w-[680px] max-w-full z-[999] flex flex-col bg-[#070E28] border-r border-[#1B3A8C]/40 shadow-2xl animate-slide-from-left overflow-hidden">

        {/* Header */}
        <div className="flex-shrink-0 flex items-center justify-between px-6 py-5 border-b border-[#1B3A8C]/30 bg-[#0A1434]">
          <div>
            <h2 className="text-xl font-black text-white tracking-tight">
              Formations en ligne
            </h2>
            <p className="text-xs text-[#C9A84C] font-semibold mt-0.5">
              {TOTAL} formations · Banque & Finance · Réglementation UEMOA
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 flex items-center justify-center rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 text-white/60 hover:text-white transition-all"
            aria-label="Fermer"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Contenu scrollable */}
        <div className="flex-1 overflow-y-auto px-5 py-5 space-y-4">
          {CATEGORIES.map((cat) => (
            <div
              key={cat.label}
              className="rounded-2xl overflow-hidden border"
              style={{ borderColor: cat.color + '30', backgroundColor: cat.color + '08' }}
            >
              {/* Titre catégorie */}
              <div
                className="flex items-center gap-3 px-4 py-3"
                style={{ backgroundColor: cat.color + '15', borderBottom: `1px solid ${cat.color}25` }}
              >
                <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: cat.color }} />
                <span className="text-xs font-bold uppercase tracking-wider" style={{ color: cat.color }}>
                  {cat.label}
                </span>
                <span
                  className="ml-auto text-[10px] font-bold px-2 py-0.5 rounded-full"
                  style={{ backgroundColor: cat.color + '20', color: cat.color }}
                >
                  {cat.formations.length}
                </span>
              </div>

              {/* Liste formations */}
              <div className="divide-y" style={{ borderColor: cat.color + '12' }}>
                {cat.formations.map((f, i) => (
                  <div key={i} className="flex items-start gap-3 px-4 py-2.5">
                    <span
                      className="text-[10px] font-black w-5 h-5 flex-shrink-0 flex items-center justify-center rounded-md mt-0.5"
                      style={{ backgroundColor: cat.color + '18', color: cat.color }}
                    >
                      {i + 1}
                    </span>
                    <span className="text-sm text-white/75 leading-snug">{f}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="flex-shrink-0 px-6 py-4 border-t border-[#1B3A8C]/30 bg-[#0A1434] flex items-center justify-between gap-4">
          <p className="text-xs text-white/30">
            Accédez aux formations via votre espace utilisateur
          </p>
          <a
            href="/login"
            className="px-5 py-2.5 text-xs font-bold rounded-xl text-[#0A1434] bg-[#C9A84C] hover:bg-[#E8D08A] transition-colors flex-shrink-0"
          >
            Commencer →
          </a>
        </div>
      </div>
    </>
  );
}
