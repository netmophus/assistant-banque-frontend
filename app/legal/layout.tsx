import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';

export default function LegalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#040B1E] text-white flex flex-col">
      <Navbar />

      <main className="relative flex-1 pt-24 pb-16">
        {/* Ambient glows */}
        <div className="pointer-events-none absolute top-20 left-1/4 w-[500px] h-[300px] bg-[#1B3A8C]/15 rounded-full blur-[120px]" />
        <div className="pointer-events-none absolute top-1/2 right-0 w-[400px] h-[250px] bg-[#C9A84C]/5 rounded-full blur-[100px]" />

        <div className="relative max-w-4xl mx-auto px-6 sm:px-10">
          <div className="rounded-3xl border border-white/10 bg-white/[0.03] backdrop-blur-sm p-6 sm:p-10 lg:p-14 shadow-[0_0_60px_rgba(27,58,140,0.15)]">
            {children}
          </div>

          <p className="mt-8 text-center text-[11px] text-white/40">
            Dernière mise à jour : avril 2026
          </p>
        </div>
      </main>

      <Footer />
    </div>
  );
}
