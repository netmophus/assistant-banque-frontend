'use client';

import { useState } from 'react';
import {
  SubscriptionRequestModal,
  type PlanKey,
} from '@/components/SubscriptionRequestModal';

type Props = {
  planKey: PlanKey;
  waLink: string;
  featured?: boolean;
};

/**
 * CTA d'une carte d'offre sur /tarifs :
 * - Bouton principal dominant "Demander cette offre" → ouvre la modale formulaire
 * - Lien secondaire discret "ou contacter sur WhatsApp" sous le bouton
 */
export function OfferCTA({ planKey, waLink, featured }: Props) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <div className="flex flex-col items-stretch gap-3">
        {/* Bouton principal — Demander cette offre */}
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className={`flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl font-bold text-sm transition-all duration-300 hover:scale-105 ${
            featured
              ? 'bg-[#C9A84C] text-[#0A1434] hover:bg-[#E8D08A] shadow-lg shadow-[#C9A84C]/30'
              : 'bg-[#1B3A8C] text-white hover:bg-[#2E5BB8] border border-[#C9A84C]/30'
          }`}
        >
          Demander cette offre
        </button>

        {/* Lien secondaire — WhatsApp */}
        <a
          href={waLink}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Contacter sur WhatsApp"
          className="text-center text-xs text-white/50 hover:text-[#C9A84C] hover:underline transition-colors"
        >
          ou contacter sur WhatsApp
        </a>
      </div>

      <SubscriptionRequestModal
        isOpen={isOpen}
        initialPlan={planKey}
        onClose={() => setIsOpen(false)}
      />
    </>
  );
}
