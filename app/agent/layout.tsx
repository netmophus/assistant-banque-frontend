'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import { authApi } from '@/lib/api/auth';

export default function AgentLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const user = authApi.getCurrentUser();
    if (!user) {
      router.push('/login');
      return;
    }
    // Admins n'ont pas besoin de cette zone — ils ont /org/
    if (user.role === 'admin' || user.role === 'superadmin') {
      router.push('/org/dashboard');
    }
  }, [router, pathname]);

  return (
    <div className="min-h-screen flex flex-col bg-[#0B1026]">
      <Navbar />
      <main className="flex-1 pt-20 pb-8 px-4 sm:px-6 lg:px-8">
        {children}
      </main>
      <Footer />
    </div>
  );
}
