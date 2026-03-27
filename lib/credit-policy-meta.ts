/**
 * Métadonnées UI pour tous les champs de paramétrage de la politique de crédit.
 * Chaque champ dispose d'un label, d'une description, d'un exemple et de l'impact métier.
 * Utilisé par CreditPolicySettings pour afficher des aides contextuelles cohérentes.
 */

export interface FieldHelpMeta {
  key: string;
  label: string;
  description: string;
  example?: string;
  unit?: string;
  placeholder?: string;
  impact?: string;
  warning?: string;
  category: string;
}

export const CREDIT_POLICY_META: Record<string, FieldHelpMeta> = {

  // ── GÉNÉRAL ───────────────────────────────────────────────────────
  currency: {
    key: 'currency', label: 'Devise utilisée',
    description: 'Devise dans laquelle tous les montants de crédit, revenus et seuils sont exprimés.',
    example: 'XOF', placeholder: 'XOF',
    impact: 'Assure la cohérence de tous les montants affichés et calculés.',
    category: 'general',
  },
  defaultLoanType: {
    key: 'defaultLoanType', label: 'Type de crédit par défaut',
    description: 'Type de crédit pré-sélectionné à l\'ouverture de l\'écran utilisateur.',
    example: 'CONSO',
    impact: 'Facilite la saisie sur le parcours métier utilisateur.',
    category: 'general',
  },
  decisionStrategy: {
    key: 'decisionStrategy', label: 'Stratégie de décision',
    description: 'Définit la méthode utilisée pour rendre la décision de crédit.',
    impact: 'Change complètement la manière dont la décision est produite.',
    warning: 'SCORING_ONLY nécessite que le scoring soit correctement étalonné avant activation.',
    category: 'general',
  },
  strictMode: {
    key: 'strictMode', label: 'Mode strict',
    description: 'En mode strict, tout paramètre hors seuil entraîne un refus immédiat, sans zone conditionnelle.',
    example: 'Désactivé recommandé pour commencer',
    impact: 'Augmente significativement le taux de refus. À activer uniquement si votre politique l\'exige.',
    warning: 'L\'activation du mode strict peut fortement augmenter le taux de refus.',
    category: 'general',
  },
  enableExplanations: {
    key: 'enableExplanations', label: 'Afficher les explications de décision',
    description: 'Permet d\'afficher à l\'utilisateur métier les raisons détaillées de la décision : règles déclenchées, points forts et faibles.',
    impact: 'Améliore la transparence et la compréhension de la décision. Recommandé activé.',
    category: 'general',
  },
  enableSimulations: {
    key: 'enableSimulations', label: 'Activer les simulations',
    description: 'Permet au moteur de proposer des scénarios alternatifs lorsqu\'un dossier est refusé ou conditionnel.',
    impact: 'Aide à transformer un refus en solution acceptable pour le client.',
    category: 'general',
  },
  maxSimulationScenarios: {
    key: 'maxSimulationScenarios', label: 'Nombre maximum de scénarios',
    description: 'Limite le nombre de simulations alternatives affichées à l\'utilisateur.',
    example: '3', unit: 'scénarios',
    impact: 'Évite une interface surchargée. Entre 2 et 5 scénarios est optimal.',
    category: 'general',
  },

  // ── TYPES DE CRÉDIT ───────────────────────────────────────────────
  'loanType.enabled': {
    key: 'loanType.enabled', label: 'Activer ce type de crédit',
    description: 'Rend ce produit de crédit disponible dans l\'interface utilisateur.',
    impact: 'Si désactivé, l\'utilisateur ne pourra pas saisir ni analyser ce type de dossier.',
    category: 'loanTypes',
  },
  'loanType.label': {
    key: 'loanType.label', label: 'Libellé métier',
    description: 'Nom affiché aux utilisateurs dans l\'interface.',
    example: 'Crédit immobilier', category: 'loanTypes',
  },
  'loanType.minAmount': {
    key: 'loanType.minAmount', label: 'Montant minimum',
    description: 'Montant le plus faible autorisé pour ce type de crédit.',
    example: '100 000 XOF', unit: 'XOF',
    impact: 'Toute demande inférieure est automatiquement rejetée.',
    category: 'loanTypes',
  },
  'loanType.maxAmount': {
    key: 'loanType.maxAmount', label: 'Montant maximum',
    description: 'Montant le plus élevé autorisé pour ce type de crédit.',
    example: '25 000 000 XOF', unit: 'XOF',
    impact: 'Toute demande au-dessus est hors politique et sera refusée.',
    category: 'loanTypes',
  },
  'loanType.minDurationMonths': {
    key: 'loanType.minDurationMonths', label: 'Durée minimum',
    description: 'Durée minimale autorisée pour ce type de crédit.',
    example: '6 mois', unit: 'mois', category: 'loanTypes',
  },
  'loanType.maxDurationMonths': {
    key: 'loanType.maxDurationMonths', label: 'Durée maximum',
    description: 'Durée maximale autorisée pour ce type de crédit.',
    example: '60 mois', unit: 'mois', category: 'loanTypes',
  },
  'loanType.defaultDurationMonths': {
    key: 'loanType.defaultDurationMonths', label: 'Durée par défaut',
    description: 'Durée proposée automatiquement lors de la saisie.',
    example: '24 mois', unit: 'mois',
    impact: 'Facilite la saisie. Doit être comprise entre la durée min et max.',
    category: 'loanTypes',
  },
  'loanType.defaultRate': {
    key: 'loanType.defaultRate', label: 'Taux par défaut',
    description: 'Taux nominal proposé automatiquement lors de la saisie.',
    example: '12 %', unit: '%',
    impact: 'L\'utilisateur peut modifier ce taux dans les limites min/max.',
    category: 'loanTypes',
  },
  'loanType.maxUsuryRate': {
    key: 'loanType.maxUsuryRate', label: 'Taux d\'usure maximum',
    description: 'Plafond réglementaire à ne pas dépasser. Toute configuration au-dessus sera signalée.',
    example: '18 %', unit: '%',
    impact: 'Empêche de configurer un taux non conforme à la réglementation.',
    warning: 'Ce seuil est réglementaire. Vérifier la réglementation BCEAO en vigueur.',
    category: 'loanTypes',
  },

  // ── ÉLIGIBILITÉ ───────────────────────────────────────────────────
  minimumNetIncome: {
    key: 'minimumNetIncome', label: 'Revenu net minimum',
    description: 'Revenu mensuel net minimal exigé pour traiter un dossier. Tout client en dessous sera refusé.',
    example: '150 000 XOF', unit: 'XOF',
    impact: 'Filtre d\'entrée fondamental. Ajustez selon votre marché cible.',
    category: 'eligibility',
  },
  minimumEmploymentMonths: {
    key: 'minimumEmploymentMonths', label: 'Ancienneté minimum (approbation)',
    description: 'Nombre de mois d\'ancienneté nécessaires pour une approbation normale.',
    example: '12 mois', unit: 'mois',
    impact: 'Mesure la stabilité professionnelle. Un seuil élevé réduit le risque.',
    category: 'eligibility',
  },
  conditionalEmploymentMonths: {
    key: 'conditionalEmploymentMonths', label: 'Seuil ancienneté conditionnelle',
    description: 'En dessous du seuil standard mais au-dessus de ce niveau, le dossier devient conditionnel.',
    example: '6 mois', unit: 'mois',
    impact: 'Crée une zone intermédiaire pour éviter les refus systématiques.',
    category: 'eligibility',
  },
  allowProbationaryPeriod: {
    key: 'allowProbationaryPeriod', label: 'Autoriser les clients en période d\'essai',
    description: 'Détermine si un client actuellement en période d\'essai peut être analysé.',
    impact: 'Ouvre ou ferme l\'accès à une catégorie de clients potentiellement instables.',
    category: 'eligibility',
  },
  probationaryDecision: {
    key: 'probationaryDecision', label: 'Traitement des dossiers en période d\'essai',
    description: 'Décision à appliquer automatiquement aux clients identifiés en période d\'essai.',
    impact: 'REJECT = refus systématique | CONDITIONAL = examen conditionnel | ALLOW = traitement normal',
    category: 'eligibility',
  },
  minimumAge: {
    key: 'minimumAge', label: 'Âge minimum',
    description: 'Âge minimal requis pour déposer une demande de crédit.',
    example: '21 ans', unit: 'ans', category: 'eligibility',
  },
  maximumAge: {
    key: 'maximumAge', label: 'Âge maximum',
    description: 'Âge maximal autorisé pour être éligible au crédit.',
    example: '65 ans', unit: 'ans',
    impact: 'S\'assurer que la durée du crédit ne dépasse pas la retraite.',
    category: 'eligibility',
  },
  acceptedContractTypes: {
    key: 'acceptedContractTypes', label: 'Types de contrat acceptés',
    description: 'Liste des statuts professionnels admis par la politique de crédit.',
    example: 'CDI, Fonctionnaire, Retraité', category: 'eligibility',
  },
  rejectedContractTypes: {
    key: 'rejectedContractTypes', label: 'Types de contrat rejetés',
    description: 'Liste des profils professionnels exclus automatiquement.',
    example: 'Sans emploi, Intérim court',
    impact: 'Ces profils déclenchent un refus immédiat quel que soit le reste du dossier.',
    warning: 'Attention à ne pas exclure des profils légitimes de manière excessive.',
    category: 'eligibility',
  },

  // ── RATIOS ────────────────────────────────────────────────────────
  'dti.enabled': {
    key: 'dti.enabled', label: 'Activer le contrôle DTI',
    description: 'Active la vérification du niveau d\'endettement. Le DTI mesure la part du revenu absorbée par les dettes.',
    impact: 'Ratio fondamental. Désactiver uniquement en mode test.',
    category: 'ratios',
  },
  'dti.approvalThreshold': {
    key: 'dti.approvalThreshold', label: 'DTI — Seuil d\'approbation',
    description: 'En dessous de ce seuil, le taux d\'endettement est considéré favorable.',
    example: '33 %', unit: '%',
    impact: 'Standard international : 33% est la norme. Un seuil plus élevé accepte plus de risque.',
    category: 'ratios',
  },
  'dti.conditionalThreshold': {
    key: 'dti.conditionalThreshold', label: 'DTI — Seuil conditionnel',
    description: 'Entre le seuil favorable et ce seuil, le dossier est traité conditionnellement.',
    example: '38 %', unit: '%',
    impact: 'Zone d\'examen renforcé. Approbation possible avec garanties supplémentaires.',
    category: 'ratios',
  },
  'dti.rejectionThreshold': {
    key: 'dti.rejectionThreshold', label: 'DTI — Seuil de refus',
    description: 'Au-delà de ce seuil, le dossier est refusé.',
    example: '40 %', unit: '%',
    warning: 'Dépasser 40% de DTI est généralement risqué selon les standards bancaires.',
    category: 'ratios',
  },
  'livingRemainder.enabled': {
    key: 'livingRemainder.enabled', label: 'Activer le contrôle du reste à vivre',
    description: 'Vérifie que le client dispose d\'un montant suffisant après toutes ses charges.',
    impact: 'Protège la capacité réelle de subsistance. Complément essentiel au DTI.',
    category: 'ratios',
  },
  'livingRemainder.minimumAmount': {
    key: 'livingRemainder.minimumAmount', label: 'Reste à vivre minimum (montant)',
    description: 'Montant absolu minimal qui doit rester disponible au client chaque mois.',
    example: '75 000 XOF', unit: 'XOF',
    impact: 'Plancher de subsistance. En dessous, le dossier est conditionnel ou refusé.',
    category: 'ratios',
  },
  'livingRemainder.minimumPercentOfIncome': {
    key: 'livingRemainder.minimumPercentOfIncome', label: 'Reste à vivre minimum (% du revenu)',
    description: 'Pourcentage minimal du revenu qui doit rester disponible. Le plus élevé des deux seuils est appliqué.',
    example: '30 %', unit: '%',
    impact: 'Proportionnel au revenu : plus équitable pour tous les profils.',
    category: 'ratios',
  },
  'ltv.enabled': {
    key: 'ltv.enabled', label: 'Activer le contrôle LTV',
    description: 'Vérifie la proportion du bien financée. Applicable aux crédits immobiliers.',
    impact: 'Mesure le risque sur le collatéral. Un LTV élevé = moins de garantie.',
    category: 'ratios',
  },
  'ltv.approvalThreshold': {
    key: 'ltv.approvalThreshold', label: 'LTV — Seuil favorable',
    description: 'En dessous de ce ratio, la couverture par le bien est considérée prudente.',
    example: '70 %', unit: '%',
    impact: 'À 70% : la banque finance 70%, le client apporte 30%.',
    category: 'ratios',
  },
  'ltv.conditionalThreshold': {
    key: 'ltv.conditionalThreshold', label: 'LTV — Seuil conditionnel',
    description: 'Zone intermédiaire à examiner avec prudence.',
    example: '80 %', unit: '%', category: 'ratios',
  },
  'ltv.rejectionThreshold': {
    key: 'ltv.rejectionThreshold', label: 'LTV — Seuil de refus',
    description: 'Au-delà, le financement est trop proche ou supérieur à la valeur du bien.',
    example: '90 %', unit: '%',
    warning: 'Un LTV > 90% expose la banque en cas de dépréciation du bien.',
    category: 'ratios',
  },
  'lti.enabled': {
    key: 'lti.enabled', label: 'Activer le contrôle LTI',
    description: 'Vérifie si le montant demandé reste cohérent avec le revenu annuel.',
    impact: 'Évite des demandes disproportionnées.',
    category: 'ratios',
  },
  'lti.maximum': {
    key: 'lti.maximum', label: 'LTI — Multiple maximum',
    description: 'Multiple maximal du revenu annuel admissible comme montant de crédit.',
    example: '4,5', unit: 'x le revenu annuel',
    impact: 'Ex : LTI = 4.5 → emprunt possible jusqu\'à 4.5x le revenu annuel.',
    category: 'ratios',
  },

  // ── SCORING ───────────────────────────────────────────────────────
  'scoring.enabled': {
    key: 'scoring.enabled', label: 'Activer le score de crédit',
    description: 'Ajoute une évaluation par score (0-100) en complément ou remplacement des règles.',
    impact: 'Produit une note synthétique qui nuance la décision au-delà des seuils binaires.',
    category: 'scoring',
  },
  'scoring.approvalScore': {
    key: 'scoring.approvalScore', label: 'Score minimum pour approbation',
    description: 'Score à partir duquel le dossier est considéré favorable.',
    example: '75', unit: 'points', category: 'scoring',
  },
  'scoring.conditionalScore': {
    key: 'scoring.conditionalScore', label: 'Score minimum pour conditionnel',
    description: 'Score intermédiaire : dossier acceptable avec conditions.',
    example: '60', unit: 'points', category: 'scoring',
  },
  'scoring.rejectionScore': {
    key: 'scoring.rejectionScore', label: 'Score de refus',
    description: 'En dessous de ce niveau, le dossier est refusé.',
    example: '40', unit: 'points', category: 'scoring',
  },

  // ── PROFIL ────────────────────────────────────────────────────────
  publicEmployeeBonus: {
    key: 'publicEmployeeBonus', label: 'Bonus fonctionnaire / salarié public',
    description: 'Ajustement positif pour les fonctionnaires et salariés d\'entreprises publiques.',
    example: '+5 points', unit: 'points',
    impact: 'Profil très stable. Bonus justifié par la faiblesse du risque de perte d\'emploi.',
    category: 'profile',
  },
  permanentContractBonus: {
    key: 'permanentContractBonus', label: 'Bonus CDI',
    description: 'Ajustement positif pour les clients en contrat à durée indéterminée.',
    example: '+3 points', unit: 'points', category: 'profile',
  },
  selfEmployedPenalty: {
    key: 'selfEmployedPenalty', label: 'Malus indépendant',
    description: 'Ajustement négatif pour les travailleurs indépendants dont le revenu est variable.',
    example: '-8 points', unit: 'points',
    impact: 'Compense l\'incertitude des revenus.',
    warning: 'Un malus trop élevé peut exclure injustement des clients solvables.',
    category: 'profile',
  },
  probationPenalty: {
    key: 'probationPenalty', label: 'Malus période d\'essai',
    description: 'Ajustement négatif appliqué aux clients en période d\'essai.',
    example: '-10 points', unit: 'points', category: 'profile',
  },
  seniorityBonusPerYear: {
    key: 'seniorityBonusPerYear', label: 'Bonus par année d\'ancienneté',
    description: 'Points supplémentaires par année complète d\'ancienneté (plafonné à 10 pts max).',
    example: '+1 point/an', unit: 'points/an',
    impact: 'Récompense la stabilité professionnelle progressive.',
    category: 'profile',
  },
  existingCustomerBonus: {
    key: 'existingCustomerBonus', label: 'Bonus client existant',
    description: 'Bonus pour les clients déjà connus de la banque.',
    example: '+3 points', unit: 'points', category: 'profile',
  },
  salaryDomiciliationBonus: {
    key: 'salaryDomiciliationBonus', label: 'Bonus domiciliation de salaire',
    description: 'Bonus pour les clients dont le salaire est domicilié dans la banque.',
    example: '+5 points', unit: 'points',
    impact: 'Réduit le risque de non-remboursement grâce à la visibilité sur les flux.',
    category: 'profile',
  },
};

