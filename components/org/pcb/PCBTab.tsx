'use client';

import React, { useState } from 'react';
import GLAccountsTab from './GLAccountsTab';
import PostesReglementairesTab from './PostesReglementairesTab';
import MappingTab from './MappingTab';
import RatiosTab from './RatiosTab';
import ReportsTab from './ReportsTab';

// ── Sub-tab definitions ──────────────────────────────────────────────────────

const subTabs = [
  {
    id: 'gl',
    label: 'Comptes GL',
    shortLabel: 'GL',
    accent: '#1B3A8C',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7h16M4 11h16M4 15h16M4 19h16" />
      </svg>
    ),
  },
  {
    id: 'postes',
    label: 'Postes réglementaires',
    shortLabel: 'Postes',
    accent: '#C9A84C',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
      </svg>
    ),
  },
  {
    id: 'mapping',
    label: 'Mapping GL → Postes',
    shortLabel: 'Mapping',
    accent: '#059669',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
      </svg>
    ),
  },
  {
    id: 'ratios',
    label: 'Configuration ratios',
    shortLabel: 'Ratios',
    accent: '#D97706',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
  },
  {
    id: 'reports',
    label: 'Rapports générés',
    shortLabel: 'Rapports',
    accent: '#7C3AED',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
      </svg>
    ),
  },
] as const;

// ── Postes accordion sections ────────────────────────────────────────────────

