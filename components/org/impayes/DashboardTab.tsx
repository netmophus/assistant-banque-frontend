'use client';

import React, { useState, useEffect } from 'react';
import { useResponsive } from '@/hooks/useResponsive';
import { apiClient } from '@/lib/api/client';
import DetailedStats from './DetailedStats';
import RepartitionCharts from './RepartitionCharts';
import TopCredits from './TopCredits';
import StatsSMSRecouvrement from './StatsSMSRecouvrement';

interface Statistiques {
  total_montant_impaye: number;
  total_credits: number;
  candidats_restructuration: number;
  ratio_impaye_encours_moyen?: number;
  repartition_tranches?: Record<string, number>;
  repartition_segments?: Record<string, number>;
  repartition_agences?: Record<string, number>;
}

interface PeriodesDisponibles {
  periodes: string[];
  periode_courante: string;
}

interface Bilan {
  references: {
    avant: number;
    apres: number;
    nouvelles: number;
    disparues: number;
    stables: number;
    evoluees: number;
  };
  montants: {
    avant: number;
    apres: number;
    nouveaux: number;
    recuperes: number;
    aggraves: number;
  };
  taux: {
    recouvrement: number;
    renouvellement_references: number;
    stabilite: number;
  };
}

interface Comparaison {
  date_precedente?: string;
  date_actuelle: string;
  date_situation?: string;
  stats_precedentes?: Statistiques;
  stats_actuelles: Statistiques;
  evolution?: {
    montant_impaye?: {
      valeur: number;
      pourcentage: number;
      icone: 'arrow-up' | 'arrow-down' | 'equal';
      style_recommande?: React.CSSProperties;
    };
    nombre_credits?: {
      valeur: number;
      pourcentage: number;
      icone: 'arrow-up' | 'arrow-down' | 'equal';
      style_recommande?: React.CSSProperties;
    };
    candidats_restructuration?: {
      valeur: number;
      pourcentage: number;
      icone: 'arrow-up' | 'arrow-down' | 'equal';
      style_recommande?: React.CSSProperties;
    };
    ratio_moyen?: {
      valeur: number;
      pourcentage: number;
      icone: 'arrow-up' | 'arrow-down' | 'equal';
      style_recommande?: React.CSSProperties;
    };
  };
  tendance?: 'hausse' | 'baisse' | 'stable' | 'pas_de_comparaison';
  couleur_tendance?: 'danger-dark' | 'success-dark' | 'neutral';
  icone_tendance?: 'arrow-up' | 'arrow-down' | 'equal';
  bilan?: Bilan;
  resultats?: any;
  periode_analyse?: string;
}

const formatEvolution = (evo?: { valeur: number; pourcentage: number; icone: 'arrow-up' | 'arrow-down' | 'equal' }) => {
  if (!evo) return '';
  const arrow = evo.icone === 'arrow-up' ? 'hausse' : evo.icone === 'arrow-down' ? 'baisse' : 'stable';
  const pct = `${evo.pourcentage > 0 ? '+' : ''}${evo.pourcentage.toFixed(1)}%`;
  return `${arrow} (${pct})`;
};

