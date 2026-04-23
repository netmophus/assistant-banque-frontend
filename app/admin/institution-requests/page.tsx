'use client';

import { useEffect, useMemo, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import { apiClient } from '@/lib/api/client';
import { authApi } from '@/lib/api/auth';

// ── Types ───────────────────────────────────────────────────────────────
type Status =
  | 'pending'
  | 'contacted'
  | 'meeting_scheduled'
  | 'proposal_sent'
  | 'won'
  | 'lost';

interface InstitutionDemo {
  id: string;
  first_name: string;
  last_name: string;
  function: string;
  email: string;
  phone_country_code: string;
  phone_number: string;
  country: string;
  institution_name: string;
  institution_type: string;
  modules_interest: string[];
  estimated_users: string;
  message?: string | null;
  status: Status;
  admin_notes?: string | null;
  created_at?: string | null;
  contacted_at?: string | null;
  meeting_scheduled_at?: string | null;
  proposal_sent_at?: string | null;
  closed_at?: string | null;
}

const STATUS_LABELS: Record<Status, string> = {
  pending: 'En attente',
  contacted: 'Contactée',
  meeting_scheduled: 'RDV planifié',
  proposal_sent: 'Devis envoyé',
  won: 'Gagnée',
  lost: 'Perdue',
};

const STATUS_COLORS: Record<Status, { bg: string; text: string; border: string }> = {
  pending: { bg: 'bg-yellow-500/15', text: 'text-yellow-300', border: 'border-yellow-500/30' },
  contacted: { bg: 'bg-blue-500/15', text: 'text-blue-300', border: 'border-blue-500/30' },
  meeting_scheduled: { bg: 'bg-purple-500/15', text: 'text-purple-300', border: 'border-purple-500/30' },
  proposal_sent: { bg: 'bg-cyan-500/15', text: 'text-cyan-300', border: 'border-cyan-500/30' },
  won: { bg: 'bg-green-500/15', text: 'text-green-300', border: 'border-green-500/30' },
  lost: { bg: 'bg-red-500/15', text: 'text-red-300', border: 'border-red-500/30' },
};

const FUNCTION_LABELS: Record<string, string> = {
  dg: 'Direction Générale',
  drh: 'DRH',
  dsi: 'DSI',
  risques: 'Direction des Risques',
  credit: 'Direction du Crédit',
  conformite: 'Conformité',
  autre: 'Autre',
};

const INSTITUTION_TYPE_LABELS: Record<string, string> = {
  banque_commerciale: 'Banque commerciale',
  sfd: 'SFD',
  microfinance: 'Microfinance',
  assurance: "Compagnie d'assurance",
  autre: 'Autre',
};

const MODULE_LABELS: Record<string, string> = {
  credit: 'Analyse de crédit',
  impayes: 'Gestion des impayés',
  pcb: 'États financiers PCB UEMOA',
  all: 'Tous les modules',
};

const STATUS_FILTERS: { key: 'all' | Status; label: string }[] = [
  { key: 'all', label: 'Toutes' },
  { key: 'pending', label: 'En attente' },
  { key: 'contacted', label: 'Contactées' },
  { key: 'meeting_scheduled', label: 'RDV planifiés' },
  { key: 'proposal_sent', label: 'Devis envoyés' },
  { key: 'won', label: 'Gagnées' },
  { key: 'lost', label: 'Perdues' },
];

// ── Helpers ─────────────────────────────────────────────────────────────
function formatDate(iso?: string | null): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

// ── Page ────────────────────────────────────────────────────────────────
export default function AdminInstitutionRequestsPage() {
  const router = useRouter();
  const [items, setItems] = useState<InstitutionDemo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<'all' | Status>('all');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<InstitutionDemo | null>(null);

  useEffect(() => {
    const user = authApi.getCurrentUser();
    if (!user) {
      router.push('/login');
      return;
    }
    if (user.role !== 'superadmin') {
      router.push('/unauthorized');
    }
  }, [router]);

  const fetchItems = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const qs = statusFilter === 'all' ? '' : `?status=${statusFilter}`;
      const data = await apiClient.get<InstitutionDemo[]>(
        `/admin/institution-demos${qs}`,
      );
      setItems(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erreur de chargement');
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter(
      (r) =>
        r.email.toLowerCase().includes(q) ||
        r.first_name.toLowerCase().includes(q) ||
        r.last_name.toLowerCase().includes(q) ||
        r.institution_name.toLowerCase().includes(q),
    );
  }, [items, search]);

  const stats = useMemo(() => {
    const s: Record<Status | 'total', number> = {
      total: items.length,
      pending: 0,
      contacted: 0,
      meeting_scheduled: 0,
      proposal_sent: 0,
      won: 0,
      lost: 0,
    };
    for (const r of items) s[r.status]++;
    return s;
  }, [items]);

  return (
    <div className="min-h-screen flex flex-col bg-[#070E28] text-white">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-28 pb-16">
        <div className="mb-8">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <Link
                href="/m1/dashboard"
                className="inline-flex items-center gap-1 text-xs text-white/50 hover:text-[#C9A84C] mb-2 transition-colors"
              >
                ← Retour au dashboard
              </Link>
              <h1 className="text-2xl sm:text-3xl font-black text-white">
                Demandes de démonstration <span className="text-[#C9A84C]">B2B</span>
              </h1>
              <p className="text-sm text-white/60 mt-1">
                Gestion des demandes institution reçues via /tarifs
              </p>
            </div>
            <button
              type="button"
              onClick={fetchItems}
              disabled={loading}
              className="px-4 py-2 rounded-lg bg-[#1B3A8C] hover:bg-[#2E5BB8] text-white text-sm font-semibold disabled:opacity-50 transition-colors"
            >
              {loading ? 'Chargement…' : '↻ Rafraîchir'}
            </button>
          </div>
        </div>

        {/* Stats cards (7 cellules) */}
        <div className="grid grid-cols-2 sm:grid-cols-7 gap-3 mb-6">
          <StatCard label="Total" value={stats.total} color="white" />
          <StatCard label="En attente" value={stats.pending} color="#fde68a" />
          <StatCard label="Contactées" value={stats.contacted} color="#93c5fd" />
          <StatCard label="RDV" value={stats.meeting_scheduled} color="#d8b4fe" />
          <StatCard label="Devis" value={stats.proposal_sent} color="#67e8f9" />
          <StatCard label="Gagnées" value={stats.won} color="#86efac" />
          <StatCard label="Perdues" value={stats.lost} color="#fca5a5" />
        </div>

        {/* Filtres + search */}
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <div className="flex flex-wrap gap-2">
            {STATUS_FILTERS.map((f) => (
              <button
                key={f.key}
                type="button"
                onClick={() => setStatusFilter(f.key)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                  statusFilter === f.key
                    ? 'bg-[#C9A84C] text-[#0A1434] border-[#C9A84C]'
                    : 'bg-[#0F1E48] text-white/70 border-[#1B3A8C]/40 hover:border-[#C9A84C]/50'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
          <input
            type="text"
            placeholder="Rechercher institution, email ou nom…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 min-w-[200px] px-3 py-2 rounded-lg bg-[#0F1E48] border border-[#1B3A8C]/40 text-sm text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-[#C9A84C]/50"
          />
        </div>

        {error && (
          <div className="mb-4 px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-300 text-sm">
            ⚠ {error}
          </div>
        )}

        {/* Table */}
        <div className="rounded-2xl overflow-hidden bg-[#0F1E48] border border-[#1B3A8C]/30">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-[#0A1434] border-b border-[#1B3A8C]/30">
                  <th className="text-left px-4 py-3 font-semibold text-[10px] uppercase tracking-wider text-white/60">
                    Date
                  </th>
                  <th className="text-left px-4 py-3 font-semibold text-[10px] uppercase tracking-wider text-white/60">
                    Institution
                  </th>
                  <th className="text-left px-4 py-3 font-semibold text-[10px] uppercase tracking-wider text-white/60 hidden md:table-cell">
                    Contact
                  </th>
                  <th className="text-left px-4 py-3 font-semibold text-[10px] uppercase tracking-wider text-white/60 hidden lg:table-cell">
                    Pays
                  </th>
                  <th className="text-left px-4 py-3 font-semibold text-[10px] uppercase tracking-wider text-white/60 hidden lg:table-cell">
                    Effectif
                  </th>
                  <th className="text-left px-4 py-3 font-semibold text-[10px] uppercase tracking-wider text-white/60">
                    Statut
                  </th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {loading && items.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-12 text-white/40">
                      Chargement…
                    </td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-12 text-white/40">
                      Aucune demande{' '}
                      {statusFilter !== 'all' &&
                        `avec le statut "${STATUS_LABELS[statusFilter as Status]}"`}
                    </td>
                  </tr>
                ) : (
                  filtered.map((r) => {
                    const colors = STATUS_COLORS[r.status];
                    return (
                      <tr
                        key={r.id}
                        onClick={() => setSelected(r)}
                        className="border-b border-[#1B3A8C]/15 hover:bg-[#1B3A8C]/15 cursor-pointer transition-colors"
                      >
                        <td className="px-4 py-3 text-white/60 text-xs whitespace-nowrap">
                          {formatDate(r.created_at)}
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-semibold text-white">
                            {r.institution_name}
                          </div>
                          <div className="text-xs text-white/50">
                            {INSTITUTION_TYPE_LABELS[r.institution_type] ||
                              r.institution_type}
                          </div>
                        </td>
                        <td className="px-4 py-3 hidden md:table-cell">
                          <div className="text-white/90">
                            {r.first_name} {r.last_name}
                          </div>
                          <div className="text-xs text-white/50 truncate max-w-[200px]">
                            {r.email}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-white/70 hidden lg:table-cell">
                          {r.country}
                        </td>
                        <td className="px-4 py-3 hidden lg:table-cell">
                          <span className="text-xs font-semibold text-[#C9A84C]">
                            {r.estimated_users}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold border ${colors.bg} ${colors.text} ${colors.border}`}
                          >
                            {STATUS_LABELS[r.status]}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span className="text-xs text-white/40">→</span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        <p className="mt-4 text-xs text-white/40">
          {filtered.length} demande{filtered.length > 1 ? 's' : ''} affichée
          {filtered.length > 1 ? 's' : ''}
        </p>
      </main>

      <Footer />

      {selected && (
        <DetailModal
          request={selected}
          onClose={() => setSelected(null)}
          onUpdated={(updated) => {
            setItems((prev) =>
              prev.map((r) => (r.id === updated.id ? updated : r)),
            );
            setSelected(updated);
          }}
        />
      )}
    </div>
  );
}

// ── Subcomponents ───────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}) {
  return (
    <div className="px-4 py-3 rounded-xl bg-[#0F1E48] border border-[#1B3A8C]/30">
      <p className="text-[10px] font-bold uppercase tracking-wider text-white/50 mb-1">
        {label}
      </p>
      <p className="text-2xl font-black" style={{ color }}>
        {value}
      </p>
    </div>
  );
}

// ── Modale détail ───────────────────────────────────────────────────────
function DetailModal({
  request,
  onClose,
  onUpdated,
}: {
  request: InstitutionDemo;
  onClose: () => void;
  onUpdated: (r: InstitutionDemo) => void;
}) {
  const [notes, setNotes] = useState(request.admin_notes || '');
  const [busy, setBusy] = useState<Status | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    setNotes(request.admin_notes || '');
    setErr(null);
  }, [request.id, request.admin_notes]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !busy) onClose();
    };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [busy, onClose]);

  const updateStatus = async (newStatus: Status) => {
    setBusy(newStatus);
    setErr(null);
    try {
      const updated = await apiClient.patch<InstitutionDemo>(
        `/admin/institution-demos/${request.id}/status`,
        {
          status: newStatus,
          admin_notes: notes.trim() || null,
        },
      );
      onUpdated(updated);
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : 'Erreur de mise à jour');
    } finally {
      setBusy(null);
    }
  };

  const colors = STATUS_COLORS[request.status];
  const modules = (request.modules_interest || [])
    .map((m) => MODULE_LABELS[m] || m)
    .join(', ');

  const actions: { key: Status; label: string; style: string }[] = [
    { key: 'contacted', label: 'Marquer contactée', style: 'bg-blue-500 hover:bg-blue-600' },
    { key: 'meeting_scheduled', label: 'RDV planifié', style: 'bg-purple-500 hover:bg-purple-600' },
    { key: 'proposal_sent', label: 'Devis envoyé', style: 'bg-cyan-500 hover:bg-cyan-600' },
    { key: 'won', label: 'Marquer gagnée', style: 'bg-green-500 hover:bg-green-600' },
    { key: 'lost', label: 'Marquer perdue', style: 'bg-red-500 hover:bg-red-600' },
  ];

  return (
    <div
      role="dialog"
      aria-modal="true"
      onClick={() => !busy && onClose()}
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-2xl max-h-[92vh] overflow-hidden rounded-2xl bg-[#0F1E48] border border-[#C9A84C]/30 shadow-2xl flex flex-col"
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-4 px-6 py-5 border-b border-[#1B3A8C]/40 bg-[#0A1434]">
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#C9A84C]">
              {INSTITUTION_TYPE_LABELS[request.institution_type] ||
                request.institution_type}
            </p>
            <h2 className="text-lg font-black text-white leading-tight mt-0.5">
              {request.institution_name}
            </h2>
            <div className="flex items-center gap-2 mt-1">
              <span
                className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold border ${colors.bg} ${colors.text} ${colors.border}`}
              >
                {STATUS_LABELS[request.status]}
              </span>
              <span className="text-xs text-white/60">
                {request.country}
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={!!busy}
            aria-label="Fermer"
            className="flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center text-white/60 hover:text-white hover:bg-white/10 disabled:opacity-50"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {err && (
            <div className="px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-300 text-sm">
              ⚠ {err}
            </div>
          )}

          {/* Section Contact */}
          <div>
            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-[#C9A84C] mb-3">
              Contact
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-sm">
              <Info label="Nom">
                {request.first_name} {request.last_name}
              </Info>
              <Info label="Fonction">
                {FUNCTION_LABELS[request.function] || request.function}
              </Info>
              <Info label="Email">
                <a
                  href={`mailto:${request.email}`}
                  className="text-[#93C5FD] hover:underline break-all"
                >
                  {request.email}
                </a>
              </Info>
              <Info label="Téléphone">
                <a
                  href={`tel:${request.phone_country_code}${request.phone_number}`}
                  className="text-[#93C5FD] hover:underline"
                >
                  {request.phone_country_code} {request.phone_number}
                </a>
              </Info>
            </div>
          </div>

          {/* Section Besoin */}
          <div className="pt-2 border-t border-[#1B3A8C]/30">
            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-[#C9A84C] mb-3">
              Besoin exprimé
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-sm">
              <Info label="Effectif estimé">{request.estimated_users} utilisateurs</Info>
              <Info label="Modules d&apos;intérêt">
                <span className="text-[#C9A84C] font-semibold">{modules}</span>
              </Info>
            </div>
            {request.message && (
              <div className="mt-3 p-3 rounded-lg bg-[#0A1434] border border-[#1B3A8C]/40">
                <p className="text-[10px] font-bold uppercase tracking-wider text-white/40 mb-1">
                  Message du prospect
                </p>
                <p className="text-sm text-white/80 whitespace-pre-line">
                  {request.message}
                </p>
              </div>
            )}
          </div>

          {/* Section Timeline */}
          <div className="pt-2 border-t border-[#1B3A8C]/30">
            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-[#C9A84C] mb-3">
              Historique
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-sm">
              <Info label="Reçue le">{formatDate(request.created_at)}</Info>
              <Info label="Contactée le">{formatDate(request.contacted_at)}</Info>
              <Info label="RDV planifié le">{formatDate(request.meeting_scheduled_at)}</Info>
              <Info label="Devis envoyé le">{formatDate(request.proposal_sent_at)}</Info>
              <Info label="Clôturée le">{formatDate(request.closed_at)}</Info>
            </div>
          </div>

          {/* Notes admin */}
          <div className="pt-2 border-t border-[#1B3A8C]/30">
            <label className="block text-xs font-semibold text-white/70 mb-1.5 uppercase tracking-wider">
              Notes internes
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="Ajoutez une note (enregistrée au prochain changement de statut)…"
              className="w-full px-3 py-2.5 rounded-lg bg-[#0A1434] border border-[#1B3A8C]/60 text-sm text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-[#C9A84C]/50"
            />
          </div>

          {/* Actions */}
          <div>
            <p className="text-xs font-semibold text-white/70 mb-2 uppercase tracking-wider">
              Changer le statut
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {actions.map((a) => (
                <button
                  key={a.key}
                  type="button"
                  onClick={() => updateStatus(a.key)}
                  disabled={!!busy || request.status === a.key}
                  className={`px-4 py-2.5 rounded-lg text-white font-semibold text-sm transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${a.style}`}
                >
                  {busy === a.key ? 'En cours…' : a.label}
                </button>
              ))}
            </div>
            <p className="mt-2 text-[11px] text-white/40">
              Les notes ci-dessus seront enregistrées avec le changement.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function Info({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[10px] font-bold uppercase tracking-wider text-white/40 mb-0.5">
        {label}
      </p>
      <div className="text-white">{children}</div>
    </div>
  );
}
