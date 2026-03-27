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
      'Quelles sont les règles de comptabilisation des titres de placement ?',
      'Comment calculer le Produit Net Bancaire (PNB) d\'un établissement de crédit ?',
      'Quels sont les états financiers obligatoires à soumettre à la Commission Bancaire ?',
      'Comment comptabiliser une opération en devises étrangères selon le PCB UMOA ?',
      'Comment traiter comptablement les provisions pour risques et charges ?',
      'Quelles sont les règles de consolidation des comptes bancaires en UMOA ?',
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
    ],
  },
];

// ---------------------------------------------------------------------------
// Chat Tab
// ---------------------------------------------------------------------------


function FahimtaAvatar() {
  return (
    <div className="flex-shrink-0 mr-2 mt-1 text-center">
      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary via-secondary to-accent flex items-center justify-center text-white text-[10px] font-bold">
        FA
      </div>
      <p className="text-[8px] text-muted mt-0.5 leading-none">Fahimta</p>
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
    code: ({ children }: any) => <code style={{ background: 'rgba(0,0,0,0.35)', padding: '0.1em 0.4em', borderRadius: '4px', fontSize: '0.82em', fontFamily: 'monospace', color: '#e2e8f0' }}>{children}</code>,
    blockquote: ({ children }: any) => <blockquote style={{ borderLeft: `3px solid ${accent}60`, paddingLeft: '0.75em', marginLeft: 0, opacity: 0.85, fontStyle: 'italic' }}>{children}</blockquote>,
    hr: () => <hr style={{ border: 'none', borderTop: `1px solid rgba(255,255,255,0.08)`, margin: '0.5em 0' }} />,
  };
}

const BASE_COMPONENTS = makeComponents('#94a3b8');

