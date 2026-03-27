// src/RegisterPage.jsx
import React, { useState } from "react";
import api from "./api";

function RegisterPage({ goToLogin }) {
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [organizationId, setOrganizationId] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setMessage("");
    setLoading(true);

    try {
      await api.post("/auth/register", {
        email,
        full_name: fullName,
        organization_id: organizationId,
        password,
      });

      setMessage("Utilisateur créé avec succès ✅");
    } catch (err) {
      console.error(err);
      if (err.response && err.response.data) {
        // Gérer les erreurs de validation Pydantic (format différent)
        if (err.response.data.detail) {
          if (Array.isArray(err.response.data.detail)) {
            // Erreurs de validation Pydantic
            const errors = err.response.data.detail.map((e) => {
              const field = e.loc ? e.loc.join(".") : "champ";
              return `${field}: ${e.msg}`;
            });
            setError(errors.join(", "));
          } else {
            // Erreur simple
            setError(err.response.data.detail);
          }
        } else if (err.response.data.message) {
          setError(err.response.data.message);
        } else {
          setError("Erreur lors de la création du compte.");
        }
      } else {
        setError("Erreur lors de la création du compte.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#f5f5f5",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "450px",
          background: "#ffffff",
          padding: "24px",
          borderRadius: "8px",
          boxShadow: "0 4px 10px rgba(0,0,0,0.08)",
        }}
      >
        <h2 style={{ textAlign: "center", marginBottom: "16px" }}>
          Assistant Banque – Création de compte
        </h2>

        {error && (
          <div
            style={{
              marginBottom: "12px",
              padding: "8px 12px",
              backgroundColor: "#ffe6e6",
              color: "#b00020",
              borderRadius: "4px",
              fontSize: "0.9rem",
            }}
          >
            {error}
          </div>
        )}

        {message && (
          <div
            style={{
              marginBottom: "12px",
              padding: "8px 12px",
              backgroundColor: "#e6ffed",
              color: "#0b8043",
              borderRadius: "4px",
              fontSize: "0.9rem",
            }}
          >
            {message}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: "12px" }}>
            <label
              htmlFor="fullName"
              style={{ display: "block", marginBottom: "4px", fontSize: "0.9rem" }}
            >
              Nom complet
            </label>
            <input
              id="fullName"
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
              style={{
                width: "100%",
                padding: "8px 10px",
                borderRadius: "4px",
                border: "1px solid #ccc",
                fontSize: "0.95rem",
              }}
            />
          </div>

          <div style={{ marginBottom: "12px" }}>
            <label
              htmlFor="email"
              style={{ display: "block", marginBottom: "4px", fontSize: "0.9rem" }}
            >
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              style={{
                width: "100%",
                padding: "8px 10px",
                borderRadius: "4px",
                border: "1px solid #ccc",
                fontSize: "0.95rem",
              }}
            />
          </div>

          <div style={{ marginBottom: "12px" }}>
            <label
              htmlFor="orgId"
              style={{ display: "block", marginBottom: "4px", fontSize: "0.9rem" }}
            >
              ID de la banque (organization_id)
            </label>
            <input
              id="orgId"
              type="text"
              value={organizationId}
              onChange={(e) => setOrganizationId(e.target.value)}
              required
              placeholder="Colle ici l'ID de l'organisation Mongo"
              style={{
                width: "100%",
                padding: "8px 10px",
                borderRadius: "4px",
                border: "1px solid #ccc",
                fontSize: "0.95rem",
              }}
            />
          </div>

          <div style={{ marginBottom: "16px" }}>
            <label
              htmlFor="password"
              style={{ display: "block", marginBottom: "4px", fontSize: "0.9rem" }}
            >
              Mot de passe
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              style={{
                width: "100%",
                padding: "8px 10px",
                borderRadius: "4px",
                border: "1px solid #ccc",
                fontSize: "0.95rem",
              }}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              width: "100%",
              padding: "10px 14px",
              borderRadius: "4px",
              border: "none",
              backgroundColor: loading ? "#888" : "#2e7d32",
              color: "#fff",
              fontSize: "1rem",
              cursor: loading ? "not-allowed" : "pointer",
              marginBottom: "8px",
            }}
          >
            {loading ? "Création..." : "Créer le compte"}
          </button>
        </form>

        <button
          type="button"
          onClick={goToLogin}
          style={{
            width: "100%",
            padding: "8px 10px",
            borderRadius: "4px",
            border: "1px solid #2e7d32",
            backgroundColor: "#fff",
            color: "#2e7d32",
            fontSize: "0.9rem",
            cursor: "pointer",
            marginTop: "4px",
          }}
        >
          Retour à la connexion
        </button>
      </div>
    </div>
  );
}

export default RegisterPage;