export const DECISION_STRATEGY_META = {
  RULES_ONLY: {
    label: 'Règles uniquement',
    description: 'Décision fondée exclusivement sur les seuils configurés. Méthode déterministe et transparente.',
    icon: '📏',
  },
  SCORING_ONLY: {
    label: 'Score uniquement',
    description: 'Décision fondée uniquement sur le score calculé. Méthode plus nuancée mais nécessite un étalonnage soigneux.',
    icon: '🎯',
  },
  HYBRID: {
    label: 'Hybride (recommandé)',
    description: 'Combine règles d\'éligibilité (bloquantes) et scoring. Les règles bloquantes prévalent toujours.',
    icon: '⚖️',
  },
};

export const LOAN_TYPE_LABELS: Record<string, string> = {
  CONSO: 'Crédit consommation',
  PERSO: 'Crédit personnel',
  AUTO: 'Crédit automobile',
  IMMO: 'Crédit immobilier',
};

export const CONTRACT_TYPE_OPTIONS = [
  'CDI', 'CDD', 'FONCTIONNAIRE', 'TITULAIRE', 'CDI_PRIVE',
  'RETRAITE', 'INDEPENDANT', 'AUTO_ENTREPRENEUR', 'SANS_EMPLOI',
  'INTERIM', 'STAGIAIRE',
];
