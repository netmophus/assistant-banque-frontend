'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
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
    if (!user || user.role !== 'user') {
      router.push('/login');
      return;
    }
  }, [router, pathname]);

  if (isPrintPage) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#070E28]">
      <Navbar />

      <main className="flex-1 pt-20 pb-0 px-4 sm:px-6 lg:px-8">
        {children}
      </main>

      <Footer />
    </div>
  );
}

