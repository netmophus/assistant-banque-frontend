'use client';

import { useState, useCallback } from 'react';
import { apiClient } from '@/lib/api/client';
import type {
  PMEApplicationInput, PMEFinancialYear, PMEDocumentItem, PMEDecisionResult,
  PMERatioDetail, PMETriggeredRule, PMESimulationScenario,
} from '@/types/credit-pme-policy';

// ── Constants ──────────────────────────────────────────────────────────────────

const CURRENT_YEAR = new Date().getFullYear();

const DEFAULT_DOCS: PMEDocumentItem[] = [
  { code: 'RCCM', label: 'Registre de Commerce (RCCM)', fourni: false, obligatoire: true, bloquant: true, commentaire: '' },
  { code: 'NIF', label: 'Numéro d\'Identification Fiscale (NIF)', fourni: false, obligatoire: true, bloquant: true, commentaire: '' },
  { code: 'STATUTS', label: 'Statuts de la société', fourni: false, obligatoire: true, bloquant: true, commentaire: '' },
  { code: 'BILAN_N', label: 'Bilan N (exercice le plus récent)', fourni: false, obligatoire: true, bloquant: true, commentaire: '' },
  { code: 'BILAN_N1', label: 'Bilan N-1', fourni: false, obligatoire: true, bloquant: false, commentaire: '' },
  { code: 'COMPTE_RESULTAT_N', label: 'Compte de résultat N', fourni: false, obligatoire: true, bloquant: false, commentaire: '' },
  { code: 'LIASSE_FISCALE', label: 'Liasse fiscale', fourni: false, obligatoire: false, bloquant: false, commentaire: '' },
  { code: 'RELEVES_BANCAIRES', label: 'Relevés bancaires (3-6 derniers mois)', fourni: false, obligatoire: true, bloquant: false, commentaire: '' },
  { code: 'PIECE_DIRIGEANT', label: 'Pièce d\'identité du dirigeant', fourni: false, obligatoire: true, bloquant: false, commentaire: '' },
  { code: 'DEVIS_PROFORMA', label: 'Devis / Facture pro-forma', fourni: false, obligatoire: false, bloquant: false, commentaire: '' },
  { code: 'DOC_GARANTIE', label: 'Document de garantie (titre, acte, etc.)', fourni: false, obligatoire: false, bloquant: false, commentaire: '' },
  { code: 'CONTRATS_COMMERCIAUX', label: 'Contrats commerciaux majeurs', fourni: false, obligatoire: false, bloquant: false, commentaire: '' },
];

function emptyFinYear(year: number): PMEFinancialYear {
  return { year, ca: null, resultat_net: null, ebitda: null, fonds_propres: null, endettement_total: null, tresorerie: null };
}

function emptyForm(): PMEApplicationInput {
  return {
    raison_sociale: '', nom_commercial: '', rccm: '', nif: '',
    annee_creation: CURRENT_YEAR - 5,
    forme_juridique: 'SARL', secteur: '', sous_secteur: '', ville: '', region: '',
    adresse: '', telephone: '', email: '', site_web: '',
    taille: 'PME', nombre_employes: 5, positionnement: '', zone_activite: '',
    nom_dirigeant: '', age_dirigeant: undefined, fonction_dirigeant: '',
    experience_secteur_ans: 0, anciennete_direction_ans: 0, niveau_formation: '',
    structure_actionnariat: '', equipe_structuree: false, gouvernance_formelle: false,
    description_activite: '', produits_services: '', principaux_clients: '',
    principaux_fournisseurs: '', saisonnalite: '',
    dependance_client_majeur: false, part_plus_gros_client_pct: undefined,
    dependance_fournisseur_majeur: false, part_plus_gros_fournisseur_pct: undefined,
    niveau_concurrence: '', part_marche_pct: undefined, perspectives_croissance: '',
    donnees_financieres: [emptyFinYear(CURRENT_YEAR - 1), emptyFinYear(CURRENT_YEAR - 2)],
    annuites_existantes_annuelles: undefined, capacite_remboursement_estimee: undefined,
    montant_demande: 0, devise: 'XOF', objet_credit: '',
    type_credit: 'INVESTISSEMENT', duree_mois: 36, periodicite: 'MENSUELLE',
    taux_annuel_pct: undefined, periode_grace_mois: 0,
    apport_personnel: undefined, source_remboursement: 'cash-flow exploitation',
    plan_remboursement: '', urgence: 'NORMALE',
    garanties_prevues: false, type_garantie: '', description_garantie: '',
    valeur_estimee_garantie: undefined, valeur_retenue_garantie: undefined,
    proprietaire_garantie: '', garantie_libre_de_charges: undefined, documents_garantie_disponibles: undefined,
    client_existant: false, anciennete_relation_bancaire_mois: 0,
    flux_domicilies: undefined, volume_flux_mensuels: undefined,
    niveau_incidents_bancaires: 0, historique_credits_precedents: '',
    comportement_remboursement: undefined, nombre_banques: 1, comptes_autres_banques: false,
    documents: DEFAULT_DOCS,
  };
}

// ── UI helpers ─────────────────────────────────────────────────────────────────

const inputCls = "w-full px-3 py-2.5 bg-[#040B1E] border border-[#1B3A8C]/40 rounded-xl text-white text-sm focus:outline-none focus:border-[#C9A84C]/60 placeholder-white/25";
const numCls = `${inputCls} [appearance:textfield]`;

function Field({ label, help, unit, children }: { label: string; help: string; unit?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-2">
        <label className="text-sm font-semibold text-white/85">{label}</label>
        {unit && <span className="text-xs text-white/45 px-2 py-0.5 rounded-full" style={{ background: 'rgba(27,58,140,0.2)' }}>{unit}</span>}
      </div>
      {children}
      <p className="text-xs text-white/55 italic rounded-lg px-2.5 py-1.5" style={{ background: 'rgba(27,58,140,0.12)', border: '1px solid rgba(27,58,140,0.2)' }}>{help}</p>
    </div>
  );
}

function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button type="button" onClick={() => onChange(!value)}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${value ? 'bg-[#1B3A8C]' : 'bg-white/10'}`}>
      <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${value ? 'translate-x-6' : 'translate-x-1'}`} />
    </button>
  );
}

function StepHeader({ step, label, icon, accent = '#1B3A8C' }: { step: string; label: string; icon: string; accent?: string }) {
  return (
    <div className="flex items-center gap-3 mb-5 pb-3" style={{ borderBottom: `1px solid ${accent}30` }}>
      <span className="text-xs font-black w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 text-white"
        style={{ background: accent, boxShadow: `0 2px 8px ${accent}40` }}>{step}</span>
      <span className="text-xl">{icon}</span>
      <h3 className="text-base font-black text-white uppercase tracking-wide">{label}</h3>
    </div>
  );
}

// ── Result sub-components ──────────────────────────────────────────────────────

