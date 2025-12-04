import React from "react";
import QuotaStats from "./QuotaStats";

function DashboardTab({ user, quotaStats }) {
  return (
    <div>
      <h3>📊 Tableau de bord</h3>
      <div style={{ marginTop: "24px" }}>
        <p style={{ color: "#666", marginBottom: "16px" }}>
          Bienvenue sur votre tableau de bord. Ici, vous trouverez vos informations et statistiques.
        </p>
        
        {user && (
          <div style={{ padding: "16px", backgroundColor: "#f9f9f9", borderRadius: "4px" }}>
            <h4 style={{ marginTop: 0 }}>Informations personnelles</h4>
            <p><strong>Nom complet :</strong> {user.full_name}</p>
            <p><strong>Email :</strong> {user.email}</p>
            {user.organization_name && (
              <p><strong>Organisation :</strong> {user.organization_name}</p>
            )}
            {user.department_name && (
              <p><strong>Département :</strong> {user.department_name}</p>
            )}
            {user.service_name && (
              <p><strong>Service :</strong> {user.service_name}</p>
            )}
          </div>
        )}

        {quotaStats && (
          <div style={{ marginTop: "24px", padding: "16px", backgroundColor: "#e8f5e9", borderRadius: "4px" }}>
            <h4 style={{ marginTop: 0 }}>Statistiques de quota</h4>
            <p><strong>Mois en cours :</strong> {quotaStats.current_month}</p>
            <p><strong>Questions posées :</strong> {quotaStats.questions_asked} / {quotaStats.quota_limit}</p>
            <p><strong>Questions restantes :</strong> {quotaStats.remaining_quota}</p>
          </div>
        )}

        <div style={{ marginTop: "24px" }}>
          <h4>Fonctionnalités à venir</h4>
          <ul>
            <li>Génération de lettres (congé, permission, etc.)</li>
            <li>Rapports et statistiques détaillés</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

export default DashboardTab;