const POSTES_SECTIONS = [
  { key: 'values',          label: 'Valeurs N-1 / Budget',           accent: '#C9A84C', typeFilter: undefined,        mode: 'valuesOnly'  as const, showCreate: false,
    icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg> },
  { key: 'bilan_actif',     label: 'Bilan — Actif',                  accent: '#1B3A8C', typeFilter: 'bilan_actif',    mode: 'postesOnly'  as const, showCreate: true,
    icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"/></svg> },
  { key: 'bilan_passif',    label: 'Bilan — Passif',                 accent: '#7C3AED', typeFilter: 'bilan_passif',   mode: 'postesOnly'  as const, showCreate: true,
    icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6"/></svg> },
  { key: 'hors_bilan',      label: 'Hors Bilan',                     accent: '#059669', typeFilter: 'hors_bilan',     mode: 'postesOnly'  as const, showCreate: true,
    icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z"/></svg> },
  { key: 'cr_produit',      label: 'Compte de résultat',             accent: '#D97706', typeFilter: 'cr_produit',     mode: 'postesOnly'  as const, showCreate: true,
    icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/></svg> },
  { key: 'cr_exploitation', label: 'Comptes d\'exploitation bancaire', accent: '#0284C7', typeFilter: 'cr_exploitation', mode: 'postesOnly' as const, showCreate: true,
    icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"/></svg> },
  { key: 'cr_charge',       label: 'Ratio Caractéristique de Gestion', accent: '#DC2626', typeFilter: 'cr_charge',     mode: 'postesOnly'  as const, showCreate: true,
    icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z"/></svg> },
];

// ── Main component ───────────────────────────────────────────────────────────

const PCBTab = () => {
  const [activeSubTab, setActiveSubTab] = useState<string>('gl');
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    values: false, bilan_actif: false, bilan_passif: false,
    hors_bilan: false, cr_produit: false, cr_exploitation: false, cr_charge: false,
  });

  const activeTab = subTabs.find(t => t.id === activeSubTab)!;

  return (
    <div className="p-6 sm:p-8">

      {/* ── Header ── */}
      <div className="flex items-center gap-4 mb-6 pb-5"
        style={{ borderBottom: '1px solid rgba(201,168,76,0.2)' }}>
        <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: 'rgba(201,168,76,0.15)', border: '1px solid rgba(201,168,76,0.3)' }}>
          <svg className="w-5 h-5 text-[#C9A84C]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
        </div>
        <div>
          <h2 className="text-lg font-black text-white">Paramétrage financier PCB UEMOA</h2>
          <p className="text-xs text-white/45 mt-0.5">
            Comptes GL, postes réglementaires, mapping et génération de rapports financiers
          </p>
        </div>
      </div>

      {/* ── Tab navigation ── */}
      <div className="mb-6 p-1.5 rounded-2xl flex gap-1 flex-wrap"
        style={{ background: '#0A1434', border: '2px solid rgba(27,58,140,0.3)' }}>
        {subTabs.map((tab) => {
          const isActive = activeSubTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveSubTab(tab.id)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm transition-all duration-200 flex-1 sm:flex-none justify-center sm:justify-start"
              style={isActive
                ? { background: tab.accent, color: '#ffffff', boxShadow: `0 4px 16px ${tab.accent}40` }
                : { background: 'transparent', color: 'rgba(255,255,255,0.5)', border: '1px solid rgba(255,255,255,0.06)' }}
            >
              <span style={{ color: isActive ? '#ffffff' : tab.accent }}>{tab.icon}</span>
              <span className="hidden sm:inline">{tab.label}</span>
              <span className="sm:hidden">{tab.shortLabel}</span>
              {isActive && <span className="w-1.5 h-1.5 rounded-full bg-white/70 ml-auto hidden sm:block" />}
            </button>
          );
        })}
      </div>

      {/* ── Content panel ── */}
      <div className="rounded-2xl overflow-hidden"
        style={{
          background: '#040B1E',
          borderTop: `2px solid ${activeTab.accent}30`, borderRight: `2px solid ${activeTab.accent}30`, borderBottom: `2px solid ${activeTab.accent}30`, borderLeft: `4px solid ${activeTab.accent}`,
          boxShadow: `0 0 24px ${activeTab.accent}10`,
        }}>

        {/* Panel header */}
        <div className="px-6 py-4 flex items-center gap-3"
          style={{ borderBottom: `1px solid ${activeTab.accent}20`, background: `${activeTab.accent}08` }}>
          <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ background: `${activeTab.accent}20`, color: activeTab.accent }}>
            {activeTab.icon}
          </div>
          <div>
            <h3 className="text-sm font-black text-white">{activeTab.label}</h3>
          </div>
        </div>

        {/* Tab content */}
        <div className="p-6">

          {/* GL */}
          {activeSubTab === 'gl' && <GLAccountsTab />}

          {/* Postes réglementaires — accordion */}
          {activeSubTab === 'postes' && (
            <div className="space-y-3">
              {POSTES_SECTIONS.map((section) => {
                const isOpen = openSections[section.key];
                return (
                  <div key={section.key} className="rounded-xl overflow-hidden"
                    style={{
                      background: '#070E28',
                      borderTop: `1px solid ${section.accent}35`,
                      borderRight: `1px solid ${section.accent}35`,
                      borderBottom: `1px solid ${section.accent}35`,
                      borderLeft: isOpen ? `4px solid ${section.accent}` : `2px solid ${section.accent}`,
                    }}>
                    <button
                      type="button"
                      onClick={() => setOpenSections(p => ({ ...p, [section.key]: !p[section.key] }))}
                      className="w-full flex items-center justify-between px-5 py-3.5 transition-all duration-200"
                      style={{ background: isOpen ? `${section.accent}10` : 'transparent' }}
                    >
                      <div className="flex items-center gap-3">
                        <span style={{ color: section.accent }}>{section.icon}</span>
                        <span className="text-sm font-bold text-white">{section.label}</span>
                        {isOpen && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                            style={{ background: `${section.accent}20`, color: section.accent }}>
                            Ouvert
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-lg flex items-center justify-center transition-transform duration-200"
                          style={{ background: `${section.accent}20`, color: section.accent, transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}>
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                          </svg>
                        </div>
                      </div>
                    </button>
                    {isOpen && (
                      <div className="px-5 pb-5 pt-2" style={{ borderTop: `1px solid ${section.accent}20` }}>
                        <PostesReglementairesTab
                          typeFilter={section.typeFilter}
                          mode={section.mode}
                          showHeader={false}
                          showCreateButton={section.showCreate}
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Mapping */}
          {activeSubTab === 'mapping' && <MappingTab />}

          {/* Ratios */}
          {activeSubTab === 'ratios' && <RatiosTab />}

          {/* Reports */}
          {activeSubTab === 'reports' && <ReportsTab />}

        </div>
      </div>

    </div>
  );
};

export default PCBTab;
