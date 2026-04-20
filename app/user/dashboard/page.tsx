'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { authApi } from '@/lib/api/auth';
import { apiClient } from '@/lib/api/client';
import ScrollReveal from '@/components/home/ScrollReveal';
import ImpayesTab from '@/components/org/impayes/ImpayesTab';
import { useTabPermissions } from '@/hooks/useTabPermissions';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import KnowledgeSection from '@/components/user/KnowledgeSection';

interface User {
  id: string;
  email: string;
  full_name: string;
  role: string;
  organization_id?: string | null;
  department_id?: string | null;
  department_name?: string | null;
  service_id?: string | null;
  service_name?: string | null;
}

interface Question {
  id: string;
  question: string;
  answer: string | null;
  status: 'pending' | 'answered' | 'error';
  created_at: string;
  answered_at: string | null;
}

interface RagQueryResult {
  answer: string;
  strategy?: string;
  sources?: Array<{ scope?: string; score?: number; content?: string }>;
}

export default function UserDashboard() {
  const router = useRouter();
  const { hasTabPermission, loading: permissionsLoading } = useTabPermissions();
  const [activeSection, setActiveSection] = useState<'knowledge' | 'formations' | 'credit' | 'recovery' | 'pcb'>('knowledge');
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [userFormations, setUserFormations] = useState<any[]>([]);
  const [formationsLoading, setFormationsLoading] = useState(false);
  const [formationsError, setFormationsError] = useState<string>('');
  const [expandedBlocKey, setExpandedBlocKey] = useState<string | null>(null);
  const [expandedFormationId, setExpandedFormationId] = useState<string | null>(null);
  const [expandedModuleKey, setExpandedModuleKey] = useState<string | null>(null);
  const [expandedChapterKey, setExpandedChapterKey] = useState<string | null>(null);
  const [expandedQcmKey, setExpandedQcmKey] = useState<string | null>(null);
  const [qcmAnswers, setQcmAnswers] = useState<Record<string, number>>({});
  const [stats, setStats] = useState({
    questionsAsked: 0,
    formationsCompleted: 0,
    creditsAnalyzed: 0,
    documentsAccessible: 0,
  });
  const [archivedQuestions, setArchivedQuestions] = useState<Question[]>([]);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1);
  const [loadingArchives, setLoadingArchives] = useState(false);
  const [knowledgeSubTab, setKnowledgeSubTab] = useState<'ask' | 'archive'>('ask');
  const [question, setQuestion] = useState('');
  const [context, setContext] = useState('');
  const [lastAskedQuestion, setLastAskedQuestion] = useState<string | null>(null);

  const groupedFormations = useMemo(() => {
    const map = new Map<string, { key: string; label: string; numero: number | null; formations: any[] }>();
    for (const f of userFormations) {
      const key = f.bloc_numero != null ? `bloc-${f.bloc_numero}` : 'no-bloc';
      const label = f.bloc_label || (f.bloc_numero != null ? `BLOC ${f.bloc_numero}` : 'Autres formations');
      if (!map.has(key)) {
        map.set(key, { key, label, numero: f.bloc_numero ?? null, formations: [] });
      }
      map.get(key)!.formations.push(f);
    }
    return Array.from(map.values()).sort((a, b) => {
      if (a.numero === null) return 1;
      if (b.numero === null) return -1;
      return a.numero - b.numero;
    });
  }, [userFormations]);

  const getAuthHeaders = (): HeadersInit => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    return headers;
  };

  const sanitizeMarkdownInline = (text: string) => {
    if (!text) return '';
    return text
      .replace(/\*\*(.*?)\*\*/g, '$1')
      .replace(/\*(.*?)\*/g, '$1')
      .replace(/`([^`]+)`/g, '$1');
  };

  const renderGeneratedContent = (content: string) => {
    const raw = (content || '').replace(/\r\n/g, '\n');
    const lines = raw.split('\n');
    const blocks: Array<
      | { type: 'h1' | 'h2' | 'h3' | 'p'; text: string }
      | { type: 'ul'; items: string[] }
    > = [];

    let pendingList: string[] = [];
    const flushList = () => {
      if (pendingList.length) {
        blocks.push({ type: 'ul', items: pendingList });
        pendingList = [];
      }
    };

    for (const lineRaw of lines) {
      const line = lineRaw.trim();
      if (!line) {
        flushList();
        continue;
      }

      const asList = line.match(/^[-*•]\s+(.*)$/);
      if (asList) {
        pendingList.push(sanitizeMarkdownInline(asList[1]));
        continue;
      }

      flushList();

      const mdHeading = line.match(/^(#{1,6})\s+(.*)$/);
      if (mdHeading) {
        const level = mdHeading[1].length;
        const text = sanitizeMarkdownInline(mdHeading[2]);
        blocks.push({ type: level <= 1 ? 'h1' : level <= 3 ? 'h2' : 'h3', text });
        continue;
      }

      const keywordHeading = line.match(/^(INTRODUCTION|CONCLUSION|R[ÉE]SUM[ÉE]|OBJECTIFS?|PARTIE\s+\d+|CHAPITRE\s+\d+|MODULE\s+\d+)\s*[:\-–]?\s*(.*)$/i);
      if (keywordHeading) {
        const a = sanitizeMarkdownInline(keywordHeading[1]);
        const b = sanitizeMarkdownInline(keywordHeading[2] || '');
        blocks.push({ type: 'h2', text: b ? `${a}: ${b}` : a });
        continue;
      }

      blocks.push({ type: 'p', text: sanitizeMarkdownInline(lineRaw) });
    }

    flushList();

    return (
      <div className="space-y-3">
        {blocks.map((b, i) => {
          if (b.type === 'h1') {
            return (
              <div key={i} className="text-white font-black text-xl mt-2">
                {b.text}
              </div>
            );
          }
          if (b.type === 'h2') {
            return (
              <div key={i} className="text-white font-extrabold text-lg mt-2">
                {b.text}
              </div>
            );
          }
          if (b.type === 'h3') {
            return (
              <div key={i} className="text-white font-bold text-base mt-2">
                {b.text}
              </div>
            );
          }
          if (b.type === 'ul') {
            return (
              <ul key={i} className="list-disc pl-6 text-sm text-[#E2E8F0] space-y-1">
                {b.items.map((it, idx) => (
                  <li key={idx}>{it}</li>
                ))}
              </ul>
            );
          }
          return (
            <p key={i} className="text-sm text-[#E2E8F0] whitespace-pre-wrap leading-relaxed">
              {b.text}
            </p>
          );
        })}
      </div>
    );
  };

  const fetchMyFormations = async () => {
    setFormationsLoading(true);
    setFormationsError('');
    try {
      const response = await fetch('/api/formations/user/my-formations', {
        headers: getAuthHeaders(),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || errorData.error || 'Erreur lors de la récupération des formations');
      }

      const data = await response.json();
      setUserFormations(data || []);
    } catch (err: any) {
      setFormationsError(err.message || 'Erreur lors de la récupération des formations');
      setUserFormations([]);
    } finally {
      setFormationsLoading(false);
    }
  };
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
  const [currentRagResult, setCurrentRagResult] = useState<RagQueryResult | null>(null);
  const [quotaStats, setQuotaStats] = useState<{
    questions_asked: number;
    quota_limit: number;
    remaining_quota: number;
    is_quota_exceeded: boolean;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const user = authApi.getCurrentUser();
    if (!user || user.role !== 'user') {
      router.push('/login');
      return;
    }
    setCurrentUser(user);
    fetchUserData();
  }, [router]);

  useEffect(() => {
    if (activeSection !== 'formations') return;
    if (formationsLoading) return;
    if (formationsError) return;
    if (userFormations.length > 0) return;
    fetchMyFormations();
  }, [activeSection]);

  const fetchUserData = async (silent = false) => {
    try {
      if (!silent) setLoading(true);

      // Récupérer les statistiques de quota (qui contient le nombre de questions posées)
      const quotaResponse = await fetch('/api/questions/quota', {
        method: 'GET',
        headers: getAuthHeaders(),
      });

      if (quotaResponse.ok) {
        const quotaData = await quotaResponse.json();
        setQuotaStats(quotaData);
        setStats({
          questionsAsked: quotaData.questions_asked || 0,
          formationsCompleted: 0, // À implémenter
          creditsAnalyzed: 0, // À implémenter
          documentsAccessible: 0, // À implémenter
        });
      }
    } catch (error) {
      console.error('Erreur lors du chargement des données:', error);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  const fetchArchivedQuestions = async () => {
    try {
      setLoadingArchives(true);
      const response = await fetch('/api/questions?limit=1000', {
        method: 'GET',
        headers: getAuthHeaders(),
      });
      
      if (response.ok) {
        const questions = await response.json();
        setArchivedQuestions(questions);
      }
    } catch (error) {
      console.error('Erreur lors du chargement des archives:', error);
    } finally {
      setLoadingArchives(false);
    }
  };

  useEffect(() => {
    if (activeSection === 'knowledge') {
      fetchArchivedQuestions();
      fetchUserData(); // Recharger les stats de quota
    }
  }, [activeSection]);

  const handleSubmitQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim()) return;

    setIsSubmitting(true);
    setError(null);
    setCurrentQuestion(null);
    setCurrentRagResult(null);
    setLastAskedQuestion(question.trim());

    try {
      const newQuestion = await apiClient.post<any>('/questions', {
        question: question.trim(),
        context: context.trim() || undefined,
      });

      setCurrentQuestion(newQuestion);
      setQuestion('');
      setContext('');
      
      // Recharger les stats et l'archive
      await Promise.all([fetchUserData(), fetchArchivedQuestions()]);

      setIsSubmitting(false);
    } catch (err: any) {
      setError(err.message || 'Erreur lors de l\'envoi de la question');
      setIsSubmitting(false);
    }
  };

  const pollQuestionStatus = async (questionId: string) => {
    const maxAttempts = 30;
    let attempts = 0;
    let pollTimeout: NodeJS.Timeout | null = null;
    let isPolling = true;

    const poll = async () => {
      if (!isPolling) return;
      
      try {
        const response = await fetch(`/api/questions?limit=50`, {
          method: 'GET',
          headers: getAuthHeaders(),
        });
        
        if (response.ok) {
          const updatedQuestions = await response.json();
          const question = updatedQuestions.find((q: Question) => q.id === questionId);
          
          if (question) {
            setCurrentQuestion(question);
            if (question.answer || question.status !== 'pending') {
              setIsSubmitting(false);
              isPolling = false;
              if (pollTimeout) {
                clearTimeout(pollTimeout);
              }
              await Promise.all([fetchUserData(), fetchArchivedQuestions()]);
              return;
            }
          }
        }

        attempts++;
        if (attempts < maxAttempts && isPolling) {
          pollTimeout = setTimeout(poll, 2000);
        } else {
          setIsSubmitting(false);
          isPolling = false;
          if (pollTimeout) {
            clearTimeout(pollTimeout);
          }
        }
      } catch (err) {
        console.error('Erreur lors du polling:', err);
        setIsSubmitting(false);
        isPolling = false;
        if (pollTimeout) {
          clearTimeout(pollTimeout);
        }
      }
    };

    pollTimeout = setTimeout(poll, 2000);
    
    return () => {
      isPolling = false;
      if (pollTimeout) {
        clearTimeout(pollTimeout);
      }
    };
  };

  // Organiser les questions par année et mois
  const getQuestionsByYearMonth = () => {
    const questionsByDate: Record<string, Question[]> = {};
    
    archivedQuestions.forEach((q) => {
      const date = new Date(q.created_at);
      const year = date.getFullYear();
      const month = date.getMonth() + 1;
      const key = `${year}-${month}`;
      
      if (!questionsByDate[key]) {
        questionsByDate[key] = [];
      }
      questionsByDate[key].push(q);
    });
    
    return questionsByDate;
  };

  // Obtenir les années disponibles
  const getAvailableYears = () => {
    const years = new Set<number>();
    archivedQuestions.forEach((q) => {
      const date = new Date(q.created_at);
      years.add(date.getFullYear());
    });
    return Array.from(years).sort((a, b) => b - a);
  };

  // Obtenir les mois disponibles pour une année
  const getAvailableMonths = (year: number) => {
    const months = new Set<number>();
    archivedQuestions.forEach((q) => {
      const date = new Date(q.created_at);
      if (date.getFullYear() === year) {
        months.add(date.getMonth() + 1);
      }
    });
    return Array.from(months).sort((a, b) => b - a);
  };

  // Obtenir les questions pour le mois sélectionné
  const getCurrentMonthQuestions = () => {
    const key = `${selectedYear}-${selectedMonth}`;
    const questionsByDate = getQuestionsByYearMonth();
    return questionsByDate[key] || [];
  };

  const monthNames = [
    'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
    'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
  ];

  // Fonction pour formater la réponse de l'IA
  const formatResponse = (text: string) => {
    // Nettoyer le texte : enlever les #, *, et caractères indésirables
    let cleanText = text
      .replace(/[#*]/g, '') // Enlever les # et *
      .replace(/\n{3,}/g, '\n\n') // Limiter les sauts de ligne
      .trim();

    // Formater avec des titres et paragraphes stylisés
    const lines = cleanText.split('\n');
    const formattedLines = lines.map((line, index) => {
      const trimmedLine = line.trim();
      
      // Titres principaux (lignes en majuscules ou contenant des mots-clés)
      if (trimmedLine.length > 0 && (
        trimmedLine === trimmedLine.toUpperCase() ||
        trimmedLine.includes('ÉTAPES') ||
        trimmedLine.includes('PROCÉDURE') ||
        trimmedLine.includes('IMPORTANT') ||
        trimmedLine.includes('REMARQUE')
      )) {
        return (
          <h3 key={index} className="text-xl font-bold text-text mb-3 mt-6 border-l-4 border-primary pl-4">
            {trimmedLine}
          </h3>
        );
      }
      
      // Sous-titres (lignes qui se terminent par : ou contiennent des nombres)
      if (trimmedLine.length > 0 && (
        trimmedLine.endsWith(':') ||
        /^\d+\./.test(trimmedLine) ||
        trimmedLine.includes('CONCLUSION')
      )) {
        return (
          <h4 key={index} className="text-lg font-semibold text-accent mb-2 mt-4">
            {trimmedLine}
          </h4>
        );
      }
      
      // Listes (lignes commençant par - ou •)
      if (trimmedLine.startsWith('-') || trimmedLine.startsWith('•')) {
        return (
          <li key={index} className="text-text mb-2 ml-6 list-disc">
            {trimmedLine.replace(/^[-•]\s*/, '')}
          </li>
        );
      }
      
      // Paragraphes normaux
      if (trimmedLine.length > 0) {
        return (
          <p key={index} className="text-muted mb-4 leading-relaxed">
            {trimmedLine}
          </p>
        );
      }
      
      return null;
    });

    return formattedLines.filter(Boolean);
  };

  // Constantes pour les sélecteurs (fix pour les options natives)
  const SELECT_BG = '#000000';   // fond noir
  const SELECT_TEXT = '#FFFFFF'; // texte blanc
  const SELECT_BORDER = 'rgba(255, 255, 255, 0.35)'; // bordure blanche

  /* ── Icônes SVG dashboard ─────────────────────────────────────── */
  const IcChat = () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
        d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
    </svg>
  );
  const IcBook = () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
        d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
    </svg>
  );
  const IcCard = () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
        d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" />
    </svg>
  );
  const IcFolder = () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
        d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" />
    </svg>
  );
  const IcRefresh = () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
        d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
    </svg>
  );
  const IcBarChart = () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
        d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
    </svg>
  );

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#070E28]">
        <div className="text-center">
          <div className="w-14 h-14 border-4 border-[#1B3A8C]/40 border-t-[#C9A84C] rounded-full animate-spin mx-auto mb-5" />
          <p className="text-white/50 text-sm font-medium tracking-wide">Chargement de votre espace...</p>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#070E28]">
        <div className="p-8 bg-red-500/10 border border-red-500/30 rounded-3xl text-center max-w-sm">
          <p className="text-red-300 font-semibold">Session expirée. Veuillez vous reconnecter.</p>
        </div>
      </div>
    );
  }

  const statCards = [
    {
      id: 'formations',
      label: 'Formations complétées',
      value: stats.formationsCompleted,
      icon: <IcBook />,
      highlight: false,
    },
    {
      id: 'credit',
      label: 'Dossiers analysés',
      value: stats.creditsAnalyzed,
      icon: <IcCard />,
      highlight: false,
    },
  ];

  /* ── Tab config ─────────────────────────────────────────────────── */
  const tabs = [
    { id: 'knowledge', permission: 'questions', label: 'Base de Connaissances', icon: <IcChat /> },
    { id: 'formations', permission: 'formations', label: 'Formations',            icon: <IcBook /> },
    { id: 'credit',    permission: 'credit',     label: 'Analyse de Crédit',     icon: <IcCard /> },
    { id: 'recovery',  permission: 'impayes',    label: 'Recouvrement',          icon: <IcRefresh /> },
    { id: 'pcb',       permission: 'pcb',        label: 'États PCB UEMOA & ratios', icon: <IcBarChart /> },
  ] as const;

  const today = new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <div className="min-h-screen bg-[#070E28]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-16">

        {/* ── Welcome Header ──────────────────────────────────────────── */}
        <ScrollReveal direction="down" delay={0}>
          <div className="relative overflow-hidden rounded-3xl border border-[#1B3A8C]/25 bg-[#0F1E48] mb-6 p-7 sm:p-9">
            {/* Glow orbs */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-[#1B3A8C]/20 rounded-full blur-[80px] pointer-events-none" />
            <div className="absolute bottom-0 left-20 w-48 h-48 bg-[#C9A84C]/6 rounded-full blur-[60px] pointer-events-none" />
            {/* Gold top border */}
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#C9A84C]/40 to-transparent" />

            <div className="relative z-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-5">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#C9A84C] mb-2 capitalize">{today}</p>
                <h1 className="text-3xl sm:text-4xl font-black text-white mb-2 leading-tight">
                  Bonjour,{' '}
                  <span className="text-[#C9A84C]">{currentUser.full_name}</span>
                </h1>
                <p className="text-sm text-white/80 mb-4">
                  Accédez à vos outils bancaires — base de connaissances, formations, analyse de crédit et plus.
                </p>
                {(currentUser.department_name || currentUser.service_name) && (
                  <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#1B3A8C]/30 border border-[#1B3A8C]/40">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#C9A84C]" />
                    <span className="text-xs font-semibold text-white/70">
                      {currentUser.department_name}
                      {currentUser.service_name && ` · ${currentUser.service_name}`}
                    </span>
                  </div>
                )}
              </div>

              {/* Quota card */}
              {quotaStats && (
                <div className="flex-shrink-0 sm:text-right">
                  <div className="inline-block p-5 bg-[#070E28]/60 rounded-2xl border border-[#1B3A8C]/20 min-w-[180px]">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-[#C9A84C] mb-1">Quota mensuel</p>
                    <p className="text-2xl font-black text-white mb-3">
                      {quotaStats.questions_asked}
                      <span className="text-white/60 text-lg font-medium"> / {quotaStats.quota_limit}</span>
                    </p>
                    <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-700"
                        style={{
                          width: `${Math.min(100, (quotaStats.questions_asked / Math.max(1, quotaStats.quota_limit)) * 100)}%`,
                          background: quotaStats.is_quota_exceeded
                            ? 'linear-gradient(90deg,#EF4444,#F97316)'
                            : 'linear-gradient(90deg,#1B3A8C,#C9A84C)',
                        }}
                      />
                    </div>
                    <p className="text-[10px] text-white/65 mt-1.5">
                      {quotaStats.remaining_quota} questions restantes
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </ScrollReveal>

        {/* ── Stats Grid ───────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {statCards.filter(s => {
            if (s.id === 'knowledge') return hasTabPermission('questions');
            if (s.id === 'formations') return hasTabPermission('formations');
            if (s.id === 'credit')    return hasTabPermission('credit');
            return true;
          }).map((stat, i) => {
            const isKnowledge = stat.id === 'knowledge';
            const isCredit    = stat.id === 'credit';
            const El = (isKnowledge || isCredit) ? Link : 'button';
            const props = isKnowledge ? { href: '/m3/questions' }
              : isCredit ? { href: '/m3/credit' }
              : { onClick: () => setActiveSection(stat.id as any) };
            return (
              <ScrollReveal key={stat.id} direction="up" delay={i * 80}>
                {/* @ts-ignore */}
                <El {...props} className={`group relative w-full block overflow-hidden rounded-2xl border p-5 text-left transition-all duration-300 hover:scale-[1.03] cursor-pointer ${
                  stat.highlight
                    ? 'bg-[#1B3A8C] border-[#1B3A8C] hover:shadow-lg hover:shadow-[#1B3A8C]/30'
                    : 'bg-[#0F1E48] border-[#1B3A8C]/15 hover:border-[#1B3A8C]/40 hover:shadow-lg hover:shadow-[#1B3A8C]/10'
                }`}>
                  {/* Gold bottom bar */}
                  {stat.highlight && <div className="absolute inset-x-0 bottom-0 h-0.5 bg-gradient-to-r from-transparent via-[#C9A84C] to-transparent" />}
                  <div className="flex items-center justify-between mb-3">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${stat.highlight ? 'bg-white/15 text-white' : 'bg-[#1B3A8C]/30 text-[#C9A84C]'}`}>
                      {stat.icon}
                    </div>
                    <span className={`text-3xl font-black ${stat.highlight ? 'text-[#C9A84C]' : 'text-white'}`}>
                      {stat.value}
                    </span>
                  </div>
                  <p className={`text-xs font-semibold leading-snug ${stat.highlight ? 'text-white/85' : 'text-white/75'}`}>
                    {stat.label}
                  </p>
                  {!stat.highlight && (
                    <div className="mt-3 h-0.5 w-0 group-hover:w-full bg-gradient-to-r from-[#1B3A8C] to-[#C9A84C] transition-all duration-400 rounded-full" />
                  )}
                </El>
              </ScrollReveal>
            );
          })}
        </div>

        {/* ── Navigation Tabs ──────────────────────────────────────────── */}
        <div className="mb-6 overflow-x-auto scrollbar-thin">
          <div className="flex gap-2 bg-[#0F1E48] rounded-2xl p-1.5 border border-[#1B3A8C]/15 min-w-max sm:min-w-0">
            {tabs.map((tab) => {
              if (!hasTabPermission(tab.permission)) return null;
              const isActive = activeSection === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveSection(tab.id as any)}
                  className={`flex items-center gap-2.5 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-300 whitespace-nowrap ${
                    isActive
                      ? 'bg-[#1B3A8C] text-white shadow-lg shadow-[#1B3A8C]/30'
                      : 'text-white/75 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <span className={isActive ? 'text-[#C9A84C]' : ''}>{tab.icon}</span>
                  {tab.label}
                  {isActive && <div className="w-1 h-1 rounded-full bg-[#C9A84C]" />}
                </button>
              );
            })}
          </div>
        </div>

      {/* ── Content Sections ──────────────────────────────────────────── */}
      <div className="space-y-6">
        {/* Knowledge Section */}
        {activeSection === 'knowledge' && (
          <KnowledgeSection currentUser={currentUser} onStatsRefresh={() => fetchUserData(true)} />
        )}

        {/* Formations Section */}
        {activeSection === 'formations' && (
          <ScrollReveal direction="up" delay={0}>
            <div className="bg-[#0F1E48] rounded-3xl border border-[#1B3A8C]/20 p-6 sm:p-9">
              {/* Header */}
              <div className="flex items-center justify-between mb-8">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#C9A84C] mb-1">Apprentissage</p>
                  <h2 className="text-2xl sm:text-3xl font-black text-white">Mes Formations</h2>
                </div>
                <button
                  onClick={fetchMyFormations}
                  disabled={formationsLoading}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold bg-[#1B3A8C]/30 hover:bg-[#1B3A8C]/50 text-white border border-[#1B3A8C]/30 hover:border-[#1B3A8C]/60 transition-all disabled:opacity-50"
                >
                  <IcRefresh />
                  {formationsLoading ? 'Chargement...' : 'Rafraîchir'}
                </button>
              </div>

              {formationsError && (
                <div className="mb-6 p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-300 text-sm">
                  {formationsError}
                </div>
              )}

              {formationsLoading ? (
                <div className="flex items-center justify-center py-16 gap-3 text-white/75">
                  <div className="w-5 h-5 border-2 border-[#1B3A8C] border-t-[#C9A84C] rounded-full animate-spin" />
                  Chargement des formations...
                </div>
              ) : userFormations.length === 0 ? (
                <div className="text-center py-16">
                  <div className="w-16 h-16 rounded-2xl bg-[#1B3A8C]/20 border border-[#1B3A8C]/20 flex items-center justify-center mx-auto mb-4">
                    <IcBook />
                  </div>
                  <p className="text-white/60 font-semibold mb-1">Aucune formation disponible</p>
                  <p className="text-white/65 text-sm max-w-xs mx-auto">
                    Un administrateur doit publier et affecter une formation à votre département.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {groupedFormations.map((bloc) => {
                    const isBlocOpen = expandedBlocKey === bloc.key;
                    return (
                      <div key={bloc.key} className="rounded-2xl overflow-hidden border border-[#1B3A8C]/25 bg-[#070E28]">
                        {/* Bloc header */}
                        <button
                          type="button"
                          onClick={() => {
                            setExpandedBlocKey((prev) => (prev === bloc.key ? null : bloc.key));
                            setExpandedFormationId(null);
                            setExpandedModuleKey(null);
                            setExpandedChapterKey(null);
                          }}
                          className="w-full flex items-center justify-between gap-4 px-6 py-4 text-left hover:bg-[#1B3A8C]/10 transition-all"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-8 h-8 rounded-lg bg-[#C9A84C]/15 border border-[#C9A84C]/30 flex items-center justify-center flex-shrink-0">
                              <svg className="w-4 h-4 text-[#C9A84C]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                              </svg>
                            </div>
                            <div className="min-w-0">
                              <p className="text-[#C9A84C] font-black text-sm tracking-wide truncate">{bloc.label}</p>
                              <p className="text-white/40 text-xs mt-0.5">{bloc.formations.length} formation{bloc.formations.length > 1 ? 's' : ''}</p>
                            </div>
                          </div>
                          <svg
                            className={`w-5 h-5 text-[#C9A84C]/70 flex-shrink-0 transition-transform duration-200 ${isBlocOpen ? 'rotate-180' : ''}`}
                            fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                          </svg>
                        </button>

                        {/* Formations list */}
                        {isBlocOpen && (
                          <div className="border-t border-[#1B3A8C]/20 divide-y divide-[#1B3A8C]/10">
                            {bloc.formations.map((f: any) => {
                              const fid = f.id || f._id || null;
                              const isFormationOpen = fid && expandedFormationId === fid;
                              return (
                                <div key={fid || f.titre} className="bg-[#070E28]">
                                  {/* Formation row */}
                                  <button
                                    type="button"
                                    onClick={() => {
                                      if (!fid) return;
                                      setExpandedFormationId((prev) => (prev === fid ? null : fid));
                                      setExpandedModuleKey(null);
                                      setExpandedChapterKey(null);
                                    }}
                                    className="w-full flex items-start justify-between gap-4 px-6 py-4 text-left hover:bg-[#1B3A8C]/8 transition-all group"
                                  >
                                    <div className="min-w-0 flex-1">
                                      <div className="flex items-center gap-2 mb-1.5">
                                        <span className="px-2 py-0.5 rounded-md bg-[#1B3A8C]/30 border border-[#1B3A8C]/30 text-[9px] font-bold text-[#C9A84C] uppercase tracking-wider">
                                          {f.modules_count || f.modules?.length || 0} modules
                                        </span>
                                      </div>
                                      <h3 className="text-white font-bold text-sm sm:text-base leading-snug group-hover:text-[#C9A84C]/90 transition-colors">
                                        {f.titre}
                                      </h3>
                                      {f.description && (
                                        <p className="text-white/50 text-xs mt-1.5 leading-relaxed line-clamp-2">
                                          {f.description}
                                        </p>
                                      )}
                                    </div>
                                    <svg
                                      className={`w-4 h-4 text-[#C9A84C]/60 flex-shrink-0 mt-1 transition-transform duration-200 ${isFormationOpen ? 'rotate-180' : ''}`}
                                      fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}
                                    >
                                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                                    </svg>
                                  </button>

                                  {/* Modules expanded */}
                                  {isFormationOpen && (
                        <div className="border-t border-[#1B3A8C]/15 p-6 space-y-3">
                          {/* Modules */}
                          <div className="space-y-2">
                            {(f.modules || []).length === 0 ? (
                              <div className="text-sm text-white/70 py-4 text-center">Aucun module trouvé pour cette formation.</div>
                            ) : (
                              (f.modules || []).map((m: any, moduleIndex: number) => (
                                <div key={m.id || moduleIndex} className="rounded-xl bg-[#0F1E48] border border-[#1B3A8C]/15 hover:border-[#1B3A8C]/30 transition-all overflow-hidden">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const formationId = f.id || f._id;
                                      const moduleId = m.id || String(moduleIndex);
                                      const key = `${formationId}::module::${moduleId}`;
                                      setExpandedModuleKey((prev) => (prev === key ? null : key));
                                      setExpandedChapterKey(null);
                                    }}
                                    className="w-full p-4 flex items-center justify-between gap-3 text-left"
                                  >
                                    <div className="min-w-0 flex items-center gap-3">
                                      <div className="w-7 h-7 rounded-lg bg-[#1B3A8C]/40 flex items-center justify-center text-[#C9A84C] text-xs font-black flex-shrink-0">
                                        {moduleIndex + 1}
                                      </div>
                                      <div>
                                        <div className="text-white font-semibold text-sm">{m.titre}</div>
                                        <div className="text-xs text-white/65 mt-0.5">
                                          {m.nombre_chapitres || m.chapitres?.length || 0} chapitres
                                        </div>
                                      </div>
                                    </div>
                                    <div className="text-[#C9A84C] text-xs font-bold flex-shrink-0">
                                      {(() => {
                                        const formationId = f.id || f._id;
                                        const moduleId = m.id || String(moduleIndex);
                                        const key = `${formationId}::module::${moduleId}`;
                                        return expandedModuleKey === key ? 'Réduire' : 'Ouvrir';
                                      })()}
                                    </div>
                                  </button>

                                  {(() => {
                                    const formationId = f.id || f._id;
                                    const moduleId = m.id || String(moduleIndex);
                                    const key = `${formationId}::module::${moduleId}`;
                                    if (expandedModuleKey !== key) return null;

                                    return (
                                      <div className="px-5 pb-5 space-y-4">
                                        {/* Chapitres */}
                                        <div className="space-y-3">
                                          {(m.chapitres || []).map((ch: any, chapitreIndex: number) => {
                                            const chapitreId = ch.id || String(chapitreIndex);
                                            const chapterKey = `${formationId}::module::${moduleId}::chapitre::${chapitreId}`;
                                            const isOpen = expandedChapterKey === chapterKey;

                                            return (
                                              <div key={ch.id || chapitreIndex} className="rounded-xl bg-[#070E28] border border-[#1B3A8C]/10 hover:border-[#1B3A8C]/25 transition-all overflow-hidden">
                                                <button
                                                  type="button"
                                                  onClick={() => setExpandedChapterKey((prev) => (prev === chapterKey ? null : chapterKey))}
                                                  className="w-full px-4 py-3 flex items-center justify-between gap-3 text-left"
                                                >
                                                  <div className="text-white/80 font-medium text-sm">
                                                    <span className="text-[#C9A84C] font-bold mr-1.5">{chapitreIndex + 1}.</span>
                                                    {ch.titre || `Chapitre ${chapitreIndex + 1}`}
                                                  </div>
                                                  <div className="text-[#C9A84C] text-xs font-bold flex-shrink-0">
                                                    {isOpen ? 'Réduire' : 'Lire'}
                                                  </div>
                                                </button>

                                                {isOpen && (
                                                  <div className="px-4 pb-4 border-t border-[#1B3A8C]/10">
                                                    {ch.introduction && (
                                                      <div className="text-sm text-white/80 whitespace-pre-wrap mt-3">
                                                        {ch.introduction}
                                                      </div>
                                                    )}
                                                    {ch.contenu_genere ? (
                                                      <div className="mt-3">
                                                        <div className="text-[10px] font-bold text-[#C9A84C] uppercase tracking-widest mb-2">Contenu</div>
                                                        <div className="rounded-xl bg-[#0F1E48] border border-[#1B3A8C]/15 p-4">
                                                          {renderGeneratedContent(ch.contenu_genere)}
                                                        </div>
                                                      </div>
                                                    ) : (
                                                      <div className="mt-3 text-sm text-white/60 italic">Contenu non encore généré.</div>
                                                    )}
                                                  </div>
                                                )}
                                              </div>
                                            );
                                          })}
                                        </div>

                                        {/* QCM */}
                                        <div className="rounded-xl bg-[#070E28] border border-[#C9A84C]/15 hover:border-[#C9A84C]/30 transition-all overflow-hidden">
                                          <button
                                            type="button"
                                            onClick={() => {
                                              const qKey = `${formationId}::module::${moduleId}::qcm`;
                                              setExpandedQcmKey((prev) => (prev === qKey ? null : qKey));
                                            }}
                                            className="w-full px-4 py-3 flex items-center justify-between text-left"
                                          >
                                            <div className="flex items-center gap-2.5">
                                              <span className="px-2 py-0.5 rounded-md bg-[#C9A84C]/15 border border-[#C9A84C]/25 text-[10px] font-black text-[#C9A84C] uppercase tracking-wider">QCM</span>
                                              <span className="text-white/80 text-xs">
                                                {(m.questions_qcm || []).length} questions
                                              </span>
                                            </div>
                                            <div className="text-[#C9A84C] text-xs font-bold flex-shrink-0">
                                              {(() => {
                                                const qKey = `${formationId}::module::${moduleId}::qcm`;
                                                return expandedQcmKey === qKey ? 'Réduire' : 'Ouvrir';
                                              })()}
                                            </div>
                                          </button>

                                          {(() => {
                                            const qKey = `${formationId}::module::${moduleId}::qcm`;
                                            if (expandedQcmKey !== qKey) return null;

                                            return (
                                              <div className="px-5 pb-5">
                                                {(m.questions_qcm || []).length === 0 ? (
                                                  <div className="text-sm text-[#CBD5E1]">Aucun QCM généré pour ce module.</div>
                                                ) : (
                                                  <div className="space-y-3">
                                                    {(m.questions_qcm || []).map((q: any, qIndex: number) => {
                                                      const questionKey = `${formationId}::module::${moduleId}::q::${qIndex}`;
                                                      const selectedIndex = qcmAnswers[questionKey];
                                                      const hasAnswered = typeof selectedIndex === 'number';

                                                      // Normaliser options : objet {A,B,C,D} → tableau ou tableau direct
                                                      const optionsArray: string[] = Array.isArray(q.options)
                                                        ? q.options
                                                        : q.options && typeof q.options === 'object'
                                                          ? ['A','B','C','D'].map((k: string) => q.options[k]).filter(Boolean)
                                                          : [];

                                                      // Normaliser correct_answer : lettre "B" → index 1, ou nombre direct
                                                      const letterToIndex: Record<string, number> = { A: 0, B: 1, C: 2, D: 3 };
                                                      const correctIndex: number | undefined =
                                                        typeof q.correct_answer === 'number'
                                                          ? q.correct_answer
                                                          : typeof q.reponse_correcte === 'string'
                                                            ? letterToIndex[q.reponse_correcte.toUpperCase()]
                                                            : undefined;

                                                      const isCorrect = hasAnswered && typeof correctIndex === 'number' && selectedIndex === correctIndex;

                                                      return (
                                                        <div key={qIndex} className="rounded-xl bg-[#0F1E48] border border-[#1B3A8C]/15 p-4">
                                                          <div className="flex items-start justify-between gap-3">
                                                            <div className="text-white/80 font-semibold text-sm">
                                                              <span className="text-[#C9A84C] font-black mr-1">{qIndex + 1}.</span>
                                                              {sanitizeMarkdownInline(q.question || '')}
                                                            </div>
                                                            {hasAnswered && (
                                                              <div
                                                                className={`text-xs font-bold px-3 py-1 rounded-full border flex-shrink-0 ${
                                                                  isCorrect
                                                                    ? 'bg-green-500/10 border-green-500/30 text-green-200'
                                                                    : 'bg-red-500/10 border-red-500/30 text-red-200'
                                                                }`}
                                                              >
                                                                {isCorrect ? 'VRAI' : 'FAUX'}
                                                              </div>
                                                            )}
                                                          </div>

                                                          <div className="mt-3 grid grid-cols-1 gap-2">
                                                            {optionsArray.map((opt: string, optIndex: number) => {
                                                              const isSelected = hasAnswered && selectedIndex === optIndex;
                                                              const isCorrectOption = hasAnswered && typeof correctIndex === 'number' && correctIndex === optIndex;

                                                              const base = 'text-sm rounded-xl px-4 py-2.5 border text-left transition-all';
                                                              const state = !hasAnswered
                                                                ? 'bg-white/[0.04] border-[#1B3A8C]/15 text-white/70 hover:border-[#1B3A8C]/40 hover:bg-[#1B3A8C]/15'
                                                                : isCorrectOption
                                                                  ? 'bg-green-500/10 border-green-500/30 text-green-200'
                                                                  : isSelected
                                                                    ? 'bg-red-500/10 border-red-500/30 text-red-200'
                                                                    : 'bg-white/5 border-white/10 text-[#E2E8F0] opacity-70';

                                                              return (
                                                                <button
                                                                  key={optIndex}
                                                                  type="button"
                                                                  disabled={hasAnswered}
                                                                  onClick={() => {
                                                                    setQcmAnswers((prev) => ({
                                                                      ...prev,
                                                                      [questionKey]: optIndex,
                                                                    }));
                                                                  }}
                                                                  className={`${base} ${state}`}
                                                                >
                                                                  <span className="font-semibold mr-2">{String.fromCharCode(65 + optIndex)}.</span>
                                                                  {sanitizeMarkdownInline(opt || '')}
                                                                </button>
                                                              );
                                                            })}
                                                          </div>

                                                          {hasAnswered && q.explication && (
                                                            <div className="mt-3 text-sm text-white/80 bg-[#070E28] rounded-lg p-3 border border-[#1B3A8C]/10">
                                                              <span className="font-bold text-[#C9A84C]">Explication : </span>
                                                              {sanitizeMarkdownInline(q.explication)}
                                                            </div>
                                                          )}
                                                        </div>
                                                      );
                                                    })}
                                                  </div>
                                                )}
                                              </div>
                                            );
                                          })()}
                                        </div>
                                      </div>
                                    );
                                  })()}
                                </div>
                              ))
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
              </div>
              )}
            </div>
          </ScrollReveal>
        )}

        {/* Credit Section */}
        {activeSection === 'credit' && (
          <ScrollReveal direction="up" delay={0}>
            <div className="relative overflow-hidden rounded-3xl border border-[#1B3A8C]/20 bg-[#0F1E48] p-8 sm:p-12">
              <div className="absolute inset-0 bg-grid-pattern opacity-30" />
              <div className="absolute top-0 right-0 w-80 h-80 bg-[#1B3A8C]/15 rounded-full blur-[80px]" />
              <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#C9A84C]/30 to-transparent" />
              <div className="relative z-10 text-center max-w-xl mx-auto">
                <div className="w-20 h-20 rounded-2xl bg-[#1B3A8C] border border-[#C9A84C]/20 flex items-center justify-center mx-auto mb-6 shadow-xl shadow-[#1B3A8C]/30">
                  <IcCard />
                </div>
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#C9A84C] mb-3">Module Crédit</p>
                <h2 className="text-3xl sm:text-4xl font-black text-white mb-3">Analyse de Crédit</h2>
                <p className="text-white/80 mb-3 leading-relaxed">
                  Analysez les dossiers de crédit Particuliers et PME/PMI de manière intelligente et structurée.
                </p>
                <p className="text-white/65 text-sm mb-10">Décisions rapides, analyses documentées, conformité assurée.</p>
                <Link href="/m3/credit"
                  className="group inline-flex items-center gap-3 px-8 py-4 bg-[#1B3A8C] text-white font-bold rounded-2xl hover:scale-[1.02] transition-all duration-300 shadow-lg shadow-[#1B3A8C]/30 border-b-2 border-[#C9A84C]/30 hover:border-[#C9A84C]/60">
                  Accéder à l&apos;interface d&apos;analyse
                  <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                  </svg>
                </Link>
              </div>
            </div>
          </ScrollReveal>
        )}

        {/* Recovery Section */}
        {activeSection === 'recovery' && (
          <ScrollReveal direction="up" delay={0}>
            <ImpayesTab />
          </ScrollReveal>
        )}

        {/* PCB Section */}
        {activeSection === 'pcb' && (
          <ScrollReveal direction="up" delay={0}>
            <div className="relative overflow-hidden rounded-3xl border border-[#1B3A8C]/20 bg-[#0F1E48] p-8 sm:p-12">
              <div className="absolute inset-0 bg-grid-pattern opacity-30" />
              <div className="absolute bottom-0 left-0 w-80 h-80 bg-[#C9A84C]/5 rounded-full blur-[80px]" />
              <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#C9A84C]/30 to-transparent" />
              <div className="relative z-10 text-center max-w-xl mx-auto">
                <div className="w-20 h-20 rounded-2xl bg-[#1B3A8C] border border-[#C9A84C]/20 flex items-center justify-center mx-auto mb-6 shadow-xl shadow-[#1B3A8C]/30">
                  <IcBarChart />
                </div>
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#C9A84C] mb-3">Module Finance</p>
                <h2 className="text-3xl sm:text-4xl font-black text-white mb-3">PCB & Analyse Financière</h2>
                <p className="text-white/80 mb-3 leading-relaxed">
                  États financiers réglementaires PCB UEMOA et analyse des ratios bancaires BCEAO.
                </p>
                <p className="text-white/65 text-sm mb-10">Bilan, compte de résultat, hors bilan, ratios de gestion.</p>
                <Link href="/m3/pcb"
                  className="group inline-flex items-center gap-3 px-8 py-4 bg-[#1B3A8C] text-white font-bold rounded-2xl hover:scale-[1.02] transition-all duration-300 shadow-lg shadow-[#1B3A8C]/30 border-b-2 border-[#C9A84C]/30 hover:border-[#C9A84C]/60">
                  Accéder à l&apos;interface PCB
                  <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                  </svg>
                </Link>
              </div>
            </div>
          </ScrollReveal>
        )}
        </div>
      </div>
    </div>
  );
}

