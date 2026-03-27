'use client';

import { useState } from 'react';
import ScrollReveal from '@/components/home/ScrollReveal';

export default function CreditAnalysisPage() {
  return (
    <div className="max-w-7xl mx-auto">
      {/* Hero Section */}
      <ScrollReveal direction="down" delay={0}>
        <div className="relative bg-gradient-to-br from-[#1a1f3a]/80 via-[#2563EB]/10 to-[#1a1f3a]/80 backdrop-blur-lg rounded-[32px] border border-[#2563EB]/30 p-8 sm:p-10 mb-8 shadow-2xl shadow-[#2563EB]/10 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-[#2563EB]/5 via-transparent to-[#F59E0B]/5"></div>
          
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h1 className="text-3xl sm:text-4xl font-bold text-white mb-2">
                  💳 Analyse de Dossier de Crédit
                </h1>
                <p className="text-[#CBD5E1] text-sm sm:text-base">
                  Analysez et évaluez les dossiers de crédit de manière intelligente
                </p>
              </div>
            </div>
          </div>
        </div>
      </ScrollReveal>

      {/* Content */}
      <ScrollReveal direction="up" delay={200}>
        <div className="bg-gradient-to-br from-[#1a1f3a]/80 via-[#2563EB]/10 to-[#1a1f3a]/80 backdrop-blur-lg rounded-[32px] border border-[#2563EB]/30 p-8 shadow-2xl shadow-[#2563EB]/10">
          <p className="text-[#CBD5E1] text-center py-8">
            Module d'analyse de dossier de crédit - À venir
          </p>
        </div>
      </ScrollReveal>
    </div>
  );
}

