'use client';

import React from 'react';
import { useResponsive } from '@/hooks/useResponsive';

interface TopCredit {
  ref_credit: string;
  nom_client: string;
  montant_total_impaye: number;
  jours_retard: number;
  bucket_retard: string;
  agence: string;
  gestionnaire?: string;
}

interface TopCreditsProps {
  topCredits: TopCredit[];
  title: string;
  metric: 'montant' | 'retard' | 'ratio';
  icon: string;
  color: string;
}

const TopCredits: React.FC<TopCreditsProps> = ({ topCredits, title, metric, icon, color }) => {
  const { isMobile } = useResponsive();

  console.log(`📊 TopCredits - ${title}:`, topCredits?.length || 0, 'éléments');

  const formatCurrency = (num: number | undefined | null) => {
    if (num === undefined || num === null || isNaN(num)) return '0 FCFA';
    return `${num.toLocaleString('fr-FR')} FCFA`;
  };
  const formatNumber = (num: number | undefined | null) => {
    if (num === undefined || num === null || isNaN(num)) return '0';
    return num.toLocaleString('fr-FR');
  };

  const getDisplayValue = (credit: TopCredit) => {
    switch (metric) {
      case 'montant':
        return formatCurrency(credit.montant_total_impaye);
      case 'retard':
        return `${credit.jours_retard} jours`;
      case 'ratio':
        return formatCurrency(credit.montant_total_impaye); // Simplifié pour l'instant
      default:
        return formatCurrency(credit.montant_total_impaye);
    }
  };

  const getBadgeColor = (bucket: string) => {
    const colors: Record<string, string> = {
      '0-30 jours': '#10b981',
      '31-60 jours': '#f59e0b',
      '61-90 jours': '#ef4444',
      '90+ jours': '#dc2626'
    };
    return colors[bucket] || '#6b7280';
  };

  return (
    <div style={{
      background: 'rgba(255, 255, 255, 0.05)',
      border: '1px solid rgba(211, 47, 47, 0.2)',
      borderRadius: '12px',
      padding: '1.25rem',
      marginBottom: '1rem'
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
        marginBottom: '1rem',
        fontSize: '1.1rem',
        fontWeight: '600',
        color: '#fff'
      }}>
        <span>{icon}</span>
        <span>{title}</span>
      </div>

      <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
        {topCredits.map((credit, index) => (
          <div key={credit.ref_credit} style={{
            display: 'flex',
            alignItems: 'center',
            padding: '0.75rem',
            marginBottom: '0.5rem',
            background: 'rgba(255, 255, 255, 0.03)',
            borderRadius: '8px',
            borderLeft: `4px solid ${color}`
          }}>
            {/* Rang */}
            <div style={{
              width: '30px',
              height: '30px',
              borderRadius: '50%',
              background: color,
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: '700',
              fontSize: '0.875rem',
              marginRight: '1rem'
            }}>
              {index + 1}
            </div>

            {/* Informations principales */}
            <div style={{ flex: 1 }}>
              <div style={{
                fontWeight: '600',
                color: '#fff',
                marginBottom: '0.25rem',
                fontSize: '0.95rem'
              }}>
                {credit.ref_credit}
              </div>
              <div style={{
                fontSize: '0.875rem',
                color: '#9ca3af',
                marginBottom: '0.25rem'
              }}>
                {credit.nom_client}
              </div>
              <div style={{
                fontSize: '0.75rem',
                color: '#6b7280',
                display: 'flex',
                gap: '0.5rem',
                alignItems: 'center'
              }}>
                <span>🏢 {credit.agence}</span>
                {credit.gestionnaire && <span>👤 {credit.gestionnaire}</span>}
              </div>
            </div>

            {/* Valeur et badge */}
            <div style={{ textAlign: 'right' }}>
              <div style={{
                fontSize: '1rem',
                fontWeight: '700',
                color: color,
                marginBottom: '0.25rem'
              }}>
                {getDisplayValue(credit)}
              </div>
              <div style={{
                display: 'inline-block',
                padding: '0.25rem 0.5rem',
                borderRadius: '4px',
                fontSize: '0.75rem',
                fontWeight: '600',
                color: '#fff',
                backgroundColor: getBadgeColor(credit.bucket_retard)
              }}>
                {credit.bucket_retard}
              </div>
            </div>
          </div>
        ))}

        {topCredits.length === 0 && (
          <div style={{
            textAlign: 'center',
            padding: '2rem',
            color: '#6b7280',
            fontStyle: 'italic'
          }}>
            Aucune donnée disponible
          </div>
        )}
      </div>
    </div>
  );
};

export default TopCredits;