function AssistantBubble({ content }: { content: string }) {
  // Découpe le contenu en sections par H2
  const sections = content.split(/(?=^## )/m);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem', fontSize: '0.875rem', color: '#f1f5f9' }}>
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
                <div style={{ padding: '0.75rem 1rem' }}>
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
    content: "Bonjour ! Je suis **Fahimta AI**, votre assistant bancaire intelligence de la réglementation bancaire UMOA. Posez-moi vos questions ou choisissez un thème ci-dessous.",
  }]);
  const [input, setInput]   = useState('');
  const [loading, setLoading] = useState(false);
  const [activeThemeId, setActiveThemeId] = useState<string>(THEME_QUESTIONS[0].id);
  const [themePanelOpen, setThemePanelOpen] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);
  const themeScrollRef = useRef<HTMLDivElement>(null);

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
          border: `2px solid ${activeTheme.color}60`,
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
          border: `2px solid ${activeTheme.color}55`,
          borderLeft: `4px solid ${activeTheme.color}`,
          borderTop: 'none',
          borderRadius: '0 0 0.75rem 0.75rem',
          background: `linear-gradient(180deg, ${activeTheme.color}10 0%, rgba(10,20,52,0.9) 100%)`,
          overflow: 'hidden',
          boxShadow: `0 6px 24px ${activeTheme.color}14`,
        }}>
          {/* Sous-onglets thèmes — scroll horizontal */}
          <div
            ref={themeScrollRef}
            style={{ display: 'flex', gap: '0.3rem', padding: '0.625rem 0.75rem', overflowX: 'auto', scrollbarWidth: 'none', borderBottom: `1px solid ${activeTheme.color}20` }}
          >
            {THEME_QUESTIONS.map(theme => {
              const isActive = theme.id === activeThemeId;
              return (
                <button
                  key={theme.id}
                  onClick={() => setActiveThemeId(theme.id)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '0.25rem',
                    padding: '0.3rem 0.625rem', borderRadius: '9999px',
                    border: isActive ? `1px solid ${theme.color}` : '1px solid rgba(255,255,255,0.08)',
                    background: isActive ? `${theme.color}1e` : 'transparent',
                    color: isActive ? '#ffffff' : 'rgba(255,255,255,0.55)',
                    fontSize: '0.7rem', fontWeight: isActive ? 700 : 500,
                    cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0,
                    transition: 'all 0.15s', boxShadow: isActive ? `0 0 10px ${theme.color}28` : 'none',
                  }}
                >
                  <span style={{ fontSize: '0.78rem' }}>{theme.icon}</span>
                  {theme.label}
                  {isActive && <span style={{ width: 4, height: 4, borderRadius: '50%', background: theme.color, flexShrink: 0 }} />}
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
        style={{ maxHeight: 560, overflowY: 'auto', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}
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
            <FahimtaAvatar />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.35rem' }}>
                <span style={{ fontSize: '0.65rem', fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#C9A84C' }}>Fahimta AI</span>
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
            {msg.role === 'assistant' && <FahimtaAvatar />}
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
              <div style={{ flex: 1 }}>
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
            <FahimtaAvatar />
            <div style={{ background: '#0F1E48', border: '1px solid rgba(27,58,140,0.4)', borderRadius: '1rem 1rem 1rem 0.25rem', padding: '0.75rem 1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <LoadingDots />
              <span style={{ fontSize: '0.875rem', color: 'rgba(255,255,255,0.8)' }}>Fahimta AI réfléchit…</span>
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
      ? agentMode === 'speaking' ? 'Fahimta AI parle…' : 'En écoute — parlez librement'
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
            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#ffffff' }}>Fahimta AI Vocal</span>
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
              {msg.role === 'assistant' && <FahimtaAvatar />}
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
          className="relative w-full max-w-3xl mx-4 bg-surface border border-border rounded-2xl shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Modal header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-border">
            <div className="flex items-center gap-3">
              <span className="text-primary text-lg">📋</span>
              <div>
                <p className="text-xs text-muted">{formatDate(expandedItem.created_at)}</p>
                <p className="text-sm font-semibold text-text line-clamp-2">{expandedItem.question}</p>
              </div>
            </div>
            <button
              onClick={() => setExpandedItem(null)}
              className="flex-shrink-0 w-8 h-8 rounded-lg bg-surface2 border border-border flex items-center justify-center text-muted hover:text-text transition-colors"
            >
              ✕
            </button>
          </div>

          {/* Question bubble */}
          <div className="px-6 pt-5">
            <div className="flex justify-end mb-4">
              <div className="max-w-[80%] bg-gradient-to-br from-primary to-secondary text-white rounded-2xl rounded-tr-sm px-4 py-3 text-sm">
                <p className="whitespace-pre-wrap">{expandedItem.question}</p>
              </div>
            </div>
          </div>

          {/* Answer */}
          <div className="px-6 pb-6">
            <div className="flex gap-3">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary via-secondary to-accent flex items-center justify-center text-white text-[10px] font-bold">
                  FA
                </div>
                <p className="text-[8px] text-muted text-center mt-0.5">Fahimta</p>
              </div>
              <div className="flex-1 bg-surface2 border border-border rounded-2xl rounded-tl-sm px-5 py-4">
                {expandedItem.answer ? (
                  <div className="prose prose-invert prose-sm max-w-none">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {expandedItem.answer}
                    </ReactMarkdown>
                  </div>
                ) : (
                  <p className="text-muted text-sm italic">Aucune réponse disponible.</p>
                )}
              </div>
            </div>
          </div>

          {/* Footer actions */}
          <div className="px-6 pb-5 flex justify-end gap-3 border-t border-border pt-4">
            <button
              onClick={() => {
                onReread(expandedItem.question, expandedItem.answer || expandedItem.question);
                setExpandedItem(null);
              }}
              className="text-sm px-4 py-2 bg-primary/10 text-primary border border-primary/20 rounded-xl hover:bg-primary/20 transition-colors"
            >
              Relire dans le chat
            </button>
            <button
              onClick={() => setExpandedItem(null)}
              className="text-sm px-4 py-2 bg-surface2 border border-border rounded-xl text-muted hover:text-text transition-colors"
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
                <p className="text-sm font-medium text-text flex-1">
                  {item.question}
                </p>
                <div className="flex flex-col gap-1.5 flex-shrink-0">
                  <button
                    onClick={() => setExpandedItem(item)}
                    className="text-xs px-3 py-1.5 bg-gradient-to-r from-primary/20 to-secondary/20 text-primary border border-primary/30 rounded-lg hover:from-primary/30 hover:to-secondary/30 transition-all font-medium"
                  >
                    Voir la réponse
                  </button>
                  <button
                    onClick={() =>
                      onReread(item.question, item.answer || item.question)
                    }
                    className="text-xs px-3 py-1.5 bg-surface border border-border rounded-lg text-muted hover:text-text hover:border-primary/30 transition-colors"
                  >
                    Relire dans le chat
                  </button>
                </div>
              </div>

              {item.answer ? (
                <p className="text-xs text-muted line-clamp-2 leading-relaxed border-l-2 border-primary/30 pl-3">
                  {item.answer.slice(0, 250)}
                  {item.answer.length > 250 ? '...' : ''}
                </p>
              ) : (
                <div className="flex items-center gap-2 text-xs text-amber-400">
                  <LoadingDots />
                  <span>En attente de réponse...</span>
                </div>
              )}

              <p className="text-xs text-muted">{formatDate(item.created_at)}</p>
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
    { key: 'chat', label: 'Chat Fahimta AI', iconPath: 'M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z' },
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
