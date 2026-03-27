'use client';

import React from 'react';
import { useResponsive } from '@/hooks/useResponsive';

interface SMSStats {
  envoyes: number;
  en_attente: number;
  echoues: number;
  taux_succes: number;
  credits_avec_sms: number;
  credits_sans_sms: number;
}

interface RecouvrementIndicators {
  taux_recouvrement: number;
  delai_moyen: number;
  regularises: number;
  partiellement_regularises: number;
  aggraves: number;
  nouveaux_impayes: number;
  post_sms: number;
}

interface StatsSMSRecouvrementProps {
  statistiquesSMS: SMSStats | null;
  indicateursRecouvrement: RecouvrementIndicators | null;
}

const StatsSMSRecouvrement: React.FC<StatsSMSRecouvrementProps> = ({
  statistiquesSMS,
  indicateursRecouvrement
}) => {
  const { isMobile, isTablet } = useResponsive();

  const formatNumber = (num: number | undefined | null) => {
    if (num === undefined || num === null || isNaN(num)) return '0';
    return num.toLocaleString('fr-FR');
  };

  const gridCols = isMobile ? 'grid-cols-1' : isTablet ? 'grid-cols-2' : 'grid-cols-2';

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
        📊 SMS & Recouvrement
      </h3>
      
      <div className={`grid ${gridCols} gap-4`}>
        
        {/* Statistiques SMS */}
        <div style={{
          background: 'rgba(255, 255, 255, 0.05)',
          border: '1px solid rgba(211, 47, 47, 0.2)',
          borderRadius: '12px',
          padding: '1.25rem'
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
            <span>📱</span>
            <span>Statistiques SMS</span>
          </div>

          {statistiquesSMS ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem' }}>
              
              <div style={{
                background: 'rgba(16, 185, 129, 0.1)',
                padding: '0.75rem',
                borderRadius: '8px',
                border: '1px solid rgba(16, 185, 129, 0.3)'
              }}>
                <div style={{ fontSize: '0.875rem', color: '#10b981', marginBottom: '0.25rem' }}>
                  ✅ Envoyés
                </div>
                <div style={{ fontSize: '1.25rem', fontWeight: '700', color: '#fff' }}>
                  {formatNumber(statistiquesSMS.envoyes)}
                </div>
              </div>

              <div style={{
                background: 'rgba(245, 158, 11, 0.1)',
                padding: '0.75rem',
                borderRadius: '8px',
                border: '1px solid rgba(245, 158, 11, 0.3)'
              }}>
                <div style={{ fontSize: '0.875rem', color: '#f59e0b', marginBottom: '0.25rem' }}>
                  ⏳ En attente
                </div>
                <div style={{ fontSize: '1.25rem', fontWeight: '700', color: '#fff' }}>
                  {formatNumber(statistiquesSMS.en_attente)}
                </div>
              </div>

              <div style={{
                background: 'rgba(239, 68, 68, 0.1)',
                padding: '0.75rem',
                borderRadius: '8px',
                border: '1px solid rgba(239, 68, 68, 0.3)'
              }}>
                <div style={{ fontSize: '0.875rem', color: '#ef4444', marginBottom: '0.25rem' }}>
                  ❌ Échoués
                </div>
                <div style={{ fontSize: '1.25rem', fontWeight: '700', color: '#fff' }}>
                  {formatNumber(statistiquesSMS.echoues)}
                </div>
              </div>

              <div style={{
                background: 'rgba(139, 92, 246, 0.1)',
                padding: '0.75rem',
                borderRadius: '8px',
                border: '1px solid rgba(139, 92, 246, 0.3)'
              }}>
                <div style={{ fontSize: '0.875rem', color: '#8b5cf6', marginBottom: '0.25rem' }}>
                  📈 Taux succès
                </div>
                <div style={{ fontSize: '1.25rem', fontWeight: '700', color: '#fff' }}>
                  {statistiquesSMS.taux_succes.toFixed(1)}%
                </div>
              </div>

              <div style={{
                background: 'rgba(59, 130, 246, 0.1)',
                padding: '0.75rem',
                borderRadius: '8px',
                border: '1px solid rgba(59, 130, 246, 0.3)',
                gridColumn: 'span 2'
              }}>
                <div style={{ fontSize: '0.875rem', color: '#3b82f6', marginBottom: '0.25rem' }}>
                  📊 Couverture SMS
                </div>
                <div style={{ fontSize: '1rem', color: '#9ca3af' }}>
                  Crédits avec SMS: {formatNumber(statistiquesSMS.credits_avec_sms)} | 
                  Sans SMS: {formatNumber(statistiquesSMS.credits_sans_sms)}
                </div>
              </div>

            </div>
          ) : (
            <div style={{
              textAlign: 'center',
              padding: '2rem',
              color: '#6b7280',
              fontStyle: 'italic'
            }}>
              Aucune statistique SMS disponible
            </div>
          )}
        </div>

        {/* Indicateurs de recouvrement */}
        <div style={{
          background: 'rgba(255, 255, 255, 0.05)',
          border: '1px solid rgba(211, 47, 47, 0.2)',
          borderRadius: '12px',
          padding: '1.25rem'
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
            <span>💰</span>
            <span>Indicateurs Recouvrement</span>
          </div>

          {indicateursRecouvrement ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem' }}>
              
              <div style={{
                background: 'rgba(16, 185, 129, 0.1)',
                padding: '0.75rem',
                borderRadius: '8px',
                border: '1px solid rgba(16, 185, 129, 0.3)'
              }}>
                <div style={{ fontSize: '0.875rem', color: '#10b981', marginBottom: '0.25rem' }}>
                  📈 Taux recouvrement
                </div>
                <div style={{ fontSize: '1.25rem', fontWeight: '700', color: '#fff' }}>
                  {indicateursRecouvrement.taux_recouvrement.toFixed(1)}%
                </div>
              </div>

              <div style={{
                background: 'rgba(59, 130, 246, 0.1)',
                padding: '0.75rem',
                borderRadius: '8px',
                border: '1px solid rgba(59, 130, 246, 0.3)'
              }}>
                <div style={{ fontSize: '0.875rem', color: '#3b82f6', marginBottom: '0.25rem' }}>
                  ⏱️ Délai moyen
                </div>
                <div style={{ fontSize: '1.25rem', fontWeight: '700', color: '#fff' }}>
                  {indicateursRecouvrement.delai_moyen} jours
                </div>
              </div>

              <div style={{
                background: 'rgba(34, 197, 94, 0.1)',
                padding: '0.75rem',
                borderRadius: '8px',
                border: '1px solid rgba(34, 197, 94, 0.3)'
              }}>
                <div style={{ fontSize: '0.875rem', color: '#22c55e', marginBottom: '0.25rem' }}>
                  ✅ Régularisés
                </div>
                <div style={{ fontSize: '1.25rem', fontWeight: '700', color: '#fff' }}>
                  {formatNumber(indicateursRecouvrement.regularises)}
                </div>
              </div>

              <div style={{
                background: 'rgba(251, 191, 36, 0.1)',
                padding: '0.75rem',
                borderRadius: '8px',
                border: '1px solid rgba(251, 191, 36, 0.3)'
              }}>
                <div style={{ fontSize: '0.875rem', color: '#fbbf24', marginBottom: '0.25rem' }}>
                  ⚠️ Partiellement régularisés
                </div>
                <div style={{ fontSize: '1.25rem', fontWeight: '700', color: '#fff' }}>
                  {formatNumber(indicateursRecouvrement.partiellement_regularises)}
                </div>
              </div>

              <div style={{
                background: 'rgba(239, 68, 68, 0.1)',
                padding: '0.75rem',
                borderRadius: '8px',
                border: '1px solid rgba(239, 68, 68, 0.3)'
              }}>
                <div style={{ fontSize: '0.875rem', color: '#ef4444', marginBottom: '0.25rem' }}>
                  📉 Aggravés
                </div>
                <div style={{ fontSize: '1.25rem', fontWeight: '700', color: '#fff' }}>
                  {formatNumber(indicateursRecouvrement.aggraves)}
                </div>
              </div>

              <div style={{
                background: 'rgba(168, 85, 247, 0.1)',
                padding: '0.75rem',
                borderRadius: '8px',
                border: '1px solid rgba(168, 85, 247, 0.3)'
              }}>
                <div style={{ fontSize: '0.875rem', color: '#a855f7', marginBottom: '0.25rem' }}>
                  🆕 Nouveaux impayés
                </div>
                <div style={{ fontSize: '1.25rem', fontWeight: '700', color: '#fff' }}>
                  {formatNumber(indicateursRecouvrement.nouveaux_impayes)}
                </div>
              </div>

              <div style={{
                background: 'rgba(6, 182, 212, 0.1)',
                padding: '0.75rem',
                borderRadius: '8px',
                border: '1px solid rgba(6, 182, 212, 0.3)',
                gridColumn: 'span 2'
              }}>
                <div style={{ fontSize: '0.875rem', color: '#06b6d4', marginBottom: '0.25rem' }}>
                  📱 Post-SMS
                </div>
                <div style={{ fontSize: '1rem', color: '#9ca3af' }}>
                  Actions après envoi SMS: {formatNumber(indicateursRecouvrement.post_sms)}
                </div>
              </div>

            </div>
          ) : (
            <div style={{
              textAlign: 'center',
              padding: '2rem',
              color: '#6b7280',
              fontStyle: 'italic'
            }}>
              Aucun indicateur de recouvrement disponible
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

export default StatsSMSRecouvrement;
