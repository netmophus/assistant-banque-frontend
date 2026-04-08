'use client';

import Link from 'next/link';
import Logo from '@/components/ui/Logo';
import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { authApi, User } from '@/lib/api/auth';
import { ThemeSwitcher } from '@/components/ui/theme-switcher';

interface MenuItem {
  id: string;
  label: string;
  icon: string;
  path?: string;
  submenu?: MenuItem[];
}

const orgAdminMenuItems: MenuItem[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    icon: '📊',
    path: '/org/dashboard',
  },
  {
    id: 'parametrage',
    label: 'Paramétrage',
    icon: '⚙️',
    submenu: [
      {
        id: 'knowledge',
        label: 'Base de Connaissances & IA',
        icon: '📚',
        path: '/org/settings/knowledge',
      },
      {
        id: 'credit',
        label: 'Analyse de Dossier de Crédit',
        icon: '💳',
        path: '/org/settings/credit',
      },
      {
        id: 'pcb',
        label: 'PCB & Ratios',
        icon: '📊',
        path: '/org/settings/pcb',
      },
      {
        id: 'impayes',
        label: 'Gestion des Impayés',
        icon: '💸',
        path: '/org/settings/impayes',
      },
      {
        id: 'formations',
        label: 'Modules de Formation',
        icon: '📚',
        path: '/org/settings/formations',
      },
      {
        id: 'permissions',
        label: 'Permissions des Onglets',
        icon: '🔐',
        path: '/org/settings/permissions',
      },
    ],
  },
];