const DECISION_CFG = {
  APPROUVE:     { bg: 'from-emerald-900/30 to-emerald-800/10', border: 'border-emerald-500/40', text: 'text-emerald-300', badge: 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300', icon: '✅', label: 'APPROUVÉ' },
  CONDITIONNEL: { bg: 'from-amber-900/30 to-amber-800/10',     border: 'border-amber-500/40',   text: 'text-amber-300',   badge: 'bg-amber-500/20 border-amber-500/50 text-amber-300',     icon: '⚠️', label: 'CONDITIONNEL' },
  REFUSE:       { bg: 'from-red-900/30 to-red-800/10',         border: 'border-red-500/40',     text: 'text-red-300',     badge: 'bg-red-500/20 border-red-500/50 text-red-300',           icon: '❌', label: 'REFUSÉ' },
};

function RatioGauge({ ratio }: { ratio: PMERatioDetail }) {
  const cfg = {
    FAVORABLE:    { bar: 'bg-emerald-500', text: 'text-emerald-300' },
    CONDITIONNEL: { bar: 'bg-amber-500',   text: 'text-amber-300' },
    BLOQUANT:     { bar: 'bg-red-500',     text: 'text-red-300' },
    NA:           { bar: 'bg-white/15',   text: 'text-white/40' },
  }[ratio.status] ?? { bar: 'bg-white/15', text: 'text-white/40' };

  const max = ratio.threshold_rejection ?? (ratio.value * 1.5 || 100);
  const pct = max > 0 ? Math.min(100, (Math.abs(ratio.value) / Math.abs(max)) * 100) : 0;

  return (
    <div className="rounded-xl p-4" style={{ background: '#040B1E', border: '1px solid rgba(5,150,105,0.25)' }}>
      <div className="flex items-start justify-between mb-2">
        <div>
          <p className="text-sm font-bold text-white">{ratio.label}</p>
          <p className="text-xs text-white/40 mt-0.5">{ratio.message}</p>
        </div>
        <div className="text-right flex-shrink-0 ml-2">
          <p className="text-lg font-black text-white">{ratio.value.toFixed(2)}<span className="text-sm font-normal text-white/40">{ratio.unit}</span></p>
          <span className={`text-xs font-bold ${cfg.text}`}>{ratio.status}</span>
        </div>
      </div>
      <div className="w-full rounded-full h-2 mt-2" style={{ background: 'rgba(255,255,255,0.06)' }}>
        <div className={`h-2 rounded-full ${cfg.bar}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function SimCard({ sim, currency }: { sim: PMESimulationScenario; currency: string }) {
  const cfg = {
    APPROUVE:     { border: 'border-emerald-500/40', badge: 'bg-emerald-500/20 text-emerald-300' },
    CONDITIONNEL: { border: 'border-amber-500/40',   badge: 'bg-amber-500/20 text-amber-300' },
    REFUSE:       { border: 'border-red-500/40',     badge: 'bg-red-500/20 text-red-300' },
  }[sim.decision] ?? { border: 'border-[#374151]', badge: 'bg-[#374151] text-[#9CA3AF]' };
  const decLabel = sim.decision === 'APPROUVE' ? 'Approuvé' : sim.decision === 'CONDITIONNEL' ? 'Conditionnel' : 'Refusé';
  return (
    <div className={`rounded-xl p-4 border ${cfg.border}`} style={{ background: '#040B1E' }}>
      <div className="flex items-start justify-between mb-3">
        <div>
          <p className="text-sm font-bold text-white">{sim.label}</p>
          <p className="text-xs text-white/40 mt-0.5">{sim.description}</p>
        </div>
        <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${cfg.badge} flex-shrink-0 ml-2`}>{decLabel}</span>
      </div>
      <div className="grid grid-cols-3 gap-3 text-center">
        <div><p className="text-[10px] text-white/40 uppercase tracking-wide">Montant</p><p className="text-sm font-bold text-white">{sim.montant.toLocaleString('fr-FR')} {currency}</p></div>
        <div><p className="text-[10px] text-white/40 uppercase tracking-wide">Durée</p><p className="text-sm font-bold text-white">{sim.duree_mois} mois</p></div>
        <div><p className="text-[10px] text-white/40 uppercase tracking-wide">Mensualité</p><p className="text-sm font-bold text-white">{sim.mensualite.toLocaleString('fr-FR')} {currency}</p></div>
      </div>
      {sim.explication && <p className="text-xs text-white/50 mt-3 italic pt-2" style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }}>{sim.explication}</p>}
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────

export default function CreditPMEAnalysisForm() {
  const [form, setForm] = useState<PMEApplicationInput>(emptyForm);
  const [result, setResult] = useState<PMEDecisionResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeStep, setActiveStep] = useState(0);
  const [copied, setCopied] = useState(false);

  const set = useCallback(<K extends keyof PMEApplicationInput>(field: K, value: PMEApplicationInput[K]) => {
    setForm(prev => ({ ...prev, [field]: value }));
  }, []);

  const setFinYear = useCallback((idx: number, field: keyof PMEFinancialYear, value: number | null) => {
    setForm(prev => {
      const years = [...prev.donnees_financieres];
      years[idx] = { ...years[idx], [field]: value };
      return { ...prev, donnees_financieres: years };
    });
  }, []);

  const setDoc = useCallback((idx: number, field: keyof PMEDocumentItem, value: boolean | string) => {
    setForm(prev => {
      const docs = [...prev.documents];
      docs[idx] = { ...docs[idx], [field]: value };
      return { ...prev, documents: docs };
    });
  }, []);

  const handleSubmit = async () => {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await apiClient.post<PMEDecisionResult>('/credit-policy/pme/analyze', form);
      setResult(res);
      setTimeout(() => document.getElementById('pme-result')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
    } catch (e: any) {
      setError(e?.message || 'Erreur lors de l\'analyse.');
    } finally {
      setLoading(false);
    }
  };

  const steps = [
    { label: 'Identification', icon: '🏢' },
    { label: 'Dirigeant', icon: '👤' },
    { label: 'Activité', icon: '📈' },
    { label: 'Finances', icon: '💰' },
    { label: 'Crédit demandé', icon: '💳' },
    { label: 'Garanties', icon: '🔒' },
    { label: 'Bancarisation', icon: '🏦' },
    { label: 'Documents', icon: '📄' },
  ];

  const currency = form.devise || 'XOF';
  const decCfg = result ? (DECISION_CFG[result.decision] ?? DECISION_CFG.REFUSE) : null;

  return (
    <div className="space-y-6">
      {/* Step navigation */}
      <div className="p-1.5 rounded-2xl flex gap-1 flex-wrap" style={{ background: '#0A1434', border: '2px solid rgba(27,58,140,0.3)' }}>
        {steps.map((s, i) => (
          <button key={i} onClick={() => setActiveStep(i)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all"
            style={activeStep === i
              ? { background: 'linear-gradient(135deg, #1B3A8C, #C9A84C)', color: 'white', boxShadow: '0 4px 12px rgba(27,58,140,0.4)' }
              : { background: 'transparent', color: 'rgba(255,255,255,0.5)', border: '1px solid rgba(255,255,255,0.08)' }}>
            <span>{s.icon}</span><span className="hidden sm:inline">{s.label}</span>
          </button>
        ))}
      </div>

      {/* Step A — Identification entreprise */}
      {activeStep === 0 && (
        <div className="rounded-2xl p-6" style={{ background: '#0A1434', borderTop: '2px solid rgba(201,168,76,0.25)', borderRight: '2px solid rgba(201,168,76,0.25)', borderBottom: '2px solid rgba(201,168,76,0.25)', borderLeft: '4px solid #C9A84C', boxShadow: '0 0 20px rgba(201,168,76,0.06)' }}>
          <StepHeader step="A" label="Identification de l'entreprise" icon="🏢" accent="#C9A84C" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <Field label="Raison sociale *" help="Nom officiel de l'entreprise tel qu'il figure dans les statuts et au RCCM.">
              <input className={inputCls} value={form.raison_sociale} onChange={e => set('raison_sociale', e.target.value)} placeholder="Ex: Société ACME SARL" />
            </Field>
            <Field label="Nom commercial" help="Nom sous lequel l'entreprise est connue du public, s'il diffère de la raison sociale.">
              <input className={inputCls} value={form.nom_commercial || ''} onChange={e => set('nom_commercial', e.target.value)} placeholder="Ex: ACME" />
            </Field>
            <Field label="RCCM" help="Numéro du Registre du Commerce et du Crédit Mobilier. Identifie l'entreprise auprès des autorités commerciales.">
              <input className={inputCls} value={form.rccm || ''} onChange={e => set('rccm', e.target.value)} placeholder="Ex: RCCM-NI-NIA-2019-B-1234" />
            </Field>
            <Field label="NIF" help="Numéro d'Identification Fiscale attribué par l'administration fiscale.">
              <input className={inputCls} value={form.nif || ''} onChange={e => set('nif', e.target.value)} placeholder="Ex: NIF-2019-NIA-5678" />
            </Field>
            <Field label="Année de création *" help="Année de création officielle de l'entreprise. Détermine l'ancienneté, critère d'éligibilité clé.">
              <input type="number" className={numCls} value={form.annee_creation} onChange={e => set('annee_creation', parseInt(e.target.value) || CURRENT_YEAR - 5)} min={1900} max={CURRENT_YEAR} />
            </Field>
            <Field label="Forme juridique *" help="Structure légale de l'entreprise. Certaines formes peuvent être exclues selon la politique.">
              <select className={inputCls} value={form.forme_juridique} onChange={e => set('forme_juridique', e.target.value)}>
                {['SARL', 'SA', 'SAS', 'EURL', 'SNC', 'GIE', 'EI', 'AUTRE'].map(f => <option key={f} value={f}>{f}</option>)}
              </select>
            </Field>
            <Field label="Secteur d'activité *" help="Domaine principal d'activité. Certains secteurs peuvent être restreints ou rejetés selon la politique.">
              <input className={inputCls} value={form.secteur} onChange={e => set('secteur', e.target.value)} placeholder="Ex: Commerce, BTP, Industrie, Agro-alimentaire" />
            </Field>
            <Field label="Sous-secteur" help="Précision sur le secteur. Permet une analyse plus fine du risque sectoriel.">
              <input className={inputCls} value={form.sous_secteur || ''} onChange={e => set('sous_secteur', e.target.value)} placeholder="Ex: Commerce de gros, Construction résidentielle" />
            </Field>
            <Field label="Taille entreprise" help="Classification selon la taille. TPE < 10 employés, PME 10-250, GE > 250.">
              <select className={inputCls} value={form.taille} onChange={e => set('taille', e.target.value)}>
                {['TPE', 'PME', 'ETI', 'GE'].map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </Field>
            <Field label="Nombre d'employés *" help="Effectif total de l'entreprise. Utilisé pour valider l'éligibilité si un minimum est requis." unit="personnes">
              <input type="number" className={numCls} value={form.nombre_employes} onChange={e => set('nombre_employes', parseInt(e.target.value) || 0)} min={0} />
            </Field>
            <Field label="Ville" help="Ville du siège social.">
              <input className={inputCls} value={form.ville || ''} onChange={e => set('ville', e.target.value)} placeholder="Ex: Niamey" />
            </Field>
            <Field label="Région" help="Région administrative du siège social.">
              <input className={inputCls} value={form.region || ''} onChange={e => set('region', e.target.value)} placeholder="Ex: Niamey, Tillabéri, Zinder" />
            </Field>
            <Field label="Téléphone" help="Numéro de contact principal de l'entreprise.">
              <input className={inputCls} value={form.telephone || ''} onChange={e => set('telephone', e.target.value)} placeholder="+227 90 00 00 00" />
            </Field>
            <Field label="Email" help="Email professionnel de l'entreprise ou du dirigeant.">
              <input className={inputCls} type="email" value={form.email || ''} onChange={e => set('email', e.target.value)} placeholder="contact@entreprise.com" />
            </Field>
            <Field label="Zone d'activité" help="Zone géographique couverte par l'activité (locale, nationale, régionale, internationale).">
              <select className={inputCls} value={form.zone_activite || ''} onChange={e => set('zone_activite', e.target.value)}>
                <option value="">— Sélectionner —</option>
                {['Locale', 'Nationale', 'Régionale', 'Internationale'].map(z => <option key={z} value={z}>{z}</option>)}
              </select>
            </Field>
            <Field label="Positionnement marché" help="Description du positionnement stratégique de l'entreprise (haut de gamme, entrée de gamme, niche, etc.)">
              <input className={inputCls} value={form.positionnement || ''} onChange={e => set('positionnement', e.target.value)} placeholder="Ex: Fournisseur de proximité, milieu de gamme" />
            </Field>
          </div>
        </div>
      )}

      {/* Step B — Dirigeant */}
      {activeStep === 1 && (
        <div className="rounded-2xl p-6" style={{ background: '#0A1434', borderTop: '2px solid rgba(27,58,140,0.35)', borderRight: '2px solid rgba(27,58,140,0.35)', borderBottom: '2px solid rgba(27,58,140,0.35)', borderLeft: '4px solid #1B3A8C', boxShadow: '0 0 20px rgba(27,58,140,0.08)' }}>
          <StepHeader step="B" label="Dirigeant et gouvernance" icon="👤" accent="#1B3A8C" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <Field label="Nom du dirigeant *" help="Nom complet du gérant ou PDG. Utilisé dans le rapport d'analyse.">
              <input className={inputCls} value={form.nom_dirigeant} onChange={e => set('nom_dirigeant', e.target.value)} placeholder="Ex: M. DIALLO Amadou" />
            </Field>
            <Field label="Âge du dirigeant" help="Âge actuel du dirigeant. Indicateur de maturité et de profil de risque." unit="ans">
              <input type="number" className={numCls} value={form.age_dirigeant || ''} onChange={e => set('age_dirigeant', parseInt(e.target.value) || undefined)} min={18} max={80} placeholder="Ex: 45" />
            </Field>
            <Field label="Fonction" help="Titre officiel du dirigeant au sein de l'entreprise.">
              <input className={inputCls} value={form.fonction_dirigeant || ''} onChange={e => set('fonction_dirigeant', e.target.value)} placeholder="Ex: Gérant, PDG, DG" />
            </Field>
            <Field label="Expérience dans le secteur" help="Nombre d'années d'expérience du dirigeant dans le secteur d'activité de l'entreprise. Indicateur de maîtrise sectorielle." unit="ans">
              <input type="number" className={numCls} value={form.experience_secteur_ans} onChange={e => set('experience_secteur_ans', parseFloat(e.target.value) || 0)} min={0} step={0.5} />
            </Field>
            <Field label="Ancienneté à la tête de l'entreprise" help="Nombre d'années depuis que le dirigeant actuel dirige l'entreprise." unit="ans">
              <input type="number" className={numCls} value={form.anciennete_direction_ans} onChange={e => set('anciennete_direction_ans', parseFloat(e.target.value) || 0)} min={0} step={0.5} />
            </Field>
            <Field label="Niveau de formation" help="Dernier diplôme ou niveau d'étude atteint par le dirigeant.">
              <select className={inputCls} value={form.niveau_formation || ''} onChange={e => set('niveau_formation', e.target.value)}>
                <option value="">— Sélectionner —</option>
                {['Primaire', 'Secondaire', 'BTS/DUT', 'Licence', 'Master', 'Doctorat', 'Formation professionnelle'].map(n => <option key={n} value={n}>{n}</option>)}
              </select>
            </Field>
            <Field label="Structure de l'actionnariat" help="Répartition du capital entre actionnaires. Ex: familial à 100%, ou avec investisseur externe à 30%.">
              <input className={inputCls} value={form.structure_actionnariat || ''} onChange={e => set('structure_actionnariat', e.target.value)} placeholder="Ex: Familial 100%, Investisseur externe 30%" />
            </Field>
            <Field label="Équipe de gestion structurée" help="L'entreprise dispose-t-elle d'une équipe formalisée (directeur financier, commercial, technique) au-delà du seul dirigeant ? Bonus dans le scoring.">
              <div className="flex items-center gap-3">
                <Toggle value={form.equipe_structuree} onChange={v => set('equipe_structuree', v)} />
                <span className="text-sm text-white/80">{form.equipe_structuree ? 'Oui' : 'Non'}</span>
              </div>
            </Field>
            <Field label="Gouvernance formelle" help="L'entreprise tient-elle des PV de réunions, dispose-t-elle d'un conseil d'administration ou d'un comité de direction ? Indicateur de maturité organisationnelle.">
              <div className="flex items-center gap-3">
                <Toggle value={form.gouvernance_formelle} onChange={v => set('gouvernance_formelle', v)} />
                <span className="text-sm text-white/80">{form.gouvernance_formelle ? 'Oui' : 'Non'}</span>
              </div>
            </Field>
          </div>
        </div>
      )}

      {/* Step C — Activité */}
      {activeStep === 2 && (
        <div className="rounded-2xl p-6" style={{ background: '#0A1434', borderTop: '2px solid rgba(5,150,105,0.25)', borderRight: '2px solid rgba(5,150,105,0.25)', borderBottom: '2px solid rgba(5,150,105,0.25)', borderLeft: '4px solid #059669', boxShadow: '0 0 20px rgba(5,150,105,0.06)' }}>
          <StepHeader step="C" label="Description de l'activité" icon="📈" accent="#059669" />
          <div className="grid grid-cols-1 gap-5">
            <Field label="Description de l'activité" help="Description claire de ce que fait l'entreprise : nature des produits/services, processus de production ou de distribution, modèle économique.">
              <textarea className={`${inputCls} min-h-[80px] resize-none`} value={form.description_activite || ''} onChange={e => set('description_activite', e.target.value)} placeholder="Ex: Importation et distribution de matériaux de construction en Afrique de l'Ouest..." />
            </Field>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <Field label="Produits / Services principaux" help="Liste des 3-5 produits ou services qui représentent l'essentiel du chiffre d'affaires.">
                <textarea className={`${inputCls} min-h-[70px] resize-none`} value={form.produits_services || ''} onChange={e => set('produits_services', e.target.value)} placeholder="Ex: Ciment, fer à béton, peinture industrielle" />
              </Field>
              <Field label="Principaux clients" help="Noms ou catégories des principaux clients (publics, privés, particuliers). Important pour évaluer la stabilité des revenus.">
                <textarea className={`${inputCls} min-h-[70px] resize-none`} value={form.principaux_clients || ''} onChange={e => set('principaux_clients', e.target.value)} placeholder="Ex: Marchés publics, promoteurs immobiliers privés" />
              </Field>
              <Field label="Principaux fournisseurs" help="Noms ou pays des principaux fournisseurs. Permet d'évaluer la dépendance et le risque d'approvisionnement.">
                <textarea className={`${inputCls} min-h-[70px] resize-none`} value={form.principaux_fournisseurs || ''} onChange={e => set('principaux_fournisseurs', e.target.value)} placeholder="Ex: Cimenteries locales, fournisseurs Chine" />
              </Field>
              <Field label="Saisonnalité" help="L'activité est-elle soumise à des variations saisonnières importantes ? Si oui, décrire les périodes de haute et basse saison.">
                <input className={inputCls} value={form.saisonnalite || ''} onChange={e => set('saisonnalite', e.target.value)} placeholder="Ex: Pic en saison sèche (nov-mai), creux hivernage" />
              </Field>
              <Field label="Dépendance à un client majeur" help="L'entreprise dépend-elle d'un seul client pour plus de 30% de son CA ? Facteur de risque important en cas de perte du client.">
                <div className="flex items-center gap-3">
                  <Toggle value={form.dependance_client_majeur} onChange={v => set('dependance_client_majeur', v)} />
                  <span className="text-sm text-white/80">{form.dependance_client_majeur ? 'Oui' : 'Non'}</span>
                </div>
              </Field>
              {form.dependance_client_majeur && (
                <Field label="Part du plus gros client" help="Pourcentage du CA réalisé avec le client le plus important. Seuil de risque généralement fixé à 60-80% selon la politique." unit="%">
                  <input type="number" className={numCls} value={form.part_plus_gros_client_pct || ''} onChange={e => set('part_plus_gros_client_pct', parseFloat(e.target.value) || undefined)} min={0} max={100} placeholder="Ex: 65" />
                </Field>
              )}
              <Field label="Dépendance à un fournisseur majeur" help="L'entreprise dépend-elle d'un seul fournisseur pour plus de 40% de ses achats ? Risque supply chain en cas de rupture.">
                <div className="flex items-center gap-3">
                  <Toggle value={form.dependance_fournisseur_majeur} onChange={v => set('dependance_fournisseur_majeur', v)} />
                  <span className="text-sm text-white/80">{form.dependance_fournisseur_majeur ? 'Oui' : 'Non'}</span>
                </div>
              </Field>
              {form.dependance_fournisseur_majeur && (
                <Field label="Part du plus gros fournisseur" help="Pourcentage des achats réalisés auprès du fournisseur principal." unit="%">
                  <input type="number" className={numCls} value={form.part_plus_gros_fournisseur_pct || ''} onChange={e => set('part_plus_gros_fournisseur_pct', parseFloat(e.target.value) || undefined)} min={0} max={100} placeholder="Ex: 55" />
                </Field>
              )}
              <Field label="Perspectives de croissance" help="Vision du dirigeant sur les perspectives d'évolution du marché et de l'entreprise à 2-3 ans.">
                <input className={inputCls} value={form.perspectives_croissance || ''} onChange={e => set('perspectives_croissance', e.target.value)} placeholder="Ex: Diversification vers l'Afrique centrale, nouveau produit..." />
              </Field>
            </div>
          </div>
        </div>
      )}

      {/* Step D — Données financières */}
      {activeStep === 3 && (
        <div className="rounded-2xl p-6" style={{ background: '#0A1434', borderTop: '2px solid rgba(201,168,76,0.25)', borderRight: '2px solid rgba(201,168,76,0.25)', borderBottom: '2px solid rgba(201,168,76,0.25)', borderLeft: '4px solid #C9A84C', boxShadow: '0 0 20px rgba(201,168,76,0.06)' }}>
          <StepHeader step="D" label="Données financières" icon="💰" accent="#C9A84C" />
          <p className="text-sm text-white/55 mb-5">Renseignez les données financières sur 2 à 3 exercices. Plus les données sont complètes, plus l'analyse sera précise.</p>
          <div className="space-y-6">
            {form.donnees_financieres.map((yr, idx) => (
              <div key={idx} className="rounded-2xl p-5" style={{ background: '#040B1E', border: '1px solid rgba(201,168,76,0.2)' }}>
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-base font-bold text-white">Exercice {yr.year}</h4>
                  <div className="flex gap-2">
                    <button type="button" onClick={() => {
                      const newYear = Math.min(...form.donnees_financieres.map(y => y.year)) - 1;
                      if (form.donnees_financieres.length < 5) set('donnees_financieres', [...form.donnees_financieres, emptyFinYear(newYear)]);
                    }} className="text-xs px-2 py-1 rounded-lg transition-all" style={{ background: 'rgba(201,168,76,0.15)', color: '#C9A84C' }}>
                      + Ajouter N-{form.donnees_financieres.length}
                    </button>
                    {form.donnees_financieres.length > 1 && (
                      <button type="button" onClick={() => set('donnees_financieres', form.donnees_financieres.filter((_, i) => i !== idx))}
                        className="text-xs px-2 py-1 bg-red-500/20 text-red-300 rounded-lg hover:bg-red-500/30 transition-all">Retirer</button>
                    )}
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <Field label="Chiffre d'affaires" help="Total des ventes / prestations de services hors taxes." unit={currency}>
                    <input type="number" className={numCls} value={yr.ca ?? ''} onChange={e => setFinYear(idx, 'ca', e.target.value ? parseFloat(e.target.value) : null)} placeholder="0" />
                  </Field>
                  <Field label="Résultat net" help="Bénéfice ou perte nette après impôts. Peut être négatif." unit={currency}>
                    <input type="number" className={numCls} value={yr.resultat_net ?? ''} onChange={e => setFinYear(idx, 'resultat_net', e.target.value ? parseFloat(e.target.value) : null)} placeholder="0" />
                  </Field>
                  <Field label="EBITDA / EBE" help="Excédent Brut d'Exploitation = résultat avant intérêts, impôts et amortissements. Principal indicateur de la capacité à générer du cash." unit={currency}>
                    <input type="number" className={numCls} value={yr.ebitda ?? ''} onChange={e => setFinYear(idx, 'ebitda', e.target.value ? parseFloat(e.target.value) : null)} placeholder="0" />
                  </Field>
                  <Field label="Fonds propres / Capitaux propres" help="Total des ressources propres de l'entreprise (capital + réserves + résultat). Représente la solidité du bilan." unit={currency}>
                    <input type="number" className={numCls} value={yr.fonds_propres ?? ''} onChange={e => setFinYear(idx, 'fonds_propres', e.target.value ? parseFloat(e.target.value) : null)} placeholder="0" />
                  </Field>
                  <Field label="Endettement total" help="Total des dettes financières (court, moyen et long terme). Utilisé pour calculer le ratio D/E et le niveau d'endettement." unit={currency}>
                    <input type="number" className={numCls} value={yr.endettement_total ?? ''} onChange={e => setFinYear(idx, 'endettement_total', e.target.value ? parseFloat(e.target.value) : null)} placeholder="0" />
                  </Field>
                  <Field label="Trésorerie" help="Liquidités disponibles (caisse + comptes bancaires). Peut être négative si découverts bancaires. Indicateur de liquidité immédiate." unit={currency}>
                    <input type="number" className={numCls} value={yr.tresorerie ?? ''} onChange={e => setFinYear(idx, 'tresorerie', e.target.value ? parseFloat(e.target.value) : null)} placeholder="0" />
                  </Field>
                  <Field label="BFR" help="Besoin en Fonds de Roulement = stocks + créances clients - dettes fournisseurs. Mesure le besoin de financement du cycle d'exploitation." unit={currency}>
                    <input type="number" className={numCls} value={yr.bfr ?? ''} onChange={e => setFinYear(idx, 'bfr', e.target.value ? parseFloat(e.target.value) : null)} placeholder="0" />
                  </Field>
                  <Field label="Charges financières" help="Total des intérêts payés sur les emprunts en cours. Utilisé pour calculer la couverture des intérêts." unit={currency}>
                    <input type="number" className={numCls} value={yr.charges_financieres ?? ''} onChange={e => setFinYear(idx, 'charges_financieres', e.target.value ? parseFloat(e.target.value) : null)} placeholder="0" />
                  </Field>
                </div>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mt-5">
            <Field label="Annuités existantes (annuelles)" help="Total des remboursements annuels de crédits déjà en cours (capital + intérêts). Intégré dans le calcul du DSCR." unit={currency}>
              <input type="number" className={numCls} value={form.annuites_existantes_annuelles ?? ''} onChange={e => set('annuites_existantes_annuelles', e.target.value ? parseFloat(e.target.value) : undefined)} placeholder="0" />
            </Field>
            <Field label="Capacité de remboursement estimée" help="Si vous disposez d'une estimation interne de la CAF (Capacité d'Autofinancement). Laissez vide pour que le moteur la calcule automatiquement." unit={currency}>
              <input type="number" className={numCls} value={form.capacite_remboursement_estimee ?? ''} onChange={e => set('capacite_remboursement_estimee', e.target.value ? parseFloat(e.target.value) : undefined)} placeholder="Calculé automatiquement" />
            </Field>
          </div>
        </div>
      )}

      {/* Step E — Crédit demandé */}
      {activeStep === 4 && (
        <div className="rounded-2xl p-6" style={{ background: '#0A1434', borderTop: '2px solid rgba(27,58,140,0.35)', borderRight: '2px solid rgba(27,58,140,0.35)', borderBottom: '2px solid rgba(27,58,140,0.35)', borderLeft: '4px solid #1B3A8C', boxShadow: '0 0 20px rgba(27,58,140,0.08)' }}>
          <StepHeader step="E" label="Crédit demandé" icon="💳" accent="#1B3A8C" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <Field label="Montant demandé *" help="Montant total du crédit souhaité. Base de calcul de la mensualité, du DSCR et de la couverture garantie." unit={currency}>
              <input type="number" className={numCls} value={form.montant_demande || ''} onChange={e => set('montant_demande', parseFloat(e.target.value) || 0)} min={0} placeholder="Ex: 50 000 000" />
            </Field>
            <Field label="Devise" help="Devise dans laquelle le crédit est demandé. Doit être cohérente avec la politique de l'établissement.">
              <input className={inputCls} value={form.devise} onChange={e => set('devise', e.target.value)} placeholder="Ex: XOF, EUR, MAD" />
            </Field>
            <Field label="Objet du crédit *" help="Description précise de l'utilisation des fonds. Plus c'est précis, plus l'analyse est fiable.">
              <input className={inputCls} value={form.objet_credit} onChange={e => set('objet_credit', e.target.value)} placeholder="Ex: Acquisition d'un entrepôt de stockage, financement de stocks..." />
            </Field>
            <Field label="Type de crédit *" help="Nature du financement : investissement (actifs durables), trésorerie (besoins courants), ligne de fonctionnement (découvert autorisé).">
              <select className={inputCls} value={form.type_credit} onChange={e => set('type_credit', e.target.value as any)}>
                <option value="INVESTISSEMENT">Investissement</option>
                <option value="TRESORERIE">Trésorerie</option>
                <option value="LIGNE_FONCTIONNEMENT">Ligne de fonctionnement</option>
                <option value="AUTRE">Autre</option>
              </select>
            </Field>
            <Field label="Durée souhaitée *" help="Durée de remboursement exprimée en mois. Influence directement la mensualité et le DSCR." unit="mois">
              <input type="number" className={numCls} value={form.duree_mois} onChange={e => set('duree_mois', parseInt(e.target.value) || 12)} min={1} max={300} />
            </Field>
            <Field label="Périodicité de remboursement" help="Fréquence des échéances : mensuelle, trimestrielle, semestrielle, annuelle ou in fine (capital à l'échéance).">
              <select className={inputCls} value={form.periodicite} onChange={e => set('periodicite', e.target.value as any)}>
                <option value="MENSUELLE">Mensuelle</option>
                <option value="TRIMESTRIELLE">Trimestrielle</option>
                <option value="SEMESTRIELLE">Semestrielle</option>
                <option value="ANNUELLE">Annuelle</option>
                <option value="IN_FINE">In fine</option>
              </select>
            </Field>
            <Field label="Taux annuel souhaité" help="Taux d'intérêt annuel demandé. Si non renseigné, le taux par défaut de la politique sera appliqué." unit="%" >
              <input type="number" className={numCls} value={form.taux_annuel_pct ?? ''} onChange={e => set('taux_annuel_pct', e.target.value ? parseFloat(e.target.value) : undefined)} min={0} max={50} step={0.1} placeholder="Ex: 10.5" />
            </Field>
            <Field label="Période de grâce" help="Nombre de mois sans remboursement du capital (intérêts seulement). Utile pour les projets d'investissement à démarrage différé." unit="mois">
              <input type="number" className={numCls} value={form.periode_grace_mois} onChange={e => set('periode_grace_mois', parseInt(e.target.value) || 0)} min={0} />
            </Field>
            <Field label="Apport personnel" help="Montant que l'entreprise apporte sur ses fonds propres. Un apport réduit le risque pour l'établissement et améliore le profil de crédit." unit={currency}>
              <input type="number" className={numCls} value={form.apport_personnel ?? ''} onChange={e => set('apport_personnel', e.target.value ? parseFloat(e.target.value) : undefined)} min={0} placeholder="0" />
            </Field>
            <Field label="Source principale de remboursement *" help="D'où proviendront les fonds pour rembourser le crédit ? Généralement le cash-flow d'exploitation pour un crédit PME.">
              <input className={inputCls} value={form.source_remboursement} onChange={e => set('source_remboursement', e.target.value)} placeholder="Ex: cash-flow exploitation, revenus locatifs, subvention..." />
            </Field>
            <Field label="Urgence" help="Délai dans lequel les fonds sont nécessaires. Cela n'affecte pas la décision mais informe le chargé de dossier.">
              <select className={inputCls} value={form.urgence || 'NORMALE'} onChange={e => set('urgence', e.target.value as any)}>
                <option value="FAIBLE">Faible — pas urgent</option>
                <option value="NORMALE">Normale — délai standard</option>
                <option value="HAUTE">Haute — urgent</option>
              </select>
            </Field>
          </div>
        </div>
      )}

      {/* Step F — Garanties */}
      {activeStep === 5 && (
        <div className="rounded-2xl p-6" style={{ background: '#0A1434', borderTop: '2px solid rgba(217,119,6,0.25)', borderRight: '2px solid rgba(217,119,6,0.25)', borderBottom: '2px solid rgba(217,119,6,0.25)', borderLeft: '4px solid #D97706', boxShadow: '0 0 20px rgba(217,119,6,0.06)' }}>
          <StepHeader step="F" label="Garanties" icon="🔒" accent="#D97706" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <Field label="Garanties prévues" help="L'entreprise propose-t-elle des garanties (réelles ou personnelles) pour couvrir le risque de défaut ?">
              <div className="flex items-center gap-3">
                <Toggle value={form.garanties_prevues} onChange={v => set('garanties_prevues', v)} />
                <span className="text-sm text-white/80">{form.garanties_prevues ? 'Oui' : 'Non'}</span>
              </div>
            </Field>
            {form.garanties_prevues && (
              <>
                <Field label="Type de garantie" help="Nature de la garantie : hypothèque (bien immobilier), nantissement (équipement, fonds de commerce), caution personnelle du dirigeant, gage sur matériel.">
                  <select className={inputCls} value={form.type_garantie || ''} onChange={e => set('type_garantie', e.target.value)}>
                    <option value="">— Sélectionner —</option>
                    {['HYPOTHEQUE', 'NANTISSEMENT', 'CAUTION_PERSO', 'GAGE_MATERIEL', 'DEPOT_GARANTIE', 'AUTRE'].map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </Field>
                <Field label="Description de la garantie" help="Description détaillée du bien ou actif offert en garantie. Incluez l'adresse pour l'immobilier, la marque/modèle pour le matériel.">
                  <textarea className={`${inputCls} min-h-[70px] resize-none`} value={form.description_garantie || ''} onChange={e => set('description_garantie', e.target.value)} placeholder="Ex: Local commercial 150m², quartier Plateau, Niamey..." />
                </Field>
                <Field label="Valeur estimée" help="Valeur vénale estimée de la garantie (expertise ou valeur de marché). Avant application du haircut." unit={currency}>
                  <input type="number" className={numCls} value={form.valeur_estimee_garantie ?? ''} onChange={e => set('valeur_estimee_garantie', e.target.value ? parseFloat(e.target.value) : undefined)} min={0} placeholder="0" />
                </Field>
                <Field label="Valeur retenue" help="Valeur acceptée par l'établissement (après négociation). Avant application du haircut de la politique." unit={currency}>
                  <input type="number" className={numCls} value={form.valeur_retenue_garantie ?? ''} onChange={e => set('valeur_retenue_garantie', e.target.value ? parseFloat(e.target.value) : undefined)} min={0} placeholder="0" />
                </Field>
                <Field label="Propriétaire de la garantie" help="Nom du propriétaire légal du bien offert en garantie (peut être le dirigeant, un associé, ou l'entreprise elle-même).">
                  <input className={inputCls} value={form.proprietaire_garantie || ''} onChange={e => set('proprietaire_garantie', e.target.value)} placeholder="Ex: M. DIALLO Amadou (personnel)" />
                </Field>
                <Field label="Libre de charges" help="La garantie est-elle libre de tout nantissement, hypothèque ou gage préexistant ? Une garantie déjà grevée a une valeur nette réduite.">
                  <select className={inputCls} value={form.garantie_libre_de_charges === true ? 'true' : form.garantie_libre_de_charges === false ? 'false' : ''}
                    onChange={e => set('garantie_libre_de_charges', e.target.value === 'true' ? true : e.target.value === 'false' ? false : undefined)}>
                    <option value="">— Non renseigné —</option>
                    <option value="true">Oui — libre de charges</option>
                    <option value="false">Non — déjà grevée</option>
                  </select>
                </Field>
                <Field label="Documents de garantie disponibles" help="Les documents justificatifs sont-ils disponibles (titre de propriété, acte de nantissement, etc.) ?">
                  <select className={inputCls} value={form.documents_garantie_disponibles === true ? 'true' : form.documents_garantie_disponibles === false ? 'false' : ''}
                    onChange={e => set('documents_garantie_disponibles', e.target.value === 'true' ? true : e.target.value === 'false' ? false : undefined)}>
                    <option value="">— Non renseigné —</option>
                    <option value="true">Oui — documents disponibles</option>
                    <option value="false">Non — à rassembler</option>
                  </select>
                </Field>
              </>
            )}
          </div>
        </div>
      )}

      {/* Step G — Bancarisation */}
      {activeStep === 6 && (
        <div className="rounded-2xl p-6" style={{ background: '#0A1434', borderTop: '2px solid rgba(5,150,105,0.25)', borderRight: '2px solid rgba(5,150,105,0.25)', borderBottom: '2px solid rgba(5,150,105,0.25)', borderLeft: '4px solid #059669', boxShadow: '0 0 20px rgba(5,150,105,0.06)' }}>
          <StepHeader step="G" label="Bancarisation et historique bancaire" icon="🏦" accent="#059669" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <Field label="Client existant" help="L'entreprise est-elle déjà cliente de l'établissement ? Un client existant bénéficie d'un bonus dans le scoring (historique connu).">
              <div className="flex items-center gap-3">
                <Toggle value={form.client_existant} onChange={v => set('client_existant', v)} />
                <span className="text-sm text-white/80">{form.client_existant ? 'Oui' : 'Non'}</span>
              </div>
            </Field>
            <Field label="Ancienneté de la relation bancaire" help="Durée en mois depuis l'ouverture du premier compte dans l'établissement. Indicateur de confiance et de fidélité." unit="mois">
              <input type="number" className={numCls} value={form.anciennete_relation_bancaire_mois} onChange={e => set('anciennete_relation_bancaire_mois', parseInt(e.target.value) || 0)} min={0} />
            </Field>
            <Field label="Flux domiciliés" help="Les flux opérationnels de l'entreprise (paiements clients, salaires, fournisseurs) sont-ils principalement gérés via cet établissement ?">
              <select className={inputCls} value={form.flux_domicilies === true ? 'true' : form.flux_domicilies === false ? 'false' : ''}
                onChange={e => set('flux_domicilies', e.target.value === 'true' ? true : e.target.value === 'false' ? false : undefined)}>
                <option value="">— Non renseigné —</option>
                <option value="true">Oui — flux domiciliés</option>
                <option value="false">Non — autres banques</option>
              </select>
            </Field>
            <Field label="Volume moyen des flux mensuels" help="Montant moyen des mouvements sur le compte principal de l'entreprise par mois." unit={currency}>
              <input type="number" className={numCls} value={form.volume_flux_mensuels ?? ''} onChange={e => set('volume_flux_mensuels', e.target.value ? parseFloat(e.target.value) : undefined)} min={0} placeholder="0" />
            </Field>
            <Field label="Niveau d'incidents bancaires" help="0 = aucun incident, 1 = incident mineur (retard ponctuel), 2 = incidents modérés (chèques rejetés), 3 = incidents graves (impayés répétés). Facteur de risque important." unit="0-3">
              <select className={inputCls} value={form.niveau_incidents_bancaires} onChange={e => set('niveau_incidents_bancaires', parseInt(e.target.value))}>
                <option value={0}>0 — Aucun incident</option>
                <option value={1}>1 — Incident mineur</option>
                <option value={2}>2 — Incidents modérés</option>
                <option value={3}>3 — Incidents graves</option>
              </select>
            </Field>
            <Field label="Comportement de remboursement" help="Si l'entreprise a des crédits en cours ou passés, comment a-t-elle honoré ses engagements ? BON = sans retard, MOYEN = retards ponctuels, MAUVAIS = retards fréquents.">
              <select className={inputCls} value={form.comportement_remboursement || ''}
                onChange={e => set('comportement_remboursement', e.target.value as any || undefined)}>
                <option value="">— Non renseigné —</option>
                <option value="BON">BON — remboursement ponctuel</option>
                <option value="MOYEN">MOYEN — quelques retards</option>
                <option value="MAUVAIS">MAUVAIS — retards fréquents</option>
              </select>
            </Field>
            <Field label="Nombre de banques partenaires" help="Nombre total d'établissements bancaires avec lesquels l'entreprise a des comptes actifs." unit="banques">
              <input type="number" className={numCls} value={form.nombre_banques} onChange={e => set('nombre_banques', parseInt(e.target.value) || 1)} min={0} />
            </Field>
            <Field label="Comptes dans d'autres banques" help="L'entreprise dispose-t-elle de comptes actifs dans d'autres établissements ? Cela peut indiquer une dispersion des flux.">
              <div className="flex items-center gap-3">
                <Toggle value={form.comptes_autres_banques} onChange={v => set('comptes_autres_banques', v)} />
                <span className="text-sm text-white/80">{form.comptes_autres_banques ? 'Oui' : 'Non'}</span>
              </div>
            </Field>
            <div className="sm:col-span-2">
              <Field label="Historique des crédits précédents" help="Brève description des crédits précédemment obtenus (type, montant, établissement, situation actuelle). Permet d'évaluer l'expérience de financement.">
                <textarea className={`${inputCls} min-h-[70px] resize-none`} value={form.historique_credits_precedents || ''} onChange={e => set('historique_credits_precedents', e.target.value)} placeholder="Ex: Crédit d'équipement de 10M XOF en 2021, soldé en 2023" />
              </Field>
            </div>
          </div>
        </div>
      )}

      {/* Step H — Documents */}
      {activeStep === 7 && (
        <div className="rounded-2xl p-6" style={{ background: '#0A1434', borderTop: '2px solid rgba(124,58,237,0.25)', borderRight: '2px solid rgba(124,58,237,0.25)', borderBottom: '2px solid rgba(124,58,237,0.25)', borderLeft: '4px solid #7C3AED', boxShadow: '0 0 20px rgba(124,58,237,0.06)' }}>
          <StepHeader step="H" label="Pièces justificatives" icon="📄" accent="#7C3AED" />
          <p className="text-sm text-white/55 mb-5">Cochez les documents disponibles. Les documents marqués comme <span className="text-red-400 font-semibold">bloquants</span> sont requis pour traiter le dossier.</p>
          <div className="space-y-2">
            {form.documents.map((doc, idx) => (
              <div key={doc.code} className="flex items-center gap-4 p-4 rounded-xl"
                style={doc.bloquant
                  ? { borderTop: '1px solid rgba(239,68,68,0.3)', borderRight: '1px solid rgba(239,68,68,0.3)', borderBottom: '1px solid rgba(239,68,68,0.3)', borderLeft: '3px solid #EF4444', background: 'rgba(239,68,68,0.06)' }
                  : doc.obligatoire
                  ? { borderTop: '1px solid rgba(217,119,6,0.25)', borderRight: '1px solid rgba(217,119,6,0.25)', borderBottom: '1px solid rgba(217,119,6,0.25)', borderLeft: '3px solid #D97706', background: 'rgba(217,119,6,0.06)' }
                  : { borderTop: '1px solid rgba(27,58,140,0.2)', borderRight: '1px solid rgba(27,58,140,0.2)', borderBottom: '1px solid rgba(27,58,140,0.2)', borderLeft: '1px solid rgba(27,58,140,0.2)', background: '#040B1E' }}>
                <input type="checkbox" checked={doc.fourni} onChange={e => setDoc(idx, 'fourni', e.target.checked)}
                  className="w-4 h-4 accent-[#C9A84C] cursor-pointer flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold text-white">{doc.label}</span>
                    {doc.bloquant && <span className="text-xs font-bold text-red-400 bg-red-500/15 px-2 py-0.5 rounded-full">Bloquant</span>}
                    {doc.obligatoire && !doc.bloquant && <span className="text-xs font-bold text-amber-400 bg-amber-500/15 px-2 py-0.5 rounded-full">Obligatoire</span>}
                  </div>
                  <p className="text-xs text-white/40 mt-0.5">
                    {doc.bloquant ? 'Document clé — son absence bloque automatiquement l\'analyse' :
                      doc.obligatoire ? 'Document requis — son absence pénalise le score' :
                      'Document optionnel — améliore la complétude du dossier'}
                  </p>
                </div>
                <input className="w-48 px-2 py-1 rounded-lg text-xs text-white/80 focus:outline-none" style={{ background: '#040B1E', border: '1px solid rgba(27,58,140,0.35)' }}
                  value={doc.commentaire} onChange={e => setDoc(idx, 'commentaire', e.target.value)} placeholder="Commentaire..." />
              </div>
            ))}
          </div>
          <p className="text-xs text-white/40 mt-3">
            {form.documents.filter(d => d.fourni).length} / {form.documents.length} documents fournis
            {' · '}
            {form.documents.filter(d => d.obligatoire && !d.fourni).length > 0 && (
              <span className="text-amber-400">{form.documents.filter(d => d.obligatoire && !d.fourni).length} obligatoire(s) manquant(s)</span>
            )}
          </p>
        </div>
      )}

      {/* Navigation + Submit */}
      <div className="flex items-center justify-between pt-4" style={{ borderTop: '1px solid rgba(27,58,140,0.25)' }}>
        <button type="button" disabled={activeStep === 0} onClick={() => setActiveStep(s => s - 1)}
          className="px-5 py-2.5 rounded-xl text-white/70 text-sm font-semibold transition-all disabled:opacity-30" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}>
          ← Précédent
        </button>
        {activeStep < steps.length - 1 ? (
          <button type="button" onClick={() => setActiveStep(s => s + 1)}
            className="px-5 py-2.5 rounded-xl text-white/70 text-sm font-semibold transition-all" style={{ background: 'rgba(27,58,140,0.15)', border: '1px solid rgba(27,58,140,0.4)' }}>
            Suivant →
          </button>
        ) : (
          <button type="button" onClick={handleSubmit} disabled={loading || !form.raison_sociale || !form.montant_demande}
            className="px-7 py-3 text-white font-bold rounded-xl hover:opacity-90 transition-all disabled:opacity-50 flex items-center gap-2"
            style={{ background: 'linear-gradient(135deg, #1B3A8C 0%, #2e5bb8 50%, #C9A84C 100%)', boxShadow: '0 4px 20px rgba(27,58,140,0.35)' }}>
            {loading ? (
              <><svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>Analyse en cours...</>
            ) : '🚀 Lancer l\'analyse'}
          </button>
        )}
      </div>

      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm">{error}</div>
      )}

      {/* ── RÉSULTAT ── */}
      {result && decCfg && (
        <div id="pme-result" className="space-y-5 pt-4">
          <div className={`rounded-2xl border ${decCfg.border} bg-gradient-to-br ${decCfg.bg} p-6`}>
            <div className="flex flex-col sm:flex-row items-start gap-4">
              <div className={`flex items-center gap-2 px-5 py-2.5 rounded-full border ${decCfg.badge} flex-shrink-0`}>
                <span>{decCfg.icon}</span>
                <span className={`font-black tracking-widest text-sm ${decCfg.text}`}>{decCfg.label}</span>
              </div>
              <div>
                <p className="text-white/80 leading-relaxed">{result.main_reason}</p>
                <p className="text-xs text-white/40 mt-1">Stratégie : {result.strategy} · Config v{result.config_version} · {result.currency}</p>
              </div>
            </div>
          </div>

          {/* Bloc 2 — Indicateurs calculés */}
          {result.indicators && (() => {
            const ind = result.indicators;
            const kpis = [
              { label: 'Ancienneté', value: `${(ind.company_age_years ?? 0).toFixed(0)} ans`, color: 'text-white' },
              { label: 'CA N', value: ind.ca_n != null ? ind.ca_n.toLocaleString('fr-FR') + ' ' + currency : '—', color: ind.ca_n != null ? 'text-emerald-300' : 'text-white/30' },
              { label: 'Croissance CA', value: ind.ca_growth_pct != null ? `${ind.ca_growth_pct > 0 ? '+' : ''}${ind.ca_growth_pct.toFixed(1)}%` : '—', color: ind.ca_growth_pct != null ? (ind.ca_growth_pct >= 0 ? 'text-emerald-300' : 'text-red-300') : 'text-white/30' },
              { label: 'Résultat net N', value: ind.resultat_net_n != null ? ind.resultat_net_n.toLocaleString('fr-FR') + ' ' + currency : '—', color: ind.resultat_net_n != null ? (ind.resultat_net_n >= 0 ? 'text-emerald-300' : 'text-red-300') : 'text-white/30' },
              { label: 'EBITDA N', value: ind.ebitda_n != null ? ind.ebitda_n.toLocaleString('fr-FR') + ' ' + currency : '—', color: ind.ebitda_n != null ? 'text-blue-300' : 'text-white/30' },
              { label: 'Marge EBITDA', value: ind.ebitda_margin_pct != null ? `${ind.ebitda_margin_pct.toFixed(1)}%` : '—', color: ind.ebitda_margin_pct != null ? 'text-blue-300' : 'text-white/30' },
              { label: 'Fonds propres', value: ind.fonds_propres_n != null ? ind.fonds_propres_n.toLocaleString('fr-FR') + ' ' + currency : '—', color: ind.fonds_propres_n != null ? (ind.fonds_propres_n > 0 ? 'text-emerald-300' : 'text-red-300') : 'text-white/30' },
              { label: 'Endettement', value: ind.endettement_n != null ? ind.endettement_n.toLocaleString('fr-FR') + ' ' + currency : '—', color: ind.endettement_n != null ? 'text-amber-300' : 'text-white/30' },
              { label: 'DSCR', value: ind.dscr != null ? ind.dscr.toFixed(2) + 'x' : '—', color: ind.dscr != null ? (ind.dscr >= 1.2 ? 'text-emerald-300' : ind.dscr >= 1.0 ? 'text-amber-300' : 'text-red-300') : 'text-white/30' },
              { label: 'D/E ratio', value: ind.debt_equity_ratio != null ? ind.debt_equity_ratio.toFixed(2) + 'x' : '—', color: ind.debt_equity_ratio != null ? (ind.debt_equity_ratio <= 2 ? 'text-emerald-300' : ind.debt_equity_ratio <= 3 ? 'text-amber-300' : 'text-red-300') : 'text-white/30' },
              { label: 'Mensualité', value: ind.nouvelle_mensualite != null ? ind.nouvelle_mensualite.toLocaleString('fr-FR') + ' ' + currency : '—', color: ind.nouvelle_mensualite != null ? 'text-purple-300' : 'text-white/30' },
              { label: 'Trésorerie', value: ind.tresorerie_n != null ? ind.tresorerie_n.toLocaleString('fr-FR') + ' ' + currency : '—', color: ind.tresorerie_n != null ? (ind.tresorerie_n >= 0 ? 'text-emerald-300' : 'text-red-300') : 'text-white/30' },
              { label: 'Couv. trésorerie', value: ind.treasury_coverage_months != null ? `${ind.treasury_coverage_months.toFixed(1)} mois` : '—', color: ind.treasury_coverage_months != null ? 'text-blue-300' : 'text-white/30' },
              { label: 'Cov. garantie', value: ind.guarantee_coverage_pct != null ? ind.guarantee_coverage_pct.toFixed(0) + '%' : '—', color: ind.guarantee_coverage_pct != null ? (ind.guarantee_coverage_pct >= 100 ? 'text-emerald-300' : 'text-amber-300') : 'text-white/30' },
              { label: 'Compl. financière', value: `${(ind.financial_completeness_score ?? 0).toFixed(0)}%`, color: (ind.financial_completeness_score ?? 0) >= 80 ? 'text-emerald-300' : 'text-amber-300' },
              { label: 'Compl. dossier', value: `${(ind.document_completeness_score ?? 0).toFixed(0)}%`, color: (ind.document_completeness_score ?? 0) >= 80 ? 'text-emerald-300' : 'text-amber-300' },
              { label: 'Score gouvernance', value: `${(ind.governance_score ?? 0).toFixed(0)}/100`, color: (ind.governance_score ?? 0) >= 60 ? 'text-emerald-300' : 'text-amber-300' },
              ...(result.credit_score != null ? [{ label: 'Score PME', value: `${result.credit_score.toFixed(0)}/100`, color: 'text-purple-300' }] : []),
            ];
            return (
              <div>
                <p className="text-xs font-bold text-white/40 uppercase tracking-wide mb-3">Indicateurs calculés</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2.5">
                  {kpis.map(kpi => (
                    <div key={kpi.label} className="rounded-xl p-3" style={kpi.color === 'text-white/30' ? { background: '#040B1E', border: '1px solid rgba(27,58,140,0.1)', opacity: 0.5 } : { background: '#040B1E', border: '1px solid rgba(27,58,140,0.3)' }}>
                      <p className="text-[9px] text-white/40 uppercase tracking-wider mb-1">{kpi.label}</p>
                      <p className={`text-sm font-black ${kpi.color}`}>{kpi.value}</p>
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}

          {/* Score gauge */}
          {result.credit_score != null && (
            <div className="rounded-xl p-4" style={{ background: '#040B1E', border: '1px solid rgba(201,168,76,0.3)' }}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-bold text-white">Score PME global</span>
                <span className="text-xl font-black text-[#C9A84C]">{result.credit_score.toFixed(0)}/100</span>
              </div>
              <div className="w-full rounded-full h-3" style={{ background: 'rgba(255,255,255,0.06)' }}>
                <div className="h-3 rounded-full" style={{ width: `${result.credit_score}%`, background: 'linear-gradient(90deg, #1B3A8C, #C9A84C)' }} />
              </div>
            </div>
          )}

          {/* Ratios */}
          {Object.keys(result.ratio_details).length > 0 && (
            <div>
              <p className="text-xs font-bold text-white/40 uppercase tracking-wide mb-3">Ratios financiers</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {Object.values(result.ratio_details).map((r, i) => <RatioGauge key={i} ratio={r} />)}
              </div>
            </div>
          )}

          {/* Points forts / faibles / conditions */}
          {(result.strengths.length > 0 || result.weaknesses.length > 0 || result.conditions.length > 0) && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {result.strengths.length > 0 && (
                <div className="bg-emerald-900/15 rounded-xl p-4 border border-emerald-500/25">
                  <p className="text-xs font-bold text-emerald-400 uppercase tracking-wide mb-2">Points forts</p>
                  <ul className="space-y-1">{result.strengths.map((s, i) => <li key={i} className="text-xs text-white/80 flex gap-2"><span className="text-emerald-400">✓</span>{s}</li>)}</ul>
                </div>
              )}
              {result.weaknesses.length > 0 && (
                <div className="bg-red-900/15 rounded-xl p-4 border border-red-500/25">
                  <p className="text-xs font-bold text-red-400 uppercase tracking-wide mb-2">Points d'attention</p>
                  <ul className="space-y-1">{result.weaknesses.map((w, i) => <li key={i} className="text-xs text-white/80 flex gap-2"><span className="text-red-400">✗</span>{w}</li>)}</ul>
                </div>
              )}
              {result.conditions.length > 0 && (
                <div className="bg-amber-900/15 rounded-xl p-4 border border-amber-500/25">
                  <p className="text-xs font-bold text-amber-400 uppercase tracking-wide mb-2">Conditions requises</p>
                  <ul className="space-y-1">{result.conditions.map((c, i) => <li key={i} className="text-xs text-white/80 flex gap-2"><span className="text-amber-400">→</span>{c}</li>)}</ul>
                </div>
              )}
            </div>
          )}

          {/* Risques identifiés / Documents manquants */}
          {(result.identified_risks.length > 0 || result.missing_documents.length > 0) && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {result.identified_risks.length > 0 && (
                <div className="bg-orange-900/15 rounded-xl p-4 border border-orange-500/25">
                  <p className="text-xs font-bold text-orange-400 uppercase tracking-wide mb-2">Risques identifiés</p>
                  <ul className="space-y-1">{result.identified_risks.map((r, i) => <li key={i} className="text-xs text-white/80 flex gap-2"><span className="text-orange-400">⚡</span>{r}</li>)}</ul>
                </div>
              )}
              {result.missing_documents.length > 0 && (
                <div className="bg-purple-900/15 rounded-xl p-4 border border-purple-500/25">
                  <p className="text-xs font-bold text-purple-400 uppercase tracking-wide mb-2">Documents manquants</p>
                  <ul className="space-y-1">{result.missing_documents.map((d, i) => <li key={i} className="text-xs text-white/80 flex gap-2"><span className="text-purple-400">📎</span>{d}</li>)}</ul>
                </div>
              )}
            </div>
          )}

          {/* Règles déclenchées */}
          {result.triggered_rules.length > 0 && (
            <div>
              <p className="text-xs font-bold text-white/40 uppercase tracking-wide mb-2">Règles déclenchées</p>
              <div className="space-y-2">
                {result.triggered_rules.map((rule: PMETriggeredRule, i) => {
                  const rcStyle = rule.impact === 'BLOQUANT'
                    ? { bg: 'rgba(239,68,68,0.08)', border: 'rgba(239,68,68,0.3)', tag: 'bg-red-500/20 text-red-300' }
                    : rule.impact === 'PENALISANT'
                    ? { bg: 'rgba(217,119,6,0.08)', border: 'rgba(217,119,6,0.3)', tag: 'bg-amber-500/20 text-amber-300' }
                    : { bg: 'rgba(5,150,105,0.08)', border: 'rgba(5,150,105,0.3)', tag: 'bg-emerald-500/20 text-emerald-300' };
                  return (
                    <div key={i} className="flex items-start gap-3 p-3 rounded-lg" style={{ background: rcStyle.bg, border: `1px solid ${rcStyle.border}` }}>
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full flex-shrink-0 ${rcStyle.tag}`}>{rule.impact}</span>
                      <div>
                        <p className="text-xs font-mono text-white/40">{rule.code} · {rule.section}</p>
                        <p className="text-sm text-white/80">{rule.message}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Simulations */}
          {result.simulations.length > 0 && (
            <div>
              <p className="text-xs font-bold text-white/40 uppercase tracking-wide mb-3">Scénarios alternatifs</p>
              <div className="grid grid-cols-1 gap-3">
                {result.simulations.map((sim: PMESimulationScenario) => <SimCard key={sim.id} sim={sim} currency={currency} />)}
              </div>
            </div>
          )}

          {/* Texte IA — Dossier analyste */}
          {(() => {
            const ind = result.indicators;
            const decLbl = result.decision === 'APPROUVE' ? 'FAVORABLE' : result.decision === 'CONDITIONNEL' ? 'CONDITIONNEL' : 'DEFAVORABLE';
            const dateStr = new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });
            const TYPE_LABELS: Record<string, string> = { INVESTISSEMENT: 'Investissement', TRESORERIE: 'Tresorerie', LIGNE_FONCTIONNEMENT: 'Ligne de fonctionnement', AUTRE: 'Autre' };

            const lines: string[] = [
              `AVIS D ANALYSE DE CREDIT PME/PMI — ${dateStr}`,
              '',
              `Objet : Demande de credit ${TYPE_LABELS[form.type_credit] || form.type_credit} — ${form.raison_sociale}`,
              '',
              'I. PRESENTATION DE L ENTREPRISE',
              `La societe ${form.raison_sociale}${form.nom_commercial ? ' (' + form.nom_commercial + ')' : ''}, immatriculee sous la forme juridique ${form.forme_juridique}, a ete creee en ${form.annee_creation} (anciennete : ${(ind?.company_age_years ?? 0).toFixed(0)} ans).${form.secteur ? ' Elle evolue dans le secteur ' + form.secteur + (form.sous_secteur ? ' / ' + form.sous_secteur : '') + '.' : ''}${form.ville ? ' Siege : ' + form.ville + (form.region ? ', ' + form.region : '') + '.' : ''}`,
              `Effectif : ${form.nombre_employes} employe(s). Taille : ${form.taille}.${form.zone_activite ? ' Zone d activite : ' + form.zone_activite + '.' : ''}`,
              `Dirigeant : ${form.nom_dirigeant}${form.age_dirigeant ? ', ' + form.age_dirigeant + ' ans' : ''}${form.fonction_dirigeant ? ', ' + form.fonction_dirigeant : ''}. Experience sectorielle : ${form.experience_secteur_ans} ans. Anciennete direction : ${form.anciennete_direction_ans} ans.${form.equipe_structuree ? ' Equipe de gestion structuree.' : ''}${form.gouvernance_formelle ? ' Gouvernance formelle.' : ''}`,
              '',
              'II. SITUATION FINANCIERE',
              ...(ind ? [
                `Chiffre d affaires N : ${ind.ca_n != null ? ind.ca_n.toLocaleString('fr-FR') + ' ' + currency : 'non renseigne'}${ind.ca_n1 != null ? ' (N-1 : ' + ind.ca_n1.toLocaleString('fr-FR') + ' ' + currency + ')' : ''}.${ind.ca_growth_pct != null ? ' Croissance CA : ' + (ind.ca_growth_pct > 0 ? '+' : '') + ind.ca_growth_pct.toFixed(1) + '%.' : ''}`,
                `Resultat net N : ${ind.resultat_net_n != null ? ind.resultat_net_n.toLocaleString('fr-FR') + ' ' + currency : 'non renseigne'}.${ind.ebitda_n != null ? ' EBITDA N : ' + ind.ebitda_n.toLocaleString('fr-FR') + ' ' + currency + (ind.ebitda_margin_pct != null ? ' (marge : ' + ind.ebitda_margin_pct.toFixed(1) + '%)' : '') + '.' : ''}`,
                `Fonds propres N : ${ind.fonds_propres_n != null ? ind.fonds_propres_n.toLocaleString('fr-FR') + ' ' + currency : 'non renseigne'}. Endettement total N : ${ind.endettement_n != null ? ind.endettement_n.toLocaleString('fr-FR') + ' ' + currency : 'non renseigne'}.${ind.debt_equity_ratio != null ? ' Ratio D/E : ' + ind.debt_equity_ratio.toFixed(2) + 'x.' : ''}`,
                `Tresorerie N : ${ind.tresorerie_n != null ? ind.tresorerie_n.toLocaleString('fr-FR') + ' ' + currency : 'non renseignee'}.${ind.treasury_coverage_months != null ? ' Couverture tresorerie : ' + ind.treasury_coverage_months.toFixed(1) + ' mois de service de dette.' : ''}`,
                `Completude des donnees financieres : ${(ind.financial_completeness_score ?? 0).toFixed(0)}%. Completude documentaire : ${(ind.document_completeness_score ?? 0).toFixed(0)}%. Score gouvernance : ${(ind.governance_score ?? 0).toFixed(0)}/100.`,
              ] : ['Donnees financieres non disponibles.']),
              '',
              'III. DEMANDE DE CREDIT',
              `Montant sollicite : ${form.montant_demande.toLocaleString('fr-FR')} ${currency}. Type : ${TYPE_LABELS[form.type_credit] || form.type_credit}. Duree : ${form.duree_mois} mois. Periodicite : ${form.periodicite.toLowerCase()}.${form.taux_annuel_pct ? ' Taux annuel : ' + form.taux_annuel_pct.toFixed(2) + '%.' : ''}${form.periode_grace_mois > 0 ? ' Periode de grace : ' + form.periode_grace_mois + ' mois.' : ''}`,
              `${form.apport_personnel ? 'Apport personnel : ' + form.apport_personnel.toLocaleString('fr-FR') + ' ' + currency + '. ' : ''}Source de remboursement : ${form.source_remboursement}.`,
              ...(ind?.nouvelle_mensualite != null ? [`Mensualite estimee : ${ind.nouvelle_mensualite.toLocaleString('fr-FR')} ${currency}.${ind.dscr != null ? ' DSCR : ' + ind.dscr.toFixed(2) + 'x.' : ''}`] : []),
              ...(form.garanties_prevues ? [
                `Garanties : ${form.type_garantie || 'type non precise'}. ${form.description_garantie || ''}${form.valeur_estimee_garantie ? ' Valeur estimee : ' + form.valeur_estimee_garantie.toLocaleString('fr-FR') + ' ' + currency + '.' : ''}${form.valeur_retenue_garantie ? ' Valeur retenue : ' + form.valeur_retenue_garantie.toLocaleString('fr-FR') + ' ' + currency + '.' : ''}${ind?.guarantee_coverage_pct != null ? ' Couverture : ' + ind.guarantee_coverage_pct.toFixed(0) + '%.' : ''}`,
              ] : ['Aucune garantie prevue.']),
              '',
              'IV. INDICATEURS DE RISQUE',
              ...Object.values(result.ratio_details || {}).map((rd) => `- ${rd.label} : ${rd.value.toFixed(2)}${rd.unit} (${rd.status === 'FAVORABLE' ? 'favorable' : rd.status === 'CONDITIONNEL' ? 'a surveiller' : rd.status === 'BLOQUANT' ? 'bloquant' : 'non applicable'})`),
              ...(result.credit_score != null ? [`- Score global PME : ${result.credit_score.toFixed(0)}/100`] : []),
              '',
              ...(result.strengths.length > 0 ? ['Points favorables : ' + result.strengths.join(' ; ') + '.'] : []),
              ...(result.weaknesses.length > 0 ? ['Points d attention : ' + result.weaknesses.join(' ; ') + '.'] : []),
              ...(result.identified_risks.length > 0 ? ['Risques identifies : ' + result.identified_risks.join(' ; ') + '.'] : []),
              '',
              'V. BANCARISATION',
              `${form.client_existant ? 'Client existant de l etablissement.' : 'Nouveau client.'} Anciennete relation : ${form.anciennete_relation_bancaire_mois} mois.${form.flux_domicilies ? ' Flux domicilies.' : ''}${form.comportement_remboursement ? ' Comportement remboursement : ' + form.comportement_remboursement + '.' : ''} Niveau incidents : ${form.niveau_incidents_bancaires}/3. Nombre de banques : ${form.nombre_banques}.`,
              '',
              'VI. DECISION',
              `Apres analyse de l ensemble des elements du dossier, la decision rendue est : ${decLbl}.`,
              result.main_reason,
              ...(result.conditions.length > 0 ? ['', 'Conditions requises :', ...result.conditions.map(c => '- ' + c)] : []),
              ...(result.missing_documents.length > 0 ? ['', 'Documents manquants :', ...result.missing_documents.map(d => '- ' + d)] : []),
              '',
              `Analyse realisee par le moteur de decision automatise — Strategie : ${result.strategy} — Config v${result.config_version}`,
            ];

            const dossierText = lines.join('\n');

            const handleCopyText = () => {
              navigator.clipboard.writeText(dossierText).then(() => {
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
              });
            };

            const renderLine = (line: string, i: number) => {
              const t = line.trim();
              if (!t) return <div key={i} className="h-2" />;
              if (t.startsWith('AVIS D ANALYSE'))
                return <p key={i} className="text-sm font-black text-[#F59E0B] tracking-wide pb-2 mb-1 border-b border-[#F59E0B]/20">{t}</p>;
              if (t.startsWith('Objet :'))
                return <p key={i} className="text-xs text-[#F59E0B]/80 font-semibold">{t}</p>;
              if (/^(I{1,3}V?|IV|V|VI)\. /.test(t))
                return <div key={i} className="flex items-center gap-2 mt-2"><div className="w-1 h-5 rounded-full bg-gradient-to-b from-[#F59E0B] to-[#2563EB]" /><p className="text-xs font-bold text-white uppercase tracking-wide">{t}</p></div>;
              if (t.startsWith('- ')) {
                const content = t.substring(2);
                const sMatch = content.match(/\((favorable|a surveiller|bloquant|non applicable)\)\s*$/i);
                const dotColor = sMatch ? (sMatch[1].toLowerCase() === 'favorable' ? 'bg-emerald-400' : sMatch[1].toLowerCase() === 'bloquant' ? 'bg-red-400' : sMatch[1].toLowerCase() === 'a surveiller' ? 'bg-amber-400' : 'bg-[#6B7280]') : 'bg-[#6B7280]';
                return <div key={i} className="flex items-start gap-2 pl-3"><span className={`mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0 ${dotColor}`} /><p className="text-xs text-white/80 leading-relaxed">{content}</p></div>;
              }
              if (t.startsWith('Points favorables'))
                return <p key={i} className="text-xs font-semibold text-emerald-400">{t}</p>;
              if (t.startsWith('Points d attention'))
                return <p key={i} className="text-xs font-semibold text-red-400">{t}</p>;
              if (t.startsWith('Risques identifies'))
                return <p key={i} className="text-xs font-semibold text-orange-400">{t}</p>;
              if (t.startsWith('Conditions requises') || t.startsWith('Documents manquants'))
                return <p key={i} className="text-xs font-semibold text-amber-400">{t}</p>;
              if (t.startsWith('Analyse realisee'))
                return <p key={i} className="text-[10px] text-white/30 italic pt-2 mt-1 border-t border-white/5">{t}</p>;
              return <p key={i} className="text-xs text-white/80 leading-relaxed pl-1">{t}</p>;
            };

            return (
              <div className="rounded-xl overflow-hidden" style={{ background: '#040B1E', borderTop: '2px solid rgba(201,168,76,0.35)', borderRight: '2px solid rgba(201,168,76,0.35)', borderBottom: '2px solid rgba(201,168,76,0.35)', borderLeft: '4px solid #C9A84C' }}>
                <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid rgba(201,168,76,0.2)', background: 'rgba(201,168,76,0.08)' }}>
                  <div className="flex items-center gap-2">
                    <span className="text-sm">📝</span>
                    <p className="text-sm font-bold text-[#FDE68A]">Texte du dossier — Analyste crédit</p>
                  </div>
                  <button
                    onClick={handleCopyText}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#F59E0B]/20 hover:bg-[#F59E0B]/40 border border-[#F59E0B]/30 text-[#FDE68A] text-xs font-semibold transition-all"
                  >
                    {copied ? (
                      <><svg className="w-3.5 h-3.5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg><span className="text-emerald-400">Copié !</span></>
                    ) : (
                      <><svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg><span>Copier</span></>
                    )}
                  </button>
                </div>
                <div className="px-4 py-4 space-y-1 max-h-[500px] overflow-y-auto">
                  {lines.map((line, i) => renderLine(line, i))}
                </div>
              </div>
            );
          })()}

          {/* Reset */}
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => { setForm(emptyForm()); setResult(null); setActiveStep(0); setCopied(false); }}
              className="px-5 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-white/80 text-sm font-semibold transition-all">
              Nouveau dossier
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
