'use client';

import { useState, useEffect } from 'react';
import { apiClient } from '@/lib/api/client';
import ScrollReveal from '@/components/home/ScrollReveal';

interface Department {
  id: string;
  name: string;
  code: string;
  description?: string;
  organization_id: string;
  status: string;
}

interface Service {
  id: string;
  name: string;
  code: string;
  description?: string;
  department_id: string;
  status: string;
}

interface User {
  id: string;
  email: string;
  full_name: string;
  role: string;
  department_id?: string;
  service_id?: string;
}

export default function DepartmentsServicesManagement() {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // Modals
  const [showDeptModal, setShowDeptModal] = useState(false);
  const [showServiceModal, setShowServiceModal] = useState(false);
  const [showUserAssignModal, setShowUserAssignModal] = useState(false);
  
  // Forms
  const [deptForm, setDeptForm] = useState({ name: '', code: '', description: '' });
  const [serviceForm, setServiceForm] = useState({ name: '', code: '', description: '', department_id: '' });
  const [userAssignForm, setUserAssignForm] = useState({ user_id: '', department_id: '', service_id: '' });
  
  // Editing
  const [editingDept, setEditingDept] = useState<Department | null>(null);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [selectedDeptForService, setSelectedDeptForService] = useState<string | null>(null);
  const [expandedDept, setExpandedDept] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [deptsRes, usersRes] = await Promise.all([
        apiClient.get<Department[]>('/departments'),
        apiClient.get<User[]>('/auth/users/org'),
      ]);
      
      setDepartments(deptsRes || []);
      const usersList = Array.isArray(usersRes) ? usersRes : [];
      setUsers(usersList);
      console.log('[DEBUG] Utilisateurs chargés:', usersList.map(u => ({
        id: u.id,
        name: u.full_name,
        department_id: u.department_id,
        service_id: u.service_id,
      })));
      
      // Récupérer les services pour chaque département
      const allServices: Service[] = [];
      for (const dept of deptsRes || []) {
        try {
          const servicesRes = await apiClient.get<Service[]>(`/departments/services/by-department/${dept.id}`);
          if (Array.isArray(servicesRes)) {
            allServices.push(...servicesRes);
          }
        } catch (err) {
          console.error(`Erreur lors du chargement des services pour ${dept.id}:`, err);
        }
      }
      setServices(allServices);
    } catch (err: any) {
      console.error('Erreur lors du chargement:', err);
      setError('Erreur lors du chargement des données');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateDepartment = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
      await apiClient.post('/departments', {
        ...deptForm,
        organization_id: currentUser.organization_id,
      });
      
      setSuccess('Département créé avec succès');
      setShowDeptModal(false);
      setDeptForm({ name: '', code: '', description: '' });
      setEditingDept(null);
      fetchData();
    } catch (err: any) {
      setError(err.message || 'Erreur lors de la création du département');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateDepartment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingDept) return;

    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      await apiClient.put(`/departments/${editingDept.id}`, deptForm);
      
      setSuccess('Département modifié avec succès');
      setShowDeptModal(false);
      setDeptForm({ name: '', code: '', description: '' });
      setEditingDept(null);
      fetchData();
    } catch (err: any) {
      setError(err.message || 'Erreur lors de la modification du département');
    } finally {
      setSaving(false);
    }
  };

  const handleCreateService = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      await apiClient.post('/departments/services', {
        ...serviceForm,
        department_id: selectedDeptForService || serviceForm.department_id,
      });
      
      setSuccess('Service créé avec succès');
      setShowServiceModal(false);
      setServiceForm({ name: '', code: '', description: '', department_id: '' });
      setSelectedDeptForService(null);
      fetchData();
    } catch (err: any) {
      setError(err.message || 'Erreur lors de la création du service');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateService = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingService) return;

    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      await apiClient.put(`/departments/services/${editingService.id}`, serviceForm);
      
      setSuccess('Service modifié avec succès');
      setShowServiceModal(false);
      setServiceForm({ name: '', code: '', description: '', department_id: '' });
      setEditingService(null);
      fetchData();
    } catch (err: any) {
      setError(err.message || 'Erreur lors de la modification du service');
    } finally {
      setSaving(false);
    }
  };

  const handleAssignUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const user = users.find(u => u.id === userAssignForm.user_id);
      if (!user) {
        setError('Utilisateur introuvable');
        return;
      }

      const updateData: any = {};
      
      // Ne pas envoyer null, mais laisser vide si non défini pour permettre de retirer l'assignation
      if (userAssignForm.department_id) {
        updateData.department_id = userAssignForm.department_id;
      } else {
        updateData.department_id = null;
      }
      
      if (userAssignForm.service_id) {
        updateData.service_id = userAssignForm.service_id;
      } else {
        updateData.service_id = null;
      }

      console.log('[DEBUG] Assignation utilisateur:', {
        user_id: userAssignForm.user_id,
        updateData,
      });

      await apiClient.put(`/auth/users/org/${userAssignForm.user_id}`, updateData);
      
      setSuccess('Utilisateur assigné avec succès');
      setShowUserAssignModal(false);
      setUserAssignForm({ user_id: '', department_id: '', service_id: '' });
      
      // Recharger les données après un court délai pour laisser le temps à la base de se mettre à jour
      setTimeout(() => {
        fetchData();
      }, 500);
    } catch (err: any) {
      setError(err.message || 'Erreur lors de l\'assignation de l\'utilisateur');
    } finally {
      setSaving(false);
    }
  };

  const openEditDepartment = (dept: Department) => {
    setEditingDept(dept);
    setDeptForm({ name: dept.name, code: dept.code, description: dept.description || '' });
    setShowDeptModal(true);
  };

  const openEditService = (service: Service) => {
    setEditingService(service);
    setServiceForm({
      name: service.name,
      code: service.code,
      description: service.description || '',
      department_id: service.department_id,
    });
    setShowServiceModal(true);
  };

  const openCreateService = (deptId: string) => {
    setSelectedDeptForService(deptId);
    setServiceForm({ name: '', code: '', description: '', department_id: deptId });
    setShowServiceModal(true);
  };

  const getServicesForDept = (deptId: string) => {
    return services.filter(s => s.department_id === deptId);
  };

  const getUsersForDept = (deptId: string) => {
    return users.filter(u => u.department_id === deptId && !u.service_id);
  };

  const getUsersForService = (serviceId: string) => {
    // Normaliser les IDs en string pour la comparaison
    const normalizedServiceId = String(serviceId).trim();
    
    const filtered = users.filter(u => {
      if (!u.service_id) return false;
      const normalizedUserServiceId = String(u.service_id).trim();
      return normalizedUserServiceId === normalizedServiceId;
    });
    
    // Log pour débogage seulement si aucun utilisateur trouvé mais qu'il y en a avec service_id
    if (filtered.length === 0 && users.some(u => u.service_id)) {
      console.log(`[DEBUG] getUsersForService(${serviceId}):`, {
        totalUsers: users.length,
        filteredCount: filtered.length,
        normalizedServiceId,
        usersWithServiceId: users.filter(u => u.service_id).map(u => ({
          id: u.id,
          name: u.full_name,
          service_id: u.service_id,
          normalized: String(u.service_id).trim(),
        })),
      });
    }
    
    return filtered;
  };

  if (loading) {
    return (
      <div className="text-center py-12 text-[#CBD5E1]">Chargement...</div>
    );
  }

  return (
    <ScrollReveal direction="up" delay={0}>
      <div className="bg-gradient-to-br from-[#1a1f3a]/80 via-[#2563EB]/10 to-[#1a1f3a]/80 backdrop-blur-lg rounded-[28px] border border-[#2563EB]/30 p-4 sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
          <div className="flex-1 min-w-0">
            <h2 className="text-xl sm:text-3xl font-black text-white mb-2">Départements & Services</h2>
            <p className="text-[#CBD5E1] text-sm sm:text-base">
              Gérez la structure organisationnelle : créez des départements, des services et assignez les utilisateurs.
            </p>
          </div>
          <button
            onClick={() => {
              setEditingDept(null);
              setDeptForm({ name: '', code: '', description: '' });
              setShowDeptModal(true);
            }}
            className="group relative px-5 py-2.5 text-white rounded-xl overflow-hidden transition-all duration-300 hover:scale-105 cursor-pointer z-10 flex-shrink-0 text-sm font-semibold"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-[#2563EB] via-[#7C3AED] to-[#F59E0B] opacity-90 group-hover:opacity-100 pointer-events-none"></div>
            <span className="relative z-10 pointer-events-none">+ Département</span>
          </button>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}

        {success && (
          <div className="mb-6 p-4 bg-green-500/10 border border-green-500/30 rounded-lg">
            <p className="text-green-400 text-sm">{success}</p>
          </div>
        )}

        <div className="space-y-4">
          {departments.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">🏢</div>
              <p className="text-[#CBD5E1] text-lg mb-6">Aucun département pour le moment</p>
              <button
                onClick={() => {
                  setEditingDept(null);
                  setDeptForm({ name: '', code: '', description: '' });
                  setShowDeptModal(true);
                }}
                className="px-6 py-3 bg-gradient-to-r from-[#2563EB] via-[#7C3AED] to-[#F59E0B] text-white rounded-xl font-semibold hover:scale-105 transition-transform cursor-pointer"
              >
                Créer le premier département
              </button>
            </div>
          ) : (
            departments.map((dept) => {
              const deptServices = getServicesForDept(dept.id);
              const deptUsers = getUsersForDept(dept.id);
              const isExpanded = expandedDept === dept.id;

              return (
                <div
                  key={dept.id}
                  className="bg-white/5 rounded-xl border border-white/10 overflow-hidden"
                >
                  <div className="p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className="text-2xl sm:text-3xl flex-shrink-0">🏢</div>
                        <div className="min-w-0">
                          <h3 className="text-base sm:text-lg font-bold text-white truncate">{dept.name}</h3>
                          <p className="text-xs sm:text-sm text-[#CBD5E1]">
                            Code: {dept.code} • {deptServices.length} service(s) • {deptUsers.length} direct(s)
                          </p>
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 flex-shrink-0">
                        <button
                          onClick={() => openCreateService(dept.id)}
                          className="px-3 py-1.5 bg-[#7C3AED]/20 hover:bg-[#7C3AED]/30 text-[#7C3AED] font-semibold rounded-lg border border-[#7C3AED]/30 transition-all cursor-pointer text-xs sm:text-sm"
                        >
                          + Service
                        </button>
                        <button
                          onClick={() => openEditDepartment(dept)}
                          className="px-3 py-1.5 bg-white/5 hover:bg-white/10 text-white font-semibold rounded-lg border border-white/10 transition-all cursor-pointer text-xs sm:text-sm"
                        >
                          Modifier
                        </button>
                        <button
                          onClick={() => setExpandedDept(isExpanded ? null : dept.id)}
                          className="px-3 py-1.5 bg-white/5 hover:bg-white/10 text-white font-semibold rounded-lg border border-white/10 transition-all cursor-pointer text-xs sm:text-sm"
                        >
                          {isExpanded ? 'Masquer' : 'Détails'}
                        </button>
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="mt-6 pt-6 border-t border-white/10 space-y-6">
                        {/* Services du département */}
                        <div>
                          <div className="flex items-center justify-between mb-3">
                            <h4 className="text-md font-bold text-white">Services</h4>
                            <button
                              onClick={() => openCreateService(dept.id)}
                              className="px-3 py-1.5 bg-[#7C3AED]/20 hover:bg-[#7C3AED]/30 text-[#7C3AED] font-semibold rounded-lg border border-[#7C3AED]/30 transition-all cursor-pointer text-sm"
                            >
                              + Ajouter
                            </button>
                          </div>
                          {deptServices.length === 0 ? (
                            <p className="text-sm text-[#CBD5E1] text-center py-4 bg-white/5 rounded-lg">
                              Aucun service dans ce département
                            </p>
                          ) : (
                            <div className="space-y-4">
                              {deptServices.map((service) => {
                                const serviceUsers = getUsersForService(service.id);
                                return (
                                  <div
                                    key={service.id}
                                    className="bg-white/5 rounded-lg border border-white/10 overflow-hidden"
                                  >
                                    <div className="p-3">
                                      <div className="flex items-center justify-between mb-3">
                                        <div className="flex items-center space-x-3">
                                          <span className="text-xl">📋</span>
                                          <div>
                                            <p className="text-white font-semibold">{service.name}</p>
                                            <p className="text-xs text-[#CBD5E1]">
                                              Code: {service.code} • {serviceUsers.length} utilisateur(s)
                                            </p>
                                          </div>
                                        </div>
                                        <button
                                          onClick={() => openEditService(service)}
                                          className="px-3 py-1.5 bg-white/5 hover:bg-white/10 text-white font-semibold rounded-lg border border-white/10 transition-all cursor-pointer text-sm"
                                        >
                                          Modifier
                                        </button>
                                      </div>
                                      
                                      {/* Utilisateurs du service */}
                                      <div className="mt-3 pt-3 border-t border-white/10">
                                        <h5 className="text-xs font-semibold text-white mb-2">
                                          Utilisateurs du service ({serviceUsers.length}):
                                        </h5>
                                        {serviceUsers.length > 0 ? (
                                          <div className="space-y-2">
                                            {serviceUsers.map((user) => (
                                              <div
                                                key={user.id}
                                                className="flex items-center justify-between bg-white/5 p-2 rounded border border-white/5"
                                              >
                                                <div>
                                                  <p className="text-sm text-white font-medium">{user.full_name}</p>
                                                  <p className="text-xs text-[#CBD5E1]">{user.email} • {user.role}</p>
                                                </div>
                                                <button
                                                  onClick={() => {
                                                    setUserAssignForm({ user_id: user.id, department_id: dept.id, service_id: service.id });
                                                    setShowUserAssignModal(true);
                                                  }}
                                                  className="px-2 py-1 bg-white/5 hover:bg-white/10 text-white font-semibold rounded border border-white/10 transition-all cursor-pointer text-xs"
                                                >
                                                  Réassigner
                                                </button>
                                              </div>
                                            ))}
                                          </div>
                                        ) : (
                                          <p className="text-xs text-[#CBD5E1] text-center py-2 bg-white/5 rounded">
                                            Aucun utilisateur dans ce service
                                          </p>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>

                        {/* Utilisateurs directs du département */}
                        <div>
                          <div className="flex items-center justify-between mb-3">
                            <h4 className="text-md font-bold text-white">Utilisateurs Directs</h4>
                            <button
                              onClick={() => {
                                setUserAssignForm({ user_id: '', department_id: dept.id, service_id: '' });
                                setShowUserAssignModal(true);
                              }}
                              className="px-3 py-1.5 bg-[#2563EB]/20 hover:bg-[#2563EB]/30 text-[#2563EB] font-semibold rounded-lg border border-[#2563EB]/30 transition-all cursor-pointer text-sm"
                            >
                              + Assigner
                            </button>
                          </div>
                          {deptUsers.length === 0 ? (
                            <p className="text-sm text-[#CBD5E1] text-center py-4 bg-white/5 rounded-lg">
                              Aucun utilisateur directement rattaché à ce département
                            </p>
                          ) : (
                            <div className="space-y-2">
                              {deptUsers.map((user) => (
                                <div
                                  key={user.id}
                                  className="flex items-center justify-between bg-white/5 p-3 rounded-lg border border-white/10"
                                >
                                  <div>
                                    <p className="text-white font-semibold">{user.full_name}</p>
                                    <p className="text-xs text-[#CBD5E1]">{user.email} • {user.role}</p>
                                  </div>
                                  <button
                                    onClick={() => {
                                      setUserAssignForm({ user_id: user.id, department_id: dept.id, service_id: '' });
                                      setShowUserAssignModal(true);
                                    }}
                                    className="px-3 py-1.5 bg-white/5 hover:bg-white/10 text-white font-semibold rounded-lg border border-white/10 transition-all cursor-pointer text-sm"
                                  >
                                    Réassigner
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Modal Création/Modification Département */}
        {showDeptModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/50 backdrop-blur-sm">
            <div className="bg-gradient-to-br from-[#1a1f3a] via-[#2563EB]/10 to-[#1a1f3a] backdrop-blur-lg rounded-[28px] border border-[#2563EB]/30 shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-2xl font-black text-white">
                    {editingDept ? 'Modifier le département' : 'Créer un département'}
                  </h3>
                  <button
                    onClick={() => {
                      setShowDeptModal(false);
                      setEditingDept(null);
                      setDeptForm({ name: '', code: '', description: '' });
                    }}
                    className="text-[#CBD5E1] hover:text-white transition-colors cursor-pointer"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                <form onSubmit={editingDept ? handleUpdateDepartment : handleCreateDepartment} className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-white mb-2">Nom *</label>
                    <input
                      type="text"
                      required
                      value={deptForm.name}
                      onChange={(e) => setDeptForm({ ...deptForm, name: e.target.value })}
                      className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-[#CBD5E1] focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:border-transparent transition-all"
                      placeholder="Ex: Ressources Humaines"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-white mb-2">Code *</label>
                    <input
                      type="text"
                      required
                      value={deptForm.code}
                      onChange={(e) => setDeptForm({ ...deptForm, code: e.target.value.toUpperCase() })}
                      className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-[#CBD5E1] focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:border-transparent transition-all"
                      placeholder="Ex: RH"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-white mb-2">Description</label>
                    <textarea
                      value={deptForm.description}
                      onChange={(e) => setDeptForm({ ...deptForm, description: e.target.value })}
                      rows={3}
                      className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-[#CBD5E1] focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:border-transparent transition-all resize-none"
                      placeholder="Description du département"
                    />
                  </div>
                  <div className="flex space-x-3 pt-4">
                    <button
                      type="button"
                      onClick={() => {
                        setShowDeptModal(false);
                        setEditingDept(null);
                        setDeptForm({ name: '', code: '', description: '' });
                      }}
                      className="flex-1 px-4 py-3 bg-white/5 hover:bg-white/10 text-white font-semibold rounded-lg border border-white/10 transition-all cursor-pointer"
                    >
                      Annuler
                    </button>
                    <button
                      type="submit"
                      disabled={saving}
                      className="flex-1 px-4 py-3 bg-gradient-to-r from-[#2563EB] via-[#7C3AED] to-[#F59E0B] text-white font-semibold rounded-lg hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                    >
                      {saving ? 'Enregistrement...' : editingDept ? 'Modifier' : 'Créer'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* Modal Création/Modification Service */}
        {showServiceModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/50 backdrop-blur-sm">
            <div className="bg-gradient-to-br from-[#1a1f3a] via-[#2563EB]/10 to-[#1a1f3a] backdrop-blur-lg rounded-[28px] border border-[#2563EB]/30 shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-2xl font-black text-white">
                    {editingService ? 'Modifier le service' : 'Créer un service'}
                  </h3>
                  <button
                    onClick={() => {
                      setShowServiceModal(false);
                      setEditingService(null);
                      setServiceForm({ name: '', code: '', description: '', department_id: '' });
                      setSelectedDeptForService(null);
                    }}
                    className="text-[#CBD5E1] hover:text-white transition-colors cursor-pointer"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                <form onSubmit={editingService ? handleUpdateService : handleCreateService} className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-white mb-2">Département *</label>
                    <select
                      required
                      value={selectedDeptForService || serviceForm.department_id}
                      onChange={(e) => {
                        setServiceForm({ ...serviceForm, department_id: e.target.value });
                        setSelectedDeptForService(e.target.value);
                      }}
                      disabled={!!selectedDeptForService || !!editingService}
                      className="w-full px-4 py-3 bg-[#1a1f3a] border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:border-transparent transition-all disabled:opacity-50"
                      style={{ backgroundColor: '#1a1f3a', color: '#ffffff' }}
                    >
                      <option value="" style={{ backgroundColor: '#1a1f3a', color: '#ffffff' }}>
                        Sélectionner un département
                      </option>
                      {departments.map((d) => (
                        <option key={d.id} value={d.id} style={{ backgroundColor: '#1a1f3a', color: '#ffffff' }}>
                          {d.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-white mb-2">Nom *</label>
                    <input
                      type="text"
                      required
                      value={serviceForm.name}
                      onChange={(e) => setServiceForm({ ...serviceForm, name: e.target.value })}
                      className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-[#CBD5E1] focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:border-transparent transition-all"
                      placeholder="Ex: Recrutement"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-white mb-2">Code *</label>
                    <input
                      type="text"
                      required
                      value={serviceForm.code}
                      onChange={(e) => setServiceForm({ ...serviceForm, code: e.target.value.toUpperCase() })}
                      className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-[#CBD5E1] focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:border-transparent transition-all"
                      placeholder="Ex: REC"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-white mb-2">Description</label>
                    <textarea
                      value={serviceForm.description}
                      onChange={(e) => setServiceForm({ ...serviceForm, description: e.target.value })}
                      rows={3}
                      className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-[#CBD5E1] focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:border-transparent transition-all resize-none"
                      placeholder="Description du service"
                    />
                  </div>
                  <div className="flex space-x-3 pt-4">
                    <button
                      type="button"
                      onClick={() => {
                        setShowServiceModal(false);
                        setEditingService(null);
                        setServiceForm({ name: '', code: '', description: '', department_id: '' });
                        setSelectedDeptForService(null);
                      }}
                      className="flex-1 px-4 py-3 bg-white/5 hover:bg-white/10 text-white font-semibold rounded-lg border border-white/10 transition-all cursor-pointer"
                    >
                      Annuler
                    </button>
                    <button
                      type="submit"
                      disabled={saving}
                      className="flex-1 px-4 py-3 bg-gradient-to-r from-[#2563EB] via-[#7C3AED] to-[#F59E0B] text-white font-semibold rounded-lg hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                    >
                      {saving ? 'Enregistrement...' : editingService ? 'Modifier' : 'Créer'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* Modal Assignation Utilisateur */}
        {showUserAssignModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/50 backdrop-blur-sm">
            <div className="bg-gradient-to-br from-[#1a1f3a] via-[#2563EB]/10 to-[#1a1f3a] backdrop-blur-lg rounded-[28px] border border-[#2563EB]/30 shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-2xl font-black text-white">Assigner un utilisateur</h3>
                  <button
                    onClick={() => {
                      setShowUserAssignModal(false);
                      setUserAssignForm({ user_id: '', department_id: '', service_id: '' });
                    }}
                    className="text-[#CBD5E1] hover:text-white transition-colors cursor-pointer"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                <form onSubmit={handleAssignUser} className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-white mb-2">Utilisateur *</label>
                    <select
                      required
                      value={userAssignForm.user_id}
                      onChange={(e) => setUserAssignForm({ ...userAssignForm, user_id: e.target.value, service_id: '' })}
                      className="w-full px-4 py-3 bg-[#1a1f3a] border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:border-transparent transition-all"
                      style={{ backgroundColor: '#1a1f3a', color: '#ffffff' }}
                    >
                      <option value="" style={{ backgroundColor: '#1a1f3a', color: '#ffffff' }}>
                        Sélectionner un utilisateur
                      </option>
                      {users.map((u) => (
                        <option key={u.id} value={u.id} style={{ backgroundColor: '#1a1f3a', color: '#ffffff' }}>
                          {u.full_name} ({u.email})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-white mb-2">Département *</label>
                    <select
                      required
                      value={userAssignForm.department_id}
                      onChange={(e) => {
                        setUserAssignForm({ ...userAssignForm, department_id: e.target.value, service_id: '' });
                      }}
                      className="w-full px-4 py-3 bg-[#1a1f3a] border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:border-transparent transition-all"
                      style={{ backgroundColor: '#1a1f3a', color: '#ffffff' }}
                    >
                      <option value="" style={{ backgroundColor: '#1a1f3a', color: '#ffffff' }}>
                        Sélectionner un département
                      </option>
                      {departments.map((d) => (
                        <option key={d.id} value={d.id} style={{ backgroundColor: '#1a1f3a', color: '#ffffff' }}>
                          {d.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-white mb-2">Service (optionnel)</label>
                    <select
                      value={userAssignForm.service_id}
                      onChange={(e) => setUserAssignForm({ ...userAssignForm, service_id: e.target.value })}
                      className="w-full px-4 py-3 bg-[#1a1f3a] border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:border-transparent transition-all"
                      style={{ backgroundColor: '#1a1f3a', color: '#ffffff' }}
                    >
                      <option value="" style={{ backgroundColor: '#1a1f3a', color: '#ffffff' }}>
                        Aucun service (rattaché directement au département)
                      </option>
                      {userAssignForm.department_id &&
                        getServicesForDept(userAssignForm.department_id).map((s) => (
                          <option key={s.id} value={s.id} style={{ backgroundColor: '#1a1f3a', color: '#ffffff' }}>
                            {s.name}
                          </option>
                        ))}
                    </select>
                    <p className="text-xs text-[#CBD5E1] mt-2">
                      Laissez vide pour rattacher l'utilisateur directement au département (ex: Directeur)
                    </p>
                  </div>
                  <div className="flex space-x-3 pt-4">
                    <button
                      type="button"
                      onClick={() => {
                        setShowUserAssignModal(false);
                        setUserAssignForm({ user_id: '', department_id: '', service_id: '' });
                      }}
                      className="flex-1 px-4 py-3 bg-white/5 hover:bg-white/10 text-white font-semibold rounded-lg border border-white/10 transition-all cursor-pointer"
                    >
                      Annuler
                    </button>
                    <button
                      type="submit"
                      disabled={saving}
                      className="flex-1 px-4 py-3 bg-gradient-to-r from-[#2563EB] via-[#7C3AED] to-[#F59E0B] text-white font-semibold rounded-lg hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                    >
                      {saving ? 'Assignation...' : 'Assigner'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}
      </div>
    </ScrollReveal>
  );
}

