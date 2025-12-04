import React, { useState, useEffect } from "react";
import api from "../../api";

function StockManagementTab() {
  const [consommables, setConsommables] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState("created_at");
  const [sortOrder, setSortOrder] = useState("desc");
  const [showStats, setShowStats] = useState(true);
  const [form, setForm] = useState({
    type: "",
    description: "",
    unite_base: "unité",
    unite_conteneur: "unité",
    quantite_par_conteneur: 1,
    quantite_stock_conteneur: 0,
    limite_alerte: 0,
  });

  useEffect(() => {
    fetchConsommables();
  }, []);

  const fetchConsommables = async () => {
    setLoading(true);
    try {
      const response = await api.get("/stock/consommables");
      setConsommables(response.data);
    } catch (err) {
      console.error("Erreur:", err);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setForm({
      type: "",
      description: "",
      unite_base: "unité",
      unite_conteneur: "unité",
      quantite_par_conteneur: 1,
      quantite_stock_conteneur: 0,
      limite_alerte: 0,
    });
    setEditingId(null);
    setShowForm(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (editingId) {
        await api.put(`/stock/consommables/${editingId}`, form);
      } else {
        await api.post("/stock/consommables", form);
      }
      resetForm();
      fetchConsommables();
    } catch (err) {
      alert("Erreur: " + (err.response?.data?.detail || err.message));
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (consommable) => {
    setForm({
      type: consommable.type,
      description: consommable.description || "",
      unite_base: consommable.unite_base || "unité",
      unite_conteneur: consommable.unite_conteneur || "unité",
      quantite_par_conteneur: consommable.quantite_par_conteneur || 1,
      quantite_stock_conteneur: consommable.quantite_stock_conteneur || 0,
      limite_alerte: consommable.limite_alerte || 0,
    });
    setEditingId(consommable.id);
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Êtes-vous sûr de vouloir supprimer ce consommable ?"))
      return;
    try {
      await api.delete(`/stock/consommables/${id}`);
      fetchConsommables();
    } catch (err) {
      alert("Erreur: " + (err.response?.data?.detail || err.message));
    }
  };

  const handleUpdateStock = async (id, operation, quantite) => {
    try {
      await api.put(`/stock/consommables/${id}/stock`, {
        quantite: parseInt(quantite),
        operation: operation,
      });
      fetchConsommables();
    } catch (err) {
      alert("Erreur: " + (err.response?.data?.detail || err.message));
    }
  };

  // Calculs des statistiques
  const stats = {
    total: consommables.length,
    stockTotal: consommables.reduce(
      (sum, c) => sum + (c.quantite_stock_total || 0),
      0,
    ),
    alertes: consommables.filter(
      (c) => c.quantite_stock_conteneur <= c.limite_alerte,
    ).length,
    ruptures: consommables.filter((c) => c.quantite_stock_conteneur === 0)
      .length,
  };

  // Filtrage et tri
  const filteredConsommables = consommables
    .filter(
      (c) =>
        c.type.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (c.description &&
          c.description.toLowerCase().includes(searchTerm.toLowerCase())),
    )
    .sort((a, b) => {
      let aVal = a[sortBy];
      let bVal = b[sortBy];

      if (sortBy === "created_at") {
        aVal = new Date(aVal);
        bVal = new Date(bVal);
      }

      if (sortOrder === "asc") {
        return aVal > bVal ? 1 : -1;
      } else {
        return aVal < bVal ? 1 : -1;
      }
    });

  return (
    <>
      {/* En-tête avec statistiques */}
      <div
        style={{
          background: "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)",
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
            display: "grid",
            gridTemplateColumns: "1fr auto",
            alignItems: "start",
            gap: "2rem",
          }}
        >
          <div>
            <h2
              style={{
                margin: 0,
                fontSize: "2rem",
                fontWeight: "600",
                marginBottom: "0.5rem",
              }}
            >
              ⚙️ Gestion des Consommables
            </h2>
            <p style={{ margin: 0, opacity: 0.9, fontSize: "1.1rem" }}>
              Gérez le stock et suivez les consommations
            </p>
          </div>

          <button
            onClick={() => setShowForm(true)}
            style={{
              padding: "0.75rem 1.5rem",
              borderRadius: "12px",
              border: "none",
              background: "rgba(255,255,255,0.2)",
              backdropFilter: "blur(10px)",
              color: "white",
              fontSize: "1rem",
              fontWeight: "600",
              cursor: "pointer",
              transition: "all 0.3s ease",
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              boxShadow: "0 4px 15px rgba(255,255,255,0.1)",
            }}
            onMouseOver={(e) => {
              e.target.style.background = "rgba(255,255,255,0.3)";
              e.target.style.transform = "translateY(-2px)";
            }}
            onMouseOut={(e) => {
              e.target.style.background = "rgba(255,255,255,0.2)";
              e.target.style.transform = "translateY(0)";
            }}
          >
            ➕ Nouveau Consommable
          </button>
        </div>

        {/* Statistiques */}
        {showStats && (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
              gap: "1rem",
              marginTop: "2rem",
            }}
          >
            <div
              style={{
                background: "rgba(255,255,255,0.15)",
                backdropFilter: "blur(10px)",
                padding: "1.5rem",
                borderRadius: "16px",
                textAlign: "center",
              }}
            >
              <div
                style={{
                  fontSize: "2rem",
                  fontWeight: "700",
                  marginBottom: "0.5rem",
                }}
              >
                {stats.total}
              </div>
              <div style={{ fontSize: "0.9rem", opacity: 0.9 }}>
                Types de consommables
              </div>
            </div>

            <div
              style={{
                background: "rgba(255,255,255,0.15)",
                backdropFilter: "blur(10px)",
                padding: "1.5rem",
                borderRadius: "16px",
                textAlign: "center",
              }}
            >
              <div
                style={{
                  fontSize: "2rem",
                  fontWeight: "700",
                  marginBottom: "0.5rem",
                }}
              >
                {stats.stockTotal}
              </div>
              <div style={{ fontSize: "0.9rem", opacity: 0.9 }}>
                Unités en stock
              </div>
            </div>

            <div
              style={{
                background:
                  stats.alertes > 0
                    ? "rgba(255,107,107,0.2)"
                    : "rgba(255,255,255,0.15)",
                backdropFilter: "blur(10px)",
                padding: "1.5rem",
                borderRadius: "16px",
                textAlign: "center",
                border:
                  stats.alertes > 0
                    ? "1px solid rgba(255,107,107,0.3)"
                    : "none",
              }}
            >
              <div
                style={{
                  fontSize: "2rem",
                  fontWeight: "700",
                  marginBottom: "0.5rem",
                }}
              >
                {stats.alertes}
              </div>
              <div style={{ fontSize: "0.9rem", opacity: 0.9 }}>
                ⚠️ Alertes stock bas
              </div>
            </div>

            <div
              style={{
                background:
                  stats.ruptures > 0
                    ? "rgba(239,68,68,0.2)"
                    : "rgba(255,255,255,0.15)",
                backdropFilter: "blur(10px)",
                padding: "1.5rem",
                borderRadius: "16px",
                textAlign: "center",
                border:
                  stats.ruptures > 0 ? "1px solid rgba(239,68,68,0.3)" : "none",
              }}
            >
              <div
                style={{
                  fontSize: "2rem",
                  fontWeight: "700",
                  marginBottom: "0.5rem",
                }}
              >
                {stats.ruptures}
              </div>
              <div style={{ fontSize: "0.9rem", opacity: 0.9 }}>
                🚫 Ruptures de stock
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Barre d'outils */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr auto auto",
          gap: "1rem",
          marginBottom: "2rem",
          alignItems: "center",
        }}
      >
        <input
          type="text"
          placeholder="🔍 Rechercher un consommable..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{
            padding: "0.75rem 1rem",
            borderRadius: "12px",
            border: "2px solid #e2e8f0",
            fontSize: "1rem",
            transition: "all 0.3s ease",
            backgroundColor: "white",
            boxShadow: "0 2px 4px rgba(0,0,0,0.05)",
          }}
          onFocus={(e) => (e.target.style.borderColor = "#4facfe")}
          onBlur={(e) => (e.target.style.borderColor = "#e2e8f0")}
        />

        <select
          value={`${sortBy}-${sortOrder}`}
          onChange={(e) => {
            const [field, order] = e.target.value.split("-");
            setSortBy(field);
            setSortOrder(order);
          }}
          style={{
            padding: "0.75rem 1rem",
            borderRadius: "12px",
            border: "2px solid #e2e8f0",
            fontSize: "1rem",
            backgroundColor: "white",
            cursor: "pointer",
            minWidth: "180px",
          }}
        >
          <option value="created_at-desc">Plus récents</option>
          <option value="created_at-asc">Plus anciens</option>
          <option value="type-asc">Nom A-Z</option>
          <option value="type-desc">Nom Z-A</option>
          <option value="quantite_stock-desc">Stock croissant</option>
          <option value="quantite_stock-asc">Stock décroissant</option>
        </select>

        <button
          onClick={() => setShowStats(!showStats)}
          style={{
            padding: "0.75rem 1rem",
            borderRadius: "12px",
            border: "2px solid #e2e8f0",
            background: showStats ? "#4facfe" : "white",
            color: showStats ? "white" : "#4a5568",
            fontSize: "1rem",
            fontWeight: "600",
            cursor: "pointer",
            transition: "all 0.3s ease",
          }}
        >
          📊 Stats
        </button>
      </div>

      {/* Liste des consommables */}
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
              borderTop: "4px solid #4facfe",
              borderRadius: "50%",
              animation: "spin 1s linear infinite",
              marginRight: "1rem",
            }}
          />
          Chargement...
        </div>
      ) : (
        <div
          style={{
            display: "grid",
            gap: "1rem",
          }}
        >
          {filteredConsommables.map((consommable) => {
            const isLowStock =
              consommable.quantite_stock_conteneur <= consommable.limite_alerte;
            const isOutOfStock = consommable.quantite_stock_conteneur === 0;

            return (
              <div
                key={consommable.id}
                style={{
                  background: "white",
                  borderRadius: "16px",
                  padding: "1.5rem",
                  boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
                  border: `2px solid ${isOutOfStock ? "#ef4444" : isLowStock ? "#f59e0b" : "#e5e7eb"}`,
                  transition: "all 0.3s ease",
                  position: "relative",
                }}
              >
                {/* Badges de statut */}
                {isOutOfStock && (
                  <div
                    style={{
                      position: "absolute",
                      top: "1rem",
                      right: "1rem",
                      background: "linear-gradient(135deg, #ef4444, #dc2626)",
                      color: "white",
                      padding: "0.25rem 0.75rem",
                      borderRadius: "20px",
                      fontSize: "0.75rem",
                      fontWeight: "600",
                    }}
                  >
                    🚫 Rupture
                  </div>
                )}
                {!isOutOfStock && isLowStock && (
                  <div
                    style={{
                      position: "absolute",
                      top: "1rem",
                      right: "1rem",
                      background: "linear-gradient(135deg, #f59e0b, #d97706)",
                      color: "white",
                      padding: "0.25rem 0.75rem",
                      borderRadius: "20px",
                      fontSize: "0.75rem",
                      fontWeight: "600",
                    }}
                  >
                    ⚠️ Stock bas
                  </div>
                )}

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr auto",
                    gap: "2rem",
                    alignItems: "start",
                  }}
                >
                  {/* Informations principales */}
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "80px 1fr 150px 150px",
                      gap: "1.5rem",
                      alignItems: "center",
                    }}
                  >
                    <div
                      style={{
                        width: "60px",
                        height: "60px",
                        background: "linear-gradient(135deg, #4facfe, #00f2fe)",
                        borderRadius: "16px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: "1.5rem",
                        color: "white",
                      }}
                    >
                      📦
                    </div>

                    <div>
                      <h3
                        style={{
                          margin: 0,
                          fontSize: "1.2rem",
                          fontWeight: "600",
                          color: "#2d3748",
                          marginBottom: "0.25rem",
                        }}
                      >
                        {consommable.type}
                      </h3>
                      {consommable.description && (
                        <p
                          style={{
                            margin: 0,
                            fontSize: "0.9rem",
                            color: "#718096",
                            lineHeight: "1.4",
                          }}
                        >
                          {consommable.description}
                        </p>
                      )}
                      <p
                        style={{
                          margin: "0.5rem 0 0 0",
                          fontSize: "0.8rem",
                          color: "#a0aec0",
                        }}
                      >
                        {consommable.quantite_par_conteneur}{" "}
                        {consommable.unite_base}/{consommable.unite_conteneur}
                      </p>
                    </div>

                    <div style={{ textAlign: "center" }}>
                      <div
                        style={{
                          fontSize: "1.5rem",
                          fontWeight: "700",
                          color: isOutOfStock
                            ? "#ef4444"
                            : isLowStock
                              ? "#f59e0b"
                              : "#10b981",
                          marginBottom: "0.25rem",
                        }}
                      >
                        {consommable.quantite_stock_conteneur}
                      </div>
                      <div
                        style={{
                          fontSize: "0.8rem",
                          color: "#718096",
                          fontWeight: "500",
                        }}
                      >
                        {consommable.unite_conteneur}(s)
                      </div>
                      <div
                        style={{
                          fontSize: "1.2rem",
                          fontWeight: "600",
                          color: "#38a169",
                          marginTop: "0.25rem",
                        }}
                      >
                        {consommable.quantite_stock_total}
                      </div>
                      <div
                        style={{
                          fontSize: "0.7rem",
                          color: "#718096",
                          fontWeight: "500",
                        }}
                      >
                        {consommable.unite_base}(s) total
                      </div>
                    </div>

                    <div style={{ textAlign: "center" }}>
                      <div
                        style={{
                          fontSize: "1.5rem",
                          fontWeight: "600",
                          color: "#ed8936",
                          marginBottom: "0.25rem",
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
                        Seuil alerte
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "0.5rem",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        gap: "0.5rem",
                      }}
                    >
                      <button
                        onClick={() => handleEdit(consommable)}
                        style={{
                          padding: "0.5rem 1rem",
                          borderRadius: "8px",
                          border: "none",
                          background:
                            "linear-gradient(135deg, #667eea, #764ba2)",
                          color: "white",
                          fontSize: "0.9rem",
                          fontWeight: "600",
                          cursor: "pointer",
                          transition: "all 0.3s ease",
                          display: "flex",
                          alignItems: "center",
                          gap: "0.25rem",
                        }}
                      >
                        ✏️ Modifier
                      </button>
                      <button
                        onClick={() => handleDelete(consommable.id)}
                        style={{
                          padding: "0.5rem 1rem",
                          borderRadius: "8px",
                          border: "none",
                          background:
                            "linear-gradient(135deg, #ef4444, #dc2626)",
                          color: "white",
                          fontSize: "0.9rem",
                          fontWeight: "600",
                          cursor: "pointer",
                          transition: "all 0.3s ease",
                          display: "flex",
                          alignItems: "center",
                          gap: "0.25rem",
                        }}
                      >
                        🗑️ Suppr.
                      </button>
                    </div>

                    {/* Actions de stock rapides */}
                    <div
                      style={{
                        display: "flex",
                        gap: "0.25rem",
                        fontSize: "0.8rem",
                      }}
                    >
                      <button
                        onClick={() => {
                          const quantite = prompt("Ajouter au stock:", "10");
                          if (quantite && !isNaN(quantite)) {
                            handleUpdateStock(consommable.id, "add", quantite);
                          }
                        }}
                        style={{
                          padding: "0.25rem 0.5rem",
                          borderRadius: "6px",
                          border: "1px solid #10b981",
                          background: "white",
                          color: "#10b981",
                          fontSize: "0.8rem",
                          fontWeight: "600",
                          cursor: "pointer",
                          flex: 1,
                        }}
                      >
                        +
                      </button>
                      <button
                        onClick={() => {
                          const quantite = prompt("Retirer du stock:", "10");
                          if (quantite && !isNaN(quantite)) {
                            handleUpdateStock(
                              consommable.id,
                              "subtract",
                              quantite,
                            );
                          }
                        }}
                        style={{
                          padding: "0.25rem 0.5rem",
                          borderRadius: "6px",
                          border: "1px solid #ef4444",
                          background: "white",
                          color: "#ef4444",
                          fontSize: "0.8rem",
                          fontWeight: "600",
                          cursor: "pointer",
                          flex: 1,
                        }}
                      >
                        -
                      </button>
                      <button
                        onClick={() => {
                          const quantite = prompt(
                            "Définir le stock à:",
                            consommable.quantite_stock,
                          );
                          if (quantite !== null && !isNaN(quantite)) {
                            handleUpdateStock(consommable.id, "set", quantite);
                          }
                        }}
                        style={{
                          padding: "0.25rem 0.5rem",
                          borderRadius: "6px",
                          border: "1px solid #6b7280",
                          background: "white",
                          color: "#6b7280",
                          fontSize: "0.8rem",
                          fontWeight: "600",
                          cursor: "pointer",
                          flex: 1,
                        }}
                      >
                        =
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal de formulaire */}
      {showForm && (
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
              maxWidth: "500px",
              boxShadow: "0 20px 60px rgba(0,0,0,0.2)",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                background: "linear-gradient(135deg, #4facfe, #00f2fe)",
                padding: "2rem",
                color: "white",
                position: "relative",
              }}
            >
              <button
                onClick={resetForm}
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
                {editingId
                  ? "✏️ Modifier le consommable"
                  : "➕ Nouveau consommable"}
              </h2>
              <p style={{ margin: "0.5rem 0 0 0", opacity: 0.9 }}>
                {editingId
                  ? "Modifiez les informations du consommable"
                  : "Créez un nouveau type de consommable"}
              </p>
            </div>

            <form onSubmit={handleSubmit} style={{ padding: "2rem" }}>
              <div style={{ display: "grid", gap: "1.5rem" }}>
                <div>
                  <label
                    style={{
                      display: "block",
                      fontSize: "0.9rem",
                      fontWeight: "600",
                      color: "#4a5568",
                      marginBottom: "0.5rem",
                    }}
                  >
                    Type de consommable *
                  </label>
                  <select
                    required
                    value={form.type}
                    onChange={(e) => {
                      const selectedType = e.target.value;
                      let defaultValues = {
                        unite_base: "unité",
                        unite_conteneur: "unité",
                        quantite_par_conteneur: 1,
                      };

                      if (selectedType === "Carton de rammes") {
                        defaultValues = {
                          unite_base: "paquet",
                          unite_conteneur: "carton",
                          quantite_par_conteneur: 5,
                        };
                      } else if (selectedType === "Boîte de stylos") {
                        defaultValues = {
                          unite_base: "stylo",
                          unite_conteneur: "boîte",
                          quantite_par_conteneur: 25,
                        };
                      } else if (selectedType === "Pack de feuilles A4") {
                        defaultValues = {
                          unite_base: "feuille",
                          unite_conteneur: "pack",
                          quantite_par_conteneur: 500,
                        };
                      } else if (selectedType === "Carton de toners") {
                        defaultValues = {
                          unite_base: "toner",
                          unite_conteneur: "carton",
                          quantite_par_conteneur: 4,
                        };
                      }

                      setForm({
                        ...form,
                        type: selectedType,
                        ...defaultValues,
                      });
                    }}
                    style={{
                      width: "100%",
                      padding: "0.75rem 1rem",
                      borderRadius: "12px",
                      border: "2px solid #e2e8f0",
                      fontSize: "1rem",
                      backgroundColor: "white",
                      cursor: "pointer",
                      transition: "all 0.3s ease",
                    }}
                    onFocus={(e) => (e.target.style.borderColor = "#4facfe")}
                    onBlur={(e) => (e.target.style.borderColor = "#e2e8f0")}
                  >
                    <option value="">Choisir un type...</option>
                    <option value="Carton de rammes">
                      Carton de rammes (5 paquets/carton)
                    </option>
                    <option value="Boîte de stylos">
                      Boîte de stylos (25 stylos/boîte)
                    </option>
                    <option value="Pack de feuilles A4">
                      Pack de feuilles A4 (500 feuilles/pack)
                    </option>
                    <option value="Carton de toners">
                      Carton de toners (4 toners/carton)
                    </option>
                    <option value="Boîte de trombones">
                      Boîte de trombones (100 trombones/boîte)
                    </option>
                    <option value="Pack de post-it">
                      Pack de post-it (12 blocs/pack)
                    </option>
                  </select>
                </div>

                <div>
                  <label
                    style={{
                      display: "block",
                      fontSize: "0.9rem",
                      fontWeight: "600",
                      color: "#4a5568",
                      marginBottom: "0.5rem",
                    }}
                  >
                    Description
                  </label>
                  <textarea
                    value={form.description}
                    onChange={(e) =>
                      setForm({ ...form, description: e.target.value })
                    }
                    placeholder="Description détaillée du consommable..."
                    style={{
                      width: "100%",
                      padding: "0.75rem 1rem",
                      borderRadius: "12px",
                      border: "2px solid #e2e8f0",
                      fontSize: "1rem",
                      resize: "vertical",
                      minHeight: "80px",
                      fontFamily: "inherit",
                      transition: "all 0.3s ease",
                    }}
                    onFocus={(e) => (e.target.style.borderColor = "#4facfe")}
                    onBlur={(e) => (e.target.style.borderColor = "#e2e8f0")}
                  />
                </div>

                {/* Informations sur les unités */}
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr 1fr",
                    gap: "1rem",
                    marginBottom: "1rem",
                  }}
                >
                  <div>
                    <label
                      style={{
                        display: "block",
                        fontSize: "0.9rem",
                        fontWeight: "600",
                        color: "#4a5568",
                        marginBottom: "0.5rem",
                      }}
                    >
                      Unité de base
                    </label>
                    <input
                      type="text"
                      value={form.unite_base}
                      onChange={(e) =>
                        setForm({ ...form, unite_base: e.target.value })
                      }
                      placeholder="Ex: stylo, paquet"
                      style={{
                        width: "100%",
                        padding: "0.75rem 1rem",
                        borderRadius: "12px",
                        border: "2px solid #e2e8f0",
                        fontSize: "1rem",
                        transition: "all 0.3s ease",
                      }}
                      onFocus={(e) => (e.target.style.borderColor = "#4facfe")}
                      onBlur={(e) => (e.target.style.borderColor = "#e2e8f0")}
                    />
                  </div>

                  <div>
                    <label
                      style={{
                        display: "block",
                        fontSize: "0.9rem",
                        fontWeight: "600",
                        color: "#4a5568",
                        marginBottom: "0.5rem",
                      }}
                    >
                      Unité conteneur
                    </label>
                    <input
                      type="text"
                      value={form.unite_conteneur}
                      onChange={(e) =>
                        setForm({ ...form, unite_conteneur: e.target.value })
                      }
                      placeholder="Ex: boîte, carton"
                      style={{
                        width: "100%",
                        padding: "0.75rem 1rem",
                        borderRadius: "12px",
                        border: "2px solid #e2e8f0",
                        fontSize: "1rem",
                        transition: "all 0.3s ease",
                      }}
                      onFocus={(e) => (e.target.style.borderColor = "#4facfe")}
                      onBlur={(e) => (e.target.style.borderColor = "#e2e8f0")}
                    />
                  </div>

                  <div>
                    <label
                      style={{
                        display: "block",
                        fontSize: "0.9rem",
                        fontWeight: "600",
                        color: "#4a5568",
                        marginBottom: "0.5rem",
                      }}
                    >
                      Quantité par conteneur
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={form.quantite_par_conteneur}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          quantite_par_conteneur: parseInt(e.target.value) || 1,
                        })
                      }
                      style={{
                        width: "100%",
                        padding: "0.75rem 1rem",
                        borderRadius: "12px",
                        border: "2px solid #e2e8f0",
                        fontSize: "1rem",
                        transition: "all 0.3s ease",
                      }}
                      onFocus={(e) => (e.target.style.borderColor = "#4facfe")}
                      onBlur={(e) => (e.target.style.borderColor = "#e2e8f0")}
                    />
                  </div>
                </div>

                {/* Stock et alerte */}
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: "1rem",
                  }}
                >
                  <div>
                    <label
                      style={{
                        display: "block",
                        fontSize: "0.9rem",
                        fontWeight: "600",
                        color: "#4a5568",
                        marginBottom: "0.5rem",
                      }}
                    >
                      Stock initial (en {form.unite_conteneur}s)
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={form.quantite_stock_conteneur}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          quantite_stock_conteneur:
                            parseInt(e.target.value) || 0,
                        })
                      }
                      style={{
                        width: "100%",
                        padding: "0.75rem 1rem",
                        borderRadius: "12px",
                        border: "2px solid #e2e8f0",
                        fontSize: "1rem",
                        transition: "all 0.3s ease",
                      }}
                      onFocus={(e) => (e.target.style.borderColor = "#4facfe")}
                      onBlur={(e) => (e.target.style.borderColor = "#e2e8f0")}
                    />
                    <small
                      style={{
                        color: "#718096",
                        fontSize: "0.8rem",
                        marginTop: "0.25rem",
                        display: "block",
                      }}
                    >
                      Total:{" "}
                      {(form.quantite_stock_conteneur || 0) *
                        (form.quantite_par_conteneur || 1)}{" "}
                      {form.unite_base}(s)
                    </small>
                  </div>

                  <div>
                    <label
                      style={{
                        display: "block",
                        fontSize: "0.9rem",
                        fontWeight: "600",
                        color: "#4a5568",
                        marginBottom: "0.5rem",
                      }}
                    >
                      Seuil d'alerte (en {form.unite_conteneur}s)
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={form.limite_alerte}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          limite_alerte: parseInt(e.target.value) || 0,
                        })
                      }
                      style={{
                        width: "100%",
                        padding: "0.75rem 1rem",
                        borderRadius: "12px",
                        border: "2px solid #e2e8f0",
                        fontSize: "1rem",
                        transition: "all 0.3s ease",
                      }}
                      onFocus={(e) => (e.target.style.borderColor = "#4facfe")}
                      onBlur={(e) => (e.target.style.borderColor = "#e2e8f0")}
                    />
                  </div>
                </div>

                <div
                  style={{
                    display: "flex",
                    gap: "1rem",
                    justifyContent: "flex-end",
                    marginTop: "1rem",
                  }}
                >
                  <button
                    type="button"
                    onClick={resetForm}
                    style={{
                      padding: "0.75rem 1.5rem",
                      borderRadius: "12px",
                      border: "2px solid #e2e8f0",
                      background: "white",
                      color: "#4a5568",
                      fontSize: "1rem",
                      fontWeight: "600",
                      cursor: "pointer",
                      transition: "all 0.3s ease",
                    }}
                  >
                    Annuler
                  </button>

                  <button
                    type="submit"
                    disabled={loading}
                    style={{
                      padding: "0.75rem 2rem",
                      borderRadius: "12px",
                      border: "none",
                      background: loading
                        ? "linear-gradient(135deg, #a0aec0, #718096)"
                        : "linear-gradient(135deg, #4facfe, #00f2fe)",
                      color: "white",
                      fontSize: "1rem",
                      fontWeight: "600",
                      cursor: loading ? "not-allowed" : "pointer",
                      opacity: loading ? 0.7 : 1,
                      display: "flex",
                      alignItems: "center",
                      gap: "0.5rem",
                      transition: "all 0.3s ease",
                    }}
                  >
                    {loading ? (
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
                        Enregistrement...
                      </>
                    ) : editingId ? (
                      <>✏️ Modifier</>
                    ) : (
                      <>➕ Créer</>
                    )}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        .stock-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 30px rgba(0, 0, 0, 0.12);
        }

        .action-button:hover {
          transform: translateY(-1px);
          box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
        }

        .search-input:focus {
          box-shadow: 0 0 0 3px rgba(79, 172, 254, 0.1);
          border-color: #4facfe;
        }
      `}</style>
    </>
  );
}

export default StockManagementTab;
