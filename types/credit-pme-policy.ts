// ════════════════════════════════════════════════════════════════
// Types TypeScript — Politique de crédit PME/PMI
// Miroir fidèle de app/schemas/credit_pme_policy.py
// ════════════════════════════════════════════════════════════════

// ── A. Paramètres généraux ────────────────────────────────────
export interface PMEGeneralConfig {
  enabled: boolean;
  strategy: 'RULES_ONLY' | 'SCORING_ONLY' | 'HYBRID';
  strict_mode: boolean;
  enable_explanations: boolean;
  enable_simulations: boolean;
  max_simulations: number;
  currency: string;
  policy_version: string;
  internal_note: string;
}

// ── B. Éligibilité entreprise ─────────────────────────────────
export interface PMEEligibilityConfig {
  min_company_age_years: number;
  conditional_company_age_years: number;
  min_employees: number;
  accepted_legal_forms: string[];
  rejected_legal_forms: string[];
  accepted_sectors: string[];
  restricted_sectors: string[];
  rejected_sectors: string[];
  min_manager_experience_years: number;
  require_structured_team_for_large: boolean;
  large_amount_threshold: number;
}

// ── C. Seuils financiers ──────────────────────────────────────
export interface PMEFinancialThresholdsConfig {
  min_ca: number;
  min_resultat_net: number;
  min_ebitda: number;
  min_fonds_propres: number;
  max_endettement_total: number;
  min_tresorerie: number;
  min_capacite_remboursement: number;
  allow_incomplete_financials: boolean;
  min_financial_completeness_score: number;
}

// ── D. Ratios financiers ──────────────────────────────────────
export interface PMERatiosConfig {
  enable_debt_equity: boolean;
  max_debt_equity: number;
  conditional_debt_equity: number;
  enable_dscr: boolean;
  min_dscr: number;
  conditional_dscr: number;
  enable_treasury_coverage: boolean;
  min_treasury_months: number;
  enable_ca_trend: boolean;
  min_ca_trend_pct: number;
  enable_result_trend: boolean;
  min_result_trend_pct: number;
}

// ── E. Garanties ──────────────────────────────────────────────
export interface PMEGuaranteeConfig {
  guarantee_required_above: number;
  min_guarantee_coverage_pct: number;
  conditional_guarantee_coverage_pct: number;
  accepted_guarantee_types: string[];
  rejected_guarantee_types: string[];
  require_guarantee_docs: boolean;
  require_guarantee_free_of_charges: boolean;
  haircut_pct: number;
}

// ── F. Bancarisation ──────────────────────────────────────────
export interface PMEBankingConfig {
  require_bank_relationship: boolean;
  min_bank_relationship_months: number;
  require_flux_domiciliation_for_approval: boolean;
  min_monthly_flux: number;
  enable_incident_penalty: boolean;
  max_incident_level: number;
  require_credit_history_for_large: boolean;
  large_exposure_threshold: number;
}

// ── G. Risque commercial ──────────────────────────────────────
export interface PMECommercialRiskConfig {
  enable_client_concentration: boolean;
  max_client_concentration_pct: number;
  conditional_client_concentration_pct: number;
  enable_supplier_dependency: boolean;
  max_supplier_dependency_pct: number;
  conditional_supplier_dependency_pct: number;
  enable_seasonality_risk: boolean;
  max_seasonality_level: number;
}

// ── H. Gouvernance ────────────────────────────────────────────
export interface PMEGovernanceConfig {
  enable_governance_analysis: boolean;
  min_governance_score: number;
  structured_team_bonus: number;
  weak_governance_penalty: number;
  min_manager_seniority_years: number;
  manager_experience_bonus: number;
}

// ── I. Documents ──────────────────────────────────────────────
export interface PMEDocumentPolicyConfig {
  enable_document_policy: boolean;
  min_document_completeness_score: number;
  block_if_key_docs_missing: boolean;
  key_mandatory_docs: string[];
  complete_dossier_bonus: number;
  missing_key_doc_penalty: number;
}

