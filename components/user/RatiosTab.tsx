'use client';

import React, { useState, useEffect } from 'react';
import ScrollReveal from '@/components/home/ScrollReveal';

interface Ratio {
  id: string;
  code: string;
  libelle: string;
  description?: string;
  valeur?: number;
  unite: string;
  seuil_min?: number;
  seuil_max?: number;
  categorie: string;
  statut: 'conforme' | 'alerte' | 'critique';
}

const RatiosTab = () => {
  const [activeSubTab, setActiveSubTab] = useState('ratios');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [ratios, setRatios] = useState<Ratio[]>([]);
  const [selectedCategorie, setSelectedCategorie] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  const subTabs = [
    { id: 'ratios', label: 'Ratios', icon: '📊' },
    { id: 'reports', label: 'Rapports', icon: '📄' },
  ];

  // Simuler des données pour le moment
  useEffect(() => {
    const mockData: Ratio[] = [
      {
        id: '1',
        code: 'R1',
        libelle: 'Ratio de Liquidité Générale',
        description: 'Actif circulant / Passif circulant',
        valeur: 1.85,
        unite: '%',
        seuil_min: 1.0,
        seuil_max: 2.0,
        categorie: 'Liquidité',
        statut: 'conforme',
      },
      {
        id: '2',
        code: 'R2',
        libelle: 'Ratio d\'Endettement',
        description: 'Dettes totales / Actif total',
        valeur: 0.65,
        unite: '%',
        seuil_min: 0.0,
        seuil_max: 0.7,
        categorie: 'Endettement',
        statut: 'conforme',
      },
      {
        id: '3',
        code: 'R3',
        libelle: 'Ratio de Rentabilité des Actifs',
        description: 'Résultat net / Actif total moyen',
        valeur: 0.08,
        unite: '%',
        seuil_min: 0.05,
        seuil_max: 0.15,
        categorie: 'Rentabilité',
        statut: 'conforme',
      },
      {
        id: '4',
        code: 'R4',
        libelle: 'Ratio de Couverture des Intérêts',
        description: 'EBIT / Charges d\'intérêts',
        valeur: 3.2,
        unite: 'x',
        seuil_min: 2.0,
        seuil_max: 10.0,
        categorie: 'Solvabilité',
        statut: 'conforme',
      },
      {
        id: '5',
        code: 'R5',
        libelle: 'Ratio de Rotation des Stocks',
        description: 'Coût des marchandises vendues / Stock moyen',
        valeur: 8.5,
        unite: 'x',
        seuil_min: 4.0,
        seuil_max: 12.0,
        categorie: 'Efficacité',
        statut: 'conforme',
      },
      {
        id: '6',
        code: 'R6',
        libelle: 'Marge Nette',
        description: 'Résultat net / Chiffre d\'affaires',
        valeur: 0.12,
        unite: '%',
        seuil_min: 0.08,
        seuil_max: 0.20,
        categorie: 'Rentabilité',
        statut: 'conforme',
      },
      {
        id: '7',
        code: 'R7',
        libelle: 'Ratio de Levier Financier',
        description: 'Dettes totales / Capitaux propres',
        valeur: 1.85,
        unite: 'x',
        seuil_min: 0.5,
        seuil_max: 2.0,
        categorie: 'Endettement',
        statut: 'alerte',
      },
      {
        id: '8',
        code: 'R8',
        libelle: 'Ratio de Liquidité Réduite',
        description: '(Actif circulant - Stocks) / Passif circulant',
        valeur: 0.95,
        unite: '%',
        seuil_min: 0.8,
        seuil_max: 1.5,
        categorie: 'Liquidité',
        statut: 'alerte',
      },
    ];
    setRatios(mockData);
  }, []);

  const filteredRatios = ratios.filter(ratio => {
    const matchesSearch = ratio.libelle.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         ratio.code.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategorie = !selectedCategorie || ratio.categorie === selectedCategorie;
    return matchesSearch && matchesCategorie;
  });

  const categories = [...new Set(ratios.map(r => r.categorie))];

  const getStatutColor = (statut: string) => {
    switch (statut) {
      case 'conforme': return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'alerte': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      case 'critique': return 'bg-red-500/20 text-red-400 border-red-500/30';
      default: return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
  };

  const getStatutIcon = (statut: string) => {
    switch (statut) {
      case 'conforme': return '✅';
      case 'alerte': return '⚠️';
      case 'critique': return '❌';
      default: return '❓';
    }
  };

  const getProgressColor = (valeur: number, seuil_min: number, seuil_max: number) => {
    if (valeur < seuil_min) return 'bg-red-500';
    if (valeur > seuil_max) return 'bg-red-500';
    return 'bg-green-500';
  };

  const getProgressPercentage = (valeur: number, seuil_min: number, seuil_max: number) => {
    if (valeur < seuil_min) return (valeur / seuil_min) * 50;
    if (valeur > seuil_max) return 100;
    return ((valeur - seuil_min) / (seuil_max - seuil_min)) * 50 + 50;
  };

  // Ratios Component
  const RatiosContent = () => (
    <div className="space-y-8">
      {/* Statistiques */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-surface/30 border border-border rounded-xl p-4">
          <div className="flex items-center space-x-2 mb-2">
            <span className="text-lg">📈</span>
            <span className="text-sm text-muted">Total ratios</span>
          </div>
          <p className="text-2xl font-bold text-text">{ratios.length}</p>
        </div>
        <div className="bg-surface/30 border border-border rounded-xl p-4">
          <div className="flex items-center space-x-2 mb-2">
            <span className="text-lg">✅</span>
            <span className="text-sm text-muted">Conformes</span>
          </div>
          <p className="text-2xl font-bold text-green-400">
            {ratios.filter(r => r.statut === 'conforme').length}
          </p>
        </div>
        <div className="bg-surface/30 border border-border rounded-xl p-4">
          <div className="flex items-center space-x-2 mb-2">
            <span className="text-lg">⚠️</span>
            <span className="text-sm text-muted">Alertes</span>
          </div>
          <p className="text-2xl font-bold text-yellow-400">
            {ratios.filter(r => r.statut === 'alerte').length}
          </p>
        </div>
        <div className="bg-surface/30 border border-border rounded-xl p-4">
          <div className="flex items-center space-x-2 mb-2">
            <span className="text-lg">❌</span>
            <span className="text-sm text-muted">Critiques</span>
          </div>
          <p className="text-2xl font-bold text-red-400">
            {ratios.filter(r => r.statut === 'critique').length}
          </p>
        </div>
      </div>

      {/* Filtres */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-semibold text-text mb-2">Recherche</label>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Nom ou code du ratio..."
            className="w-full px-4 py-3 bg-surface/50 border border-border rounded-xl text-text placeholder-muted focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all duration-300 hover:bg-surface/70"
          />
        </div>
        <div>
          <label className="block text-sm font-semibold text-text mb-2">Catégorie</label>
          <select
            value={selectedCategorie}
            onChange={(e) => setSelectedCategorie(e.target.value)}
            className="w-full px-4 py-3 bg-surface/50 border border-border rounded-xl text-text focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all duration-300 hover:bg-surface/70"
            style={{
              backgroundColor: 'rgb(var(--surface))',
              color: 'rgb(var(--text))',
              border: '1px solid rgb(var(--border))',
              colorScheme: 'dark',
            }}
          >
            <option value="" style={{ backgroundColor: 'rgb(var(--surface))', color: 'rgb(var(--text))' }}>Toutes les catégories</option>
            {categories.map(categorie => (
              <option key={categorie} value={categorie} style={{ backgroundColor: 'rgb(var(--surface))', color: 'rgb(var(--text))' }}>
                {categorie}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Liste des ratios */}
      <div className="space-y-4">
        {filteredRatios.length === 0 ? (
          <div className="text-center py-12">
            <span className="text-4xl mb-4">📊</span>
            <p className="text-muted">Aucun ratio trouvé</p>
          </div>
        ) : (
          filteredRatios.map((ratio) => (
            <div key={ratio.id} className="bg-surface/30 border border-border rounded-xl p-4 hover:bg-surface/50 transition-all duration-300">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-3">
                  <div>
                    <h4 className="font-semibold text-text">{ratio.libelle}</h4>
                    <p className="text-sm text-muted">Code: {ratio.code} | Catégorie: {ratio.categorie}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <span className={`px-3 py-1 rounded-lg text-sm font-medium border ${getStatutColor(ratio.statut)}`}>
                    {getStatutIcon(ratio.statut)} {ratio.statut.toUpperCase()}
                  </span>
                </div>
              </div>

              {ratio.description && (
                <p className="text-sm text-muted mb-3">{ratio.description}</p>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
                <div>
                  <span className="text-sm text-muted">Valeur actuelle:</span>
                  <p className="text-xl font-bold text-text">
                    {ratio.valeur?.toFixed(2)} {ratio.unite}
                  </p>
                </div>
                <div>
                  <span className="text-sm text-muted">Plage acceptable:</span>
                  <p className="text-sm text-text">
                    {ratio.seuil_min?.toFixed(2)} - {ratio.seuil_max?.toFixed(2)} {ratio.unite}
                  </p>
                </div>
              </div>

              {/* Barre de progression */}
              {ratio.valeur && ratio.seuil_min && ratio.seuil_max && (
                <div className="mb-3">
                  <div className="w-full bg-surface/50 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all duration-300 ${getProgressColor(ratio.valeur, ratio.seuil_min, ratio.seuil_max)}`}
                      style={{ width: `${Math.min(getProgressPercentage(ratio.valeur, ratio.seuil_min, ratio.seuil_max), 100)}%` }}
                    ></div>
                  </div>
                  <div className="flex justify-between text-xs text-muted mt-1">
                    <span>{ratio.seuil_min.toFixed(2)}</span>
                    <span>{ratio.seuil_max.toFixed(2)}</span>
                  </div>
                </div>
              )}

              <div className="flex space-x-2">
                <button className="px-4 py-2 bg-primary/20 hover:bg-primary/30 text-primary border border-primary/30 rounded-lg text-sm font-medium transition-all duration-300">
                  📈 Voir l'historique
                </button>
                <button className="px-4 py-2 bg-secondary/20 hover:bg-secondary/30 text-secondary border border-secondary/30 rounded-lg text-sm font-medium transition-all duration-300">
                  📊 Analyser la tendance
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );

  // Reports Component
  const ReportsContent = () => (
    <div className="space-y-6">
      <div className="bg-surface/30 border border-border rounded-xl p-6">
        <h3 className="text-lg font-semibold text-text mb-4">Rapports PCB UEMOA</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-surface/50 border border-border rounded-xl p-4 hover:bg-surface/70 transition-all duration-300">
            <div className="flex items-center space-x-3 mb-3">
              <span className="text-2xl">📊</span>
              <div>
                <h4 className="font-semibold text-text">État financier mensuel</h4>
                <p className="text-sm text-muted">Rapport complet des ratios et indicateurs</p>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted">Dernière génération: 15 Jan 2024</span>
              <button className="px-3 py-1 bg-primary/20 hover:bg-primary/30 text-primary border border-primary/30 rounded-lg text-sm font-medium transition-all duration-300">
                Générer
              </button>
            </div>
          </div>

          <div className="bg-surface/50 border border-border rounded-xl p-4 hover:bg-surface/70 transition-all duration-300">
            <div className="flex items-center space-x-3 mb-3">
              <span className="text-2xl">📈</span>
              <div>
                <h4 className="font-semibold text-text">Analyse de tendance</h4>
                <p className="text-sm text-muted">Évolution des ratios sur 12 mois</p>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted">Dernière génération: 10 Jan 2024</span>
              <button className="px-3 py-1 bg-primary/20 hover:bg-primary/30 text-primary border border-primary/30 rounded-lg text-sm font-medium transition-all duration-300">
                Générer
              </button>
            </div>
          </div>

          <div className="bg-surface/50 border border-border rounded-xl p-4 hover:bg-surface/70 transition-all duration-300">
            <div className="flex items-center space-x-3 mb-3">
              <span className="text-2xl">🎯</span>
              <div>
                <h4 className="font-semibold text-text">Rapport de conformité</h4>
                <p className="text-sm text-muted">Vérification des normes UEMOA</p>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted">Dernière génération: 08 Jan 2024</span>
              <button className="px-3 py-1 bg-primary/20 hover:bg-primary/30 text-primary border border-primary/30 rounded-lg text-sm font-medium transition-all duration-300">
                Générer
              </button>
            </div>
          </div>

          <div className="bg-surface/50 border border-border rounded-xl p-4 hover:bg-surface/70 transition-all duration-300">
            <div className="flex items-center space-x-3 mb-3">
              <span className="text-2xl">📋</span>
              <div>
                <h4 className="font-semibold text-text">Synthèse trimestrielle</h4>
                <p className="text-sm text-muted">Rapport trimestriel consolidé</p>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted">Dernière génération: 01 Jan 2024</span>
              <button className="px-3 py-1 bg-primary/20 hover:bg-primary/30 text-primary border border-primary/30 rounded-lg text-sm font-medium transition-all duration-300">
                Générer
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-surface/30 border border-border rounded-xl p-6">
        <h3 className="text-lg font-semibold text-text mb-4">Historique des rapports</h3>
        <div className="space-y-3">
          <div className="bg-surface/50 border border-border rounded-lg p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-text">État financier mensuel - Janvier 2024</p>
                <p className="text-sm text-muted">Généré le 15/01/2024 à 14:30</p>
              </div>
              <div className="flex space-x-2">
                <button className="px-3 py-1 bg-secondary/20 hover:bg-secondary/30 text-secondary border border-secondary/30 rounded-lg text-sm font-medium transition-all duration-300">
                  📥 Télécharger
                </button>
                <button className="px-3 py-1 bg-primary/20 hover:bg-primary/30 text-primary border border-primary/30 rounded-lg text-sm font-medium transition-all duration-300">
                  👁️ Voir
                </button>
              </div>
            </div>
          </div>

          <div className="bg-surface/50 border border-border rounded-lg p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-text">Analyse de tendance - Décembre 2023</p>
                <p className="text-sm text-muted">Généré le 10/01/2024 à 16:45</p>
              </div>
              <div className="flex space-x-2">
                <button className="px-3 py-1 bg-secondary/20 hover:bg-secondary/30 text-secondary border border-secondary/30 rounded-lg text-sm font-medium transition-all duration-300">
                  📥 Télécharger
                </button>
                <button className="px-3 py-1 bg-primary/20 hover:bg-primary/30 text-primary border border-primary/30 rounded-lg text-sm font-medium transition-all duration-300">
                  👁️ Voir
                </button>
              </div>
            </div>
          </div>

          <div className="bg-surface/50 border border-border rounded-lg p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-text">Rapport de conformité - Décembre 2023</p>
                <p className="text-sm text-muted">Généré le 08/01/2024 à 11:20</p>
              </div>
              <div className="flex space-x-2">
                <button className="px-3 py-1 bg-secondary/20 hover:bg-secondary/30 text-secondary border border-secondary/30 rounded-lg text-sm font-medium transition-all duration-300">
                  📥 Télécharger
                </button>
                <button className="px-3 py-1 bg-primary/20 hover:bg-primary/30 text-primary border border-primary/30 rounded-lg text-sm font-medium transition-all duration-300">
                  👁️ Voir
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderContent = () => {
    switch (activeSubTab) {
      case 'ratios':
        return <RatiosContent />;
      case 'reports':
        return <ReportsContent />;
      default:
        return <RatiosContent />;
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <ScrollReveal direction="up" delay={0}>
        <div className="bg-gradient-to-br from-surface via-surface2/50 to-surface backdrop-blur-lg rounded-2xl border border-primary/30 p-6 shadow-xl shadow-glow-1/10">
          <div className="flex items-center space-x-3 mb-6">
            <div className="w-10 h-10 bg-gradient-to-br from-green-500 via-blue-500 to-purple-500 rounded-xl flex items-center justify-center">
              <span className="text-lg">📊</span>
            </div>
            <div>
              <h2 className="text-lg font-bold text-text mb-1">PCB & Analyse Financière</h2>
              <p className="text-sm text-muted">Ratios financiers et états réglementaires UEMOA</p>
            </div>
          </div>

          {/* Sous-onglets */}
          <div className="flex flex-wrap gap-2">
            {subTabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveSubTab(tab.id)}
                className={`px-4 py-2 rounded-lg font-medium text-sm transition-all duration-300 ${
                  activeSubTab === tab.id
                    ? 'bg-gradient-to-r from-primary via-secondary to-accent text-text shadow-md shadow-glow-1/30'
                    : 'text-muted hover:text-text bg-gradient-to-r from-surface via-primary/20 to-surface hover:from-primary/30 hover:via-secondary/20 hover:to-accent/30 border border-border hover:border-primary/50'
                }`}
              >
                <span className="mr-2">{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </ScrollReveal>

      {/* Contenu */}
      <ScrollReveal direction="up" delay={200}>
        <div className="bg-gradient-to-br from-surface via-surface2/50 to-surface backdrop-blur-lg rounded-2xl border border-primary/30 p-6 shadow-xl shadow-glow-1/10">
          {loading ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              <p className="mt-4 text-muted">Chargement...</p>
            </div>
          ) : error ? (
            <div className="bg-red-500/20 border border-red-500/30 rounded-xl p-4">
              <p className="text-red-400">{error}</p>
            </div>
          ) : (
            renderContent()
          )}
        </div>
      </ScrollReveal>
    </div>
  );
};

export default RatiosTab;
