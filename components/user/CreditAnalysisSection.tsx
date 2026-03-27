'use client';

import { useState } from 'react';
import CreditParticulierForm from './CreditParticulierForm';
import CreditPMEForm from './CreditPMEForm';

export default function CreditAnalysisSection() {
  const [activeTab, setActiveTab] = useState<'particulier' | 'pme'>('particulier');

  return (
    <div>
      {/* Sélection du type de crédit */}
      <div className="mb-8">
        <div className="flex flex-wrap justify-center gap-4 bg-white/5 backdrop-blur-lg rounded-xl p-2 border border-white/10">
          <button
            onClick={() => setActiveTab('particulier')}
            className={`flex items-center space-x-2 px-6 py-3 rounded-lg font-semibold text-base transition-all duration-300 ${
              activeTab === 'particulier'
                ? 'bg-gradient-to-r from-[#2563EB] to-[#7C3AED] text-white shadow-lg shadow-[#2563EB]/30'
                : 'text-[#CBD5E1] hover:text-white hover:bg-white/5'
            }`}
          >
            <span className="text-xl">👤</span>
            <span>Crédit Particulier</span>
          </button>
          <button
            onClick={() => setActiveTab('pme')}
            className={`flex items-center space-x-2 px-6 py-3 rounded-lg font-semibold text-base transition-all duration-300 ${
              activeTab === 'pme'
                ? 'bg-gradient-to-r from-[#F59E0B] to-[#EF4444] text-white shadow-lg shadow-[#F59E0B]/30'
                : 'text-[#CBD5E1] hover:text-white hover:bg-white/5'
            }`}
          >
            <span className="text-xl">🏢</span>
            <span>Crédit PME/PMI</span>
          </button>
        </div>
      </div>

      {/* Contenu selon l'onglet actif */}
      {activeTab === 'particulier' && <CreditParticulierForm />}
      {activeTab === 'pme' && <CreditPMEForm />}
    </div>
  );
}

