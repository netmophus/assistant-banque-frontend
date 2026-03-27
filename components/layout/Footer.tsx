import Link from 'next/link';
import Logo from '@/components/ui/Logo';

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="relative bg-[#040B1E] overflow-hidden">
      {/* Top gold line */}
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#C9A84C]/40 to-transparent" />
      {/* Glows */}
      <div className="absolute bottom-0 left-1/4 w-[400px] h-[160px] bg-[#C9A84C]/4 rounded-full blur-[90px] pointer-events-none" />
      <div className="absolute top-0 right-0 w-[300px] h-[150px] bg-[#1B3A8C]/10 rounded-full blur-[70px] pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[200px] h-[120px] bg-[#1B3A8C]/8 rounded-full blur-[60px] pointer-events-none" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-5">

        {/* Main grid */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 mb-8">

          {/* Brand — large */}
          <div className="md:col-span-5">
            <Link href="/" className="inline-flex items-center gap-3 mb-4 group">
              <div className="group-hover:drop-shadow-[0_0_10px_rgba(201,168,76,0.6)] transition-all duration-300">
                <Logo size={38} />
              </div>
              <div className="flex flex-col leading-tight">
                <span className="text-lg font-black text-white tracking-wide">
                  Nova<span className="text-[#C9A84C]">Banque</span>
                </span>
                <span className="text-[9px] font-bold text-white/50 uppercase tracking-[0.18em]">
                  Plateforme IA Bancaire
                </span>
              </div>
            </Link>

            <p className="text-xs text-white/55 leading-relaxed max-w-xs mb-4">
              Intelligence artificielle pour les institutions financières de la zone UEMOA.
              Conformité BCEAO, sécurité maximale, performance garantie.
            </p>

            {/* Badges compliance */}
            <div className="flex flex-wrap gap-1.5">
              {[
                { label: 'BCEAO', icon: '🏛️' },
                { label: 'PCB UEMOA', icon: '📊' },
                { label: 'ISO 27001', icon: '🔒' },
                { label: 'CB-UMOA', icon: '⚖️' },
              ].map((b) => (
                <span
                  key={b.label}
                  className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold text-[#C9A84C] bg-[#1B3A8C]/15 border border-[#C9A84C]/20"
                >
                  <span className="text-[10px]">{b.icon}</span>
                  {b.label}
                </span>
              ))}
            </div>
          </div>

          {/* Navigation */}
          <div className="md:col-span-3">
            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-[#C9A84C] mb-4 flex items-center gap-2">
              <span className="w-4 h-px bg-[#C9A84C]/50 inline-block" />
              Navigation
            </h3>
            <ul className="space-y-2.5">
              {[
                { label: 'Fonctionnalités', href: '/#features' },
                { label: 'Avantages', href: '/#benefits' },
                { label: 'Tableau de bord', href: '/user/dashboard' },
                { label: 'Se connecter', href: '/login' },
              ].map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    className="group flex items-center gap-2 text-xs text-white/60 hover:text-white transition-colors duration-200"
                  >
                    <span className="w-1 h-1 rounded-full bg-[#1B3A8C] group-hover:bg-[#C9A84C] transition-colors flex-shrink-0" />
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div className="md:col-span-4">
            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-[#C9A84C] mb-4 flex items-center gap-2">
              <span className="w-4 h-px bg-[#C9A84C]/50 inline-block" />
              Contact & Support
            </h3>
            <ul className="space-y-3">
              <li>
                <a href="mailto:support@novabanque.com"
                  className="group flex items-center gap-2.5 text-xs text-white/60 hover:text-white transition-colors duration-200">
                  <span className="w-6 h-6 rounded-lg bg-[#1B3A8C]/30 border border-[#1B3A8C]/30 flex items-center justify-center group-hover:border-[#C9A84C]/30 transition-colors flex-shrink-0">
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
                  </span>
                  support@novabanque.com
                </a>
              </li>
              <li className="flex items-center gap-2.5 text-xs text-white/60">
                <span className="w-6 h-6 rounded-lg bg-[#1B3A8C]/30 border border-[#1B3A8C]/30 flex items-center justify-center flex-shrink-0">
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.81 19.79 19.79 0 01.1 1.18 2 2 0 012.08.02h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.91 7.91a16 16 0 006.18 6.18l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/></svg>
                </span>
                +227 XX XX XX XX
              </li>
              <li className="flex items-center gap-2.5 text-xs text-white/60">
                <span className="w-6 h-6 rounded-lg bg-[#1B3A8C]/30 border border-[#1B3A8C]/30 flex items-center justify-center flex-shrink-0">
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>
                </span>
                Niamey, Niger — Zone UEMOA
              </li>
            </ul>
          </div>
        </div>

        {/* Divider or */}
        <div className="h-px bg-gradient-to-r from-transparent via-[#C9A84C]/25 to-transparent mb-4" />

        {/* Bottom bar */}
        <div className="flex flex-col sm:flex-row justify-between items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-[#22c55e] shadow-[0_0_6px_rgba(34,197,94,0.6)]" />
            <p className="text-[10px] text-white/40">
              © {currentYear} NovaBanque · Tous droits réservés
            </p>
          </div>
          <div className="flex items-center gap-5 text-[10px] text-white/40">
            {['Confidentialité', 'Conditions d\'utilisation', 'Mentions légales'].map((label) => (
              <a key={label} href="#" className="hover:text-white/80 transition-colors duration-200">
                {label}
              </a>
            ))}
          </div>
        </div>

      </div>
    </footer>
  );
}
