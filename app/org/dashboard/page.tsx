'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { apiClient } from '@/lib/api/client';
import { authApi } from '@/lib/api/auth';
import ScrollReveal from '@/components/home/ScrollReveal';
import DepartmentsServicesManagement from '@/components/org/DepartmentsServicesManagement';

interface User {
  id: string;
  email: string;
  full_name: string;
  role: string;
  organization_id?: string | null;
}

interface License {
  id: string;
  organization_id: string;
  plan: string;
  max_users: number;
  start_date: string;
  end_date: string;
  status: string;
  features: string[];
}

interface Organization {
  id: string;
  name: string;
  code: string;
  country: string;
  status: string;
}

export default function OrgAdminDashboard() {
  const router = useRouter();
  const [activeSection, setActiveSection] = useState<'users' | 'license' | 'organization'>('users');
  const [users, setUsers] = useState<User[]>([]);
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [license, setLicense] = useState<License | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [showUserModal, setShowUserModal] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [userForm, setUserForm] = useState({
    email: '',
    full_name: '',
    password: '',
    role: 'user',
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const user = authApi.getCurrentUser();
    if (!user || user.role !== 'admin') {
      router.push('/login');
      return;
    }
    setCurrentUser(user);
  }, [router]);

  useEffect(() => {
    if (currentUser) {
      fetchData();
    }
  }, [currentUser]);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const orgId = currentUser?.organization_id;

      const usersRes = await apiClient.get<User[]>('/auth/users/org').catch(() => []);
      setUsers(Array.isArray(usersRes) ? usersRes : []);

      let licenseData: License | null = null;
      if (orgId) {
        try {
          const licensesRes = await apiClient.get<License[]>(`/licenses/by-org/${orgId}`).catch(() => []);
          licenseData = licensesRes.find((l: License) => l.status === 'active') || licensesRes[0] || null;
          setLicense(licenseData);
        } catch (err) {
          console.error('Erreur lors de la récupération des licences:', err);
        }
      }

      if (orgId) {
        try {
          const orgsRes = await apiClient.get<Organization[]>('/organizations').catch(() => []);
          const org = orgsRes.find((o: Organization) => o.id === orgId);
          if (org) setOrganization(org);
        } catch (err) {
          console.error('Erreur lors de la récupération de l\'organisation:', err);
        }
      }
    } catch (error: any) {
      console.error('Erreur lors du chargement des données:', error);
      setError(error.message || 'Erreur lors du chargement des données.');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenUserModal = (user?: User) => {
    if (user) {
      setEditingItem(user);
      setUserForm({
        email: user.email,
        full_name: user.full_name,
        password: '',
        role: user.role || 'user',
      });
    } else {
      setEditingItem(null);
      setUserForm({ email: '', full_name: '', password: '', role: 'user' });
    }
    setError(null);
    setShowUserModal(true);
  };

  const handleSubmitUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      if (editingItem) {
        const updateData: any = {
          email: userForm.email,
          full_name: userForm.full_name,
          role: userForm.role,
        };
        if (userForm.password) updateData.password = userForm.password;
        await apiClient.put(`/auth/users/org/${editingItem.id}`, updateData);
      } else {
        await apiClient.post('/auth/users/org', {
          email: userForm.email,
          full_name: userForm.full_name,
          password: userForm.password,
          organization_id: currentUser?.organization_id,
          role: userForm.role,
        });
      }
      setShowUserModal(false);
      fetchData();
    } catch (err: any) {
      setError(err.message || 'Une erreur est survenue');
    } finally {
      setSubmitting(false);
    }
  };

  const daysLeft = license ? Math.ceil((new Date(license.end_date).getTime() - Date.now()) / (1000 * 86400)) : 0;
  const licenseProgress = license ? Math.max(0, Math.min(100, ((Date.now() - new Date(license.start_date).getTime()) / (new Date(license.end_date).getTime() - new Date(license.start_date).getTime())) * 100)) : 0;
  const usagePercent = license ? Math.round((users.length / license.max_users) * 100) : 0;

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center">
          <div className="relative w-14 h-14 mx-auto mb-4">
            <div className="absolute inset-0 border-2 border-[#1B3A8C]/30 rounded-full" />
            <div className="absolute inset-0 border-2 border-transparent border-t-[#C9A84C] rounded-full animate-spin" />
          </div>
          <p className="text-white/60 text-sm">Chargement du tableau de bord…</p>
        </div>
      </div>
    );
  }

  if (error && !currentUser) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="p-6 max-w-md rounded-2xl" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)' }}>
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      </div>
    );
  }

  /* ─── KPI config ─────────────────────────────────────────── */
  const kpis = [
    {
      id: 'users',
      label: 'Utilisateurs',
      value: String(users.length),
      accent: '#1B3A8C',
      sub: license ? `${users.length} / ${license.max_users} membres` : `${users.length} membres`,
      progress: usagePercent,
      progressColor: usagePercent > 80 ? '#EF4444' : '#1B3A8C',
      icon: (
        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      ),
    },
    {
      id: 'license',
      label: 'Licence',
      value: license ? license.plan : 'N/A',
      accent: '#C9A84C',
      sub: license ? (daysLeft > 0 ? `${daysLeft} jours restants` : 'Expirée') : 'Aucune licence',
      progress: licenseProgress,
      progressColor: licenseProgress > 80 ? '#EF4444' : '#C9A84C',
      icon: (
        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
        </svg>
      ),
    },
    {
      id: 'organization',
      label: 'Organisation',
      value: organization?.status === 'active' ? 'Active' : '—',
      accent: '#059669',
      sub: organization ? `${organization.code} · ${organization.country}` : 'Non configurée',
      progress: organization?.status === 'active' ? 100 : 0,
      progressColor: '#059669',
      icon: (
        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
        </svg>
      ),
    },
  ] as const;

  const tabs = [
    { id: 'users' as const, label: 'Utilisateurs', count: users.length },
    { id: 'license' as const, label: 'Licence', count: null },
    { id: 'organization' as const, label: 'Organisation', count: null },
  ];

  const inputCls = "w-full px-3.5 py-2.5 bg-[#040B1E] border border-[#1B3A8C]/40 rounded-xl text-white text-sm placeholder-white/25 focus:outline-none focus:border-[#C9A84C]/60 transition-all";

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-8">

      {/* ── Hero ── */}
      <ScrollReveal direction="down" delay={0}>
        <div className="relative rounded-3xl overflow-hidden mb-6"
          style={{ borderTop: '2px solid rgba(27,58,140,0.4)', borderRight: '2px solid rgba(27,58,140,0.4)', borderBottom: '2px solid rgba(27,58,140,0.4)', borderLeft: '4px solid #C9A84C', background: 'linear-gradient(135deg, #070E28 0%, #0F1E48 60%, #0A1434 100%)', boxShadow: '0 0 32px rgba(27,58,140,0.15)' }}>
          <div className="absolute top-0 right-0 w-72 h-52 bg-[#1B3A8C]/15 rounded-full blur-[80px] pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-48 h-40 bg-[#C9A84C]/6 rounded-full blur-[60px] pointer-events-none" />
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#C9A84C]/50 to-transparent" />

          <div className="relative z-10 p-6 sm:p-8 flex flex-col sm:flex-row sm:items-center gap-5">
            {/* Icon */}
            <div className="w-14 h-14 rounded-2xl bg-[#1B3A8C] border border-[#C9A84C]/25 flex items-center justify-center shadow-xl shadow-[#1B3A8C]/30 flex-shrink-0">
              <svg className="w-7 h-7 text-[#C9A84C]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>

            {/* Text */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[#C9A84C]">Administration</span>
                <span className="w-1 h-1 rounded-full bg-[#C9A84C]/50" />
                <span className="text-[10px] font-semibold text-white/40 uppercase tracking-wider">Organisation</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-white mb-1">
                Bonjour, <span style={{ background: 'linear-gradient(90deg, #C9A84C, #e8c97a)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>{currentUser?.full_name || 'Admin'}</span>
              </h1>
              <p className="text-sm text-white/55 max-w-xl leading-relaxed">
                Gérez votre organisation, vos utilisateurs et votre licence depuis ce panneau.
              </p>
            </div>

            {/* Org badge */}
            {organization && (
              <div className="flex-shrink-0 px-4 py-3 rounded-2xl" style={{ background: 'rgba(27,58,140,0.2)', border: '1px solid rgba(27,58,140,0.35)' }}>
                <div className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#C9A84C] mb-0.5">Organisation</div>
                <div className="text-sm font-black text-white">{organization.name}</div>
                <div className="text-[11px] text-white/45">{organization.code} · {organization.country}</div>
              </div>
            )}

            {/* Refresh */}
            <button onClick={fetchData} disabled={loading}
              className="p-3 rounded-xl flex-shrink-0 transition-all disabled:opacity-50"
              style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.6)' }}
              title="Rafraîchir">
              <svg className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
          </div>
        </div>
      </ScrollReveal>

      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        {kpis.map((kpi, i) => (
          <ScrollReveal key={kpi.id} direction="up" delay={i * 80}>
            <button
              onClick={() => setActiveSection(kpi.id)}
              className="w-full text-left rounded-2xl p-5 transition-all duration-300 hover:-translate-y-1"
              style={{
                background: '#070E28',
                borderTop: `2px solid ${kpi.accent}25`,
                borderRight: `2px solid ${kpi.accent}25`,
                borderBottom: `2px solid ${kpi.accent}25`,
                borderLeft: `4px solid ${kpi.accent}`,
                boxShadow: activeSection === kpi.id ? `0 0 24px ${kpi.accent}20` : '0 0 12px rgba(27,58,140,0.08)',
              }}>
              <div className="flex items-start justify-between mb-4">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: `${kpi.accent}20`, border: `1px solid ${kpi.accent}35` }}>
                  {kpi.icon}
                </div>
                <span className="text-2xl font-black" style={{ color: kpi.accent }}>{kpi.value}</span>
              </div>
              <h3 className="text-sm font-black text-white uppercase tracking-[0.08em] mb-1">{kpi.label}</h3>
              <p className="text-[11px] text-white/45 mb-3">{kpi.sub}</p>
              <div className="h-[3px] rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
                <div className="h-full rounded-full transition-all duration-1000"
                  style={{ width: `${kpi.progress}%`, background: kpi.progressColor }} />
              </div>
            </button>
          </ScrollReveal>
        ))}
      </div>

      {/* ── Tab Nav ── */}
      <ScrollReveal direction="up" delay={200}>
        <div className="rounded-2xl p-1.5 mb-6 flex gap-1.5"
          style={{ background: '#0A1434', border: '1px solid rgba(27,58,140,0.3)' }}>
          {tabs.map((tab) => {
            const isActive = activeSection === tab.id;
            return (
              <button key={tab.id}
                onClick={() => setActiveSection(tab.id)}
                className="relative flex-1 sm:flex-none px-5 py-2.5 rounded-xl text-sm font-bold transition-all duration-300 flex items-center justify-center gap-2"
                style={isActive
                  ? { background: 'linear-gradient(135deg, #1B3A8C, #C9A84C)', color: '#ffffff', boxShadow: '0 4px 16px rgba(27,58,140,0.3)' }
                  : { background: 'transparent', color: 'rgba(255,255,255,0.45)' }}>
                {tab.label}
                {tab.count !== null && tab.count > 0 && (
                  <span className="px-2 py-0.5 rounded-md text-xs font-black"
                    style={isActive
                      ? { background: 'rgba(255,255,255,0.2)', color: '#fff' }
                      : { background: 'rgba(27,58,140,0.25)', color: 'rgba(255,255,255,0.6)' }}>
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </ScrollReveal>

      {/* ── Content ── */}
      <div className="space-y-6">

        {/* Users */}
        {activeSection === 'users' && (
          <ScrollReveal direction="up" delay={0}>
            <div className="rounded-3xl overflow-hidden"
              style={{ borderTop: '2px solid rgba(27,58,140,0.35)', borderRight: '2px solid rgba(27,58,140,0.35)', borderBottom: '2px solid rgba(27,58,140,0.35)', borderLeft: '4px solid #1B3A8C', background: '#070E28', boxShadow: '0 0 28px rgba(27,58,140,0.10)' }}>
              {/* Header */}
              <div className="px-6 py-5 flex items-center justify-between"
                style={{ borderBottom: '1px solid rgba(27,58,140,0.2)', background: 'rgba(27,58,140,0.08)' }}>
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-[#1B3A8C] border border-[#C9A84C]/20 flex items-center justify-center flex-shrink-0">
                    <svg className="w-5 h-5 text-[#C9A84C]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </div>
                  <div>
                    <h2 className="text-lg font-black text-white">Utilisateurs</h2>
                    <p className="text-xs text-white/50">{users.length} membre{users.length > 1 ? 's' : ''}{license ? ` / ${license.max_users} max` : ''}</p>
                  </div>
                </div>
                <button onClick={() => handleOpenUserModal()}
                  className="px-5 py-2.5 rounded-xl text-sm font-bold text-white transition-all hover:scale-[1.02]"
                  style={{ background: 'linear-gradient(135deg, #1B3A8C 0%, #2e5bb8 50%, #C9A84C 100%)', boxShadow: '0 4px 16px rgba(27,58,140,0.3)' }}>
                  + Créer
                </button>
              </div>

              <div className="p-6">
                {loading ? (
                  <div className="text-center py-12 text-white/40 text-sm">Chargement…</div>
                ) : users.length === 0 ? (
                  <div className="text-center py-16">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-2xl flex items-center justify-center"
                      style={{ background: 'rgba(27,58,140,0.15)', border: '1px solid rgba(27,58,140,0.3)' }}>
                      <svg className="w-8 h-8 text-[#1B3A8C]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    </div>
                    <p className="text-white/70 text-base mb-6">Aucun utilisateur pour le moment</p>
                    <button onClick={() => handleOpenUserModal()}
                      className="px-6 py-3 rounded-xl font-bold text-white text-sm transition-all hover:scale-105"
                      style={{ background: 'linear-gradient(135deg, #1B3A8C 0%, #2e5bb8 50%, #C9A84C 100%)' }}>
                      Créer le premier utilisateur
                    </button>
                  </div>
                ) : (
                  <div className="overflow-x-auto rounded-xl" style={{ border: '1px solid rgba(27,58,140,0.2)' }}>
                    <table className="w-full">
                      <thead>
                        <tr style={{ background: 'rgba(27,58,140,0.08)' }}>
                          {['Utilisateur', 'Email', 'Rôle', 'Actions'].map((h, i) => (
                            <th key={h} className={`py-3 px-4 text-[10px] font-black uppercase tracking-[0.15em] text-white/40 ${i === 3 ? 'text-right' : 'text-left'}`}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody style={{ borderTop: '1px solid rgba(27,58,140,0.15)' }}>
                        {users.map((user, idx) => (
                          <tr key={user.id}
                            className="transition-colors"
                            style={{ background: idx % 2 === 0 ? 'transparent' : 'rgba(27,58,140,0.03)', borderBottom: '1px solid rgba(27,58,140,0.1)' }}>
                            <td className="py-3.5 px-4">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-black text-xs flex-shrink-0"
                                  style={{ background: 'rgba(27,58,140,0.3)', border: '1px solid rgba(27,58,140,0.4)' }}>
                                  {user.full_name.charAt(0).toUpperCase()}
                                </div>
                                <span className="text-white font-semibold text-sm">{user.full_name}</span>
                              </div>
                            </td>
                            <td className="py-3.5 px-4 text-white/60 text-sm">{user.email}</td>
                            <td className="py-3.5 px-4">
                              <span className="px-3 py-1 rounded-lg text-xs font-bold"
                                style={user.role === 'admin'
                                  ? { background: 'rgba(201,168,76,0.12)', color: '#C9A84C', border: '1px solid rgba(201,168,76,0.25)' }
                                  : { background: 'rgba(27,58,140,0.15)', color: 'rgba(255,255,255,0.6)', border: '1px solid rgba(27,58,140,0.25)' }}>
                                {user.role === 'admin' ? 'Admin' : 'Utilisateur'}
                              </span>
                            </td>
                            <td className="py-3.5 px-4 text-right">
                              <button onClick={() => handleOpenUserModal(user)}
                                className="px-4 py-2 rounded-lg text-sm font-semibold text-white/70 hover:text-white transition-all"
                                style={{ background: 'rgba(27,58,140,0.15)', border: '1px solid rgba(27,58,140,0.25)' }}>
                                Modifier
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </ScrollReveal>
        )}

        {/* Organization */}
        {activeSection === 'organization' && (
          <DepartmentsServicesManagement />
        )}

        {/* License */}
        {activeSection === 'license' && (
          <ScrollReveal direction="up" delay={0}>
            <div className="rounded-3xl overflow-hidden"
              style={{ borderTop: '2px solid rgba(201,168,76,0.3)', borderRight: '2px solid rgba(201,168,76,0.3)', borderBottom: '2px solid rgba(201,168,76,0.3)', borderLeft: '4px solid #C9A84C', background: '#070E28', boxShadow: '0 0 28px rgba(201,168,76,0.06)' }}>
              {/* Header */}
              <div className="px-6 py-5 flex items-center justify-between"
                style={{ borderBottom: '1px solid rgba(201,168,76,0.15)', background: 'rgba(201,168,76,0.05)' }}>
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: 'rgba(201,168,76,0.15)', border: '1px solid rgba(201,168,76,0.3)' }}>
                    <svg className="w-5 h-5 text-[#C9A84C]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                    </svg>
                  </div>
                  <div>
                    <h2 className="text-lg font-black text-white">Licence</h2>
                    <p className="text-xs text-white/50">{license ? `Plan ${license.plan}` : 'Aucune licence'}</p>
                  </div>
                </div>
                {license && (
                  <span className="px-3.5 py-1.5 rounded-xl text-xs font-black"
                    style={daysLeft > 30
                      ? { background: 'rgba(5,150,105,0.12)', color: '#059669', border: '1px solid rgba(5,150,105,0.25)' }
                      : daysLeft > 7
                      ? { background: 'rgba(217,119,6,0.12)', color: '#D97706', border: '1px solid rgba(217,119,6,0.25)' }
                      : { background: 'rgba(239,68,68,0.12)', color: '#EF4444', border: '1px solid rgba(239,68,68,0.25)' }}>
                    {license.status === 'active' ? (daysLeft > 0 ? `${daysLeft} jours restants` : 'Expirée') : license.status}
                  </span>
                )}
              </div>

              <div className="p-6">
                {!license ? (
                  <div className="text-center py-16">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-2xl flex items-center justify-center"
                      style={{ background: 'rgba(201,168,76,0.1)', border: '1px solid rgba(201,168,76,0.2)' }}>
                      <svg className="w-8 h-8 text-[#C9A84C]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                      </svg>
                    </div>
                    <p className="text-white/70 text-base">Aucune licence active</p>
                    <p className="text-white/40 text-sm mt-2">Contactez le Super Admin pour obtenir une licence.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Validity bar */}
                    <div className="p-5 rounded-2xl" style={{ background: 'rgba(201,168,76,0.05)', border: '1px solid rgba(201,168,76,0.15)' }}>
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-xs font-black uppercase tracking-[0.12em] text-white/70">Période de validité</span>
                        <span className="text-xs font-bold text-white/60">{Math.round(licenseProgress)}% écoulé</span>
                      </div>
                      <div className="h-2 rounded-full overflow-hidden mb-3" style={{ background: 'rgba(255,255,255,0.06)' }}>
                        <div className="h-full rounded-full transition-all duration-1000"
                          style={{ width: `${licenseProgress}%`, background: licenseProgress > 80 ? 'linear-gradient(90deg, #EF4444, #D97706)' : 'linear-gradient(90deg, #1B3A8C, #C9A84C)' }} />
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-white/50">
                        <span>{new Date(license.start_date).toLocaleDateString('fr-FR')}</span>
                        <span>{new Date(license.end_date).toLocaleDateString('fr-FR')}</span>
                      </div>
                    </div>

                    {/* Details grid */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {[
                        { label: 'Plan', value: license.plan, color: '#C9A84C' },
                        { label: 'Statut', value: license.status === 'active' ? 'Active' : license.status, color: license.status === 'active' ? '#059669' : '#D97706' },
                        { label: 'Utilisateurs', value: `${users.length}/${license.max_users}`, color: '#1B3A8C' },
                        { label: 'Capacité', value: `${usagePercent}%`, color: usagePercent > 80 ? '#EF4444' : usagePercent > 60 ? '#D97706' : '#059669' },
                      ].map(({ label, value, color }) => (
                        <div key={label} className="p-4 rounded-xl" style={{ background: '#040B1E', border: '1px solid rgba(27,58,140,0.2)' }}>
                          <div className="text-[10px] font-black uppercase tracking-[0.15em] text-white/40 mb-1">{label}</div>
                          <div className="text-lg font-black" style={{ color }}>{value}</div>
                        </div>
                      ))}
                    </div>

                    {/* Usage bar */}
                    <div className="p-5 rounded-2xl" style={{ background: 'rgba(27,58,140,0.06)', border: '1px solid rgba(27,58,140,0.2)' }}>
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-xs font-black uppercase tracking-[0.12em] text-white/70">Capacité utilisateurs</span>
                        <span className="text-xs font-bold text-white/60">{users.length} / {license.max_users}</span>
                      </div>
                      <div className="h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
                        <div className="h-full rounded-full transition-all duration-1000"
                          style={{ width: `${usagePercent}%`, background: usagePercent > 80 ? 'linear-gradient(90deg, #EF4444, #D97706)' : 'linear-gradient(90deg, #1B3A8C, #C9A84C)' }} />
                      </div>
                    </div>

                    {/* Features */}
                    {license.features && license.features.length > 0 && (
                      <div className="p-5 rounded-2xl" style={{ background: 'rgba(27,58,140,0.06)', border: '1px solid rgba(27,58,140,0.2)' }}>
                        <h3 className="text-xs font-black uppercase tracking-[0.15em] text-white/60 mb-4">Fonctionnalités incluses</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                          {license.features.map((feature, index) => (
                            <div key={index} className="flex items-center gap-2.5 text-sm">
                              <div className="w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0"
                                style={{ background: 'rgba(5,150,105,0.12)', border: '1px solid rgba(5,150,105,0.25)' }}>
                                <svg className="w-3 h-3 text-[#059669]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                </svg>
                              </div>
                              <span className="text-white/80 text-xs">{feature}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </ScrollReveal>
        )}
      </div>

      {/* ── User Modal ── */}
      {showUserModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md"
          onClick={() => setShowUserModal(false)}>
          <div className="w-full max-w-md max-h-[90vh] overflow-y-auto rounded-2xl"
            style={{ background: '#0A1434', border: '1px solid rgba(27,58,140,0.4)', boxShadow: '0 24px 64px rgba(0,0,0,0.5)' }}
            onClick={(e) => e.stopPropagation()}>
            <div className="p-6">
              {/* Modal header */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-[#1B3A8C] border border-[#C9A84C]/20 flex items-center justify-center">
                    <svg className="w-4 h-4 text-[#C9A84C]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-black text-white">
                    {editingItem ? 'Modifier l\'utilisateur' : 'Nouvel utilisateur'}
                  </h3>
                </div>
                <button onClick={() => setShowUserModal(false)}
                  className="p-1.5 rounded-lg text-white/40 hover:text-white transition-all"
                  style={{ background: 'rgba(255,255,255,0.05)' }}>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Gold top line */}
              <div className="h-px mb-5" style={{ background: 'linear-gradient(90deg, transparent, rgba(201,168,76,0.4), transparent)' }} />

              {error && (
                <div className="mb-4 p-3 rounded-xl text-sm text-red-400"
                  style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmitUser} className="space-y-4">
                <div>
                  <label htmlFor="userEmail" className="block text-[11px] font-black uppercase tracking-[0.15em] text-white/55 mb-1.5">Email *</label>
                  <input type="email" id="userEmail" required
                    value={userForm.email}
                    onChange={(e) => setUserForm({ ...userForm, email: e.target.value })}
                    className={inputCls} placeholder="user@banque.com" />
                </div>

                <div>
                  <label htmlFor="userName" className="block text-[11px] font-black uppercase tracking-[0.15em] text-white/55 mb-1.5">Nom complet *</label>
                  <input type="text" id="userName" required
                    value={userForm.full_name}
                    onChange={(e) => setUserForm({ ...userForm, full_name: e.target.value })}
                    className={inputCls} placeholder="Ex : Jean Dupont" />
                </div>

                <div>
                  <label htmlFor="userPassword" className="block text-[11px] font-black uppercase tracking-[0.15em] text-white/55 mb-1.5">
                    Mot de passe {editingItem ? <span className="text-[10px] font-normal normal-case text-white/35">(vide = inchangé)</span> : '*'}
                  </label>
                  <input type="password" id="userPassword"
                    required={!editingItem} minLength={6}
                    value={userForm.password}
                    onChange={(e) => setUserForm({ ...userForm, password: e.target.value })}
                    className={inputCls} placeholder="Minimum 6 caractères" />
                </div>

                <div>
                  <label htmlFor="userRole" className="block text-[11px] font-black uppercase tracking-[0.15em] text-white/55 mb-1.5">Rôle *</label>
                  <select id="userRole" required
                    value={userForm.role}
                    onChange={(e) => setUserForm({ ...userForm, role: e.target.value })}
                    className={inputCls}
                    style={{ backgroundColor: '#040B1E' }}>
                    <option value="user" style={{ backgroundColor: '#040B1E' }}>Utilisateur</option>
                    <option value="admin" style={{ backgroundColor: '#040B1E' }}>Administrateur</option>
                  </select>
                </div>

                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={() => setShowUserModal(false)}
                    className="flex-1 px-4 py-2.5 rounded-xl text-sm font-bold text-white/60 hover:text-white transition-all"
                    style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}>
                    Annuler
                  </button>
                  <button type="submit" disabled={submitting}
                    className="flex-1 px-4 py-2.5 rounded-xl text-sm font-bold text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:scale-[1.02]"
                    style={{ background: 'linear-gradient(135deg, #1B3A8C 0%, #2e5bb8 50%, #C9A84C 100%)', boxShadow: '0 4px 16px rgba(27,58,140,0.3)' }}>
                    {submitting ? 'En cours…' : editingItem ? 'Modifier' : 'Créer'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
