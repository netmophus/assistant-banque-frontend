/**
 * Catalogue des variables standards BCEAO utilisées dans les formules de ratios
 * prudentiels officiels (RA001 à RA011 + LCR + NSFR + ratios de gestion).
 *
 * Chaque variable a un `key` exact — il doit correspondre au `postes_requis` des
 * ratios par défaut (voir `RATIOS_DEFAUT_UEMOA` dans le backend). Si une clé
 * diverge, le calcul retournera NaN.
 *
 * L'utilisateur sélectionne la clé dans une liste déroulante → libellé + unité
 * pré-remplis (grisés). Le montant est la seule saisie libre.
 */

export interface RatioVariableStandard {
  key: string;
  label: string;
  unit: string;
  category: string;
  description?: string;
}

export const RATIO_VARIABLES_STANDARDS: RatioVariableStandard[] = [
  // ─── Fonds propres (Titre II du dispositif BCEAO) ───
  { key: 'CET1',  label: 'Fonds propres de base durs (CET1)',           unit: 'M FCFA', category: 'Fonds propres' },
  { key: 'AT1',   label: 'Fonds propres de base additionnels (AT1)',    unit: 'M FCFA', category: 'Fonds propres' },
  { key: 'T1',    label: 'Fonds propres de base Tier 1 (CET1 + AT1)',   unit: 'M FCFA', category: 'Fonds propres' },
  { key: 'T2',    label: 'Fonds propres complémentaires (T2)',          unit: 'M FCFA', category: 'Fonds propres' },
  { key: 'FPE',   label: 'Fonds propres effectifs (T1 + T2)',           unit: 'M FCFA', category: 'Fonds propres' },

  // ─── Actifs pondérés des risques (Titre III-VI) ───
  { key: 'APR',               label: 'Actifs pondérés des risques (APR total)', unit: 'M FCFA', category: 'Actifs pondérés' },
  { key: 'APR_CREDIT',        label: 'APR — Risque de crédit',                  unit: 'M FCFA', category: 'Actifs pondérés' },
  { key: 'APR_MARCHE',        label: 'APR — Risque de marché',                  unit: 'M FCFA', category: 'Actifs pondérés' },
  { key: 'APR_OPERATIONNEL',  label: 'APR — Risque opérationnel',               unit: 'M FCFA', category: 'Actifs pondérés' },

  // ─── Levier (Titre VIII) ───
  { key: 'EXPOSITION_TOTALE_LEVIER', label: 'Exposition totale (mesure levier)', unit: 'M FCFA', category: 'Levier' },

  // ─── Division des risques (Titre VII) ───
  { key: 'PLUS_GRANDE_EXPOSITION', label: 'Plus grande exposition sur un bénéficiaire', unit: 'M FCFA', category: 'Division des risques' },

  // ─── Participations (Titre IX §484) ───
  { key: 'PARTICIPATION_INDIV_NON_FINANCIERE',    label: 'Participation indiv. (entreprise non financière)', unit: 'M FCFA', category: 'Participations' },
  { key: 'PARTICIPATION_INDIV_FINANCIERE',        label: 'Participation indiv. (entreprise financière hors périmètre)', unit: 'M FCFA', category: 'Participations' },
  { key: 'TOTAL_PARTICIPATIONS_NON_FINANCIERES',  label: 'Total participations (entreprises non financières)', unit: 'M FCFA', category: 'Participations' },
  { key: 'PARTICIPATIONS',                        label: 'Total des participations (toutes)',                unit: 'M FCFA', category: 'Participations' },

  // ─── Immobilisations (Titre IX §485-489) ───
  { key: 'IMMOBILISATIONS_HORS_EXPLOITATION', label: 'Immobilisations hors exploitation (nettes)',      unit: 'M FCFA', category: 'Immobilisations' },
  { key: 'IMMOBILISATIONS_TOTALES',           label: 'Immobilisations totales (corporelles + incorp.)', unit: 'M FCFA', category: 'Immobilisations' },

  // ─── Parties liées (Titre IX §490) ───
  { key: 'PRETS_PARTIES_LIEES', label: 'Encours des prêts aux parties liées', unit: 'M FCFA', category: 'Parties liées' },

  // ─── Liquidité (Titre XIII) ───
  { key: 'HQLA',              label: 'Actifs liquides de haute qualité (HQLA)',   unit: 'M FCFA', category: 'Liquidité' },
  { key: 'SORTIES_NETTES_30J',label: 'Sorties nettes de trésorerie sur 30 jours', unit: 'M FCFA', category: 'Liquidité' },
  { key: 'ASF',               label: 'Financements stables disponibles (ASF)',    unit: 'M FCFA', category: 'Liquidité' },
  { key: 'RSF',               label: 'Financements stables exigés (RSF)',         unit: 'M FCFA', category: 'Liquidité' },

  // ─── Compte de résultat ───
  { key: 'PNB',                           label: 'Produit Net Bancaire (PNB)',       unit: 'M FCFA', category: 'Compte de résultat' },
  { key: 'CHARGES_GENERALES_EXPLOITATION',label: 'Charges générales d\'exploitation', unit: 'M FCFA', category: 'Compte de résultat' },
  { key: 'RESULTAT_NET',                  label: 'Résultat net',                     unit: 'M FCFA', category: 'Compte de résultat' },
  { key: 'INTERETS_RECUS',                label: 'Intérêts reçus (produits)',        unit: 'M FCFA', category: 'Compte de résultat' },
  { key: 'INTERETS_PAYES',                label: 'Intérêts payés (charges)',         unit: 'M FCFA', category: 'Compte de résultat' },

  // ─── Bilan — moyennes et agrégats ───
  { key: 'TOTAL_ACTIF_MOYEN',    label: 'Total actif moyen',      unit: 'M FCFA', category: 'Bilan (moyennes)' },
  { key: 'FONDS_PROPRES_MOYENS', label: 'Fonds propres moyens',   unit: 'M FCFA', category: 'Bilan (moyennes)' },
  { key: 'CREDITS_CLIENTELE',    label: 'Crédits clientèle (encours)', unit: 'M FCFA', category: 'Bilan (clientèle)' },
  { key: 'DEPOTS_CLIENTELE',     label: 'Dépôts clientèle',            unit: 'M FCFA', category: 'Bilan (clientèle)' },

  // ─── Qualité du portefeuille ───
  { key: 'CREANCES_SOUFFRANCE_BRUTES', label: 'Créances en souffrance — brutes',     unit: 'M FCFA', category: 'Qualité du portefeuille' },
  { key: 'CREANCES_SOUFFRANCE_NETTES', label: 'Créances en souffrance — nettes',     unit: 'M FCFA', category: 'Qualité du portefeuille' },
  { key: 'TOTAL_CREDITS_BRUTS',        label: 'Total crédits bruts',                 unit: 'M FCFA', category: 'Qualité du portefeuille' },
  { key: 'TOTAL_CREDITS_NETS',         label: 'Total crédits nets (après provisions)', unit: 'M FCFA', category: 'Qualité du portefeuille' },
  { key: 'PROVISIONS_CDL',             label: 'Provisions sur créances douteuses',    unit: 'M FCFA', category: 'Qualité du portefeuille' },
];

// Map pour lookup rapide par key
export const RATIO_VARIABLES_STANDARDS_BY_KEY: Record<string, RatioVariableStandard> =
  RATIO_VARIABLES_STANDARDS.reduce((acc, v) => ({ ...acc, [v.key]: v }), {});
