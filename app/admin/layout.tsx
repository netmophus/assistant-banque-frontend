'use client';

import { MobileViewportGuard } from '@/components/MobileViewportGuard';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <MobileViewportGuard />
      {children}
    </>
  );
}
