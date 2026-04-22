import { NextRequest, NextResponse } from 'next/server';

/**
 * Redirection cross-subdomain : sur mobile, seules quelques pages publiques
 * restent accessibles sur www.miznas.co. Tout le reste est redirige vers
 * app.miznas.co (l'espace mobile Expo Web).
 *
 * Strategie : URL-based (plus aucune dependance au cookie miznas_logged_in).
 * Plus simple, plus robuste, pas sensible au cache de redirection.
 */

const MOBILE_UA_REGEX = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i;

// Pages exactes autorisees sur mobile.
const MOBILE_ALLOWED_PATHS = new Set<string>([
  '/',
]);

// Prefixes autorises (toutes les routes qui commencent par ces chaines).
const MOBILE_ALLOWED_PREFIXES = [
  '/legal/',           // Mentions legales, CGU, confidentialite
  '/reset-password',   // CRITIQUE : lien email avec token — doit fonctionner sur mobile
  '/forgot-password',  // Coherence avec le flow reset
];

function isMobileAllowed(pathname: string): boolean {
  if (MOBILE_ALLOWED_PATHS.has(pathname)) return true;
  return MOBILE_ALLOWED_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

export function middleware(request: NextRequest) {
  // Skip en dev local : on ne veut pas rediriger localhost vers prod.
  if (process.env.NODE_ENV === 'development') {
    return NextResponse.next();
  }

  const userAgent = request.headers.get('user-agent') || '';
  const isMobile = MOBILE_UA_REGEX.test(userAgent);
  const pathname = request.nextUrl.pathname;

  // Desktop : jamais de redirection.
  if (!isMobile) {
    return NextResponse.next();
  }

  // Mobile : si le path n'est pas autorise, redirection vers l'app.
  if (!isMobileAllowed(pathname)) {
    const response = NextResponse.redirect(new URL('https://app.miznas.co'), 307);
    // Anti-cache pour eviter les redirections cachees par CDN / navigateur.
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate');
    response.headers.set('Pragma', 'no-cache');
    response.headers.set('Vary', 'User-Agent');
    return response;
  }

  // Mobile + page autorisee : on laisse passer.
  const response = NextResponse.next();
  response.headers.set('Vary', 'User-Agent');
  return response;
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)',
  ],
};
