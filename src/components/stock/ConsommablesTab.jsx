import React, { useState, useEffect } from "react";
import api from "../../api";

function ConsommablesTab() {
  const [consommables, setConsommables] = useState([]);
  const [loading, setLoading] = useState(false);
  const [panier, setPanier] = useState({});
  const [showPanier, setShowPanier] = useState(false);
  const [panierStep, setPanierStep] = useState("selection"); // selection, verification, confirmation
  const [submitting, setSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");

  useEffect(() => {
    fetchConsommables();
  }, []);

  const fetchConsommables = async () => {
    setLoading(true);
    try {
      const response = await api.get("/stock/consommables/user/available");
      setConsommables(response.data);
    } catch (err) {
      console.error("Erreur:", err);
    } finally {
      setLoading(false);
    }
  };

  const categories = [...new Set(consommables.map((c) => c.type))];
  const filteredConsommables = consommables.filter((c) => {
    const matchesSearch =
      c.type.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (c.description &&
        c.description.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesCategory =
      selectedCategory === "all" || c.type === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const handleAddToPanier = (consommable) => {
    setPanier((prev) => ({
      ...prev,
      [consommable.id]: {
        consommable,
        quantite: prev[consommable.id]?.quantite || 1,
        motif: prev[consommable.id]?.motif || "",
        maxQuantite: consommable.quantite_stock,
      },
    }));
  };

  const handleRemoveFromPanier = (consommableId) => {
    setPanier((prev) => {
      const newPanier = { ...prev };
      delete newPanier[consommableId];
      return newPanier;
    });
  };

  const handleUpdateQuantite = (consommableId, quantite) => {
    if (quantite <= 0) {
      handleRemoveFromPanier(consommableId);
      return;
    }
    const maxQuantite = panier[consommableId]?.maxQuantite || 0;
    if (quantite > maxQuantite) return;

    setPanier((prev) => ({
      ...prev,
      [consommableId]: {
        ...prev[consommableId],
        quantite: parseInt(quantite),
      },
    }));
  };

  const handleUpdateMotif = (consommableId, motif) => {
    setPanier((prev) => ({
      ...prev,
      [consommableId]: {
        ...prev[consommableId],
        motif,
      },
    }));
  };

  const openPanier = () => {
    setShowPanier(true);
    setPanierStep("selection");
  };

  const closePanier = () => {
    setShowPanier(false);
    setPanierStep("selection");
  };

  const goToVerification = () => {
    const items = Object.values(panier);
    const incompleteItems = items.filter((item) => !item.motif.trim());

    if (incompleteItems.length > 0) {
      alert("Veuillez remplir le motif pour tous les articles du panier.");
      return;
    }

    setPanierStep("verification");
  };

  const backToSelection = () => {
    setPanierStep("selection");
  };

  const submitDemandes = async () => {
    setSubmitting(true);
    try {
      const items = Object.values(panier);
      const promises = items.map((item) =>
        api.post("/stock/demandes/direct", {
          consommable_id: item.consommable.id,
          quantite_demandee: item.quantite,
          motif: item.motif,
        }),
      );

      await Promise.all(promises);

      // Animation de succès
      setPanierStep("confirmation");

      // Reset après délai
      setTimeout(() => {
        setPanier({});
        setShowPanier(false);
        setPanierStep("selection");
        fetchConsommables();
      }, 1500);
    } catch (err) {
      alert(
        "Erreur lors de la soumission: " +
          (err.response?.data?.detail || err.message),
      );
    } finally {
      setSubmitting(false);
    }
  };

  const panierItemsCount = Object.keys(panier).length;
  const totalQuantite = Object.values(panier).reduce(
    (sum, item) => sum + item.quantite,
    0,
  );

  return (
    <>
      {/* En-tête moderne */}
      <div
        style={{
          background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
          padding: "2rem",
          borderRadius: "20px",
          marginBottom: "2rem",
          color: "white",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: "-50px",
            right: "-50px",
            width: "150px",
            height: "150px",
            background: "rgba(255,255,255,0.1)",
            borderRadius: "50%",
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: "-30px",
            left: "-30px",
            width: "100px",
            height: "100px",
            background: "rgba(255,255,255,0.05)",
            borderRadius: "50%",
          }}
        />

        <h2
          style={{
            margin: 0,
            fontSize: "2rem",
            fontWeight: "600",
            marginBottom: "0.5rem",
          }}
        >
          📦 Demandes de Consommables
        </h2>
        <p style={{ margin: 0, opacity: 0.9, fontSize: "1.1rem" }}>
          Sélectionnez vos consommables et gérez votre panier de demandes
          (débitage immédiat)
        </p>
      </div>

      {/* Barre de recherche et filtres */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "280px 200px auto",
          gap: "1.5rem",
          marginBottom: "2rem",
          alignItems: "center",
        }}
      >
        <div style={{ position: "relative" }}>
          <input
            type="text"
            placeholder="🔍 Rechercher un consommable..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              width: "100%",
              padding: "0.75rem 1rem",
              borderRadius: "12px",
              border: "2px solid #e1e5e9",
              fontSize: "1rem",
              transition: "all 0.3s ease",
              backgroundColor: "white",
              boxShadow: "0 2px 4px rgba(0,0,0,0.05)",
              boxSizing: "border-box",
            }}
            onFocus={(e) => (e.target.style.borderColor = "#667eea")}
            onBlur={(e) => (e.target.style.borderColor = "#e1e5e9")}
          />
        </div>

        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          style={{
            padding: "0.75rem 1rem",
            borderRadius: "12px",
            border: "2px solid #e1e5e9",
            fontSize: "1rem",
            backgroundColor: "white",
            cursor: "pointer",
            width: "100%",
            boxSizing: "border-box",
          }}
        >
          <option value="all">Toutes catégories</option>
          {categories.map((cat) => (
            <option key={cat} value={cat}>
              {cat}
            </option>
          ))}
        </select>

        {/* Bouton Panier */}
        <button
          onClick={openPanier}
          disabled={panierItemsCount === 0}
          style={{
            position: "relative",
            padding: "0.75rem 1.5rem",
            borderRadius: "12px",
            border: "none",
            background:
              panierItemsCount > 0
                ? "linear-gradient(135deg, #ff6b6b, #ee5a52)"
                : "linear-gradient(135deg, #e2e8f0, #cbd5e0)",
            color: panierItemsCount > 0 ? "white" : "#9ca3af",
            fontSize: "1rem",
            fontWeight: "600",
            cursor: panierItemsCount > 0 ? "pointer" : "not-allowed",
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
            boxShadow:
              panierItemsCount > 0
                ? "0 4px 12px rgba(255, 107, 107, 0.3)"
                : "none",
            transition: "all 0.3s ease",
            animation: panierItemsCount > 0 ? "pulse 2s infinite" : "none",
            opacity: panierItemsCount > 0 ? 1 : 0.7,
          }}
          onMouseOver={(e) => {
            if (panierItemsCount > 0) {
              e.target.style.transform = "translateY(-2px)";
            }
          }}
          onMouseOut={(e) => {
            if (panierItemsCount > 0) {
              e.target.style.transform = "translateY(0)";
            }
          }}
        >
          🛒 Panier
          {panierItemsCount > 0 && (
            <span
              style={{
                background: "white",
                color: "#ff6b6b",
                borderRadius: "50%",
                width: "24px",
                height: "24px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "0.8rem",
                fontWeight: "bold",
              }}
            >
              {panierItemsCount}
            </span>
          )}
          {panierItemsCount === 0 && (
            <span style={{ fontSize: "0.8rem", opacity: 0.7 }}>(vide)</span>
          )}
        </button>
      </div>

      {/* Grille des consommables */}
      {loading ? (
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            height: "200px",
            fontSize: "1.2rem",
            color: "#666",
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
              marginRight: "1rem",
            }}
          />
          Chargement des consommables...
        </div>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
            gap: "1.5rem",
          }}
        >
          {filteredConsommables.map((consommable) => {
            const isInPanier = panier[consommable.id];
            const isLowStock =
              consommable.quantite_stock <= consommable.limite_alerte;

            return (
              <div
                key={consommable.id}
                style={{
                  background: "white",
                  borderRadius: "16px",
                  padding: "1.5rem",
                  boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
                  border: `2px solid ${isInPanier ? "#667eea" : "transparent"}`,
                  transition: "all 0.3s ease",
                  position: "relative",
                  transform: isInPanier ? "scale(1.02)" : "scale(1)",
                }}
              >
                {/* Badge stock */}
                {isLowStock && (
                  <div
                    style={{
                      position: "absolute",
                      top: "1rem",
                      right: "1rem",
                      background: "linear-gradient(135deg, #ff6b6b, #ee5a52)",
                      color: "white",
                      padding: "0.25rem 0.5rem",
                      borderRadius: "6px",
                      fontSize: "0.7rem",
                      fontWeight: "600",
                    }}
                  >
                    ⚠️ Stock bas
                  </div>
                )}

                {/* Badge dans panier */}
                {isInPanier && (
                  <div
                    style={{
                      position: "absolute",
                      top: "1rem",
                      left: "1rem",
                      background: "linear-gradient(135deg, #667eea, #764ba2)",
                      color: "white",
                      padding: "0.25rem 0.5rem",
                      borderRadius: "6px",
                      fontSize: "0.7rem",
                      fontWeight: "600",
                    }}
                  >
                    ✓ Dans le panier
                  </div>
                )}

                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    marginBottom: "1rem",
                    gap: "1rem",
                  }}
                >
                  <div
                    style={{
                      width: "50px",
                      height: "50px",
                      background: "linear-gradient(135deg, #667eea, #764ba2)",
                      borderRadius: "12px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "1.5rem",
                      color: "white",
                    }}
                  >
                    📦
                  </div>
                  <div style={{ flex: 1 }}>
                    <h3
                      style={{
                        margin: 0,
                        fontSize: "1.1rem",
                        fontWeight: "600",
                        color: "#2d3748",
                        lineHeight: "1.3",
                      }}
                    >
                      {consommable.type}
                    </h3>
                    {consommable.description && (
                      <p
                        style={{
                          margin: "0.25rem 0 0 0",
                          fontSize: "0.9rem",
                          color: "#718096",
                          lineHeight: "1.4",
                        }}
                      >
                        {consommable.description}
                      </p>
                    )}
                  </div>
                </div>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: "1rem",
                    marginBottom: "1.5rem",
                    padding: "1rem",
                    background: "#f7fafc",
                    borderRadius: "12px",
                  }}
                >
                  <div style={{ textAlign: "center" }}>
                    <div
                      style={{
                        fontSize: "1.5rem",
                        fontWeight: "700",
                        color: isLowStock ? "#e53e3e" : "#38a169",
                      }}
                    >
                      {consommable.quantite_stock}
                    </div>
                    <div
                      style={{
                        fontSize: "0.8rem",
                        color: "#718096",
                        fontWeight: "500",
                      }}
                    >
                      {consommable.unite}(s) en stock
                    </div>
                  </div>
                  <div style={{ textAlign: "center" }}>
                    <div
                      style={{
                        fontSize: "1.2rem",
                        fontWeight: "600",
                        color: "#ed8936",
                      }}
                    >
                      {consommable.limite_alerte}
                    </div>
                    <div
                      style={{
                        fontSize: "0.8rem",
                        color: "#718096",
                        fontWeight: "500",
                      }}
                    >
                      seuil d'alerte
                    </div>
                  </div>
                </div>

                <div
                  style={{
                    display: "flex",
                    gap: "0.5rem",
                    alignItems: "center",
                  }}
                >
                  {isInPanier ? (
                    <>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "0.5rem",
                          flex: 1,
                          background: "#f7fafc",
                          borderRadius: "8px",
                          padding: "0.25rem",
                        }}
                      >
                        <button
                          onClick={() => {
                            const currentQty =
                              panier[consommable.id]?.quantite || 1;
                            if (currentQty > 1) {
                              handleUpdateQuantite(
                                consommable.id,
                                currentQty - 1,
                              );
                            }
                          }}
                          disabled={panier[consommable.id]?.quantite <= 1}
                          style={{
                            width: "32px",
                            height: "32px",
                            borderRadius: "6px",
                            border: "none",
                            background:
                              panier[consommable.id]?.quantite > 1
                                ? "linear-gradient(135deg, #ef4444, #dc2626)"
                                : "#e5e7eb",
                            color:
                              panier[consommable.id]?.quantite > 1
                                ? "white"
                                : "#9ca3af",
                            fontSize: "1rem",
                            fontWeight: "600",
                            cursor:
                              panier[consommable.id]?.quantite > 1
                                ? "pointer"
                                : "not-allowed",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          -
                        </button>

                        <span
                          style={{
                            minWidth: "40px",
                            textAlign: "center",
                            fontWeight: "600",
                            fontSize: "1rem",
                            color: "#2d3748",
                          }}
                        >
                          {panier[consommable.id]?.quantite || 1}
                        </span>

                        <button
                          onClick={() => {
                            const currentQty =
                              panier[consommable.id]?.quantite || 1;
                            if (currentQty < consommable.quantite_stock) {
                              handleUpdateQuantite(
                                consommable.id,
                                currentQty + 1,
                              );
                            }
                          }}
                          disabled={
                            panier[consommable.id]?.quantite >=
                            consommable.quantite_stock
                          }
                          style={{
                            width: "32px",
                            height: "32px",
                            borderRadius: "6px",
                            border: "none",
                            background:
                              panier[consommable.id]?.quantite <
                              consommable.quantite_stock
                                ? "linear-gradient(135deg, #10b981, #059669)"
                                : "#e5e7eb",
                            color:
                              panier[consommable.id]?.quantite <
                              consommable.quantite_stock
                                ? "white"
                                : "#9ca3af",
                            fontSize: "1rem",
                            fontWeight: "600",
                            cursor:
                              panier[consommable.id]?.quantite <
                              consommable.quantite_stock
                                ? "pointer"
                                : "not-allowed",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          +
                        </button>
                      </div>

                      <button
                        onClick={() => handleRemoveFromPanier(consommable.id)}
                        style={{
                          padding: "0.5rem",
                          borderRadius: "8px",
                          border: "none",
                          background:
                            "linear-gradient(135deg, #e53e3e, #c53030)",
                          color: "white",
                          fontSize: "0.9rem",
                          fontWeight: "600",
                          cursor: "pointer",
                          transition: "all 0.3s ease",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                        title="Retirer du panier"
                      >
                        🗑️
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => handleAddToPanier(consommable)}
                      disabled={consommable.quantite_stock <= 0}
                      style={{
                        width: "100%",
                        padding: "0.75rem",
                        borderRadius: "12px",
                        border: "none",
                        background:
                          consommable.quantite_stock > 0
                            ? "linear-gradient(135deg, #667eea, #764ba2)"
                            : "linear-gradient(135deg, #a0aec0, #718096)",
                        color: "white",
                        fontSize: "1rem",
                        fontWeight: "600",
                        cursor:
                          consommable.quantite_stock > 0
                            ? "pointer"
                            : "not-allowed",
                        transition: "all 0.3s ease",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "0.5rem",
                        opacity: consommable.quantite_stock > 0 ? 1 : 0.6,
                      }}
                    >
                      {consommable.quantite_stock > 0
                        ? "➕ Ajouter au panier"
                        : "❌ Stock épuisé"}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal du Panier */}
      {showPanier && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0,0,0,0.5)",
            zIndex: 1000,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "2rem",
          }}
        >
          <div
            style={{
              backgroundColor: "white",
              borderRadius: "20px",
              width: "100%",
              maxWidth: "800px",
              maxHeight: "90vh",
              display: "flex",
              flexDirection: "column",
              boxShadow: "0 20px 60px rgba(0,0,0,0.2)",
              overflow: "hidden",
            }}
          >
            {/* En-tête du panier */}
            <div
              style={{
                background: "linear-gradient(135deg, #667eea, #764ba2)",
                padding: "2rem",
                color: "white",
                position: "relative",
              }}
            >
              <button
                onClick={closePanier}
                style={{
                  position: "absolute",
                  top: "1rem",
                  right: "1rem",
                  background: "rgba(255,255,255,0.2)",
                  border: "none",
                  color: "white",
                  width: "40px",
                  height: "40px",
                  borderRadius: "50%",
                  cursor: "pointer",
                  fontSize: "1.2rem",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                ✕
              </button>

              <h2 style={{ margin: 0, fontSize: "1.8rem", fontWeight: "600" }}>
                🛒 Mon Panier
              </h2>
              <p style={{ margin: "0.5rem 0 0 0", opacity: 0.9 }}>
                {panierItemsCount} article{panierItemsCount > 1 ? "s" : ""} •{" "}
                {totalQuantite} unité{totalQuantite > 1 ? "s" : ""} au total
              </p>

              {/* Indicateur d'étapes */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "center",
                  gap: "2rem",
                  marginTop: "1.5rem",
                }}
              >
                {["selection", "verification", "confirmation"].map(
                  (step, index) => (
                    <div
                      key={step}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "0.5rem",
                        opacity: panierStep === step ? 1 : 0.6,
                      }}
                    >
                      <div
                        style={{
                          width: "30px",
                          height: "30px",
                          borderRadius: "50%",
                          background:
                            panierStep === step
                              ? "white"
                              : "rgba(255,255,255,0.3)",
                          color: panierStep === step ? "#667eea" : "white",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontWeight: "600",
                        }}
                      >
                        {index + 1}
                      </div>
                      <span style={{ fontSize: "0.9rem", fontWeight: "500" }}>
                        {step === "selection"
                          ? "Sélection"
                          : step === "verification"
                            ? "Vérification"
                            : "Confirmation"}
                      </span>
                    </div>
                  ),
                )}
              </div>
            </div>

            {/* Contenu selon l'étape */}
            <div style={{ flex: 1, overflow: "auto", padding: "2rem" }}>
              {panierStep === "selection" && (
                <div>
                  {Object.values(panier).map((item) => (
                    <div
                      key={item.consommable.id}
                      style={{
                        display: "grid",
                        gridTemplateColumns: "1fr auto",
                        gap: "1rem",
                        padding: "1.5rem",
                        marginBottom: "1rem",
                        background: "#f7fafc",
                        borderRadius: "12px",
                        alignItems: "start",
                      }}
                    >
                      <div>
                        <h4
                          style={{
                            margin: "0 0 1rem 0",
                            fontSize: "1.1rem",
                            fontWeight: "600",
                            color: "#2d3748",
                          }}
                        >
                          {item.consommable.type}
                        </h4>

                        <div
                          style={{
                            display: "grid",
                            gridTemplateColumns: "200px 1fr",
                            gap: "1rem",
                            marginBottom: "1rem",
                            alignItems: "start",
                          }}
                        >
                          <div>
                            <label
                              style={{
                                display: "block",
                                fontSize: "0.9rem",
                                fontWeight: "500",
                                color: "#4a5568",
                                marginBottom: "0.5rem",
                              }}
                            >
                              Quantité demandée
                            </label>
                            <div
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "0.5rem",
                                background: "white",
                                borderRadius: "8px",
                                padding: "0.25rem",
                                border: "2px solid #e2e8f0",
                              }}
                            >
                              <button
                                onClick={() => {
                                  if (item.quantite > 1) {
                                    handleUpdateQuantite(
                                      item.consommable.id,
                                      item.quantite - 1,
                                    );
                                  }
                                }}
                                disabled={item.quantite <= 1}
                                style={{
                                  width: "32px",
                                  height: "32px",
                                  borderRadius: "6px",
                                  border: "none",
                                  background:
                                    item.quantite > 1
                                      ? "linear-gradient(135deg, #ef4444, #dc2626)"
                                      : "#e5e7eb",
                                  color:
                                    item.quantite > 1 ? "white" : "#9ca3af",
                                  fontSize: "1rem",
                                  fontWeight: "600",
                                  cursor:
                                    item.quantite > 1
                                      ? "pointer"
                                      : "not-allowed",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                }}
                              >
                                -
                              </button>

                              <input
                                type="number"
                                min="1"
                                max={item.maxQuantite}
                                value={item.quantite}
                                onChange={(e) => {
                                  const newQty = parseInt(e.target.value) || 1;
                                  if (
                                    newQty >= 1 &&
                                    newQty <= item.maxQuantite
                                  ) {
                                    handleUpdateQuantite(
                                      item.consommable.id,
                                      newQty,
                                    );
                                  }
                                }}
                                style={{
                                  width: "60px",
                                  padding: "0.5rem",
                                  border: "none",
                                  textAlign: "center",
                                  fontSize: "1rem",
                                  fontWeight: "600",
                                  background: "transparent",
                                }}
                              />

                              <button
                                onClick={() => {
                                  if (item.quantite < item.maxQuantite) {
                                    handleUpdateQuantite(
                                      item.consommable.id,
                                      item.quantite + 1,
                                    );
                                  }
                                }}
                                disabled={item.quantite >= item.maxQuantite}
                                style={{
                                  width: "32px",
                                  height: "32px",
                                  borderRadius: "6px",
                                  border: "none",
                                  background:
                                    item.quantite < item.maxQuantite
                                      ? "linear-gradient(135deg, #10b981, #059669)"
                                      : "#e5e7eb",
                                  color:
                                    item.quantite < item.maxQuantite
                                      ? "white"
                                      : "#9ca3af",
                                  fontSize: "1rem",
                                  fontWeight: "600",
                                  cursor:
                                    item.quantite < item.maxQuantite
                                      ? "pointer"
                                      : "not-allowed",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                }}
                              >
                                +
                              </button>
                            </div>
                            <small
                              style={{
                                color: "#718096",
                                fontSize: "0.8rem",
                                display: "block",
                                marginTop: "0.25rem",
                              }}
                            >
                              Max: {item.maxQuantite} {item.consommable.unite}
                              (s)
                            </small>
                          </div>

                          <div>
                            <label
                              style={{
                                display: "block",
                                fontSize: "0.9rem",
                                fontWeight: "500",
                                color: "#4a5568",
                                marginBottom: "0.5rem",
                              }}
                            >
                              Motif de la demande *
                            </label>
                            <textarea
                              value={item.motif}
                              onChange={(e) =>
                                handleUpdateMotif(
                                  item.consommable.id,
                                  e.target.value,
                                )
                              }
                              placeholder="Expliquez pourquoi vous avez besoin de ce consommable..."
                              style={{
                                width: "100%",
                                padding: "0.75rem",
                                borderRadius: "8px",
                                border: "2px solid #e2e8f0",
                                fontSize: "0.9rem",
                                resize: "vertical",
                                minHeight: "80px",
                                fontFamily: "inherit",
                              }}
                            />
                          </div>
                        </div>
                      </div>

                      <button
                        onClick={() =>
                          handleRemoveFromPanier(item.consommable.id)
                        }
                        style={{
                          padding: "0.75rem",
                          borderRadius: "8px",
                          border: "none",
                          background:
                            "linear-gradient(135deg, #e53e3e, #c53030)",
                          color: "white",
                          cursor: "pointer",
                          fontSize: "0.9rem",
                          fontWeight: "600",
                          minWidth: "60px",
                          height: "40px",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                        title="Retirer du panier"
                      >
                        🗑️
                      </button>
                    </div>
                  ))}

                  {Object.keys(panier).length === 0 && (
                    <div
                      style={{
                        textAlign: "center",
                        padding: "3rem",
                        color: "#718096",
                      }}
                    >
                      <div
                        style={{
                          fontSize: "4rem",
                          marginBottom: "1rem",
                          opacity: 0.5,
                        }}
                      >
                        🛒
                      </div>
                      <h3
                        style={{
                          margin: "0 0 0.5rem 0",
                          fontSize: "1.2rem",
                          fontWeight: "600",
                          color: "#4a5568",
                        }}
                      >
                        Votre panier est vide
                      </h3>
                      <p
                        style={{
                          margin: 0,
                          fontSize: "1rem",
                          opacity: 0.8,
                        }}
                      >
                        Ajoutez des consommables à votre panier pour créer une
                        demande
                      </p>
                    </div>
                  )}
                </div>
              )}

              {panierStep === "verification" && (
                <div>
                  <div
                    style={{
                      background: "linear-gradient(135deg, #38a169, #2f855a)",
                      color: "white",
                      padding: "1.5rem",
                      borderRadius: "12px",
                      marginBottom: "2rem",
                      textAlign: "center",
                    }}
                  >
                    <h3 style={{ margin: "0 0 0.5rem 0", fontSize: "1.3rem" }}>
                      ✅ Vérification de votre demande
                    </h3>
                    <p style={{ margin: 0, opacity: 0.9 }}>
                      Vérifiez les détails avant de soumettre votre demande
                    </p>
                  </div>

                  {Object.values(panier).map((item, index) => (
                    <div
                      key={item.consommable.id}
                      style={{
                        padding: "1.5rem",
                        marginBottom: "1rem",
                        background: "white",
                        border: "2px solid #e2e8f0",
                        borderRadius: "12px",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "start",
                          marginBottom: "1rem",
                        }}
                      >
                        <div>
                          <h4
                            style={{
                              margin: "0 0 0.25rem 0",
                              fontSize: "1.1rem",
                              fontWeight: "600",
                              color: "#2d3748",
                            }}
                          >
                            #{index + 1} {item.consommable.type}
                          </h4>
                          <p
                            style={{
                              margin: 0,
                              fontSize: "0.9rem",
                              color: "#718096",
                            }}
                          >
                            Quantité:{" "}
                            <strong>
                              {item.quantite} {item.consommable.unite}(s)
                            </strong>
                          </p>
                        </div>
                      </div>

                      <div
                        style={{
                          background: "#f7fafc",
                          padding: "1rem",
                          borderRadius: "8px",
                        }}
                      >
                        <strong
                          style={{ color: "#4a5568", fontSize: "0.9rem" }}
                        >
                          Motif:
                        </strong>
                        <p
                          style={{
                            margin: "0.5rem 0 0 0",
                            fontSize: "0.9rem",
                            lineHeight: "1.5",
                            color: "#2d3748",
                          }}
                        >
                          {item.motif}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {panierStep === "confirmation" && (
                <div
                  style={{
                    textAlign: "center",
                    padding: "3rem 1rem",
                  }}
                >
                  <div
                    style={{
                      width: "80px",
                      height: "80px",
                      background: "linear-gradient(135deg, #38a169, #2f855a)",
                      borderRadius: "50%",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      margin: "0 auto 2rem auto",
                      fontSize: "2rem",
                    }}
                  >
                    ✅
                  </div>
                  <h3
                    style={{
                      margin: "0 0 1rem 0",
                      fontSize: "1.5rem",
                      fontWeight: "600",
                      color: "#2d3748",
                    }}
                  >
                    Demandes soumises avec succès !
                  </h3>
                  <p
                    style={{
                      margin: 0,
                      fontSize: "1rem",
                      color: "#718096",
                    }}
                  >
                    Vos {panierItemsCount} demande
                    {panierItemsCount > 1 ? "s ont" : " a"} été soumise
                    {panierItemsCount > 1 ? "s" : ""}
                    et {panierItemsCount > 1 ? "sont" : "est"} en attente
                    d'approbation.
                  </p>
                </div>
              )}
            </div>

            {/* Actions du panier */}
            {panierStep !== "confirmation" && (
              <div
                style={{
                  padding: "1.5rem 2rem",
                  borderTop: "1px solid #e2e8f0",
                  display: "flex",
                  gap: "1rem",
                  justifyContent: "flex-end",
                }}
              >
                {panierStep === "verification" && (
                  <button
                    onClick={backToSelection}
                    style={{
                      padding: "0.75rem 1.5rem",
                      borderRadius: "12px",
                      border: "2px solid #e2e8f0",
                      background: "white",
                      color: "#4a5568",
                      fontSize: "1rem",
                      fontWeight: "600",
                      cursor: "pointer",
                    }}
                  >
                    ← Retour
                  </button>
                )}

                <button
                  onClick={
                    panierStep === "selection"
                      ? goToVerification
                      : submitDemandes
                  }
                  disabled={submitting || Object.keys(panier).length === 0}
                  style={{
                    padding: "0.75rem 2rem",
                    borderRadius: "12px",
                    border: "none",
                    background: submitting
                      ? "linear-gradient(135deg, #a0aec0, #718096)"
                      : "linear-gradient(135deg, #667eea, #764ba2)",
                    color: "white",
                    fontSize: "1rem",
                    fontWeight: "600",
                    cursor: submitting ? "not-allowed" : "pointer",
                    opacity: submitting ? 0.7 : 1,
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                  }}
                >
                  {submitting ? (
                    <>
                      <div
                        style={{
                          width: "16px",
                          height: "16px",
                          border: "2px solid white",
                          borderTop: "2px solid transparent",
                          borderRadius: "50%",
                          animation: "spin 1s linear infinite",
                        }}
                      />
                      Envoi en cours...
                    </>
                  ) : panierStep === "selection" ? (
                    <>📋 Vérifier ma demande</>
                  ) : (
                    <>📤 Soumettre les demandes</>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        @keyframes pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.05); }
        }

        .panier-button:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 25px rgba(102, 126, 234, 0.4);
        }

        .consommable-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 12px 40px rgba(0, 0, 0, 0.15);
        }

        .search-input:focus {
          box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
          border-color: #667eea;
        }
      `}</style>
    </>
  );
}

export default ConsommablesTab;
