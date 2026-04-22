/**
 * Cookie partage entre www.miznas.co (ce Next.js) et app.miznas.co
 * (Expo Web). Sert de flag booleen pour le middleware de redirection
 * mobile — ce n'est PAS le JWT, qui reste en localStorage.
 *
 * Pose sur `.miznas.co` en production pour etre visible par les deux
 * sous-domaines ; pose sans `domain` en dev local.
 *
 * Duree courte (1 jour) : si l'utilisateur ferme l'onglet sans logout,
 * le cookie expire rapidement et n'entraine pas de faux positif de
 * redirection mobile persistant.
 */

const COOKIE_NAME = 'miznas_logged_in';
const COOKIE_DOMAIN = '.miznas.co';
const MAX_AGE_DAYS = 1;

export function setLoggedInCookie(): void {
  if (typeof document === 'undefined') return;

  const maxAge = MAX_AGE_DAYS * 24 * 60 * 60;
  const isProd = window.location.hostname.endsWith('miznas.co');
  const domainPart = isProd ? `; domain=${COOKIE_DOMAIN}` : '';
  const securePart = isProd ? '; secure' : '';

  document.cookie = `${COOKIE_NAME}=true; path=/; max-age=${maxAge}${domainPart}${securePart}; samesite=lax`;
}

export function clearLoggedInCookie(): void {
  if (typeof document === 'undefined') return;

  const isProd = window.location.hostname.endsWith('miznas.co');
  const domainPart = isProd ? `; domain=${COOKIE_DOMAIN}` : '';

  document.cookie = `${COOKIE_NAME}=; path=/; max-age=0${domainPart}`;
}
