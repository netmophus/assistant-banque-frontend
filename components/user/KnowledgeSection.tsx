'use client';

import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
} from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { apiClient } from '@/lib/api/client';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Props {
  currentUser: {
    id: string;
    email: string;
    full_name: string;
    role: string;
    organization_id?: string | null;
    department_id?: string | null;
    department_name?: string | null;
    service_name?: string | null;
  } | null;
  onStatsRefresh?: () => void;
}

type TabKey = 'chat' | 'voice' | 'docs' | 'archive';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  isLoading?: boolean;
  strategy?: string;
}

interface VoiceMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface QuotaStats {
  questions_asked: number;
  quota_limit: number;
  remaining_quota: number;
  is_quota_exceeded: boolean;
}

interface ArchiveItem {
  id: string;
  question: string;
  answer: string | null;
  status: string;
  created_at: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function generateId(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
}

function getMonthName(month: number): string {
  return new Date(2000, month - 1, 1).toLocaleDateString('fr-FR', { month: 'long' });
}

function getFileIcon(fileType?: string): string {
  if (!fileType) return '📄';
  const t = fileType.toLowerCase();
  if (t.includes('pdf')) return '📕';
  if (t.includes('word') || t.includes('doc')) return '📘';
  if (t.includes('excel') || t.includes('xls') || t.includes('sheet')) return '📗';
  if (t.includes('image') || t.includes('png') || t.includes('jpg')) return '🖼️';
  if (t.includes('text')) return '📝';
  return '📄';
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

// Animated loading dots
function LoadingDots() {
  return (
    <span className="inline-flex items-center gap-1">
      <span
        className="w-2 h-2 rounded-full bg-current animate-bounce"
        style={{ animationDelay: '0ms' }}
      />
      <span
        className="w-2 h-2 rounded-full bg-current animate-bounce"
        style={{ animationDelay: '150ms' }}
      />
      <span
        className="w-2 h-2 rounded-full bg-current animate-bounce"
        style={{ animationDelay: '300ms' }}
      />
    </span>
  );
}

// Quota bar
function QuotaBar({ stats }: { stats: QuotaStats | null }) {
  if (!stats) return null;

  const pct = stats.quota_limit > 0
    ? Math.min(100, (stats.questions_asked / stats.quota_limit) * 100)
    : 0;

  const barColor =
    pct >= 90
      ? 'bg-red-500'
      : pct >= 70
      ? 'bg-amber-500'
      : 'bg-gradient-to-r from-primary via-secondary to-accent';

  return (
    <div className="px-4 py-2 bg-surface2/60 border-t border-border">
      <div className="flex items-center justify-between text-xs text-muted mb-1">
        <span>Quota mensuel</span>
        <span>
          {stats.questions_asked} / {stats.quota_limit} questions
          {stats.is_quota_exceeded && (
            <span className="ml-2 text-red-400 font-semibold">— Quota atteint</span>
          )}
        </span>
      </div>
      <div className="h-1.5 bg-surface rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${barColor}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Themed Questions — Commission Bancaire UMOA / BCEAO
// ---------------------------------------------------------------------------

interface ThemeQuestion {
  id: string;
  label: string;
  icon: string;
  color: string;
  questions: string[];
}

const THEME_QUESTIONS: ThemeQuestion[] = [
  {
    id: 'prudentiel',
    label: 'Normes Prudentielles',
    icon: '🏛️',
    color: '#1B3A8C',
    questions: [
      'Quel est le ratio de solvabilité minimum exigé par la BCEAO pour les banques UMOA ?',
      'Comment calcule-t-on le ratio de levier d\'une banque selon les normes BCEAO ?',
      'Quelles sont les exigences en fonds propres de base (Tier 1) pour les banques UMOA ?',
      'Qu\'est-ce que le coussin de conservation de capital imposé par la BCEAO ?',
      'Comment fonctionne le dispositif de surveillance prudentielle de la Commission Bancaire ?',
      'Quel est le ratio de division des risques et quels sont ses seuils d\'alerte ?',
      'Comment est calculé le ratio de liquidité à court terme (LCR) selon la BCEAO ?',
      'Qu\'est-ce que le NSFR (Net Stable Funding Ratio) et comment s\'applique-t-il en UMOA ?',
      'Quelles sanctions s\'appliquent en cas de non-respect des normes prudentielles BCEAO ?',
      'Comment les actifs pondérés par les risques (RWA) sont-ils calculés selon Bâle III UMOA ?',
      'Quel est le capital minimum requis pour créer une banque dans la zone UMOA ?',
      'Quelle est la différence entre les ratios prudentiels Pilier 1 et Pilier 2 en UMOA ?',
      'Comment la BCEAO calcule-t-elle le coussin contracyclique de capital ?',
      'Quels sont les critères de classification des établissements systémiques (D-SIB) en UMOA ?',
      'Comment les risques opérationnels sont-ils pris en compte dans le calcul des fonds propres ?',
      'Quelle est la définition réglementaire des fonds propres selon la BCEAO ?',
      'Comment est déterminé le ratio de couverture des emplois à moyen et long terme ?',
      'Qu\'est-ce que le Pilier 3 de Bâle III et quelles sont les obligations de publication ?',
      'Comment calculer le ratio crédits/dépôts et quelles en sont les implications prudentielles ?',
      'Quelles sont les règles de déduction des fonds propres Tier 1 selon la BCEAO ?',
      'Comment la BCEAO applique-t-elle les exigences de stress test aux banques UMOA ?',
      'Quel est le traitement prudentiel des participations dans les fonds propres réglementaires ?',
      'Comment les instruments hybrides de capital sont-ils traités dans les fonds propres UMOA ?',
      'Quelles sont les obligations de reporting prudentiel trimestriel à la Commission Bancaire ?',
      'Comment calculer le ratio de concentration des risques par contrepartie en UMOA ?',
      'Quelle est la réglementation sur les grands risques dans le dispositif prudentiel BCEAO ?',
      'Comment la BCEAO traite-t-elle le risque de taux d\'intérêt dans le portefeuille bancaire ?',
      'Quelles sont les exigences relatives au coussin pour les établissements systémiques (D-SIB) ?',
      'Comment évaluer l\'adéquation du capital interne (ICAAP) selon la réglementation BCEAO ?',
      'Quelles sont les mesures correctives applicables en cas de dégradation du ratio de solvabilité ?',
    ],
  },
  {
    id: 'lcbft',
    label: 'LBC-FT',
    icon: '🔒',
    color: '#7C3AED',
    questions: [
      'Quelles sont les obligations de vigilance client (KYC) selon la réglementation UMOA ?',
      'Comment déclarer une opération suspecte à la CENTIF dans la zone UMOA ?',
      'Quels sont les critères de classification des clients à risque élevé en LBC-FT ?',
      'Qu\'est-ce que la vigilance renforcée en LBC-FT et quand s\'applique-t-elle ?',
      'Comment identifier une Personne Politiquement Exposée (PPE) selon la réglementation UMOA ?',
      'Quelles sont les obligations de conservation des documents dans le cadre LBC-FT ?',
      'Comment mettre en place un programme de conformité LBC-FT dans une banque UMOA ?',
      'Quels sont les indicateurs d\'alerte typiques d\'une opération de blanchiment de capitaux ?',
      'Quelle est la procédure de gel des avoirs suspects dans la zone UMOA ?',
      'Quelles sont les sanctions prévues pour non-conformité LBC-FT en UMOA ?',
      'Comment fonctionne le filtrage des listes de sanctions internationales dans une banque ?',
      'Qu\'est-ce que l\'approche basée sur les risques (ABR) en matière de LBC-FT ?',
      'Quelles sont les obligations LBC-FT spécifiques aux virements électroniques transfrontaliers ?',
      'Comment réaliser une évaluation nationale des risques (ENR) dans le dispositif UMOA ?',
      'Quelles sont les exigences de formation du personnel en matière de LBC-FT ?',
      'Comment traiter un client refusé dans le cadre des diligences LBC-FT ?',
      'Qu\'est-ce que la GIABA et quel est son rôle dans la lutte contre le blanchiment en UMOA ?',
      'Quelles sont les obligations LBC-FT des établissements de microfinance en UMOA ?',
      'Comment mettre en place un système de surveillance des transactions suspectes (STR) ?',
      'Quelle est la procédure de levée du secret bancaire dans le cadre d\'une enquête LBC-FT ?',
      'Comment évaluer le risque LBC-FT d\'un nouveau produit bancaire avant son lancement ?',
      'Quels sont les délais légaux pour déclarer une opération suspecte à la CENTIF ?',
      'Comment gérer la vigilance LBC-FT pour les clients non-résidents en UMOA ?',
      'Quelles sont les obligations de due diligence lors d\'une relation de correspondance bancaire ?',
      'Comment identifier et gérer le financement du terrorisme dans une banque UMOA ?',
      'Quelles informations doivent figurer dans un rapport annuel de conformité LBC-FT ?',
      'Comment auditer le dispositif LBC-FT d\'un établissement de crédit en UMOA ?',
      'Quelles sont les obligations LBC-FT lors de l\'ouverture d\'un compte pour une ASBL ?',
      'Comment traiter les transactions en espèces dépassant les seuils réglementaires UMOA ?',
      'Quelle est la responsabilité personnelle du Responsable de la Conformité (RCLBC) en UMOA ?',
    ],
  },
  {
    id: 'credit',
    label: 'Crédit & Risques',
    icon: '💳',
    color: '#059669',
    questions: [
      'Comment classifier les créances selon les normes prudentielles BCEAO ?',
      'Quels sont les différents types de garanties acceptables pour un crédit bancaire UMOA ?',
      'Comment calculer le taux de provisionnement des créances douteuses litigieuses ?',
      'Comment évaluer la solvabilité d\'une PME pour l\'octroi de crédit en zone UMOA ?',
      'Quelles sont les règles de constitution des provisions pour créances en souffrance ?',
      'Comment fonctionne la centrale des risques de la BCEAO ?',
      'Quels documents composent un dossier de crédit PME complet ?',
      'Comment calculer le ratio endettement/capacité de remboursement d\'un particulier ?',
      'Quelles sont les étapes de la procédure de recouvrement d\'une créance impayée ?',
      'Qu\'est-ce que le crédit documentaire et comment fonctionne-t-il dans l\'UMOA ?',
      'Comment gérer les risques de concentration de portefeuille crédit selon la BCEAO ?',
      'Quelles sont les règles d\'amortissement des créances irrécouvrables ?',
      'Comment évaluer la valeur de réalisation d\'une garantie hypothécaire en UMOA ?',
      'Quelles sont les étapes du scoring crédit pour les particuliers dans une banque UMOA ?',
      'Comment traiter un crédit restructuré selon les normes de la Commission Bancaire ?',
      'Quels sont les ratios de rentabilité à analyser dans une étude de crédit entreprise ?',
      'Comment calculer le coût du risque d\'un portefeuille de crédits en UMOA ?',
      'Quelles sont les obligations de provisionnement pour les créances en phase pré-contentieux ?',
      'Comment fonctionne la procédure d\'appel en garantie OHADA en cas de défaut ?',
      'Quels sont les délais légaux de prescription pour les créances bancaires en UMOA ?',
      'Comment évaluer le risque de liquidité dans une banque de la zone UMOA ?',
      'Quelles sont les conditions d\'éligibilité pour un refinancement auprès de la BCEAO ?',
      'Comment gérer le risque de change dans les crédits en devises en UMOA ?',
      'Qu\'est-ce que le crédit-bail (leasing) et quelle est sa réglementation en UMOA ?',
      'Comment calculer le taux effectif global (TEG) d\'un crédit selon la réglementation UMOA ?',
      'Quelles sont les obligations de déclaration des dépassements à la centrale des risques BCEAO ?',
      'Comment construire une matrice de migration des créances dans un portefeuille UMOA ?',
      'Quelles sont les règles de dépréciation des créances selon les normes IFRS 9 en UMOA ?',
      'Comment gérer les crédits syndiqués dans une banque chef de file en UMOA ?',
      'Quelles sont les obligations de suivi post-octroi d\'un crédit selon la Commission Bancaire ?',
    ],
  },
  {
    id: 'pcb',
    label: 'PCB Comptable',
    icon: '📊',
    color: '#C9A84C',
    questions: [
      'Quelles sont les classes du Plan Comptable Bancaire (PCB) révisé de l\'UMOA ?',
      'Comment comptabiliser un prêt en souffrance selon le PCB UMOA ?',
      'Quelle est la différence entre le PCB et les normes IFRS pour une banque UMOA ?',
      'Comment établir un bilan bancaire selon le PCB UMOA ?',
      'Quels sont les postes du compte de résultat d\'une banque selon le PCB ?',
      'Comment comptabiliser les opérations de hors-bilan selon le PCB UMOA ?',
      'Quelles sont les règles de comptabilisation des titres de placement selon le PCB ?',
      'Comment calculer le Produit Net Bancaire (PNB) d\'un établissement de crédit ?',
      'Quels sont les états financiers obligatoires à soumettre à la Commission Bancaire ?',
      'Comment comptabiliser une opération en devises étrangères selon le PCB UMOA ?',
      'Comment traiter comptablement les provisions pour risques et charges ?',
      'Quelles sont les règles de consolidation des comptes bancaires en UMOA ?',
      'Comment comptabiliser les intérêts courus non échus selon le PCB UMOA ?',
      'Quelle est la méthode de comptabilisation des opérations interbancaires selon le PCB ?',
      'Comment établir l\'annexe aux états financiers d\'une banque UMOA ?',
      'Quelles sont les règles de comptabilisation des opérations avec la BCEAO ?',
      'Comment comptabiliser les instruments financiers dérivés selon le PCB UMOA ?',
      'Quelles sont les modalités de clôture des comptes annuels d\'une banque UMOA ?',
      'Comment calculer et comptabiliser la réserve obligatoire de la BCEAO ?',
      'Quelles sont les règles PCB pour la comptabilisation des opérations de crédit-bail ?',
      'Comment comptabiliser les opérations sur titres d\'investissement selon le PCB ?',
      'Quelle est la méthode de comptabilisation des engagements de retraite selon le PCB ?',
      'Comment traiter les écarts de conversion des devises dans les comptes bancaires UMOA ?',
      'Quelles sont les règles d\'amortissement des immobilisations dans une banque UMOA ?',
      'Comment comptabiliser une opération de titrisation selon le PCB UMOA ?',
      'Quelles sont les obligations de certification des comptes par le commissaire aux comptes ?',
      'Comment établir le tableau des flux de trésorerie d\'une banque selon le PCB ?',
      'Quelles sont les différences de traitement comptable entre créances saines et douteuses ?',
      'Comment comptabiliser les opérations de pension livrée dans le PCB UMOA ?',
      'Quelles sont les règles de présentation des états financiers comparatifs en UMOA ?',
    ],
  },
  {
    id: 'gouvernance',
    label: 'Gouvernance',
    icon: '⚖️',
    color: '#DC2626',
    questions: [
      'Quelles sont les exigences de gouvernance interne pour les banques UMOA ?',
      'Comment doit être composé le Conseil d\'Administration d\'une banque en UMOA ?',
      'Quelles sont les fonctions de contrôle obligatoires dans une banque (audit, conformité, risques) ?',
      'Quels sont les critères d\'honorabilité et de compétence pour les dirigeants de banque ?',
      'Comment fonctionne le processus d\'agrément pour un nouveau dirigeant bancaire UMOA ?',
      'Quelles informations doivent être déclarées périodiquement à la Commission Bancaire ?',
      'Quel est le rôle du comité des risques dans la gouvernance d\'une banque UMOA ?',
      'Comment la Commission Bancaire conduit-elle ses missions de contrôle sur place ?',
      'Quelles sont les obligations de transparence et de publication pour les banques UMOA ?',
      'Quel est le rôle du commissaire aux comptes dans la supervision bancaire UMOA ?',
      'Comment gérer un conflit d\'intérêts au sein d\'un conseil d\'administration bancaire ?',
      'Quelles sont les exigences en matière de rémunération des dirigeants de banque ?',
      'Comment mettre en place un comité d\'audit efficace dans une banque UMOA ?',
      'Quelles sont les obligations de formation continue pour les administrateurs de banque ?',
      'Comment la Commission Bancaire notifie-t-elle ses décisions disciplinaires aux banques ?',
      'Quelles sont les incompatibilités légales dans l\'exercice des fonctions de direction bancaire ?',
      'Comment fonctionne la procédure de mise sous administration provisoire d\'une banque ?',
      'Quelles sont les obligations de reporting interne au conseil d\'administration ?',
      'Comment documenter et archiver les décisions du conseil d\'administration d\'une banque ?',
      'Quelles sont les règles relatives aux transactions avec les parties liées en UMOA ?',
      'Comment évaluer l\'efficacité du dispositif de contrôle interne d\'une banque UMOA ?',
      'Quelles sont les obligations relatives à la politique de rémunération variable des dirigeants ?',
      'Comment mettre en place une fonction de gestion des risques indépendante en banque UMOA ?',
      'Quelles sont les responsabilités du Directeur Général face à la Commission Bancaire ?',
      'Comment traiter les recommandations d\'un contrôle sur place de la Commission Bancaire ?',
      'Quelles sont les obligations de gouvernance spécifiques aux filiales de groupes bancaires étrangers ?',
      'Comment composer et faire fonctionner un comité de crédit dans une banque UMOA ?',
      'Quelles sont les dispositions relatives à la succession des dirigeants d\'une banque UMOA ?',
      'Comment mettre en œuvre un plan de redressement (recovery plan) selon la BCEAO ?',
      'Quelles sont les obligations de gouvernance des établissements de microfinance en UMOA ?',
    ],
  },
  {
    id: 'paiement',
    label: 'Systèmes de Paiement',
    icon: '💸',
    color: '#0284C7',
    questions: [
      'Quelles sont les règles encadrant la monnaie électronique en UMOA ?',
      'Comment obtenir un agrément d\'établissement de monnaie électronique en UMOA ?',
      'Quelles sont les obligations de supervision des systèmes de paiement par la BCEAO ?',
      'Comment fonctionnent les chambres de compensation interbancaire en UMOA ?',
      'Quelles sont les règles de protection des fonds de la clientèle pour les EME ?',
      'Comment traiter une réclamation liée à un virement bancaire en UMOA ?',
      'Quels sont les plafonds de transactions autorisés pour le mobile money en UMOA ?',
      'Qu\'est-ce que le STAR-UEMOA et comment fonctionne-t-il ?',
      'Quelles sont les exigences de sécurité informatique pour les systèmes de paiement ?',
      'Comment lutter contre la fraude dans les transactions électroniques en UMOA ?',
      'Quelles sont les obligations de reporting des incidents de paiement à la BCEAO ?',
      'Comment fonctionne l\'interopérabilité des systèmes de paiement en UMOA ?',
      'Quelles sont les exigences de fonds propres pour un établissement de paiement en UMOA ?',
      'Comment fonctionne le système SICA-UEMOA de compensation des chèques ?',
      'Quelles sont les règles d\'émission et de gestion des cartes bancaires en UMOA ?',
      'Comment la BCEAO encadre-t-elle les Fintechs dans l\'espace UMOA ?',
      'Quelles sont les obligations KYC pour les opérateurs de mobile money en UMOA ?',
      'Comment traiter un chèque impayé selon la réglementation UMOA ?',
      'Quelles sont les règles applicables aux virements SWIFT dans la zone UMOA ?',
      'Comment gérer les incidents techniques dans un système de paiement critique UMOA ?',
      'Quelles sont les obligations de continuité d\'activité pour les systèmes de paiement ?',
      'Comment la BCEAO assure-t-elle la surveillance macro-prudentielle des paiements ?',
      'Quelles sont les règles relatives aux paiements transfrontaliers en UMOA ?',
      'Comment obtenir le statut d\'établissement de paiement (EP) en UMOA ?',
      'Quelles sont les obligations de déclaration des transactions suspectes pour les EME ?',
      'Comment gérer les fonds de remboursement garantis pour les établissements de monnaie électronique ?',
      'Quelles sont les règles d\'utilisation du chèque de banque en UMOA ?',
      'Comment fonctionne la garantie des dépôts pour les fonds clients d\'un EME en UMOA ?',
      'Quelles sont les conditions d\'accès au système STAR-UEMOA pour une banque étrangère ?',
      'Comment la régulation des paiements numériques évolue-t-elle dans l\'espace UMOA ?',
    ],
  },
  {
    id: 'clientele',
    label: 'Protection Clientèle',
    icon: '👥',
    color: '#D97706',
    questions: [
      'Quels sont les droits fondamentaux du client bancaire dans la zone UMOA ?',
      'Comment traiter une réclamation client selon la réglementation BCEAO ?',
      'Quelles informations précontractuelles une banque doit-elle fournir à un client en UMOA ?',
      'Comment fonctionne la médiation bancaire en UMOA ?',
      'Quelles sont les règles encadrant les conditions de banque et la tarification ?',
      'Quels sont les délais légaux de traitement des réclamations client en UMOA ?',
      'Comment gérer un compte bancaire inactif ou dormant selon la réglementation UMOA ?',
      'Quelles sont les obligations d\'information périodique envers les clients bancaires ?',
      'Comment protéger les données personnelles des clients bancaires en UMOA ?',
      'Quelles sont les conditions générales de vente (CGV) obligatoires en banque UMOA ?',
      'Comment la BCEAO contrôle-t-elle les pratiques commerciales des banques ?',
      'Quels sont les recours disponibles pour un client victime d\'une pratique abusive ?',
      'Quelles sont les obligations de conseil lors de la souscription d\'un produit d\'épargne en UMOA ?',
      'Comment mettre en place un service client conforme aux exigences BCEAO ?',
      'Quelles sont les règles de calcul et d\'affichage des taux d\'intérêt débiteurs en UMOA ?',
      'Comment gérer la clôture d\'un compte bancaire à la demande du client en UMOA ?',
      'Quelles sont les règles relatives au droit au compte en UMOA ?',
      'Comment informer les clients des modifications des conditions tarifaires en UMOA ?',
      'Quelles sont les règles de confidentialité et de secret bancaire en UMOA ?',
      'Comment traiter les successions et comptes d\'une personne décédée en UMOA ?',
      'Quelles sont les obligations de transparence sur les produits de placement en UMOA ?',
      'Comment gérer les litiges relatifs aux cartes bancaires et paiements électroniques ?',
      'Quelles sont les règles encadrant la vente liée de produits bancaires en UMOA ?',
      'Comment informer les clients sur les risques liés aux crédits à la consommation ?',
      'Quelles sont les règles relatives au démarchage bancaire et à la prospection commerciale ?',
      'Comment la BCEAO sanctionne-t-elle les pratiques commerciales déloyales en UMOA ?',
      'Quelles sont les obligations d\'accessibilité bancaire pour les populations rurales en UMOA ?',
      'Comment gérer les clients fragiles ou en situation de surendettement en UMOA ?',
      'Quelles sont les règles de nomination et de fonctionnement d\'un médiateur bancaire en UMOA ?',
      'Comment mettre en œuvre un dispositif de protection des données clients dans une banque UMOA ?',
    ],
  },
  {
    id: 'islamique',
    label: 'Finance Islamique',
    icon: '☪️',
    color: '#047857',
    questions: [
      'Quels sont les produits financiers islamiques autorisés en UMOA ?',
      'Comment fonctionne le financement Mourabaha dans une banque islamique UMOA ?',
      'Qu\'est-ce que l\'Ijara et comment s\'applique-t-il au crédit-bail islamique ?',
      'Comment la BCEAO encadre-t-elle la finance islamique dans l\'espace UMOA ?',
      'Quelles sont les exigences du Comité Charia dans la gouvernance d\'une banque islamique ?',
      'Comment fonctionne le compte de partage des profits et pertes (Moudaraba) ?',
      'Quels sont les défis de comptabilisation des produits islamiques selon le PCB ?',
      'Qu\'est-ce que le Sukuk et comment est-il émis dans la zone UMOA ?',
      'Comment gérer la liquidité dans une banque islamique conforme à la Charia ?',
      'Quelles sont les perspectives de développement de la finance islamique en UMOA ?',
      'Quelle est la différence entre une banque islamique et une fenêtre islamique ?',
      'Comment fonctionne le produit Musharaka dans le financement d\'entreprises ?',
      'Quelles sont les obligations de conformité Charia pour les produits bancaires islamiques ?',
      'Comment calculer le taux de partage des bénéfices dans un compte d\'investissement islamique ?',
      'Qu\'est-ce que le Takaful et comment s\'articule-t-il avec l\'assurance conventionnelle en UMOA ?',
      'Comment traiter le risque de taux d\'intérêt dans une banque islamique sans recourir au Riba ?',
      'Quels sont les principes du contrat Istisna\'a dans le financement de projets immobiliers ?',
      'Comment la finance islamique gère-t-elle les opérations de change (Al-Sarf) ?',
      'Quelles sont les conditions de validité d\'un contrat Salam en financement agricole UMOA ?',
      'Comment évaluer la conformité Charia d\'un nouveau produit financier islamique ?',
      'Quels sont les défis de la supervision des banques islamiques par la Commission Bancaire UMOA ?',
      'Comment fonctionne le marché interbancaire islamique dans la zone UMOA ?',
      'Quelles sont les règles de gouvernance spécifiques aux institutions financières islamiques ?',
      'Comment les banques islamiques gèrent-elles le risque de crédit sans intérêt conventionnel ?',
      'Qu\'est-ce que le Waqf bancaire et quel est son rôle dans la finance sociale islamique ?',
      'Comment structurer une émission de Sukuk souverain dans un pays de la zone UMOA ?',
      'Quelles sont les différences entre les normes AAOIFI et les standards BCEAO pour la finance islamique ?',
      'Comment une banque conventionnelle peut-elle ouvrir une fenêtre islamique en UMOA ?',
      'Quels sont les critères de qualification d\'un actif conforme à la Charia en UMOA ?',
      'Comment la Zakat est-elle prise en compte dans la gestion des fonds d\'une banque islamique ?',
    ],
  },
  {
    id: 'agrement',
    label: 'Agrément & Licences',
    icon: '📋',
    color: '#9333EA',
    questions: [
      'Quelles sont les conditions pour obtenir un agrément bancaire en UMOA ?',
      'Quels documents constituer pour un dossier d\'agrément auprès de la Commission Bancaire ?',
      'Comment se déroule la procédure d\'instruction d\'une demande d\'agrément bancaire ?',
      'Quelles sont les conditions d\'agrément pour un établissement de microfinance (SFD) ?',
      'Comment créer une filiale bancaire dans un pays de l\'UMOA différent du siège ?',
      'Quelles sont les conditions de retrait d\'agrément d\'un établissement de crédit ?',
      'Quels sont les délais légaux d\'instruction d\'une demande d\'agrément en UMOA ?',
      'Quelles sont les obligations déclaratives lors d\'un changement d\'actionnaire significatif ?',
      'Comment notifier la Commission Bancaire d\'une opération de fusion-acquisition bancaire ?',
      'Quels sont les critères d\'évaluation des actionnaires de référence d\'une banque UMOA ?',
      'Quelles sont les différentes catégories d\'établissements de crédit agréés en UMOA ?',
      'Comment renouveler ou modifier un agrément bancaire existant en UMOA ?',
      'Quelles sont les conditions d\'agrément pour un bureau de représentation d\'une banque étrangère ?',
      'Comment obtenir un agrément pour une société de gestion d\'actifs en UMOA ?',
      'Quelles sont les exigences d\'agrément pour les Fintechs réglementées par la BCEAO ?',
      'Comment la Commission Bancaire évalue-t-elle le plan d\'affaires d\'un projet bancaire ?',
      'Quels sont les critères de réputation exigés des fondateurs d\'une banque en UMOA ?',
      'Comment gérer un dossier d\'agrément refusé et quels sont les recours possibles ?',
      'Quelles sont les conditions spécifiques d\'agrément pour une banque de développement en UMOA ?',
      'Comment obtenir l\'autorisation d\'ouverture d\'une nouvelle agence bancaire en UMOA ?',
      'Quelles sont les obligations de capital minimum maintenu après l\'obtention de l\'agrément ?',
      'Comment la BCEAO traite-t-elle les demandes d\'agrément des groupes bancaires panafricains ?',
      'Quels sont les critères d\'agrément pour les établissements de crédit-bail en UMOA ?',
      'Comment obtenir un agrément pour les activités de conseil en investissement en UMOA ?',
      'Quelles sont les obligations de notification lors d\'une augmentation de capital d\'une banque UMOA ?',
      'Comment la Commission Bancaire traite-t-elle les demandes d\'extension d\'activités bancaires ?',
      'Quels sont les critères d\'agrément pour les sociétés de transfert d\'argent en UMOA ?',
      'Comment notifier un changement de dirigeant à la Commission Bancaire UMOA ?',
      'Quelles sont les conditions d\'agrément pour un établissement financier à caractère bancaire ?',
      'Comment se déroule la liquidation ordonnée d\'une banque après retrait d\'agrément en UMOA ?',
    ],
  },
  {
    id: 'marches',
    label: 'Marchés Financiers',
    icon: '📈',
    color: '#F59E0B',
    questions: [
      'Qu\'est-ce que la BRVM et comment fonctionne-t-elle dans la zone UEMOA ?',
      'Quel est le rôle du CREPMF dans la supervision des marchés financiers UEMOA ?',
      'Comment une entreprise peut-elle s\'introduire en bourse à la BRVM ?',
      'Quelles sont les conditions d\'admission des titres au marché officiel de la BRVM ?',
      'Comment fonctionne le DC/BR (Dépositaire Central / Banque de Règlement) en UEMOA ?',
      'Quelles sont les obligations de publication d\'information des sociétés cotées à la BRVM ?',
      'Comment émettre un emprunt obligataire sur le marché financier régional UEMOA ?',
      'Quelles sont les règles de conduite des Sociétés de Gestion et d\'Intermédiation (SGI) ?',
      'Comment fonctionne le marché secondaire des titres publics en UEMOA ?',
      'Quelles sont les conditions d\'agrément d\'une Société de Gestion d\'Actifs (SGA) en UEMOA ?',
      'Comment sont cotés et négociés les titres d\'État sur la BRVM ?',
      'Quelles sont les obligations des teneurs de marché sur le marché financier UEMOA ?',
      'Qu\'est-ce que le marché des bons du Trésor et comment y participer en UEMOA ?',
      'Comment fonctionne la chambre de compensation des opérations boursières en UEMOA ?',
      'Quelles sont les règles anti-manipulation de cours sur le marché financier UEMOA ?',
      'Comment un investisseur non-résident peut-il investir sur la BRVM ?',
      'Quelles sont les obligations déclaratives des franchissements de seuil à la BRVM ?',
      'Comment fonctionne le mécanisme de suspension de cotation à la BRVM ?',
      'Quelles sont les conditions d\'agrément des Organismes de Placement Collectif (OPC) en UEMOA ?',
      'Comment calculer le rendement d\'une obligation d\'État émise sur le marché UEMOA ?',
      'Quelles sont les règles de délit d\'initié applicables au marché financier UEMOA ?',
      'Comment fonctionne le système de règlement-livraison des titres au DC/BR ?',
      'Quelles sont les obligations de notation des émissions obligataires en UEMOA ?',
      'Comment évaluer la liquidité d\'un titre coté sur la BRVM ?',
      'Quelles sont les différentes catégories de marchés de la BRVM (officiel, alternatif) ?',
      'Comment fonctionne le mécanisme d\'OPA (Offre Publique d\'Achat) en UEMOA ?',
      'Quelles sont les règles de distribution des dividendes pour les sociétés cotées à la BRVM ?',
      'Comment le CREPMF contrôle-t-il les pratiques des SGI dans la zone UEMOA ?',
      'Quelles sont les sanctions applicables aux infractions boursières en UEMOA ?',
      'Comment fonctionne le Fonds de Garantie du Marché Financier Régional UEMOA ?',
    ],
  },
  {
    id: 'microfinance',
    label: 'Microfinance & SFD',
    icon: '🤝',
    color: '#06B6D4',
    questions: [
      'Quelle est la réglementation applicable aux Systèmes Financiers Décentralisés (SFD) en UEMOA ?',
      'Comment obtenir un agrément pour créer une institution de microfinance en UEMOA ?',
      'Quelles sont les différentes catégories de SFD reconnues par la réglementation UEMOA ?',
      'Quels sont les ratios prudentiels spécifiques aux SFD dans la zone UEMOA ?',
      'Comment fonctionne la supervision des SFD par le Ministère des Finances et la BCEAO ?',
      'Quelles sont les obligations comptables spécifiques aux institutions de microfinance UEMOA ?',
      'Comment calculer le taux d\'intérêt effectif global (TIEG) pour les crédits microfinance UEMOA ?',
      'Quelles sont les règles de provisionnement des créances en souffrance pour les SFD ?',
      'Comment gérer la gouvernance d\'une coopérative d\'épargne et de crédit (COOPEC) en UEMOA ?',
      'Quelles sont les obligations LBC-FT spécifiques aux SFD dans la zone UEMOA ?',
      'Comment fonctionne le refinancement des SFD auprès des banques commerciales en UEMOA ?',
      'Quelles sont les limites légales d\'épargne collectée pour les différentes catégories de SFD ?',
      'Comment évaluer la performance sociale d\'une institution de microfinance UEMOA ?',
      'Quelles sont les obligations de protection des membres/clients dans les SFD UEMOA ?',
      'Comment traiter les créances irrécouvrables dans un SFD selon la réglementation UEMOA ?',
      'Quelles sont les conditions de transformation d\'un SFD en banque commerciale en UEMOA ?',
      'Comment fonctionne le Fonds de Garantie des Dépôts dans les SFD UEMOA ?',
      'Quelles sont les obligations de reporting des SFD à la Commission de Supervision de la Microfinance ?',
      'Comment mettre en place un système de gestion des risques dans un SFD UEMOA ?',
      'Quelles sont les règles relatives aux taux d\'intérêt plafonds dans la microfinance UEMOA ?',
      'Comment évaluer la viabilité financière d\'une institution de microfinance en UEMOA ?',
      'Quelles sont les conditions d\'adhésion et de retrait dans une COOPEC en UEMOA ?',
      'Comment fonctionne l\'audit externe d\'un SFD dans la zone UEMOA ?',
      'Quelles sont les règles de concentration des risques applicables aux SFD en UEMOA ?',
      'Comment gérer les conflits d\'intérêts dans la gouvernance des COOPEC UEMOA ?',
      'Quelles sont les obligations en matière de formation des dirigeants de SFD en UEMOA ?',
      'Comment la BCEAO distingue-t-elle les SFD des établissements de crédit classiques ?',
      'Quelles sont les sanctions applicables aux SFD non conformes à la réglementation UEMOA ?',
      'Comment mettre en place un plan de redressement pour un SFD en difficulté en UEMOA ?',
      'Quelles sont les perspectives d\'évolution de la réglementation microfinance en UEMOA ?',
    ],
  },
  {
    id: 'ohada',
    label: 'Droit OHADA & Sûretés',
    icon: '⚖️',
    color: '#6366F1',
    questions: [
      'Qu\'est-ce que l\'OHADA et quels sont ses actes uniformes applicables aux banques ?',
      'Comment constituer une hypothèque valide selon l\'Acte Uniforme des Sûretés (AUS) OHADA ?',
      'Quelles sont les différentes formes de sûretés personnelles reconnues par l\'OHADA ?',
      'Comment fonctionne le nantissement de fonds de commerce selon l\'OHADA ?',
      'Quelles sont les étapes de la procédure de saisie immobilière selon le droit OHADA ?',
      'Comment réaliser une sûreté mobilière sans dépossession selon l\'AUS OHADA révisé ?',
      'Qu\'est-ce que le gage avec ou sans dépossession dans le financement bancaire OHADA ?',
      'Comment fonctionne la procédure de recouvrement simplifié de créances en OHADA ?',
      'Quelles sont les procédures collectives prévues par l\'OHADA (redressement, liquidation) ?',
      'Comment déclarer sa créance dans une procédure collective OHADA ?',
      'Quelles sont les obligations du banquier lors de l\'ouverture d\'une procédure collective OHADA ?',
      'Comment fonctionne la fiducie-sûreté dans le financement bancaire selon l\'OHADA ?',
      'Quelles sont les règles de priorité entre créanciers dans une liquidation OHADA ?',
      'Comment constituer et publier une sûreté au Registre du Commerce et du Crédit Mobilier (RCCM) ?',
      'Qu\'est-ce que la cession de créance professionnelle (Dailly OHADA) et comment l\'utiliser ?',
      'Comment fonctionne l\'aval bancaire selon le droit cambiaire OHADA ?',
      'Quelles sont les conditions de validité d\'une lettre de change selon l\'OHADA ?',
      'Comment traiter un chèque sans provision selon les règles OHADA ?',
      'Quelles sont les voies d\'exécution forcée disponibles pour un créancier bancaire en OHADA ?',
      'Comment mettre en œuvre une saisie-attribution de créances selon le droit OHADA ?',
      'Qu\'est-ce que l\'injonction de payer et comment l\'obtenir selon l\'OHADA ?',
      'Comment traiter la responsabilité du banquier dispensateur de crédit en droit OHADA ?',
      'Quelles sont les règles relatives à la garantie autonome (garantie à première demande) en OHADA ?',
      'Comment fonctionne le crédit-bail selon l\'Acte Uniforme OHADA relatif aux contrats ?',
      'Quelles sont les règles de compétence juridictionnelle en matière bancaire dans l\'espace OHADA ?',
      'Comment la CCJA (Cour Commune de Justice et d\'Arbitrage) intervient-elle dans les litiges bancaires ?',
      'Quelles sont les conditions de validité d\'un cautionnement bancaire selon l\'OHADA ?',
      'Comment purger une hypothèque après remboursement d\'un crédit immobilier en OHADA ?',
      'Quelles sont les règles relatives au concordat préventif dans une procédure collective OHADA ?',
      'Comment fonctionne l\'arbitrage commercial international pour les litiges bancaires en OHADA ?',
    ],
  },
  {
    id: 'change',
    label: 'Change & International',
    icon: '🌍',
    color: '#14B8A6',
    questions: [
      'Quelle est la réglementation des changes applicable dans la zone UEMOA ?',
      'Comment déclarer une opération de change à la BCEAO dans la zone UEMOA ?',
      'Quelles sont les obligations de rapatriement des capitaux pour les exportateurs en UEMOA ?',
      'Comment fonctionne le crédit documentaire (lettre de crédit) dans le commerce international ?',
      'Quels sont les différents types de lettres de crédit (LC) utilisés en trade finance UEMOA ?',
      'Comment fonctionne la remise documentaire dans les opérations d\'import-export UEMOA ?',
      'Qu\'est-ce que la garantie bancaire internationale et comment l\'émettre depuis l\'UEMOA ?',
      'Quelles sont les règles SWIFT applicables aux virements internationaux depuis l\'UEMOA ?',
      'Comment calculer le cours de change applicable à une opération commerciale en UEMOA ?',
      'Quelles sont les obligations de déclaration des investissements directs étrangers (IDE) en UEMOA ?',
      'Comment fonctionne le mécanisme de couverture du risque de change pour une banque UEMOA ?',
      'Quelles sont les limites légales de détention de devises pour les banques UEMOA ?',
      'Comment traiter un transfert international de fonds selon la réglementation UEMOA ?',
      'Quelles sont les règles Incoterms 2020 les plus utilisées dans les opérations UEMOA ?',
      'Comment évaluer le risque pays dans les opérations de trade finance UEMOA ?',
      'Quelles sont les obligations de conformité FATF/GAFI dans les transactions internationales ?',
      'Comment fonctionne le financement des exportations (pre-export finance) depuis l\'UEMOA ?',
      'Quelles sont les règles relatives aux comptes en devises pour les résidents UEMOA ?',
      'Comment traiter une opération de forfaitage (forfaiting) dans une banque UEMOA ?',
      'Quelles sont les obligations déclaratives des emprunts extérieurs contractés par les banques UEMOA ?',
      'Comment fonctionne l\'affacturage international (factoring) en zone UEMOA ?',
      'Quelles sont les règles de rapatriement des dividendes pour les investisseurs étrangers en UEMOA ?',
      'Comment gérer le risque de contrepartie dans les opérations de correspondance bancaire internationale ?',
      'Quelles sont les sanctions applicables aux infractions à la réglementation des changes en UEMOA ?',
      'Comment mettre en place une ligne de crédit revolving avec une banque internationale depuis l\'UEMOA ?',
      'Quelles sont les règles relatives aux opérations de swap de devises pour les banques UEMOA ?',
      'Comment traiter les opérations de négoce international (commodity trading) en UEMOA ?',
      'Quelles sont les procédures de contrôle des changes lors des importations en UEMOA ?',
      'Comment gérer les différences de cours entre date de transaction et date de règlement en UEMOA ?',
      'Quelles sont les perspectives d\'intégration financière régionale et d\'ouverture du compte de capital en UEMOA ?',
    ],
  },
  {
    id: 'alm',
    label: 'Gestion Actif-Passif',
    icon: '📉',
    color: '#EC4899',
    questions: [
      'Qu\'est-ce que la gestion actif-passif (ALM) et pourquoi est-elle cruciale pour une banque UEMOA ?',
      'Comment mesurer le gap de liquidité statique et dynamique dans une banque UEMOA ?',
      'Qu\'est-ce que la duration de Macaulay et comment l\'appliquer dans la gestion d\'un portefeuille obligataire ?',
      'Comment calculer le gap de taux d\'intérêt d\'une banque commerciale en UEMOA ?',
      'Qu\'est-ce que l\'immunisation du bilan et comment la mettre en œuvre dans une banque UEMOA ?',
      'Comment fonctionne le Comité ALCO (Asset and Liability Committee) dans une banque UEMOA ?',
      'Quelles sont les méthodes de transfert interne de fonds (taux de cession interne) en banque ?',
      'Comment modéliser les dépôts à vue dans le cadre de l\'ALM bancaire UEMOA ?',
      'Qu\'est-ce que la Value at Risk (VaR) et comment l\'utiliser pour mesurer le risque de marché ?',
      'Comment construire et interpréter une courbe des taux pour une banque de la zone UEMOA ?',
      'Quelles sont les méthodes de stress test du risque de liquidité selon la réglementation BCEAO ?',
      'Comment gérer le risque de transformation (financement long terme par ressources courtes) en UEMOA ?',
      'Qu\'est-ce que le risque de base dans la gestion ALM et comment le couvrir ?',
      'Comment établir un plan de financement d\'urgence (contingency funding plan) selon la BCEAO ?',
      'Quels instruments de couverture du risque de taux sont disponibles pour les banques UEMOA ?',
      'Comment mesurer et gérer le risque de remboursement anticipé des crédits (prepayment risk) ?',
      'Qu\'est-ce que la sensibilité de la valeur économique des fonds propres (EVE) en ALM ?',
      'Comment calculer le ratio de transformation dans une banque commerciale UEMOA ?',
      'Quelles sont les obligations de reporting ALM à la BCEAO et à la Commission Bancaire ?',
      'Comment fonctionne la gestion du coussin de liquidité (HQLA) dans le cadre du LCR BCEAO ?',
      'Qu\'est-ce que le Net Interest Income (NII) et comment l\'optimiser dans une banque UEMOA ?',
      'Comment intégrer les scénarios macroéconomiques dans les modèles ALM d\'une banque UEMOA ?',
      'Quelles sont les limites internes de risque de taux recommandées par la BCEAO pour les banques ?',
      'Comment gérer le risque de liquidité intraday dans une banque participante au STAR-UEMOA ?',
      'Qu\'est-ce que le risk appetite framework et comment l\'intégrer dans la politique ALM d\'une banque ?',
      'Comment évaluer l\'impact d\'une hausse de taux directeur BCEAO sur le bilan d\'une banque ?',
      'Quelles sont les meilleures pratiques de gouvernance du risque ALM selon les standards BCEAO ?',
      'Comment mesurer et gérer le risque de concentration des ressources (concentration du passif) ?',
      'Qu\'est-ce que le floor de taux zéro et comment le modéliser dans un contexte de taux bas en UEMOA ?',
      'Comment mettre en place un système d\'information ALM performant dans une banque UEMOA ?',
    ],
  },
  {
    id: 'fiscalite',
    label: 'Fiscalité Bancaire',
    icon: '💰',
    color: '#84CC16',
    questions: [
      'Quels impôts et taxes s\'appliquent spécifiquement aux établissements de crédit en UEMOA ?',
      'Comment est calculée la TVA sur les services bancaires dans les pays de l\'UEMOA ?',
      'Quelles sont les opérations bancaires exonérées de TVA dans la zone UEMOA ?',
      'Comment traiter fiscalement les intérêts reçus sur crédits dans les banques UEMOA ?',
      'Quelles sont les règles de retenue à la source sur les intérêts versés aux clients bancaires ?',
      'Comment calculer l\'impôt sur les sociétés (IS) pour une banque dans la zone UEMOA ?',
      'Quelles sont les charges fiscalement déductibles pour un établissement de crédit en UEMOA ?',
      'Comment traiter fiscalement les provisions pour créances douteuses dans une banque UEMOA ?',
      'Quelles sont les obligations déclaratives fiscales mensuelles et annuelles d\'une banque UEMOA ?',
      'Comment est imposé le produit des placements interbancaires et des titres de la BCEAO ?',
      'Quelles sont les règles de prix de transfert applicables aux banques filiales de groupes étrangers ?',
      'Comment traiter fiscalement les plus-values sur cession de titres dans une banque UEMOA ?',
      'Quelles sont les règles de TVA applicables aux commissions bancaires transfrontalières ?',
      'Comment est imposée la vente de biens saisis dans le cadre d\'une réalisation de garantie ?',
      'Quelles sont les règles de déductibilité des intérêts sur emprunts intragroupes pour les banques ?',
      'Comment traiter fiscalement les opérations de crédit-bail dans une banque UEMOA ?',
      'Quelles sont les obligations de déclaration des avoirs à l\'étranger pour les banques UEMOA ?',
      'Comment est taxée la distribution de dividendes par une banque à ses actionnaires en UEMOA ?',
      'Quelles sont les conventions fiscales internationales signées par les pays de l\'UEMOA ?',
      'Comment traiter la TVA sur les opérations de change dans une banque UEMOA ?',
      'Quelles sont les règles d\'amortissement fiscal des immobilisations bancaires en UEMOA ?',
      'Comment est imposée la rémunération des dirigeants dans une banque de la zone UEMOA ?',
      'Quelles sont les règles fiscales relatives aux fusions-acquisitions bancaires en UEMOA ?',
      'Comment gérer un contrôle fiscal dans un établissement de crédit en UEMOA ?',
      'Quelles sont les règles de report déficitaire applicables aux banques en UEMOA ?',
      'Comment traiter fiscalement les opérations sur instruments dérivés dans une banque UEMOA ?',
      'Quelles sont les taxes parafiscales spécifiques au secteur bancaire dans la zone UEMOA ?',
      'Comment calculer et déclarer la contribution des patentes pour une banque en UEMOA ?',
      'Quelles sont les règles de TVA sur les prestations rendues à des banques non-résidentes ?',
      'Comment optimiser la charge fiscale d\'une banque dans le respect de la réglementation UEMOA ?',
    ],
  },
  {
    id: 'audit',
    label: 'Audit & Contrôle',
    icon: '🔍',
    color: '#F97316',
    questions: [
      'Quelles sont les composantes d\'un dispositif de contrôle interne efficace dans une banque UEMOA ?',
      'Comment organiser et structurer la fonction d\'audit interne d\'un établissement de crédit UEMOA ?',
      'Quelles sont les normes professionnelles de l\'IIA (Institute of Internal Auditors) applicables en UEMOA ?',
      'Comment réaliser une cartographie des risques dans une banque de la zone UEMOA ?',
      'Quelles sont les obligations réglementaires en matière de contrôle interne selon la Commission Bancaire ?',
      'Comment mettre en place un plan d\'audit annuel basé sur les risques dans une banque UEMOA ?',
      'Quels sont les critères d\'indépendance de la fonction audit interne selon la BCEAO ?',
      'Comment évaluer l\'efficacité du contrôle interne d\'une banque selon la méthode COSO ?',
      'Quelles sont les obligations de reporting de l\'audit interne au conseil d\'administration ?',
      'Comment conduire un audit du processus de crédit dans une banque UEMOA ?',
      'Quelles sont les techniques d\'audit assisté par ordinateur (CAAT) utilisées en banque UEMOA ?',
      'Comment auditer le dispositif LBC-FT d\'un établissement de crédit en UEMOA ?',
      'Quelles sont les obligations du commissaire aux comptes dans la supervision bancaire UEMOA ?',
      'Comment coordonner les travaux de l\'audit interne et du commissaire aux comptes ?',
      'Quelles sont les principales zones de risque à auditer dans une salle des marchés bancaire ?',
      'Comment conduire un audit des systèmes d\'information (SI) dans une banque UEMOA ?',
      'Quelles sont les exigences de la Commission Bancaire concernant le rapport annuel de contrôle interne ?',
      'Comment évaluer l\'adéquation des provisions pour créances dans le cadre d\'un audit bancaire ?',
      'Quelles sont les red flags à détecter lors d\'un audit du processus de gestion de trésorerie ?',
      'Comment auditer la conformité réglementaire d\'une banque aux exigences BCEAO ?',
      'Quelles sont les étapes d\'une mission d\'audit des opérations de back-office bancaire ?',
      'Comment mettre en place un dispositif de contrôle permanent dans les agences bancaires ?',
      'Quelles sont les responsabilités légales de l\'auditeur interne en cas de fraude détectée ?',
      'Comment évaluer le risque de fraude dans les processus bancaires selon le triangle de Cressey ?',
      'Quelles sont les meilleures pratiques d\'audit de la fonction ressources humaines en banque ?',
      'Comment documenter et conclure une mission d\'audit interne selon les standards BCEAO ?',
      'Quelles sont les obligations de suivi des recommandations d\'audit dans une banque UEMOA ?',
      'Comment évaluer l\'efficacité du comité d\'audit dans la gouvernance bancaire en UEMOA ?',
      'Quelles sont les spécificités de l\'audit des opérations de microfinance pour une banque UEMOA ?',
      'Comment préparer une banque à une inspection sur place de la Commission Bancaire UMOA ?',
    ],
  },
];

// ---------------------------------------------------------------------------
// Chat Tab
// ---------------------------------------------------------------------------


function MiznasAvatar() {
  return (
    <div className="flex-shrink-0 mr-2 mt-1 text-center">
      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary via-secondary to-accent flex items-center justify-center text-white text-[10px] font-bold">
        FA
      </div>
      <p className="text-[8px] text-muted mt-0.5 leading-none">Miznas AI</p>
    </div>
  );
}

// Couleurs des cartes pour chaque section H2
const CARD_COLORS = [
  { bg: '#0f2744', border: '#3b82f6', accent: '#60a5fa' },
  { bg: '#1a0f2e', border: '#8b5cf6', accent: '#c084fc' },
  { bg: '#0a2530', border: '#06b6d4', accent: '#22d3ee' },
  { bg: '#0a2418', border: '#10b981', accent: '#34d399' },
  { bg: '#271a05', border: '#f59e0b', accent: '#fbbf24' },
];

function makeComponents(accent: string) {
  return {
    a: ({ href, children }: any) => (
      <a href={href} target="_blank" rel="noopener noreferrer"
        style={{ color: accent, textDecoration: 'underline', textDecorationStyle: 'dotted' }}>
        {children}
      </a>
    ),
    h3: ({ children }: any) => (
      <h3 style={{ fontSize: '0.85em', fontWeight: 700, color: accent, marginTop: '0.75em', marginBottom: '0.3em', paddingLeft: '0.6em', borderLeft: `2px solid ${accent}50` }}>
        {children}
      </h3>
    ),
    p: ({ children }: any) => <p style={{ marginBottom: '0.5em', lineHeight: '1.75', color: '#e2e8f0' }}>{children}</p>,
    ul: ({ children }: any) => <ul style={{ paddingLeft: '1.2em', marginBottom: '0.5em', color: '#cbd5e1' }}>{children}</ul>,
    ol: ({ children }: any) => <ol style={{ paddingLeft: '1.2em', marginBottom: '0.5em', color: '#cbd5e1', listStyleType: 'decimal' }}>{children}</ol>,
    li: ({ children }: any) => <li style={{ marginBottom: '0.2em', lineHeight: '1.65' }}>{children}</li>,
    strong: ({ children }: any) => <strong style={{ fontWeight: 700, color: accent }}>{children}</strong>,
    em: ({ children }: any) => <em style={{ fontStyle: 'italic', color: '#94a3b8' }}>{children}</em>,
    code: ({ children }: any) => <code style={{ background: 'rgba(0,0,0,0.35)', padding: '0.1em 0.4em', borderRadius: '4px', fontSize: '0.82em', fontFamily: 'monospace', color: '#e2e8f0', wordBreak: 'break-all', whiteSpace: 'pre-wrap' }}>{children}</code>,
    blockquote: ({ children }: any) => <blockquote style={{ borderLeft: `3px solid ${accent}60`, background: `${accent}08`, paddingLeft: '0.75em', paddingTop: '0.3em', paddingBottom: '0.3em', marginLeft: 0, borderRadius: '0 6px 6px 0' }}>{children}</blockquote>,
    hr: () => <hr style={{ border: 'none', borderTop: `1px solid rgba(255,255,255,0.08)`, margin: '0.5em 0' }} />,
    table: ({ children }: any) => <div style={{ overflowX: 'auto', maxWidth: '100%', marginBottom: '0.75em' }}><table style={{ width: '100%', maxWidth: '100%', borderCollapse: 'collapse', fontSize: '0.82em', tableLayout: 'fixed', wordBreak: 'break-word' }}>{children}</table></div>,
    th: ({ children }: any) => <th style={{ padding: '0.4em 0.75em', background: `${accent}18`, color: accent, fontWeight: 700, border: `1px solid ${accent}30`, textAlign: 'left', overflowWrap: 'break-word', wordBreak: 'break-word' }}>{children}</th>,
    td: ({ children }: any) => <td style={{ padding: '0.35em 0.75em', border: '1px solid rgba(255,255,255,0.08)', color: '#cbd5e1', overflowWrap: 'break-word', wordBreak: 'break-word' }}>{children}</td>,
  };
}

const BASE_COMPONENTS = makeComponents('#94a3b8');

function AssistantBubble({ content }: { content: string }) {
  // Découpe le contenu en sections par H2
  const sections = content.split(/(?=^## )/m);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem', fontSize: '0.875rem', color: '#f1f5f9', minWidth: 0, overflowWrap: 'break-word', wordBreak: 'break-word' }}>
      {sections.map((section, i) => {
        if (!section.trim()) return null;

        if (section.startsWith('## ')) {
          const nl = section.indexOf('\n');
          const title = nl > 0 ? section.slice(3, nl).trim() : section.slice(3).trim();
          const body  = nl > 0 ? section.slice(nl + 1).trim() : '';
          const c = CARD_COLORS[i % CARD_COLORS.length];

          return (
            <div key={i} style={{
              background: c.bg,
              border: `1px solid ${c.border}35`,
              borderLeft: `3px solid ${c.border}`,
              borderRadius: '0.625rem',
              overflow: 'hidden',
            }}>
              {/* En-tête de la carte */}
              <div style={{
                padding: '0.45rem 0.875rem',
                background: `${c.border}18`,
                borderBottom: `1px solid ${c.border}25`,
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
              }}>
                <span style={{ width: 7, height: 7, borderRadius: '50%', background: c.accent, flexShrink: 0, display: 'inline-block', boxShadow: `0 0 6px ${c.accent}` }} />
                <span style={{ color: c.accent, fontWeight: 700, fontSize: '0.82em', letterSpacing: '0.02em', textTransform: 'uppercase' }}>
                  {title}
                </span>
              </div>
              {/* Corps de la carte */}
              {body && (
                <div style={{ padding: '0.75rem 1rem', minWidth: 0, overflow: 'hidden' }}>
                  <ReactMarkdown remarkPlugins={[remarkGfm]} components={makeComponents(c.accent) as any}>
                    {body}
                  </ReactMarkdown>
                </div>
              )}
            </div>
          );
        }

        // Contenu avant le premier H2 (intro, réponse courte, etc.)
        return (
          <div key={i} style={{ padding: '0.25rem 0.25rem 0' }}>
            <ReactMarkdown remarkPlugins={[remarkGfm]} components={BASE_COMPONENTS as any}>
              {section}
            </ReactMarkdown>
          </div>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Chat Tab
// ---------------------------------------------------------------------------

function ChatTab({
  quotaStats,
  onStatsRefresh,
  externalInput,
  onExternalInputConsumed,
}: {
  quotaStats: QuotaStats | null;
  onStatsRefresh?: () => void;
  externalInput?: string;
  onExternalInputConsumed?: () => void;
}) {
  const [messages, setMessages] = useState<ChatMessage[]>([{
    id: 'welcome', role: 'assistant', timestamp: new Date(),
    content: "Bonjour ! Je suis **Miznas AI**, votre assistant bancaire intelligence de la réglementation bancaire UMOA. Posez-moi vos questions ou choisissez un thème ci-dessous.",
  }]);
  const [input, setInput]   = useState('');
  const [loading, setLoading] = useState(false);
  const [activeThemeId, setActiveThemeId] = useState<string>(THEME_QUESTIONS[0].id);
  const [themePanelOpen, setThemePanelOpen] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  const activeTheme = THEME_QUESTIONS.find(t => t.id === activeThemeId) ?? THEME_QUESTIONS[0];

  const goBottom = () => {
    if (scrollRef.current)
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  };

  useEffect(() => { goBottom(); }, [messages, loading]);

  useEffect(() => {
    if (externalInput) { setInput(externalInput); onExternalInputConsumed?.(); }
  }, [externalInput, onExternalInputConsumed]);

  const send = async (q: string) => {
    const question = q.trim();
    console.log('[CHAT] send() appelé, question=', question, 'loading=', loading);
    if (!question || loading || quotaStats?.is_quota_exceeded) {
      console.log('[CHAT] send() bloqué — loading:', loading, 'quota dépassé:', quotaStats?.is_quota_exceeded);
      return;
    }

    // Ajoute la question
    setMessages(prev => {
      console.log('[CHAT] setMessages user — messages avant:', prev.length);
      return [...prev, { id: generateId(), role: 'user', content: question, timestamp: new Date() }];
    });
    setInput('');
    setLoading(true);
    console.log('[CHAT] loading=true, appel API...');

    try {
      const res = await apiClient.post<any>('/questions', { question });
      console.log('[CHAT] réponse API reçue:', res);
      console.log('[CHAT] res.answer:', res?.answer);
      const reply = res?.answer || 'Aucune réponse reçue.';

      setMessages(prev => {
        console.log('[CHAT] setMessages assistant — messages avant:', prev.length, 'reply:', reply.slice(0, 80));
        return [...prev, { id: generateId(), role: 'assistant', content: reply, timestamp: new Date() }];
      });
      onStatsRefresh?.();
    } catch (err: any) {
      console.error('[CHAT] erreur API:', err);
      setMessages(prev => [...prev, {
        id: generateId(), role: 'assistant',
        content: `Erreur : ${err?.message || 'Une erreur est survenue.'}`,
        timestamp: new Date(),
      }]);
    } finally {
      setLoading(false);
      console.log('[CHAT] loading=false');
    }
  };

  // Le panneau de thèmes — rendu inline dans la zone de conversation
  const ThemePanel = (
    <div style={{ marginTop: '0.5rem' }}>
      {/* Header toggle — bordure couleur du thème actif */}
      <button
        onClick={() => setThemePanelOpen(p => !p)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '0.5rem 0.75rem', marginBottom: 0,
          background: `${activeTheme.color}12`,
          borderTop: `2px solid ${activeTheme.color}60`,
          borderRight: `2px solid ${activeTheme.color}60`,
          borderBottom: `2px solid ${activeTheme.color}60`,
          borderLeft: `4px solid ${activeTheme.color}`,
          borderRadius: themePanelOpen ? '0.75rem 0.75rem 0 0' : '0.75rem',
          cursor: 'pointer', gap: '0.5rem',
          boxShadow: `0 0 20px ${activeTheme.color}18`,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ fontSize: '0.75rem' }}>{activeTheme.icon}</span>
          <span style={{ fontSize: '0.65rem', fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', color: activeTheme.color }}>
            Questions par thème
          </span>
          <span style={{ fontSize: '0.6rem', padding: '0.1rem 0.45rem', borderRadius: '9999px', background: `${activeTheme.color}18`, border: `1px solid ${activeTheme.color}40`, color: activeTheme.color, fontWeight: 700 }}>
            {THEME_QUESTIONS.length} thèmes · {activeTheme.questions.length} questions
          </span>
        </div>
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
          stroke={`${activeTheme.color}cc`} strokeWidth={2} strokeLinecap="round"
          style={{ width: 13, height: 13, transition: 'transform 0.2s', transform: themePanelOpen ? 'rotate(180deg)' : 'rotate(0deg)', flexShrink: 0 }}
        >
          <path d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {themePanelOpen && (
        <div style={{
          borderTop: 'none',
          borderRight: `2px solid ${activeTheme.color}55`,
          borderBottom: `2px solid ${activeTheme.color}55`,
          borderLeft: `4px solid ${activeTheme.color}`,
          borderRadius: '0 0 0.75rem 0.75rem',
          background: `linear-gradient(180deg, ${activeTheme.color}10 0%, rgba(10,20,52,0.9) 100%)`,
          overflow: 'hidden',
          boxShadow: `0 6px 24px ${activeTheme.color}14`,
        }}>
          {/* Grille de cartes thèmes */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))',
            gap: '0.4rem',
            padding: '0.75rem',
            borderBottom: `1px solid ${activeTheme.color}20`,
          }}>
            {THEME_QUESTIONS.map(theme => {
              const isActive = theme.id === activeThemeId;
              return (
                <button
                  key={theme.id}
                  onClick={() => setActiveThemeId(theme.id)}
                  style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'flex-start',
                    gap: '0.3rem',
                    padding: '0.55rem 0.65rem',
                    borderRadius: '0.6rem',
                    border: isActive ? `1.5px solid ${theme.color}` : `1px solid ${theme.color}28`,
                    background: isActive ? `${theme.color}22` : `${theme.color}09`,
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                    boxShadow: isActive ? `0 0 12px ${theme.color}30` : 'none',
                    textAlign: 'left',
                  }}
                  onMouseEnter={e => {
                    if (!isActive) {
                      e.currentTarget.style.background = `${theme.color}16`;
                      e.currentTarget.style.borderColor = `${theme.color}55`;
                    }
                  }}
                  onMouseLeave={e => {
                    if (!isActive) {
                      e.currentTarget.style.background = `${theme.color}09`;
                      e.currentTarget.style.borderColor = `${theme.color}28`;
                    }
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                    <span style={{ fontSize: '1rem', lineHeight: 1 }}>{theme.icon}</span>
                    {isActive && (
                      <span style={{
                        width: 6, height: 6, borderRadius: '50%',
                        background: theme.color, flexShrink: 0,
                        boxShadow: `0 0 6px ${theme.color}`,
                      }} />
                    )}
                  </div>
                  <span style={{
                    fontSize: '0.68rem', fontWeight: isActive ? 700 : 500,
                    color: isActive ? '#ffffff' : 'rgba(255,255,255,0.65)',
                    lineHeight: 1.3,
                  }}>
                    {theme.label}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Questions du thème actif */}
          <div style={{
            padding: '0.625rem 0.75rem',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
            gap: '0.35rem',
            maxHeight: 200,
            overflowY: 'auto',
            scrollbarWidth: 'thin',
            scrollbarColor: `${activeTheme.color}40 transparent`,
          }}>
            {activeTheme.questions.map((q, i) => (
              <button
                key={i}
                onClick={() => { send(q); setThemePanelOpen(false); }}
                disabled={loading || !!quotaStats?.is_quota_exceeded}
                style={{
                  textAlign: 'left', padding: '0.45rem 0.65rem', borderRadius: '0.5rem',
                  border: `1px solid ${activeTheme.color}20`,
                  background: `${activeTheme.color}0a`,
                  color: 'rgba(255,255,255,0.82)', fontSize: '0.73rem', lineHeight: 1.45,
                  cursor: loading ? 'not-allowed' : 'pointer',
                  opacity: loading ? 0.5 : 1,
                  transition: 'all 0.12s',
                  display: 'flex', alignItems: 'flex-start', gap: '0.35rem',
                }}
                onMouseEnter={e => {
                  if (!loading) {
                    e.currentTarget.style.background = `${activeTheme.color}1e`;
                    e.currentTarget.style.borderColor = `${activeTheme.color}50`;
                    e.currentTarget.style.color = '#ffffff';
                  }
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = `${activeTheme.color}0a`;
                  e.currentTarget.style.borderColor = `${activeTheme.color}20`;
                  e.currentTarget.style.color = 'rgba(255,255,255,0.82)';
                }}
              >
                <span style={{ color: activeTheme.color, fontWeight: 800, fontSize: '0.62rem', flexShrink: 0, marginTop: '0.12rem' }}>
                  {String(i + 1).padStart(2, '0')}.
                </span>
                {q}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="flex flex-col rounded-2xl overflow-hidden" style={{ background: '#070E28', border: '2px solid rgba(27,58,140,0.5)', borderLeft: '4px solid #1B3A8C', boxShadow: '0 0 28px rgba(27,58,140,0.18)' }}>

      {/* Zone conversation — hauteur auto, zéro espace vide */}
      <div
        ref={scrollRef}
        style={{ maxHeight: 560, overflowY: 'auto', overflowX: 'hidden', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}
      >
        {/* Message de bienvenue (index 0) — encadré */}
        {messages[0] && (
          <div style={{
            display: 'flex', gap: '0.75rem', alignItems: 'flex-start',
            background: 'rgba(27,58,140,0.14)',
            border: '2px solid rgba(201,168,76,0.35)',
            borderLeft: '4px solid #C9A84C',
            borderRadius: '0.875rem',
            padding: '0.875rem 1rem',
            boxShadow: '0 0 28px rgba(201,168,76,0.10)',
          }}>
            <MiznasAvatar />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.35rem' }}>
                <span style={{ fontSize: '0.65rem', fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#C9A84C' }}>Miznas AI</span>
                <span style={{ fontSize: '0.58rem', padding: '0.1rem 0.4rem', borderRadius: '9999px', background: 'rgba(201,168,76,0.12)', border: '1px solid rgba(201,168,76,0.2)', color: '#C9A84C', fontWeight: 600 }}>Assistant bancaire</span>
              </div>
              <AssistantBubble content={messages[0].content} />
              <p style={{ margin: '0.25rem 0 0', fontSize: '0.58rem', opacity: 0.55, color: 'rgba(255,255,255,0.7)' }}>
                {formatTime(messages[0].timestamp)}
              </p>
            </div>
          </div>
        )}

        {/* Panneau thématique — juste après le message de bienvenue */}
        {ThemePanel}

        {/* Échanges conversation (à partir du message 1) */}
        {messages.slice(1).map(msg => (
          <div key={msg.id} style={{ display: 'flex', gap: '0.5rem', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
            {msg.role === 'assistant' && <MiznasAvatar />}
            {msg.role === 'user' ? (
              <div style={{
                maxWidth: '75%',
                background: 'linear-gradient(135deg, #1B3A8C, #0F2864)',
                color: '#f1f5f9', borderRadius: '1rem 1rem 0.25rem 1rem',
                padding: '0.75rem 1rem', fontSize: '0.875rem', lineHeight: '1.75',
                border: '1px solid rgba(201,168,76,0.15)',
              }}>
                <p style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{msg.content}</p>
                <p style={{ margin: '0.25rem 0 0', fontSize: '0.625rem', opacity: 0.6, textAlign: 'right' }}>
                  {formatTime(msg.timestamp)}
                </p>
              </div>
            ) : (
              <div style={{ flex: 1, minWidth: 0, overflow: 'hidden' }}>
                <AssistantBubble content={msg.content} />
                <p style={{ margin: '0.25rem 0 0', fontSize: '0.625rem', opacity: 0.7, paddingLeft: '0.25rem', color: 'rgba(255,255,255,0.75)' }}>
                  {formatTime(msg.timestamp)}
                </p>
              </div>
            )}
            {msg.role === 'user' && (
              <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#0F1E48', border: '1px solid #1B3A8C', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.625rem', fontWeight: 700, color: '#C9A84C', flexShrink: 0, marginTop: 4 }}>
                Moi
              </div>
            )}
          </div>
        ))}

        {/* Indicateur de chargement — apparaît uniquement quand l'IA répond */}
        {loading && (
          <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-start' }}>
            <MiznasAvatar />
            <div style={{ background: '#0F1E48', border: '1px solid rgba(27,58,140,0.4)', borderRadius: '1rem 1rem 1rem 0.25rem', padding: '0.75rem 1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <LoadingDots />
              <span style={{ fontSize: '0.875rem', color: 'rgba(255,255,255,0.8)' }}>Miznas AI réfléchit…</span>
            </div>
          </div>
        )}
      </div>

      {/* Quota */}
      <QuotaBar stats={quotaStats} />

      {/* Saisie */}
      <div style={{ padding: '0.75rem', borderTop: '1px solid rgba(27,58,140,0.3)', background: '#070E28' }}>
        {quotaStats?.is_quota_exceeded ? (
          <p style={{ textAlign: 'center', color: '#f87171', fontSize: '0.875rem', margin: 0 }}>Quota atteint.</p>
        ) : (
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-end' }}>
            <textarea
              rows={2} value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(input); } }}
              placeholder="Posez votre question… (Entrée pour envoyer)"
              disabled={loading}
              style={{ flex: 1, resize: 'none', background: '#0F1E48', border: '1px solid rgba(27,58,140,0.4)', borderRadius: '0.75rem', padding: '0.5rem 0.75rem', fontSize: '0.875rem', color: '#f1f5f9', outline: 'none', fontFamily: 'inherit' }}
            />
            <button
              onClick={() => send(input)} disabled={loading || !input.trim()}
              style={{ width: 40, height: 40, borderRadius: '0.75rem', background: 'linear-gradient(135deg, #1B3A8C, #C9A84C)', color: '#fff', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, opacity: loading || !input.trim() ? 0.4 : 1 }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" style={{ width: 16, height: 16 }}>
                <path d="M3.478 2.405a.75.75 0 00-.926.94l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.405z" />
              </svg>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Voice Tab — Agent conversationnel ElevenLabs
// ---------------------------------------------------------------------------

type ConvStatus = 'disconnected' | 'connecting' | 'connected';
type AgentMode = 'listening' | 'speaking';

function VoiceTab({ onStatsRefresh }: { onStatsRefresh?: () => void }) {
  const [convStatus, setConvStatus] = useState<ConvStatus>('disconnected');
  const [agentMode, setAgentMode] = useState<AgentMode>('listening');
  const [voiceMessages, setVoiceMessages] = useState<VoiceMessage[]>([]);
  const [errorMsg, setErrorMsg] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const conversationRef = useRef<any>(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [voiceMessages]);

  const startAgentConversation = async () => {
    setErrorMsg('');
    setConvStatus('connecting');

    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      const urlRes = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/voice/elevenlabs/signed-url`,
        { headers: token ? { Authorization: `Bearer ${token}` } : {} }
      );
      if (!urlRes.ok) throw new Error("Impossible d'obtenir l'URL de session");
      const { signed_url } = await urlRes.json();

      const { Conversation } = await import('@11labs/client');

      const conv = await Conversation.startSession({
        signedUrl: signed_url,
        onConnect: () => { setConvStatus('connected'); setAgentMode('listening'); },
        onDisconnect: () => { setConvStatus('disconnected'); conversationRef.current = null; },
        onError: (err: any) => { setErrorMsg(typeof err === 'string' ? err : err?.message || 'Erreur agent vocal'); setConvStatus('disconnected'); conversationRef.current = null; },
        onModeChange: ({ mode }: { mode: AgentMode }) => { setAgentMode(mode); },
        onMessage: ({ message, source }: { message: string; source: string }) => {
          if (!message?.trim()) return;
          const role: 'user' | 'assistant' = source === 'user' ? 'user' : 'assistant';
          setVoiceMessages((prev) => [...prev, { role, content: message, timestamp: new Date() }]);
        },
      });
      conversationRef.current = conv;
    } catch (err: any) {
      setErrorMsg(err?.message || "Connexion à l'agent impossible");
      setConvStatus('disconnected');
    }
  };

  const endAgentConversation = async () => {
    try { await conversationRef.current?.endSession(); } catch { /* ignore */ }
    conversationRef.current = null;
    setConvStatus('disconnected');
  };

  useEffect(() => {
    return () => { conversationRef.current?.endSession().catch(() => {}); };
  }, []);

  const isConnected = convStatus === 'connected';
  const isConnecting = convStatus === 'connecting';

  const dotColor = isConnected ? '#22c55e' : isConnecting ? '#f59e0b' : 'rgba(255,255,255,0.4)';
  const dotGlow = isConnected ? '0 0 10px rgba(34,197,94,0.6)' : isConnecting ? '0 0 10px rgba(245,158,11,0.5)' : 'none';

  const statusLabel = isConnecting
    ? 'Connexion en cours…'
    : isConnected
      ? agentMode === 'speaking' ? 'Miznas AI parle…' : 'En écoute — parlez librement'
      : 'Prêt — cliquez pour démarrer';

  const btnBg = isConnecting
    ? 'linear-gradient(135deg, #475569, #334155)'
    : isConnected
      ? agentMode === 'speaking' ? 'linear-gradient(135deg, #7C3AED, #6d28d9)' : 'linear-gradient(135deg, #059669, #047857)'
      : 'linear-gradient(135deg, #2563EB, #7C3AED)';

  const btnShadow = isConnected
    ? agentMode === 'speaking' ? '0 0 36px rgba(124,58,237,0.4), 0 0 72px rgba(124,58,237,0.15)' : '0 0 36px rgba(5,150,105,0.35), 0 0 72px rgba(5,150,105,0.12)'
    : '0 0 30px rgba(37,99,235,0.3), 0 0 60px rgba(124,58,237,0.12)';

  // Couleurs selon état
  const accentColor = isConnected
    ? agentMode === 'speaking' ? '#C9A84C' : '#22c55e'
    : '#1B3A8C';
  const accentGlow = isConnected
    ? agentMode === 'speaking' ? 'rgba(201,168,76,0.35)' : 'rgba(34,197,94,0.35)'
    : 'rgba(27,58,140,0.35)';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', background: '#070E28', border: `2px solid ${accentColor}55`, borderLeft: `4px solid ${accentColor}`, borderRadius: '1rem', overflow: 'hidden', boxShadow: `0 0 24px ${accentGlow}40` }}>

      <style>{`
        @keyframes vPulse { 0%,100%{transform:scale(1)} 50%{transform:scale(1.04)} }
        @keyframes vRing  { 0%{transform:scale(1);opacity:0.6} 100%{transform:scale(1.9);opacity:0} }
        @keyframes vDot   { 0%,100%{opacity:1} 50%{opacity:0.35} }
        @keyframes vBar1  { 0%,100%{height:6px}  50%{height:22px} }
        @keyframes vBar2  { 0%,100%{height:14px} 50%{height:6px}  }
        @keyframes vBar3  { 0%,100%{height:10px} 50%{height:24px} }
        @keyframes vBar4  { 0%,100%{height:18px} 50%{height:8px}  }
        @keyframes vBar5  { 0%,100%{height:8px}  50%{height:20px} }
      `}</style>

      {/* ── Barre de contrôle principale ── */}
      <div style={{ padding: '0.875rem 1rem', display: 'flex', alignItems: 'center', gap: '0.875rem' }}>

        {/* Bouton micro */}
        <div style={{ position: 'relative', flexShrink: 0 }}>
          {isConnected && (
            <>
              <span style={{ position: 'absolute', inset: -6, borderRadius: '50%', border: `1.5px solid ${accentColor}50`, animation: 'vRing 2s ease-out infinite' }} />
              <span style={{ position: 'absolute', inset: -6, borderRadius: '50%', border: `1.5px solid ${accentColor}30`, animation: 'vRing 2s ease-out infinite 0.7s' }} />
            </>
          )}
          <button
            onClick={isConnected ? endAgentConversation : startAgentConversation}
            disabled={isConnecting}
            style={{
              width: 52, height: 52, borderRadius: '50%',
              background: isConnecting
                ? 'rgba(27,58,140,0.4)'
                : isConnected
                  ? agentMode === 'speaking'
                    ? 'linear-gradient(135deg, #92620a, #C9A84C)'
                    : 'linear-gradient(135deg, #065f46, #22c55e)'
                  : 'linear-gradient(135deg, #1B3A8C, #2e5bb8)',
              border: `2px solid ${accentColor}60`,
              cursor: isConnecting ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#fff',
              opacity: isConnecting ? 0.6 : 1,
              transition: 'all 0.25s ease',
              boxShadow: `0 0 20px ${accentGlow}, 0 0 40px ${accentGlow}50`,
              animation: isConnected && agentMode === 'speaking' ? 'vPulse 1.5s ease-in-out infinite' : 'none',
              position: 'relative', zIndex: 1,
            }}
          >
            {isConnecting ? (
              <div style={{ width: 18, height: 18, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', animation: 'spin 0.8s linear infinite' }} />
            ) : isConnected ? (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><rect x="5" y="5" width="14" height="14" rx="2.5" /></svg>
            ) : (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 1a4 4 0 00-4 4v7a4 4 0 008 0V5a4 4 0 00-4-4z" />
                <path d="M6 10a.75.75 0 01.75.75v1.5a5.25 5.25 0 0010.5 0v-1.5a.75.75 0 011.5 0v1.5a6.75 6.75 0 01-6 6.708V21h2.25a.75.75 0 010 1.5h-6a.75.75 0 010-1.5H11v-2.042A6.75 6.75 0 015.25 12.25v-1.5A.75.75 0 016 10z" />
              </svg>
            )}
          </button>
        </div>

        {/* Infos status */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.2rem' }}>
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: isConnected ? accentColor : isConnecting ? '#f59e0b' : 'rgba(255,255,255,0.25)', boxShadow: isConnected ? `0 0 8px ${accentColor}` : 'none', flexShrink: 0, animation: isConnected ? 'vDot 2s ease-in-out infinite' : 'none', transition: 'all 0.3s' }} />
            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#ffffff' }}>Miznas AI Vocal</span>
            {isConnected && (
              <span style={{ fontSize: '0.6rem', padding: '0.15rem 0.45rem', borderRadius: '9999px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', border: `1px solid ${accentColor}50`, color: accentColor, background: `${accentColor}12` }}>
                {agentMode === 'speaking' ? '▶ Parle' : '● Écoute'}
              </span>
            )}
          </div>
          <p style={{ margin: 0, fontSize: '0.72rem', color: 'rgba(255,255,255,0.6)', lineHeight: 1.4 }}>
            {isConnected
              ? agentMode === 'speaking' ? 'L\'agent répond à votre question…' : 'Parlez librement, l\'agent vous écoute'
              : isConnecting ? 'Connexion à l\'agent vocal en cours…'
              : 'Agent vocal assistant bancaire · Cliquez sur le micro pour démarrer'}
          </p>
        </div>

        {/* Visualiseur barres — uniquement quand connecté */}
        {isConnected && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '3px', height: 28, flexShrink: 0 }}>
            {[
              { anim: 'vBar1', delay: '0ms' },
              { anim: 'vBar2', delay: '80ms' },
              { anim: 'vBar3', delay: '160ms' },
              { anim: 'vBar4', delay: '240ms' },
              { anim: 'vBar5', delay: '320ms' },
            ].map((b, i) => (
              <span key={i} style={{
                width: 3, borderRadius: 9999,
                background: accentColor,
                opacity: 0.85,
                alignSelf: 'center',
                animation: agentMode === 'speaking'
                  ? `${b.anim} 0.6s ease-in-out infinite ${b.delay}`
                  : `${b.anim} 1.4s ease-in-out infinite ${b.delay}`,
                height: 8,
                transition: 'height 0.1s',
              }} />
            ))}
          </div>
        )}
      </div>

      {/* ── Erreur ── */}
      {errorMsg && (
        <div style={{ margin: '0 0.875rem 0.625rem', padding: '0.45rem 0.75rem', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '0.5rem', fontSize: '0.75rem', color: '#fca5a5', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#f87171" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
          {errorMsg}
        </div>
      )}

      {/* ── Transcription — apparaît uniquement quand il y a des messages ── */}
      {voiceMessages.length > 0 && (
        <div
          ref={scrollRef}
          style={{ borderTop: `2px solid ${accentColor}30`, maxHeight: 280, overflowY: 'auto', padding: '0.75rem 1rem', display: 'flex', flexDirection: 'column', gap: '0.625rem' }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.25rem' }}>
            <span style={{ fontSize: '0.6rem', fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(201,168,76,0.7)' }}>Transcription</span>
            <span style={{ flex: 1, height: 1, background: 'rgba(201,168,76,0.15)' }} />
          </div>
          {voiceMessages.map((msg, idx) => (
            <div key={idx} style={{ display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start', gap: '0.4rem' }}>
              {msg.role === 'assistant' && <MiznasAvatar />}
              <div style={{
                maxWidth: msg.role === 'user' ? '72%' : 'calc(100% - 2.5rem)',
                background: msg.role === 'user' ? 'linear-gradient(135deg, #1B3A8C, #0F2864)' : 'rgba(255,255,255,0.03)',
                border: msg.role === 'user' ? '1px solid rgba(201,168,76,0.15)' : '1px solid rgba(255,255,255,0.06)',
                borderRadius: msg.role === 'user' ? '1rem 1rem 0.2rem 1rem' : '1rem 1rem 1rem 0.2rem',
                padding: '0.5rem 0.75rem', fontSize: '0.825rem', color: '#f1f5f9', lineHeight: 1.6,
              }}>
                <p style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{msg.content}</p>
                <p style={{ margin: '0.2rem 0 0', fontSize: '0.58rem', opacity: 0.5, textAlign: msg.role === 'user' ? 'right' : 'left' }}>
                  {formatTime(msg.timestamp)}
                </p>
              </div>
              {msg.role === 'user' && (
                <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#0F1E48', border: '1px solid #1B3A8C', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.55rem', fontWeight: 700, color: '#C9A84C', flexShrink: 0, marginTop: 2 }}>Moi</div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Documents Tab
// ---------------------------------------------------------------------------

function DocsTab({
  onDocumentClick,
}: {
  onDocumentClick: (filename: string) => void;
}) {
  const [globalDocs, setGlobalDocs] = useState<any[]>([]);
  const [orgDocs, setOrgDocs] = useState<any[]>([]);
  const [loadingDocs, setLoadingDocs] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [fetched, setFetched] = useState(false);

  const fetchDocs = useCallback(async () => {
    if (fetched) return;
    setLoadingDocs(true);
    try {
      const [globalRes, orgRes] = await Promise.allSettled([
        apiClient.get<any>('/global-knowledge/published?limit=100'),
        apiClient.get<any>('/documents/user/my-documents'),
      ]);

      if (globalRes.status === 'fulfilled') {
        setGlobalDocs(globalRes.value?.documents || []);
      }
      if (orgRes.status === 'fulfilled') {
        setOrgDocs(orgRes.value?.documents || []);
      }
    } finally {
      setLoadingDocs(false);
      setFetched(true);
    }
  }, [fetched]);

  useEffect(() => {
    fetchDocs();
  }, [fetchDocs]);

  const toggleCategory = (key: string) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const filterDocs = (docs: any[]) => {
    if (!searchQuery.trim()) return docs;
    const q = searchQuery.toLowerCase();
    return docs.filter(
      (d) =>
        d.filename?.toLowerCase().includes(q) ||
        d.original_filename?.toLowerCase().includes(q) ||
        d.category?.toLowerCase().includes(q) ||
        d.title?.toLowerCase().includes(q)
    );
  };

  const groupByCategory = (docs: any[]) => {
    const map: Record<string, any[]> = {};
    docs.forEach((d) => {
      const cat = d.category || 'Général';
      if (!map[cat]) map[cat] = [];
      map[cat].push(d);
    });
    return map;
  };

  const filteredGlobal = filterDocs(globalDocs);
  const filteredOrg = filterDocs(orgDocs);
  const globalGroups = groupByCategory(filteredGlobal);
  const orgGroups = groupByCategory(filteredOrg);

  const renderDocCard = (doc: any, isOrg: boolean) => {
    const name =
      doc.filename || doc.original_filename || doc.title || 'Document sans nom';
    const cat = doc.category || 'Général';
    const fileIcon = getFileIcon(doc.file_type || doc.mime_type);
    return (
      <button
        key={doc.id}
        onClick={() => onDocumentClick(name)}
        className="w-full text-left bg-surface/60 border border-border/50 rounded-xl p-3 hover:border-primary/50 hover:bg-surface/80 transition-all flex items-start gap-3"
      >
        <span className="text-xl flex-shrink-0 mt-0.5">{fileIcon}</span>
        <div className="flex-1 min-w-0">
          <p className="text-sm text-text font-medium truncate">{name}</p>
          <div className="flex flex-wrap gap-1 mt-1">
            <span className="text-xs px-2 py-0.5 bg-surface2 rounded-full text-muted border border-border/50">
              {cat}
            </span>
            {doc.status && (
              <span
                className={`text-xs px-2 py-0.5 rounded-full border ${
                  doc.status === 'published' || doc.status === 'active'
                    ? 'bg-green-500/10 text-green-400 border-green-500/20'
                    : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                }`}
              >
                {doc.status}
              </span>
            )}
            {isOrg && doc.chunks_count != null && (
              <span className="text-xs px-2 py-0.5 bg-surface2 rounded-full text-muted border border-border/50">
                {doc.chunks_count} segments
              </span>
            )}
          </div>
        </div>
      </button>
    );
  };

  const renderAccordionSection = (
    sectionKey: string,
    groups: Record<string, any[]>,
    isOrg: boolean
  ) => {
    return Object.entries(groups).map(([category, docs]) => {
      const key = `${sectionKey}-${category}`;
      const isOpen = expandedCategories.has(key);
      return (
        <div
          key={key}
          className="bg-surface2/50 border border-border rounded-xl mb-2 overflow-hidden"
        >
          <button
            onClick={() => toggleCategory(key)}
            className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-surface/40 transition-colors"
          >
            <span className="text-sm font-medium text-text flex items-center gap-2">
              {category}
              <span className="text-xs px-2 py-0.5 bg-surface rounded-full text-muted border border-border/50">
                {docs.length}
              </span>
            </span>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              className={`w-4 h-4 text-muted transition-transform ${isOpen ? 'rotate-180' : ''}`}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          {isOpen && (
            <div className="px-3 pb-3 space-y-2">
              {docs.map((doc) => renderDocCard(doc, isOrg))}
            </div>
          )}
        </div>
      );
    });
  };

  const isEmpty = filteredGlobal.length === 0 && filteredOrg.length === 0;

  return (
    <div style={{ background: '#070E28', border: '2px solid rgba(27,58,140,0.5)', borderLeft: '4px solid #1B3A8C', borderRadius: '1rem', overflow: 'hidden', boxShadow: '0 0 24px rgba(27,58,140,0.15)' }}>
      {/* Search */}
      <div className="p-4 border-b border-border">
        <div className="relative">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted"
          >
            <circle cx="11" cy="11" r="8" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35" />
          </svg>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Rechercher un document..."
            className="w-full pl-9 pr-4 py-2 bg-surface2 border border-border rounded-xl text-sm text-text placeholder:text-muted focus:outline-none focus:border-primary/50 transition-colors"
          />
        </div>
      </div>

      <div className="p-4 space-y-6 max-h-[520px] overflow-y-auto">
        {loadingDocs ? (
          <div className="flex items-center justify-center py-12">
            <div className="flex items-center gap-3 text-muted">
              <svg
                className="animate-spin w-5 h-5"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              <span className="text-sm">Chargement des documents...</span>
            </div>
          </div>
        ) : isEmpty ? (
          <div className="text-center py-12">
            <div className="text-4xl mb-3">📂</div>
            <p className="text-text font-medium">Aucun document disponible</p>
            <p className="text-muted text-sm mt-1">
              Aucun document ne correspond à votre recherche.
            </p>
          </div>
        ) : (
          <>
            {/* Global docs */}
            {filteredGlobal.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <h3 className="text-sm font-semibold text-text">
                    <span>📖</span> Références Officielles (Base Globale)
                  </h3>
                  <span className="text-xs px-2 py-0.5 bg-primary/10 text-primary rounded-full border border-primary/20">
                    {filteredGlobal.length}
                  </span>
                </div>
                {renderAccordionSection('global', globalGroups, false)}
              </div>
            )}

            {/* Org docs */}
            {filteredOrg.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <h3 className="text-sm font-semibold text-text">
                    <span>🏢</span> Documents de votre organisation
                  </h3>
                  <span className="text-xs px-2 py-0.5 bg-secondary/10 text-secondary rounded-full border border-secondary/20">
                    {filteredOrg.length}
                  </span>
                </div>
                {renderAccordionSection('org', orgGroups, true)}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Archive Tab
// ---------------------------------------------------------------------------

function ArchiveTab({
  onReread,
}: {
  onReread: (question: string, answer: string) => void;
}) {
  const [archives, setArchives] = useState<ArchiveItem[]>([]);
  const [loadingArchives, setLoadingArchives] = useState(false);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [expandedItem, setExpandedItem] = useState<ArchiveItem | null>(null);

  const fetchArchives = useCallback(async () => {
    setLoadingArchives(true);
    try {
      // Utilise le proxy Next.js /api/questions → backend /questions/my-questions
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      const res = await fetch('/api/questions?limit=500', {
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      if (!res.ok) throw new Error('fetch failed');
      const data = await res.json();
      // L'endpoint retourne un tableau de questions directement
      const items: ArchiveItem[] = Array.isArray(data) ? data : (data?.questions || data?.items || []);
      setArchives(items);
    } catch {
      setArchives([]);
    } finally {
      setLoadingArchives(false);
    }
  }, []);

  useEffect(() => {
    fetchArchives();
  }, [fetchArchives]);

  const availableYears = Array.from(
    new Set(
      archives.map((a) => new Date(a.created_at).getFullYear())
    )
  ).sort((a, b) => b - a);

  const filtered = archives.filter((a) => {
    const d = new Date(a.created_at);
    return (
      d.getFullYear() === selectedYear && d.getMonth() + 1 === selectedMonth
    );
  });

  const months = Array.from({ length: 12 }, (_, i) => i + 1);

  return (
    <>
    {/* Expanded archive modal */}
    {expandedItem && (
      <div
        className="fixed inset-0 z-50 flex items-start justify-center bg-black/70 backdrop-blur-sm overflow-y-auto py-8"
        onClick={() => setExpandedItem(null)}
      >
        <div
          className="relative w-full max-w-3xl mx-4 rounded-2xl shadow-2xl overflow-hidden"
          style={{ background: '#0B1120', border: '1px solid rgba(255,255,255,0.1)' }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div style={{ background: 'linear-gradient(135deg, #0f1e48 0%, #0B1120 100%)', borderBottom: '1px solid rgba(255,255,255,0.08)' }}
            className="px-6 py-4 flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: '#C9A84C' }}>
                Question archivée · {formatDate(expandedItem.created_at)}
              </p>
              <p className="text-base font-bold text-white leading-snug">{expandedItem.question}</p>
            </div>
            <button
              onClick={() => setExpandedItem(null)}
              className="flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
              style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#94a3b8' }}
            >
              ✕
            </button>
          </div>

          {/* Réponse */}
          <div className="px-6 py-5">
            {expandedItem.answer ? (
              <div style={{
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.07)',
                borderRadius: '0.875rem',
                padding: '1.25rem 1.5rem',
                fontSize: '0.9rem',
                lineHeight: '1.75',
                color: '#cbd5e1',
              }}>
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={{
                    h1: ({ children }) => <h1 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#f1f5f9', marginTop: '1.2em', marginBottom: '0.5em', paddingBottom: '0.3em', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>{children}</h1>,
                    h2: ({ children }) => <h2 style={{ fontSize: '1rem', fontWeight: 700, color: '#e2e8f0', marginTop: '1em', marginBottom: '0.4em' }}>{children}</h2>,
                    h3: ({ children }) => <h3 style={{ fontSize: '0.9rem', fontWeight: 700, color: '#C9A84C', marginTop: '0.9em', marginBottom: '0.3em' }}>{children}</h3>,
                    p: ({ children }) => <p style={{ margin: '0.5em 0', color: '#cbd5e1' }}>{children}</p>,
                    ul: ({ children }) => <ul style={{ paddingLeft: '1.4em', margin: '0.5em 0', color: '#cbd5e1' }}>{children}</ul>,
                    ol: ({ children }) => <ol style={{ paddingLeft: '1.4em', margin: '0.5em 0', color: '#cbd5e1' }}>{children}</ol>,
                    li: ({ children }) => <li style={{ marginBottom: '0.25em', lineHeight: '1.6' }}>{children}</li>,
                    strong: ({ children }) => <strong style={{ color: '#f1f5f9', fontWeight: 700 }}>{children}</strong>,
                    em: ({ children }) => <em style={{ color: '#94a3b8', fontStyle: 'italic' }}>{children}</em>,
                    code: ({ children }) => <code style={{ background: 'rgba(0,0,0,0.4)', padding: '0.15em 0.45em', borderRadius: '4px', fontSize: '0.82em', fontFamily: 'monospace', color: '#7dd3fc' }}>{children}</code>,
                    blockquote: ({ children }) => <blockquote style={{ borderLeft: '3px solid #C9A84C', paddingLeft: '1em', margin: '0.75em 0', color: '#94a3b8', fontStyle: 'italic' }}>{children}</blockquote>,
                    hr: () => <hr style={{ borderTop: '1px solid rgba(255,255,255,0.08)', margin: '1em 0', border: 'none' }} />,
                    table: ({ children }) => <table style={{ width: '100%', borderCollapse: 'collapse', margin: '0.75em 0', fontSize: '0.85rem' }}>{children}</table>,
                    th: ({ children }) => <th style={{ padding: '6px 10px', background: 'rgba(255,255,255,0.05)', borderBottom: '1px solid rgba(255,255,255,0.1)', textAlign: 'left', color: '#e2e8f0', fontWeight: 700 }}>{children}</th>,
                    td: ({ children }) => <td style={{ padding: '6px 10px', borderBottom: '1px solid rgba(255,255,255,0.05)', color: '#cbd5e1' }}>{children}</td>,
                  }}
                >
                  {expandedItem.answer}
                </ReactMarkdown>
              </div>
            ) : (
              <p className="text-sm italic" style={{ color: '#64748b' }}>Aucune réponse disponible.</p>
            )}
          </div>

          {/* Footer */}
          <div style={{ borderTop: '1px solid rgba(255,255,255,0.07)', padding: '1rem 1.5rem', display: 'flex', justifyContent: 'flex-end' }}>
            <button
              onClick={() => setExpandedItem(null)}
              className="text-sm px-5 py-2 rounded-xl font-semibold transition-all"
              style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', color: '#cbd5e1' }}
            >
              Fermer
            </button>
          </div>
        </div>
      </div>
    )}

    <div style={{ background: '#070E28', border: '2px solid rgba(27,58,140,0.5)', borderLeft: '4px solid #1B3A8C', borderRadius: '1rem', overflow: 'hidden', boxShadow: '0 0 24px rgba(27,58,140,0.15)' }}>
      {/* Filters */}
      <div className="p-4 border-b border-border flex flex-wrap gap-3 items-center">
        <div className="flex items-center gap-2">
          <label className="text-xs text-muted">Année</label>
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            className="text-sm rounded-lg px-2 py-1 border border-border focus:outline-none focus:border-primary/50"
            style={{ backgroundColor: '#1e293b', color: '#fff' }}
          >
            {availableYears.length > 0 ? (
              availableYears.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))
            ) : (
              <option value={selectedYear}>{selectedYear}</option>
            )}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs text-muted">Mois</label>
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(Number(e.target.value))}
            className="text-sm rounded-lg px-2 py-1 border border-border focus:outline-none focus:border-primary/50"
            style={{ backgroundColor: '#1e293b', color: '#fff' }}
          >
            {months.map((m) => (
              <option key={m} value={m}>
                {getMonthName(m)}
              </option>
            ))}
          </select>
        </div>
        <span className="text-xs text-muted">
          {archives.length} total · {filtered.length} ce mois
        </span>
        <button
          onClick={fetchArchives}
          disabled={loadingArchives}
          className="ml-auto text-xs px-3 py-1.5 bg-surface2 border border-border rounded-lg text-muted hover:text-text hover:border-primary/40 transition-all disabled:opacity-40"
        >
          {loadingArchives ? '...' : '↻ Rafraîchir'}
        </button>
      </div>

      <div className="p-4 space-y-3 max-h-[520px] overflow-y-auto">
        {loadingArchives ? (
          <div className="flex items-center justify-center py-12">
            <div className="flex items-center gap-3 text-muted">
              <svg
                className="animate-spin w-5 h-5"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              <span className="text-sm">Chargement des archives...</span>
            </div>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-4xl mb-3">📋</div>
            <p className="text-text font-medium">Aucune question ce mois-ci</p>
            <p className="text-muted text-sm mt-1">
              Sélectionnez un autre mois ou posez votre première question.
            </p>
          </div>
        ) : (
          filtered.map((item) => (
            <div
              key={item.id}
              className="bg-surface2/50 border border-border rounded-xl p-4 space-y-3 hover:border-primary/30 transition-colors"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-text leading-snug">{item.question}</p>
                  <p className="text-xs text-muted mt-1">{formatDate(item.created_at)}</p>
                </div>
                <button
                  onClick={() => setExpandedItem(item)}
                  className="text-xs px-3 py-1.5 rounded-lg font-medium transition-all flex-shrink-0"
                  style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', color: '#ffffff' }}
                >
                  Voir la réponse
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
    </>
  );
}

// ---------------------------------------------------------------------------
// Main KnowledgeSection component
// ---------------------------------------------------------------------------

export default function KnowledgeSection({ currentUser, onStatsRefresh }: Props) {
  const [activeTab, setActiveTab] = useState<TabKey>('chat');
  const [quotaStats, setQuotaStats] = useState<QuotaStats | null>(null);

  // For cross-tab communication: docs → chat
  const [pendingChatInput, setPendingChatInput] = useState('');

  const fetchQuotaStats = useCallback(async () => {
    try {
      const res = await apiClient.get<any>('/questions/quota');
      if (res) {
        setQuotaStats({
          questions_asked: res.questions_asked ?? 0,
          quota_limit: res.quota_limit ?? 0,
          remaining_quota: res.remaining_quota ?? 0,
          is_quota_exceeded: res.is_quota_exceeded ?? false,
        });
      }
    } catch {
      // Silently ignore quota errors
    }
  }, []);

  useEffect(() => {
    fetchQuotaStats();
  }, [fetchQuotaStats]);

  const handleStatsRefresh = useCallback(() => {
    fetchQuotaStats();
    onStatsRefresh?.();
  }, [fetchQuotaStats, onStatsRefresh]);

  const handleDocumentClick = (filename: string) => {
    setPendingChatInput(`Posez une question sur ${filename}`);
    setActiveTab('chat');
  };

  const handleReread = (_question: string, answer: string) => {
    setPendingChatInput(answer.slice(0, 300));
    setActiveTab('chat');
  };

  const tabs: { key: TabKey; label: string; iconPath: string }[] = [
    { key: 'chat', label: 'Chat Miznas AI', iconPath: 'M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z' },
    { key: 'voice', label: 'Vocal', iconPath: 'M12 1a4 4 0 00-4 4v7a4 4 0 008 0V5a4 4 0 00-4-4zM6 10v2a6 6 0 0012 0v-2M12 18v4M9 22h6' },
    { key: 'docs', label: 'Documents', iconPath: 'M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z' },
    { key: 'archive', label: 'Archives', iconPath: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2M12 12h.01M8 12h.01M16 12h.01' },
  ];

  return (
    <div className="space-y-5">
      {/* Tab bar */}
      <div style={{ display: 'flex', gap: '0.375rem', background: 'rgba(10,15,30,0.6)', backdropFilter: 'blur(20px)', borderRadius: '0.875rem', padding: '0.375rem', border: '1px solid rgba(255,255,255,0.06)', overflow: 'hidden' }}>
        {tabs.map((tab) => {
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                padding: '0.625rem 0.75rem',
                borderRadius: '0.625rem',
                fontSize: '0.8rem',
                fontWeight: isActive ? 600 : 500,
                whiteSpace: 'nowrap',
                border: isActive ? '1px solid rgba(255,255,255,0.1)' : '1px solid transparent',
                background: isActive ? 'linear-gradient(135deg, rgba(37,99,235,0.2), rgba(124,58,237,0.15))' : 'transparent',
                color: isActive ? '#ffffff' : 'rgba(255,255,255,0.72)',
                cursor: 'pointer',
                transition: 'all 0.25s ease',
                boxShadow: isActive ? '0 4px 16px rgba(37,99,235,0.15), inset 0 1px 0 rgba(255,255,255,0.06)' : 'none',
                position: 'relative',
              }}
              onMouseEnter={e => { if (!isActive) { e.currentTarget.style.color = '#ffffff'; e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; } }}
              onMouseLeave={e => { if (!isActive) { e.currentTarget.style.color = 'rgba(255,255,255,0.72)'; e.currentTarget.style.background = 'transparent'; } }}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, opacity: isActive ? 1 : 0.7 }}>
                <path d={tab.iconPath} />
              </svg>
              <span>{tab.label}</span>
              {isActive && <span style={{ position: 'absolute', bottom: -1, left: '20%', right: '20%', height: 2, borderRadius: 1, background: 'linear-gradient(90deg, #2563EB, #7C3AED)', opacity: 0.7 }} />}
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      {activeTab === 'chat' && (
        <ChatTab
          quotaStats={quotaStats}
          onStatsRefresh={handleStatsRefresh}
          externalInput={pendingChatInput}
          onExternalInputConsumed={() => setPendingChatInput('')}
        />
      )}

      {activeTab === 'voice' && (
        <VoiceTab onStatsRefresh={handleStatsRefresh} />
      )}

      {activeTab === 'docs' && (
        <DocsTab onDocumentClick={handleDocumentClick} />
      )}

      {activeTab === 'archive' && (
        <ArchiveTab onReread={handleReread} />
      )}
    </div>
  );
}
