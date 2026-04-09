'use client';

import React from 'react';
import { useResponsive } from '@/hooks/useResponsive';

interface RepartitionData {
  [key: string]: {
    nombre: number;
    montant_total: number;
    montant_moyen: number;
    pourcentage_nombre: number;
    pourcentage_montant: number;
  };
}

interface RepartitionChartsProps {
  repartitionTranches: RepartitionData;
  repartitionSegments: RepartitionData;
  repartitionAgences: RepartitionData;
  repartitionGestionnaires: RepartitionData;
  repartitionProduits: RepartitionData;
}

const RepartitionCharts: React.FC<RepartitionChartsProps> = ({
  repartitionTranches,
  repartitionSegments,
  repartitionAgences,
  repartitionGestionnaires,
  repartitionProduits
}) => {
  const { isMobile, isTablet } = useResponsive();
  
  console.log('📊 RepartitionCharts - Données reçues:', {
    tranches: Object.keys(repartitionTranches || {}).length,
    segments: Object.keys(repartitionSegments || {}).length,
    agences: Object.keys(repartitionAgences || {}).length,
    gestionnaires: Object.keys(repartitionGestionnaires || {}).length,
    produits: Object.keys(repartitionProduits || {}).length
  });

  const formatNumber = (num: number | undefined | null) => {
    if (num === undefined || num === null || isNaN(num)) return '0';
    return num.toLocaleString('fr-FR');
  };
  const formatCurrency = (num: number | undefined | null) => `${formatNumber(num)} FCFA`;

  const renderRepartitionCard = (title: string, data: RepartitionData, icon: string, color: string) => {
    // Validation des données
    if (!data || Object.keys(data).length === 0) {
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
          <div style={{
            textAlign: 'center',
            padding: '2rem',
            color: '#6b7280',
            fontStyle: 'italic'
          }}>
            Aucune donnée disponible
          </div>
        </div>
      );
    }

    const sortedEntries = Object.entries(data).sort((a, b) => (b[1]?.montant_total || 0) - (a[1]?.montant_total || 0));
    const topEntries = sortedEntries.slice(0, isMobile ? 3 : 5);

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

        {topEntries.map(([key, stats], index) => (
          <div key={key} style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '0.75rem',
            marginBottom: '0.5rem',
            background: 'rgba(255, 255, 255, 0.03)',
            borderRadius: '8px',
            borderLeft: `4px solid ${color}`
          }}>
            <div style={{ flex: 1 }}>
              <div style={{
                fontWeight: '600',
                color: '#fff',
                marginBottom: '0.25rem'
              }}>
                {key || 'Non défini'}
              </div>
              <div style={{
                fontSize: '0.875rem',
                color: '#9ca3af'
              }}>
                {formatNumber(stats?.nombre)} dossier{(stats?.nombre || 0) > 1 ? 's' : ''} • {formatCurrency(stats?.montant_total)}
              </div>
            </div>
            
            <div style={{ textAlign: 'right' }}>
              <div style={{
                fontSize: '0.875rem',
                fontWeight: '600',
                color: color
              }}>
                {((stats?.pourcentage_montant || 0)).toFixed(1)}%
              </div>
              <div style={{
                fontSize: '0.75rem',
                color: '#6b7280'
              }}>
                du total
              </div>
            </div>
          </div>
        ))}

        {Object.keys(data).length > (isMobile ? 3 : 5) && (
          <div style={{
            textAlign: 'center',
            fontSize: '0.875rem',
            color: '#6b7280',
            marginTop: '0.5rem',
            fontStyle: 'italic'
          }}>
            ... et {Object.keys(data).length - (isMobile ? 3 : 5)} autres
          </div>
        )}
      </div>
    );
  };

  const gridCols = isMobile ? 'grid-cols-1' : isTablet ? 'grid-cols-2' : 'grid-cols-2 lg:grid-cols-3';

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
        📊 Répartitions Détaillées
      </h3>
      
      <div className={`grid ${gridCols} gap-4`}>
        {/* Répartition par tranches */}
        {renderRepartitionCard(
          'Tranches de Retard',
          repartitionTranches,
          '📈',
          '#f59e0b'
        )}

        {/* Répartition par segments */}
        {renderRepartitionCard(
          'Segments Client',
          repartitionSegments,
          '👥',
          '#3b82f6'
        )}

        {/* Répartition par agences */}
        {renderRepartitionCard(
          'Agences',
          repartitionAgences,
          '🏢',
          '#10b981'
        )}

      </div>
    </div>
  );
};

export default RepartitionCharts;