// ── J. Scoring ────────────────────────────────────────────────
export interface PMEScoringWeights {
  solidite_financiere: number;
  capacite_remboursement: number;
  qualite_garanties: number;
  risque_activite: number;
  gouvernance: number;
  comportement_bancaire: number;
  completude_documentaire: number;
  completude_financiere: number;
}

export interface PMEScoringConfig {
  enabled: boolean;
  score_min: number;
  score_max: number;
  score_approval: number;
  score_conditional: number;
  score_rejection: number;
  weights: PMEScoringWeights;
}

// ── K. Bonus/Malus ────────────────────────────────────────────
export interface PMEBonusMalusConfig {
  bonus_domiciliation: number;
  bonus_client_existant: number;
  bonus_bon_historique_remboursement: number;
  penalty_incidents_bancaires: number;
  penalty_concentration_client: number;
  penalty_dependance_fournisseur: number;
  penalty_donnees_financieres_incompletes: number;
  penalty_documentation_faible: number;
  bonus_gouvernance_forte: number;
}

// ── L. Dérogation ─────────────────────────────────────────────
export interface PMEOverrideConfig {
  allow_manual_override: boolean;
  override_roles: string[];
  require_justification: boolean;
  require_audit_log: boolean;
}

// ── Config principale ─────────────────────────────────────────
export interface PMEPolicyConfig {
  general: PMEGeneralConfig;
  eligibility: PMEEligibilityConfig;
  financial_thresholds: PMEFinancialThresholdsConfig;
  ratios: PMERatiosConfig;
  guarantees: PMEGuaranteeConfig;
  banking: PMEBankingConfig;
  commercial_risk: PMECommercialRiskConfig;
  governance: PMEGovernanceConfig;
  document_policy: PMEDocumentPolicyConfig;
  scoring: PMEScoringConfig;
  bonus_malus: PMEBonusMalusConfig;
  override: PMEOverrideConfig;
}

// ════════════════════════════════════════════════════════════════
// Application input (user)
// ════════════════════════════════════════════════════════════════

export interface PMEFinancialYear {
  year: number;
  ca?: number | null;
  resultat_net?: number | null;
  ebitda?: number | null;
  fonds_propres?: number | null;
  endettement_total?: number | null;
  tresorerie?: number | null;
  bfr?: number | null;
  fonds_roulement?: number | null;
  charges_financieres?: number | null;
  stocks?: number | null;
  creances_clients?: number | null;
  dettes_fournisseurs?: number | null;
}

export interface PMEDocumentItem {
  code: string;
  label: string;
  fourni: boolean;
  obligatoire: boolean;
  bloquant: boolean;
  commentaire: string;
}

export interface PMEApplicationInput {
  // A
  raison_sociale: string;
  nom_commercial?: string;
  rccm?: string;
  nif?: string;
  annee_creation: number;
  forme_juridique: string;
  secteur: string;
  sous_secteur?: string;
  ville?: string;
  region?: string;
  adresse?: string;
  telephone?: string;
  email?: string;
  site_web?: string;
  taille: string;
  nombre_employes: number;
  positionnement?: string;
  zone_activite?: string;
  // B
  nom_dirigeant: string;
  age_dirigeant?: number;
  fonction_dirigeant?: string;
  experience_secteur_ans: number;
  anciennete_direction_ans: number;
  niveau_formation?: string;
  structure_actionnariat?: string;
  equipe_structuree: boolean;
  gouvernance_formelle: boolean;
  // C
  description_activite?: string;
  produits_services?: string;
  principaux_clients?: string;
  principaux_fournisseurs?: string;
  saisonnalite?: string;
  dependance_client_majeur: boolean;
  part_plus_gros_client_pct?: number | null;
  dependance_fournisseur_majeur: boolean;
  part_plus_gros_fournisseur_pct?: number | null;
  niveau_concurrence?: string;
  part_marche_pct?: number | null;
  perspectives_croissance?: string;
  // D
  donnees_financieres: PMEFinancialYear[];
  annuites_existantes_annuelles?: number | null;
  capacite_remboursement_estimee?: number | null;
  // E
  montant_demande: number;
  devise: string;
  objet_credit: string;
  type_credit: 'INVESTISSEMENT' | 'TRESORERIE' | 'LIGNE_FONCTIONNEMENT' | 'AUTRE';
  duree_mois: number;
  periodicite: 'MENSUELLE' | 'TRIMESTRIELLE' | 'SEMESTRIELLE' | 'ANNUELLE' | 'IN_FINE';
  taux_annuel_pct?: number | null;
  periode_grace_mois: number;
  apport_personnel?: number | null;
  source_remboursement: string;
  plan_remboursement?: string;
  urgence?: 'FAIBLE' | 'NORMALE' | 'HAUTE';
  // F
  garanties_prevues: boolean;
  type_garantie?: string;
  description_garantie?: string;
  valeur_estimee_garantie?: number | null;
  valeur_retenue_garantie?: number | null;
  proprietaire_garantie?: string;
  garantie_libre_de_charges?: boolean | null;
  documents_garantie_disponibles?: boolean | null;
  // G
  client_existant: boolean;
  anciennete_relation_bancaire_mois: number;
  flux_domicilies?: boolean | null;
  volume_flux_mensuels?: number | null;
  niveau_incidents_bancaires: number;
  historique_credits_precedents?: string;
  comportement_remboursement?: 'BON' | 'MOYEN' | 'MAUVAIS' | null;
  nombre_banques: number;
  comptes_autres_banques: boolean;
  // H
  documents: PMEDocumentItem[];
}

