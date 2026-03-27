// src/App.js
import React, { useEffect, useState } from "react";
import LoginPage from "./LoginPage";
import RegisterPage from "./RegisterPage";
import DashboardPage from "./DashboardPage";

function App() {
  const [page, setPage] = useState("login");

  // Si un token existe déjà → aller directement au dashboard
  useEffect(() => {
    const token = localStorage.getItem("access_token");
    if (token) {
      setPage("dashboard");
    }
  }, []);

  const handleLoginSuccess = () => {
    setPage("dashboard");
  };

  const handleLogout = () => {
    setPage("login");
  };

  const goToRegister = () => {
    setPage("register");
  };

  const goToLogin = () => {
    setPage("login");
  };

  if (page === "login") {
    return (
      <LoginPage
        onLoginSuccess={handleLoginSuccess}
        goToRegister={goToRegister}
      />
    );
  }

  if (page === "register") {
    return <RegisterPage goToLogin={goToLogin} />;
  }

  if (page === "dashboard") {
    return <DashboardPage onLogout={handleLogout} />;
  }

  // Fallback
  return <LoginPage onLoginSuccess={handleLoginSuccess} goToRegister={goToRegister} />;
}

export default App;
