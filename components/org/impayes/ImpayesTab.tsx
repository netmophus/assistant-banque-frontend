import React, { useState, useEffect } from 'react';
import { useResponsive } from '@/hooks/useResponsive';
import { authApi } from '@/lib/api/auth';
import ImpayesConfigTab from './ImpayesConfigTab';
import ImportTab from './ImportTab';
import DashboardTab from './DashboardTab';
import ListeTab from './ListeTab';
import RestructurationTab from './RestructurationTab';
import SMSTab from './SMSTab';
import HistoryTab from './HistoryTab';
import ArchiveTab from './ArchiveTab';
import EscaladeTab from './EscaladeTab';
import DashboardChartsTab from './DashboardChartsTab';
import PromessesTab from './PromessesTab';
import ScoringTab from './ScoringTab';
import PortefeuilleTab from './PortefeuilleTab';
import AgencesDashboardTab from './AgencesDashboardTab';
import JournalTab from './JournalTab';

const ImpayesTab = () => {
  const { isMobile } = useResponsive();
  const [activeSubTab, setActiveSubTab] = useState('dashboard');
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const user = await authApi.getCurrentUser();
        setCurrentUser(user);

        if (user?.role === 'user' && activeSubTab === 'config') {
          setActiveSubTab('dashboard');
        }
      } catch (error) {
        console.error('Erreur lors de la récupération de l\'utilisateur:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, []);

  const allSubTabs = [
    { id: 'config',          label: 'Configuration',  icon: '⚙️',  adminOnly: true,  dividerAfter: false },
    { id: 'import',          label: 'Import',          icon: '📥',  adminOnly: true,  dividerAfter: true  },
    { id: 'dashboard',       label: 'Dashboard',       icon: '📊',  adminOnly: false, dividerAfter: false },
    { id: 'liste',           label: 'Liste',           icon: '📋',  adminOnly: false, dividerAfter: true  },
    { id: 'restructuration', label: 'Restructuration', icon: '🔄',  adminOnly: false, dividerAfter: false },
    { id: 'sms',             label: 'SMS',             icon: '💬',  adminOnly: false, dividerAfter: false },
    { id: 'escalade',        label: 'Escalade',        icon: '⬆️',  adminOnly: false, dividerAfter: false },
    { id: 'promesses',       label: 'Promesses',       icon: '🤝',  adminOnly: false, dividerAfter: false },
    { id: 'scoring',         label: 'Scoring',         icon: '🎯',  adminOnly: false, dividerAfter: false },
    { id: 'portefeuille',    label: 'Portefeuille',    icon: '👤',  adminOnly: false, dividerAfter: true  },
    { id: 'graphiques',      label: 'Graphiques',      icon: '📈',  adminOnly: false, dividerAfter: false },
    { id: 'agences',         label: 'Agences',         icon: '🏢',  adminOnly: false, dividerAfter: false },
    { id: 'journal',         label: 'Journal',         icon: '📝',  adminOnly: false, dividerAfter: false },
    { id: 'history',         label: 'Historique SMS',  icon: '📜',  adminOnly: false, dividerAfter: false },
    { id: 'archive',         label: 'Archives',        icon: '📦',  adminOnly: true,  dividerAfter: false },
  ];

  // Filtrer les sous-onglets selon le rôle
  const subTabs = loading ? [] : allSubTabs.filter(tab => {
    if (tab.adminOnly && currentUser?.role !== 'admin') {
      return false;
    }
    return true;
  });

  // Si l'onglet actuel n'est plus disponible, basculer vers le premier disponible
  useEffect(() => {
    if (!loading && subTabs.length > 0 && !subTabs.find(tab => tab.id === activeSubTab)) {
      setActiveSubTab(subTabs[0].id);
    }
  }, [loading, subTabs, activeSubTab]);

  return (
    <div className="p-5 sm:p-6">
      {/* Navigation des sous-onglets */}
      <div className="flex gap-2 flex-wrap items-center border-b border-[#d32f2f]/15 pb-3 mb-6">
        {loading ? (
          <div className="px-4 py-2 text-[#d32f2f] text-sm">Chargement...</div>
        ) : (
          subTabs.map((tab, index) => {
            const isLast = index === subTabs.length - 1;
            const showDivider = tab.dividerAfter && !isLast && (() => {
              // Ne montrer le séparateur que si le tab suivant visible existe
              const nextTab = subTabs[index + 1];
              return !!nextTab;
            })();

            return (
              <React.Fragment key={tab.id}>
                <button
                  onClick={() => setActiveSubTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-200 border ${
                    activeSubTab === tab.id
                      ? 'bg-gradient-to-r from-[#d32f2f] to-[#f44336] text-white border-transparent shadow-lg shadow-[#d32f2f]/20'
                      : 'bg-white/5 text-[#94A3B8] border-white/10 hover:bg-[#d32f2f]/10 hover:text-white hover:border-[#d32f2f]/30'
                  }`}
                >
                  <span>{tab.icon}</span>
                  <span>{tab.label}</span>
                </button>
                {showDivider && (
                  <div className="h-6 w-px bg-white/15 shrink-0" />
                )}
              </React.Fragment>
            );
          })
        )}
      </div>

      {/* Contenu des sous-onglets */}
      <div>
        {!loading && activeSubTab === 'config' && <ImpayesConfigTab />}
        {!loading && activeSubTab === 'import' && <ImportTab />}
        {!loading && activeSubTab === 'dashboard' && <DashboardTab />}
        {!loading && activeSubTab === 'liste' && <ListeTab />}
        {!loading && activeSubTab === 'restructuration' && <RestructurationTab />}
        {!loading && activeSubTab === 'sms' && <SMSTab />}
        {!loading && activeSubTab === 'escalade' && <EscaladeTab />}
        {!loading && activeSubTab === 'promesses' && <PromessesTab />}
        {!loading && activeSubTab === 'scoring' && <ScoringTab />}
        {!loading && activeSubTab === 'portefeuille' && <PortefeuilleTab />}
        {!loading && activeSubTab === 'graphiques' && <DashboardChartsTab />}
        {!loading && activeSubTab === 'agences' && <AgencesDashboardTab />}
        {!loading && activeSubTab === 'journal' && <JournalTab />}
        {!loading && activeSubTab === 'history' && <HistoryTab />}
        {!loading && activeSubTab === 'archive' && <ArchiveTab />}
      </div>
    </div>
  );
};

export default ImpayesTab;
