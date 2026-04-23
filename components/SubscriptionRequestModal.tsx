'use client';

import { useEffect, useState } from 'react';

// ── Types ─────────────────────────────────────────────────────────────────
export type PlanKey = 'monthly' | 'semester' | 'annual';

const PLAN_LABELS: Record<PlanKey, string> = {
  monthly: 'Mensuelle (7 500 FCFA / mois)',
  semester: 'Semestrielle (35 000 FCFA / 6 mois)',
  annual: 'Annuelle (60 000 FCFA / an)',
};

const UEMOA_COUNTRIES = [
  'Bénin',
  'Burkina Faso',
  "Côte d'Ivoire",
  'Guinée-Bissau',
  'Mali',
  'Niger',
  'Sénégal',
  'Togo',
] as const;

// ── Props ─────────────────────────────────────────────────────────────────
type Props = {
  isOpen: boolean;
  initialPlan: PlanKey;
  onClose: () => void;
};

type Status = 'idle' | 'submitting' | 'success' | 'error';
type FieldErrors = Partial<Record<string, string>>;

type FormState = {
  first_name: string;
  last_name: string;
  email: string;
  phone_country_code: string;
  phone_number: string;
  country: string;
  city: string;
  professional_status: 'student' | 'working';
  institution: string;
  plan_requested: PlanKey;
};

const initialFormState = (plan: PlanKey): FormState => ({
  first_name: '',
  last_name: '',
  email: '',
  phone_country_code: '+227',
  phone_number: '',
  country: 'Niger',
  city: '',
  professional_status: 'student',
  institution: '',
  plan_requested: plan,
});

