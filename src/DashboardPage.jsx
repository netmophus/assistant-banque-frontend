// src/DashboardPage.jsx
import React, { useEffect, useState } from "react";
import api from "./api";
import AdminDashboardPage from "./AdminDashboardPage";
import OrgAdminDashboardPage from "./OrgAdminDashboardPage";
import UserDashboardPage from "./UserDashboardPage";

function DashboardPage({ onLogout }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchMe = async () => {
      setLoading(true);
      setError("");
      try {
        const response = await api.get("/auth/me");
        console.log("=== DEBUG DASHBOARD ===");
        console.log("Full response:", response.data);
        console.log("User role:", response.data.role);
        console.log("Organization ID:", response.data.organization_id);
        console.log("=======================");
        setUser(response.data);
      } catch (err) {
        console.error("Error fetching user:", err);
        setError("Impossible de récupérer les informations de l'utilisateur.");
      } finally {
        setLoading(false);
      }
    };

    fetchMe();
  }, []);

  // FORCER LA REDIRECTION ICI - TRÈS IMPORTANT
  console.log("Current state - Loading:", loading, "User:", user);

  if (!loading && user) {
    console.log("REDIRECTING - User role:", user.role);

    if (user.role === "superadmin") {
      console.log("Redirecting to AdminDashboardPage");
      return <AdminDashboardPage onLogout={onLogout} />;
    }

    if (user.role === "admin") {
      console.log("Redirecting to OrgAdminDashboardPage");
      return <OrgAdminDashboardPage onLogout={onLogout} />;
    }

    console.log("Redirecting to UserDashboardPage");
    return <UserDashboardPage onLogout={onLogout} />;
  }

  // Si loading ou pas d'user, ne pas afficher l'interface générique
  // Interface de chargement uniquement
  const handleLogout = () => {
    localStorage.removeItem("access_token");
    if (onLogout) {
      onLogout();
    }
  };

  if (loading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#f5f5f5",
        }}
      >
        <div
          style={{
            padding: "2rem",
            backgroundColor: "white",
            borderRadius: "12px",
            boxShadow: "0 4px 20px rgba(0,0,0,0.1)",
            textAlign: "center",
          }}
        >
          <div
            style={{
              width: "40px",
              height: "40px",
              border: "4px solid #f3f3f3",
              borderTop: "4px solid #667eea",
              borderRadius: "50%",
              animation: "spin 1s linear infinite",
              margin: "0 auto 1rem auto",
            }}
          />
          <p>Chargement de votre dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#f5f5f5",
        }}
      >
        <div
          style={{
            padding: "2rem",
            backgroundColor: "white",
            borderRadius: "12px",
            boxShadow: "0 4px 20px rgba(0,0,0,0.1)",
            textAlign: "center",
            maxWidth: "400px",
          }}
        >
          <h3 style={{ color: "#e53e3e", marginBottom: "1rem" }}>
            Erreur de connexion
          </h3>
          <p style={{ marginBottom: "1.5rem" }}>{error}</p>
          <button
            onClick={handleLogout}
            style={{
              padding: "0.75rem 1.5rem",
              backgroundColor: "#e53e3e",
              color: "white",
              border: "none",
              borderRadius: "8px",
              cursor: "pointer",
              fontWeight: "600",
            }}
          >
            Se reconnecter
          </button>
        </div>
      </div>
    );
  }

  // Ne devrait jamais arriver si la logique de redirection fonctionne
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#f5f5f5",
      }}
    >
      <div
        style={{
          padding: "2rem",
          backgroundColor: "white",
          borderRadius: "12px",
          boxShadow: "0 4px 20px rgba(0,0,0,0.1)",
          textAlign: "center",
        }}
      >
        <h3>Redirection en cours...</h3>
        <p>Si cette page persiste, veuillez vous reconnecter.</p>
        <button
          onClick={handleLogout}
          style={{
            padding: "0.75rem 1.5rem",
            backgroundColor: "#667eea",
            color: "white",
            border: "none",
            borderRadius: "8px",
            cursor: "pointer",
            fontWeight: "600",
            marginTop: "1rem",
          }}
        >
          Se reconnecter
        </button>
      </div>

      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

export default DashboardPage;