// ════════════════════════════════════════════════════════════════
// Résultat de décision PME
// ════════════════════════════════════════════════════════════════

export interface PMERatioDetail {
  label: string;
  value: number;
  unit: string;
  status: 'FAVORABLE' | 'CONDITIONNEL' | 'BLOQUANT' | 'NA';
  message: string;
  threshold_approval?: number | null;
  threshold_rejection?: number | null;
}

export interface PMETriggeredRule {
  code: string;
  section: string;
  impact: 'BLOQUANT' | 'PENALISANT' | 'FAVORABLE';
  message: string;
}

export interface PMESimulationScenario {
  id: string;
  label: string;
  description: string;
  montant: number;
  duree_mois: number;
  mensualite: number;
  decision: 'APPROUVE' | 'CONDITIONNEL' | 'REFUSE';
  score?: number | null;
  explication: string;
}

export interface PMECalculatedIndicators {
  company_age_years: number;
  ca_n?: number | null;
  ca_n1?: number | null;
  ca_growth_pct?: number | null;
  resultat_net_n?: number | null;
  ebitda_n?: number | null;
  ebitda_margin_pct?: number | null;
  fonds_propres_n?: number | null;
  endettement_n?: number | null;
  tresorerie_n?: number | null;
  debt_equity_ratio?: number | null;
  dscr?: number | null;
  treasury_coverage_months?: number | null;
  guarantee_coverage_pct?: number | null;
  nouvelle_mensualite?: number | null;
  annuite_annuelle?: number | null;
  financial_completeness_score: number;
  document_completeness_score: number;
  governance_score: number;
}

export interface PMEDecisionResult {
  decision: 'APPROUVE' | 'CONDITIONNEL' | 'REFUSE';
  main_reason: string;
  credit_score?: number | null;
  strategy: string;
  config_version: string;
  currency: string;
  indicators: PMECalculatedIndicators;
  ratio_details: Record<string, PMERatioDetail>;
  strengths: string[];
  weaknesses: string[];
  conditions: string[];
  missing_documents: string[];
  identified_risks: string[];
  triggered_rules: PMETriggeredRule[];
  simulations: PMESimulationScenario[];
  analyzed_at: string;
}

export interface PMEApplicationRecord {
  id: string;
  user_id: string;
  organization_id: string;
  application: PMEApplicationInput;
  result: PMEDecisionResult;
  created_at: string;
}

