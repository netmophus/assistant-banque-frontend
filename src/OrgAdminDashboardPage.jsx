// src/OrgAdminDashboardPage.jsx
import React, { useEffect, useState } from "react";
import api from "./api";
import StockManagementTab from "./components/stock/StockManagementTab";
import "./OrgAdminDashboardPage.css";

function OrgAdminDashboardPage({ onLogout }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("departments");
  
  // États pour les départements
  const [departments, setDepartments] = useState([]);
  const [showDeptForm, setShowDeptForm] = useState(false);
  const [editingDeptId, setEditingDeptId] = useState(null);
  const [deptForm, setDeptForm] = useState({ name: "", code: "", description: "" });
  
  // États pour les services
  const [services, setServices] = useState([]);
  const [selectedDeptForService, setSelectedDeptForService] = useState("");
  const [showServiceForm, setShowServiceForm] = useState(false);
  const [editingServiceId, setEditingServiceId] = useState(null);
  const [serviceForm, setServiceForm] = useState({ name: "", code: "", description: "", department_id: "" });
  
  // États pour les utilisateurs
  const [users, setUsers] = useState([]);
  const [stats, setStats] = useState(null);
  const [showUserForm, setShowUserForm] = useState(false);
  const [userForm, setUserForm] = useState({
    email: "",
    full_name: "",
    password: "",
    department_id: "",
    service_id: "",
  });

  // États pour les formations
  const [formations, setFormations] = useState([]);
  const [showFormationForm, setShowFormationForm] = useState(false);
  const [editingFormationId, setEditingFormationId] = useState(null);
  const [formationForm, setFormationForm] = useState({
    titre: "",
    description: "",
    modules: [],
  });
  const [showAssignForm, setShowAssignForm] = useState(false);
  const [selectedFormationForAssign, setSelectedFormationForAssign] = useState(null);
  const [selectedDepartments, setSelectedDepartments] = useState([]);

  // États pour les ressources
  const [ressources, setRessources] = useState([]);
  const [showRessourceForm, setShowRessourceForm] = useState(false);
  const [editingRessourceId, setEditingRessourceId] = useState(null);
  const [ressourceForm, setRessourceForm] = useState({
    titre: "",
    description: "",
    file: null,
  });
  const [currentRessource, setCurrentRessource] = useState(null); // Pour stocker la ressource en cours d'édition
  const [uploadingRessource, setUploadingRessource] = useState(false);
  const [showAssignRessourceForm, setShowAssignRessourceForm] = useState(false);
  const [selectedRessourceForAssign, setSelectedRessourceForAssign] = useState(null);
  const [selectedDepartmentsForRessource, setSelectedDepartmentsForRessource] = useState([]);

  useEffect(() => {
    fetchUser();
    fetchDepartments();
    fetchUsers();
    fetchStats();
    fetchFormations();
    fetchRessources();
  }, []);

  // Debug: Afficher les modules quand ils changent
  useEffect(() => {
    if (showFormationForm && editingFormationId) {
      console.log("🔍 Formulaire ouvert en mode édition - Modules:", formationForm.modules);
      console.log("🔍 Nombre de modules:", formationForm.modules?.length || 0);
    }
  }, [showFormationForm, editingFormationId, formationForm.modules]);

  useEffect(() => {
    if (selectedDeptForService) {
      fetchServices(selectedDeptForService);
    }
  }, [selectedDeptForService]);

  useEffect(() => {
    if (userForm.department_id) {
      fetchServices(userForm.department_id);
    } else {
      setServices([]);
    }
  }, [userForm.department_id]);

  const fetchUser = async () => {
    setLoading(true);
    setError("");
    try {
      const response = await api.get("/auth/me");
      setUser(response.data);
    } catch (err) {
      console.error(err);
      setError("Impossible de récupérer les informations de l'utilisateur.");
    } finally {
      setLoading(false);
    }
  };

  const fetchDepartments = async () => {
    try {
      const response = await api.get("/departments");
      setDepartments(response.data);
    } catch (err) {
      console.error("Erreur lors de la récupération des départements:", err);
    }
  };

  const fetchServices = async (deptId) => {
    try {
      const response = await api.get(`/departments/services/by-department/${deptId}`);
      setServices(response.data);
    } catch (err) {
      console.error("Erreur lors de la récupération des services:", err);
    }
  };

  const fetchUsers = async () => {
    try {
      const response = await api.get("/auth/users/org");
      setUsers(response.data);
    } catch (err) {
      console.error("Erreur lors de la récupération des utilisateurs:", err);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await api.get("/auth/users/org/stats");
      setStats(response.data);
    } catch (err) {
      console.error("Erreur lors de la récupération des statistiques:", err);
    }
  };

  const handleCreateDepartment = async (e) => {
    e.preventDefault();
    try {
      const deptData = {
        ...deptForm,
        organization_id: user.organization_id,
      };
      
      if (editingDeptId) {
        await api.put(`/departments/${editingDeptId}`, deptForm);
        alert("Département modifié avec succès !");
      } else {
        await api.post("/departments", deptData);
        alert("Département créé avec succès !");
      }
      
      setDeptForm({ name: "", code: "", description: "" });
      setShowDeptForm(false);
      setEditingDeptId(null);
      fetchDepartments();
    } catch (err) {
      alert("Erreur: " + (err.response?.data?.detail || err.message));
    }
  };

  const handleEditDepartment = (dept) => {
    setDeptForm({
      name: dept.name,
      code: dept.code,
      description: dept.description || "",
    });
    setEditingDeptId(dept.id);
    setShowDeptForm(true);
  };

  const handleCreateService = async (e) => {
    e.preventDefault();
    try {
      const serviceData = {
        ...serviceForm,
        department_id: selectedDeptForService || serviceForm.department_id,
      };
      
      if (editingServiceId) {
        await api.put(`/departments/services/${editingServiceId}`, serviceForm);
        alert("Service modifié avec succès !");
      } else {
        await api.post("/departments/services", serviceData);
        alert("Service créé avec succès !");
      }
      
      setServiceForm({ name: "", code: "", description: "", department_id: "" });
      setShowServiceForm(false);
      setEditingServiceId(null);
      if (selectedDeptForService) {
        fetchServices(selectedDeptForService);
      }
    } catch (err) {
      alert("Erreur: " + (err.response?.data?.detail || err.message));
    }
  };

  const handleEditService = (service) => {
    setServiceForm({
      name: service.name,
      code: service.code,
      description: service.description || "",
      department_id: service.department_id,
    });
    setSelectedDeptForService(service.department_id);
    setEditingServiceId(service.id);
    setShowServiceForm(true);
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    try {
      const userData = {
        ...userForm,
        organization_id: user.organization_id,
        department_id: userForm.department_id || null,
        service_id: userForm.service_id || null,
      };
      
      await api.post("/auth/users/org", userData);
      setUserForm({ email: "", full_name: "", password: "", department_id: "", service_id: "" });
      setShowUserForm(false);
      setSelectedDeptForService("");
      fetchUsers();
      fetchStats();
      alert("Utilisateur créé avec succès !");
    } catch (err) {
      alert("Erreur: " + (err.response?.data?.detail || err.message));
    }
  };

  const fetchFormations = async () => {
    try {
      const response = await api.get("/formations");
      setFormations(response.data);
    } catch (err) {
      console.error("Erreur lors de la récupération des formations:", err);
    }
  };

  const prepareFormationData = () => {
    // Vérifier que les modules sont bien structurés
    const modulesToSend = formationForm.modules.map((module) => ({
      titre: module.titre || "",
      nombre_chapitres: module.chapitres ? module.chapitres.length : 0,
      chapitres: (module.chapitres || []).map((chapitre) => ({
        introduction: chapitre.introduction || "",
        nombre_parties: chapitre.parties ? chapitre.parties.length : 0,
        parties: (chapitre.parties || []).map((partie) => ({
          titre: partie.titre || "",
          contenu: partie.contenu || "",
        })),
        contenu_genere: chapitre.contenu_genere || null, // Préserver le contenu généré
      })),
      questions_qcm: module.questions_qcm || [], // Préserver les questions QCM
    }));

    return {
      titre: formationForm.titre || "",
      description: formationForm.description || null,
      organization_id: user.organization_id,
      modules: modulesToSend,
    };
  };

  const handleSaveDraft = async () => {
    try {
      const formationData = prepareFormationData();

      if (editingFormationId) {
        await api.put(`/formations/${editingFormationId}`, {
          titre: formationData.titre,
          description: formationData.description,
          modules: formationData.modules,
          status: "draft",
        });
        alert("✅ Brouillon sauvegardé avec succès !");
      } else {
        const response = await api.post("/formations", {
          ...formationData,
          status: "draft",
        });
        // Mettre à jour l'ID de la formation en cours d'édition pour permettre les sauvegardes suivantes
        setEditingFormationId(response.data.id);
        alert("✅ Brouillon sauvegardé avec succès !");
      }

      fetchFormations();
      // Ne pas fermer le formulaire pour permettre de continuer à travailler
    } catch (err) {
      console.error("Erreur:", err);
      alert("Erreur lors de la sauvegarde: " + (err.response?.data?.detail || err.message));
    }
  };

  const handleCreateFormation = async (e) => {
    e.preventDefault();
    
    // Validation minimale
    if (!formationForm.titre || formationForm.titre.trim() === "") {
      alert("Veuillez saisir au moins le titre de la formation.");
      return;
    }

    try {
      const formationData = prepareFormationData();
      
      console.log("Données à envoyer:", formationData);
      console.log("Modules à envoyer:", formationData.modules);

      if (editingFormationId) {
        const response = await api.put(`/formations/${editingFormationId}`, {
          titre: formationData.titre,
          description: formationData.description,
          modules: formationData.modules,
        });
        console.log("Réponse de la mise à jour:", response.data);
        alert("Formation modifiée avec succès !");
        // Recharger la formation pour avoir les IDs corrects
        await handleEditFormation({ id: editingFormationId });
      } else {
        const response = await api.post("/formations", formationData);
        console.log("Réponse de la création:", response.data);
        // Mettre à jour l'ID pour permettre les modifications suivantes
        setEditingFormationId(response.data.id);
        alert("Formation créée avec succès !");
        // Ne pas fermer le formulaire, permettre de continuer à travailler
      }

      fetchFormations();
      // Ne pas réinitialiser le formulaire si on est en mode édition
      if (!editingFormationId) {
        setFormationForm({ titre: "", description: "", modules: [] });
        setShowFormationForm(false);
        setEditingFormationId(null);
      }
    } catch (err) {
      console.error("Erreur:", err);
      console.error("Détails de l'erreur:", err.response?.data);
      alert("Erreur: " + (err.response?.data?.detail || err.message));
    }
  };

  const handleEditFormation = async (formation) => {
    // Vérifier s'il y a des modifications non sauvegardées
    if (showFormationForm && formationForm.modules.length > 0 && editingFormationId !== formation.id) {
      const shouldSave = window.confirm(
        "Vous avez des modifications non sauvegardées. Voulez-vous les sauvegarder avant de modifier cette formation ?\n\n" +
        "Cliquez sur OK pour sauvegarder, ou Annuler pour perdre les modifications."
      );
      
      if (shouldSave) {
        try {
          await handleSaveDraft();
        } catch (err) {
          alert("Erreur lors de la sauvegarde: " + (err.response?.data?.detail || err.message));
          return; // Ne pas continuer si la sauvegarde échoue
        }
      }
    }
    
    try {
      // Récupérer la formation complète
      const response = await api.get(`/formations/${formation.id}`);
      const fullFormation = response.data;
      
      console.log("Formation chargée:", fullFormation);
      console.log("Modules dans la BD:", fullFormation.modules);
      console.log("Nombre de modules:", fullFormation.modules?.length || 0);
      
      // Préparer les modules avec toute leur structure (chapitres, parties, etc.)
      console.log("🔍 Modules bruts de l'API:", fullFormation.modules);
      console.log("🔍 Nombre de modules bruts:", fullFormation.modules?.length || 0);
      
      const modulesWithIds = (fullFormation.modules || []).map((module, modIdx) => {
        console.log(`🔍 Traitement du module ${modIdx}:`, module);
        console.log(`  - Titre:`, module.titre);
        console.log(`  - Chapitres bruts:`, module.chapitres);
        console.log(`  - Nombre de chapitres bruts:`, module.chapitres?.length || 0);
        
        // S'assurer que les chapitres sont bien structurés avec leurs parties
        const chapitres = (module.chapitres || []).map((chapitre, chIdx) => {
          console.log(`  🔍 Traitement du chapitre ${chIdx}:`, chapitre);
          console.log(`    - Introduction:`, chapitre.introduction);
          console.log(`    - Parties brutes:`, chapitre.parties);
          console.log(`    - Nombre de parties brutes:`, chapitre.parties?.length || 0);
          
          // S'assurer que les parties sont bien présentes
          const parties = (chapitre.parties || []).map((partie) => ({
            titre: partie.titre || "",
            contenu: partie.contenu || "",
          }));
          
          console.log(`    - Parties mappées:`, parties.length);
          
          return {
            introduction: chapitre.introduction || "",
            nombre_parties: chapitre.nombre_parties || parties.length,
            parties: parties,
            contenu_genere: chapitre.contenu_genere || null,
            id: chapitre.id, // Conserver l'ID du chapitre
          };
        });
        
        console.log(`  ✅ Chapitres mappés pour module ${modIdx}:`, chapitres.length);
        
        return {
          titre: module.titre || "",
          nombre_chapitres: module.nombre_chapitres || chapitres.length,
          chapitres: chapitres,
          questions_qcm: module.questions_qcm || [],
          id: module.id, // Conserver l'ID du module
        };
      });
      
      console.log("Modules préparés pour le formulaire:", modulesWithIds);
      console.log("Nombre de modules préparés:", modulesWithIds.length);
      
      if (modulesWithIds.length === 0 && fullFormation.modules?.length === 0) {
        console.warn("ATTENTION: Aucun module trouvé dans la formation !");
      }
      
      // Définir les données immédiatement, puis ouvrir le formulaire
      console.log("Définition des données du formulaire avec", modulesWithIds.length, "modules");
      console.log("Structure complète des modules:", JSON.stringify(modulesWithIds, null, 2));
      
      // S'assurer que les modules sont bien définis
      if (modulesWithIds.length === 0) {
        console.warn("⚠️ ATTENTION: Aucun module à charger !");
        console.warn("Formation complète:", fullFormation);
        console.warn("Modules bruts de l'API:", fullFormation.modules);
      } else {
        console.log("✅ Modules chargés avec succès:", modulesWithIds.length);
        modulesWithIds.forEach((mod, idx) => {
          console.log(`  Module ${idx + 1}:`, mod.titre, "- Chapitres:", mod.chapitres?.length || 0);
        });
      }
      
      // Ouvrir le formulaire d'abord
      setShowFormationForm(true);
      setEditingFormationId(formation.id);
      
      // Puis définir les données (cela forcera un re-render)
      // Utiliser une fonction pour s'assurer que le state est bien mis à jour
      setFormationForm(prev => {
        const newForm = {
          titre: fullFormation.titre || "",
          description: fullFormation.description || "",
          modules: modulesWithIds,
        };
        console.log("🔍 Nouveau state du formulaire:", newForm);
        console.log("🔍 Modules dans le nouveau state:", newForm.modules?.length || 0);
        return newForm;
      });
      
      // Forcer un re-render après un court délai pour s'assurer que les données sont bien chargées
      setTimeout(() => {
        console.log("🔍 Vérification après délai - Modules dans formationForm:", formationForm.modules?.length || 0);
      }, 100);
    } catch (err) {
      console.error("Erreur lors du chargement:", err);
      alert("Erreur lors du chargement de la formation: " + (err.response?.data?.detail || err.message));
    }
  };

  const handlePublishFormation = async (formationId) => {
    // Demander si l'utilisateur veut générer automatiquement le contenu et les QCM
    const generateContent = window.confirm(
      "Voulez-vous générer automatiquement le contenu des chapitres avec l'IA ?\n\n" +
      "Cliquez sur OK pour générer automatiquement, ou Annuler pour publier sans génération."
    );
    
    const generateQCM = generateContent 
      ? window.confirm("Voulez-vous aussi générer automatiquement les questions QCM pour chaque module ?")
      : false;
    
    try {
      const params = new URLSearchParams();
      if (generateContent) params.append("auto_generate_content", "true");
      if (generateQCM) params.append("auto_generate_qcm", "true");
      
      const url = `/formations/${formationId}/publish${params.toString() ? "?" + params.toString() : ""}`;
      
      alert("⏳ Publication en cours... La génération du contenu peut prendre quelques instants.");
      await api.post(url);
      alert("✅ Formation publiée avec succès !" + (generateContent ? "\n\nLe contenu a été généré automatiquement." : ""));
      fetchFormations();
    } catch (err) {
      alert("Erreur: " + (err.response?.data?.detail || err.message));
    }
  };

  const addModule = () => {
    setFormationForm({
      ...formationForm,
      modules: [
        ...formationForm.modules,
        {
          titre: "",
          nombre_chapitres: 0,
          chapitres: [],
        },
      ],
    });
  };

  const updateModule = (moduleIndex, field, value) => {
    const updatedModules = [...formationForm.modules];
    updatedModules[moduleIndex] = {
      ...updatedModules[moduleIndex],
      [field]: value,
    };
    setFormationForm({ ...formationForm, modules: updatedModules });
  };

  const addChapitre = (moduleIndex) => {
    const updatedModules = [...formationForm.modules];
    updatedModules[moduleIndex].chapitres = [
      ...updatedModules[moduleIndex].chapitres,
      {
        introduction: "",
        nombre_parties: 0,
        parties: [],
      },
    ];
    updatedModules[moduleIndex].nombre_chapitres = updatedModules[moduleIndex].chapitres.length;
    setFormationForm({ ...formationForm, modules: updatedModules });
  };

  const updateChapitre = (moduleIndex, chapitreIndex, field, value) => {
    const updatedModules = [...formationForm.modules];
    updatedModules[moduleIndex].chapitres[chapitreIndex] = {
      ...updatedModules[moduleIndex].chapitres[chapitreIndex],
      [field]: value,
    };
    setFormationForm({ ...formationForm, modules: updatedModules });
  };

  const addPartie = (moduleIndex, chapitreIndex) => {
    const updatedModules = [...formationForm.modules];
    updatedModules[moduleIndex].chapitres[chapitreIndex].parties = [
      ...updatedModules[moduleIndex].chapitres[chapitreIndex].parties,
      {
        titre: "",
        contenu: "",
      },
    ];
    updatedModules[moduleIndex].chapitres[chapitreIndex].nombre_parties =
      updatedModules[moduleIndex].chapitres[chapitreIndex].parties.length;
    setFormationForm({ ...formationForm, modules: updatedModules });
  };

  const updatePartie = (moduleIndex, chapitreIndex, partieIndex, field, value) => {
    const updatedModules = [...formationForm.modules];
    updatedModules[moduleIndex].chapitres[chapitreIndex].parties[partieIndex] = {
      ...updatedModules[moduleIndex].chapitres[chapitreIndex].parties[partieIndex],
      [field]: value,
    };
    setFormationForm({ ...formationForm, modules: updatedModules });
  };

  const removeModule = (moduleIndex) => {
    const updatedModules = formationForm.modules.filter((_, idx) => idx !== moduleIndex);
    setFormationForm({ ...formationForm, modules: updatedModules });
  };

  const removeChapitre = (moduleIndex, chapitreIndex) => {
    const updatedModules = [...formationForm.modules];
    updatedModules[moduleIndex].chapitres = updatedModules[moduleIndex].chapitres.filter(
      (_, idx) => idx !== chapitreIndex
    );
    updatedModules[moduleIndex].nombre_chapitres = updatedModules[moduleIndex].chapitres.length;
    setFormationForm({ ...formationForm, modules: updatedModules });
  };

  const removePartie = (moduleIndex, chapitreIndex, partieIndex) => {
    const updatedModules = [...formationForm.modules];
    updatedModules[moduleIndex].chapitres[chapitreIndex].parties = updatedModules[
      moduleIndex
    ].chapitres[chapitreIndex].parties.filter((_, idx) => idx !== partieIndex);
    updatedModules[moduleIndex].chapitres[chapitreIndex].nombre_parties =
      updatedModules[moduleIndex].chapitres[chapitreIndex].parties.length;
    setFormationForm({ ...formationForm, modules: updatedModules });
  };

  // Fonctions pour les ressources
  const fetchRessources = async () => {
    try {
      const response = await api.get("/ressources");
      setRessources(response.data || []);
    } catch (err) {
      console.error("Erreur lors de la récupération des ressources:", err);
      // Si l'endpoint n'existe pas encore, initialiser avec un tableau vide
      setRessources([]);
    }
  };

  const handleCreateRessource = async () => {
    if (!ressourceForm.file) {
      alert("Veuillez sélectionner un fichier à uploader.");
      return;
    }

    setUploadingRessource(true);
    try {
      const formData = new FormData();
      formData.append("titre", ressourceForm.titre);
      formData.append("description", ressourceForm.description || "");
      formData.append("file", ressourceForm.file);

      const response = await api.post("/ressources", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });
      
      setRessources([...ressources, response.data]);
      setShowRessourceForm(false);
      setRessourceForm({ titre: "", description: "", file: null });
      alert("✅ Ressource uploadée avec succès !");
    } catch (err) {
      alert("Erreur: " + (err.response?.data?.detail || err.message));
    } finally {
      setUploadingRessource(false);
    }
  };

  const handleUpdateRessource = async () => {
    setUploadingRessource(true);
    try {
      const formData = new FormData();
      formData.append("titre", ressourceForm.titre);
      formData.append("description", ressourceForm.description || "");
      if (ressourceForm.file) {
        formData.append("file", ressourceForm.file);
      }

      const response = await api.put(`/ressources/${editingRessourceId}`, formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });
      
      setRessources(ressources.map(r => r.id === editingRessourceId ? response.data : r));
      setShowRessourceForm(false);
      setEditingRessourceId(null);
      setCurrentRessource(null);
      setRessourceForm({ titre: "", description: "", file: null });
      alert("✅ Ressource modifiée avec succès !");
    } catch (err) {
      alert("Erreur: " + (err.response?.data?.detail || err.message));
    } finally {
      setUploadingRessource(false);
    }
  };

  const handleDeleteRessource = async (id) => {
    if (!window.confirm("Êtes-vous sûr de vouloir supprimer cette ressource ?")) {
      return;
    }
    try {
      await api.delete(`/ressources/${id}`);
      setRessources(ressources.filter(r => r.id !== id));
      alert("✅ Ressource supprimée avec succès !");
    } catch (err) {
      alert("Erreur: " + (err.response?.data?.detail || err.message));
    }
  };

  const handleEditRessource = (ressource) => {
    setRessourceForm({
      titre: ressource.titre || "",
      description: ressource.description || "",
      file: null, // Nouveau fichier (optionnel)
    });
    setCurrentRessource(ressource); // Stocker la ressource actuelle pour afficher le fichier existant
    setEditingRessourceId(ressource.id);
    setShowRessourceForm(true);
  };

  const handleAssignRessourceToDepartments = async () => {
    try {
      await api.post(`/ressources/${selectedRessourceForAssign.id}/assign-departments`, {
        ressource_id: selectedRessourceForAssign.id,
        department_ids: selectedDepartmentsForRessource,
      });
      alert("✅ Ressource affectée aux départements avec succès !");
      setShowAssignRessourceForm(false);
      setSelectedRessourceForAssign(null);
      setSelectedDepartmentsForRessource([]);
      fetchRessources();
    } catch (err) {
      alert("Erreur: " + (err.response?.data?.detail || err.message));
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("access_token");
    if (onLogout) {
      onLogout();
    }
  };

  if (loading) {
    return (
      <div className="org-loading">
        <p>Chargement...</p>
      </div>
    );
  }

  return (
    <div className="org-dashboard-wrapper">
      <div className="org-dashboard-card">
        {/* Header */}
        <div className="org-dashboard-header">
          <div className="org-dashboard-header-info">
            <h2>🏦 Dashboard Administrateur</h2>
            {user && (
              <p>{user.full_name} ({user.email})</p>
            )}
            {user && (
              <p className="small">
                Organisation: <strong>{user.organization_name || user.organization_id}</strong>
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={handleLogout}
            className="btn-logout"
          >
            Déconnexion
          </button>
        </div>

        {error && (
          <div className="org-error-banner">
            {error}
          </div>
        )}

        {/* Onglets */}
        <div className="org-tabs-bar">
          {[
            { key: "departments", label: `Départements (${departments.length})`, color: "#1976d2", bg: "#e3f2fd" },
            { key: "services", label: "Services", color: "#388e3c", bg: "#e8f5e9" },
            { key: "users", label: `Utilisateurs (${users.length})`, color: "#f57c00", bg: "#fff3e0" },
            { key: "formations", label: `📚 Formations (${formations.length})`, color: "#9c27b0", bg: "#f3e5f5" },
            { key: "ressources", label: `📋 Ressources (${ressources.length})`, color: "#0288d1", bg: "#e1f5fe" },
            { key: "stock", label: "📦 Gestion de Stock", color: "#ff9800", bg: "#fff3e0" },
          ].map(({ key, label, color, bg }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className="org-tab-btn"
              style={{
                backgroundColor: activeTab === key ? bg : "transparent",
                borderBottom: activeTab === key ? `2px solid ${color}` : "2px solid transparent",
                fontWeight: activeTab === key ? "bold" : "normal",
                color: activeTab === key ? color : "#555",
              }}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Statistiques de la licence */}
        {stats && (
          <div
            style={{
              marginBottom: "24px",
              padding: "16px",
              backgroundColor: "#e8f5e9",
              borderRadius: "4px",
              border: "1px solid #4caf50",
            }}
          >
            <h3 style={{ margin: "0 0 12px 0", color: "#2e7d32" }}>
              📊 Statistiques de la licence
            </h3>
            <div className="org-stats-grid">
              <div>
                <p style={{ margin: "4px 0", fontSize: "0.9rem", color: "#666" }}>
                  Plan: <strong>{stats.license_plan}</strong>
                </p>
              </div>
              <div>
                <p style={{ margin: "4px 0", fontSize: "0.9rem", color: "#666" }}>
                  Utilisateurs actuels: <strong>{stats.current_users}</strong>
                </p>
              </div>
              <div>
                <p style={{ margin: "4px 0", fontSize: "0.9rem", color: "#666" }}>
                  Maximum: <strong>{stats.max_users}</strong>
                </p>
              </div>
              <div>
                <p style={{ margin: "4px 0", fontSize: "0.9rem", color: "#666" }}>
                  Places restantes:{" "}
                  <strong style={{ color: stats.remaining_slots > 0 ? "#2e7d32" : "#d32f2f" }}>
                    {stats.remaining_slots}
                  </strong>
                </p>
              </div>
            </div>
            {stats.remaining_slots === 0 && (
              <p style={{ margin: "12px 0 0 0", color: "#d32f2f", fontWeight: "bold" }}>
                ⚠️ Limite d'utilisateurs atteinte. Contactez l'administrateur pour mettre à jour votre licence.
              </p>
            )}
          </div>
        )}

        {/* Contenu des onglets */}
        {activeTab === "departments" && (
          <div>
            <div className="org-section-header">
              <h3>📁 Départements</h3>
              <button
                type="button"
                onClick={() => {
                  if (showDeptForm) {
                    setShowDeptForm(false);
                    setDeptForm({ name: "", code: "", description: "" });
                    setEditingDeptId(null);
                  } else {
                    setShowDeptForm(true);
                  }
                }}
                style={{
                  padding: "8px 16px",
                  borderRadius: "4px",
                  border: "none",
                  backgroundColor: "#1976d2",
                  color: "#fff",
                  cursor: "pointer",
                  fontWeight: "bold",
                }}
              >
                {showDeptForm ? "Annuler" : "+ Créer un département"}
              </button>
            </div>

            {showDeptForm && (
              <form
                onSubmit={handleCreateDepartment}
                className="org-form-box"
              >
                <div style={{ marginBottom: "12px" }}>
                  <label style={{ display: "block", marginBottom: "4px", fontWeight: "bold" }}>
                    Nom du département
                  </label>
                  <input
                    type="text"
                    required
                    value={deptForm.name}
                    onChange={(e) => setDeptForm({ ...deptForm, name: e.target.value })}
                    style={{ width: "100%", padding: "8px", borderRadius: "4px", border: "1px solid #ddd" }}
                    placeholder="Ex: Ressources Humaines"
                  />
                </div>
                <div style={{ marginBottom: "12px" }}>
                  <label style={{ display: "block", marginBottom: "4px", fontWeight: "bold" }}>
                    Code
                  </label>
                  <input
                    type="text"
                    required
                    value={deptForm.code}
                    onChange={(e) => setDeptForm({ ...deptForm, code: e.target.value.toUpperCase() })}
                    style={{ width: "100%", padding: "8px", borderRadius: "4px", border: "1px solid #ddd" }}
                    placeholder="Ex: RH"
                  />
                </div>
                <div style={{ marginBottom: "12px" }}>
                  <label style={{ display: "block", marginBottom: "4px", fontWeight: "bold" }}>
                    Description <span style={{ color: "#999", fontWeight: "normal" }}>(optionnel)</span>
                  </label>
                  <textarea
                    value={deptForm.description}
                    onChange={(e) => setDeptForm({ ...deptForm, description: e.target.value })}
                    style={{ width: "100%", padding: "8px", borderRadius: "4px", border: "1px solid #ddd", minHeight: "80px" }}
                    placeholder="Description du département"
                  />
                </div>
                <button
                  type="submit"
                  style={{
                    padding: "8px 16px",
                    borderRadius: "4px",
                    border: "none",
                    backgroundColor: "#1976d2",
                    color: "#fff",
                    cursor: "pointer",
                    fontWeight: "bold",
                  }}
                >
                  {editingDeptId ? "Modifier le département" : "Créer le département"}
                </button>
              </form>
            )}

            <div className="org-cards-grid">
              {departments.map((dept) => (
                <div
                  key={dept.id}
                  className="org-card"
                >
                  <div className="org-card-header">
                    <h4>{dept.name}</h4>
                    <button
                      type="button"
                      onClick={() => handleEditDepartment(dept)}
                      style={{
                        padding: "4px 8px",
                        borderRadius: "4px",
                        border: "1px solid #1976d2",
                        backgroundColor: "#fff",
                        color: "#1976d2",
                        cursor: "pointer",
                        fontSize: "0.85rem",
                      }}
                    >
                      Modifier
                    </button>
                  </div>
                  <p style={{ margin: "4px 0", fontSize: "0.9rem", color: "#666" }}>
                    Code: <strong>{dept.code}</strong>
                  </p>
                  {dept.description && (
                    <p style={{ margin: "4px 0", fontSize: "0.9rem", color: "#666" }}>
                      {dept.description}
                    </p>
                  )}
                  <p style={{ margin: "4px 0", fontSize: "0.9rem", color: "#666" }}>
                    Services: <strong>{dept.services_count || 0}</strong> | Utilisateurs: <strong>{dept.users_count || 0}</strong>
                  </p>
                </div>
              ))}
              {departments.length === 0 && (
                <p style={{ padding: "24px", textAlign: "center", color: "#999" }}>
                  Aucun département pour le moment.
                </p>
              )}
            </div>
          </div>
        )}

        {activeTab === "services" && (
          <div>
            <div style={{ marginBottom: "16px" }}>
              <label style={{ display: "block", marginBottom: "4px", fontWeight: "bold" }}>
                Sélectionner un département pour voir ses services
              </label>
              <select
                value={selectedDeptForService}
                onChange={(e) => {
                  setSelectedDeptForService(e.target.value);
                  setShowServiceForm(false);
                  setEditingServiceId(null);
                }}
                style={{ width: "100%", maxWidth: "400px", padding: "8px", borderRadius: "4px", border: "1px solid #ddd" }}
              >
                <option value="">Sélectionner un département</option>
                {departments.map((dept) => (
                  <option key={dept.id} value={dept.id}>
                    {dept.name} ({dept.code})
                  </option>
                ))}
              </select>
            </div>

            {selectedDeptForService && (
              <>
                <div className="org-section-header">
                  <h3>
                    Services du département: {departments.find((d) => d.id === selectedDeptForService)?.name}
                  </h3>
                  <button
                    type="button"
                    onClick={() => {
                      if (showServiceForm) {
                        setShowServiceForm(false);
                        setServiceForm({ name: "", code: "", description: "", department_id: "" });
                        setEditingServiceId(null);
                      } else {
                        setShowServiceForm(true);
                        setServiceForm({ ...serviceForm, department_id: selectedDeptForService });
                      }
                    }}
                    style={{
                      padding: "8px 16px",
                      borderRadius: "4px",
                      border: "none",
                      backgroundColor: "#388e3c",
                      color: "#fff",
                      cursor: "pointer",
                      fontWeight: "bold",
                    }}
                  >
                    {showServiceForm ? "Annuler" : "+ Créer un service"}
                  </button>
                </div>

                {showServiceForm && (
                  <form
                    onSubmit={handleCreateService}
                    className="org-form-box"
                  >
                    <div style={{ marginBottom: "12px" }}>
                      <label style={{ display: "block", marginBottom: "4px", fontWeight: "bold" }}>
                        Nom du service
                      </label>
                      <input
                        type="text"
                        required
                        value={serviceForm.name}
                        onChange={(e) => setServiceForm({ ...serviceForm, name: e.target.value })}
                        style={{ width: "100%", padding: "8px", borderRadius: "4px", border: "1px solid #ddd" }}
                        placeholder="Ex: Recrutement"
                      />
                    </div>
                    <div style={{ marginBottom: "12px" }}>
                      <label style={{ display: "block", marginBottom: "4px", fontWeight: "bold" }}>
                        Code
                      </label>
                      <input
                        type="text"
                        required
                        value={serviceForm.code}
                        onChange={(e) => setServiceForm({ ...serviceForm, code: e.target.value.toUpperCase() })}
                        style={{ width: "100%", padding: "8px", borderRadius: "4px", border: "1px solid #ddd" }}
                        placeholder="Ex: REC"
                      />
                    </div>
                    <div style={{ marginBottom: "12px" }}>
                      <label style={{ display: "block", marginBottom: "4px", fontWeight: "bold" }}>
                        Description <span style={{ color: "#999", fontWeight: "normal" }}>(optionnel)</span>
                      </label>
                      <textarea
                        value={serviceForm.description}
                        onChange={(e) => setServiceForm({ ...serviceForm, description: e.target.value })}
                        style={{ width: "100%", padding: "8px", borderRadius: "4px", border: "1px solid #ddd", minHeight: "80px" }}
                        placeholder="Description du service"
                      />
                    </div>
                    <button
                      type="submit"
                      style={{
                        padding: "8px 16px",
                        borderRadius: "4px",
                        border: "none",
                        backgroundColor: "#388e3c",
                        color: "#fff",
                        cursor: "pointer",
                        fontWeight: "bold",
                      }}
                    >
                      {editingServiceId ? "Modifier le service" : "Créer le service"}
                    </button>
                  </form>
                )}

                <div className="org-cards-grid">
                  {services.map((service) => (
                    <div
                      key={service.id}
                      className="org-card"
                    >
                      <div className="org-card-header">
                        <h4>{service.name}</h4>
                        <button
                          type="button"
                          onClick={() => handleEditService(service)}
                          style={{
                            padding: "4px 8px",
                            borderRadius: "4px",
                            border: "1px solid #388e3c",
                            backgroundColor: "#fff",
                            color: "#388e3c",
                            cursor: "pointer",
                            fontSize: "0.85rem",
                          }}
                        >
                          Modifier
                        </button>
                      </div>
                      <p style={{ margin: "4px 0", fontSize: "0.9rem", color: "#666" }}>
                        Code: <strong>{service.code}</strong>
                      </p>
                      {service.description && (
                        <p style={{ margin: "4px 0", fontSize: "0.9rem", color: "#666" }}>
                          {service.description}
                        </p>
                      )}
                      <p style={{ margin: "4px 0", fontSize: "0.9rem", color: "#666" }}>
                        Utilisateurs: <strong>{service.users_count || 0}</strong>
                      </p>
                    </div>
                  ))}
                  {services.length === 0 && (
                    <p style={{ padding: "24px", textAlign: "center", color: "#999" }}>
                      Ce département n'a pas de services. Les utilisateurs peuvent être assignés directement au département.
                    </p>
                  )}
                </div>
              </>
            )}
          </div>
        )}

        {activeTab === "users" && (
          <div>
            <div className="org-section-header">
              <h3>👥 Utilisateurs de l'organisation</h3>
            <button
              type="button"
              onClick={() => {
                if (showUserForm) {
                  setShowUserForm(false);
                  setUserForm({ email: "", full_name: "", password: "", department_id: "", service_id: "" });
                } else {
                  setShowUserForm(true);
                }
              }}
              disabled={stats && stats.remaining_slots === 0}
              style={{
                padding: "8px 16px",
                borderRadius: "4px",
                border: "none",
                backgroundColor: stats && stats.remaining_slots === 0 ? "#ccc" : "#1976d2",
                color: "#fff",
                cursor: stats && stats.remaining_slots === 0 ? "not-allowed" : "pointer",
                fontWeight: "bold",
                opacity: stats && stats.remaining_slots === 0 ? 0.6 : 1,
              }}
            >
              {showUserForm ? "Annuler" : "+ Créer un utilisateur"}
            </button>
          </div>

          {showUserForm && (
            <form
              onSubmit={handleCreateUser}
              className="org-form-box"
            >
              <div style={{ marginBottom: "12px" }}>
                <label style={{ display: "block", marginBottom: "4px", fontWeight: "bold" }}>
                  Email
                </label>
                <input
                  type="email"
                  required
                  value={userForm.email}
                  onChange={(e) => setUserForm({ ...userForm, email: e.target.value })}
                  style={{ width: "100%", padding: "8px", borderRadius: "4px", border: "1px solid #ddd" }}
                  placeholder="user@example.com"
                />
              </div>
              <div style={{ marginBottom: "12px" }}>
                <label style={{ display: "block", marginBottom: "4px", fontWeight: "bold" }}>
                  Nom complet
                </label>
                <input
                  type="text"
                  required
                  value={userForm.full_name}
                  onChange={(e) => setUserForm({ ...userForm, full_name: e.target.value })}
                  style={{ width: "100%", padding: "8px", borderRadius: "4px", border: "1px solid #ddd" }}
                  placeholder="Jean Dupont"
                />
              </div>
              <div style={{ marginBottom: "12px" }}>
                <label style={{ display: "block", marginBottom: "4px", fontWeight: "bold" }}>
                  Mot de passe
                </label>
                <input
                  type="password"
                  required
                  minLength="6"
                  value={userForm.password}
                  onChange={(e) => setUserForm({ ...userForm, password: e.target.value })}
                  style={{ width: "100%", padding: "8px", borderRadius: "4px", border: "1px solid #ddd" }}
                  placeholder="Minimum 6 caractères"
                />
              </div>
              <div style={{ marginBottom: "12px" }}>
                <label style={{ display: "block", marginBottom: "4px", fontWeight: "bold" }}>
                  Département <span style={{ color: "#999", fontWeight: "normal" }}>(optionnel)</span>
                </label>
                <select
                  value={userForm.department_id}
                  onChange={(e) => {
                    setUserForm({ ...userForm, department_id: e.target.value, service_id: "" });
                  }}
                  style={{ width: "100%", padding: "8px", borderRadius: "4px", border: "1px solid #ddd" }}
                >
                  <option value="">Aucun département</option>
                  {departments.map((dept) => (
                    <option key={dept.id} value={dept.id}>
                      {dept.name} ({dept.code})
                    </option>
                  ))}
                </select>
                <p style={{ margin: "4px 0 0 0", fontSize: "0.85rem", color: "#666" }}>
                  Certains départements n'ont pas de services, juste des agents directs.
                </p>
              </div>
              {userForm.department_id && (
                <div style={{ marginBottom: "12px" }}>
                  <label style={{ display: "block", marginBottom: "4px", fontWeight: "bold" }}>
                    Service <span style={{ color: "#999", fontWeight: "normal" }}>(optionnel)</span>
                  </label>
                  <select
                    value={userForm.service_id}
                    onChange={(e) => setUserForm({ ...userForm, service_id: e.target.value })}
                    style={{ width: "100%", padding: "8px", borderRadius: "4px", border: "1px solid #ddd" }}
                  >
                    <option value="">Aucun service (agent direct du département)</option>
                    {services
                      .filter((s) => s.department_id === userForm.department_id)
                      .map((service) => (
                        <option key={service.id} value={service.id}>
                          {service.name} ({service.code})
                        </option>
                      ))}
                  </select>
                  <p style={{ margin: "4px 0 0 0", fontSize: "0.85rem", color: "#666" }}>
                    Si aucun service n'est sélectionné, l'utilisateur sera un agent direct du département.
                  </p>
                </div>
              )}
              <button
                type="submit"
                style={{
                  padding: "8px 16px",
                  borderRadius: "4px",
                  border: "none",
                  backgroundColor: "#1976d2",
                  color: "#fff",
                  cursor: "pointer",
                  fontWeight: "bold",
                }}
              >
                Créer l'utilisateur
              </button>
            </form>
          )}

          <div className="org-table-container">
            <table className="org-table">
              <thead>
                <tr>
                  <th>Email</th>
                  <th>Nom</th>
                  <th>Département</th>
                  <th>Service</th>
                  <th>Rôle</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id}>
                    <td>{u.email}</td>
                    <td>{u.full_name}</td>
                    <td>{u.department_name || "-"}</td>
                    <td>{u.service_name || "-"}</td>
                    <td>
                      <span
                        style={{
                          padding: "4px 8px",
                          borderRadius: "4px",
                          backgroundColor: u.role === "admin" ? "#e3f2fd" : "#f5f5f5",
                          color: u.role === "admin" ? "#1976d2" : "#666",
                          fontSize: "0.85rem",
                        }}
                      >
                        {u.role || "user"}
                      </span>
                    </td>
                  </tr>
                ))}
                {users.length === 0 && (
                  <tr>
                    <td colSpan="5" style={{ padding: "24px", textAlign: "center", color: "#999" }}>
                      Aucun utilisateur pour le moment.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          </div>
        )}

        {activeTab === "formations" && (
          <div>
            <div className="org-section-header">
              <h3>📚 Formations</h3>
              <button
                type="button"
                onClick={() => {
                  if (showFormationForm && editingFormationId) {
                    // Si on est en train d'éditer, demander confirmation avant de fermer
                    if (window.confirm("Voulez-vous fermer le formulaire ? Les modifications non sauvegardées seront perdues.")) {
                      setShowFormationForm(false);
                      setFormationForm({ titre: "", description: "", modules: [] });
                      setEditingFormationId(null);
                    }
                  } else if (showFormationForm) {
                    // Si le formulaire est ouvert mais pas en édition, juste le fermer
                    setShowFormationForm(false);
                    setFormationForm({ titre: "", description: "", modules: [] });
                    setEditingFormationId(null);
                  } else {
                    // Ouvrir le formulaire pour créer une nouvelle formation
                    setShowFormationForm(true);
                    setFormationForm({ titre: "", description: "", modules: [] });
                    setEditingFormationId(null);
                  }
                }}
                style={{
                  padding: "8px 16px",
                  borderRadius: "4px",
                  border: "none",
                  backgroundColor: "#9c27b0",
                  color: "#fff",
                  cursor: "pointer",
                  fontWeight: "bold",
                }}
              >
                {showFormationForm && editingFormationId ? "Fermer" : showFormationForm ? "Annuler" : "+ Créer une formation"}
              </button>
            </div>

            {showFormationForm && (
              <form
                onSubmit={handleCreateFormation}
                style={{
                  padding: "24px",
                  backgroundColor: "#f9f9f9",
                  borderRadius: "8px",
                  marginBottom: "24px",
                  border: "2px solid #9c27b0",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                  <h4 style={{ marginTop: 0, color: "#9c27b0" }}>
                    {editingFormationId ? "Modifier la formation" : "Nouvelle formation"}
                  </h4>
                  {editingFormationId && (
                    <span style={{ 
                      padding: "4px 12px", 
                      borderRadius: "4px", 
                      backgroundColor: "#fff3e0", 
                      color: "#f57c00",
                      fontSize: "0.85rem",
                      fontWeight: "600"
                    }}>
                      💾 Brouillon en cours
                    </span>
                  )}
                </div>

                <div style={{ marginBottom: "16px" }}>
                  <label style={{ display: "block", marginBottom: "8px", fontWeight: "bold" }}>
                    Titre de la formation <span style={{ color: "#d32f2f" }}>*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formationForm.titre}
                    onChange={(e) => setFormationForm({ ...formationForm, titre: e.target.value })}
                    style={{ width: "100%", padding: "10px", borderRadius: "4px", border: "1px solid #ddd" }}
                    placeholder="Ex: Formation sur la réglementation bancaire"
                  />
                </div>

                <div style={{ marginBottom: "16px" }}>
                  <label style={{ display: "block", marginBottom: "8px", fontWeight: "bold" }}>
                    Description <span style={{ color: "#999", fontWeight: "normal" }}>(optionnel)</span>
                  </label>
                  <textarea
                    value={formationForm.description}
                    onChange={(e) => setFormationForm({ ...formationForm, description: e.target.value })}
                    style={{
                      width: "100%",
                      padding: "10px",
                      borderRadius: "4px",
                      border: "1px solid #ddd",
                      minHeight: "80px",
                    }}
                    placeholder="Description de la formation..."
                  />
                </div>

                <div style={{ marginBottom: "20px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                    <label style={{ fontWeight: "bold", fontSize: "1.1rem" }}>Modules</label>
                    <button
                      type="button"
                      onClick={addModule}
                      style={{
                        padding: "6px 12px",
                        borderRadius: "4px",
                        border: "none",
                        backgroundColor: "#9c27b0",
                        color: "#fff",
                        cursor: "pointer",
                        fontSize: "0.9rem",
                      }}
                    >
                      + Ajouter un module
                    </button>
                  </div>

                  {/* Debug: Afficher le nombre de modules */}
                  {editingFormationId && (
                    <div style={{
                      padding: "12px",
                      marginBottom: "16px",
                      backgroundColor: "#e3f2fd",
                      borderRadius: "4px",
                      border: "1px solid #1976d2",
                      fontSize: "0.9rem",
                    }}>
                      <strong>🔍 Debug:</strong> Modules dans le formulaire: {formationForm.modules?.length || 0}
                      {formationForm.modules && formationForm.modules.length > 0 && (
                        <div style={{ marginTop: "8px" }}>
                          {formationForm.modules.map((m, idx) => (
                            <div key={idx} style={{ marginLeft: "16px", fontSize: "0.85rem" }}>
                              - Module {idx + 1}: {m.titre || "Sans titre"} ({m.chapitres?.length || 0} chapitres)
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {formationForm.modules && formationForm.modules.length > 0 ? (
                    formationForm.modules.map((module, moduleIndex) => {
                      console.log(`🔍 RENDU - Module ${moduleIndex}:`, module);
                      return (
                      <div
                      key={moduleIndex || module.id || `module-${moduleIndex}`}
                      style={{
                        marginBottom: "20px",
                        padding: "16px",
                        backgroundColor: "#fff",
                        borderRadius: "8px",
                        border: "1px solid #e0e0e0",
                      }}
                    >
                      <div className="org-module-header">
                        <h5 style={{ margin: 0, color: "#7b1fa2" }}>Module {moduleIndex + 1}</h5>
                        <div className="org-module-actions">
                          {editingFormationId && formationForm.modules[moduleIndex].id && (
                            <button
                              type="button"
                              onClick={async () => {
                                try {
                                  const nombreQuestions = prompt("Combien de questions QCM voulez-vous générer ?", "5");
                                  if (nombreQuestions && !isNaN(nombreQuestions)) {
                                    const response = await api.post(
                                      `/formations/${editingFormationId}/modules/${formationForm.modules[moduleIndex].id}/generate-qcm?nombre_questions=${nombreQuestions}`
                                    );
                                    alert(`✅ ${response.data.questions.length} questions QCM générées avec succès !`);
                                    // Recharger la formation pour voir les questions
                                    await handleEditFormation({ id: editingFormationId });
                                  }
                                } catch (err) {
                                  alert("Erreur: " + (err.response?.data?.detail || err.message));
                                }
                              }}
                              style={{
                                padding: "4px 10px",
                                borderRadius: "4px",
                                border: "none",
                                backgroundColor: "#4caf50",
                                color: "#fff",
                                cursor: "pointer",
                                fontSize: "0.8rem",
                              }}
                            >
                              📝 Générer QCM IA
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => removeModule(moduleIndex)}
                            style={{
                              padding: "4px 8px",
                              borderRadius: "4px",
                              border: "none",
                              backgroundColor: "#d32f2f",
                              color: "#fff",
                              cursor: "pointer",
                              fontSize: "0.85rem",
                            }}
                          >
                            Supprimer
                          </button>
                        </div>
                      </div>
                      
                      {module.questions_qcm && module.questions_qcm.length > 0 && (
                        <div style={{
                          marginBottom: "12px",
                          padding: "10px",
                          backgroundColor: "#fff3e0",
                          borderRadius: "4px",
                          border: "1px solid #f57c00",
                        }}>
                          <div style={{ fontWeight: "600", marginBottom: "6px", color: "#f57c00" }}>
                            ❓ Questions QCM générées ({module.questions_qcm.length}):
                          </div>
                          {module.questions_qcm.slice(0, 2).map((q, idx) => (
                            <div key={idx} style={{ fontSize: "0.85rem", marginBottom: "4px", color: "#666" }}>
                              {idx + 1}. {q.question}
                            </div>
                          ))}
                          {module.questions_qcm.length > 2 && (
                            <div style={{ fontSize: "0.8rem", color: "#999", fontStyle: "italic" }}>
                              ... et {module.questions_qcm.length - 2} autres questions
                            </div>
                          )}
                        </div>
                      )}

                      <div style={{ marginBottom: "12px" }}>
                        <label style={{ display: "block", marginBottom: "4px", fontWeight: "600" }}>
                          Titre du module <span style={{ color: "#d32f2f" }}>*</span>
                        </label>
                        <input
                          type="text"
                          required
                          value={module.titre}
                          onChange={(e) => updateModule(moduleIndex, "titre", e.target.value)}
                          style={{ width: "100%", padding: "8px", borderRadius: "4px", border: "1px solid #ddd" }}
                          placeholder="Ex: Module 1: Introduction à la banque"
                        />
                      </div>

                      <div style={{ marginBottom: "12px" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                          <label style={{ fontWeight: "600" }}>Chapitres</label>
                          <button
                            type="button"
                            onClick={() => addChapitre(moduleIndex)}
                            style={{
                              padding: "4px 10px",
                              borderRadius: "4px",
                              border: "none",
                              backgroundColor: "#7b1fa2",
                              color: "#fff",
                              cursor: "pointer",
                              fontSize: "0.85rem",
                            }}
                          >
                            + Ajouter un chapitre
                          </button>
                        </div>

                        {module.chapitres.map((chapitre, chapitreIndex) => (
                          <div
                            key={chapitreIndex}
                            style={{
                              marginBottom: "16px",
                              padding: "12px",
                              backgroundColor: "#f5f5f5",
                              borderRadius: "6px",
                              border: "1px solid #e0e0e0",
                            }}
                          >
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                              <h6 style={{ margin: 0, color: "#6a1b9a" }}>Chapitre {chapitreIndex + 1}</h6>
                              <div style={{ display: "flex", gap: "6px" }}>
                                {editingFormationId && chapitre.id && (
                                  <button
                                    type="button"
                                    onClick={async () => {
                                      try {
                                        if (!formationForm.modules[moduleIndex].id) {
                                          alert("Veuillez d'abord sauvegarder la formation pour générer le contenu.");
                                          return;
                                        }
                                        const response = await api.post(
                                          `/formations/${editingFormationId}/modules/${formationForm.modules[moduleIndex].id}/chapitres/${chapitre.id}/generate-content`
                                        );
                                        alert("✅ Contenu généré avec succès !");
                                        // Recharger la formation pour voir le contenu généré
                                        await handleEditFormation({ id: editingFormationId });
                                      } catch (err) {
                                        alert("Erreur: " + (err.response?.data?.detail || err.message));
                                      }
                                    }}
                                    style={{
                                      padding: "3px 8px",
                                      borderRadius: "4px",
                                      border: "none",
                                      backgroundColor: "#1976d2",
                                      color: "#fff",
                                      cursor: "pointer",
                                      fontSize: "0.75rem",
                                    }}
                                  >
                                    🤖 Générer contenu IA
                                  </button>
                                )}
                                <button
                                  type="button"
                                  onClick={() => removeChapitre(moduleIndex, chapitreIndex)}
                                  style={{
                                    padding: "3px 6px",
                                    borderRadius: "4px",
                                    border: "none",
                                    backgroundColor: "#d32f2f",
                                    color: "#fff",
                                    cursor: "pointer",
                                    fontSize: "0.8rem",
                                  }}
                                >
                                  Supprimer
                                </button>
                              </div>
                            </div>
                            
                            {chapitre.contenu_genere && (
                              <div style={{
                                marginBottom: "10px",
                                padding: "10px",
                                backgroundColor: "#e8f5e9",
                                borderRadius: "4px",
                                border: "1px solid #4caf50",
                              }}>
                                <div style={{ fontWeight: "600", marginBottom: "6px", color: "#2e7d32" }}>
                                  📝 Contenu généré par l'IA:
                                </div>
                                <div style={{ fontSize: "0.85rem", color: "#424242", whiteSpace: "pre-wrap" }}>
                                  {chapitre.contenu_genere.substring(0, 200)}...
                                </div>
                              </div>
                            )}

                            <div style={{ marginBottom: "10px" }}>
                              <label style={{ display: "block", marginBottom: "4px", fontWeight: "600", fontSize: "0.9rem" }}>
                                Introduction du chapitre <span style={{ color: "#d32f2f" }}>*</span>
                              </label>
                              <textarea
                                required
                                value={chapitre.introduction}
                                onChange={(e) =>
                                  updateChapitre(moduleIndex, chapitreIndex, "introduction", e.target.value)
                                }
                                style={{
                                  width: "100%",
                                  padding: "8px",
                                  borderRadius: "4px",
                                  border: "1px solid #ddd",
                                  minHeight: "60px",
                                }}
                                placeholder="Introduction du chapitre..."
                              />
                            </div>

                            <div>
                              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                                <label style={{ fontWeight: "600", fontSize: "0.9rem" }}>Parties</label>
                                <button
                                  type="button"
                                  onClick={() => addPartie(moduleIndex, chapitreIndex)}
                                  style={{
                                    padding: "3px 8px",
                                    borderRadius: "4px",
                                    border: "none",
                                    backgroundColor: "#6a1b9a",
                                    color: "#fff",
                                    cursor: "pointer",
                                    fontSize: "0.8rem",
                                  }}
                                >
                                  + Ajouter une partie
                                </button>
                              </div>

                              {chapitre.parties.map((partie, partieIndex) => (
                                <div
                                  key={partieIndex}
                                  style={{
                                    marginBottom: "12px",
                                    padding: "10px",
                                    backgroundColor: "#fff",
                                    borderRadius: "4px",
                                    border: "1px solid #ddd",
                                  }}
                                >
                                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                                    <span style={{ fontWeight: "600", fontSize: "0.85rem", color: "#5e35b1" }}>
                                      Partie {partieIndex + 1}
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() => removePartie(moduleIndex, chapitreIndex, partieIndex)}
                                      style={{
                                        padding: "2px 6px",
                                        borderRadius: "4px",
                                        border: "none",
                                        backgroundColor: "#d32f2f",
                                        color: "#fff",
                                        cursor: "pointer",
                                        fontSize: "0.75rem",
                                      }}
                                    >
                                      Supprimer
                                    </button>
                                  </div>

                                  <div style={{ marginBottom: "8px" }}>
                                    <label style={{ display: "block", marginBottom: "4px", fontSize: "0.85rem", fontWeight: "600" }}>
                                      Titre de la partie <span style={{ color: "#d32f2f" }}>*</span>
                                    </label>
                                    <input
                                      type="text"
                                      required
                                      value={partie.titre}
                                      onChange={(e) =>
                                        updatePartie(moduleIndex, chapitreIndex, partieIndex, "titre", e.target.value)
                                      }
                                      style={{ width: "100%", padding: "6px", borderRadius: "4px", border: "1px solid #ddd" }}
                                      placeholder="Ex: Introduction aux crédits"
                                    />
                                  </div>

                                  <div>
                                    <label style={{ display: "block", marginBottom: "4px", fontSize: "0.85rem", fontWeight: "600" }}>
                                      Contenu (Prompt pour l'IA) <span style={{ color: "#d32f2f" }}>*</span>
                                    </label>
                                    <textarea
                                      required
                                      value={partie.contenu}
                                      onChange={(e) =>
                                        updatePartie(moduleIndex, chapitreIndex, partieIndex, "contenu", e.target.value)
                                      }
                                      style={{
                                        width: "100%",
                                        padding: "8px",
                                        borderRadius: "4px",
                                        border: "1px solid #ddd",
                                        minHeight: "80px",
                                      }}
                                      placeholder="Prompt pour générer le contenu de cette partie avec l'IA..."
                                    />
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                      );
                    })
                  ) : (
                    <div style={{
                      padding: "24px",
                      textAlign: "center",
                      backgroundColor: "#f5f5f5",
                      borderRadius: "8px",
                      border: "2px dashed #e0e0e0",
                      color: "#999",
                      marginTop: "12px",
                    }}>
                      <p style={{ margin: 0 }}>📚 Aucun module pour le moment. Cliquez sur "+ Ajouter un module" pour commencer.</p>
                    </div>
                  )}
                </div>

                <div style={{ display: "flex", gap: "12px", justifyContent: "flex-end", marginTop: "20px" }}>
                  <button
                    type="button"
                    onClick={handleSaveDraft}
                    style={{
                      padding: "10px 24px",
                      borderRadius: "4px",
                      border: "1px solid #9c27b0",
                      backgroundColor: "#fff",
                      color: "#9c27b0",
                      cursor: "pointer",
                      fontWeight: "bold",
                      fontSize: "1rem",
                    }}
                  >
                    💾 Sauvegarder comme brouillon
                  </button>
                  <button
                    type="submit"
                    style={{
                      padding: "10px 24px",
                      borderRadius: "4px",
                      border: "none",
                      backgroundColor: "#9c27b0",
                      color: "#fff",
                      cursor: "pointer",
                      fontWeight: "bold",
                      fontSize: "1rem",
                    }}
                  >
                    {editingFormationId ? "Mettre à jour la formation" : "Créer la formation"}
                  </button>
                </div>
              </form>
            )}

            <div>
              <h4 style={{ marginBottom: "16px" }}>Liste des formations</h4>
              {formations.length === 0 ? (
                <p style={{ padding: "24px", textAlign: "center", color: "#999" }}>
                  Aucune formation créée pour le moment.
                </p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                  {formations.map((formation) => (
                    <div
                      key={formation.id}
                      style={{
                        padding: "16px",
                        backgroundColor: "#fff",
                        borderRadius: "8px",
                        border: "1px solid #e0e0e0",
                        boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
                      }}
                    >
                      <div className="org-card-header" style={{ alignItems: "flex-start" }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <h5 style={{ margin: "0 0 8px 0", color: "#9c27b0" }}>{formation.titre}</h5>
                          {formation.description && (
                            <p style={{ margin: "0 0 8px 0", color: "#666", fontSize: "0.9rem" }}>
                              {formation.description}
                            </p>
                          )}
                          <div style={{ display: "flex", gap: "16px", fontSize: "0.85rem", color: "#999" }}>
                            <span>📚 {formation.modules_count || 0} module(s)</span>
                            <span
                              style={{
                                padding: "2px 8px",
                                borderRadius: "4px",
                                backgroundColor:
                                  formation.status === "published"
                                    ? "#e8f5e9"
                                    : formation.status === "archived"
                                    ? "#f5f5f5"
                                    : "#fff3e0",
                                color:
                                  formation.status === "published"
                                    ? "#2e7d32"
                                    : formation.status === "archived"
                                    ? "#666"
                                    : "#f57c00",
                              }}
                            >
                              {formation.status === "published"
                                ? "Publiée"
                                : formation.status === "archived"
                                ? "Archivée"
                                : "Brouillon"}
                            </span>
                          </div>
                        </div>
                        <div className="org-module-actions">
                          <button
                            type="button"
                            onClick={() => handleEditFormation(formation)}
                            style={{
                              padding: "6px 12px",
                              borderRadius: "4px",
                              border: "1px solid #9c27b0",
                              backgroundColor: "#fff",
                              color: "#9c27b0",
                              cursor: "pointer",
                              fontWeight: "600",
                              fontSize: "0.9rem",
                            }}
                          >
                            Modifier
                          </button>
                          {formation.status === "draft" && (
                            <button
                              type="button"
                              onClick={() => handlePublishFormation(formation.id)}
                              style={{
                                padding: "6px 12px",
                                borderRadius: "4px",
                                border: "none",
                                backgroundColor: "#4caf50",
                                color: "#fff",
                                cursor: "pointer",
                                fontWeight: "600",
                                fontSize: "0.9rem",
                              }}
                            >
                              Publier
                            </button>
                          )}
                          {formation.status === "published" && (
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedFormationForAssign(formation);
                                setShowAssignForm(true);
                              }}
                              style={{
                                padding: "6px 12px",
                                borderRadius: "4px",
                                border: "none",
                                backgroundColor: "#1976d2",
                                color: "#fff",
                                cursor: "pointer",
                                fontWeight: "600",
                                fontSize: "0.9rem",
                              }}
                            >
                              Affecter aux départements
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Modal d'affectation aux départements */}
            {showAssignForm && selectedFormationForAssign && (
              <div
                className="org-modal-overlay"
                onClick={() => {
                  setShowAssignForm(false);
                  setSelectedFormationForAssign(null);
                  setSelectedDepartments([]);
                }}
              >
                <div
                  className="org-modal-content"
                  onClick={(e) => e.stopPropagation()}
                >
                  <h3 style={{ marginTop: 0 }}>Affecter la formation aux départements</h3>
                  <p style={{ marginBottom: "16px", color: "#666" }}>
                    Sélectionnez les départements qui auront accès à cette formation :
                  </p>
                  <div style={{ marginBottom: "16px" }}>
                    {departments.map((dept) => (
                      <label
                        key={dept.id}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          marginBottom: "8px",
                          cursor: "pointer",
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={selectedDepartments.includes(dept.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedDepartments([...selectedDepartments, dept.id]);
                            } else {
                              setSelectedDepartments(selectedDepartments.filter((id) => id !== dept.id));
                            }
                          }}
                          style={{ marginRight: "8px" }}
                        />
                        <span>
                          {dept.name} ({dept.code})
                        </span>
                      </label>
                    ))}
                  </div>
                  <div className="org-modal-actions">
                    <button
                      type="button"
                      onClick={() => {
                        setShowAssignForm(false);
                        setSelectedFormationForAssign(null);
                        setSelectedDepartments([]);
                      }}
                      style={{
                        padding: "8px 16px",
                        borderRadius: "4px",
                        border: "1px solid #ddd",
                        backgroundColor: "#fff",
                        cursor: "pointer",
                      }}
                    >
                      Annuler
                    </button>
                    <button
                      type="button"
                      onClick={async () => {
                        try {
                          await api.post(`/formations/${selectedFormationForAssign.id}/assign-departments`, {
                            formation_id: selectedFormationForAssign.id,
                            department_ids: selectedDepartments,
                          });
                          alert("Formation affectée aux départements avec succès !");
                          setShowAssignForm(false);
                          setSelectedFormationForAssign(null);
                          setSelectedDepartments([]);
                        } catch (err) {
                          alert("Erreur: " + (err.response?.data?.detail || err.message));
                        }
                      }}
                      disabled={selectedDepartments.length === 0}
                      style={{
                        padding: "8px 16px",
                        borderRadius: "4px",
                        border: "none",
                        backgroundColor: selectedDepartments.length === 0 ? "#ccc" : "#1976d2",
                        color: "#fff",
                        cursor: selectedDepartments.length === 0 ? "not-allowed" : "pointer",
                      }}
                    >
                      Confirmer
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Onglet Ressources */}
        {activeTab === "stock" && (
          <StockManagementTab />
        )}

        {activeTab === "ressources" && (
          <div>
            <div className="org-section-header" style={{ marginBottom: "24px" }}>
              <h3>📋 Ressources de l'organisation</h3>
              <button
                type="button"
                onClick={() => {
                  setShowRessourceForm(true);
                  setEditingRessourceId(null);
                  setRessourceForm({ titre: "", description: "", template_memo: "" });
                }}
                style={{
                  padding: "10px 20px",
                  borderRadius: "6px",
                  border: "none",
                  backgroundColor: "#0288d1",
                  color: "#fff",
                  cursor: "pointer",
                  fontWeight: "600",
                  fontSize: "0.95rem",
                }}
              >
                + Créer une ressource
              </button>
            </div>

            {/* Formulaire de création/édition de ressource */}
            {showRessourceForm && (
              <div style={{
                marginBottom: "24px",
                padding: "24px",
                backgroundColor: "#f9f9f9",
                borderRadius: "8px",
                border: "1px solid #e0e0e0",
              }}>
                <h4 style={{ marginTop: 0, marginBottom: "16px", color: "#0288d1" }}>
                  {editingRessourceId ? "✏️ Modifier la ressource" : "➕ Créer une nouvelle ressource"}
                </h4>
                <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                  <div>
                    <label style={{ display: "block", marginBottom: "8px", fontWeight: "600", color: "#333" }}>
                      Titre de la ressource *
                    </label>
                    <input
                      type="text"
                      value={ressourceForm.titre}
                      onChange={(e) => setRessourceForm({ ...ressourceForm, titre: e.target.value })}
                      placeholder="Ex: Demande de congé, Demande d'attestation de travail..."
                      style={{
                        width: "100%",
                        padding: "10px",
                        borderRadius: "6px",
                        border: "1px solid #ddd",
                        fontSize: "0.95rem",
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ display: "block", marginBottom: "8px", fontWeight: "600", color: "#333" }}>
                      Description
                    </label>
                    <textarea
                      value={ressourceForm.description}
                      onChange={(e) => setRessourceForm({ ...ressourceForm, description: e.target.value })}
                      placeholder="Description de la ressource..."
                      rows={3}
                      style={{
                        width: "100%",
                        padding: "10px",
                        borderRadius: "6px",
                        border: "1px solid #ddd",
                        fontSize: "0.95rem",
                        resize: "vertical",
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ display: "block", marginBottom: "8px", fontWeight: "600", color: "#333" }}>
                      Fichier à uploader *
                    </label>
                    <div style={{
                      padding: "20px",
                      border: "2px dashed #ddd",
                      borderRadius: "8px",
                      backgroundColor: "#fafafa",
                      textAlign: "center",
                      transition: "all 0.3s ease",
                    }}
                    onDragOver={(e) => {
                      e.preventDefault();
                      e.currentTarget.style.borderColor = "#0288d1";
                      e.currentTarget.style.backgroundColor = "#e1f5fe";
                    }}
                    onDragLeave={(e) => {
                      e.currentTarget.style.borderColor = "#ddd";
                      e.currentTarget.style.backgroundColor = "#fafafa";
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      e.currentTarget.style.borderColor = "#ddd";
                      e.currentTarget.style.backgroundColor = "#fafafa";
                      const file = e.dataTransfer.files[0];
                      if (file) {
                        setRessourceForm({ ...ressourceForm, file });
                      }
                    }}
                    >
                      <input
                        type="file"
                        id="ressource-file-input"
                        onChange={(e) => {
                          const file = e.target.files[0];
                          if (file) {
                            setRessourceForm({ ...ressourceForm, file });
                          }
                        }}
                        style={{ display: "none" }}
                        accept=".pdf,.doc,.docx,.xls,.xlsx,.txt,.rtf"
                      />
                      {ressourceForm.file ? (
                        <div>
                          <div style={{ fontSize: "2rem", marginBottom: "8px" }}>📄</div>
                          <p style={{ margin: "8px 0", color: "#333", fontWeight: "600" }}>
                            {ressourceForm.file.name} <span style={{ color: "#0288d1", fontSize: "0.85rem" }}>(nouveau fichier)</span>
                          </p>
                          <p style={{ margin: "4px 0", color: "#666", fontSize: "0.85rem" }}>
                            {(ressourceForm.file.size / 1024 / 1024).toFixed(2)} MB
                          </p>
                          <button
                            type="button"
                            onClick={() => {
                              setRessourceForm({ ...ressourceForm, file: null });
                              document.getElementById("ressource-file-input").value = "";
                            }}
                            style={{
                              marginTop: "8px",
                              padding: "6px 12px",
                              borderRadius: "4px",
                              border: "1px solid #d32f2f",
                              backgroundColor: "#fff",
                              color: "#d32f2f",
                              cursor: "pointer",
                              fontSize: "0.85rem",
                            }}
                          >
                            ✕ Retirer le nouveau fichier
                          </button>
                        </div>
                      ) : editingRessourceId && currentRessource ? (
                        <div>
                          <div style={{ 
                            padding: "16px", 
                            backgroundColor: "#e3f2fd", 
                            borderRadius: "8px", 
                            border: "1px solid #90caf9",
                            marginBottom: "12px"
                          }}>
                            <div style={{ display: "flex", alignItems: "center", marginBottom: "8px" }}>
                              <span style={{ fontSize: "1.5rem", marginRight: "8px" }}>📎</span>
                              <div style={{ flex: 1 }}>
                                <p style={{ margin: "0", color: "#333", fontWeight: "600", fontSize: "0.95rem" }}>
                                  Fichier actuel : {currentRessource.filename || currentRessource.file_name || "Fichier"}
                                </p>
                                {currentRessource.file_size && (
                                  <p style={{ margin: "4px 0 0 0", color: "#666", fontSize: "0.85rem" }}>
                                    Taille : {(currentRessource.file_size / 1024 / 1024).toFixed(2)} MB
                                  </p>
                                )}
                              </div>
                            </div>
                            <p style={{ margin: "8px 0 0 0", color: "#666", fontSize: "0.85rem", fontStyle: "italic" }}>
                              💡 Laissez ce fichier tel quel ou choisissez un nouveau fichier pour le remplacer
                            </p>
                          </div>
                          <div style={{ 
                            padding: "12px", 
                            backgroundColor: "#f5f5f5", 
                            borderRadius: "6px",
                            border: "1px dashed #ddd"
                          }}>
                            <p style={{ margin: "0 0 8px 0", color: "#666", fontSize: "0.9rem", fontWeight: "600" }}>
                              Ou choisir un nouveau fichier :
                            </p>
                            <label
                              htmlFor="ressource-file-input"
                              style={{
                                display: "inline-block",
                                padding: "8px 16px",
                                borderRadius: "6px",
                                border: "1px solid #0288d1",
                                backgroundColor: "#0288d1",
                                color: "#fff",
                                cursor: "pointer",
                                fontSize: "0.9rem",
                                fontWeight: "600",
                              }}
                            >
                              📁 Choisir un nouveau fichier
                            </label>
                          </div>
                        </div>
                      ) : (
                        <div>
                          <div style={{ fontSize: "3rem", marginBottom: "12px" }}>📤</div>
                          <p style={{ margin: "8px 0", color: "#666" }}>
                            Glissez-déposez un fichier ici ou
                          </p>
                          <label
                            htmlFor="ressource-file-input"
                            style={{
                              display: "inline-block",
                              marginTop: "8px",
                              padding: "10px 20px",
                              borderRadius: "6px",
                              border: "1px solid #0288d1",
                              backgroundColor: "#0288d1",
                              color: "#fff",
                              cursor: "pointer",
                              fontSize: "0.95rem",
                              fontWeight: "600",
                            }}
                          >
                            📁 Choisir un fichier
                          </label>
                          <p style={{ margin: "12px 0 0 0", color: "#999", fontSize: "0.85rem" }}>
                            Formats acceptés: PDF, Word, Excel, TXT, RTF
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
                    <button
                      type="button"
                      onClick={() => {
                        setShowRessourceForm(false);
                        setEditingRessourceId(null);
                        setCurrentRessource(null);
                        setRessourceForm({ titre: "", description: "", file: null });
                        const fileInput = document.getElementById("ressource-file-input");
                        if (fileInput) fileInput.value = "";
                      }}
                      style={{
                        padding: "10px 20px",
                        borderRadius: "6px",
                        border: "1px solid #ddd",
                        backgroundColor: "#fff",
                        cursor: "pointer",
                        fontSize: "0.95rem",
                      }}
                    >
                      Annuler
                    </button>
                    <button
                      type="button"
                      onClick={editingRessourceId ? handleUpdateRessource : handleCreateRessource}
                      disabled={!ressourceForm.titre.trim() || (!ressourceForm.file && !editingRessourceId) || uploadingRessource}
                      style={{
                        padding: "10px 20px",
                        borderRadius: "6px",
                        border: "none",
                        backgroundColor: (!ressourceForm.titre.trim() || (!ressourceForm.file && !editingRessourceId) || uploadingRessource) ? "#ccc" : "#0288d1",
                        color: "#fff",
                        cursor: (!ressourceForm.titre.trim() || (!ressourceForm.file && !editingRessourceId) || uploadingRessource) ? "not-allowed" : "pointer",
                        fontSize: "0.95rem",
                        fontWeight: "600",
                      }}
                    >
                      {uploadingRessource ? "⏳ Upload en cours..." : editingRessourceId ? "Modifier" : "Uploader"}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Liste des ressources */}
            {ressources.length === 0 ? (
              <div style={{
                padding: "60px 24px",
                textAlign: "center",
                backgroundColor: "#f9f9f9",
                borderRadius: "8px",
                border: "2px dashed #e0e0e0",
              }}>
                <div style={{ fontSize: "48px", marginBottom: "16px" }}>📋</div>
                <p style={{ margin: 0, color: "#666", fontSize: "1.1rem", fontWeight: "500" }}>
                  Aucune ressource créée pour le moment.
                </p>
                <p style={{ margin: "8px 0 0 0", color: "#999", fontSize: "0.9rem" }}>
                  Créez votre première ressource pour commencer.
                </p>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                {ressources.map((ressource) => (
                  <div
                    key={ressource.id}
                    style={{
                      padding: "20px",
                      border: "1px solid #e0e0e0",
                      borderRadius: "8px",
                      backgroundColor: "#fff",
                      boxShadow: "0 2px 4px rgba(0,0,0,0.05)",
                    }}
                  >
                    <div className="org-card-header" style={{ alignItems: "flex-start" }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <h4 style={{ margin: "0 0 8px 0", color: "#0288d1", fontSize: "1.2rem" }}>
                          {ressource.titre}
                        </h4>
                        {ressource.description && (
                          <p style={{ margin: "0 0 12px 0", color: "#666", fontSize: "0.95rem" }}>
                            {ressource.description}
                          </p>
                        )}
                        <div style={{ fontSize: "0.85rem", color: "#999" }}>
                          <span>📄 {ressource.filename || ressource.file_name || "Fichier disponible"}</span>
                          {ressource.file_size && (
                            <span style={{ marginLeft: "12px" }}>
                              ({(ressource.file_size / 1024 / 1024).toFixed(2)} MB)
                            </span>
                          )}
                          {ressource.departments && ressource.departments.length > 0 && (
                            <span style={{ marginLeft: "16px" }}>
                              📌 Affectée à {ressource.departments.length} département(s)
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="org-module-actions">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedRessourceForAssign(ressource);
                            setSelectedDepartmentsForRessource(ressource.departments?.map(d => d.id) || []);
                            setShowAssignRessourceForm(true);
                          }}
                          style={{
                            padding: "6px 12px",
                            borderRadius: "4px",
                            border: "1px solid #0288d1",
                            backgroundColor: "#fff",
                            color: "#0288d1",
                            cursor: "pointer",
                            fontSize: "0.85rem",
                            fontWeight: "600",
                          }}
                        >
                          📌 Affecter
                        </button>
                        <button
                          type="button"
                          onClick={() => handleEditRessource(ressource)}
                          style={{
                            padding: "6px 12px",
                            borderRadius: "4px",
                            border: "1px solid #666",
                            backgroundColor: "#fff",
                            color: "#666",
                            cursor: "pointer",
                            fontSize: "0.85rem",
                            fontWeight: "600",
                          }}
                        >
                          ✏️ Modifier
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteRessource(ressource.id)}
                          style={{
                            padding: "6px 12px",
                            borderRadius: "4px",
                            border: "1px solid #d32f2f",
                            backgroundColor: "#fff",
                            color: "#d32f2f",
                            cursor: "pointer",
                            fontSize: "0.85rem",
                            fontWeight: "600",
                          }}
                        >
                          🗑️ Supprimer
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Modal d'affectation aux départements */}
            {showAssignRessourceForm && selectedRessourceForAssign && (
              <div
                className="org-modal-overlay"
                onClick={() => {
                  setShowAssignRessourceForm(false);
                  setSelectedRessourceForAssign(null);
                  setSelectedDepartmentsForRessource([]);
                }}
              >
                <div
                  className="org-modal-content"
                  style={{ maxWidth: "600px" }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <h3 style={{ marginTop: 0, marginBottom: "16px", color: "#0288d1" }}>
                    Affecter "{selectedRessourceForAssign.titre}" aux départements
                  </h3>
                  <p style={{ marginBottom: "16px", color: "#666", fontSize: "0.9rem" }}>
                    Sélectionnez les départements qui auront accès à cette ressource :
                  </p>
                  <div style={{ maxHeight: "400px", overflowY: "auto", marginBottom: "16px" }}>
                    {departments.map((dept) => (
                      <label
                        key={dept.id}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          padding: "12px",
                          marginBottom: "8px",
                          backgroundColor: selectedDepartmentsForRessource.includes(dept.id) ? "#e1f5fe" : "#f9f9f9",
                          borderRadius: "6px",
                          cursor: "pointer",
                          transition: "background-color 0.2s ease",
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={selectedDepartmentsForRessource.includes(dept.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedDepartmentsForRessource([...selectedDepartmentsForRessource, dept.id]);
                            } else {
                              setSelectedDepartmentsForRessource(selectedDepartmentsForRessource.filter((id) => id !== dept.id));
                            }
                          }}
                          style={{ marginRight: "12px", width: "18px", height: "18px" }}
                        />
                        <span style={{ fontSize: "0.95rem", fontWeight: selectedDepartmentsForRessource.includes(dept.id) ? "600" : "normal" }}>
                          {dept.name} ({dept.code})
                        </span>
                      </label>
                    ))}
                  </div>
                  <div className="org-modal-actions">
                    <button
                      type="button"
                      onClick={() => {
                        setShowAssignRessourceForm(false);
                        setSelectedRessourceForAssign(null);
                        setSelectedDepartmentsForRessource([]);
                      }}
                      style={{
                        padding: "10px 20px",
                        borderRadius: "6px",
                        border: "1px solid #ddd",
                        backgroundColor: "#fff",
                        cursor: "pointer",
                        fontSize: "0.95rem",
                      }}
                    >
                      Annuler
                    </button>
                    <button
                      type="button"
                      onClick={handleAssignRessourceToDepartments}
                      disabled={selectedDepartmentsForRessource.length === 0}
                      style={{
                        padding: "10px 20px",
                        borderRadius: "6px",
                        border: "none",
                        backgroundColor: selectedDepartmentsForRessource.length === 0 ? "#ccc" : "#0288d1",
                        color: "#fff",
                        cursor: selectedDepartmentsForRessource.length === 0 ? "not-allowed" : "pointer",
                        fontSize: "0.95rem",
                        fontWeight: "600",
                      }}
                    >
                      Confirmer
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default OrgAdminDashboardPage;

