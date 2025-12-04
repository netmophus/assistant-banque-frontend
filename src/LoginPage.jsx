// src/LoginPage.jsx
import React, { useState } from "react";
import api from "./api";

function LoginPage({ onLoginSuccess, goToRegister }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await api.post("/auth/login", {
        email,
        password,
      });

      const { access_token } = response.data;
      localStorage.setItem("access_token", access_token);

      if (onLoginSuccess) {
        onLoginSuccess();
      }
    } catch (err) {
      console.error(err);
      if (err.response && err.response.data && err.response.data.detail) {
        setError(err.response.data.detail);
      } else {
        setError("Erreur lors de la connexion.");
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
          maxWidth: "400px",
          background: "#ffffff",
          padding: "24px",
          borderRadius: "8px",
          boxShadow: "0 4px 10px rgba(0,0,0,0.08)",
        }}
      >
        <h2 style={{ textAlign: "center", marginBottom: "16px" }}>
          Assistant Banque – Connexion
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

        <form onSubmit={handleSubmit}>
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
              backgroundColor: loading ? "#888" : "#1976d2",
              color: "#fff",
              fontSize: "1rem",
              cursor: loading ? "not-allowed" : "pointer",
              marginBottom: "8px",
            }}
          >
            {loading ? "Connexion..." : "Se connecter"}
          </button>
        </form>

        <button
          type="button"
          onClick={goToRegister}
          style={{
            width: "100%",
            padding: "8px 10px",
            borderRadius: "4px",
            border: "1px solid #1976d2",
            backgroundColor: "#fff",
            color: "#1976d2",
            fontSize: "0.9rem",
            cursor: "pointer",
            marginTop: "4px",
          }}
        >
          Créer un compte (register)
        </button>
      </div>
    </div>
  );
}

export default LoginPage;
