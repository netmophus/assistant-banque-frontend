'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

// ── Constantes ────────────────────────────────────────────────────────────
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

const FUNCTIONS = [
  { value: 'dg', label: 'Direction Générale' },
  { value: 'drh', label: 'DRH' },
  { value: 'dsi', label: 'DSI' },
  { value: 'risques', label: 'Direction des Risques' },
  { value: 'credit', label: 'Direction du Crédit' },
  { value: 'conformite', label: 'Conformité' },
  { value: 'autre', label: 'Autre' },
] as const;

const INSTITUTION_TYPES = [
  { value: 'banque_commerciale', label: 'Banque commerciale' },
  { value: 'sfd', label: 'SFD' },
  { value: 'microfinance', label: 'Microfinance' },
  { value: 'assurance', label: "Compagnie d'assurance" },
  { value: 'autre', label: 'Autre' },
] as const;

const ESTIMATED_USERS = [
  { value: '1-10', label: '1 à 10 utilisateurs' },
  { value: '11-50', label: '11 à 50 utilisateurs' },
  { value: '51-200', label: '51 à 200 utilisateurs' },
  { value: '200+', label: 'Plus de 200 utilisateurs' },
] as const;

const MODULES = [
  { value: 'credit', label: 'Analyse de crédit' },
  { value: 'impayes', label: 'Gestion des impayés' },
  { value: 'pcb', label: 'États financiers PCB UEMOA' },
  { value: 'all', label: 'Tous les modules' },
] as const;

// ── Types ─────────────────────────────────────────────────────────────────
type FunctionKey = (typeof FUNCTIONS)[number]['value'];
type InstitutionTypeKey = (typeof INSTITUTION_TYPES)[number]['value'];
type EstimatedUsersKey = (typeof ESTIMATED_USERS)[number]['value'];

type Props = {
  isOpen: boolean;
  onClose: () => void;
};

type Status = 'idle' | 'submitting' | 'success' | 'error';
type FieldErrors = Partial<Record<string, string>>;

type FormState = {
  first_name: string;
  last_name: string;
  function: FunctionKey;
  email: string;
  phone_country_code: string;
  phone_number: string;
  country: string;
  institution_name: string;
  institution_type: InstitutionTypeKey;
  modules_interest: string[];
  estimated_users: EstimatedUsersKey;
  message: string;
};

const initialFormState = (): FormState => ({
  first_name: '',
  last_name: '',
  function: 'dg',
  email: '',
  phone_country_code: '+227',
  phone_number: '',
  country: 'Niger',
  institution_name: '',
  institution_type: 'banque_commerciale',
  modules_interest: [],
  estimated_users: '11-50',
  message: '',
});

