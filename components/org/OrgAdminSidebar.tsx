'use client';

import { useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';

interface MenuItem {
  id: string;
  label: string;
  icon: string;
  path?: string;
  submenu?: MenuItem[];
}

const menuItems: MenuItem[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    icon: '📊',
    path: '/org/dashboard',
  },
  {
    id: 'parametrage',
    label: 'Paramétrage',
    icon: '⚙️',
    submenu: [
      {
        id: 'knowledge',
        label: 'Base de Connaissances & IA',
        icon: '📚',
        path: '/org/settings/knowledge',
      },
      {
        id: 'credit',
        label: 'Analyse de Dossier de Crédit',
        icon: '💳',
        path: '/org/settings/credit',
      },
      {
        id: 'pcb',
        label: 'PCB & Ratios Financiers',
        icon: '💰',
        path: '/org/settings/pcb',
      },
      {
        id: 'impayes',
        label: 'Gestion des Impayés',
        icon: '💳',
        path: '/org/settings/impayes',
      },
    ],
  },
  // Autres services à venir
];

export default function OrgAdminSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [expandedMenus, setExpandedMenus] = useState<string[]>(['parametrage']);

  const toggleMenu = (menuId: string) => {
    setExpandedMenus(prev =>
      prev.includes(menuId)
        ? prev.filter(id => id !== menuId)
        : [...prev, menuId]
    );
  };

  const isActive = (path?: string) => {
    if (!path) return false;
    return pathname === path || pathname?.startsWith(path + '/');
  };

  const isMenuExpanded = (menuId: string) => {
    return expandedMenus.includes(menuId);
  };

  const handleMenuClick = (item: MenuItem) => {
    if (item.submenu) {
      toggleMenu(item.id);
    } else if (item.path) {
      router.push(item.path);
    }
  };

  return (
    <aside className="hidden md:block w-64 bg-gradient-to-b from-[#1a1f3a] via-[#1a1f3a]/95 to-[#1a1f3a] border-r border-[#2563EB]/30 h-screen fixed left-0 top-0 pt-20 overflow-y-auto z-40">
      <nav className="p-4 space-y-2">
        {menuItems.map((item) => (
          <div key={item.id}>
            {item.submenu ? (
              <>
                <button
                  onClick={() => handleMenuClick(item)}
                  className={`w-full flex items-center justify-between px-4 py-3 rounded-lg font-medium transition-all duration-300 ${
                    isMenuExpanded(item.id)
                      ? 'bg-gradient-to-r from-[#2563EB]/20 via-[#7C3AED]/20 to-[#F59E0B]/20 text-white border border-[#2563EB]/30'
                      : 'text-[#CBD5E1] hover:text-white hover:bg-white/5'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <span className="text-xl">{item.icon}</span>
                    <span>{item.label}</span>
                  </div>
                  <svg
                    className={`w-5 h-5 transition-transform duration-300 ${
                      isMenuExpanded(item.id) ? 'rotate-180' : ''
                    }`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {isMenuExpanded(item.id) && (
                  <div className="ml-4 mt-2 space-y-1 border-l-2 border-[#2563EB]/30 pl-4">
                    {item.submenu.map((subItem) => (
                      <Link
                        key={subItem.id}
                        href={subItem.path || '#'}
                        className={`flex items-center space-x-3 px-4 py-2 rounded-lg font-medium text-sm transition-all duration-300 ${
                          isActive(subItem.path)
                            ? 'bg-gradient-to-r from-[#2563EB] via-[#7C3AED] to-[#F59E0B] text-white shadow-md'
                            : 'text-[#CBD5E1] hover:text-white hover:bg-white/5'
                        }`}
                      >
                        <span>{subItem.icon}</span>
                        <span>{subItem.label}</span>
                      </Link>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <Link
                href={item.path || '#'}
                className={`flex items-center space-x-3 px-4 py-3 rounded-lg font-medium transition-all duration-300 ${
                  isActive(item.path)
                    ? 'bg-gradient-to-r from-[#2563EB] via-[#7C3AED] to-[#F59E0B] text-white shadow-md'
                    : 'text-[#CBD5E1] hover:text-white hover:bg-white/5'
                }`}
              >
                <span className="text-xl">{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            )}
          </div>
        ))}
      </nav>
    </aside>
  );
}