const DashboardTab = () => {
  const { isMobile, isTablet } = useResponsive();
  const [loading, setLoading] = useState(false);
  const [deletingSituation, setDeletingSituation] = useState(false);
  const [error, setError] = useState('');
  const [availableDates, setAvailableDates] = useState<string[]>([]);
  const [selectedDateSituation, setSelectedDateSituation] = useState<string>('');
  const [statistiques, setStatistiques] = useState<Statistiques | null>(null);
  
  // Nouveaux états pour la gestion des périodes
  const [availablePeriodes, setAvailablePeriodes] = useState<PeriodesDisponibles | null>(null);
  const [selectedPeriode, setSelectedPeriode] = useState<string>('');
  const [loadingPeriodes, setLoadingPeriodes] = useState(false);
  const [comparaison, setComparaison] = useState<Comparaison | null>(null);
  const [tranchesConfig, setTranchesConfig] = useState<any[]>([]);
  const [dashboardDetaille, setDashboardDetaille] = useState<any>(null);
  const [loadingDashboard, setLoadingDashboard] = useState(false);

  // Helper function to get headers with authentication token
  const getAuthHeaders = (): HeadersInit => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
  };

  useEffect(() => {
    loadAvailableDates();
    loadAvailablePeriodes(); // Nouveau : charger les périodes
    loadTranchesConfig();
  }, []);

  useEffect(() => {
    if (selectedPeriode) {
      loadAvailableDates(); // Recharger les dates pour la période sélectionnée
    }
  }, [selectedPeriode]);

  useEffect(() => {
    if (selectedDateSituation) {
      loadStatistiques();
    }
  }, [selectedDateSituation]);

  useEffect(() => {
    console.log('🔄 Dashboard - useEffect comparaison - selectedDateSituation:', selectedDateSituation);
    console.log('🔄 Dashboard - useEffect comparaison - statistiques:', !!statistiques);
    if (selectedDateSituation && statistiques) {
      console.log('✅ Dashboard - Conditions remplies, appel de loadComparaison');
      loadComparaison();
    } else {
      console.log('❌ Dashboard - Conditions non remplies pour loadComparaison');
    }
  }, [selectedDateSituation, statistiques]);

  useEffect(() => {
    if (selectedDateSituation) {
      loadDashboardDetaille();
    }
  }, [selectedDateSituation]);

  useEffect(() => {
    loadDashboardDetaille();
  }, [selectedDateSituation]);

  // Écouter les événements d'import pour recharger le dashboard
  useEffect(() => {
    const handleDataImported = (event: CustomEvent) => {
      console.log(' Données importées, rechargement du dashboard...');
      loadDashboardDetaille();
    };

    window.addEventListener('dataImported', handleDataImported as EventListener);
    
    return () => {
      window.removeEventListener('dataImported', handleDataImported as EventListener);
    };
  }, [selectedDateSituation]);

  const loadAvailablePeriodes = async () => {
    try {
      setLoadingPeriodes(true);
      const response = await apiClient.get<PeriodesDisponibles>('/impayes/periodes');
      setAvailablePeriodes(response);
      
      // Sélectionner automatiquement la période courante
      if (response.periode_courante && !selectedPeriode) {
        setSelectedPeriode(response.periode_courante);
      }
    } catch (err: any) {
      console.error('Erreur lors du chargement des périodes:', err);
      setError(err.message || 'Erreur lors du chargement des périodes');
    } finally {
      setLoadingPeriodes(false);
    }
  };

  const deleteSelectedSituation = async () => {
    if (!selectedDateSituation) {
      setError('Veuillez sélectionner une date de situation à supprimer.');
      return;
    }

    const confirmed = window.confirm(
      `Confirmer la suppression de la situation du ${selectedDateSituation} ?\n\nCela supprimera les snapshots et les SMS associés.`
    );
    if (!confirmed) return;

    try {
      setDeletingSituation(true);
      setError('');

      await apiClient.delete(
        `/impayes/situation?date_situation=${encodeURIComponent(selectedDateSituation)}`
      );

      setStatistiques(null);
      setComparaison(null);
      setSelectedDateSituation('');

      await loadAvailablePeriodes();
      await loadAvailableDates();
    } catch (err: any) {
      console.error('Erreur lors de la suppression de la situation:', err);
      setError(err.message || 'Erreur lors de la suppression de la situation');
    } finally {
      setDeletingSituation(false);
    }
  };

  const loadAvailableDates = async () => {
    try {
      // Ajouter le paramètre periode_suivi si disponible
      const url = selectedPeriode 
        ? `/api/impayes/dates-situation?periode_suivi=${selectedPeriode}`
        : '/api/impayes/dates-situation';
        
      const response = await fetch(url, {
        headers: getAuthHeaders(),
      });

      if (!response.ok) {
        throw new Error('Erreur lors du chargement des dates');
      }

      const data: any = await response.json();
      const rawDates: any[] = Array.isArray(data?.dates) ? data.dates : [];

      const dates: string[] = Array.from(
        new Set<string>(
          rawDates
            .filter((d) => d !== null && d !== undefined)
            .map((d) => String(d).trim())
            .filter((d) => d.length > 0)
        )
      ).sort((a: string, b: string) => b.localeCompare(a));

      console.log('🗓️ Dashboard - Dates brutes:', rawDates);
      console.log('🗓️ Dashboard - Dates traitées:', dates);
      console.log('🗓️ Dashboard - Date précédente avant mise à jour:', selectedDateSituation);

      setAvailableDates(dates);

      setSelectedDateSituation((prev: string) => {
        console.log('🗓️ Dashboard - setSelectedDateSituation appelé avec prev:', prev);
        const newSelection = prev && dates.includes(prev) ? prev : (dates.length > 0 ? dates[0] : '');
        console.log('🗓️ Dashboard - Nouvelle sélection calculée:', newSelection);
        return newSelection;
      });
    } catch (err: any) {
      console.error('Erreur lors du chargement des dates:', err);
      setError(err.message || 'Erreur lors du chargement des dates');
    }
  };

  const loadTranchesConfig = async () => {
    try {
      const response = await fetch('/api/impayes/config', {
        headers: getAuthHeaders(),
      });

      if (response.ok) {
        const data = await response.json();
        setTranchesConfig(data.tranches_retard || []);
      }
    } catch (err) {
      console.error('Erreur lors du chargement de la configuration des tranches:', err);
    }
  };

  const loadDashboardDetaille = async () => {
    try {
      setLoadingDashboard(true);
      
      const endpoint = `/impayes/dashboard${selectedDateSituation ? `?date_situation=${selectedDateSituation}` : ''}`;
      const data = await apiClient.get<any>(endpoint);
      console.log('📊 Dashboard détaillé reçu:', data);
      console.log('📊 KPIs:', data?.kpis);
      console.log('📊 Répartitions:', {
        tranches: Object.keys(data?.repartition_tranches || {}).length,
        segments: Object.keys(data?.repartition_segments || {}).length,
        agences: Object.keys(data?.repartition_agences || {}).length,
        gestionnaires: Object.keys(data?.repartition_gestionnaires || {}).length,
        produits: Object.keys(data?.repartition_produits || {}).length
      });
      console.log('📊 Top crédits:', {
        montant: data?.top_10_credits_par_montant?.length || 0,
        retard: data?.top_10_credits_par_jours_retard?.length || 0,
        ratio: data?.top_10_credits_par_ratio?.length || 0
      });
      console.log('📊 SMS:', data?.statistiques_sms ? 'présents' : 'absents');
      console.log('📊 Recouvrement:', data?.indicateurs_recouvrement ? 'présents' : 'absents');
      setDashboardDetaille(data);
    } catch (err: any) {
      console.error('❌ Erreur dashboard détaillé:', err);
      setError(err.message || 'Erreur lors du chargement du dashboard détaillé');
    } finally {
      setLoadingDashboard(false);
    }
  };

  const getTrancheLabel = (trancheName: string) => {
    const tranche = tranchesConfig.find((t: any) => t.libelle === trancheName || t.statut === trancheName);
    if (!tranche) {
      return trancheName;
    }

    const minJours = tranche.min_jours || 0;
    const maxJours = tranche.max_jours;

    if (maxJours !== null && maxJours !== undefined) {
      return `${trancheName} (${minJours}-${maxJours} jours)`;
    } else {
      return `${trancheName} (≥${minJours} jours)`;
    }
  };

  const loadStatistiques = async () => {
    if (!selectedDateSituation) return;

    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({ date_situation: selectedDateSituation });
      const response = await fetch(`/api/impayes/statistiques?${params}`, {
        headers: getAuthHeaders(),
      });

      if (!response.ok) {
        throw new Error('Erreur lors du chargement des statistiques');
      }

      const data: Statistiques = await response.json();
      setStatistiques(data);
    } catch (err: any) {
      console.error('Erreur lors du chargement des statistiques:', err);
      setError(err.message || 'Erreur lors du chargement des statistiques');
    } finally {
      setLoading(false);
    }
  };

  const loadComparaison = async () => {
    console.log('🔄 Dashboard - loadComparaison appelée avec selectedDateSituation:', selectedDateSituation);
    if (!selectedDateSituation) {
      console.log('❌ Dashboard - Pas de date sélectionnée, loadComparaison annulée');
      return;
    }

    try {
      // Charger la comparaison statistique (pour tendance et évolution)
      const statsEndpoint = `/impayes/statistiques/comparaison?date_actuelle=${selectedDateSituation}`;
      let statsData = null;
      try {
        statsData = await apiClient.get<any>(statsEndpoint);
      } catch (err) {
        console.warn('Comparaison statistique non disponible:', err);
      }

      // Charger le bilan métier (pour le bilan consolidé)
      let bilanData = null;
      try {
        const bilanEndpoint = `/impayes/situations/comparaison?date_actuelle=${selectedDateSituation}`;
        bilanData = await apiClient.get<any>(bilanEndpoint);
        console.log('✅ Bilan métier chargé avec succès');
      } catch (err) {
        console.warn('Bilan métier non disponible:', err);
      }

      // Fusionner les deux sources de données
      const mergedData = {
        ...(statsData || {}),  // Garde tendance, évolution, etc.
        ...(bilanData || {}),  // Ajoute bilan, resultats, etc.
      };

      console.log('🔍 Dashboard - Stats data:', statsData);
      console.log('🔍 Dashboard - Bilan data:', bilanData);
      console.log('🔍 Dashboard - Merged data:', mergedData);
      console.log('🔍 Dashboard - Bilan disponible?', !!mergedData.bilan);
      console.log('🔍 Dashboard - Tendance disponible?', !!mergedData.tendance);

      setComparaison(mergedData);
    } catch (err: any) {
      console.error('Erreur lors du chargement de la comparaison:', err);
      setComparaison(null);
    }
  };

  return (
    <div>
      {/* Sélecteurs de période et date */}
      <div
        style={{
          marginBottom: '20px',
          display: 'flex',
          gap: '10px',
          alignItems: 'center',
          flexWrap: 'wrap',
          padding: '1rem',
          background: 'rgba(255, 255, 255, 0.05)',
          borderRadius: '12px',
          border: '1px solid rgba(211, 47, 47, 0.2)',
        }}
      >
        {/* Sélecteur de période */}
        <label style={{ fontSize: '0.9rem', fontWeight: '500', color: '#CBD5E1' }}>
          Période de suivi :
        </label>
        <select
          value={selectedPeriode}
          onChange={(e) => setSelectedPeriode(e.target.value)}
          disabled={loadingPeriodes}
          style={{
            padding: '8px 12px',
            borderRadius: '8px',
            border: '2px solid rgba(211, 47, 47, 0.3)',
            fontSize: '0.9rem',
            minWidth: '150px',
            background: 'rgba(255, 255, 255, 0.1)',
            color: '#fff',
            cursor: loadingPeriodes ? 'not-allowed' : 'pointer',
          }}
        >
          {loadingPeriodes ? (
            <option value="">Chargement...</option>
          ) : (
            <>
              {availablePeriodes?.periodes.map((periode) => (
                <option key={periode} value={periode}>
                  {periode} {periode === availablePeriodes.periode_courante && '(courante)'}
                </option>
              ))}
            </>
          )}
        </select>

        {/* Sélecteur de date */}
        <label style={{ fontSize: '0.9rem', fontWeight: '500', color: '#CBD5E1', marginLeft: '20px' }}>
          Date de situation :
        </label>
        <select
          value={selectedDateSituation}
          onChange={(e) => {
            console.log('🗓️ Dashboard - Date sélectionnée:', e.target.value);
            console.log('🗓️ Dashboard - Date précédente:', selectedDateSituation);
            console.log('🗓️ Dashboard - Dates disponibles:', availableDates);
            setSelectedDateSituation(e.target.value);
          }}
          style={{
            padding: '8px 12px',
            borderRadius: '8px',
            border: '2px solid rgba(211, 47, 47, 0.3)',
            fontSize: '0.9rem',
            minWidth: '200px',
            background: '#1a1f3a',
            color: '#fff',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
          }}
        >
          <option value="" style={{ background: '#1a1f3a', color: '#cbd5e1' }}>Toutes les dates</option>
          {availableDates.map((date) => (
            <option key={`date_${date}`} value={date} style={{ background: '#1a1f3a', color: '#fff', fontWeight: selectedDateSituation === date ? '600' : '400' }}>
              {date}
            </option>
          ))}
        </select>

        <button
          onClick={deleteSelectedSituation}
          disabled={deletingSituation || !selectedDateSituation}
          style={{
            marginLeft: '20px',
            padding: '8px 12px',
            borderRadius: '8px',
            border: '2px solid rgba(211, 47, 47, 0.6)',
            background: deletingSituation || !selectedDateSituation ? 'rgba(211, 47, 47, 0.2)' : 'rgba(211, 47, 47, 0.35)',
            color: '#fff',
            fontSize: '0.9rem',
            cursor: deletingSituation || !selectedDateSituation ? 'not-allowed' : 'pointer',
          }}
        >
          {deletingSituation ? 'Suppression...' : 'Supprimer la situation'}
        </button>
      </div>

      {error && (
        <div
          style={{
            padding: '1rem',
            background: 'rgba(211, 47, 47, 0.2)',
            color: '#ff6b6b',
            borderRadius: '12px',
            marginBottom: '1rem',
            border: '1px solid rgba(211, 47, 47, 0.3)',
          }}
        >
          ⚠️ {error}
        </div>
      )}

      {loading && (
        <div style={{ padding: '2rem', textAlign: 'center', color: '#CBD5E1' }}>
          <p>Chargement des statistiques...</p>
        </div>
      )}

      {!loading && comparaison && selectedDateSituation && (
        <div
          style={{
            padding: '1.25rem',
            background: 'rgba(255, 255, 255, 0.06)',
            borderRadius: '16px',
            border: '1px solid rgba(46, 125, 50, 0.25)',
            marginBottom: '20px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
            <div style={{ color: '#fff', fontWeight: 800, fontSize: '1rem' }}>Résumé de la situation</div>
            <div style={{ color: '#CBD5E1', fontSize: '0.85rem' }}>
              {comparaison.date_precedente ? `Comparaison : ${comparaison.date_precedente} → ${selectedDateSituation}` : `Situation : ${selectedDateSituation}`}
            </div>
          </div>

          <div style={{ marginTop: '0.75rem', color: '#E2E8F0', lineHeight: 1.6 }}>
            {comparaison.date_precedente ? (
              <>
                {/* Bilan consolidé */}
                {(() => {
                  console.log('🎯 Dashboard - Affichage bilan - comparaison.bilan:', comparaison.bilan);
                  console.log('🎯 Dashboard - Affichage bilan - condition:', !!comparaison.bilan);
                  return comparaison.bilan;
                })() && (
                  <div style={{ marginBottom: '1rem', padding: '0.75rem', backgroundColor: 'rgba(59, 130, 246, 0.1)', borderRadius: '8px', border: '1px solid rgba(59, 130, 246, 0.3)' }}>
                    <div style={{ fontSize: '0.85rem', fontWeight: '600', marginBottom: '0.5rem', color: '#93C5FD' }}>📊 Bilan des Références:</div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem', fontSize: '0.8rem', marginBottom: '0.75rem' }}>
                      <div>Références avant : <strong>{comparaison.bilan?.references?.avant}</strong></div>
                      <div>Références après : <strong>{comparaison.bilan?.references?.apres}</strong></div>
                      <div>Nouvelles : <strong style={{ color: '#FCD34D' }}>+{comparaison.bilan?.references?.nouvelles}</strong></div>
                      <div>Disparues : <strong style={{ color: '#F87171' }}>-{comparaison.bilan?.references?.disparues}</strong></div>
                      <div>Stables : <strong style={{ color: '#A78BFA' }}>{comparaison.bilan?.references?.stables}</strong></div>
                      <div>Évoluées : <strong style={{ color: '#60A5FA' }}>{comparaison.bilan?.references?.evoluees}</strong></div>
                    </div>

                    <div style={{ fontSize: '0.85rem', fontWeight: '600', marginBottom: '0.5rem', color: '#93C5FD' }}>💰 Bilan des Montants:</div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem', fontSize: '0.8rem' }}>
                      <div>Avant : <strong>{comparaison.bilan?.montants?.avant?.toLocaleString('fr-FR')} FCFA</strong></div>
                      <div>Après : <strong>{comparaison.bilan?.montants?.apres?.toLocaleString('fr-FR')} FCFA</strong></div>
                      <div>Nouveaux : <strong style={{ color: '#FCD34D' }}>+{comparaison.bilan?.montants?.nouveaux?.toLocaleString('fr-FR')} FCFA</strong></div>
                      <div>Récupérés : <strong style={{ color: '#34D399' }}>-{comparaison.bilan?.montants?.recuperes?.toLocaleString('fr-FR')} FCFA</strong></div>
                      <div>Aggravés : <strong style={{ color: '#F87171' }}>+{comparaison.bilan?.montants?.aggraves?.toLocaleString('fr-FR')} FCFA</strong></div>
                      <div>Taux recouvrement : <strong style={{ color: '#34D399' }}>{comparaison.bilan?.taux?.recouvrement?.toFixed(1)}%</strong></div>
                    </div>
                  </div>
                )}
                
                <div>
                  Entre le <strong>{comparaison.date_precedente}</strong> et le <strong>{selectedDateSituation}</strong>, la tendance est{' '}
                  <strong>
                    {comparaison.tendance === 'hausse'
                      ? 'à la hausse'
                      : comparaison.tendance === 'baisse'
                        ? 'à la baisse'
                        : comparaison.tendance === 'stable'
                          ? 'stable'
                          : 'non disponible'}
                  </strong>.
                </div>
                <div style={{ marginTop: '0.5rem' }}>
                  <div>
                    Montant total impayé :{' '}
                    <strong>{formatEvolution(comparaison.evolution?.montant_impaye) || 'non disponible'}</strong>
                    {comparaison.evolution?.montant_impaye ? (
                      <> (diff. {comparaison.evolution.montant_impaye.valeur > 0 ? '+' : ''}{comparaison.evolution.montant_impaye.valeur.toLocaleString('fr-FR')} FCFA)</>
                    ) : null}
                  </div>
                  <div>
                    Nombre de crédits : <strong>{formatEvolution(comparaison.evolution?.nombre_credits) || 'non disponible'}</strong>
                    {comparaison.evolution?.nombre_credits ? (
                      <> (diff. {comparaison.evolution.nombre_credits.valeur > 0 ? '+' : ''}{comparaison.evolution.nombre_credits.valeur} crédit(s))</>
                    ) : null}
                  </div>
                  <div>
                    Candidats à la restructuration :{' '}
                    <strong>{formatEvolution(comparaison.evolution?.candidats_restructuration) || 'non disponible'}</strong>
                    {comparaison.evolution?.candidats_restructuration ? (
                      <> (diff. {comparaison.evolution.candidats_restructuration.valeur > 0 ? '+' : ''}{comparaison.evolution.candidats_restructuration.valeur} candidat(s))</>
                    ) : null}
                  </div>
                </div>
              </>
            ) : (
              <div>
                Aucune comparaison disponible pour la date sélectionnée. Le tableau ci-dessous affiche la situation actuelle.
              </div>
            )}
          </div>
        </div>
      )}

      {statistiques && !loading && (
        <div>
          {/* Indicateurs principaux avec évolution */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: isMobile ? '1fr' : isTablet ? 'repeat(2, 1fr)' : 'repeat(auto-fit, minmax(280px, 1fr))',
              gap: '15px',
              marginBottom: '20px',
            }}
          >
            {/* Montant total impayé */}
            <div
              style={{
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                padding: '20px',
                borderRadius: '16px',
                color: '#fff',
                boxShadow: '0 4px 12px rgba(102, 126, 234, 0.3)',
              }}
            >
              <div style={{ fontSize: '0.9rem', opacity: 0.9, marginBottom: '8px' }}>
                Montant total impayé
              </div>
              <div style={{ fontSize: '1.8rem', fontWeight: 'bold', marginBottom: '12px' }}>
                {statistiques.total_montant_impaye?.toLocaleString('fr-FR') || 0} FCFA
              </div>
              {comparaison?.evolution?.montant_impaye && comparaison.stats_precedentes && (
                <div style={{ fontSize: '0.85rem', marginTop: '12px' }}>
                  <div
                    style={{
                      backgroundColor: 'rgba(255,255,255,0.15)',
                      padding: '12px',
                      borderRadius: '6px',
                      marginBottom: '8px',
                      backdropFilter: 'blur(10px)',
                    }}
                  >
                    <div style={{ marginBottom: '6px', fontSize: '0.75rem', opacity: 0.9 }}>
                      📅 {comparaison.date_precedente || 'Date précédente'}
                    </div>
                    <div style={{ fontSize: '1rem', fontWeight: 'bold' }}>
                      {comparaison.stats_precedentes.total_montant_impaye?.toLocaleString('fr-FR') || 0} FCFA
                    </div>
                  </div>
                  <div
                    style={{
                      backgroundColor: 'rgba(255,255,255,0.15)',
                      padding: '12px',
                      borderRadius: '6px',
                      marginBottom: '8px',
                      backdropFilter: 'blur(10px)',
                    }}
                  >
                    <div style={{ marginBottom: '6px', fontSize: '0.75rem', opacity: 0.9 }}>
                      📅 {selectedDateSituation || 'Date de situation sélectionnée'}
                    </div>
                    <div style={{ fontSize: '1rem', fontWeight: 'bold' }}>
                      {comparaison.stats_actuelles.total_montant_impaye?.toLocaleString('fr-FR') || 0} FCFA
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginTop: '8px' }}>
                    <span
                      style={{
                        backgroundColor: '#ffffff',
                        color: '#000000',
                        border: '4px solid #0d5132',
                        padding: '10px 16px',
                        borderRadius: '8px',
                        fontWeight: '900',
                        fontSize: '15px',
                        display: 'inline-block',
                        boxShadow: '0 4px 8px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.5)',
                      }}
                    >
                      {comparaison.evolution.montant_impaye.icone === 'arrow-down' && '↓ '}
                      {comparaison.evolution.montant_impaye.icone === 'arrow-up' && '↑ '}
                      {comparaison.evolution.montant_impaye.icone === 'equal' && '→ '}
                      {comparaison.evolution.montant_impaye.pourcentage > 0 ? '+' : ''}
                      {comparaison.evolution.montant_impaye.pourcentage.toFixed(1)}%
                    </span>
                    <span
                      style={{
                        fontSize: '0.75rem',
                        opacity: 0.9,
                        backgroundColor: 'rgba(255,255,255,0.2)',
                        padding: '4px 8px',
                        borderRadius: '4px',
                      }}
                    >
                      Diff:{' '}
                      {comparaison.evolution.montant_impaye.valeur > 0 ? '+' : ''}
                      {comparaison.evolution.montant_impaye.valeur.toLocaleString('fr-FR')} FCFA
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Nombre de crédits */}
            <div
              style={{
                background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
                padding: '20px',
                borderRadius: '16px',
                color: '#fff',
                boxShadow: '0 4px 12px rgba(240, 147, 251, 0.3)',
              }}
            >
              <div style={{ fontSize: '0.9rem', opacity: 0.9, marginBottom: '8px' }}>
                Nombre de crédits
              </div>
              <div style={{ fontSize: '1.8rem', fontWeight: 'bold', marginBottom: '12px' }}>
                {statistiques.total_credits || 0}
              </div>
              {comparaison?.evolution?.nombre_credits && comparaison.stats_precedentes && (
                <div style={{ fontSize: '0.85rem', marginTop: '12px' }}>
                  <div
                    style={{
                      backgroundColor: 'rgba(255,255,255,0.15)',
                      padding: '12px',
                      borderRadius: '6px',
                      marginBottom: '8px',
                      backdropFilter: 'blur(10px)',
                    }}
                  >
                    <div style={{ marginBottom: '6px', fontSize: '0.75rem', opacity: 0.9 }}>
                      📅 {comparaison.date_precedente || 'Date précédente'}
                    </div>
                    <div style={{ fontSize: '1rem', fontWeight: 'bold' }}>
                      {comparaison.stats_precedentes.total_credits || 0} crédit(s)
                    </div>
                  </div>
                  <div
                    style={{
                      backgroundColor: 'rgba(255,255,255,0.15)',
                      padding: '12px',
                      borderRadius: '6px',
                      marginBottom: '8px',
                      backdropFilter: 'blur(10px)',
                    }}
                  >
                    <div style={{ marginBottom: '6px', fontSize: '0.75rem', opacity: 0.9 }}>
                      📅 {selectedDateSituation || 'Date de situation sélectionnée'}
                    </div>
                    <div style={{ fontSize: '1rem', fontWeight: 'bold' }}>
                      {comparaison.stats_actuelles.total_credits || 0} crédit(s)
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginTop: '8px' }}>
                    <span
                      style={{
                        backgroundColor: '#ffffff',
                        color: '#000000',
                        border: '4px solid #0d5132',
                        padding: '10px 16px',
                        borderRadius: '8px',
                        fontWeight: '900',
                        fontSize: '15px',
                        display: 'inline-block',
                        boxShadow: '0 4px 8px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.5)',
                      }}
                    >
                      {comparaison.evolution.nombre_credits.icone === 'arrow-down' && '↓ '}
                      {comparaison.evolution.nombre_credits.icone === 'arrow-up' && '↑ '}
                      {comparaison.evolution.nombre_credits.icone === 'equal' && '→ '}
                      {comparaison.evolution.nombre_credits.pourcentage > 0 ? '+' : ''}
                      {comparaison.evolution.nombre_credits.pourcentage.toFixed(1)}%
                    </span>
                    <span
                      style={{
                        fontSize: '0.75rem',
                        opacity: 0.9,
                        backgroundColor: 'rgba(255,255,255,0.2)',
                        padding: '4px 8px',
                        borderRadius: '4px',
                      }}
                    >
                      Diff:{' '}
                      {comparaison.evolution.nombre_credits.valeur > 0 ? '+' : ''}
                      {comparaison.evolution.nombre_credits.valeur} crédit(s)
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Candidats restructuration */}
            <div
              style={{
                background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
                padding: '20px',
                borderRadius: '16px',
                color: '#fff',
                boxShadow: '0 4px 12px rgba(79, 172, 254, 0.3)',
              }}
            >
              <div style={{ fontSize: '0.9rem', opacity: 0.9, marginBottom: '8px' }}>
                Candidats restructuration
              </div>
              <div style={{ fontSize: '1.8rem', fontWeight: 'bold', marginBottom: '12px' }}>
                {statistiques.candidats_restructuration || 0}
              </div>
              {comparaison?.evolution?.candidats_restructuration && comparaison.stats_precedentes && (
                <div style={{ fontSize: '0.85rem', marginTop: '12px' }}>
                  <div
                    style={{
                      backgroundColor: 'rgba(255,255,255,0.15)',
                      padding: '12px',
                      borderRadius: '6px',
                      marginBottom: '8px',
                      backdropFilter: 'blur(10px)',
                    }}
                  >
                    <div style={{ marginBottom: '6px', fontSize: '0.75rem', opacity: 0.9 }}>
                      📅 {comparaison.date_precedente || 'Date précédente'}
                    </div>
                    <div style={{ fontSize: '1rem', fontWeight: 'bold' }}>
                      {comparaison.stats_precedentes.candidats_restructuration || 0} candidat(s)
                    </div>
                  </div>
                  <div
                    style={{
                      backgroundColor: 'rgba(255,255,255,0.15)',
                      padding: '12px',
                      borderRadius: '6px',
                      marginBottom: '8px',
                      backdropFilter: 'blur(10px)',
                    }}
                  >
                    <div style={{ marginBottom: '6px', fontSize: '0.75rem', opacity: 0.9 }}>
                      📅 {selectedDateSituation || 'Date de situation sélectionnée'}
                    </div>
                    <div style={{ fontSize: '1rem', fontWeight: 'bold' }}>
                      {comparaison.stats_actuelles.candidats_restructuration || 0} candidat(s)
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginTop: '8px' }}>
                    <span
                      style={{
                        backgroundColor: '#ffffff',
                        color: '#000000',
                        border: '4px solid #0d5132',
                        padding: '10px 16px',
                        borderRadius: '8px',
                        fontWeight: '900',
                        fontSize: '15px',
                        display: 'inline-block',
                        boxShadow: '0 4px 8px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.5)',
                      }}
                    >
                      {comparaison.evolution.candidats_restructuration.icone === 'arrow-down' && '↓ '}
                      {comparaison.evolution.candidats_restructuration.icone === 'arrow-up' && '↑ '}
                      {comparaison.evolution.candidats_restructuration.icone === 'equal' && '→ '}
                      {comparaison.evolution.candidats_restructuration.pourcentage > 0 ? '+' : ''}
                      {comparaison.evolution.candidats_restructuration.pourcentage.toFixed(1)}%
                    </span>
                    <span
                      style={{
                        fontSize: '0.75rem',
                        opacity: 0.9,
                        backgroundColor: 'rgba(255,255,255,0.2)',
                        padding: '4px 8px',
                        borderRadius: '4px',
                      }}
                    >
                      Diff:{' '}
                      {comparaison.evolution.candidats_restructuration.valeur > 0 ? '+' : ''}
                      {comparaison.evolution.candidats_restructuration.valeur} candidat(s)
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Ratio impayé/encours moyen */}
            {statistiques.ratio_impaye_encours_moyen !== undefined && (
              <div
                style={{
                  background: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
                  padding: '20px',
                  borderRadius: '16px',
                  color: '#fff',
                  boxShadow: '0 4px 12px rgba(250, 112, 154, 0.3)',
                }}
              >
                <div style={{ fontSize: '0.9rem', opacity: 0.9, marginBottom: '8px' }}>
                  Ratio impayé/encours moyen
                </div>
                <div style={{ fontSize: '1.8rem', fontWeight: 'bold', marginBottom: '12px' }}>
                  {statistiques.ratio_impaye_encours_moyen?.toFixed(2) || 0}%
                </div>
                {comparaison?.evolution?.ratio_moyen && comparaison.stats_precedentes && (
                  <div style={{ fontSize: '0.85rem', marginTop: '12px' }}>
                    <div
                      style={{
                        backgroundColor: 'rgba(255,255,255,0.15)',
                        padding: '12px',
                        borderRadius: '6px',
                        marginBottom: '8px',
                        backdropFilter: 'blur(10px)',
                      }}
                    >
                      <div style={{ marginBottom: '6px', fontSize: '0.75rem', opacity: 0.9 }}>
                        📅 {comparaison.date_precedente || 'Date précédente'}
                      </div>
                      <div style={{ fontSize: '1rem', fontWeight: 'bold' }}>
                        {comparaison.stats_precedentes.ratio_impaye_encours_moyen?.toFixed(2) || 0}%
                      </div>
                    </div>
                    <div
                      style={{
                        backgroundColor: 'rgba(255,255,255,0.15)',
                        padding: '12px',
                        borderRadius: '6px',
                        marginBottom: '8px',
                        backdropFilter: 'blur(10px)',
                      }}
                    >
                      <div style={{ marginBottom: '6px', fontSize: '0.75rem', opacity: 0.9 }}>
                        📅 {selectedDateSituation || 'Date de situation sélectionnée'}
                      </div>
                      <div style={{ fontSize: '1rem', fontWeight: 'bold' }}>
                        {comparaison.stats_actuelles.ratio_impaye_encours_moyen?.toFixed(2) || 0}%
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginTop: '8px' }}>
                      <span
                        style={{
                          backgroundColor: '#ffffff',
                          color: '#000000',
                          border: '4px solid #0d5132',
                          padding: '10px 16px',
                          borderRadius: '8px',
                          fontWeight: '900',
                          fontSize: '15px',
                          display: 'inline-block',
                          boxShadow: '0 4px 8px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.5)',
                        }}
                      >
                        {comparaison.evolution.ratio_moyen.icone === 'arrow-down' && '↓ '}
                        {comparaison.evolution.ratio_moyen.icone === 'arrow-up' && '↑ '}
                        {comparaison.evolution.ratio_moyen.icone === 'equal' && '→ '}
                        {comparaison.evolution.ratio_moyen.pourcentage > 0 ? '+' : ''}
                        {comparaison.evolution.ratio_moyen.pourcentage.toFixed(1)}%
                      </span>
                      <span
                        style={{
                          fontSize: '0.75rem',
                          opacity: 0.9,
                          backgroundColor: 'rgba(255,255,255,0.2)',
                          padding: '4px 8px',
                          borderRadius: '4px',
                        }}
                      >
                        Diff:{' '}
                        {comparaison.evolution.ratio_moyen.valeur > 0 ? '+' : ''}
                        {comparaison.evolution.ratio_moyen.valeur.toFixed(2)}%
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Tendance globale */}
          {comparaison && comparaison.tendance && comparaison.tendance !== 'pas_de_comparaison' && (
            <div
              style={{
                background:
                  comparaison.couleur_tendance === 'danger-dark'
                    ? 'rgba(139, 0, 0, 0.2)'
                    : comparaison.couleur_tendance === 'success-dark'
                      ? 'rgba(13, 81, 50, 0.2)'
                      : 'rgba(33, 37, 41, 0.2)',
                padding: '20px',
                borderRadius: '16px',
                marginBottom: '20px',
                border: `3px solid ${
                  comparaison.couleur_tendance === 'danger-dark'
                    ? '#8b0000'
                    : comparaison.couleur_tendance === 'success-dark'
                      ? '#0d5132'
                      : '#212529'
                }`,
                boxShadow: '0 4px 8px rgba(0,0,0,0.1)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '15px' }}>
                <span style={{ fontSize: '2rem' }}>
                  {comparaison.icone_tendance === 'arrow-up'
                    ? '📈'
                    : comparaison.icone_tendance === 'arrow-down'
                      ? '📉'
                      : '➡️'}
                </span>
                <div>
                  <strong
                    style={{
                      fontSize: '1.2rem',
                      color:
                        comparaison.couleur_tendance === 'danger-dark'
                          ? '#ff6b6b'
                          : comparaison.couleur_tendance === 'success-dark'
                            ? '#4caf50'
                            : '#CBD5E1',
                    }}
                  >
                    Tendance:{' '}
                    {comparaison.tendance === 'hausse'
                      ? 'Hausse'
                      : comparaison.tendance === 'baisse'
                        ? 'Baisse'
                        : 'Stable'}
                  </strong>
                  {comparaison.date_precedente && (
                    <div style={{ fontSize: '0.9rem', opacity: 0.8, marginTop: '4px', fontWeight: '500', color: '#CBD5E1' }}>
                      Comparaison avec {comparaison.date_precedente}
                    </div>
                  )}
                </div>
              </div>

              {/* Explication détaillée de la comparaison */}
              {comparaison.stats_precedentes && (
                <div
                  style={{
                    backgroundColor: 'rgba(255,255,255,0.1)',
                    padding: '15px',
                    borderRadius: '8px',
                    marginTop: '15px',
                  }}
                >
                  <div style={{ fontSize: '0.9rem', fontWeight: 'bold', marginBottom: '10px', color: '#fff' }}>
                    📊 Détails de la comparaison :
                  </div>
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(200px, 1fr))',
                      gap: '12px',
                      fontSize: '0.85rem',
                    }}
                  >
                    <div>
                      <div style={{ color: '#CBD5E1', marginBottom: '4px' }}>
                        📅 Premier fichier ({comparaison.date_precedente})
                      </div>
                      <div style={{ fontWeight: 'bold', color: '#fff' }}>
                        • Montant: {comparaison.stats_precedentes.total_montant_impaye?.toLocaleString('fr-FR') || 0} FCFA
                        <br />
                        • Crédits: {comparaison.stats_precedentes.total_credits || 0}
                        <br />
                        • Candidats: {comparaison.stats_precedentes.candidats_restructuration || 0}
                      </div>
                    </div>
                    <div>
                      <div style={{ color: '#CBD5E1', marginBottom: '4px' }}>
                        📅 Deuxième fichier ({selectedDateSituation || 'Date de situation sélectionnée'})
                      </div>
                      <div style={{ fontWeight: 'bold', color: '#fff' }}>
                        • Montant: {comparaison.stats_actuelles.total_montant_impaye?.toLocaleString('fr-FR') || 0} FCFA
                        <br />
                        • Crédits: {comparaison.stats_actuelles.total_credits || 0}
                        <br />
                        • Candidats: {comparaison.stats_actuelles.candidats_restructuration || 0}
                      </div>
                    </div>
                    {comparaison.evolution && (
                      <div>
                        <div style={{ color: '#CBD5E1', marginBottom: '4px' }}>📈 Évolution</div>
                        <div style={{ fontWeight: 'bold', color: '#fff' }}>
                          • Montant:{' '}
                          {comparaison.evolution.montant_impaye && (
                            <>
                              {comparaison.evolution.montant_impaye.valeur > 0 ? '+' : ''}
                              {comparaison.evolution.montant_impaye.valeur.toLocaleString('fr-FR')} FCFA (
                              {comparaison.evolution.montant_impaye.pourcentage > 0 ? '+' : ''}
                              {comparaison.evolution.montant_impaye.pourcentage.toFixed(1)}%)
                            </>
                          )}
                          <br />
                          • Crédits:{' '}
                          {comparaison.evolution.nombre_credits && (
                            <>
                              {comparaison.evolution.nombre_credits.valeur > 0 ? '+' : ''}
                              {comparaison.evolution.nombre_credits.valeur} (
                              {comparaison.evolution.nombre_credits.pourcentage > 0 ? '+' : ''}
                              {comparaison.evolution.nombre_credits.pourcentage.toFixed(1)}%)
                            </>
                          )}
                          <br />
                          • Candidats:{' '}
                          {comparaison.evolution.candidats_restructuration && (
                            <>
                              {comparaison.evolution.candidats_restructuration.valeur > 0 ? '+' : ''}
                              {comparaison.evolution.candidats_restructuration.valeur} (
                              {comparaison.evolution.candidats_restructuration.pourcentage > 0 ? '+' : ''}
                              {comparaison.evolution.candidats_restructuration.pourcentage.toFixed(1)}%)
                            </>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Dashboard enrichi - TOUJOURS AFFICHÉ */}
          {loadingDashboard ? (
            <div style={{
              textAlign: 'center',
              padding: '3rem',
              color: '#9ca3af'
            }}>
              <div style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>📊</div>
              <div>Chargement...</div>
            </div>
          ) : (!dashboardDetaille || dashboardDetaille?.nombre_dates_disponibles === 0) && (dashboardDetaille?.kpis?.total_credits || 0) === 0 ? (
            <div style={{
              textAlign: 'center',
              padding: '3rem',
              color: '#9ca3af'
            }}>
              <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📂</div>
              <div style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '1rem', color: '#fff' }}>
                Aucune donnée disponible
              </div>
              <div style={{ marginBottom: '2rem', lineHeight: '1.6' }}>
                Importez un fichier d'impayés dans l'onglet "Import" pour voir le dashboard.
              </div>
            </div>
          ) : (
            <>
              {/* Répartitions détaillées */}
              <RepartitionCharts 
                repartitionTranches={dashboardDetaille?.repartition_tranches || statistiques?.repartition_tranches || {}}
                repartitionSegments={dashboardDetaille?.repartition_segments || statistiques?.repartition_segments || {}}
                repartitionAgences={dashboardDetaille?.repartition_agences || statistiques?.repartition_agences || {}}
                repartitionGestionnaires={dashboardDetaille?.repartition_gestionnaires || {}}
                repartitionProduits={dashboardDetaille?.repartition_produits || {}}
              />

              {/* Top crédits */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: isMobile ? '1fr' : isTablet ? '1fr' : 'repeat(3, 1fr)',
                gap: '1rem'
              }}>
                <TopCredits 
                  topCredits={dashboardDetaille?.top_10_credits_par_montant || []}
                  title="Top 10 par Montant"
                  metric="montant"
                  icon="💰"
                  color="#f59e0b"
                />
                <TopCredits 
                  topCredits={dashboardDetaille?.top_10_credits_par_jours_retard || []}
                  title="Top 10 par Jours de Retard"
                  metric="retard"
                  icon="📅"
                  color="#ef4444"
                />
                <TopCredits 
                  topCredits={dashboardDetaille?.top_10_credits_par_ratio || []}
                  title="Top 10 par Ratio"
                  metric="ratio"
                  icon="📊"
                  color="#8b5cf6"
                />
              </div>

            </>
          )}
        </div>
      )}
    </div>
  );
};

export default DashboardTab;

