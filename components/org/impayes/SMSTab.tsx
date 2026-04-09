'use client';

import React, { useState, useEffect } from 'react';
import { useResponsive } from '@/hooks/useResponsive';
import Pagination from '@/components/common/Pagination';

interface SMSMessage {
  id: string;
  message_id: string;
  to: string;
  linked_credit: string;
  body: string;
  status: 'PENDING' | 'SENT' | 'FAILED';
  created_at?: string;
  sent_at?: string;
  error_message?: string;
}

interface SMSStats {
  pending: number;
  sent: number;
  failed: number;
  total: number;
}

const STATUS_CONFIG = {
  PENDING: { label: 'En attente', color: 'text-amber-400',  bg: 'bg-amber-500/10',  border: 'border-amber-500/25',  dot: 'bg-amber-400' },
  SENT:    { label: 'Envoyé',     color: 'text-emerald-400',bg: 'bg-emerald-500/10', border: 'border-emerald-500/25', dot: 'bg-emerald-400' },
  FAILED:  { label: 'Échoué',     color: 'text-red-400',    bg: 'bg-red-500/10',     border: 'border-red-500/25',     dot: 'bg-red-400' },
};

const SMSTab = () => {
  const { isMobile }  = useResponsive();
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');
  const [availableDates, setAvailableDates]         = useState<string[]>([]);
  const [selectedDateSituation, setSelectedDateSituation] = useState('');
  const [smsFilter, setSmsFilter]                   = useState('');
  const [smsStats, setSmsStats]                     = useState<SMSStats>({ pending: 0, sent: 0, failed: 0, total: 0 });
  const [allMessages, setAllMessages]               = useState<SMSMessage[]>([]);
  const [allMessagesTotal, setAllMessagesTotal]     = useState(0);
  const [allMessagesPage, setAllMessagesPage]       = useState(1);
  const allMessagesLimit = 20;

  const getAuthHeaders = (): HeadersInit => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    return { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) };
  };

  useEffect(() => { loadAvailableDates(); loadSmsStats(); }, []);
  useEffect(() => { loadAllMessages(); }, [allMessagesPage, smsFilter]);

  const loadAvailableDates = async () => {
    try {
      const r = await fetch('/api/impayes/dates-situation', { headers: getAuthHeaders() });
      if (r.ok) {
        const d = await r.json();
        const dates = d.dates || [];
        setAvailableDates(dates);
        if (dates.length > 0) setSelectedDateSituation(dates[0]);
      }
    } catch {}
  };

  const loadSmsStats = async () => {
    try {
      const r = await fetch('/api/impayes/messages/stats', { headers: getAuthHeaders() });
      if (r.ok) {
        const d = await r.json();
        setSmsStats({ pending: d.pending || 0, sent: d.sent || 0, failed: d.failed || 0, total: d.total || 0 });
      }
    } catch {}
  };

  const loadAllMessages = async () => {
    setLoading(true); setError('');
    try {
      const p = new URLSearchParams({ limit: allMessagesLimit.toString(), skip: ((allMessagesPage - 1) * allMessagesLimit).toString() });
      if (smsFilter) p.append('status', smsFilter);
      const r = await fetch(`/api/impayes/messages/all?${p}`, { headers: getAuthHeaders() });
      if (!r.ok) throw new Error('Erreur chargement messages');
      const d = await r.json();
      setAllMessages(d.data || d || []);
      setAllMessagesTotal(d.total || (d.data || d).length);
    } catch (e: any) {
      setError(e.message || 'Erreur chargement');
    } finally {
      setLoading(false);
    }
  };

  const handleSendSMS = async () => {
    const totalPending = smsStats.pending || allMessages.filter(m => m.status === 'PENDING').length;
    if (totalPending === 0) { alert('Aucun message en attente'); return; }
    if (!window.confirm(`Voulez-vous envoyer ${totalPending} SMS en attente ?`)) return;
    setLoading(true);
    try {
      const r = await fetch('/api/impayes/messages/send', { method: 'POST', headers: getAuthHeaders() });
      if (!r.ok) { const e = await r.json().catch(() => ({})); throw new Error(e.detail || 'Erreur envoi'); }
      const d = await r.json();
      let msg = d.message || 'SMS envoyés avec succès';
      if (d.errors_detail?.length > 0) { msg += '\n\nErreurs:\n' + d.errors_detail.slice(0, 5).join('\n'); if (d.errors_detail.length > 5) msg += `\n... et ${d.errors_detail.length - 5} autres`; }
      alert(msg); loadSmsStats(); loadAllMessages();
    } catch (e: any) { alert('Erreur: ' + (e.message || 'Erreur envoi')); }
    finally { setLoading(false); }
  };

  const handleRegenerateSMS = async () => {
    if (!selectedDateSituation) { alert('Veuillez sélectionner une date de situation'); return; }
    if (!window.confirm(`Régénérer les SMS pour le ${selectedDateSituation} ?\n\nLes SMS existants (non envoyés) seront conservés.`)) return;
    setLoading(true);
    try {
      const r = await fetch(`/api/impayes/messages/regenerate?date_situation=${selectedDateSituation}`, { method: 'POST', headers: getAuthHeaders() });
      if (!r.ok) { const e = await r.json().catch(() => ({})); throw new Error(e.detail || 'Erreur régénération'); }
      const d = await r.json(); alert(d.message || 'SMS régénérés'); loadSmsStats(); loadAllMessages();
    } catch (e: any) { alert('Erreur: ' + e.message); }
    finally { setLoading(false); }
  };

  const handleDeleteMessage = async (messageId: string) => {
    if (!window.confirm('Supprimer ce SMS ?')) return;
    setLoading(true);
    try {
      const r = await fetch(`/api/impayes/messages/${messageId}`, { method: 'DELETE', headers: getAuthHeaders() });
      if (!r.ok) { const e = await r.json().catch(() => ({})); throw new Error(e.detail || 'Erreur suppression'); }
      alert('SMS supprimé'); loadSmsStats(); loadAllMessages();
    } catch (e: any) { alert('Erreur: ' + e.message); }
    finally { setLoading(false); }
  };

  const handleBulkDelete = async () => {
    const totalToDelete = smsFilter ? (smsFilter === 'PENDING' ? smsStats.pending : smsFilter === 'SENT' ? smsStats.sent : smsStats.failed) : smsStats.total;
    if (totalToDelete === 0) { alert('Aucun SMS à supprimer'); return; }
    const filterLabel = smsFilter === 'PENDING' ? 'en attente' : smsFilter === 'SENT' ? 'envoyés' : smsFilter === 'FAILED' ? 'échoués' : 'tous';
    if (!window.confirm(`Supprimer TOUS les SMS ${filterLabel} (${totalToDelete}) ?`)) return;
    setLoading(true);
    try {
      const p = new URLSearchParams(); p.append('status', smsFilter || 'ALL');
      const r = await fetch(`/api/impayes/messages/bulk-delete?${p}`, { method: 'POST', headers: getAuthHeaders() });
      if (!r.ok) { const e = await r.json().catch(() => ({})); throw new Error(e.detail || 'Erreur'); }
      const d = await r.json(); alert(d.message || 'SMS supprimés'); loadSmsStats(); loadAllMessages();
    } catch (e: any) { alert('Erreur: ' + e.message); }
    finally { setLoading(false); }
  };

  const filteredMessages = smsFilter ? allMessages.filter(m => m.status === smsFilter) : allMessages;
  const totalPending = smsStats.pending || allMessages.filter(m => m.status === 'PENDING').length;
  const totalToDelete = smsFilter ? (smsFilter === 'PENDING' ? smsStats.pending : smsFilter === 'SENT' ? smsStats.sent : smsStats.failed) : smsStats.total;

  return (
    <div className="space-y-5">

      {/* ── KPI Cards ───────────────────────────────────────────────────────── */}
      <div className={`grid gap-4 ${isMobile ? 'grid-cols-2' : 'grid-cols-4'}`}>
        {[
          { label: 'En attente', value: smsStats.pending, accent: '#f59e0b', border: 'border-amber-500/20',   glow: 'from-amber-500/8' },
          { label: 'Envoyés',    value: smsStats.sent,    accent: '#22c55e', border: 'border-emerald-500/20', glow: 'from-emerald-500/8' },
          { label: 'Échoués',    value: smsStats.failed,  accent: '#ef4444', border: 'border-red-500/20',     glow: 'from-red-500/8' },
          { label: 'Total',      value: smsStats.total || allMessagesTotal, accent: '#3b82f6', border: 'border-blue-500/20', glow: 'from-blue-500/8' },
        ].map(k => (
          <div key={k.label} className={`relative overflow-hidden rounded-2xl border ${k.border} bg-gradient-to-br ${k.glow} to-transparent p-5`}>
            <div className="absolute -right-4 -top-4 h-20 w-20 rounded-full opacity-15" style={{ background: k.accent, filter: 'blur(20px)' }} />
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">{k.label}</p>
            <p className="mt-1 text-2xl font-black tabular-nums" style={{ color: k.accent }}>{k.value}</p>
            <p className="mt-0.5 text-[11px] text-slate-500">messages</p>
          </div>
        ))}
      </div>

      {/* ── Barre d'actions ─────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
        <select
          value={smsFilter}
          onChange={e => { setSmsFilter(e.target.value); setAllMessagesPage(1); }}
          className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white cursor-pointer focus:outline-none focus:border-[#d32f2f]/40 transition-all"
        >
          <option value="" className="bg-[#0f1629]">Tous les SMS</option>
          <option value="PENDING" className="bg-[#0f1629]">En attente</option>
          <option value="SENT" className="bg-[#0f1629]">Envoyés</option>
          <option value="FAILED" className="bg-[#0f1629]">Échoués</option>
        </select>

        {selectedDateSituation && (
          <button onClick={handleRegenerateSMS} disabled={loading}
            className="flex items-center gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-2 text-xs font-bold text-amber-400 hover:bg-amber-500/20 disabled:opacity-50 transition-all">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
            {loading ? 'Régénération…' : 'Régénérer SMS'}
          </button>
        )}

        {totalPending > 0 && (
          <button onClick={handleSendSMS} disabled={loading}
            className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-700 px-4 py-2 text-xs font-bold text-white hover:opacity-90 disabled:opacity-50 transition-all">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
            {loading ? 'Envoi…' : `Envoyer ${totalPending} SMS`}
          </button>
        )}

        {totalToDelete > 0 && (
          <button onClick={handleBulkDelete} disabled={loading}
            className="flex items-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-2 text-xs font-bold text-red-400 hover:bg-red-500/20 disabled:opacity-50 transition-all ml-auto">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
            {loading ? 'Suppression…' : `Supprimer${smsFilter ? ` (${smsFilter === 'PENDING' ? 'en attente' : smsFilter === 'SENT' ? 'envoyés' : 'échoués'})` : ' tout'} (${totalToDelete})`}
          </button>
        )}
      </div>

      {/* ── Erreur ──────────────────────────────────────────────────────────── */}
      {error && (
        <div className="flex items-center gap-3 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">{error}</div>
      )}

      {/* ── Table SMS ───────────────────────────────────────────────────────── */}
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur-md overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
          <div>
            <h3 className="text-sm font-bold text-white">
              {smsFilter === 'PENDING' ? 'SMS en attente' : smsFilter === 'SENT' ? 'SMS envoyés' : smsFilter === 'FAILED' ? 'SMS échoués' : 'Tous les SMS'}
            </h3>
            <p className="text-[11px] text-slate-500 mt-0.5">{allMessagesTotal} message{allMessagesTotal > 1 ? 's' : ''}</p>
          </div>
          {loading && (
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-[#d32f2f]/30 border-t-[#d32f2f]" />
              Actualisation…
            </div>
          )}
        </div>

        {loading && filteredMessages.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-slate-400">
            <div className="mb-4 h-10 w-10 animate-spin rounded-full border-[3px] border-[#d32f2f]/20 border-t-[#d32f2f]" />
            <p className="text-sm">Chargement…</p>
          </div>
        ) : filteredMessages.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-slate-400">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-white/5">
              <svg className="w-6 h-6 opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" /></svg>
            </div>
            <p className="text-sm font-semibold text-slate-300">Aucun SMS trouvé</p>
            {smsFilter === 'PENDING' && (
              <p className="mt-2 max-w-xs text-center text-xs text-slate-500">
                Les SMS sont générés automatiquement lors de l'import si le client a un numéro valide et qu'un modèle est configuré.
              </p>
            )}
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/5">
                    {['Statut','Destinataire','Crédit','Message','Date','Erreur','Action'].map(h => (
                      <th key={h} className="bg-white/[0.02] px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-slate-500">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredMessages.map((msg, idx) => {
                    const sc = STATUS_CONFIG[msg.status];
                    return (
                      <tr key={msg.id} className={`border-b border-white/[0.03] transition-colors hover:bg-white/[0.04] ${idx % 2 !== 0 ? 'bg-white/[0.015]' : ''}`}>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[11px] font-semibold ${sc.bg} ${sc.color} ${sc.border}`}>
                            <span className={`h-1.5 w-1.5 rounded-full ${sc.dot}`} />
                            {sc.label}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-mono text-xs text-slate-300">{msg.to}</td>
                        <td className="px-4 py-3">
                          <span className="rounded-md border border-white/10 bg-white/5 px-2 py-0.5 font-mono text-[11px] font-semibold text-white/80">{msg.linked_credit}</span>
                        </td>
                        <td className="px-4 py-3 max-w-xs">
                          <p className="text-[10px] text-slate-500 mb-1">{msg.body?.length || 0} car.</p>
                          <div className="max-h-24 overflow-y-auto rounded-lg border border-white/5 bg-white/[0.03] p-2 text-xs text-slate-300 leading-relaxed whitespace-pre-wrap break-words">
                            {msg.body || '—'}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-400 whitespace-nowrap">
                          <div>{msg.created_at ? new Date(msg.created_at).toLocaleDateString('fr-FR') : '—'}</div>
                          {msg.sent_at && <div className="text-[10px] text-slate-600 mt-0.5">{new Date(msg.sent_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</div>}
                        </td>
                        <td className="px-4 py-3 max-w-[120px] truncate text-xs text-red-400">
                          {msg.error_message || <span className="text-slate-700">—</span>}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {msg.status === 'SENT' ? (
                            <span className="text-[11px] text-slate-600">Archivé</span>
                          ) : (
                            <button
                              onClick={() => handleDeleteMessage(msg.message_id)}
                              disabled={loading}
                              className="rounded-lg border border-red-500/25 bg-red-500/10 px-2.5 py-1 text-[11px] font-semibold text-red-400 hover:bg-red-500/20 disabled:opacity-50 transition-colors"
                            >
                              Supprimer
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {allMessagesTotal > allMessagesLimit && (
              <div className="border-t border-white/5 px-5 py-3">
                <Pagination
                  currentPage={allMessagesPage}
                  totalItems={allMessagesTotal}
                  itemsPerPage={allMessagesLimit}
                  currentItemsCount={filteredMessages.length}
                  onPageChange={p => { setAllMessagesPage(p); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default SMSTab;
