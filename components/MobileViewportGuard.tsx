'use client';

import { useEffect } from 'react';

/**
 * MobileViewportGuard — protège les pages privées contre les utilisateurs
 * qui arrivent en viewport étroit (< 768px) sans avoir un User-Agent mobile
 * (ex : desktop en vue responsive, split-screen, tablette en portrait).
 *
 * Le middleware UA-based ne les détecte pas comme mobile mais visuellement
 * l'expérience est cassée — on les renvoie vers l'app mobile.
 *
 * À utiliser UNIQUEMENT dans les layouts privés (admin / org / user / agent),
 * jamais dans le layout racine ni sur les pages publiques (/, /legal, /login…).
 */

const MOBILE_BREAKPOINT = 768;

export function MobileViewportGuard() {
  useEffect(() => {
    function checkViewport() {
      if (window.innerWidth < MOBILE_BREAKPOINT) {
        // Redirection vers la page intermediaire avec QR code plutot que
        // directement vers l'app mobile (UX : proposer le choix a l'user).
        window.location.replace('/mobile-redirect');
      }
    }

    checkViewport();
    window.addEventListener('resize', checkViewport);
    return () => window.removeEventListener('resize', checkViewport);
  }, []);

  return null;
}