export default function Navbar() {
  const router = useRouter();
  const pathname = usePathname();
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [expandedMenu, setExpandedMenu] = useState<string | null>(null);
  const isOrgAdmin = isAuthenticated && user && user.role === 'admin';
  const isUser = isAuthenticated && user && user.role === 'user';
  const isOrgAdminPage = pathname?.startsWith('/org/');
  const isUserPage = pathname?.startsWith('/user/');

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    // Vérifier l'authentification au chargement
    const checkAuth = () => {
      const authenticated = authApi.isAuthenticated();
      setIsAuthenticated(authenticated);
      if (authenticated) {
        const currentUser = authApi.getCurrentUser();
        setUser(currentUser);
      }
    };

    checkAuth();
    
    // Écouter les changements de localStorage
    const handleStorageChange = () => {
      checkAuth();
    };
    
    window.addEventListener('storage', handleStorageChange);
    // Vérifier aussi lors des changements de route
    const interval = setInterval(checkAuth, 1000);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      clearInterval(interval);
    };
  }, []);

  const handleLogout = () => {
    authApi.logout();
    setIsAuthenticated(false);
    setUser(null);
    setIsUserMenuOpen(false);
    router.push('/login');
  };

  const getRoleLabel = (role: string) => {
    const roleLabels: { [key: string]: string } = {
      superadmin: 'Super Admin',
      admin: 'Admin',
      user: 'Utilisateur',
    };
    return roleLabels[role] || role;
  };

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
        isScrolled
          ? 'bg-gradient-to-r from-surface via-primary to-surface backdrop-blur-md shadow-xl shadow-glow-1 border-b border-primary'
          : 'bg-gradient-to-r from-surface via-primary/10 to-surface backdrop-blur-sm'
      }`}
    >
      {/* Gradient border effect */}
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#2563EB]/50 to-transparent"></div>
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 md:h-20">
          {/* Logo Miznas Banking */}
          <Link
            href="/"
            className="group flex items-center space-x-3 transition-transform duration-300 hover:scale-105"
          >
            <div className="transition-all duration-300 group-hover:scale-110 group-hover:drop-shadow-[0_0_8px_rgba(201,168,76,0.5)]">
              <Logo size={40} />
            </div>
            <div className="flex flex-col leading-tight">
              <span className="text-lg sm:text-xl font-black text-white tracking-wide">
                Miznas<span className="text-[#C9A84C]"> Banking</span>
              </span>
              <span className="text-[10px] font-semibold text-white/40 uppercase tracking-[0.15em] hidden sm:block">
                L'IA au service de la décision bancaire
              </span>
            </div>
          </Link>

          {/* Desktop Navigation */}
          {(isOrgAdmin && isOrgAdminPage) || (isUser && isUserPage) ? (
            isOrgAdmin && isOrgAdminPage ? (
            <div className="hidden md:flex items-center space-x-1">
              {orgAdminMenuItems.map((item) => (
                <div key={item.id} className="relative">
                  {item.submenu ? (
                    <div
                      onMouseEnter={() => setExpandedMenu(item.id)}
                      onMouseLeave={() => setExpandedMenu(null)}
                      className="relative"
                    >
                      <button
                        onClick={() => setExpandedMenu(expandedMenu === item.id ? null : item.id)}
                        className="group relative px-4 py-2 text-lg font-medium text-[#CBD5E1] hover:text-white transition-all duration-300 flex items-center space-x-1 z-50"
                      >
                        <span className="relative z-10">{item.icon} {item.label}</span>
                        <svg
                          className={`w-4 h-4 transition-transform duration-300 ${
                            expandedMenu === item.id ? 'rotate-180' : ''
                          }`}
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                        <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-gradient-to-r from-primary via-secondary to-accent group-hover:w-full transition-all duration-300"></span>
                      </button>
                      {expandedMenu === item.id && (
                        <div 
                          onMouseEnter={() => setExpandedMenu(item.id)}
                          onMouseLeave={() => setExpandedMenu(null)}
                          className="absolute top-full left-0 pt-1 w-64 z-[60]"
                        >
                          <div className="bg-surface/80 backdrop-blur-lg rounded-xl border border-primary shadow-xl overflow-hidden"
                        style={{
                          backgroundColor: 'rgb(var(--surface))',
                          border: '1px solid rgb(var(--border))',
                        }}
                      >
                          {item.submenu.map((subItem) => {
                            const isActive = pathname === subItem.path || pathname?.startsWith(subItem.path + '/');
                            return (
                              <Link
                                key={subItem.id}
                                href={subItem.path || '#'}
                                onClick={() => setExpandedMenu(null)}
                                className={`flex items-center space-x-3 px-4 py-3 text-sm font-medium transition-all duration-300 cursor-pointer ${
                                  isActive
                                    ? 'bg-gradient-to-r from-primary via-secondary to-accent text-text'
                                    : 'text-muted hover:text-text hover:bg-surface/60'
                                }`}
                              >
                                <span>{subItem.icon}</span>
                                <span>{subItem.label}</span>
                              </Link>
                            );
                          })}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <Link
                      href={item.path || '#'}
                      className="group relative px-4 py-2 text-lg font-medium transition-all duration-300"
                    >
                      <span className="relative z-10">{item.icon} {item.label}</span>
                      <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-gradient-to-r from-primary via-secondary to-accent group-hover:w-full transition-all duration-300"></span>
                    </Link>
                  )}
                </div>
              ))}
            </div>
            ) : (
              // Menu pour les utilisateurs standards
              <div className="hidden md:flex items-center space-x-1">
                <Link
                  href="/user/dashboard"
                  className={`group relative px-4 py-2 text-lg font-medium transition-all duration-300 ${
                    pathname === '/user/dashboard' || pathname?.startsWith('/user/')
                      ? 'text-white'
                      : 'text-[#CBD5E1] hover:text-white'
                  }`}
                >
                  <span className="relative z-10">📊 Dashboard</span>
                  <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-gradient-to-r from-[#1B3A8C] via-[#0F2864] to-[#C9A84C] group-hover:w-full transition-all duration-300"></span>
                </Link>
              </div>
            )
          ) : (
            <div className="hidden md:flex items-center space-x-1">
              <Link
                href="/#features"
                className="group relative px-4 py-2 text-lg font-medium text-muted hover:text-text transition-all duration-300"
              >
                <span className="relative z-10">Fonctionnalités</span>
                <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-gradient-to-r from-[#1B3A8C] via-[#0F2864] to-[#C9A84C] group-hover:w-full transition-all duration-300"></span>
              </Link>
              <Link
                href="/#benefits"
                className="group relative px-4 py-2 text-lg font-medium text-muted hover:text-text transition-all duration-300"
              >
                <span className="relative z-10">Avantages</span>
                <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-gradient-to-r from-[#1B3A8C] via-[#0F2864] to-[#C9A84C] group-hover:w-full transition-all duration-300"></span>
              </Link>
            </div>
          )}

          {/* CTA Buttons / User Menu */}
          <div className="hidden md:flex items-center space-x-3">
            {/* Theme Switcher - toujours visible */}
            <ThemeSwitcher />
            
            {isAuthenticated && user ? (
              <div className="relative">
                <button
                  onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                  className="flex items-center space-x-2 px-3 py-2 rounded-lg hover:bg-white/5 transition-colors"
                >
                  <div className="w-9 h-9 rounded-full bg-gradient-to-r from-[#1B3A8C] via-[#0F2864] to-[#C9A84C] flex items-center justify-center text-white font-bold text-sm">
                    {(user.full_name || 'U').charAt(0).toUpperCase()}
                  </div>
                  <svg
                    className={`w-4 h-4 text-[#CBD5E1] transition-transform ${
                      isUserMenuOpen ? 'rotate-180' : ''
                    }`}
                    fill="none"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {/* Dropdown Menu */}
                {isUserMenuOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setIsUserMenuOpen(false)}
                    ></div>
                    <div className="absolute right-0 mt-2 w-56 bg-[#1a1f3a] backdrop-blur-lg rounded-xl border border-white/10 shadow-xl z-50 overflow-hidden">
                      {/* User Info */}
                      <div className="p-3 border-b border-white/10">
                        <div className="text-sm font-semibold text-white truncate mb-1">
                          {user.full_name || 'Utilisateur'}
                        </div>
                        <div className="text-xs text-[#CBD5E1] truncate">
                          {user.email}
                        </div>
                      </div>

                      {/* Menu Items */}
                      <div className="p-1">
                        {user.role === 'superadmin' && (
                          <Link
                            href="/admin/dashboard"
                            onClick={() => setIsUserMenuOpen(false)}
                            className="flex items-center space-x-2 px-3 py-2 rounded-lg text-sm text-[#CBD5E1] hover:text-white hover:bg-white/5 transition-colors"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                            </svg>
                            <span>Dashboard</span>
                          </Link>
                        )}
                        {user.role === 'admin' && (
                          <Link
                            href="/org/dashboard"
                            onClick={() => setIsUserMenuOpen(false)}
                            className="flex items-center space-x-2 px-3 py-2 rounded-lg text-sm text-[#CBD5E1] hover:text-white hover:bg-white/5 transition-colors"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                            </svg>
                            <span>Dashboard</span>
                          </Link>
                        )}
                        {user.role === 'user' && (
                          <Link
                            href="/user/dashboard"
                            onClick={() => setIsUserMenuOpen(false)}
                            className="flex items-center space-x-2 px-3 py-2 rounded-lg text-sm text-[#CBD5E1] hover:text-white hover:bg-white/5 transition-colors"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                            </svg>
                            <span>Dashboard</span>
                          </Link>
                        )}
                        <button
                          onClick={handleLogout}
                          className="w-full flex items-center space-x-2 px-3 py-2 rounded-lg text-sm text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                          </svg>
                          <span>Déconnexion</span>
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <>
                <Link
                  href="/login"
                  className="group relative px-5 py-2.5 text-lg font-semibold text-white rounded-[14px] overflow-hidden transition-all duration-300 hover:scale-105"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-[#1B3A8C] via-[#0F2864] to-[#C9A84C]"></div>
                  <div className="absolute inset-0 bg-gradient-to-r from-[#1B3A8C] via-[#0F2864] to-[#C9A84C] blur-lg opacity-50 group-hover:opacity-75 transition-opacity duration-300"></div>
                  <span className="relative z-10">Se connecter</span>
                </Link>
              </>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="md:hidden p-2 text-[#CBD5E1] hover:text-white transition-colors duration-300 rounded-lg hover:bg-white/10"
            aria-label="Toggle menu"
            aria-expanded={isMobileMenuOpen}
          >
            <svg
              className="w-6 h-6 transition-transform duration-300"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              {isMobileMenuOpen ? (
                <path d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>

        {/* Mobile Menu with slide animation */}
        <div
          className={`md:hidden overflow-hidden transition-all duration-500 ease-in-out ${
            isMobileMenuOpen ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
          }`}
        >
          <div className="py-4 border-t border-white/10">
            <div className="flex flex-col space-y-3">
              {(isOrgAdmin && isOrgAdminPage) || (isUser && isUserPage) ? (
                isOrgAdmin && isOrgAdminPage ? (
                <>
                  {orgAdminMenuItems.map((item) => (
                    <div key={item.id}>
                      {item.submenu ? (
                        <>
                          <button
                            onClick={() => setExpandedMenu(expandedMenu === item.id ? null : item.id)}
                            className="w-full flex items-center justify-between px-4 py-3 text-base font-medium text-[#CBD5E1] hover:text-white transition-all duration-300 rounded-lg hover:bg-white/5"
                          >
                            <span>{item.icon} {item.label}</span>
                            <svg
                              className={`w-5 h-5 transition-transform duration-300 ${
                                expandedMenu === item.id ? 'rotate-180' : ''
                              }`}
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                          </button>
                          {expandedMenu === item.id && (
                            <div className="ml-4 mt-2 space-y-2 border-l-2 border-[#2563EB]/30 pl-4">
                              {item.submenu.map((subItem) => {
                                const isActive = pathname === subItem.path || pathname?.startsWith(subItem.path + '/');
                                return (
                                  <Link
                                    key={subItem.id}
                                    href={subItem.path || '#'}
                                    onClick={() => {
                                      setIsMobileMenuOpen(false);
                                      setExpandedMenu(null);
                                    }}
                                    className={`flex items-center space-x-3 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 ${
                                      isActive
                                        ? 'bg-gradient-to-r from-[#1B3A8C]/20 via-[#0F2864]/20 to-[#C9A84C]/20 text-white'
                                        : 'text-[#CBD5E1] hover:text-white hover:bg-white/5'
                                    }`}
                                  >
                                    <span>{subItem.icon}</span>
                                    <span>{subItem.label}</span>
                                  </Link>
                                );
                              })}
                            </div>
                          )}
                        </>
                      ) : (
                        <Link
                          href={item.path || '#'}
                          onClick={() => setIsMobileMenuOpen(false)}
                          className={`flex items-center space-x-2 px-4 py-3 text-base font-medium transition-all duration-300 rounded-lg hover:bg-white/5 ${
                            pathname === item.path || pathname?.startsWith(item.path + '/')
                              ? 'text-white'
                              : 'text-[#CBD5E1] hover:text-white'
                          }`}
                        >
                          <span>{item.icon} {item.label}</span>
                        </Link>
                      )}
                    </div>
                  ))}
                </>
                ) : (
                  // Menu mobile pour les utilisateurs standards
                  <Link
                    href="/user/dashboard"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={`flex items-center space-x-2 px-4 py-3 text-base font-medium transition-all duration-300 rounded-lg hover:bg-white/5 ${
                      pathname === '/user/dashboard' || pathname?.startsWith('/user/')
                        ? 'text-white'
                        : 'text-[#CBD5E1] hover:text-white'
                    }`}
                  >
                    <span>📊 Dashboard</span>
                  </Link>
                )
              ) : (
                <>
                  <Link
                    href="/#features"
                    className="group relative px-4 py-3 text-base font-medium text-[#CBD5E1] hover:text-white transition-all duration-300 rounded-lg hover:bg-white/5"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    <span className="relative z-10">Fonctionnalités</span>
                    <span className="absolute left-0 bottom-0 w-0 h-0.5 bg-gradient-to-r from-[#1B3A8C] via-[#0F2864] to-[#C9A84C] group-hover:w-full transition-all duration-300"></span>
                  </Link>
                  <Link
                    href="/#benefits"
                    className="group relative px-4 py-3 text-base font-medium text-[#CBD5E1] hover:text-white transition-all duration-300 rounded-lg hover:bg-white/5"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    <span className="relative z-10">Avantages</span>
                    <span className="absolute left-0 bottom-0 w-0 h-0.5 bg-gradient-to-r from-[#1B3A8C] via-[#0F2864] to-[#C9A84C] group-hover:w-full transition-all duration-300"></span>
                  </Link>
                </>
              )}
              <div className="pt-4 space-y-2 border-t border-white/10">
                {isAuthenticated && user ? (
                  <>
                    <div className="px-4 py-2 border-b border-white/10">
                      <div className="text-sm font-semibold text-white truncate mb-1">
                        {user.full_name || 'Utilisateur'}
                      </div>
                      <div className="text-xs text-[#CBD5E1] truncate">
                        {user.email}
                      </div>
                    </div>
                    {user.role === 'superadmin' && (
                      <Link
                        href="/admin/dashboard"
                        className="block px-4 py-2 text-sm text-[#CBD5E1] hover:text-white hover:bg-white/5 rounded-lg transition-colors"
                        onClick={() => setIsMobileMenuOpen(false)}
                      >
                        Dashboard
                      </Link>
                    )}
                    {user.role === 'admin' && (
                      <Link
                        href="/org/dashboard"
                        className="block px-4 py-2 text-sm text-[#CBD5E1] hover:text-white hover:bg-white/5 rounded-lg transition-colors"
                        onClick={() => setIsMobileMenuOpen(false)}
                      >
                        Dashboard
                      </Link>
                    )}
                    {user.role === 'user' && (
                      <Link
                        href="/user/dashboard"
                        className="block px-4 py-2 text-sm text-[#CBD5E1] hover:text-white hover:bg-white/5 rounded-lg transition-colors"
                        onClick={() => setIsMobileMenuOpen(false)}
                      >
                        Dashboard
                      </Link>
                    )}
                    <button
                      onClick={() => {
                        handleLogout();
                        setIsMobileMenuOpen(false);
                      }}
                      className="w-full px-4 py-2 text-sm text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors text-left"
                    >
                      Déconnexion
                    </button>
                  </>
                ) : (
                  <>
                    <Link
                      href="/login"
                      className="group relative block w-full text-center px-4 py-3 text-sm font-semibold text-white rounded-[14px] overflow-hidden transition-all duration-300"
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-[#1B3A8C] via-[#0F2864] to-[#C9A84C]"></div>
                      <div className="absolute inset-0 bg-gradient-to-r from-[#1B3A8C] via-[#0F2864] to-[#C9A84C] blur-lg opacity-50 group-hover:opacity-75 transition-opacity duration-300"></div>
                      <span className="relative z-10">Se connecter</span>
                    </Link>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}
