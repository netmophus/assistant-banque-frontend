'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import { apiClient } from '@/lib/api/client';

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token') || '';

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!token) setError('Lien invalide. Veuillez refaire une demande.');
  }, [token]);

  const strength = password.length === 0 ? 0 : password.length < 6 ? 1 : password.length < 10 ? 2 : 3;
  const strengthLabel = ['', 'Faible', 'Moyen', 'Fort'][strength];
  const strengthColor = ['', '#EF4444', '#F59E0B', '#10B981'][strength];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password.length < 8) return setError('Minimum 8 caractères.');
    if (password !== confirm) return setError('Les mots de passe ne correspondent pas.');
    setIsLoading(true);
    try {
      await apiClient.post('/auth/reset-password', { token, password });
      setSuccess(true);
      setTimeout(() => router.push('/login'), 3000);
    } catch (err: any) {
      setError(err.response?.data?.detail || err.message || 'Une erreur est survenue.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col overflow-hidden" style={{ backgroundColor: 'var(--bg)' }}>
      <Navbar />

      <div className="flex-1 flex items-center justify-center px-4 pt-8 pb-4">
        <div className="w-full max-w-md mx-auto mt-12 md:mt-16">

          {/* Card */}
          <div className="relative backdrop-blur-lg rounded-[28px] p-8 sm:p-10 shadow-2xl"
            style={{ background: 'linear-gradient(to right, var(--card), var(--primary)/10, var(--card))', boxShadow: 'var(--glow) 0px 25px 50px -12px' }}>
            <div className="absolute inset-0 rounded-[28px] border-2" style={{ borderColor: 'var(--primary)/40' }} />
            <div className="absolute inset-[2px] rounded-[26px] border-2" style={{ borderColor: 'var(--accent)/40' }} />

            <div className="relative z-10">
              {success ? (
                /* ── Succès ── */
                <div className="text-center py-4">
                  <div className="w-16 h-16 rounded-full bg-green-500/15 border-2 border-green-500 flex items-center justify-center mx-auto mb-5">
                    <svg className="w-8 h-8 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <h2 className="text-2xl font-black text-white mb-2">Mot de passe mis à jour !</h2>
                  <p className="text-sm mb-6" style={{ color: 'var(--muted)' }}>
                    Vous allez être redirigé vers la page de connexion…
                  </p>
                  <Link href="/login"
                    className="inline-block px-6 py-3 rounded-xl text-sm font-bold text-[#0A1434] bg-[#C9A84C] hover:bg-[#E8D08A] transition-colors">
                    Se connecter →
                  </Link>
                </div>
              ) : (
                /* ── Formulaire ── */
                <>
                  <h2 className="text-2xl sm:text-3xl font-black mb-2" style={{ color: 'var(--text)' }}>
                    Nouveau mot de passe
                  </h2>
                  <p className="text-sm mb-6" style={{ color: 'var(--muted)' }}>
                    Choisissez un mot de passe sécurisé d'au moins 8 caractères.
                  </p>

                  {error && (
                    <div className="mb-4 p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
                      <p className="text-red-400 text-sm">{error}</p>
                    </div>
                  )}

                  <form onSubmit={handleSubmit} className="space-y-5">
                    {/* Mot de passe */}
                    <div>
                      <label className="block text-sm font-semibold text-white mb-2">
                        Nouveau mot de passe
                      </label>
                      <div className="relative">
                        <input
                          type={showPwd ? 'text' : 'password'}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          required
                          placeholder="Minimum 8 caractères"
                          className="w-full px-4 py-2.5 pr-11 rounded-lg text-sm transition-all"
                          style={{ backgroundColor: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'var(--text)' }}
                        />
                        <button type="button" onClick={() => setShowPwd(!showPwd)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70 transition-colors">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            {showPwd
                              ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                              : <><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></>
                            }
                          </svg>
                        </button>
                      </div>

                      {/* Indicateur de force */}
                      {password.length > 0 && (
                        <div className="mt-2 flex items-center gap-3">
                          <div className="flex gap-1 flex-1">
                            {[1, 2, 3].map((i) => (
                              <div key={i} className="h-1.5 flex-1 rounded-full transition-all duration-300"
                                style={{ backgroundColor: i <= strength ? strengthColor : 'rgba(255,255,255,0.1)' }} />
                            ))}
                          </div>
                          <span className="text-xs font-semibold" style={{ color: strengthColor }}>{strengthLabel}</span>
                        </div>
                      )}
                    </div>

                    {/* Confirmation */}
                    <div>
                      <label className="block text-sm font-semibold text-white mb-2">
                        Confirmer le mot de passe
                      </label>
                      <input
                        type={showPwd ? 'text' : 'password'}
                        value={confirm}
                        onChange={(e) => setConfirm(e.target.value)}
                        required
                        placeholder="••••••••"
                        className="w-full px-4 py-2.5 rounded-lg text-sm transition-all"
                        style={{
                          backgroundColor: 'rgba(255,255,255,0.05)',
                          border: `1px solid ${confirm.length > 0 ? (confirm === password ? 'rgba(16,185,129,0.5)' : 'rgba(239,68,68,0.5)') : 'rgba(255,255,255,0.1)'}`,
                          color: 'var(--text)',
                        }}
                      />
                      {confirm.length > 0 && confirm !== password && (
                        <p className="text-red-400 text-xs mt-1">Les mots de passe ne correspondent pas</p>
                      )}
                    </div>

                    {/* Submit */}
                    <button type="submit" disabled={isLoading || !token}
                      className="w-full px-6 py-3 text-base font-semibold text-white rounded-[18px] transition-all hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed"
                      style={{ background: 'linear-gradient(to right, rgb(var(--primary)), rgb(var(--secondary)), rgb(var(--accent)))' }}>
                      {isLoading ? (
                        <span className="flex items-center justify-center gap-2">
                          <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                          </svg>
                          Enregistrement…
                        </span>
                      ) : 'Enregistrer le nouveau mot de passe'}
                    </button>
                  </form>

                  <div className="text-center mt-6">
                    <Link href="/login" className="text-sm font-semibold transition-all hover:opacity-80"
                      style={{ color: 'rgb(var(--primary))', textDecoration: 'underline', textUnderlineOffset: '2px' }}>
                      ← Retour à la connexion
                    </Link>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense>
      <ResetPasswordForm />
    </Suspense>
  );
}
