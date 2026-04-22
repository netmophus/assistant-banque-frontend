import { NextRequest, NextResponse } from 'next/server';

/**
 * Redirection cross-subdomain :
 *   www.miznas.co (Next.js — desktop/tablette, 5 modules)
 *     → app.miznas.co (Expo Web — mobile, 2 modules)
 *
 * Règle : si le visiteur est sur un user-agent mobile ET qu'il a le cookie
 * partagé `miznas_logged_in=true` (posé sur `.miznas.co`), on le bascule
 * vers l'expérience mobile.
 *
 * Headers anti-cache pour éviter que le CDN ou le navigateur ne serve
 * la redirection 307 à des visiteurs non loggés (faux positifs signalés).
 */

const MOBILE_UA_REGEX = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i;

export function middleware(request: NextRequest) {
  if (process.env.NODE_ENV === 'development') {
    return NextResponse.next();
  }

  const userAgent = request.headers.get('user-agent') || '';
  const isMobile = MOBILE_UA_REGEX.test(userAgent);
  const cookieValue = request.cookies.get('miznas_logged_in')?.value;
  const isLoggedIn = cookieValue === 'true';

  // DEBUG TEMPORAIRE — a retirer apres diagnostic du faux positif en
  // navigation privee mobile.
  console.log('[MIDDLEWARE]', {
    path: request.nextUrl.pathname,
    isMobile,
    cookieValue: cookieValue ?? 'ABSENT',
    isLoggedIn,
    ua: userAgent.substring(0, 80),
  });

  if (isMobile && isLoggedIn) {
    const response = NextResponse.redirect(new URL('https://app.miznas.co'), 307);
    // Empeche tout cache (CDN Heroku + navigateur) de cette redirection.
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate');
    response.headers.set('Pragma', 'no-cache');
    response.headers.set('Vary', 'Cookie, User-Agent');
    return response;
  }

  const response = NextResponse.next();
  // Vary aussi sur next() pour que le CDN ne cache pas une reponse
  // "pas de redirection" et la resserve a tous les visiteurs suivants.
  response.headers.set('Vary', 'Cookie, User-Agent');
  return response;
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)',
  ],
};