// ── Valeurs par défaut ────────────────────────────────────────
export function defaultPMEPolicy(): PMEPolicyConfig {
  return {
    general: {
      enabled: true,
      strategy: 'HYBRID',
      strict_mode: false,
      enable_explanations: true,
      enable_simulations: true,
      max_simulations: 3,
      currency: 'XOF',
      policy_version: '1.0',
      internal_note: '',
    },
    eligibility: {
      min_company_age_years: 2,
      conditional_company_age_years: 1,
      min_employees: 1,
      accepted_legal_forms: ['SARL', 'SA', 'SAS', 'EURL', 'SNC', 'GIE'],
      rejected_legal_forms: [],
      accepted_sectors: [],
      restricted_sectors: [],
      rejected_sectors: [],
      min_manager_experience_years: 2,
      require_structured_team_for_large: false,
      large_amount_threshold: 50_000_000,
    },
    financial_thresholds: {
      min_ca: 0,
      min_resultat_net: 0,
      min_ebitda: 0,
      min_fonds_propres: 0,
      max_endettement_total: 0,
      min_tresorerie: 0,
      min_capacite_remboursement: 0,
      allow_incomplete_financials: true,
      min_financial_completeness_score: 60,
    },
    ratios: {
      enable_debt_equity: true,
      max_debt_equity: 3,
      conditional_debt_equity: 2,
      enable_dscr: true,
      min_dscr: 1.2,
      conditional_dscr: 1.0,
      enable_treasury_coverage: true,
      min_treasury_months: 1,
      enable_ca_trend: true,
      min_ca_trend_pct: -10,
      enable_result_trend: false,
      min_result_trend_pct: -20,
    },
    guarantees: {
      guarantee_required_above: 10_000_000,
      min_guarantee_coverage_pct: 80,
      conditional_guarantee_coverage_pct: 60,
      accepted_guarantee_types: ['HYPOTHEQUE', 'NANTISSEMENT', 'CAUTION_PERSO', 'GAGE_MATERIEL'],
      rejected_guarantee_types: [],
      require_guarantee_docs: true,
      require_guarantee_free_of_charges: false,
      haircut_pct: 20,
    },
    banking: {
      require_bank_relationship: false,
      min_bank_relationship_months: 6,
      require_flux_domiciliation_for_approval: false,
      min_monthly_flux: 0,
      enable_incident_penalty: true,
      max_incident_level: 2,
      require_credit_history_for_large: false,
      large_exposure_threshold: 50_000_000,
    },
    commercial_risk: {
      enable_client_concentration: true,
      max_client_concentration_pct: 80,
      conditional_client_concentration_pct: 60,
      enable_supplier_dependency: true,
      max_supplier_dependency_pct: 80,
      conditional_supplier_dependency_pct: 60,
      enable_seasonality_risk: false,
      max_seasonality_level: 3,
    },
    governance: {
      enable_governance_analysis: true,
      min_governance_score: 40,
      structured_team_bonus: 5,
      weak_governance_penalty: -5,
      min_manager_seniority_years: 1,
      manager_experience_bonus: 3,
    },
    document_policy: {
      enable_document_policy: true,
      min_document_completeness_score: 60,
      block_if_key_docs_missing: true,
      key_mandatory_docs: ['RCCM', 'NIF', 'STATUTS', 'BILAN_N', 'BILAN_N1', 'RELEVES_BANCAIRES'],
      complete_dossier_bonus: 5,
      missing_key_doc_penalty: -10,
    },
    scoring: {
      enabled: true,
      score_min: 0,
      score_max: 100,
      score_approval: 70,
      score_conditional: 50,
      score_rejection: 30,
      weights: {
        solidite_financiere: 25,
        capacite_remboursement: 25,
        qualite_garanties: 15,
        risque_activite: 15,
        gouvernance: 10,
        comportement_bancaire: 5,
        completude_documentaire: 3,
        completude_financiere: 2,
      },
    },
    bonus_malus: {
      bonus_domiciliation: 3,
      bonus_client_existant: 3,
      bonus_bon_historique_remboursement: 5,
      penalty_incidents_bancaires: -8,
      penalty_concentration_client: -5,
      penalty_dependance_fournisseur: -3,
      penalty_donnees_financieres_incompletes: -5,
      penalty_documentation_faible: -5,
      bonus_gouvernance_forte: 5,
    },
    override: {
      allow_manual_override: false,
      override_roles: ['org_admin'],
      require_justification: true,
      require_audit_log: true,
    },
  };
}
