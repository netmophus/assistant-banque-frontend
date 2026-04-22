import { NextRequest, NextResponse } from 'next/server';

/**
 * Redirection cross-subdomain :
 *   www.miznas.co (Next.js — desktop/tablette, 5 modules)
 *     → app.miznas.co (Expo Web — mobile, 2 modules)
 *
 * Règle : si le visiteur est sur un user-agent mobile ET qu'il a le cookie
 * partagé `miznas_logged_in=true` (posé sur `.miznas.co` par l'app Expo),
 * on le bascule vers l'expérience mobile.
 */

const MOBILE_UA_REGEX = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i;

export function middleware(request: NextRequest) {
  // Skip en dev local : on ne veut pas qu'un cookie posé sur .miznas.co
  // fasse rediriger localhost:3000 vers la prod app.miznas.co.
  if (process.env.NODE_ENV === 'development') {
    return NextResponse.next();
  }

  const userAgent = request.headers.get('user-agent') || '';
  const isMobile = MOBILE_UA_REGEX.test(userAgent);
  const isLoggedIn = request.cookies.get('miznas_logged_in')?.value === 'true';

  if (isMobile && isLoggedIn) {
    return NextResponse.redirect(new URL('https://app.miznas.co'), 307);
  }

  return NextResponse.next();
}

export const config = {
  // Toutes les pages sauf :
  //   - routes API (proxies vers FastAPI)
  //   - assets Next.js (_next/static, _next/image)
  //   - favicon
  //   - fichiers avec extension (png, svg, css, js, etc.)
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)',
  ],
};