// ── Component ─────────────────────────────────────────────────────────────
export function SubscriptionRequestModal({ isOpen, initialPlan, onClose }: Props) {
  const [form, setForm] = useState<FormState>(initialFormState(initialPlan));
  const [status, setStatus] = useState<Status>('idle');
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  // Reset à chaque ouverture avec le plan initial
  useEffect(() => {
    if (isOpen) {
      setForm(initialFormState(initialPlan));
      setStatus('idle');
      setGlobalError(null);
      setFieldErrors({});
    }
  }, [isOpen, initialPlan]);

  // Fermer avec ESC + lock body scroll
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && status !== 'submitting') onClose();
    };
    document.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [isOpen, status, onClose]);

  if (!isOpen) return null;

  const update = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (fieldErrors[key as string]) {
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next[key as string];
        return next;
      });
    }
  };

  const validateClient = (): boolean => {
    const errors: FieldErrors = {};
    if (!form.first_name.trim()) errors.first_name = 'Prénom requis';
    if (!form.last_name.trim()) errors.last_name = 'Nom requis';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errors.email = 'Email invalide';
    if (!/^\+\d{1,4}$/.test(form.phone_country_code.trim())) {
      errors.phone_country_code = 'Format +XXX';
    }
    if (form.phone_number.replace(/\D/g, '').length < 6) {
      errors.phone_number = 'Minimum 6 chiffres';
    }
    if (!form.city.trim()) errors.city = 'Ville requise';
    if (form.professional_status === 'working' && !form.institution.trim()) {
      errors.institution = "L'institution est requise pour un professionnel";
    }
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setGlobalError(null);
    if (!validateClient()) return;

    setStatus('submitting');

    try {
      const payload = {
        ...form,
        email: form.email.trim().toLowerCase(),
        first_name: form.first_name.trim(),
        last_name: form.last_name.trim(),
        city: form.city.trim(),
        institution: form.institution.trim() || null,
        phone_number: form.phone_number.replace(/\s/g, ''),
      };

      const res = await fetch('/api/subscription-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        if (res.status === 422 && Array.isArray(data?.detail)) {
          // Pydantic validation errors: [{loc, msg, type}, ...]
          const errs: FieldErrors = {};
          for (const err of data.detail) {
            const field = err?.loc?.[err.loc.length - 1];
            if (field && typeof field === 'string') {
              errs[field] = err?.msg || 'Valeur invalide';
            }
          }
          setFieldErrors(errs);
          setGlobalError('Veuillez corriger les champs en rouge.');
        } else if (res.status === 500) {
          setGlobalError(
            "Une erreur est survenue. Contactez-nous directement sur WhatsApp.",
          );
        } else {
          setGlobalError(
            typeof data?.detail === 'string'
              ? data.detail
              : `Erreur ${res.status}`,
          );
        }
        setStatus('error');
        return;
      }

      setStatus('success');
    } catch (err) {
      setGlobalError(
        'Erreur de connexion. Vérifiez votre réseau et réessayez.',
      );
      setStatus('error');
    }
  };

  // ── Rendu ────────────────────────────────────────────────────────────────
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="subscription-modal-title"
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
      onClick={() => status !== 'submitting' && onClose()}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-lg max-h-[90vh] overflow-hidden rounded-2xl bg-[#0F1E48] border border-[#C9A84C]/30 shadow-2xl shadow-[#1B3A8C]/50 flex flex-col"
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-4 px-6 py-5 border-b border-[#1B3A8C]/40 bg-[#0A1434]">
          <div className="flex-1 min-w-0">
            <h2
              id="subscription-modal-title"
              className="text-base sm:text-lg font-black text-white leading-tight"
            >
              {status === 'success'
                ? '✓ Demande envoyée'
                : 'Demande d\u2019abonnement'}
            </h2>
            {status !== 'success' && (
              <p className="text-xs text-[#C9A84C] mt-1 font-semibold">
                Offre {PLAN_LABELS[form.plan_requested]}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={status === 'submitting'}
            aria-label="Fermer"
            className="flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center text-white/60 hover:text-white hover:bg-white/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg
              className="w-5 h-5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* ═══════════ Success screen ═══════════ */}
        {status === 'success' ? (
          <div className="flex-1 overflow-y-auto px-6 py-8 text-center">
            <div className="w-16 h-16 mx-auto mb-5 rounded-full bg-green-500/15 border border-green-500/30 flex items-center justify-center">
              <svg
                className="w-8 h-8 text-green-400"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={3}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
            <h3 className="text-lg font-black text-white mb-3">
              Demande envoyée avec succès !
            </h3>
            <p className="text-sm text-white/75 leading-relaxed mb-2">
              Merci <strong className="text-[#C9A84C]">{form.first_name}</strong>,
              nous avons bien reçu votre demande pour l&apos;offre{' '}
              <strong className="text-white">
                {PLAN_LABELS[form.plan_requested]}
              </strong>
              .
            </p>
            <p className="text-sm text-white/60 leading-relaxed mb-8">
              Notre équipe vous contactera sous 24h au{' '}
              <strong className="text-white">
                {form.phone_country_code} {form.phone_number}
              </strong>{' '}
              ou par email à{' '}
              <strong className="text-white break-all">{form.email}</strong>{' '}
              pour finaliser votre abonnement.
            </p>
            <button
              type="button"
              onClick={onClose}
              className="inline-flex items-center justify-center px-8 py-3 rounded-xl bg-[#C9A84C] text-[#0A1434] font-bold text-sm hover:bg-[#E8D08A] transition-colors"
            >
              Fermer
            </button>
          </div>
        ) : (
          // ═══════════ Form ═══════════
          <form
            onSubmit={handleSubmit}
            className="flex-1 overflow-y-auto px-6 py-5 space-y-4"
          >
            {globalError && (
              <div className="px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-300 text-sm">
                ⚠ {globalError}
              </div>
            )}

            {/* Prénom + Nom */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <LabeledInput
                label="Prénom"
                value={form.first_name}
                onChange={(v) => update('first_name', v)}
                error={fieldErrors.first_name}
                autoComplete="given-name"
                required
              />
              <LabeledInput
                label="Nom"
                value={form.last_name}
                onChange={(v) => update('last_name', v)}
                error={fieldErrors.last_name}
                autoComplete="family-name"
                required
              />
            </div>

            {/* Email */}
            <LabeledInput
              label="Email"
              type="email"
              value={form.email}
              onChange={(v) => update('email', v)}
              error={fieldErrors.email}
              autoComplete="email"
              required
            />

            {/* Téléphone */}
            <div className="grid grid-cols-3 gap-3">
              <LabeledInput
                label="Indicatif"
                value={form.phone_country_code}
                onChange={(v) => update('phone_country_code', v)}
                error={fieldErrors.phone_country_code}
                required
              />
              <div className="col-span-2">
                <LabeledInput
                  label="Téléphone"
                  type="tel"
                  value={form.phone_number}
                  onChange={(v) => update('phone_number', v)}
                  error={fieldErrors.phone_number}
                  autoComplete="tel"
                  required
                  placeholder="96 00 00 00"
                />
              </div>
            </div>

            {/* Pays + Ville */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-white/70 mb-1.5 uppercase tracking-wider">
                  Pays <span className="text-red-400">*</span>
                </label>
                <select
                  value={form.country}
                  onChange={(e) => update('country', e.target.value)}
                  className={`w-full px-3 py-2.5 rounded-lg bg-[#0A1434] border text-sm text-white focus:outline-none focus:ring-2 focus:ring-[#C9A84C]/50 ${
                    fieldErrors.country
                      ? 'border-red-500/60'
                      : 'border-[#1B3A8C]/60 hover:border-[#1B3A8C]'
                  }`}
                >
                  {UEMOA_COUNTRIES.map((c) => (
                    <option key={c} value={c} className="bg-[#0A1434]">
                      {c}
                    </option>
                  ))}
                </select>
                {fieldErrors.country && (
                  <p className="mt-1 text-xs text-red-400">
                    {fieldErrors.country}
                  </p>
                )}
              </div>
              <LabeledInput
                label="Ville"
                value={form.city}
                onChange={(v) => update('city', v)}
                error={fieldErrors.city}
                required
                placeholder="Niamey"
              />
            </div>

            {/* Statut professionnel */}
            <div>
              <label className="block text-xs font-semibold text-white/70 mb-1.5 uppercase tracking-wider">
                Vous êtes <span className="text-red-400">*</span>
              </label>
              <div className="grid grid-cols-2 gap-3">
                <StatusRadio
                  label="Étudiant·e"
                  value="student"
                  checked={form.professional_status === 'student'}
                  onChange={() => {
                    update('professional_status', 'student');
                    // Nettoyer institution et son erreur
                    update('institution', '');
                    if (fieldErrors.institution) {
                      setFieldErrors((prev) => {
                        const next = { ...prev };
                        delete next.institution;
                        return next;
                      });
                    }
                  }}
                />
                <StatusRadio
                  label="Professionnel·le"
                  value="working"
                  checked={form.professional_status === 'working'}
                  onChange={() => update('professional_status', 'working')}
                />
              </div>
            </div>

            {/* Institution (conditionnel) */}
            {form.professional_status === 'working' && (
              <LabeledInput
                label="Institution / Employeur"
                value={form.institution}
                onChange={(v) => update('institution', v)}
                error={fieldErrors.institution}
                placeholder="Banque, ministère, cabinet…"
                required
              />
            )}

            {/* Plan (modifiable) */}
            <div>
              <label className="block text-xs font-semibold text-white/70 mb-1.5 uppercase tracking-wider">
                Offre choisie <span className="text-red-400">*</span>
              </label>
              <select
                value={form.plan_requested}
                onChange={(e) =>
                  update('plan_requested', e.target.value as PlanKey)
                }
                className="w-full px-3 py-2.5 rounded-lg bg-[#0A1434] border border-[#1B3A8C]/60 hover:border-[#1B3A8C] text-sm text-white focus:outline-none focus:ring-2 focus:ring-[#C9A84C]/50"
              >
                <option value="monthly" className="bg-[#0A1434]">
                  {PLAN_LABELS.monthly}
                </option>
                <option value="semester" className="bg-[#0A1434]">
                  {PLAN_LABELS.semester}
                </option>
                <option value="annual" className="bg-[#0A1434]">
                  {PLAN_LABELS.annual}
                </option>
              </select>
            </div>

            {/* Submit */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={status === 'submitting'}
                className="w-full flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-[#C9A84C] text-[#0A1434] font-bold text-sm hover:bg-[#E8D08A] transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {status === 'submitting' ? (
                  <>
                    <span className="w-4 h-4 border-2 border-[#0A1434]/30 border-t-[#0A1434] rounded-full animate-spin" />
                    Envoi en cours…
                  </>
                ) : (
                  'Envoyer ma demande'
                )}
              </button>
              <p className="mt-3 text-[11px] text-white/40 text-center">
                En soumettant, vous acceptez d&apos;être contacté sous 24h
                pour finaliser votre abonnement.
              </p>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

// ── Helpers internes ──────────────────────────────────────────────────────

type InputProps = {
  label: string;
  value: string;
  onChange: (v: string) => void;
  error?: string;
  type?: string;
  placeholder?: string;
  autoComplete?: string;
  required?: boolean;
};

function LabeledInput({
  label,
  value,
  onChange,
  error,
  type = 'text',
  placeholder,
  autoComplete,
  required,
}: InputProps) {
  return (
    <div>
      <label className="block text-xs font-semibold text-white/70 mb-1.5 uppercase tracking-wider">
        {label}
        {required && <span className="text-red-400"> *</span>}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete={autoComplete}
        className={`w-full px-3 py-2.5 rounded-lg bg-[#0A1434] border text-sm text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-[#C9A84C]/50 ${
          error ? 'border-red-500/60' : 'border-[#1B3A8C]/60 hover:border-[#1B3A8C]'
        }`}
      />
      {error && <p className="mt-1 text-xs text-red-400">{error}</p>}
    </div>
  );
}

type RadioProps = {
  label: string;
  value: string;
  checked: boolean;
  onChange: () => void;
};

function StatusRadio({ label, checked, onChange }: RadioProps) {
  return (
    <button
      type="button"
      onClick={onChange}
      className={`px-4 py-3 rounded-lg border text-sm font-semibold transition-all ${
        checked
          ? 'bg-[#C9A84C]/15 border-[#C9A84C] text-[#C9A84C]'
          : 'bg-[#0A1434] border-[#1B3A8C]/60 text-white/70 hover:border-[#1B3A8C] hover:text-white'
      }`}
    >
      {label}
    </button>
  );
}