// ── Component ─────────────────────────────────────────────────────────────
export function InstitutionDemoModal({ isOpen, onClose }: Props) {
  const [form, setForm] = useState<FormState>(initialFormState());
  const [status, setStatus] = useState<Status>('idle');
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  useEffect(() => {
    if (isOpen) {
      setForm(initialFormState());
      setStatus('idle');
      setGlobalError(null);
      setFieldErrors({});
    }
  }, [isOpen]);

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

  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!isOpen || !mounted) return null;

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

  const toggleModule = (module: string) => {
    setForm((prev) => {
      // Si "all" est cliqué, vide tout sauf "all". Si autre cliqué, retire "all".
      if (module === 'all') {
        return {
          ...prev,
          modules_interest: prev.modules_interest.includes('all') ? [] : ['all'],
        };
      }
      const without_all = prev.modules_interest.filter((m) => m !== 'all');
      const next = without_all.includes(module)
        ? without_all.filter((m) => m !== module)
        : [...without_all, module];
      return { ...prev, modules_interest: next };
    });
    if (fieldErrors.modules_interest) {
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next.modules_interest;
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
    if (!form.institution_name.trim()) {
      errors.institution_name = "Nom de l'institution requis";
    }
    if (form.modules_interest.length === 0) {
      errors.modules_interest = 'Sélectionnez au moins un module';
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
        institution_name: form.institution_name.trim(),
        phone_number: form.phone_number.replace(/\s/g, ''),
        message: form.message.trim() || null,
      };

      const res = await fetch('/api/institution-demos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        if (res.status === 422 && Array.isArray(data?.detail)) {
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
            'Une erreur est survenue. Contactez-nous directement sur WhatsApp.',
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
    } catch {
      setGlobalError(
        'Erreur de connexion. Vérifiez votre réseau et réessayez.',
      );
      setStatus('error');
    }
  };

  // ── Rendu (portal dans <body>) ──────────────────────────────────────────
  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="institution-demo-modal-title"
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
      onClick={() => status !== 'submitting' && onClose()}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-xl max-h-[92vh] overflow-hidden rounded-2xl bg-[#0F1E48] border border-[#C9A84C]/30 shadow-2xl shadow-[#1B3A8C]/50 flex flex-col"
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-4 px-6 py-5 border-b border-[#1B3A8C]/40 bg-[#0A1434]">
          <div className="flex-1 min-w-0">
            <h2
              id="institution-demo-modal-title"
              className="text-base sm:text-lg font-black text-white leading-tight"
            >
              {status === 'success'
                ? '✓ Demande envoyée'
                : 'Demande de démonstration'}
            </h2>
            {status !== 'success' && (
              <p className="text-xs text-[#C9A84C] mt-1 font-semibold">
                Modules institutionnels Miznas Pilot
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
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* ═══════════ Success screen ═══════════ */}
        {status === 'success' ? (
          <div className="flex-1 overflow-y-auto px-6 py-8 text-center">
            <div className="w-16 h-16 mx-auto mb-5 rounded-full bg-green-500/15 border border-green-500/30 flex items-center justify-center">
              <svg className="w-8 h-8 text-green-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h3 className="text-lg font-black text-white mb-3">
              Demande envoyée avec succès !
            </h3>
            <p className="text-sm text-white/75 leading-relaxed mb-2">
              Merci <strong className="text-[#C9A84C]">{form.first_name}</strong>,
              nous avons bien reçu votre demande pour{' '}
              <strong className="text-white">{form.institution_name}</strong>.
            </p>
            <p className="text-sm text-white/60 leading-relaxed mb-8">
              Notre équipe vous contactera sous{' '}
              <strong className="text-white">48h</strong> au{' '}
              <strong className="text-white">
                {form.phone_country_code} {form.phone_number}
              </strong>{' '}
              ou par email à{' '}
              <strong className="text-white break-all">{form.email}</strong>{' '}
              pour planifier la démonstration.
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

            {/* Section : INSTITUTION */}
            <div>
              <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-[#C9A84C] mb-3">
                Votre institution
              </h3>
              <div className="space-y-3">
                <LabeledInput
                  label="Nom de l'institution"
                  value={form.institution_name}
                  onChange={(v) => update('institution_name', v)}
                  error={fieldErrors.institution_name}
                  placeholder="Ex : BSIC Niger, Crédit du Sahel…"
                  required
                />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <LabeledSelect
                    label="Type d'institution"
                    value={form.institution_type}
                    onChange={(v) =>
                      update('institution_type', v as InstitutionTypeKey)
                    }
                    options={INSTITUTION_TYPES}
                    required
                  />
                  <LabeledSelect
                    label="Pays"
                    value={form.country}
                    onChange={(v) => update('country', v)}
                    options={UEMOA_COUNTRIES.map((c) => ({ value: c, label: c }))}
                    error={fieldErrors.country}
                    required
                  />
                </div>

                <LabeledSelect
                  label="Effectif estimé d'utilisateurs"
                  value={form.estimated_users}
                  onChange={(v) =>
                    update('estimated_users', v as EstimatedUsersKey)
                  }
                  options={ESTIMATED_USERS}
                  required
                />

                {/* Modules d'intérêt — multi */}
                <div>
                  <label className="block text-xs font-semibold text-white/70 mb-2 uppercase tracking-wider">
                    Modules d&apos;intérêt <span className="text-red-400">*</span>
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {MODULES.map((m) => {
                      const checked = form.modules_interest.includes(m.value);
                      return (
                        <button
                          key={m.value}
                          type="button"
                          onClick={() => toggleModule(m.value)}
                          className={`flex items-center gap-2 px-3 py-2.5 rounded-lg border text-sm font-medium transition-all text-left ${
                            checked
                              ? 'bg-[#C9A84C]/15 border-[#C9A84C] text-[#C9A84C]'
                              : 'bg-[#0A1434] border-[#1B3A8C]/60 text-white/70 hover:border-[#1B3A8C] hover:text-white'
                          }`}
                        >
                          <span
                            className={`w-4 h-4 flex-shrink-0 rounded border flex items-center justify-center ${
                              checked
                                ? 'bg-[#C9A84C] border-[#C9A84C]'
                                : 'border-white/30'
                            }`}
                          >
                            {checked && (
                              <svg className="w-3 h-3 text-[#0A1434]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={4}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                              </svg>
                            )}
                          </span>
                          <span>{m.label}</span>
                        </button>
                      );
                    })}
                  </div>
                  {fieldErrors.modules_interest && (
                    <p className="mt-1 text-xs text-red-400">
                      {fieldErrors.modules_interest}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Section : CONTACT */}
            <div className="pt-3 border-t border-[#1B3A8C]/30">
              <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-[#C9A84C] mb-3">
                Votre contact
              </h3>
              <div className="space-y-3">
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

                <LabeledSelect
                  label="Fonction"
                  value={form.function}
                  onChange={(v) => update('function', v as FunctionKey)}
                  options={FUNCTIONS}
                  required
                />

                <LabeledInput
                  label="Email professionnel"
                  type="email"
                  value={form.email}
                  onChange={(v) => update('email', v)}
                  error={fieldErrors.email}
                  autoComplete="email"
                  required
                />

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
              </div>
            </div>

            {/* Section : MESSAGE */}
            <div className="pt-3 border-t border-[#1B3A8C]/30">
              <label className="block text-xs font-semibold text-white/70 mb-1.5 uppercase tracking-wider">
                Message (optionnel)
              </label>
              <textarea
                value={form.message}
                onChange={(e) => update('message', e.target.value)}
                rows={3}
                maxLength={2000}
                placeholder="Contexte, contraintes, calendrier, questions…"
                className="w-full px-3 py-2.5 rounded-lg bg-[#0A1434] border border-[#1B3A8C]/60 hover:border-[#1B3A8C] text-sm text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-[#C9A84C]/50 resize-none"
              />
              <p className="mt-1 text-[10px] text-white/30 text-right">
                {form.message.length} / 2000
              </p>
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
                  'Envoyer ma demande de démo'
                )}
              </button>
              <p className="mt-3 text-[11px] text-white/40 text-center">
                En soumettant, vous acceptez d&apos;être contacté sous 48h
                pour planifier la démonstration.
              </p>
            </div>
          </form>
        )}
      </div>
    </div>,
    document.body,
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

type SelectProps = {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: ReadonlyArray<{ value: string; label: string }>;
  error?: string;
  required?: boolean;
};

function LabeledSelect({
  label,
  value,
  onChange,
  options,
  error,
  required,
}: SelectProps) {
  return (
    <div>
      <label className="block text-xs font-semibold text-white/70 mb-1.5 uppercase tracking-wider">
        {label}
        {required && <span className="text-red-400"> *</span>}
      </label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`w-full px-3 py-2.5 rounded-lg bg-[#0A1434] border text-sm text-white focus:outline-none focus:ring-2 focus:ring-[#C9A84C]/50 ${
          error ? 'border-red-500/60' : 'border-[#1B3A8C]/60 hover:border-[#1B3A8C]'
        }`}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value} className="bg-[#0A1434]">
            {opt.label}
          </option>
        ))}
      </select>
      {error && <p className="mt-1 text-xs text-red-400">{error}</p>}
    </div>
  );
}
