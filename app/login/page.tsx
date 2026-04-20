'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import { authApi } from '@/lib/api/auth';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState(() => {
    if (typeof window !== 'undefined') return localStorage.getItem('remembered_email') || '';
    return '';
  });
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(() => {
    if (typeof window !== 'undefined') return localStorage.getItem('remembered_email') !== null;
    return false;
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    if (rememberMe) {
      localStorage.setItem('remembered_email', email);
    } else {
      localStorage.removeItem('remembered_email');
    }

    try {
      const response = await authApi.login({ email, password });

      // Rediriger selon le rôle (URL masquées via rewrites next.config.js)
      if (response.user.role === 'superadmin') {
        router.push('/m1/dashboard');
      } else if (response.user.role === 'admin') {
        router.push('/m2/dashboard');
      } else {
        router.push('/m4/mes-dossiers');
      }
    } catch (err: any) {
      setError(err.message || 'Erreur lors de la connexion. Vérifiez vos identifiants.');
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col overflow-hidden" style={{ backgroundColor: 'var(--bg)' }}>
      <Navbar />
      
      <div className="flex-1 flex items-center justify-center px-4 sm:px-6 lg:px-8 pt-8 md:pt-12 pb-4">
        <div className="w-full max-w-2xl mx-auto mt-12 md:mt-16">
            {/* Mobile tagline */}
            <div className="lg:hidden text-center mb-6">
              <p className="text-sm" style={{ color: 'var(--muted)' }}>
                Accélérez l'intelligence bancaire
              </p>
            </div>

            {/* Login Form */}
            <div className="relative backdrop-blur-lg rounded-[28px] p-8 sm:p-10 shadow-2xl" style={{ background: 'linear-gradient(to right, var(--card), var(--primary)/10, var(--card))', boxShadow: 'var(--glow) 0px 25px 50px -12px' }}>
              {/* Double border effect */}
              <div className="absolute inset-0 rounded-[28px] border-2" style={{ borderColor: 'var(--primary)/40' }}></div>
              <div className="absolute inset-[2px] rounded-[26px] border-2" style={{ borderColor: 'var(--accent)/40' }}></div>
              <div className="relative z-10">
              <h2 className="text-2xl sm:text-3xl font-black mb-2 text-center lg:text-left" style={{ color: 'var(--text)' }}>
                Connexion
              </h2>
              <p className="text-sm mb-6 text-center lg:text-left" style={{ color: 'var(--muted)' }}>
                Accédez à votre espace bancaire intelligent
              </p>

              {error && (
                <div className="mb-4 p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
                  <p className="text-red-400 text-sm">{error}</p>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {/* Email Field */}
                  <div>
                    <label htmlFor="email" className="block text-sm font-semibold text-white mb-2">
                      Email
                    </label>
                    <input
                      type="email"
                      id="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="w-full px-4 py-2.5 rounded-lg text-sm transition-all duration-300 placeholder-gray-400" style={{ backgroundColor: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'var(--text)' }}
                      placeholder="votre@email.com"
                    />
                  </div>

                  {/* Password Field */}
                  <div>
                    <label htmlFor="password" className="block text-sm font-semibold text-white mb-2">
                      Mot de passe
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        id="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        className="w-full px-4 py-2.5 pr-10 rounded-lg text-sm transition-all duration-300 placeholder-gray-400" style={{ backgroundColor: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'var(--text)' }}
                        placeholder="••••••••"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(v => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
                        tabIndex={-1}
                      >
                        {showPassword ? (
                          <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                          </svg>
                        ) : (
                          <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Remember me & Forgot password */}
                <div className="flex items-center justify-between text-sm">
                  <label className="flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="w-4 h-4 rounded transition-all" style={{ border: '1px solid rgba(255,255,255,0.2)', backgroundColor: 'rgba(255,255,255,0.05)' }}
                    />
                    <span className="ml-2 text-sm" style={{ color: 'var(--muted)' }}>Se souvenir de moi</span>
                  </label>
                  <Link
                    href="/forgot-password"
                    className="font-medium transition-colors hover:opacity-80" style={{ color: 'var(--primary)' }}
                  >
                    Mot de passe oublié ?
                  </Link>
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={isLoading}
                  className="group relative w-full px-6 py-3 text-base font-semibold text-white rounded-[18px] overflow-hidden transition-all duration-300 hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-primary/20"
                  style={{
                    background: 'linear-gradient(to right, rgb(var(--primary)), rgb(var(--secondary)), rgb(var(--accent)))',
                    boxShadow: '0 4px 20px rgba(var(--primary), 0.3)',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'scale(1.02)';
                    e.currentTarget.style.boxShadow = '0 6px 30px rgba(var(--primary), 0.4)';
                  }}
                  onMouseLeave={(e) => {
                    if (!isLoading) {
                      e.currentTarget.style.transform = 'scale(1)';
                      e.currentTarget.style.boxShadow = '0 4px 20px rgba(var(--primary), 0.3)';
                    }
                  }}
                >
                  <div className="absolute inset-0 opacity-0 group-hover:opacity-20 transition-opacity duration-300" 
                       style={{ 
                         background: 'linear-gradient(to right, rgba(255,255,255,0.3), rgba(255,255,255,0.2), rgba(255,255,255,0.3))' 
                       }}>
                  </div>
                  <span className="relative z-10 flex items-center justify-center">
                    {isLoading ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Connexion...
                      </>
                    ) : (
                      <>
                        Se connecter
                        <svg className="ml-2 w-4 h-4 transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                        </svg>
                      </>
                    )}
                  </span>
                </button>
              </form>

              </div>
            </div>
        </div>
      </div>
      
      <Footer />
    </div>
  );
}
