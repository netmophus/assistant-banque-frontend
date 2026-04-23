'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import { apiClient } from '@/lib/api/client';
import { authApi } from '@/lib/api/auth';
import ScrollReveal from '@/components/home/ScrollReveal';
import GlobalKnowledgeSection from '@/components/admin/GlobalKnowledgeSection';

interface Organization {
  id: string;
  name: string;
  code: string;
  country: string;
  status: string;
}

interface License {
  id: string;
  organization_id: string;
  plan: string;
  max_users: number;
  start_date: string;
  end_date: string;
  status: string;
  features?: string[];
}

interface User {
  id: string;
  email: string;
  full_name: string;
  organization_id?: string | null;
  role: string;
}

interface RagNewDocumentListItem {
  scope: string;
  filename: string;
  category?: string | null;
  organization_id?: string | null;
  chunk_count: number;
  created_at?: string | null;
  updated_at?: string | null;
}

interface RagNewDocumentListResponse {
  total: number;
  offset: number;
  limit: number;
  items: RagNewDocumentListItem[];
}

export default function SuperAdminDashboard() {
  const router = useRouter();
  const [activeSection, setActiveSection] = useState<'overview' | 'organizations' | 'licenses' | 'users' | 'knowledge' | 'rag_new_test' | 'rag_documents'>('overview');
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [licenses, setLicenses] = useState<License[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [globalKnowledgeCount, setGlobalKnowledgeCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [showOrgModal, setShowOrgModal] = useState(false);
  const [showLicenseModal, setShowLicenseModal] = useState(false);
  const [showUserModal, setShowUserModal] = useState(false);

  // Web search config modal
  const [showWebSearchModal, setShowWebSearchModal] = useState(false);
  const [webSearchOrg, setWebSearchOrg] = useState<Organization | null>(null);
  const [webSearchEnabled, setWebSearchEnabled] = useState(false);
  const [webSearchSites, setWebSearchSites] = useState<string[]>([]);
  const [webSearchNewSite, setWebSearchNewSite] = useState('');
  const [webSearchLoading, setWebSearchLoading] = useState(false);
  const [webSearchSaving, setWebSearchSaving] = useState(false);
  const [webSearchError, setWebSearchError] = useState<string | null>(null);
  const [webSearchSuccess, setWebSearchSuccess] = useState<string | null>(null);

  const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000';

  const [ragFile, setRagFile] = useState<File | null>(null);
  const [ragCategories, setRagCategories] = useState<any[]>([]);
  const [ragCategory, setRagCategory] = useState('');
  const [ragQuestion, setRagQuestion] = useState('');
  const [ragAnswer, setRagAnswer] = useState<string | null>(null);
  const [ragStrategy, setRagStrategy] = useState<string | null>(null);
  const [ragSources, setRagSources] = useState<any[]>([]);
  const [ragDebug, setRagDebug] = useState<any>(null);
  const [ragBusy, setRagBusy] = useState(false);
  const [ragError, setRagError] = useState<string | null>(null);
  const [ragUploadSuccess, setRagUploadSuccess] = useState<string | null>(null);

  const [ragDocs, setRagDocs] = useState<RagNewDocumentListItem[]>([]);
  const [ragDocsTotal, setRagDocsTotal] = useState(0);
  const [ragDocsLoading, setRagDocsLoading] = useState(false);
  const [ragDocsError, setRagDocsError] = useState<string | null>(null);
  const [ragDocsScope, setRagDocsScope] = useState<string>('');
  const [ragDocsCategory, setRagDocsCategory] = useState<string>('');
  const [ragDocsOrgId, setRagDocsOrgId] = useState<string>('');
  const [ragDocsOffset, setRagDocsOffset] = useState(0);
  const [ragDocsLimit, setRagDocsLimit] = useState(50);

  const loadRagCategories = async () => {
    try {
      const data = await apiClient.get<any[]>('/api/rag-new/categories').catch(() => []);
      setRagCategories(Array.isArray(data) ? data : []);
    } catch {
      setRagCategories([]);
    }
  };

  useEffect(() => {
    loadRagCategories();
  }, []);

  useEffect(() => {
    if (activeSection !== 'rag_documents') return;
    fetchRagDocuments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSection, ragDocsOffset, ragDocsLimit]);

  const fetchRagDocuments = async (opts?: { resetOffset?: boolean }) => {
    setRagDocsError(null);
    setRagDocsLoading(true);
    try {
      const nextOffset = opts?.resetOffset ? 0 : ragDocsOffset;
      const params = new URLSearchParams();
      if (ragDocsScope.trim()) params.set('scope', ragDocsScope.trim());
      if (ragDocsCategory.trim()) params.set('category', ragDocsCategory.trim());
      if (ragDocsOrgId.trim()) params.set('organization_id', ragDocsOrgId.trim());
      params.set('offset', String(nextOffset));
      params.set('limit', String(ragDocsLimit));

      const data = await apiClient.get<RagNewDocumentListResponse>(`/api/rag-new/documents?${params.toString()}`);
      setRagDocs(Array.isArray(data?.items) ? data.items : []);
      setRagDocsTotal(typeof data?.total === 'number' ? data.total : 0);
      if (opts?.resetOffset) setRagDocsOffset(0);
    } catch (e: any) {
      setRagDocs([]);
      setRagDocsTotal(0);
      setRagDocsError(e?.message || 'Erreur lors du chargement des documents RAG');
    } finally {
      setRagDocsLoading(false);
    }
  };

  const handleRagFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setRagFile(file);
    }
  };

  const handleRagUpload = async () => {
    try {
      setRagError(null);
      setRagUploadSuccess(null);
      setRagAnswer(null);
      setRagStrategy(null);
      setRagSources([]);
      setRagDebug(null);
      if (!ragFile) {
        setRagError('Veuillez sélectionner un fichier.');
        return;
      }
      if (!ragCategory.trim()) {
        setRagError('Veuillez sélectionner une catégorie.');
        return;
      }

      setRagBusy(true);

      const additionalData: { [key: string]: string } = {
        category: ragCategory.trim(),
      };
      await apiClient.uploadFile('/api/rag-new/upload', ragFile, additionalData);
      setRagUploadSuccess('Upload réussi. Le traitement (extraction + chunking) est en cours...');
    } catch (e: any) {
      setRagError(e?.message || 'Erreur lors de l\'upload.');
    } finally {
      setRagBusy(false);
    }
  };

  const handleRagQuery = async () => {
    try {
      setRagError(null);
      setRagAnswer(null);
      setRagStrategy(null);
      setRagSources([]);
      setRagDebug(null);
      if (!ragQuestion.trim()) {
        setRagError('Veuillez saisir une question.');
        return;
      }

      setRagBusy(true);

      const questionToSend = `${ragQuestion.trim()}\n\nAgis comme un expert senior en banque et réglementation bancaire (UEMOA). Adresse-toi à un public professionnel (direction, conformité, risques, exploitation bancaire) et adopte un ton technique. Donne une réponse la plus complète et détaillée possible, et ajoute des informations complémentaires utiles (contexte bancaire, implications pratiques, points de vigilance, et exemples si pertinent), tout en restant strictement dans le sujet de la question. Évite les conseils grand public du type \"vérifiez vos comptes\" ; si tu dois proposer des éléments destinés aux clients, présente-les explicitement comme \"message à communiquer au client\".`;

      const data = await apiClient.post<any>('/api/rag-new/query', {
        question: questionToSend,
      });

      setRagAnswer(data?.answer || '');
      setRagStrategy(data?.strategy || null);
      setRagSources([]);
      setRagDebug(data?.debug ?? null);
    } catch (e: any) {
      setRagError(e?.message || 'Erreur lors de la requête.');
    } finally {
      setRagBusy(false);
    }
  };

  const [editingItem, setEditingItem] = useState<any>(null);
  const [orgForm, setOrgForm] = useState({ name: '', code: '', country: '', status: 'active' });
  const [licenseForm, setLicenseForm] = useState({
    organization_id: '',
    plan: 'Standard',
    max_users: 50,
    start_date: '',
    end_date: '',
    status: 'active',
    features: [] as string[],
  });
  const [userForm, setUserForm] = useState({
    email: '',
    full_name: '',
    password: '',
    organization_id: '',
    role: 'admin',
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const user = authApi.getCurrentUser();
    if (!user || user.role !== 'superadmin') {
      router.push('/login');
      return;
    }
    setCurrentUser(user);
    fetchData();
  }, [router]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [orgsRes, licensesRes, usersRes, knowledgeRes] = await Promise.all([
        apiClient.get<Organization[]>('/organizations').catch(() => []),
        apiClient.get<License[]>('/licenses').catch(() => []),
        apiClient.get<User[]>('/auth/users').catch(() => []),
        apiClient.get<{ total: number }>('/admin/global-knowledge?skip=0&limit=1').catch(() => ({ total: 0 })),
      ]);

      setOrganizations(Array.isArray(orgsRes) ? orgsRes : []);
      setLicenses(Array.isArray(licensesRes) ? licensesRes : []);
      setUsers(Array.isArray(usersRes) ? usersRes.filter((u: User) => u.role !== 'superadmin') : []);
      setGlobalKnowledgeCount(typeof knowledgeRes === 'object' && 'total' in knowledgeRes ? knowledgeRes.total : 0);
    } catch (error) {
      console.error('Erreur lors du chargement des données:', error);
    } finally {
      setLoading(false);
    }
  };

  const stats = [
    {
      id: 'organizations',
      label: 'Organisations',
      value: organizations.length,
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
        </svg>
      ),
      gradient: 'from-blue-500 to-cyan-500',
      bgGradient: 'from-blue-500/20 to-cyan-500/20',
    },
    {
      id: 'licenses',
      label: 'Licences Actives',
      value: licenses.filter(l => l.status === 'active').length,
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
        </svg>
      ),
      gradient: 'from-purple-500 to-pink-500',
      bgGradient: 'from-purple-500/20 to-pink-500/20',
    },
    {
      id: 'users',
      label: 'Administrateurs',
      value: users.length,
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      ),
      gradient: 'from-orange-500 to-red-500',
      bgGradient: 'from-orange-500/20 to-red-500/20',
    },
    {
      id: 'knowledge',
      label: 'Documents Globaux',
      value: globalKnowledgeCount,
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
        </svg>
      ),
      gradient: 'from-green-500 to-emerald-500',
      bgGradient: 'from-green-500/20 to-emerald-500/20',
    },
  ];

  const getOrgName = (orgId: string) => {
    const org = organizations.find((o) => o.id === orgId);
    return org ? org.name : orgId;
  };

  const handleOpenWebSearchModal = async (org: Organization) => {
    setWebSearchOrg(org);
    setWebSearchError(null);
    setWebSearchSuccess(null);
    setWebSearchNewSite('');
    setWebSearchLoading(true);
    setShowWebSearchModal(true);
    try {
      const data = await apiClient.get<{ web_search_enabled: boolean; web_search_sites: string[] }>(`/organizations/${org.id}/web-search-config`);
      setWebSearchEnabled(data.web_search_enabled);
      setWebSearchSites(data.web_search_sites);
    } catch {
      setWebSearchEnabled(false);
      setWebSearchSites([]);
    } finally {
      setWebSearchLoading(false);
    }
  };

  const handleWebSearchAddSite = () => {
    const site = webSearchNewSite.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/$/, '');
    if (!site || webSearchSites.includes(site)) { setWebSearchNewSite(''); return; }
    setWebSearchSites(prev => [...prev, site]);
    setWebSearchNewSite('');
  };

  const handleWebSearchSave = async () => {
    if (!webSearchOrg) return;
    setWebSearchSaving(true);
    setWebSearchError(null);
    setWebSearchSuccess(null);
    try {
      await apiClient.put(`/organizations/${webSearchOrg.id}/web-search-config`, {
        web_search_enabled: webSearchEnabled,
        web_search_sites: webSearchSites,
      });
      setWebSearchSuccess('Configuration enregistrée.');
      setTimeout(() => setWebSearchSuccess(null), 3000);
    } catch (err: any) {
      setWebSearchError(err.message || 'Erreur lors de l\'enregistrement.');
    } finally {
      setWebSearchSaving(false);
    }
  };

  const handleOpenOrgModal = (org?: Organization) => {
    if (org) {
      setEditingItem(org);
      setOrgForm({
        name: org.name,
        code: org.code,
        country: org.country || '',
        status: org.status || 'active',
      });
    } else {
      setEditingItem(null);
      setOrgForm({ name: '', code: '', country: '', status: 'active' });
    }
    setError(null);
    setShowOrgModal(true);
  };

  const handleSubmitOrg = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      if (editingItem) {
        // Mise à jour
        await apiClient.put(`/organizations/${editingItem.id}`, {
          name: orgForm.name,
          code: orgForm.code,
          country: orgForm.country || null,
          status: orgForm.status,
        });
      } else {
        // Création
        await apiClient.post('/organizations', {
          name: orgForm.name,
          code: orgForm.code,
          country: orgForm.country || null,
        });
      }
      setShowOrgModal(false);
      fetchData(); // Recharger les données
    } catch (err: any) {
      setError(err.message || 'Une erreur est survenue');
    } finally {
      setSubmitting(false);
    }
  };

  const formatDateForInput = (dateStr: string) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const handleOpenLicenseModal = (license?: License) => {
    if (license) {
      setEditingItem(license);
      setLicenseForm({
        organization_id: license.organization_id,
        plan: license.plan,
        max_users: license.max_users,
        start_date: formatDateForInput(license.start_date),
        end_date: formatDateForInput(license.end_date),
        status: license.status || 'active',
        features: license.features || [],
      });
    } else {
      setEditingItem(null);
      setLicenseForm({
        organization_id: '',
        plan: 'Standard',
        max_users: 50,
        start_date: '',
        end_date: '',
        status: 'active',
        features: [],
      });
    }
    setError(null);
    setShowLicenseModal(true);
  };

  const handleSubmitLicense = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      if (editingItem) {
        // Mise à jour
        await apiClient.put(`/licenses/${editingItem.id}`, {
          organization_id: licenseForm.organization_id,
          plan: licenseForm.plan,
          max_users: licenseForm.max_users,
          start_date: licenseForm.start_date,
          end_date: licenseForm.end_date,
          status: licenseForm.status,
          features: licenseForm.features,
        });
      } else {
        // Création
        await apiClient.post('/licenses', {
          organization_id: licenseForm.organization_id,
          plan: licenseForm.plan,
          max_users: licenseForm.max_users,
          start_date: licenseForm.start_date,
          end_date: licenseForm.end_date,
          status: licenseForm.status,
          features: licenseForm.features,
        });
      }
      setShowLicenseModal(false);
      fetchData(); // Recharger les données
    } catch (err: any) {
      setError(err.message || 'Une erreur est survenue');
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenUserModal = (user?: User) => {
    if (user) {
      setEditingItem(user);
      setUserForm({
        email: user.email,
        full_name: user.full_name,
        password: '',
        organization_id: user.organization_id || '',
        role: user.role || 'admin',
      });
    } else {
      setEditingItem(null);
      setUserForm({
        email: '',
        full_name: '',
        password: '',
        organization_id: '',
        role: 'admin',
      });
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
        // Mise à jour
        const updateData: any = {
          email: userForm.email,
          full_name: userForm.full_name,
          organization_id: userForm.organization_id,
          role: userForm.role,
        };
        if (userForm.password) {
          updateData.password = userForm.password;
        }
        await apiClient.put(`/auth/users/${editingItem.id}`, updateData);
      } else {
        // Création - utiliser /auth/register avec role="admin"
        await apiClient.post('/auth/register', {
          email: userForm.email,
          full_name: userForm.full_name,
          password: userForm.password,
          organization_id: userForm.organization_id,
          role: 'admin',
        });
      }
      setShowUserModal(false);
      fetchData(); // Recharger les données
    } catch (err: any) {
      setError(err.message || 'Une erreur est survenue');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#030712] overflow-x-hidden">
      <style jsx global>{`
        @keyframes float-orb {
          0%, 100% { transform: translateY(0) scale(1); }
          50% { transform: translateY(-30px) scale(1.05); }
        }
        @keyframes pulse-glow {
          0%, 100% { opacity: 0.4; }
          50% { opacity: 0.8; }
        }
        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
        @keyframes count-up {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-float-1 { animation: float-orb 8s ease-in-out infinite; }
        .animate-float-2 { animation: float-orb 12s ease-in-out infinite 2s; }
        .animate-float-3 { animation: float-orb 10s ease-in-out infinite 4s; }
        .animate-pulse-glow { animation: pulse-glow 4s ease-in-out infinite; }
        .animate-shimmer {
          background: linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.08) 50%, transparent 100%);
          background-size: 200% 100%;
          animation: shimmer 3s ease-in-out infinite;
        }
        .kpi-card {
          position: relative;
          transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .kpi-card:hover {
          transform: translateY(-6px);
          box-shadow: 0 20px 60px -12px rgba(0,0,0,0.5);
        }
        .kpi-card::before {
          content: '';
          position: absolute;
          inset: 0;
          border-radius: inherit;
          padding: 1px;
          background: linear-gradient(135deg, rgba(255,255,255,0.15), rgba(255,255,255,0.03));
          -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
          -webkit-mask-composite: xor;
          mask-composite: exclude;
          pointer-events: none;
        }
        .kpi-card:hover::before {
          background: linear-gradient(135deg, rgba(255,255,255,0.3), rgba(255,255,255,0.05));
        }
      `}</style>

      <Navbar />
      
      <main className="flex-1 pt-24 pb-12 relative">
        {/* Floating background orbs */}
        <div className="fixed inset-0 overflow-hidden pointer-events-none" style={{ zIndex: 0 }}>
          <div className="animate-float-1 absolute top-[10%] left-[5%] w-[500px] h-[500px] rounded-full bg-[#2563EB]/[0.04] blur-[100px]"></div>
          <div className="animate-float-2 absolute top-[40%] right-[10%] w-[400px] h-[400px] rounded-full bg-[#7C3AED]/[0.05] blur-[100px]"></div>
          <div className="animate-float-3 absolute bottom-[10%] left-[30%] w-[350px] h-[350px] rounded-full bg-[#F59E0B]/[0.03] blur-[100px]"></div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative" style={{ zIndex: 1 }}>
          {/* Hero Section */}
          <ScrollReveal direction="down" delay={0}>
            <div className="mb-10">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></div>
                    <span className="text-xs font-semibold text-emerald-400 uppercase tracking-widest">Panneau d'administration</span>
                  </div>
                  <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-white mb-2 tracking-tight">
                    Super Admin
                  </h1>
                  {currentUser && (
                    <p className="text-lg text-[#94a3b8]">
                      Bienvenue, <span className="font-semibold text-white">{currentUser.full_name}</span>
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <div className="px-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] backdrop-blur-sm">
                    <div className="text-xs text-[#64748b] mb-0.5">Aujourd'hui</div>
                    <div className="text-sm font-semibold text-white">
                      {new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                    </div>
                  </div>
                  <button
                    onClick={fetchData}
                    disabled={loading}
                    className="p-3 rounded-xl bg-white/[0.04] border border-white/[0.08] text-[#94a3b8] hover:text-white hover:bg-white/[0.08] transition-all disabled:opacity-50"
                    title="Rafraîchir les données"
                  >
                    <svg className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          </ScrollReveal>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-10">
            {stats.map((stat, index) => (
              <ScrollReveal key={stat.id} direction="up" delay={index * 80}>
                <button
                  onClick={() => setActiveSection(stat.id as any)}
                  className={`kpi-card w-full text-left rounded-2xl p-5 bg-[#0a0f1e]/80 backdrop-blur-xl border-0 cursor-pointer`}
                >
                  <div className="flex items-start justify-between mb-5">
                    <div className={`p-2.5 rounded-xl bg-gradient-to-br ${stat.gradient} shadow-lg`}>
                      <div className="text-white">{stat.icon}</div>
                    </div>
                    <div className={`text-3xl font-black bg-gradient-to-br ${stat.gradient} bg-clip-text text-transparent`} style={{ animation: 'count-up 0.6s ease-out' }}>
                      {stat.value}
                    </div>
                  </div>
                  <h3 className="text-[#94a3b8] font-medium text-sm">{stat.label}</h3>
                  <div className="mt-3 h-[3px] rounded-full bg-white/[0.06] overflow-hidden">
                    <div className={`h-full rounded-full bg-gradient-to-r ${stat.gradient} transition-all duration-1000`} style={{ width: `${Math.min(100, (stat.value / Math.max(...stats.map(s => s.value), 1)) * 100)}%` }}></div>
                  </div>
                </button>
              </ScrollReveal>
            ))}
          </div>

          {/* Navigation Tabs */}
          <ScrollReveal direction="up" delay={400}>
            <div className="mb-8">
              <div className="flex flex-wrap gap-1.5 bg-[#0a0f1e]/60 backdrop-blur-xl rounded-2xl p-1.5 border border-white/[0.06]">
                {[ 
                  { id: 'overview', label: 'Vue d\'ensemble', icon: '📊', count: null },
                  { id: 'organizations', label: 'Organisations', icon: '🏢', count: organizations.length },
                  { id: 'licenses', label: 'Licences', icon: '🔑', count: licenses.filter(l => l.status === 'active').length },
                  { id: 'users', label: 'Admins', icon: '👥', count: users.length },
                  { id: 'knowledge', label: 'Connaissances', icon: '📚', count: globalKnowledgeCount },
                  { id: 'rag_documents', label: 'RAG Docs', icon: '📄', count: null },
                  { id: 'rag_new_test', label: 'RAG Test', icon: '🧪', count: null },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveSection(tab.id as any)}
                    className={`relative px-5 py-2.5 rounded-xl font-semibold text-sm transition-all duration-300 flex items-center gap-2 ${
                      activeSection === tab.id
                        ? 'bg-white/[0.1] text-white shadow-lg shadow-black/20 border border-white/[0.1]'
                        : 'text-[#64748b] hover:text-[#CBD5E1] hover:bg-white/[0.03] border border-transparent'
                    }`}
                  >
                    <span>{tab.icon}</span>
                    <span>{tab.label}</span>
                    {tab.count !== null && tab.count > 0 && (
                      <span className={`ml-1 px-1.5 py-0.5 rounded-md text-[10px] font-bold ${
                        activeSection === tab.id ? 'bg-white/20 text-white' : 'bg-white/[0.06] text-[#64748b]'
                      }`}>
                        {tab.count}
                      </span>
                    )}
                    {activeSection === tab.id && (
                      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-[2px] rounded-full bg-gradient-to-r from-[#2563EB] to-[#7C3AED]"></div>
                    )}
                  </button>
                ))}
              </div>
            </div>
          </ScrollReveal>

          {/* Content Sections */}
          <div className="space-y-8">
            {/* Overview Section */}
            {activeSection === 'overview' && (
              <ScrollReveal direction="up" delay={0}>
                {/* Lien rapide vers les demandes d'abonnement */}
                <a
                  href="/m1/subscription-requests"
                  className="block mb-6 p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-[#C9A84C]/10 via-[#1B3A8C]/15 to-[#C9A84C]/5 border border-[#C9A84C]/30 hover:border-[#C9A84C] transition-colors group"
                >
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-[#C9A84C]/20 border border-[#C9A84C]/40 flex items-center justify-center text-xl">
                        📋
                      </div>
                      <div>
                        <h3 className="text-sm font-black text-white">
                          Demandes d&apos;abonnement
                        </h3>
                        <p className="text-xs text-white/60 mt-0.5">
                          Gérer les demandes reçues via /tarifs
                        </p>
                      </div>
                    </div>
                    <div className="text-[#C9A84C] font-bold group-hover:translate-x-1 transition-transform">
                      →
                    </div>
                  </div>
                </a>

                {/* Quick Summary Bar */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
                  <div className="bg-[#0a0f1e]/60 rounded-xl p-4 border border-white/[0.06]">
                    <div className="text-xs text-[#64748b] mb-1">Orgs actives</div>
                    <div className="text-xl font-bold text-emerald-400">{organizations.filter(o => o.status === 'active').length}</div>
                  </div>
                  <div className="bg-[#0a0f1e]/60 rounded-xl p-4 border border-white/[0.06]">
                    <div className="text-xs text-[#64748b] mb-1">Licences expirées</div>
                    <div className="text-xl font-bold text-amber-400">{licenses.filter(l => l.status === 'expired').length}</div>
                  </div>
                  <div className="bg-[#0a0f1e]/60 rounded-xl p-4 border border-white/[0.06]">
                    <div className="text-xs text-[#64748b] mb-1">Utilisateurs max</div>
                    <div className="text-xl font-bold text-blue-400">{licenses.filter(l => l.status === 'active').reduce((s, l) => s + l.max_users, 0)}</div>
                  </div>
                  <div className="bg-[#0a0f1e]/60 rounded-xl p-4 border border-white/[0.06]">
                    <div className="text-xs text-[#64748b] mb-1">Docs Knowledge</div>
                    <div className="text-xl font-bold text-purple-400">{globalKnowledgeCount}</div>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Recent Organizations */}
                  <div className="bg-[#0a0f1e]/60 backdrop-blur-xl rounded-2xl border border-white/[0.06] overflow-hidden">
                    <div className="flex items-center justify-between p-5 border-b border-white/[0.06]">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-white text-sm">🏢</div>
                        <h2 className="text-lg font-bold text-white">Organisations</h2>
                      </div>
                      <button
                        onClick={() => setActiveSection('organizations')}
                        className="text-xs text-[#64748b] hover:text-white font-medium px-3 py-1.5 rounded-lg hover:bg-white/[0.05] transition-all"
                      >
                        Voir tout →
                      </button>
                    </div>
                    <div className="p-4">
                      {loading ? (
                        <div className="text-center py-8 text-[#64748b]">Chargement...</div>
                      ) : organizations.length === 0 ? (
                        <div className="text-center py-8">
                          <p className="text-[#64748b] mb-4">Aucune organisation</p>
                          <button
                            onClick={() => handleOpenOrgModal()}
                            className="px-4 py-2 bg-gradient-to-r from-[#2563EB] to-[#7C3AED] text-white rounded-lg text-sm font-semibold hover:scale-105 transition-transform"
                          >
                            Créer une organisation
                          </button>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {organizations.slice(0, 5).map((org, i) => (
                            <div
                              key={org.id}
                              className="group flex items-center gap-3 p-3 rounded-xl hover:bg-white/[0.03] transition-all cursor-pointer"
                              onClick={() => handleOpenOrgModal(org)}
                            >
                              <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-blue-500/20 to-cyan-500/20 flex items-center justify-center text-white font-bold text-sm border border-blue-500/20">
                                {org.name.charAt(0)}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="text-white font-semibold text-sm truncate">{org.name}</div>
                                <div className="text-[#64748b] text-xs">{org.code} • {org.country}</div>
                              </div>
                              <span className={`px-2 py-1 rounded-md text-[10px] font-bold ${
                                org.status === 'active' 
                                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                                  : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                              }`}>
                                {org.status === 'active' ? 'Actif' : org.status}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Active Licenses */}
                  <div className="bg-[#0a0f1e]/60 backdrop-blur-xl rounded-2xl border border-white/[0.06] overflow-hidden">
                    <div className="flex items-center justify-between p-5 border-b border-white/[0.06]">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white text-sm">🔑</div>
                        <h2 className="text-lg font-bold text-white">Licences Actives</h2>
                      </div>
                      <button
                        onClick={() => setActiveSection('licenses')}
                        className="text-xs text-[#64748b] hover:text-white font-medium px-3 py-1.5 rounded-lg hover:bg-white/[0.05] transition-all"
                      >
                        Voir tout →
                      </button>
                    </div>
                    <div className="p-4">
                      {loading ? (
                        <div className="text-center py-8 text-[#64748b]">Chargement...</div>
                      ) : licenses.filter(l => l.status === 'active').length === 0 ? (
                        <div className="text-center py-8">
                          <p className="text-[#64748b] mb-4">Aucune licence active</p>
                          <button
                            onClick={() => handleOpenLicenseModal()}
                            className="px-4 py-2 bg-gradient-to-r from-[#7C3AED] to-[#F59E0B] text-white rounded-lg text-sm font-semibold hover:scale-105 transition-transform"
                          >
                            Créer une licence
                          </button>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {licenses.filter(l => l.status === 'active').slice(0, 5).map((license) => {
                            const daysLeft = Math.ceil((new Date(license.end_date).getTime() - Date.now()) / (1000 * 86400));
                            return (
                              <div
                                key={license.id}
                                className="group flex items-center gap-3 p-3 rounded-xl hover:bg-white/[0.03] transition-all cursor-pointer"
                                onClick={() => handleOpenLicenseModal(license)}
                              >
                                <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-purple-500/20 to-pink-500/20 flex items-center justify-center text-white font-bold text-sm border border-purple-500/20">
                                  {license.plan.charAt(0)}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="text-white font-semibold text-sm">Plan {license.plan}</div>
                                  <div className="text-[#64748b] text-xs">{getOrgName(license.organization_id)} • {license.max_users} users</div>
                                </div>
                                <div className="text-right">
                                  <span className={`px-2 py-1 rounded-md text-[10px] font-bold ${
                                    daysLeft > 30
                                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                      : daysLeft > 7
                                      ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                                      : 'bg-red-500/10 text-red-400 border border-red-500/20'
                                  }`}>
                                    {daysLeft > 0 ? `${daysLeft}j restants` : 'Expirée'}
                                  </span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Recent Admins */}
                <div className="mt-6 bg-[#0a0f1e]/60 backdrop-blur-xl rounded-2xl border border-white/[0.06] overflow-hidden">
                  <div className="flex items-center justify-between p-5 border-b border-white/[0.06]">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center text-white text-sm">👥</div>
                      <h2 className="text-lg font-bold text-white">Administrateurs</h2>
                    </div>
                    <button
                      onClick={() => setActiveSection('users')}
                      className="text-xs text-[#64748b] hover:text-white font-medium px-3 py-1.5 rounded-lg hover:bg-white/[0.05] transition-all"
                    >
                      Voir tout →
                    </button>
                  </div>
                  <div className="p-4">
                    {loading ? (
                      <div className="text-center py-6 text-[#64748b]">Chargement...</div>
                    ) : users.length === 0 ? (
                      <div className="text-center py-6 text-[#64748b]">Aucun administrateur</div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {users.slice(0, 6).map((user) => (
                          <div
                            key={user.id}
                            className="flex items-center gap-3 p-3 rounded-xl hover:bg-white/[0.03] transition-all"
                          >
                            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center text-white font-bold text-xs flex-shrink-0">
                              {user.full_name.charAt(0)}
                            </div>
                            <div className="min-w-0">
                              <div className="text-white font-semibold text-sm truncate">{user.full_name}</div>
                              <div className="text-[#64748b] text-xs truncate">{getOrgName(user.organization_id || '')}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </ScrollReveal>
            )}

            {activeSection === 'rag_documents' && (
              <ScrollReveal direction="up" delay={0}>
                <div className="bg-[#0a0f1e]/60 backdrop-blur-xl rounded-2xl border border-white/[0.06] p-6">
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#2563EB] to-[#7C3AED] flex items-center justify-center text-white text-lg">📄</div>
                      <div>
                        <h2 className="text-2xl font-bold text-white">Documents RAG</h2>
                        <p className="text-[#64748b] text-sm">Liste exhaustive (GLOBAL + LOCAL)</p>
                      </div>
                    </div>
                    <button
                      onClick={() => fetchRagDocuments({ resetOffset: true })}
                      className="px-4 py-2.5 bg-white/[0.06] hover:bg-white/[0.1] text-white rounded-xl text-sm font-semibold border border-white/[0.08] transition-all"
                    >
                      Rafraîchir
                    </button>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-4 gap-3 mb-6">
                    <div>
                      <label className="block text-xs font-semibold text-[#64748b] uppercase tracking-wider mb-1.5">Scope</label>
                      <select
                        value={ragDocsScope}
                        onChange={(e) => {
                          setRagDocsScope(e.target.value);
                          setRagDocsOffset(0);
                        }}
                        className="w-full px-3 py-2.5 border border-white/[0.06] rounded-xl text-white text-sm focus:outline-none focus:border-white/[0.15]"
                        style={{ backgroundColor: '#0f172a' }}
                      >
                        <option value="" style={{ backgroundColor: '#0f172a' }}>GLOBAL + LOCAL</option>
                        <option value="GLOBAL" style={{ backgroundColor: '#0f172a' }}>GLOBAL</option>
                        <option value="LOCAL" style={{ backgroundColor: '#0f172a' }}>LOCAL</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-[#64748b] uppercase tracking-wider mb-1.5">Catégorie</label>
                      <select
                        value={ragDocsCategory}
                        onChange={(e) => {
                          setRagDocsCategory(e.target.value);
                          setRagDocsOffset(0);
                        }}
                        className="w-full px-3 py-2.5 border border-white/[0.06] rounded-xl text-white text-sm focus:outline-none focus:border-white/[0.15]"
                        style={{ backgroundColor: '#0f172a' }}
                      >
                        <option value="" style={{ backgroundColor: '#0f172a' }}>Toutes les catégories</option>
                        {ragCategories.map((c: any) => (
                          <option key={c.slug} value={c.slug} style={{ backgroundColor: '#0f172a' }}>{c.name}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-[#64748b] uppercase tracking-wider mb-1.5">Organisation (LOCAL)</label>
                      <select
                        value={ragDocsOrgId}
                        onChange={(e) => {
                          setRagDocsOrgId(e.target.value);
                          setRagDocsOffset(0);
                        }}
                        className="w-full px-3 py-2.5 border border-white/[0.06] rounded-xl text-white text-sm focus:outline-none focus:border-white/[0.15]"
                        style={{ backgroundColor: '#0f172a' }}
                      >
                        <option value="" style={{ backgroundColor: '#0f172a' }}>Toutes les organisations</option>
                        {organizations.map((org) => (
                          <option key={org.id} value={org.id} style={{ backgroundColor: '#0f172a' }}>{org.name}</option>
                        ))}
                      </select>
                    </div>

                    <div className="flex items-end gap-2">
                      <button
                        onClick={() => fetchRagDocuments({ resetOffset: true })}
                        className="w-full px-4 py-2.5 bg-white/[0.06] hover:bg-white/[0.1] text-white rounded-xl text-sm font-semibold border border-white/[0.06] transition-colors"
                      >
                        Appliquer
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between mb-4">
                    <div className="text-sm text-[#64748b]">
                      Total: <span className="text-white font-semibold">{ragDocsTotal}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-[#64748b]">Par page</span>
                      <select
                        value={ragDocsLimit}
                        onChange={(e) => {
                          const v = Number(e.target.value || '50');
                          setRagDocsLimit(Number.isFinite(v) ? v : 50);
                          setRagDocsOffset(0);
                        }}
                        className="px-3 py-1.5 bg-white/[0.04] border border-white/[0.06] rounded-lg text-white text-sm focus:outline-none"
                      >
                        <option value={25}>25</option>
                        <option value={50}>50</option>
                        <option value={100}>100</option>
                      </select>
                    </div>
                  </div>

                  {ragDocsError && (
                    <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
                      {ragDocsError}
                    </div>
                  )}

                  <div className="overflow-x-auto rounded-xl border border-white/[0.06]">
                    <table className="min-w-full">
                      <thead>
                        <tr className="bg-white/[0.02]">
                          <th className="px-4 py-3 text-left text-xs font-semibold text-[#64748b] uppercase tracking-wider">Scope</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-[#64748b] uppercase tracking-wider">Fichier</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-[#64748b] uppercase tracking-wider">Catégorie</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-[#64748b] uppercase tracking-wider">Organisation</th>
                          <th className="px-4 py-3 text-right text-xs font-semibold text-[#64748b] uppercase tracking-wider">Chunks</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-[#64748b] uppercase tracking-wider">Updated</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/[0.04]">
                        {ragDocsLoading ? (
                          <tr>
                            <td className="px-4 py-6 text-center text-[#64748b]" colSpan={6}>Chargement...</td>
                          </tr>
                        ) : ragDocs.length === 0 ? (
                          <tr>
                            <td className="px-4 py-6 text-center text-[#64748b]" colSpan={6}>Aucun document</td>
                          </tr>
                        ) : (
                          ragDocs.map((d, idx) => (
                            <tr key={`${d.scope}-${d.filename}-${d.organization_id || ''}-${idx}`} className="hover:bg-white/[0.02] transition-colors">
                              <td className="px-4 py-3 text-sm">
                                <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${d.scope === 'GLOBAL' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' : 'bg-purple-500/10 text-purple-400 border border-purple-500/20'}`}>{d.scope}</span>
                              </td>
                              <td className="px-4 py-3 text-sm text-white">{d.filename}</td>
                              <td className="px-4 py-3 text-sm text-[#94a3b8]">{d.category || '-'}</td>
                              <td className="px-4 py-3 text-sm text-[#94a3b8]">{d.organization_id || '-'}</td>
                              <td className="px-4 py-3 text-sm text-white text-right font-medium">{d.chunk_count}</td>
                              <td className="px-4 py-3 text-sm text-[#64748b]">{d.updated_at ? new Date(d.updated_at).toLocaleString() : '-'}</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>

                  <div className="flex items-center justify-between mt-5">
                    <div className="text-xs text-[#64748b]">
                      {ragDocsTotal === 0
                        ? '0 résultat'
                        : `${ragDocsOffset + 1} - ${Math.min(ragDocsOffset + ragDocsLimit, ragDocsTotal)} sur ${ragDocsTotal}`}
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        disabled={ragDocsOffset <= 0 || ragDocsLoading}
                        onClick={() => setRagDocsOffset(Math.max(0, ragDocsOffset - ragDocsLimit))}
                        className="px-3.5 py-1.5 rounded-lg bg-white/[0.04] text-[#94a3b8] text-sm font-medium border border-white/[0.06] disabled:opacity-40 disabled:cursor-not-allowed hover:bg-white/[0.08] transition-colors"
                      >
                        Précédent
                      </button>
                      <button
                        disabled={ragDocsOffset + ragDocsLimit >= ragDocsTotal || ragDocsLoading}
                        onClick={() => setRagDocsOffset(ragDocsOffset + ragDocsLimit)}
                        className="px-3.5 py-1.5 rounded-lg bg-white/[0.04] text-[#94a3b8] text-sm font-medium border border-white/[0.06] disabled:opacity-40 disabled:cursor-not-allowed hover:bg-white/[0.08] transition-colors"
                      >
                        Suivant
                      </button>
                    </div>
                  </div>
                </div>
              </ScrollReveal>
            )}

            {activeSection === 'rag_new_test' && (
              <ScrollReveal direction="up" delay={0}>
                <div className="bg-[#0a0f1e]/60 backdrop-blur-xl rounded-2xl border border-white/[0.06] overflow-hidden">
                  <div className="flex items-center justify-between p-6 border-b border-white/[0.06]">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center text-white text-lg">🧪</div>
                      <div>
                        <h2 className="text-2xl font-bold text-white">RAG Test</h2>
                        <p className="text-[#64748b] text-sm">Upload & Query</p>
                      </div>
                    </div>
                    <div className="text-xs text-[#64748b]">API: <span className="text-[#94a3b8] font-medium">{API_BASE_URL}</span></div>
                  </div>

                  <div className="p-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="bg-white/[0.02] rounded-xl border border-white/[0.06] p-5">
                      <h3 className="text-white font-bold text-base mb-4 flex items-center gap-2">
                        <span className="w-6 h-6 rounded-md bg-blue-500/10 flex items-center justify-center text-xs">📤</span>
                        Upload
                      </h3>

                      <div className="space-y-4">
                        <div>
                          <label className="block text-xs font-semibold text-[#64748b] uppercase tracking-wider mb-1.5">Catégorie</label>
                          <select
                            value={ragCategory}
                            onChange={(e) => setRagCategory(e.target.value)}
                            className="w-full px-3 py-2.5 rounded-xl border border-white/[0.06] text-white text-sm outline-none focus:border-white/[0.15]"
                            style={{ backgroundColor: '#0f172a' }}
                          >
                            <option value="">Sélectionner…</option>
                            {ragCategories.map((c: any) => (
                              <option key={c.slug} value={c.slug}>
                                {c.name} ({c.slug})
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-[#64748b] uppercase tracking-wider mb-1.5">Fichier</label>
                          <input
                            type="file"
                            accept=".pdf,.txt,.md,.csv,.docx"
                            onChange={handleRagFileSelect}
                            className="block w-full text-[#94a3b8] text-sm"
                          />
                          <div className="mt-1.5 text-[10px] text-[#64748b]">
                            PDF, DOCX, TXT, MD, CSV
                          </div>
                          {ragFile && (
                            <div className="mt-2 text-sm text-white">Sélectionné: <span className="font-semibold">{ragFile.name}</span></div>
                          )}
                        </div>

                        <button
                          onClick={handleRagUpload}
                          disabled={ragBusy}
                          className="w-full px-5 py-2.5 rounded-xl font-semibold text-white text-sm transition-all disabled:opacity-50 bg-gradient-to-r from-[#2563EB] to-[#7C3AED] hover:shadow-lg hover:shadow-[#2563EB]/20"
                        >
                          {ragBusy ? 'En cours…' : 'Uploader'}
                        </button>

                        {ragUploadSuccess && (
                          <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm">
                            {ragUploadSuccess}
                          </div>
                        )}

                        {ragError && (
                          <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                            {ragError}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="bg-white/[0.02] rounded-xl border border-white/[0.06] p-5">
                      <h3 className="text-white font-bold text-base mb-4 flex items-center gap-2">
                        <span className="w-6 h-6 rounded-md bg-purple-500/10 flex items-center justify-center text-xs">💬</span>
                        Question / Réponse
                      </h3>

                      <div className="space-y-4">
                        <div>
                          <label className="block text-xs font-semibold text-[#64748b] uppercase tracking-wider mb-1.5">Question</label>
                          <textarea
                            value={ragQuestion}
                            onChange={(e) => setRagQuestion(e.target.value)}
                            rows={4}
                            placeholder="Pose une question…"
                            className="w-full px-3 py-2.5 rounded-xl border border-white/[0.06] text-white text-sm outline-none focus:border-white/[0.15] resize-none"
                            style={{ backgroundColor: '#0f172a' }}
                          />
                        </div>

                        <button
                          onClick={handleRagQuery}
                          disabled={ragBusy}
                          className="w-full px-5 py-2.5 rounded-xl font-semibold text-white text-sm transition-all disabled:opacity-50 bg-white/[0.06] hover:bg-white/[0.1] border border-white/[0.06]"
                        >
                          {ragBusy ? 'En cours…' : 'Envoyer'}
                        </button>

                        {ragError && (
                          <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                            {ragError}
                          </div>
                        )}

                        {ragStrategy && (
                          <div className="text-xs text-[#64748b]">Stratégie: <span className="text-[#94a3b8] font-medium">{ragStrategy}</span></div>
                        )}

                        {ragAnswer !== null && (
                          <div className="p-4 rounded-xl bg-[#0f172a] border border-white/[0.06]">
                            <div className="text-[#64748b] text-xs uppercase tracking-wider mb-2">Réponse</div>
                            <div className="text-white text-sm whitespace-pre-wrap leading-relaxed">{ragAnswer}</div>
                          </div>
                        )}

                        {ragDebug && (
                          <details className="p-3 rounded-xl bg-[#0f172a] border border-white/[0.06]">
                            <summary className="text-[#64748b] text-xs cursor-pointer uppercase tracking-wider">Debug</summary>
                            <pre className="text-[10px] text-[#94a3b8] whitespace-pre-wrap mt-3">{JSON.stringify(ragDebug, null, 2)}</pre>
                          </details>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </ScrollReveal>
            )}

            {activeSection === 'organizations' && (
              <ScrollReveal direction="up" delay={0}>
                <div className="bg-[#0a0f1e]/60 backdrop-blur-xl rounded-2xl border border-white/[0.06] overflow-hidden">
                  <div className="flex items-center justify-between p-6 border-b border-white/[0.06]">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-white text-lg">🏢</div>
                      <div>
                        <h2 className="text-2xl font-bold text-white">Organisations</h2>
                        <p className="text-[#64748b] text-sm">{organizations.length} organisation{organizations.length > 1 ? 's' : ''} enregistrée{organizations.length > 1 ? 's' : ''}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleOpenOrgModal()}
                      className="px-5 py-2.5 bg-gradient-to-r from-[#2563EB] to-[#7C3AED] text-white rounded-xl text-sm font-semibold hover:shadow-lg hover:shadow-[#2563EB]/20 transition-all hover:scale-[1.02]"
                    >
                      + Créer
                    </button>
                  </div>
                  <div className="p-6">
                    {loading ? (
                      <div className="text-center py-12 text-[#64748b]">Chargement...</div>
                    ) : organizations.length === 0 ? (
                      <div className="text-center py-12">
                        <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-blue-500/10 flex items-center justify-center text-3xl">🏢</div>
                        <p className="text-[#64748b] text-lg mb-6">Aucune organisation pour le moment</p>
                        <button
                          onClick={() => handleOpenOrgModal()}
                          className="px-6 py-3 bg-gradient-to-r from-[#2563EB] to-[#7C3AED] text-white rounded-xl font-semibold hover:scale-105 transition-transform"
                        >
                          Créer la première organisation
                        </button>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {organizations.map((org) => (
                          <div
                            key={org.id}
                            className="group relative bg-white/[0.02] rounded-xl border border-white/[0.06] hover:border-white/[0.12] p-5 transition-all duration-300 hover:bg-white/[0.04]"
                          >
                            <div className="flex items-start justify-between mb-4">
                              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-blue-500/20 to-cyan-500/20 flex items-center justify-center text-white font-bold text-lg border border-blue-500/20">
                                {org.name.charAt(0)}
                              </div>
                              <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold ${
                                org.status === 'active' 
                                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                                  : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                              }`}>
                                {org.status === 'active' ? 'Actif' : org.status}
                              </span>
                            </div>
                            <h3 className="text-lg font-bold text-white mb-1.5">{org.name}</h3>
                            <div className="space-y-1 text-sm text-[#64748b] mb-4">
                              <p>Code: <span className="text-[#94a3b8] font-medium">{org.code}</span></p>
                              <p>Pays: <span className="text-[#94a3b8] font-medium">{org.country}</span></p>
                            </div>
                            <div className="flex flex-col gap-2">
                              <button
                                onClick={() => handleOpenWebSearchModal(org)}
                                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg font-bold text-sm text-white transition-all hover:scale-[1.02]"
                                style={{ background: 'linear-gradient(135deg, #059669 0%, #0d9488 100%)', boxShadow: '0 4px 14px rgba(5,150,105,0.35)' }}
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                                </svg>
                                Sites de recherche web
                              </button>
                              <button
                                onClick={() => handleOpenOrgModal(org)}
                                className="w-full px-4 py-2 bg-white/[0.04] hover:bg-white/[0.08] text-[#94a3b8] hover:text-white font-semibold text-sm rounded-lg border border-white/[0.06] transition-all duration-300"
                              >
                                Modifier
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </ScrollReveal>
            )}

            {/* Licenses Section */}
            {activeSection === 'licenses' && (
              <ScrollReveal direction="up" delay={0}>
                <div className="bg-[#0a0f1e]/60 backdrop-blur-xl rounded-2xl border border-white/[0.06] overflow-hidden">
                  <div className="flex items-center justify-between p-6 border-b border-white/[0.06]">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white text-lg">🔑</div>
                      <div>
                        <h2 className="text-2xl font-bold text-white">Licences</h2>
                        <p className="text-[#64748b] text-sm">{licenses.filter(l => l.status === 'active').length} active{licenses.filter(l => l.status === 'active').length > 1 ? 's' : ''} / {licenses.length} totale{licenses.length > 1 ? 's' : ''}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleOpenLicenseModal()}
                      className="px-5 py-2.5 bg-gradient-to-r from-[#7C3AED] to-[#F59E0B] text-white rounded-xl text-sm font-semibold hover:shadow-lg hover:shadow-[#7C3AED]/20 transition-all hover:scale-[1.02]"
                    >
                      + Créer
                    </button>
                  </div>
                  <div className="p-6">
                    {loading ? (
                      <div className="text-center py-12 text-[#64748b]">Chargement...</div>
                    ) : licenses.length === 0 ? (
                      <div className="text-center py-12">
                        <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-purple-500/10 flex items-center justify-center text-3xl">🔑</div>
                        <p className="text-[#64748b] text-lg mb-6">Aucune licence pour le moment</p>
                        <button
                          onClick={() => handleOpenLicenseModal()}
                          className="px-6 py-3 bg-gradient-to-r from-[#7C3AED] to-[#F59E0B] text-white rounded-xl font-semibold hover:scale-105 transition-transform"
                        >
                          Créer la première licence
                        </button>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {licenses.map((license) => {
                          const daysLeft = Math.ceil((new Date(license.end_date).getTime() - Date.now()) / (1000 * 86400));
                          const progress = Math.max(0, Math.min(100, ((Date.now() - new Date(license.start_date).getTime()) / (new Date(license.end_date).getTime() - new Date(license.start_date).getTime())) * 100));
                          return (
                            <div
                              key={license.id}
                              className="group bg-white/[0.02] rounded-xl border border-white/[0.06] hover:border-white/[0.12] p-5 transition-all duration-300 hover:bg-white/[0.04]"
                            >
                              <div className="flex items-start justify-between mb-3">
                                <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 flex items-center justify-center text-white font-bold border border-purple-500/20">
                                  {license.plan.charAt(0)}
                                </div>
                                <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold ${
                                  license.status === 'active' 
                                    ? daysLeft > 30 ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : daysLeft > 7 ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'
                                    : 'bg-[#64748b]/10 text-[#64748b] border border-[#64748b]/20'
                                }`}>
                                  {license.status === 'active' ? (daysLeft > 0 ? `${daysLeft}j restants` : 'Expirée') : license.status}
                                </span>
                              </div>
                              <h3 className="text-lg font-bold text-white mb-1">Plan {license.plan}</h3>
                              <div className="space-y-1 text-sm text-[#64748b] mb-3">
                                <p>{getOrgName(license.organization_id)} • <span className="text-[#94a3b8]">{license.max_users} utilisateurs</span></p>
                                <p>{new Date(license.start_date).toLocaleDateString('fr-FR')} → {new Date(license.end_date).toLocaleDateString('fr-FR')}</p>
                              </div>
                              {license.status === 'active' && (
                                <div className="mb-3">
                                  <div className="h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
                                    <div className={`h-full rounded-full transition-all duration-500 ${progress > 80 ? 'bg-gradient-to-r from-red-500 to-amber-500' : 'bg-gradient-to-r from-purple-500 to-pink-500'}`} style={{ width: `${progress}%` }}></div>
                                  </div>
                                </div>
                              )}
                              <button
                                onClick={() => handleOpenLicenseModal(license)}
                                className="w-full px-4 py-2 bg-white/[0.04] hover:bg-white/[0.08] text-[#94a3b8] hover:text-white font-semibold text-sm rounded-lg border border-white/[0.06] transition-all duration-300"
                              >
                                Modifier
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </ScrollReveal>
            )}

            {/* Users Section */}
            {activeSection === 'users' && (
              <ScrollReveal direction="up" delay={0}>
                <div className="bg-[#0a0f1e]/60 backdrop-blur-xl rounded-2xl border border-white/[0.06] overflow-hidden">
                  <div className="flex items-center justify-between p-6 border-b border-white/[0.06]">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center text-white text-lg">👥</div>
                      <div>
                        <h2 className="text-2xl font-bold text-white">Administrateurs</h2>
                        <p className="text-[#64748b] text-sm">{users.length} administrateur{users.length > 1 ? 's' : ''} d'organisations</p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleOpenUserModal()}
                      className="px-5 py-2.5 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-xl text-sm font-semibold hover:shadow-lg hover:shadow-orange-500/20 transition-all hover:scale-[1.02]"
                    >
                      + Créer
                    </button>
                  </div>
                  <div className="p-6">
                    {loading ? (
                      <div className="text-center py-12 text-[#64748b]">Chargement...</div>
                    ) : users.length === 0 ? (
                      <div className="text-center py-12">
                        <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-orange-500/10 flex items-center justify-center text-3xl">👥</div>
                        <p className="text-[#64748b] text-lg mb-6">Aucun administrateur pour le moment</p>
                        <button
                          onClick={() => handleOpenUserModal()}
                          className="px-6 py-3 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-xl font-semibold hover:scale-105 transition-transform"
                        >
                          Créer le premier administrateur
                        </button>
                      </div>
                    ) : (
                      <div className="overflow-x-auto rounded-xl border border-white/[0.06]">
                        <table className="w-full">
                          <thead>
                            <tr className="bg-white/[0.02]">
                              <th className="text-left py-3 px-4 text-xs font-semibold text-[#64748b] uppercase tracking-wider">Utilisateur</th>
                              <th className="text-left py-3 px-4 text-xs font-semibold text-[#64748b] uppercase tracking-wider">Email</th>
                              <th className="text-left py-3 px-4 text-xs font-semibold text-[#64748b] uppercase tracking-wider">Organisation</th>
                              <th className="text-left py-3 px-4 text-xs font-semibold text-[#64748b] uppercase tracking-wider">Rôle</th>
                              <th className="text-right py-3 px-4 text-xs font-semibold text-[#64748b] uppercase tracking-wider">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-white/[0.04]">
                            {users.map((user) => (
                              <tr key={user.id} className="hover:bg-white/[0.02] transition-colors">
                                <td className="py-3.5 px-4">
                                  <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-orange-500/20 to-red-500/20 flex items-center justify-center text-white font-bold text-xs border border-orange-500/20">
                                      {user.full_name.charAt(0)}
                                    </div>
                                    <span className="text-white font-semibold text-sm">{user.full_name}</span>
                                  </div>
                                </td>
                                <td className="py-3.5 px-4 text-[#94a3b8] text-sm">{user.email}</td>
                                <td className="py-3.5 px-4 text-[#94a3b8] text-sm">{getOrgName(user.organization_id || '')}</td>
                                <td className="py-3.5 px-4">
                                  <span className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20">
                                    {user.role}
                                  </span>
                                </td>
                                <td className="py-3.5 px-4 text-right">
                                  <button
                                    onClick={() => {
                                      setEditingItem(user);
                                      setShowUserModal(true);
                                    }}
                                    className="px-3.5 py-1.5 bg-white/[0.04] hover:bg-white/[0.08] text-[#94a3b8] hover:text-white font-semibold text-xs rounded-lg border border-white/[0.06] transition-all"
                                  >
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

            {/* Knowledge Section */}
            {activeSection === 'knowledge' && (
              <GlobalKnowledgeSection />
            )}
          </div>
        </div>
      </main>

      {/* Organization Modal */}
      {showOrgModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md" onClick={() => setShowOrgModal(false)}>
          <div className="bg-[#0c1120] rounded-2xl border border-white/[0.08] shadow-2xl shadow-black/40 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <div className="p-6">
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-white text-sm">🏢</div>
                  <h3 className="text-xl font-bold text-white">
                    {editingItem ? 'Modifier l\'organisation' : 'Nouvelle organisation'}
                  </h3>
                </div>
                <button
                  onClick={() => setShowOrgModal(false)}
                  className="p-1.5 rounded-lg text-[#64748b] hover:text-white hover:bg-white/[0.05] transition-all"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {error && (
                <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-xl">
                  <p className="text-red-400 text-sm">{error}</p>
                </div>
              )}

              <form onSubmit={handleSubmitOrg} className="space-y-4">
                <div>
                  <label htmlFor="orgName" className="block text-xs font-semibold text-[#64748b] uppercase tracking-wider mb-1.5">
                    Nom *
                  </label>
                  <input
                    type="text"
                    id="orgName"
                    required
                    value={orgForm.name}
                    onChange={(e) => setOrgForm({ ...orgForm, name: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-white/[0.03] border border-white/[0.08] rounded-xl text-white text-sm placeholder-[#64748b] focus:outline-none focus:border-white/[0.2] transition-all"
                    placeholder="Ex: BSIC Niger"
                  />
                </div>

                <div>
                  <label htmlFor="orgCode" className="block text-xs font-semibold text-[#64748b] uppercase tracking-wider mb-1.5">
                    Code *
                  </label>
                  <input
                    type="text"
                    id="orgCode"
                    required
                    value={orgForm.code}
                    onChange={(e) => setOrgForm({ ...orgForm, code: e.target.value.toUpperCase() })}
                    className="w-full px-3.5 py-2.5 bg-white/[0.03] border border-white/[0.08] rounded-xl text-white text-sm placeholder-[#64748b] focus:outline-none focus:border-white/[0.2] transition-all"
                    placeholder="Ex: BSIC_NER"
                  />
                </div>

                <div>
                  <label htmlFor="orgCountry" className="block text-xs font-semibold text-[#64748b] uppercase tracking-wider mb-1.5">
                    Pays
                  </label>
                  <input
                    type="text"
                    id="orgCountry"
                    value={orgForm.country}
                    onChange={(e) => setOrgForm({ ...orgForm, country: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-white/[0.03] border border-white/[0.08] rounded-xl text-white text-sm placeholder-[#64748b] focus:outline-none focus:border-white/[0.2] transition-all"
                    placeholder="Ex: Niger"
                  />
                </div>

                {editingItem && (
                  <div>
                    <label htmlFor="orgStatus" className="block text-xs font-semibold text-[#64748b] uppercase tracking-wider mb-1.5">
                      Statut
                    </label>
                    <select
                      id="orgStatus"
                      value={orgForm.status}
                      onChange={(e) => setOrgForm({ ...orgForm, status: e.target.value })}
                      className="w-full px-3.5 py-2.5 border border-white/[0.08] rounded-xl text-white text-sm focus:outline-none focus:border-white/[0.2] transition-all"
                      style={{ backgroundColor: '#0c1120' }}
                    >
                      <option value="active" style={{ backgroundColor: '#0c1120' }}>Active</option>
                      <option value="inactive" style={{ backgroundColor: '#0c1120' }}>Inactive</option>
                      <option value="suspended" style={{ backgroundColor: '#0c1120' }}>Suspendue</option>
                    </select>
                  </div>
                )}

                <div className="flex gap-3 pt-3">
                  <button
                    type="button"
                    onClick={() => setShowOrgModal(false)}
                    className="flex-1 px-4 py-2.5 bg-white/[0.04] hover:bg-white/[0.08] text-[#94a3b8] font-semibold text-sm rounded-xl border border-white/[0.06] transition-all"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex-1 px-4 py-2.5 bg-gradient-to-r from-[#2563EB] to-[#7C3AED] text-white font-semibold text-sm rounded-xl hover:shadow-lg hover:shadow-[#2563EB]/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {submitting ? 'En cours...' : editingItem ? 'Modifier' : 'Créer'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* License Modal */}
      {showLicenseModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md" onClick={() => setShowLicenseModal(false)}>
          <div className="bg-[#0c1120] rounded-2xl border border-white/[0.08] shadow-2xl shadow-black/40 w-full max-w-md max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="p-6">
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white text-sm">🔑</div>
                  <div>
                    <h3 className="text-xl font-bold text-white">
                      {editingItem ? 'Modifier la licence' : 'Nouvelle licence'}
                    </h3>
                    <p className="text-xs text-[#64748b]">Accès et période de validité</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowLicenseModal(false)}
                  className="p-1.5 rounded-lg text-[#64748b] hover:text-white hover:bg-white/[0.05] transition-all"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {error && (
                <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-xl">
                  <p className="text-red-400 text-sm">{error}</p>
                </div>
              )}

              <form onSubmit={handleSubmitLicense} className="space-y-4">
                <div>
                  <label htmlFor="licenseOrg" className="block text-xs font-semibold text-[#64748b] uppercase tracking-wider mb-1.5">
                    Organisation *
                  </label>
                  <select
                    id="licenseOrg"
                    required
                    value={licenseForm.organization_id}
                    onChange={(e) => setLicenseForm({ ...licenseForm, organization_id: e.target.value })}
                    className="w-full px-3.5 py-2.5 border border-white/[0.08] rounded-xl text-white text-sm focus:outline-none focus:border-white/[0.2] transition-all"
                    style={{ backgroundColor: '#0c1120' }}
                  >
                    <option value="" style={{ backgroundColor: '#0c1120', color: '#64748b' }}>
                      Sélectionner une organisation
                    </option>
                    {organizations.map((org) => (
                      <option 
                        key={org.id} 
                        value={org.id}
                        style={{ backgroundColor: '#0c1120' }}
                      >
                        {org.name} ({org.code})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="licensePlan" className="block text-xs font-semibold text-[#64748b] uppercase tracking-wider mb-1.5">
                    Plan *
                  </label>
                  <select
                    id="licensePlan"
                    required
                    value={licenseForm.plan}
                    onChange={(e) => setLicenseForm({ ...licenseForm, plan: e.target.value })}
                    className="w-full px-3.5 py-2.5 border border-white/[0.08] rounded-xl text-white text-sm focus:outline-none focus:border-white/[0.2] transition-all"
                    style={{ backgroundColor: '#0c1120' }}
                  >
                    <option value="Standard" style={{ backgroundColor: '#0c1120' }}>Standard</option>
                    <option value="Pro" style={{ backgroundColor: '#0c1120' }}>Pro</option>
                    <option value="Enterprise" style={{ backgroundColor: '#0c1120' }}>Enterprise</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="maxUsers" className="block text-xs font-semibold text-[#64748b] uppercase tracking-wider mb-1.5">
                    Max utilisateurs *
                  </label>
                  <input
                    type="number"
                    id="maxUsers"
                    required
                    min="1"
                    value={licenseForm.max_users}
                    onChange={(e) => setLicenseForm({ ...licenseForm, max_users: parseInt(e.target.value) || 1 })}
                    className="w-full px-3.5 py-2.5 bg-white/[0.03] border border-white/[0.08] rounded-xl text-white text-sm placeholder-[#64748b] focus:outline-none focus:border-white/[0.2] transition-all"
                    placeholder="Ex: 50"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="startDate" className="block text-xs font-semibold text-[#64748b] uppercase tracking-wider mb-1.5">
                      Début *
                    </label>
                    <input
                      type="date"
                      id="startDate"
                      required
                      value={licenseForm.start_date}
                      onChange={(e) => setLicenseForm({ ...licenseForm, start_date: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-white/[0.03] border border-white/[0.08] rounded-xl text-white text-sm focus:outline-none focus:border-white/[0.2] transition-all"
                    />
                  </div>

                  <div>
                    <label htmlFor="endDate" className="block text-xs font-semibold text-[#64748b] uppercase tracking-wider mb-1.5">
                      Fin *
                    </label>
                    <input
                      type="date"
                      id="endDate"
                      required
                      value={licenseForm.end_date}
                      onChange={(e) => setLicenseForm({ ...licenseForm, end_date: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-white/[0.03] border border-white/[0.08] rounded-xl text-white text-sm focus:outline-none focus:border-white/[0.2] transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="licenseStatus" className="block text-xs font-semibold text-[#64748b] uppercase tracking-wider mb-1.5">
                    Statut
                  </label>
                  <select
                    id="licenseStatus"
                    value={licenseForm.status}
                    onChange={(e) => setLicenseForm({ ...licenseForm, status: e.target.value })}
                    className="w-full px-3.5 py-2.5 border border-white/[0.08] rounded-xl text-white text-sm focus:outline-none focus:border-white/[0.2] transition-all"
                    style={{ backgroundColor: '#0c1120' }}
                  >
                    <option value="active" style={{ backgroundColor: '#0c1120' }}>Active</option>
                    <option value="expired" style={{ backgroundColor: '#0c1120' }}>Expirée</option>
                    <option value="suspended" style={{ backgroundColor: '#0c1120' }}>Suspendue</option>
                  </select>
                </div>

                <div className="flex gap-3 pt-3">
                  <button
                    type="button"
                    onClick={() => setShowLicenseModal(false)}
                    className="flex-1 px-4 py-2.5 bg-white/[0.04] hover:bg-white/[0.08] text-[#94a3b8] font-semibold text-sm rounded-xl border border-white/[0.06] transition-all"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex-1 px-4 py-2.5 bg-gradient-to-r from-[#7C3AED] to-[#F59E0B] text-white font-semibold text-sm rounded-xl hover:shadow-lg hover:shadow-[#7C3AED]/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {submitting ? 'En cours...' : editingItem ? 'Modifier' : 'Créer'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* User Modal */}
      {showUserModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md" onClick={() => setShowUserModal(false)}>
          <div className="bg-[#0c1120] rounded-2xl border border-white/[0.08] shadow-2xl shadow-black/40 w-full max-w-md max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="p-6">
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center text-white text-sm">👥</div>
                  <h3 className="text-xl font-bold text-white">
                    {editingItem ? 'Modifier l\'administrateur' : 'Nouvel administrateur'}
                  </h3>
                </div>
                <button
                  onClick={() => setShowUserModal(false)}
                  className="p-1.5 rounded-lg text-[#64748b] hover:text-white hover:bg-white/[0.05] transition-all"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {error && (
                <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-xl">
                  <p className="text-red-400 text-sm">{error}</p>
                </div>
              )}

              <form onSubmit={handleSubmitUser} className="space-y-4">
                <div>
                  <label htmlFor="userEmail" className="block text-xs font-semibold text-[#64748b] uppercase tracking-wider mb-1.5">
                    Email *
                  </label>
                  <input
                    type="email"
                    id="userEmail"
                    required
                    value={userForm.email}
                    onChange={(e) => setUserForm({ ...userForm, email: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-white/[0.03] border border-white/[0.08] rounded-xl text-white text-sm placeholder-[#64748b] focus:outline-none focus:border-white/[0.2] transition-all"
                    placeholder="admin@banque.com"
                  />
                </div>

                <div>
                  <label htmlFor="userName" className="block text-xs font-semibold text-[#64748b] uppercase tracking-wider mb-1.5">
                    Nom complet *
                  </label>
                  <input
                    type="text"
                    id="userName"
                    required
                    value={userForm.full_name}
                    onChange={(e) => setUserForm({ ...userForm, full_name: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-white/[0.03] border border-white/[0.08] rounded-xl text-white text-sm placeholder-[#64748b] focus:outline-none focus:border-white/[0.2] transition-all"
                    placeholder="Ex: Jean Dupont"
                  />
                </div>

                <div>
                  <label htmlFor="userPassword" className="block text-xs font-semibold text-[#64748b] uppercase tracking-wider mb-1.5">
                    Mot de passe {editingItem && <span className="text-[10px] text-[#64748b] font-normal normal-case">(vide = inchangé)</span>} {!editingItem && '*'}
                  </label>
                  <input
                    type="password"
                    id="userPassword"
                    required={!editingItem}
                    minLength={6}
                    value={userForm.password}
                    onChange={(e) => setUserForm({ ...userForm, password: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-white/[0.03] border border-white/[0.08] rounded-xl text-white text-sm placeholder-[#64748b] focus:outline-none focus:border-white/[0.2] transition-all"
                    placeholder="Minimum 6 caractères"
                  />
                </div>

                <div>
                  <label htmlFor="userOrg" className="block text-xs font-semibold text-[#64748b] uppercase tracking-wider mb-1.5">
                    Organisation *
                  </label>
                  <select
                    id="userOrg"
                    required
                    value={userForm.organization_id}
                    onChange={(e) => setUserForm({ ...userForm, organization_id: e.target.value })}
                    className="w-full px-3.5 py-2.5 border border-white/[0.08] rounded-xl text-white text-sm focus:outline-none focus:border-white/[0.2] transition-all"
                    style={{ backgroundColor: '#0c1120' }}
                  >
                    <option value="" style={{ backgroundColor: '#0c1120', color: '#64748b' }}>
                      Sélectionner une organisation
                    </option>
                    {organizations.map((org) => (
                      <option 
                        key={org.id} 
                        value={org.id}
                        style={{ backgroundColor: '#0c1120' }}
                      >
                        {org.name} ({org.code})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex gap-3 pt-3">
                  <button
                    type="button"
                    onClick={() => setShowUserModal(false)}
                    className="flex-1 px-4 py-2.5 bg-white/[0.04] hover:bg-white/[0.08] text-[#94a3b8] font-semibold text-sm rounded-xl border border-white/[0.06] transition-all"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex-1 px-4 py-2.5 bg-gradient-to-r from-orange-500 to-red-500 text-white font-semibold text-sm rounded-xl hover:shadow-lg hover:shadow-orange-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {submitting ? 'En cours...' : editingItem ? 'Modifier' : 'Créer'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* ── Modale Web Search Config ── */}
      {showWebSearchModal && webSearchOrg && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md"
          onClick={() => setShowWebSearchModal(false)}
        >
          <div
            className="relative w-full max-w-xl flex flex-col"
            style={{ maxHeight: '90vh' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Glow derrière la modale */}
            <div className="absolute -inset-px rounded-3xl pointer-events-none" style={{ background: 'linear-gradient(135deg, rgba(5,150,105,0.25) 0%, rgba(13,148,136,0.1) 100%)', filter: 'blur(1px)' }} />

            <div className="relative flex flex-col rounded-3xl overflow-hidden" style={{ background: 'linear-gradient(160deg, #0d1a2e 0%, #071020 100%)', border: '1px solid rgba(5,150,105,0.3)', boxShadow: '0 32px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.04)' }}>

              {/* ── Header fixe ── */}
              <div className="flex-shrink-0 px-6 pt-6 pb-5" style={{ borderBottom: '1px solid rgba(5,150,105,0.15)', background: 'rgba(5,150,105,0.06)' }}>
                {/* Badge + close */}
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-4">
                    {/* Icône animée */}
                    <div className="relative flex-shrink-0">
                      <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #059669, #0d9488)', boxShadow: '0 8px 24px rgba(5,150,105,0.4)' }}>
                        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                        </svg>
                      </div>
                      {/* Pulse */}
                      <div className="absolute -inset-1 rounded-2xl animate-ping opacity-20" style={{ background: '#059669' }} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-400">Recherche Web</span>
                        <span className="w-1 h-1 rounded-full bg-emerald-400/50" />
                        <span className="text-[10px] font-semibold text-white/40 uppercase tracking-wider">IA</span>
                      </div>
                      <h3 className="text-xl font-black text-white leading-tight">Sites à consulter</h3>
                      <p className="text-xs text-white/40 mt-0.5 font-medium">{webSearchOrg.name} · {webSearchOrg.code}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowWebSearchModal(false)}
                    className="flex-shrink-0 p-2 rounded-xl text-white/40 hover:text-white transition-all"
                    style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* ── Corps scrollable ── */}
              <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5" style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(5,150,105,0.3) transparent' }}>

                {webSearchLoading ? (
                  <div className="flex flex-col items-center justify-center py-16 gap-4">
                    <div className="relative w-10 h-10">
                      <div className="absolute inset-0 border-2 border-emerald-500/20 rounded-full" />
                      <div className="absolute inset-0 border-2 border-transparent border-t-emerald-500 rounded-full animate-spin" />
                    </div>
                    <p className="text-sm text-white/40">Chargement de la configuration…</p>
                  </div>
                ) : (
                  <>
                    {/* Bannière info */}
                    <div className="flex items-start gap-3 p-4 rounded-2xl" style={{ background: 'rgba(5,150,105,0.08)', border: '1px solid rgba(5,150,105,0.2)' }}>
                      <svg className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <p className="text-xs text-white/55 leading-relaxed">
                        Quand le RAG ne trouve pas de sources suffisantes <span className="text-emerald-400 font-bold">(score &lt; 0.75)</span>, l'IA consulte ces sites automatiquement. L'utilisateur ne voit rien, c'est totalement transparent.
                      </p>
                    </div>

                    {webSearchError && (
                      <div className="flex items-center gap-3 p-4 rounded-2xl" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
                        <svg className="w-4 h-4 text-red-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <p className="text-sm text-red-400">{webSearchError}</p>
                      </div>
                    )}
                    {webSearchSuccess && (
                      <div className="flex items-center gap-3 p-4 rounded-2xl" style={{ background: 'rgba(5,150,105,0.08)', border: '1px solid rgba(5,150,105,0.25)' }}>
                        <svg className="w-4 h-4 text-emerald-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        <p className="text-sm text-emerald-400">{webSearchSuccess}</p>
                      </div>
                    )}

                    {/* Toggle activation */}
                    <div
                      onClick={() => setWebSearchEnabled(prev => !prev)}
                      className="flex items-center justify-between p-4 rounded-2xl cursor-pointer transition-all hover:scale-[1.01]"
                      style={{ background: webSearchEnabled ? 'rgba(5,150,105,0.1)' : 'rgba(255,255,255,0.03)', border: `1px solid ${webSearchEnabled ? 'rgba(5,150,105,0.35)' : 'rgba(255,255,255,0.07)'}` }}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: webSearchEnabled ? 'rgba(5,150,105,0.2)' : 'rgba(255,255,255,0.05)' }}>
                          <svg className="w-4 h-4" style={{ color: webSearchEnabled ? '#34d399' : '#64748b' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                          </svg>
                        </div>
                        <div>
                          <p className="text-sm font-bold text-white">Activer la recherche web</p>
                          <p className="text-xs text-white/40 mt-0.5">Fallback automatique si le RAG est insuffisant</p>
                        </div>
                      </div>
                      {/* Toggle pill */}
                      <div className="flex-shrink-0 w-12 h-6 rounded-full flex items-center px-1 transition-all duration-300" style={{ background: webSearchEnabled ? '#059669' : 'rgba(255,255,255,0.1)', border: `1px solid ${webSearchEnabled ? '#059669' : 'rgba(255,255,255,0.15)'}` }}>
                        <div className="w-4 h-4 rounded-full bg-white shadow-md transition-transform duration-300" style={{ transform: webSearchEnabled ? 'translateX(24px)' : 'translateX(0)' }} />
                      </div>
                    </div>

                    {/* Bloc sites */}
                    <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.07)' }}>
                      {/* Titre section */}
                      <div className="px-4 py-3 flex items-center justify-between" style={{ background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                        <div className="flex items-center gap-2">
                          <svg className="w-3.5 h-3.5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                          </svg>
                          <span className="text-xs font-black uppercase tracking-[0.15em] text-white/50">Domaines autorisés</span>
                        </div>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold" style={{ background: 'rgba(5,150,105,0.15)', color: '#34d399', border: '1px solid rgba(5,150,105,0.25)' }}>
                          {webSearchSites.length} site{webSearchSites.length !== 1 ? 's' : ''}
                        </span>
                      </div>

                      {/* Liste */}
                      <div className="p-3 space-y-2" style={{ background: '#060e1c' }}>
                        {webSearchSites.length === 0 ? (
                          <div className="py-8 flex flex-col items-center gap-3">
                            <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.03)', border: '1px dashed rgba(255,255,255,0.1)' }}>
                              <svg className="w-5 h-5 text-white/20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                              </svg>
                            </div>
                            <p className="text-xs text-white/25 text-center">Aucun domaine configuré<br />Ajoutez-en un ci-dessous</p>
                          </div>
                        ) : (
                          webSearchSites.map((site, i) => (
                            <div key={site} className="group flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all" style={{ background: 'rgba(5,150,105,0.06)', border: '1px solid rgba(5,150,105,0.15)' }}>
                              <span className="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black text-emerald-400" style={{ background: 'rgba(5,150,105,0.15)' }}>{i + 1}</span>
                              <span className="flex-1 text-sm text-white font-mono truncate">{site}</span>
                              <button
                                onClick={() => setWebSearchSites(prev => prev.filter(s => s !== site))}
                                className="flex-shrink-0 p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-all hover:bg-red-500/20"
                              >
                                <svg className="w-3.5 h-3.5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              </button>
                            </div>
                          ))
                        )}
                      </div>

                      {/* Champ d'ajout */}
                      <div className="p-3" style={{ borderTop: '1px solid rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.02)' }}>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={webSearchNewSite}
                            onChange={(e) => setWebSearchNewSite(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleWebSearchAddSite()}
                            placeholder="cb-umoa.org, bceao.int, cofeb.bceao.int…"
                            className="flex-1 px-3.5 py-2.5 rounded-xl text-white text-sm placeholder-white/25 focus:outline-none transition-all"
                            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(5,150,105,0.2)' }}
                            onFocus={e => { e.target.style.borderColor = 'rgba(5,150,105,0.5)'; e.target.style.background = 'rgba(5,150,105,0.05)'; }}
                            onBlur={e => { e.target.style.borderColor = 'rgba(5,150,105,0.2)'; e.target.style.background = 'rgba(255,255,255,0.04)'; }}
                          />
                          <button
                            onClick={handleWebSearchAddSite}
                            disabled={!webSearchNewSite.trim()}
                            className="px-4 py-2.5 rounded-xl text-sm font-bold text-white transition-all disabled:opacity-30 disabled:cursor-not-allowed hover:scale-[1.03] flex-shrink-0 flex items-center gap-1.5"
                            style={{ background: 'linear-gradient(135deg, #059669, #0d9488)', boxShadow: '0 4px 14px rgba(5,150,105,0.3)' }}
                          >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                            </svg>
                            Ajouter
                          </button>
                        </div>
                        <p className="text-[10px] text-white/25 mt-2">Sans protocole (http://). Sous-domaines acceptés. Touche Entrée pour valider.</p>
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* ── Footer fixe ── */}
              {!webSearchLoading && (
                <div className="flex-shrink-0 px-6 py-4 flex gap-3" style={{ borderTop: '1px solid rgba(255,255,255,0.06)', background: 'rgba(0,0,0,0.2)' }}>
                  <button
                    onClick={() => setShowWebSearchModal(false)}
                    className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold text-white/50 hover:text-white transition-all"
                    style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}
                  >
                    Annuler
                  </button>
                  <button
                    onClick={handleWebSearchSave}
                    disabled={webSearchSaving}
                    className="flex-1 px-4 py-2.5 rounded-xl text-sm font-bold text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:scale-[1.02] flex items-center justify-center gap-2"
                    style={{ background: webSearchSaving ? 'rgba(5,150,105,0.3)' : 'linear-gradient(135deg, #059669 0%, #0d9488 100%)', boxShadow: webSearchSaving ? 'none' : '0 4px 20px rgba(5,150,105,0.35)' }}
                  >
                    {webSearchSaving ? (
                      <>
                        <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                        </svg>
                        Enregistrement…
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        Enregistrer
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
}

