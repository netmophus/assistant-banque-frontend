'use client';

import { useTheme } from '@/components/providers/theme-provider';
import { useState } from 'react';

const themes = [
  {
    name: 'default',
    label: 'Default',
    description: 'Bleu-Violet-Or',
    colors: ['bg-blue-600', 'bg-purple-600', 'bg-amber-500'],
    gradient: 'from-blue-600 via-purple-600 to-amber-500',
  },
  {
    name: 'emerald',
    label: 'Emerald',
    description: 'Vert Émeraude',
    colors: ['bg-emerald-500', 'bg-emerald-600', 'bg-emerald-400'],
    gradient: 'from-emerald-500 via-emerald-600 to-emerald-400',
  },
  {
    name: 'sunset',
    label: 'Sunset',
    description: 'Coucher de Soleil',
    colors: ['bg-red-500', 'bg-orange-500', 'bg-yellow-400'],
    gradient: 'from-red-500 via-orange-500 to-yellow-400',
  },
  {
    name: 'mono',
    label: 'Mono',
    description: 'Monochrome',
    colors: ['bg-gray-600', 'bg-gray-700', 'bg-gray-400'],
    gradient: 'from-gray-600 via-gray-700 to-gray-400',
  },
] as const;

export function ThemeSwitcher() {
  const { theme, setTheme } = useTheme();
  const [isOpen, setIsOpen] = useState(false);

  const currentTheme = themes.find(t => t.name === theme) || themes[0];

  return (
    <div className="relative">
      {/* Bouton principal */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 rounded-lg bg-surface/80 backdrop-blur-lg border border-border hover:bg-surface/90 transition-all duration-300 text-text"
        style={{
          backgroundColor: 'rgb(var(--surface))',
          border: '1px solid rgb(var(--border))',
        }}
      >
        <div className="flex gap-1">
          {currentTheme.colors.map((color, index) => (
            <div
              key={index}
              className={`w-3 h-3 rounded-full ${color}`}
            />
          ))}
        </div>
        <span className="text-sm font-medium">{currentTheme.label}</span>
        <svg
          className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Dropdown */}
      {isOpen && (
        <>
          {/* Overlay */}
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />
          
          {/* Menu */}
          <div className="absolute top-full right-0 mt-2 w-64 bg-surface/80 backdrop-blur-xl border border-border rounded-xl shadow-2xl z-20 overflow-hidden"
            style={{
              backgroundColor: 'rgb(var(--surface))',
              border: '1px solid rgb(var(--border))',
            }}
          >
            <div className="p-2">
              {themes.map((themeOption) => (
                <button
                  key={themeOption.name}
                  onClick={() => {
                    setTheme(themeOption.name);
                    setIsOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-200 ${
                    theme === themeOption.name
                      ? 'bg-surface2/80 text-text'
                      : 'text-muted hover:text-text hover:bg-surface/60'
                  }`}
                >
                  {/* Preview des couleurs */}
                  <div className="flex gap-1">
                    {themeOption.colors.map((color, index) => (
                      <div
                        key={index}
                        className={`w-2 h-2 rounded-full ${color}`}
                      />
                    ))}
                  </div>
                  
                  {/* Infos */}
                  <div className="flex-1 text-left">
                    <div className="text-sm font-medium">{themeOption.label}</div>
                    <div className="text-xs opacity-70">{themeOption.description}</div>
                  </div>
                  
                  {/* Indicateur sélectionné */}
                  {theme === themeOption.name && (
                    <svg className="w-4 h-4 text-text" fill="currentColor" viewBox="0 0 20 20">
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                  )}
                </button>
              ))}
            </div>
            
            {/* Séparateur et option système */}
            <div className="border-t border-border p-2">
              <button
                onClick={() => {
                  setTheme('system');
                  setIsOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-200 ${
                  theme === 'system'
                    ? 'bg-surface2/80 text-text'
                    : 'text-muted hover:text-text hover:bg-surface/60'
                }`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                <div className="flex-1 text-left">
                  <div className="text-sm font-medium">Système</div>
                  <div className="text-xs opacity-70">Utiliser les préférences système</div>
                </div>
                {theme === 'system' && (
                  <svg className="w-4 h-4 text-text" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                )}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
