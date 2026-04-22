'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import { MobileViewportGuard } from '@/components/MobileViewportGuard';
import { authApi } from '@/lib/api/auth';

export default function UserLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();

  const isPrintPage = pathname?.includes('/pcb/reports/') && pathname?.includes('/print');

  useEffect(() => {
    const user = authApi.getCurrentUser();
    if (!user) {
      router.push('/login');
      return;
    }
    // Pages d'impression PCB accessibles aussi aux admins (aperçu iframe + ouverture dans un onglet)
    if (isPrintPage && (user.role === 'admin' || user.role === 'user')) {
      return;
    }
    if (user.role !== 'user') {
      router.push('/login');
      return;
    }
  }, [router, pathname, isPrintPage]);

  if (isPrintPage) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#070E28]">
      {/* Guard : on skippe volontairement sur les pages print (iframe admin
          pour PDF) — l'autre branche ci-dessus est deja un early return. */}
      <MobileViewportGuard />
      <Navbar />

      <main className="flex-1 pt-20 pb-0 px-4 sm:px-6 lg:px-8">
        {children}
      </main>

      <Footer />
    </div>
  );
}

