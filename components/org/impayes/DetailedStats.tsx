'use client';

import React from 'react';
import { useResponsive } from '@/hooks/useResponsive';

interface EvolutionData {
  valeur: number;
  pourcentage: number;
  icone: 'arrow-up' | 'arrow-down' | 'equal';
  couleur: 'success-dark' | 'danger-dark' | 'neutral';
}

interface DetailedStatsProps {
  kpis: {
    total_montant_impaye: number;
    total_credits: number;
    total_encours: number;
    montant_moyen_par_credit: number;
    ratio_impaye_encours_moyen: number;
    candidats_restructuration: number;
    taux_impayes: number;
  };
  evolution?: {
    montant_impaye?: EvolutionData;
    nombre_credits?: EvolutionData;
    candidats_restructuration?: EvolutionData;
  };
}

const DetailedStats: React.FC<DetailedStatsProps> = ({ kpis, evolution }) => {
  const { isMobile, isTablet } = useResponsive();

  const formatNumber = (num: number | undefined | null) => {
    if (num === undefined || num === null || isNaN(num)) return '0';
    return num.toLocaleString('fr-FR');
  };
  const formatCurrency = (num: number | undefined | null) => `${formatNumber(num)} FCFA`;

  const getEvolutionIcon = (evo: EvolutionData | undefined) => {
    if (!evo) return null;
    const icons: Record<string, string> = {
      'arrow-up': '📈',
      'arrow-down': '📉', 
      'equal': '➡️'
    };
    return icons[evo.icone] || '➡️';
  };

  const getEvolutionColor = (evo: EvolutionData | undefined) => {
    if (!evo) return '#CBD5E1';
    const colors: Record<string, string> = {
      'success-dark': '#10b981',
      'danger-dark': '#ef4444',
      'neutral': '#6b7280'
    };
    return colors[evo.couleur] || '#6b7280';
  };

  const kpiCards = [
    {
      title: 'Total Impayé',
      value: formatCurrency(kpis.total_montant_impaye),
      icon: '💰',
      evolution: 'montant_impaye',
      description: 'Montant total des impayés'
    },
    {
      title: 'Total Encours',
      value: formatCurrency(kpis.total_encours),
      icon: '🏦',
      evolution: null,
      description: 'Encours total des crédits'
    },
    {
      title: 'Nombre de Crédits',
      value: formatNumber(kpis.total_credits),
      icon: '📊',
      evolution: 'nombre_credits',
      description: 'Nombre total de crédits'
    },
    {
      title: 'Montant Moyen',
      value: formatCurrency(kpis.montant_moyen_par_credit),
      icon: '📈',
      evolution: null,
      description: 'Montant moyen par crédit'
    },
    {
      title: 'Taux d\'Impayés',
      value: `${kpis.taux_impayes.toFixed(1)}%`,
      icon: '⚠️',
      evolution: null,
      description: 'Taux d\'impayés global'
    },
    {
      title: 'Ratio Impayé/Encours',
      value: `${kpis.ratio_impaye_encours_moyen.toFixed(1)}%`,
      icon: '📊',
      evolution: null,
      description: 'Ratio moyen impayé/encours'
    },
    {
      title: 'Candidats Restructuration',
      value: formatNumber(kpis.candidats_restructuration),
      icon: '🔄',
      evolution: 'candidats_restructuration',
      description: 'Crédits éligibles à la restructuration'
    }
  ];

  const gridCols = isMobile ? 'grid-cols-1' : isTablet ? 'grid-cols-2' : 'grid-cols-3 lg:grid-cols-4';

  return (
    <div style={{ marginBottom: '2rem' }}>
      <h3 style={{ 
        fontSize: '1.25rem', 
        fontWeight: '600', 
        marginBottom: '1.5rem', 
        color: '#fff',
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem'
      }}>
        📊 Indicateurs Clés
      </h3>
      
      <div className={`grid ${gridCols} gap-4`}>
        {kpiCards.map((kpi, index) => (
          <div
            key={index}
            style={{
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(211, 47, 47, 0.2)',
              borderRadius: '12px',
              padding: '1.25rem',
              position: 'relative',
              overflow: 'hidden'
            }}
          >
            {/* Icône principale */}
            <div style={{
              fontSize: '2rem',
              marginBottom: '0.75rem',
              opacity: 0.8
            }}>
              {kpi.icon}
            </div>
            
            {/* Titre */}
            <div style={{
              fontSize: '0.875rem',
              color: '#9ca3af',
              marginBottom: '0.5rem',
              fontWeight: '500'
            }}>
              {kpi.title}
            </div>
            
            {/* Valeur */}
            <div style={{
              fontSize: '1.5rem',
              fontWeight: '700',
              color: '#fff',
              marginBottom: '0.5rem'
            }}>
              {kpi.value}
            </div>
            
            {/* Évolution si disponible */}
            {kpi.evolution && evolution && (evolution as any)[kpi.evolution] && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.25rem',
                fontSize: '0.75rem',
                color: getEvolutionColor((evolution as any)[kpi.evolution]),
                fontWeight: '600'
              }}>
                <span>{getEvolutionIcon((evolution as any)[kpi.evolution])}</span>
                <span>
                  {(evolution as any)[kpi.evolution].pourcentage > 0 ? '+' : ''}{(evolution as any)[kpi.evolution].pourcentage.toFixed(1)}%
                </span>
              </div>
            )}
            
            {/* Description */}
            <div style={{
              fontSize: '0.75rem',
              color: '#6b7280',
              marginTop: '0.5rem',
              fontStyle: 'italic'
            }}>
              {kpi.description}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default DetailedStats;
