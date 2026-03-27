/**
 * Types TypeScript pour le moteur de décision de crédit particulier.
 * Ces interfaces correspondent exactement aux schémas Pydantic du backend.
 */

export interface LoanTypeConfig {
  enabled: boolean;
  label: string;
  minAmount: number;
  maxAmount: number;
  minDurationMonths: number;
  maxDurationMonths: number;
  defaultDurationMonths: number;
  minRate: number;
  maxRate: number;
  defaultRate: number;
  maxUsuryRate: number;
  requiresCollateral: boolean;
  requiresDownPayment: boolean;
}

export interface DTIConfig {
  enabled: boolean;
  approvalThreshold: number;
  conditionalThreshold: number;
  rejectionThreshold: number;
}

export interface LivingRemainderConfig {
  enabled: boolean;
  minimumAmount: number;
  minimumPercentOfIncome: number;
}

export interface LTVConfig {
  enabled: boolean;
  approvalThreshold: number;
  conditionalThreshold: number;
  rejectionThreshold: number;
}

export interface LTIConfig {
  enabled: boolean;
  maximum: number;
}

export interface RatioConfig {
  dti: DTIConfig;
  livingRemainder: LivingRemainderConfig;
  ltv: LTVConfig;
  lti: LTIConfig;
}

export interface ScoringWeights {
  dti: number;
  livingRemainder: number;
  ltv: number;
  employmentStability: number;
  contractType: number;
  incomeLevel: number;
  debtBehavior: number;
  clientProfile: number;
  documentCompleteness: number;
}

export interface ScoringConfig {
  enabled: boolean;
  scaleMin: number;
  scaleMax: number;
  approvalScore: number;
  conditionalScore: number;
  rejectionScore: number;
  weights: ScoringWeights;
}

export interface ProfileAdjustments {
  publicEmployeeBonus: number;
  permanentContractBonus: number;
  selfEmployedPenalty: number;
  probationPenalty: number;
  seniorityBonusPerYear: number;
  existingCustomerBonus: number;
  salaryDomiciliationBonus: number;
}

export interface EligibilityConfig {
  minimumNetIncome: number;
  minimumEmploymentMonths: number;
  conditionalEmploymentMonths: number;
  allowProbationaryPeriod: boolean;
  probationaryDecision: 'REJECT' | 'CONDITIONAL' | 'ALLOW';
  minimumAge: number;
  maximumAge: number;
  acceptedContractTypes: string[];
  rejectedContractTypes: string[];
}

export interface DocumentRequirement {
  code: string;
  label: string;
  required: boolean;
  blockingIfMissing: boolean;
}

export interface SimulationConfig {
  enabled: boolean;
  amountVariations: number[];
  durationVariationsMonths: number[];
  rateVariations: number[];
  downPaymentVariations: number[];
}

export interface OverrideConfig {
  allowManualOverride: boolean;
  manualOverrideRoles: string[];
  requireOverrideReason: boolean;
}

export interface CreditPolicyConfig {
  id: string;
  organization_id: string;
  version: string;
  status: 'active' | 'inactive';
  effectiveDate: string;
  updatedAt: string;
  updatedBy: string;

  currency: string;
  defaultLoanType: string;
  decisionStrategy: 'RULES_ONLY' | 'SCORING_ONLY' | 'HYBRID';
  strictMode: boolean;
  enableExplanations: boolean;
  enableSimulations: boolean;
  maxSimulationScenarios: number;

  loanTypes: Record<string, LoanTypeConfig>;
  eligibility: EligibilityConfig;
  ratios: RatioConfig;
  scoring: ScoringConfig;
  profileAdjustments: ProfileAdjustments;
  documents: Record<string, DocumentRequirement[]>;
  simulations: SimulationConfig;
  overrides: OverrideConfig;
}

export interface CreditPolicyVersion {
  id: string;
  organization_id: string;
  version: string;
  status: string;
  effectiveDate: string;
  updatedAt: string;
  updatedBy: string;
  config_snapshot: Partial<CreditPolicyConfig>;
}

// ── Types pour la demande de crédit ──────────────────────────────

export interface ExistingLoanInput {
  type: string;
  monthlyPayment: number;
  remainingDurationMonths: number;
  outstandingAmount: number;
}

export interface CreditApplicationInput {
  loanType: string;
  loanAmount: number;
  loanDurationMonths: number;
  annualInterestRate?: number;
  propertyValue?: number;
  downPayment?: number;
  clientName: string;
  age?: number;
  isExistingCustomer: boolean;
  hasSalaryDomiciliation: boolean;
  contractType: string;
  employmentStartDate?: string;
  isOnProbation: boolean;
  probationEndDate?: string;
  employerSector?: string;
  netMonthlySalary: number;
  otherMonthlyIncome: number;
  rentOrMortgage: number;
  otherMonthlyCharges: number;
  existingLoans: ExistingLoanInput[];
  providedDocuments: string[];
}

// ── Types pour le résultat de décision ───────────────────────────

export interface RatioDetail {
  value: number;
  thresholdApproval?: number;
  thresholdConditional?: number;
  thresholdRejection?: number;
  status: 'FAVORABLE' | 'CONDITIONNEL' | 'BLOQUANT' | 'NA';
  label: string;
  message: string;
  unit: string;
}

export interface TriggeredRule {
  code: string;
  message: string;
  impact: 'BLOQUANT' | 'PENALISANT' | 'FAVORABLE';
}

export interface SimulationScenario {
  id: string;
  label: string;
  description: string;
  loanAmount: number;
  loanDurationMonths: number;
  annualInterestRate: number;
  monthlyInstallment: number;
  newDTI: number;
  newLivingRemainder: number;
  decision: 'APPROUVE' | 'CONDITIONNEL' | 'REFUSE';
  explanation: string;
}

export interface CreditDecisionResult {
  appliedRate: number;
  monthlyInstallment: number;
  totalAmount: number;
  totalInterest: number;
  currentDTI: number;
  newDTI: number;
  livingRemainder: number;
  ltv?: number;
  lti: number;
  creditScore?: number;
  jobSeniorityMonths: number;
  totalMonthlyIncome: number;
  totalCurrentCharges: number;
  ratioDetails: Record<string, RatioDetail>;
  decision: 'APPROUVE' | 'CONDITIONNEL' | 'REFUSE';
  mainReason: string;
  strategy: string;
  configVersion: string;
  triggeredRules: TriggeredRule[];
  strengths: string[];
  weaknesses: string[];
  conditions: string[];
  simulations: SimulationScenario[];
  analyzedAt: string;
  applicationId: string;
  record_id?: string;
}
