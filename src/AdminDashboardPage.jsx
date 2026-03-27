// src/AdminDashboardPage.jsx
import React, { useEffect, useState } from "react";
import api from "./api";

function AdminDashboardPage({ onLogout }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("organizations");
  
  // États pour les organisations
  const [organizations, setOrganizations] = useState([]);
  const [showOrgForm, setShowOrgForm] = useState(false);
  const [editingOrgId, setEditingOrgId] = useState(null);
  const [orgForm, setOrgForm] = useState({ name: "", code: "", country: "FR", status: "active" });
  
  // États pour les licences
  const [licenses, setLicenses] = useState([]);
  const [showLicenseForm, setShowLicenseForm] = useState(false);
  const [editingLicenseId, setEditingLicenseId] = useState(null);
  const [licenseForm, setLicenseForm] = useState({
    organization_id: "",
    plan: "Standard",
    max_users: 50,
    start_date: "",
    end_date: "",
    status: "active",
    features: [],
  });
  
  // États pour les utilisateurs
  const [users, setUsers] = useState([]);
  const [showUserForm, setShowUserForm] = useState(false);
  const [editingUserId, setEditingUserId] = useState(null);
  const [userForm, setUserForm] = useState({
    email: "",
    full_name: "",
    password: "",
    organization_id: "",
    role: "user",
  });

  useEffect(() => {
    fetchUser();
    fetchOrganizations();
    fetchLicenses();
    fetchUsers();
  }, []);

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

  const fetchOrganizations = async () => {
    try {
      const response = await api.get("/organizations");
      setOrganizations(response.data);
    } catch (err) {
      console.error("Erreur lors de la récupération des organisations:", err);
    }
  };

  const fetchLicenses = async () => {
    try {
      const response = await api.get("/licenses");
      setLicenses(response.data);
    } catch (err) {
      console.error("Erreur lors de la récupération des licences:", err);
    }
  };

  const fetchUsers = async () => {
    try {
      const response = await api.get("/auth/users");
      setUsers(response.data);
    } catch (err) {
      console.error("Erreur lors de la récupération des utilisateurs:", err);
    }
  };

  const handleCreateOrganization = async (e) => {
    e.preventDefault();
    try {
      if (editingOrgId) {
        await api.put(`/organizations/${editingOrgId}`, orgForm);
        alert("Organisation modifiée avec succès !");
      } else {
        await api.post("/organizations", orgForm);
        alert("Organisation créée avec succès !");
      }
      setOrgForm({ name: "", code: "", country: "FR", status: "active" });
      setShowOrgForm(false);
      setEditingOrgId(null);
      fetchOrganizations();
    } catch (err) {
      alert("Erreur: " + (err.response?.data?.detail || err.message));
    }
  };

  const handleEditOrganization = (org) => {
    setOrgForm({
      name: org.name,
      code: org.code,
      country: org.country || "FR",
      status: org.status || "active",
    });
    setEditingOrgId(org.id);
    setShowOrgForm(true);
  };

  const handleCancelOrgForm = () => {
    setOrgForm({ name: "", code: "", country: "FR", status: "active" });
    setShowOrgForm(false);
    setEditingOrgId(null);
  };

  const handleCreateLicense = async (e) => {
    e.preventDefault();
    try {
      if (editingLicenseId) {
        await api.put(`/licenses/${editingLicenseId}`, licenseForm);
        alert("Licence modifiée avec succès !");
      } else {
        await api.post("/licenses", licenseForm);
        alert("Licence créée avec succès !");
      }
      setLicenseForm({
        organization_id: "",
        plan: "Standard",
        max_users: 50,
        start_date: "",
        end_date: "",
        status: "active",
        features: [],
      });
      setShowLicenseForm(false);
      setEditingLicenseId(null);
      fetchLicenses();
    } catch (err) {
      alert("Erreur: " + (err.response?.data?.detail || err.message));
    }
  };

  const handleEditLicense = (license) => {
    // Formater les dates pour l'input date (YYYY-MM-DD)
    const formatDateForInput = (dateStr) => {
      if (!dateStr) return "";
      const date = new Date(dateStr);
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const day = String(date.getDate()).padStart(2, "0");
      return `${year}-${month}-${day}`;
    };
    
    setLicenseForm({
      organization_id: license.organization_id,
      plan: license.plan,
      max_users: license.max_users,
      start_date: formatDateForInput(license.start_date),
      end_date: formatDateForInput(license.end_date),
      status: license.status || "active",
      features: license.features || [],
    });
    setEditingLicenseId(license.id);
    setShowLicenseForm(true);
  };

  const handleCancelLicenseForm = () => {
    setLicenseForm({
      organization_id: "",
      plan: "Standard",
      max_users: 50,
      start_date: "",
      end_date: "",
      status: "active",
      features: [],
    });
    setShowLicenseForm(false);
    setEditingLicenseId(null);
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    try {
      if (editingUserId) {
        // Pour la mise à jour, ne pas envoyer le mot de passe s'il est vide
        const updateData = { ...userForm };
        if (!updateData.password) {
          delete updateData.password;
        }
        await api.put(`/auth/users/${editingUserId}`, updateData);
        alert("Utilisateur modifié avec succès !");
      } else {
        await api.post("/auth/register", userForm);
        alert("Utilisateur créé avec succès !");
      }
      setUserForm({
        email: "",
        full_name: "",
        password: "",
        organization_id: "",
        role: "user",
      });
      setShowUserForm(false);
      setEditingUserId(null);
      fetchUsers();
    } catch (err) {
      alert("Erreur: " + (err.response?.data?.detail || err.message));
    }
  };

  const handleEditUser = (userToEdit) => {
    // Ne pas permettre l'édition du super admin
    if (userToEdit.role === "superadmin") {
      alert("Le super administrateur ne peut pas être modifié.");
      return;
    }
    setUserForm({
      email: userToEdit.email,
      full_name: userToEdit.full_name,
      password: "", // Ne pas pré-remplir le mot de passe
      organization_id: userToEdit.organization_id || "",
      role: userToEdit.role || "user",
    });
    setEditingUserId(userToEdit.id);
    setShowUserForm(true);
  };

  const handleCancelUserForm = () => {
    setUserForm({
      email: "",
      full_name: "",
      password: "",
      organization_id: "",
      role: "user",
    });
    setShowUserForm(false);
    setEditingUserId(null);
  };

  const handleLogout = () => {
    localStorage.removeItem("access_token");
    if (onLogout) {
      onLogout();
    }
  };

  const getOrgName = (orgId) => {
    const org = organizations.find((o) => o.id === orgId);
    return org ? org.name : orgId;
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "N/A";
    const date = new Date(dateStr);
    return date.toLocaleDateString("fr-FR");
  };

  if (loading) {
    return (
      <div style={{ padding: "24px", textAlign: "center" }}>
        <p>Chargement...</p>
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        padding: "24px",
        backgroundColor: "#f5f5f5",
      }}
    >
      <div
        style={{
          maxWidth: "1400px",
          margin: "0 auto",
          background: "#ffffff",
          padding: "24px",
          borderRadius: "8px",
          boxShadow: "0 4px 10px rgba(0,0,0,0.08)",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "24px",
            paddingBottom: "16px",
            borderBottom: "2px solid #e0e0e0",
          }}
        >
          <div>
            <h2 style={{ margin: 0 }}>🔑 Dashboard Super Administrateur</h2>
            {user && (
              <p style={{ margin: "4px 0 0 0", color: "#666" }}>
                {user.full_name} ({user.email})
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={handleLogout}
            style={{
              padding: "8px 16px",
              borderRadius: "4px",
              border: "1px solid #b00020",
              backgroundColor: "#fff",
              color: "#b00020",
              cursor: "pointer",
              fontWeight: "bold",
            }}
          >
            Déconnexion
          </button>
        </div>

        {error && (
          <div
            style={{
              marginBottom: "16px",
              padding: "12px",
              backgroundColor: "#ffe6e6",
              color: "#b00020",
              borderRadius: "4px",
            }}
          >
            {error}
          </div>
        )}

        {/* Onglets */}
        <div
          style={{
            display: "flex",
            borderBottom: "2px solid #e0e0e0",
            marginBottom: "24px",
          }}
        >
          {[
            { id: "organizations", label: "Organisations", count: organizations.length },
            { id: "licenses", label: "Licences", count: licenses.length },
            { id: "users", label: "Administrateurs", count: users.length },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              style={{
                padding: "12px 24px",
                border: "none",
                borderBottom: activeTab === tab.id ? "3px solid #1976d2" : "3px solid transparent",
                backgroundColor: "transparent",
                color: activeTab === tab.id ? "#1976d2" : "#666",
                cursor: "pointer",
                fontWeight: activeTab === tab.id ? "bold" : "normal",
                fontSize: "16px",
                position: "relative",
                bottom: "-2px",
              }}
            >
              {tab.label} ({tab.count})
            </button>
          ))}
        </div>

        {/* Contenu des onglets */}
        {activeTab === "organizations" && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <h3>Organisations (Banques)</h3>
              <button
                type="button"
                onClick={() => {
                  if (showOrgForm) {
                    handleCancelOrgForm();
                  } else {
                    setShowOrgForm(true);
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
                {showOrgForm ? "Annuler" : "+ Créer une organisation"}
              </button>
            </div>

            {showOrgForm && (
              <form
                onSubmit={handleCreateOrganization}
                style={{
                  padding: "16px",
                  backgroundColor: "#f9f9f9",
                  borderRadius: "4px",
                  marginBottom: "16px",
                }}
              >
                <div style={{ marginBottom: "12px" }}>
                  <label style={{ display: "block", marginBottom: "4px", fontWeight: "bold" }}>
                    Nom de l'organisation
                  </label>
                  <input
                    type="text"
                    required
                    value={orgForm.name}
                    onChange={(e) => setOrgForm({ ...orgForm, name: e.target.value })}
                    style={{ width: "100%", padding: "8px", borderRadius: "4px", border: "1px solid #ddd" }}
                    placeholder="Ex: Banque Populaire"
                  />
                </div>
                <div style={{ marginBottom: "12px" }}>
                  <label style={{ display: "block", marginBottom: "4px", fontWeight: "bold" }}>
                    Code
                  </label>
                  <input
                    type="text"
                    required
                    value={orgForm.code}
                    onChange={(e) => setOrgForm({ ...orgForm, code: e.target.value.toUpperCase() })}
                    style={{ width: "100%", padding: "8px", borderRadius: "4px", border: "1px solid #ddd" }}
                    placeholder="Ex: BP"
                  />
                </div>
                <div style={{ marginBottom: "12px" }}>
                  <label style={{ display: "block", marginBottom: "4px", fontWeight: "bold" }}>
                    Pays
                  </label>
                  <input
                    type="text"
                    required
                    value={orgForm.country}
                    onChange={(e) => setOrgForm({ ...orgForm, country: e.target.value })}
                    style={{ width: "100%", padding: "8px", borderRadius: "4px", border: "1px solid #ddd" }}
                    placeholder="Ex: FR"
                  />
                </div>
                <div style={{ marginBottom: "12px" }}>
                  <label style={{ display: "block", marginBottom: "4px", fontWeight: "bold" }}>
                    Statut
                  </label>
                  <select
                    required
                    value={orgForm.status || "active"}
                    onChange={(e) => setOrgForm({ ...orgForm, status: e.target.value })}
                    style={{ width: "100%", padding: "8px", borderRadius: "4px", border: "1px solid #ddd" }}
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                    <option value="suspended">Suspendue</option>
                  </select>
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
                  {editingOrgId ? "Modifier l'organisation" : "Créer l'organisation"}
                </button>
              </form>
            )}

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "16px" }}>
              {organizations.map((org) => (
                <div
                  key={org.id}
                  style={{
                    padding: "16px",
                    border: "1px solid #e0e0e0",
                    borderRadius: "4px",
                    backgroundColor: "#fafafa",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: "8px" }}>
                    <h4 style={{ margin: 0 }}>{org.name}</h4>
                    <button
                      type="button"
                      onClick={() => handleEditOrganization(org)}
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
                    Code: <strong>{org.code}</strong>
                  </p>
                  <p style={{ margin: "4px 0", fontSize: "0.9rem", color: "#666" }}>
                    Pays: <strong>{org.country}</strong>
                  </p>
                  <p style={{ margin: "4px 0", fontSize: "0.9rem", color: "#666" }}>
                    Statut: <strong style={{ color: org.status === "active" ? "#388e3c" : "#f57c00" }}>
                      {org.status || "active"}
                    </strong>
                  </p>
                  <p style={{ margin: "4px 0", fontSize: "0.8rem", color: "#999" }}>
                    ID: <code>{org.id}</code>
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === "licenses" && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <h3>Licences</h3>
              <button
                type="button"
                onClick={() => {
                  if (showLicenseForm) {
                    handleCancelLicenseForm();
                  } else {
                    setShowLicenseForm(true);
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
                {showLicenseForm ? "Annuler" : "+ Créer une licence"}
              </button>
            </div>

            {showLicenseForm && (
              <form
                onSubmit={handleCreateLicense}
                style={{
                  padding: "16px",
                  backgroundColor: "#f9f9f9",
                  borderRadius: "4px",
                  marginBottom: "16px",
                }}
              >
                <div style={{ marginBottom: "12px" }}>
                  <label style={{ display: "block", marginBottom: "4px", fontWeight: "bold" }}>
                    Organisation
                  </label>
                  <select
                    required
                    value={licenseForm.organization_id}
                    onChange={(e) => setLicenseForm({ ...licenseForm, organization_id: e.target.value })}
                    style={{ width: "100%", padding: "8px", borderRadius: "4px", border: "1px solid #ddd" }}
                  >
                    <option value="">Sélectionner une organisation</option>
                    {organizations.map((org) => (
                      <option key={org.id} value={org.id}>
                        {org.name} ({org.code})
                      </option>
                    ))}
                  </select>
                </div>
                <div style={{ marginBottom: "12px" }}>
                  <label style={{ display: "block", marginBottom: "4px", fontWeight: "bold" }}>
                    Plan
                  </label>
                  <select
                    required
                    value={licenseForm.plan}
                    onChange={(e) => setLicenseForm({ ...licenseForm, plan: e.target.value })}
                    style={{ width: "100%", padding: "8px", borderRadius: "4px", border: "1px solid #ddd" }}
                  >
                    <option value="Standard">Standard</option>
                    <option value="Pro">Pro</option>
                    <option value="Enterprise">Enterprise</option>
                  </select>
                </div>
                <div style={{ marginBottom: "12px" }}>
                  <label style={{ display: "block", marginBottom: "4px", fontWeight: "bold" }}>
                    Nombre max d'utilisateurs
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={licenseForm.max_users}
                    onChange={(e) => setLicenseForm({ ...licenseForm, max_users: parseInt(e.target.value) })}
                    style={{ width: "100%", padding: "8px", borderRadius: "4px", border: "1px solid #ddd" }}
                  />
                </div>
                <div style={{ marginBottom: "12px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                  <div>
                    <label style={{ display: "block", marginBottom: "4px", fontWeight: "bold" }}>
                      Date de début
                    </label>
                    <input
                      type="date"
                      required
                      value={licenseForm.start_date}
                      onChange={(e) => setLicenseForm({ ...licenseForm, start_date: e.target.value })}
                      style={{ width: "100%", padding: "8px", borderRadius: "4px", border: "1px solid #ddd" }}
                    />
                  </div>
                  <div>
                    <label style={{ display: "block", marginBottom: "4px", fontWeight: "bold" }}>
                      Date de fin
                    </label>
                    <input
                      type="date"
                      required
                      value={licenseForm.end_date}
                      onChange={(e) => setLicenseForm({ ...licenseForm, end_date: e.target.value })}
                      style={{ width: "100%", padding: "8px", borderRadius: "4px", border: "1px solid #ddd" }}
                    />
                  </div>
                </div>
                <div style={{ marginBottom: "12px" }}>
                  <label style={{ display: "block", marginBottom: "4px", fontWeight: "bold" }}>
                    Statut
                  </label>
                  <select
                    required
                    value={licenseForm.status}
                    onChange={(e) => setLicenseForm({ ...licenseForm, status: e.target.value })}
                    style={{ width: "100%", padding: "8px", borderRadius: "4px", border: "1px solid #ddd" }}
                  >
                    <option value="active">Active</option>
                    <option value="expired">Expirée</option>
                    <option value="suspended">Suspendue</option>
                  </select>
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
                  {editingLicenseId ? "Modifier la licence" : "Créer la licence"}
                </button>
              </form>
            )}

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(350px, 1fr))", gap: "16px" }}>
              {licenses.map((license) => (
                <div
                  key={license.id}
                  style={{
                    padding: "16px",
                    border: "1px solid #e0e0e0",
                    borderRadius: "4px",
                    backgroundColor: "#fafafa",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: "8px" }}>
                    <h4 style={{ margin: 0 }}>Plan {license.plan}</h4>
                    <button
                      type="button"
                      onClick={() => handleEditLicense(license)}
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
                    Organisation: <strong>{getOrgName(license.organization_id)}</strong>
                  </p>
                  <p style={{ margin: "4px 0", fontSize: "0.9rem", color: "#666" }}>
                    Max utilisateurs: <strong>{license.max_users}</strong>
                  </p>
                  <p style={{ margin: "4px 0", fontSize: "0.9rem", color: "#666" }}>
                    Du {formatDate(license.start_date)} au {formatDate(license.end_date)}
                  </p>
                  <p style={{ margin: "4px 0", fontSize: "0.9rem", color: "#666" }}>
                    Statut: <strong style={{ color: license.status === "active" ? "#388e3c" : "#f57c00" }}>
                      {license.status}
                    </strong>
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === "users" && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <h3>Administrateurs d'Organisations</h3>
              <button
                type="button"
                onClick={() => {
                  if (showUserForm) {
                    handleCancelUserForm();
                  } else {
                    setShowUserForm(true);
                  }
                }}
                style={{
                  padding: "8px 16px",
                  borderRadius: "4px",
                  border: "none",
                  backgroundColor: "#f57c00",
                  color: "#fff",
                  cursor: "pointer",
                  fontWeight: "bold",
                }}
              >
                {showUserForm ? "Annuler" : "+ Créer un administrateur"}
              </button>
            </div>

            {showUserForm && (
              <form
                onSubmit={handleCreateUser}
                style={{
                  padding: "16px",
                  backgroundColor: "#f9f9f9",
                  borderRadius: "4px",
                  marginBottom: "16px",
                }}
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
                    placeholder="admin@banque.com"
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
                    Mot de passe {editingUserId && "(laisser vide pour ne pas modifier)"}
                  </label>
                  <input
                    type="password"
                    required={!editingUserId}
                    minLength="6"
                    value={userForm.password}
                    onChange={(e) => setUserForm({ ...userForm, password: e.target.value })}
                    style={{ width: "100%", padding: "8px", borderRadius: "4px", border: "1px solid #ddd" }}
                    placeholder="Minimum 6 caractères"
                  />
                </div>
                <div style={{ marginBottom: "12px" }}>
                  <label style={{ display: "block", marginBottom: "4px", fontWeight: "bold" }}>
                    Organisation
                  </label>
                  <select
                    required
                    value={userForm.organization_id}
                    onChange={(e) => setUserForm({ ...userForm, organization_id: e.target.value })}
                    style={{ width: "100%", padding: "8px", borderRadius: "4px", border: "1px solid #ddd" }}
                  >
                    <option value="">Sélectionner une organisation</option>
                    {organizations.map((org) => (
                      <option key={org.id} value={org.id}>
                        {org.name} ({org.code})
                      </option>
                    ))}
                  </select>
                </div>
                <div style={{ marginBottom: "12px" }}>
                  <label style={{ display: "block", marginBottom: "4px", fontWeight: "bold" }}>
                    Rôle
                  </label>
                  <select
                    required
                    value={userForm.role}
                    onChange={(e) => setUserForm({ ...userForm, role: e.target.value })}
                    style={{ width: "100%", padding: "8px", borderRadius: "4px", border: "1px solid #ddd" }}
                  >
                    <option value="user">Utilisateur</option>
                    <option value="admin">Administrateur d'organisation</option>
                  </select>
                </div>
                <button
                  type="submit"
                  style={{
                    padding: "8px 16px",
                    borderRadius: "4px",
                    border: "none",
                    backgroundColor: "#f57c00",
                    color: "#fff",
                    cursor: "pointer",
                    fontWeight: "bold",
                  }}
                >
                  {editingUserId ? "Modifier l'administrateur" : "Créer l'administrateur"}
                </button>
              </form>
            )}

            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ borderBottom: "2px solid #e0e0e0" }}>
                    <th style={{ padding: "12px", textAlign: "left", fontWeight: "bold" }}>Email</th>
                    <th style={{ padding: "12px", textAlign: "left", fontWeight: "bold" }}>Nom</th>
                    <th style={{ padding: "12px", textAlign: "left", fontWeight: "bold" }}>Organisation</th>
                    <th style={{ padding: "12px", textAlign: "left", fontWeight: "bold" }}>Rôle</th>
                    <th style={{ padding: "12px", textAlign: "left", fontWeight: "bold" }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users
                    .filter((u) => u.organization_id) // Filtrer les super admins
                    .map((user) => (
                      <tr key={user.id} style={{ borderBottom: "1px solid #f0f0f0" }}>
                        <td style={{ padding: "12px" }}>{user.email}</td>
                        <td style={{ padding: "12px" }}>{user.full_name}</td>
                        <td style={{ padding: "12px" }}>{getOrgName(user.organization_id)}</td>
                        <td style={{ padding: "12px" }}>
                          <span
                            style={{
                              padding: "4px 8px",
                              borderRadius: "4px",
                              backgroundColor: user.role === "admin" ? "#e3f2fd" : "#f5f5f5",
                              color: user.role === "admin" ? "#1976d2" : "#666",
                              fontSize: "0.85rem",
                            }}
                          >
                            {user.role || "user"}
                          </span>
                        </td>
                        <td style={{ padding: "12px" }}>
                          <button
                            type="button"
                            onClick={() => handleEditUser(user)}
                            style={{
                              padding: "4px 8px",
                              borderRadius: "4px",
                              border: "1px solid #f57c00",
                              backgroundColor: "#fff",
                              color: "#f57c00",
                              cursor: "pointer",
                              fontSize: "0.85rem",
                            }}
                          >
                            Modifier
                          </button>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default AdminDashboardPage;
