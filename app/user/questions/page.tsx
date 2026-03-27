'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api/client';
import { authApi } from '@/lib/api/auth';
import ScrollReveal from '@/components/home/ScrollReveal';

// ---------------------------------------------------------------------------
// FormattedAnswer
// ---------------------------------------------------------------------------
function FormattedAnswer({ answer }: { answer: string }) {
  const formatAnswer = (text: string) => {
    const elements: React.ReactElement[] = [];
    const lines = text.split('\n');
    let currentParagraph: string[] = [];
    let currentList: string[] = [];
    let currentListType: 'bullet' | 'ordered' = 'bullet';
    let inCodeBlock = false;
    let codeBlockContent: string[] = [];
    let keyIndex = 0;

    const cleanInline = (t: string) =>
      t
        .replace(/\*\*(.*?)\*\*/g, '<strong style="font-weight:700;color:#ffffff">$1</strong>')
        .replace(/\*(.*?)\*/g, '<em style="font-style:italic;color:#CBD5E1">$1</em>')
        .replace(/`(.*?)`/g, '<code style="padding:0.1em 0.4em;background:rgba(201,168,76,0.12);border-radius:4px;color:#C9A84C;font-size:0.82em;font-family:monospace">$1</code>');

    const flushParagraph = () => {
      if (currentParagraph.length > 0) {
        const para = currentParagraph.join(' ').trim();
        if (para) elements.push(
          <p key={keyIndex++} className="text-white/80 leading-relaxed mb-3 text-sm" dangerouslySetInnerHTML={{ __html: cleanInline(para) }} />
        );
        currentParagraph = [];
      }
    };

    const flushList = () => {
      if (currentList.length > 0) {
        const items = currentList.map((item, idx) => {
          const cleaned = cleanInline(item.replace(/^[-•*]\s+/, '').replace(/^\d+\.\s+/, ''));
          return <li key={idx} className="mb-1 flex items-start gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-[#C9A84C] mt-1.5 flex-shrink-0" />
            <span dangerouslySetInnerHTML={{ __html: cleaned }} />
          </li>;
        });
        if (currentListType === 'ordered') {
          elements.push(<ol key={keyIndex++} className="space-y-1 my-3 text-white/80 text-sm ml-2 list-decimal list-inside">{items}</ol>);
        } else {
          elements.push(<ul key={keyIndex++} className="space-y-1 my-3 text-white/80 text-sm ml-2">{items}</ul>);
        }
        currentList = [];
        currentListType = 'bullet';
      }
    };

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line.startsWith('```')) {
        if (inCodeBlock) {
          if (codeBlockContent.length > 0) elements.push(
            <div key={keyIndex++} className="my-3 p-3 bg-[#0A1434] rounded-xl border border-[#1B3A8C]/30 overflow-x-auto">
              <pre className="text-xs text-white/80 whitespace-pre-wrap"><code>{codeBlockContent.join('\n')}</code></pre>
            </div>
          );
          codeBlockContent = []; inCodeBlock = false;
        } else { flushParagraph(); flushList(); inCodeBlock = true; }
        continue;
      }
      if (inCodeBlock) { codeBlockContent.push(line); continue; }
      if (line.match(/^#{1,6}\s+/)) {
        flushParagraph(); flushList();
        const level = line.match(/^#+/)?.[0].length || 1;
        const title = line.replace(/^#+\s+/, '').replace(/\*\*(.*?)\*\*/g, '$1');
        if (level <= 2) elements.push(
          <h3 key={keyIndex++} className="text-base font-black text-white mt-5 mb-2 flex items-center gap-2">
            <span className="w-3 h-px bg-[#C9A84C]" />{title}
          </h3>
        );
        else elements.push(<h4 key={keyIndex++} className="text-sm font-bold text-[#C9A84C] mt-3 mb-1.5">{title}</h4>);
        continue;
      }
      if (!line) { flushParagraph(); flushList(); continue; }
      if (line.match(/^[-•*]\s+/)) {
        if (currentListType === 'ordered' && currentList.length > 0) flushList();
        flushParagraph(); currentListType = 'bullet'; currentList.push(line); continue;
      }
      if (line.match(/^\d+\.\s+/)) {
        if (currentListType === 'bullet' && currentList.length > 0) flushList();
        flushParagraph(); currentListType = 'ordered'; currentList.push(line); continue;
      }
      if (line.match(/^(💡|🔍|📌|Exemple|Ex:|Note:|Important:|Attention:|⚠|ℹ)/i)) {
        flushParagraph(); flushList();
        const rawLabel = line.match(/^(💡|🔍|📌|Exemple|Ex:|Note:|Important:|Attention:|⚠️?|ℹ️?)/i)?.[0] || '💡';
        let content = line.replace(/^(💡|🔍|📌|Exemple|Ex:|Note:|Important:|Attention:|⚠️?|ℹ️?)\s*:?\s*/i, '').trim();
        const isImportant = /Important|Attention|⚠/i.test(rawLabel);
        const isNote = /Note|ℹ/i.test(rawLabel);
        elements.push(
          <div key={keyIndex++} className={`my-3 p-3 rounded-xl border-l-4 text-sm ${
            isImportant ? 'bg-orange-500/8 border-orange-500 text-orange-200'
            : isNote ? 'bg-[#1B3A8C]/20 border-[#1B3A8C] text-white/80'
            : 'bg-[#C9A84C]/8 border-[#C9A84C] text-white/80'
          }`}>
            <p className={`text-xs font-bold mb-1 uppercase tracking-wider ${isImportant ? 'text-orange-400' : isNote ? 'text-[#60a5fa]' : 'text-[#C9A84C]'}`}>
              {rawLabel.replace(/[💡🔍📌⚠️ℹ️]/g, '').trim() || 'Note'}
            </p>
            {content && <div dangerouslySetInnerHTML={{ __html: cleanInline(content) }} />}
          </div>
        );
        continue;
      }
      currentParagraph.push(line);
    }
    flushParagraph(); flushList();
    if (elements.length === 0) {
      const cleaned = answer.replace(/^#{1,6}\s+/gm, '').replace(/\*\*(.*?)\*\*/g, '<strong style="font-weight:700;color:#fff">$1</strong>');
      return <p className="text-white/80 leading-relaxed text-sm whitespace-pre-wrap" dangerouslySetInnerHTML={{ __html: cleaned }} />;
    }
    return elements;
  };
  return <div className="space-y-0.5">{formatAnswer(answer)}</div>;
}

// ---------------------------------------------------------------------------
// Types & constants
// ---------------------------------------------------------------------------
interface Question {
  id: string;
  question: string;
  answer: string | null;
  status: 'pending' | 'answered' | 'error';
  created_at: string;
  answered_at: string | null;
}

interface QuotaStats {
  user_id: string;
  current_month: string;
  questions_asked: number;
  quota_limit: number;
  remaining_quota: number;
  is_quota_exceeded: boolean;
}

const QUICK_QUESTIONS = [
  "Ratio de solvabilité BCEAO ?",
  "Comment classer les créances douteuses ?",
  "Obligations KYC en UMOA ?",
  "Calcul du Produit Net Bancaire ?",
  "Procédure de recouvrement d'impayés ?",
  "Exigences fonds propres Tier 1 ?",
];

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------
export default function QuestionsPage() {
  const router = useRouter();
  const [question, setQuestion] = useState('');
  const [context, setContext] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [quotaStats, setQuotaStats] = useState<QuotaStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedAnswers, setExpandedAnswers] = useState<Record<string, boolean>>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'answered' | 'pending' | 'error'>('all');
  const answerRef = useRef<HTMLDivElement>(null);
  const questionTextareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const user = authApi.getCurrentUser();
    if (!user || user.role !== 'user') { router.push('/login'); return; }
    fetchData();
  }, [router]);

  useEffect(() => {
    if (currentQuestion?.answer && answerRef.current) {
      answerRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [currentQuestion?.answer]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') { e.preventDefault(); questionTextareaRef.current?.focus(); }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [questionsData, quotaData] = await Promise.all([
        apiClient.get<Question[]>('/questions/my-questions?limit=50'),
        apiClient.get<QuotaStats>('/questions/quota'),
      ]);
      setQuestions(questionsData);
      setQuotaStats(quotaData);
    } catch (err: any) {
      setError(err.message || 'Erreur lors du chargement');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim()) return;
    setIsSubmitting(true); setError(null); setCurrentQuestion(null);
    try {
      const newQuestion = await apiClient.post<Question>('/questions', {
        question: question.trim(),
        context: context.trim() || undefined,
      });
      setCurrentQuestion(newQuestion);
      setExpandedAnswers(prev => ({ ...prev, [newQuestion.id]: true }));
      setQuestion(''); setContext('');
      if (newQuestion.status === 'pending') pollQuestionStatus(newQuestion.id);
      await fetchData();
    } catch (err: any) {
      setError(err.message || "Erreur lors de l'envoi");
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
        const updatedQuestions = await apiClient.get<Question[]>('/questions/my-questions?limit=50');
        const q = updatedQuestions.find(q => q.id === questionId);
        if (q) {
          setCurrentQuestion(q);
          if (q.answer || q.status !== 'pending') {
            setIsSubmitting(false); isPolling = false;
            if (pollTimeout) clearTimeout(pollTimeout);
            await fetchData(); return;
          }
        }
        attempts++;
        if (attempts < maxAttempts && isPolling) pollTimeout = setTimeout(poll, 2000);
        else { setIsSubmitting(false); isPolling = false; if (pollTimeout) clearTimeout(pollTimeout); }
      } catch { setIsSubmitting(false); isPolling = false; if (pollTimeout) clearTimeout(pollTimeout); }
    };
    pollTimeout = setTimeout(poll, 2000);
    return () => { isPolling = false; if (pollTimeout) clearTimeout(pollTimeout); };
  };

  const filteredQuestions = questions.filter(q => {
    const matchesSearch = q.question.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = filterStatus === 'all' || q.status === filterStatus;
    return matchesSearch && matchesFilter;
  });

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center">
          <div className="relative w-14 h-14 mx-auto mb-4">
            <div className="absolute inset-0 border-2 border-[#1B3A8C]/30 rounded-full" />
            <div className="absolute inset-0 border-2 border-transparent border-t-[#C9A84C] rounded-full animate-spin" />
          </div>
          <p className="text-white/70 text-sm font-medium">Chargement…</p>
        </div>
      </div>
    );
  }

  const quotaPercentage = quotaStats ? Math.min(100, (quotaStats.questions_asked / quotaStats.quota_limit) * 100) : 0;
  const quotaColor = quotaStats?.is_quota_exceeded ? '#ef4444' : quotaPercentage >= 80 ? '#f97316' : '#C9A84C';

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-4">

      {/* ── Hero ── */}
      <ScrollReveal direction="down" delay={0}>
        <div className="relative rounded-3xl overflow-hidden mb-6" style={{ borderTop: '2px solid rgba(27,58,140,0.4)', borderRight: '2px solid rgba(27,58,140,0.4)', borderBottom: '2px solid rgba(27,58,140,0.4)', borderLeft: '4px solid #C9A84C', background: 'linear-gradient(135deg, #070E28 0%, #0F1E48 60%, #0A1434 100%)' }}>
          {/* Glows */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-[#1B3A8C]/20 rounded-full blur-[80px] pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-[#C9A84C]/6 rounded-full blur-[60px] pointer-events-none" />
          {/* Gold top line */}
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#C9A84C]/50 to-transparent" />

          <div className="relative z-10 p-6 sm:p-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
              {/* Left: title */}
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-[#1B3A8C] border border-[#C9A84C]/25 flex items-center justify-center shadow-lg shadow-[#1B3A8C]/30 flex-shrink-0">
                  <svg className="w-6 h-6 text-[#C9A84C]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                  </svg>
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[#C9A84C]">Fahimta AI</span>
                    <span className="w-1 h-1 rounded-full bg-[#C9A84C]/50" />
                    <span className="text-[10px] font-semibold text-white/50 uppercase tracking-wider">Base de connaissances</span>
                  </div>
                  <h1 className="text-2xl sm:text-3xl font-black text-white">Questions & Réponses</h1>
                  <p className="text-sm text-white/60 mt-0.5">Réglementation bancaire UMOA · Analyses · Conformité</p>
                </div>
              </div>

              {/* Right: quota card */}
              {quotaStats && (
                <div className="sm:w-64 p-4 rounded-2xl flex-shrink-0" style={{ background: 'rgba(15,30,72,0.7)', borderTop: `2px solid ${quotaColor}40`, borderRight: `2px solid ${quotaColor}40`, borderBottom: `2px solid ${quotaColor}40`, borderLeft: `3px solid ${quotaColor}` }}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-white/70">Quota mensuel</span>
                    {quotaStats.is_quota_exceeded && (
                      <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-red-500/15 border border-red-500/30 text-red-400">DÉPASSÉ</span>
                    )}
                  </div>
                  <div className="flex items-end gap-1 mb-2">
                    <span className="text-2xl font-black" style={{ color: quotaColor }}>{quotaStats.questions_asked}</span>
                    <span className="text-white/40 text-sm mb-0.5">/ {quotaStats.quota_limit}</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-white/8 overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-700" style={{ width: `${quotaPercentage}%`, background: `linear-gradient(90deg, ${quotaColor}90, ${quotaColor})` }} />
                  </div>
                  {!quotaStats.is_quota_exceeded && (
                    <p className="text-[10px] text-white/45 mt-1.5">{quotaStats.remaining_quota} questions restantes</p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </ScrollReveal>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* ── Colonne principale ── */}
        <div className="lg:col-span-2 space-y-5">

          {/* Formulaire */}
          <ScrollReveal direction="up" delay={100}>
            <div className="rounded-3xl overflow-hidden" style={{ borderTop: '2px solid rgba(27,58,140,0.4)', borderRight: '2px solid rgba(27,58,140,0.4)', borderBottom: '2px solid rgba(27,58,140,0.4)', borderLeft: '4px solid #1B3A8C', background: '#070E28', boxShadow: '0 0 28px rgba(27,58,140,0.12)' }}>
              {/* Header */}
              <div className="px-6 py-4 border-b border-[#1B3A8C]/20 flex items-center justify-between" style={{ background: 'rgba(27,58,140,0.08)' }}>
                <div className="flex items-center gap-2.5">
                  <svg className="w-4 h-4 text-[#C9A84C]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  <h2 className="text-base font-black text-white">Posez votre question</h2>
                </div>
                <span className="text-[10px] text-white/35 bg-white/5 border border-white/8 px-2 py-0.5 rounded-lg">Ctrl+K</span>
              </div>

              <div className="p-6">
                {/* Questions rapides */}
                <div className="mb-5">
                  <p className="text-[10px] font-black uppercase tracking-[0.15em] text-[#C9A84C] mb-2.5">Questions rapides</p>
                  <div className="flex flex-wrap gap-1.5">
                    {QUICK_QUESTIONS.map((q, i) => (
                      <button key={i} onClick={() => { setQuestion(q); questionTextareaRef.current?.focus(); }}
                        disabled={isSubmitting || quotaStats?.is_quota_exceeded}
                        className="px-3 py-1.5 text-xs rounded-xl border border-[#1B3A8C]/30 text-white/65 hover:text-white hover:border-[#C9A84C]/40 hover:bg-[#1B3A8C]/20 transition-all duration-200 disabled:opacity-40"
                        style={{ background: 'rgba(27,58,140,0.1)' }}
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Error */}
                {error && (
                  <div className="mb-4 p-3 rounded-xl border border-red-500/25 bg-red-500/8 flex items-start gap-2.5 text-sm text-red-300">
                    <svg className="w-4 h-4 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    {error}
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-white/80 mb-1.5 uppercase tracking-wider">Votre question *</label>
                    <textarea
                      ref={questionTextareaRef}
                      value={question}
                      onChange={e => setQuestion(e.target.value)}
                      placeholder="Ex : Quel est le ratio de solvabilité minimum exigé par la BCEAO ?"
                      required rows={4}
                      disabled={isSubmitting || quotaStats?.is_quota_exceeded}
                      className="w-full px-4 py-3 text-sm text-white placeholder-white/30 rounded-2xl resize-none focus:outline-none transition-all duration-200"
                      style={{ background: 'rgba(15,30,72,0.6)', border: '2px solid rgba(27,58,140,0.35)', borderRadius: '0.875rem' }}
                      onFocus={e => { e.target.style.borderColor = 'rgba(201,168,76,0.5)'; e.target.style.boxShadow = '0 0 0 3px rgba(201,168,76,0.08)'; }}
                      onBlur={e => { e.target.style.borderColor = 'rgba(27,58,140,0.35)'; e.target.style.boxShadow = 'none'; }}
                    />
                    <p className="text-[10px] text-white/30 mt-1">{question.length} caractères</p>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-white/80 mb-1.5 uppercase tracking-wider">Contexte <span className="text-white/35 normal-case font-normal">(optionnel)</span></label>
                    <textarea
                      value={context}
                      onChange={e => setContext(e.target.value)}
                      placeholder="Précisions supplémentaires pour affiner la réponse…"
                      rows={2} disabled={isSubmitting}
                      className="w-full px-4 py-3 text-sm text-white placeholder-white/30 rounded-2xl resize-none focus:outline-none transition-all duration-200"
                      style={{ background: 'rgba(15,30,72,0.6)', border: '2px solid rgba(27,58,140,0.25)', borderRadius: '0.875rem' }}
                      onFocus={e => { e.target.style.borderColor = 'rgba(201,168,76,0.4)'; }}
                      onBlur={e => { e.target.style.borderColor = 'rgba(27,58,140,0.25)'; }}
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting || !question.trim() || quotaStats?.is_quota_exceeded}
                    className="w-full py-3.5 rounded-2xl text-white font-bold text-sm flex items-center justify-center gap-2.5 transition-all duration-300 disabled:opacity-40 disabled:cursor-not-allowed hover:scale-[1.01]"
                    style={{ background: isSubmitting ? 'rgba(27,58,140,0.6)' : 'linear-gradient(135deg, #1B3A8C 0%, #2e5bb8 50%, #C9A84C 100%)', boxShadow: '0 4px 20px rgba(27,58,140,0.3)' }}
                  >
                    {isSubmitting ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Traitement en cours…
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                        Poser la question à Fahimta AI
                      </>
                    )}
                  </button>
                </form>
              </div>
            </div>
          </ScrollReveal>

          {/* Réponse */}
          {currentQuestion && (
            <ScrollReveal direction="up" delay={0}>
              <div ref={answerRef} className="rounded-3xl overflow-hidden" style={{ borderTop: '2px solid rgba(201,168,76,0.35)', borderRight: '2px solid rgba(201,168,76,0.35)', borderBottom: '2px solid rgba(201,168,76,0.35)', borderLeft: '4px solid #C9A84C', background: '#070E28', boxShadow: '0 0 28px rgba(201,168,76,0.08)' }}>
                {/* Header réponse */}
                <div className="px-6 py-4 border-b flex items-center justify-between" style={{ borderColor: 'rgba(201,168,76,0.15)', background: 'rgba(201,168,76,0.05)' }}>
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-xl bg-[#C9A84C]/15 border border-[#C9A84C]/25 flex items-center justify-center">
                      <svg className="w-3.5 h-3.5 text-[#C9A84C]" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/></svg>
                    </div>
                    <h2 className="text-sm font-black text-white">Réponse de Fahimta AI</h2>
                    {currentQuestion.status === 'answered' && currentQuestion.answer && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-green-500/12 border border-green-500/25 text-green-400">✓ Répondu</span>
                    )}
                  </div>
                  {currentQuestion.status === 'pending' && !currentQuestion.answer && isSubmitting && (
                    <div className="flex items-center gap-2 text-xs text-[#C9A84C]">
                      <div className="w-3.5 h-3.5 border-2 border-[#C9A84C]/30 border-t-[#C9A84C] rounded-full animate-spin" />
                      Analyse en cours…
                    </div>
                  )}
                  {currentQuestion.status === 'answered' && currentQuestion.answer && (
                    <button
                      onClick={() => setExpandedAnswers(prev => ({ ...prev, [currentQuestion.id]: !(prev[currentQuestion.id] ?? true) }))}
                      className="text-xs text-white/50 hover:text-white px-3 py-1.5 rounded-xl border border-white/10 hover:border-white/20 transition-all"
                    >
                      {expandedAnswers[currentQuestion.id] ?? true ? 'Masquer' : 'Afficher'}
                    </button>
                  )}
                </div>

                <div className="p-6">
                  {/* Question affichée */}
                  <div className="mb-4 p-4 rounded-2xl border" style={{ background: 'rgba(27,58,140,0.12)', borderColor: 'rgba(27,58,140,0.25)' }}>
                    <p className="text-[10px] font-black uppercase tracking-wider text-[#1B3A8C] mb-1.5">Question</p>
                    <p className="text-white/85 text-sm leading-relaxed">{currentQuestion.question}</p>
                  </div>

                  {/* Réponse */}
                  {currentQuestion.status === 'answered' && currentQuestion.answer && (expandedAnswers[currentQuestion.id] ?? true) && (
                    <div className="p-4 rounded-2xl border" style={{ background: 'rgba(15,30,72,0.5)', borderColor: 'rgba(201,168,76,0.15)' }}>
                      <div className="flex items-center gap-2 mb-3 pb-2 border-b" style={{ borderColor: 'rgba(201,168,76,0.15)' }}>
                        <span className="w-5 h-5 rounded-full bg-[#C9A84C]/15 border border-[#C9A84C]/25 flex items-center justify-center text-[8px] font-black text-[#C9A84C]">FA</span>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-[#C9A84C]">Fahimta AI</span>
                      </div>
                      <FormattedAnswer answer={currentQuestion.answer} />
                    </div>
                  )}

                  {currentQuestion.status === 'error' && (
                    <div className="p-4 rounded-2xl bg-red-500/8 border border-red-500/25 text-red-300 text-sm flex items-start gap-2.5">
                      <svg className="w-4 h-4 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                      Une erreur est survenue. Veuillez réessayer.
                    </div>
                  )}
                </div>
              </div>
            </ScrollReveal>
          )}
        </div>

        {/* ── Sidebar Historique ── */}
        <div className="lg:col-span-1">
          <ScrollReveal direction="up" delay={200}>
            <div className="rounded-3xl overflow-hidden sticky top-24" style={{ borderTop: '2px solid rgba(27,58,140,0.4)', borderRight: '2px solid rgba(27,58,140,0.4)', borderBottom: '2px solid rgba(27,58,140,0.4)', borderLeft: '4px solid #1B3A8C', background: '#070E28', boxShadow: '0 0 24px rgba(27,58,140,0.12)' }}>
              {/* Header */}
              <div className="px-5 py-4 border-b flex items-center justify-between" style={{ borderColor: 'rgba(27,58,140,0.2)', background: 'rgba(27,58,140,0.08)' }}>
                <div className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-[#C9A84C]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <h2 className="text-sm font-black text-white">Historique</h2>
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-[#1B3A8C]/30 border border-[#1B3A8C]/30 text-[#C9A84C]">{questions.length}</span>
                </div>
                <button onClick={fetchData} className="w-7 h-7 rounded-lg border border-[#1B3A8C]/30 flex items-center justify-center text-white/50 hover:text-white hover:border-[#C9A84C]/30 transition-all" title="Rafraîchir">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                </button>
              </div>

              {/* Search & filters */}
              <div className="p-4 border-b space-y-3" style={{ borderColor: 'rgba(27,58,140,0.15)' }}>
                <div className="relative">
                  <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/35" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                  <input
                    type="text" placeholder="Rechercher…" value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-xs text-white placeholder-white/30 rounded-xl border focus:outline-none transition-all"
                    style={{ background: 'rgba(15,30,72,0.6)', borderColor: 'rgba(27,58,140,0.3)' }}
                  />
                </div>
                <div className="flex gap-1.5 flex-wrap">
                  {([
                    { key: 'all', label: 'Tous' },
                    { key: 'answered', label: '✓' },
                    { key: 'pending', label: '⏳' },
                    { key: 'error', label: '✗' },
                  ] as const).map(f => (
                    <button key={f.key} onClick={() => setFilterStatus(f.key)}
                      className="px-2.5 py-1 text-[10px] font-bold rounded-lg border transition-all"
                      style={{
                        background: filterStatus === f.key ? '#1B3A8C' : 'rgba(27,58,140,0.1)',
                        borderColor: filterStatus === f.key ? '#1B3A8C' : 'rgba(27,58,140,0.25)',
                        color: filterStatus === f.key ? '#ffffff' : 'rgba(255,255,255,0.55)',
                      }}
                    >
                      {f.label === 'Tous' ? 'Tous' : f.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* List */}
              <div className="max-h-[500px] overflow-y-auto p-3 space-y-2" style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(27,58,140,0.4) transparent' }}>
                {filteredQuestions.length === 0 ? (
                  <div className="text-center py-10">
                    <div className="w-12 h-12 rounded-2xl bg-[#1B3A8C]/15 border border-[#1B3A8C]/20 flex items-center justify-center mx-auto mb-3">
                      <svg className="w-5 h-5 text-white/30" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" /></svg>
                    </div>
                    <p className="text-xs text-white/40">{searchQuery || filterStatus !== 'all' ? 'Aucun résultat' : 'Aucune question posée'}</p>
                  </div>
                ) : (
                  filteredQuestions.map(q => {
                    const isActive = currentQuestion?.id === q.id;
                    const statusColor = q.status === 'answered' ? '#22c55e' : q.status === 'pending' ? '#f97316' : '#ef4444';
                    return (
                      <button key={q.id}
                        onClick={() => { setCurrentQuestion(q); if (expandedAnswers[q.id] === undefined) setExpandedAnswers(prev => ({ ...prev, [q.id]: true })); }}
                        className="w-full text-left p-3.5 rounded-2xl transition-all duration-200"
                        style={{
                          background: isActive ? 'rgba(27,58,140,0.25)' : 'rgba(15,30,72,0.4)',
                          borderTop: '1px solid ' + (isActive ? 'rgba(201,168,76,0.35)' : 'rgba(27,58,140,0.2)'),
                          borderRight: '1px solid ' + (isActive ? 'rgba(201,168,76,0.35)' : 'rgba(27,58,140,0.2)'),
                          borderBottom: '1px solid ' + (isActive ? 'rgba(201,168,76,0.35)' : 'rgba(27,58,140,0.2)'),
                          borderLeft: isActive ? '3px solid #C9A84C' : '1px solid rgba(27,58,140,0.2)',
                        }}
                      >
                        <p className="text-xs font-semibold text-white/85 line-clamp-2 leading-snug mb-2">{q.question}</p>
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] text-white/35">
                            {new Date(q.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                          </span>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full border" style={{ color: statusColor, borderColor: `${statusColor}30`, background: `${statusColor}10` }}>
                            {q.status === 'answered' ? '✓ Répondu' : q.status === 'pending' ? '⏳ En cours' : '✗ Erreur'}
                          </span>
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          </ScrollReveal>
        </div>

      </div>
    </div>
  );
}
