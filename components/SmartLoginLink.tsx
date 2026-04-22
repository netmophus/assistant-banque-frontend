'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

/**
 * SmartLoginLink — CTA "Se connecter" / "Créer un compte" intelligent.
 *
 * Sur desktop : Link interne Next.js vers /login ou /register.
 * Sur mobile : redirige directement vers app.miznas.co/login (ou /register)
 * pour eviter un aller-retour www -> redirect -> app.
 *
 * Evite que le user mobile arrive sur /login qui serait bloque par le
 * middleware et redirigerait vers la home de l'app (perte du flux login).
 */

const MOBILE_UA_REGEX = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i;

type Props = {
  children: React.ReactNode;
  className?: string;
  target?: 'login' | 'register';
};

export function SmartLoginLink({ children, className, target = 'login' }: Props) {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    setIsMobile(MOBILE_UA_REGEX.test(navigator.userAgent));
  }, []);

  const path = target === 'register' ? '/register' : '/login';

  if (isMobile) {
    // URL externe — <a> direct pour eviter que Next.js tente une navigation
    // SPA interne vers un autre domaine.
    return (
      <a href={`https://app.miznas.co${path}`} className={className}>
        {children}
      </a>
    );
  }

  return (
    <Link href={path} className={className}>
      {children}
    </Link>
  );
}
