'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import { apiClient } from '@/lib/api/client';

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      // Appeler l'API pour la réinitialisation du mot de passe
      const response = await apiClient.post('/auth/forgot-password', { email });
      
      setSuccess(true);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Une erreur est survenue. Veuillez réessayer.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col overflow-hidden" style={{ backgroundColor: 'var(--bg)' }}>
      <Navbar />
      
      <div className="flex-1 flex items-center justify-center px-4 sm:px-6 lg:px-8 pt-8 md:pt-12 pb-4">
        <div className="w-full max-w-md mx-auto mt-12 md:mt-16">
          {/* Mobile Logo */}
          <div className="lg:hidden text-center mb-6">
            <div className="flex items-center justify-center space-x-3 mb-4">
              <div className="relative w-16 h-16">
                <div className="absolute inset-0 rounded-full blur-lg" style={{ background: 'linear-gradient(to right, var(--primary)/20, var(--secondary)/20, var(--accent)/20)' }}></div>
                <img
                  src="/logoA.png"
                  alt="BankIA Suite Logo"
                  width={64}
                  height={64}
                  className="object-contain relative z-10"
                />
              </div>
              <span className="text-2xl font-bold" style={{ color: 'var(--text)' }}>
                BankIA Suite
              </span>
            </div>
            <p className="text-sm" style={{ color: 'var(--muted)' }}>
              Accélérez l'intelligence bancaire
            </p>
          </div>

          {/* Forgot Password Form */}
          <div className="relative backdrop-blur-lg rounded-[28px] p-8 sm:p-10 shadow-2xl" style={{ background: 'linear-gradient(to right, var(--card), var(--primary)/10, var(--card))', boxShadow: 'var(--glow) 0px 25px 50px -12px' }}>
            {/* Double border effect */}
            <div className="absolute inset-0 rounded-[28px] border-2" style={{ borderColor: 'var(--primary)/40' }}></div>
            <div className="absolute inset-[2px] rounded-[26px] border-2" style={{ borderColor: 'var(--accent)/40' }}></div>
            <div className="relative z-10">
              <h2 className="text-2xl sm:text-3xl font-black mb-2 text-center lg:text-left" style={{ color: 'var(--text)' }}>
                Mot de passe oublié
              </h2>
              <p className="text-sm mb-6 text-center lg:text-left" style={{ color: 'var(--muted)' }}>
                Entrez votre email pour recevoir un lien de réinitialisation
              </p>

              {success ? (
                <div className="mb-6 p-4 bg-green-500/10 border border-green-500/30 rounded-lg">
                  <div className="flex items-center">
                    <svg className="w-5 h-5 text-green-400 mr-3" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <div>
                      <p className="text-green-400 text-sm font-medium">Email envoyé avec succès !</p>
                      <p className="text-green-300 text-xs mt-1">
                        Vérifiez votre boîte de réception et suivez les instructions.
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  {error && (
                    <div className="mb-4 p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
                      <p className="text-red-400 text-sm">{error}</p>
                    </div>
                  )}

                  <form onSubmit={handleSubmit} className="space-y-5">
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
                        className="w-full px-4 py-2.5 rounded-lg text-sm transition-all duration-300 placeholder-gray-400" 
                        style={{ 
                          backgroundColor: 'rgba(255,255,255,0.05)', 
                          border: '1px solid rgba(255,255,255,0.1)', 
                          color: 'var(--text)' 
                        }}
                        placeholder="votre@email.com"
                      />
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
                            Envoi en cours...
                          </>
                        ) : (
                          <>
                            Envoyer le lien
                            <svg className="ml-2 w-4 h-4 transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                            </svg>
                          </>
                        )}
                      </span>
                    </button>
                  </form>
                </>
              )}

              {/* Back to login */}
              <div className="text-center mt-6">
                <p className="text-sm" style={{ color: 'var(--muted)' }}>
                  {success ? (
                    <>
                      Vous n'avez pas reçu l'email ?{' '}
                      <button
                        onClick={() => {
                          setSuccess(false);
                          setError(null);
                        }}
                        className="font-semibold transition-all" 
                        style={{ 
                          backgroundImage: 'linear-gradient(to right, var(--primary), var(--secondary), var(--accent))', 
                          WebkitBackgroundClip: 'text', 
                          backgroundClip: 'text', 
                          color: 'transparent' 
                        }}
                      >
                        Réessayer
                      </button>
                    </>
                  ) : (
                    <>
                      Vous vous souvenez de votre mot de passe ?{' '}
                      <Link
                        href="/login"
                        className="font-semibold transition-all hover:opacity-80" 
                        style={{ 
                          color: 'rgb(var(--primary))',
                          textDecoration: 'underline',
                          textUnderlineOffset: '2px'
                        }}
                      >
                        Se connecter
                      </Link>
                    </>
                  )}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <Footer />
    </div>
  );
}
