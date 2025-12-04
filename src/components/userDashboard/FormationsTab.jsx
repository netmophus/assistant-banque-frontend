// FormationsTab.jsx - Composant complet pour les formations
import React from "react";
import { formatGeneratedContent } from "./utils";

function FormationsTab({
  formations,
  selectedFormation,
  setSelectedFormation,
  expandedModules,
  setExpandedModules,
  expandedChapters,
  expandedParties,
  setExpandedParties,
  generatingContent,
  generatingPartieContent,
  chapterQuestions,
  showQuestionForm,
  setShowQuestionForm,
  chapterQuestionText,
  setChapterQuestionText,
  questionSuggestions,
  loadingSuggestions,
  expandedAnswers,
  setExpandedAnswers,
  qcmSelectedAnswers,
  qcmResponses,
  qcmStats,
  submittingQcm,
  expandedQcm,
  setExpandedQcm,
  toggleChapter,
  togglePartie,
  handleGenerateChapterContent,
  handleGeneratePartieContent,
  handleAskChapterQuestion,
  handleQcmAnswerSelect,
  handleQcmSubmit,
}) {
  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", marginBottom: "24px" }}>
        <div style={{
          width: "40px",
          height: "40px",
          borderRadius: "10px",
          backgroundColor: "#fff3e0",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          marginRight: "12px",
          fontSize: "20px",
        }}>
          📚
        </div>
        <h3 style={{ margin: 0, fontSize: "1.4rem", color: "#333" }}>
          Mes formations
        </h3>
        {formations.length > 0 && (
          <span style={{
            marginLeft: "12px",
            padding: "4px 12px",
            backgroundColor: "#fff3e0",
            color: "#f57c00",
            borderRadius: "12px",
            fontSize: "0.85rem",
            fontWeight: "bold",
          }}>
            {formations.length}
          </span>
        )}
      </div>

      {formations.length === 0 ? (
        <div style={{
          padding: "60px 24px",
          textAlign: "center",
          backgroundColor: "#f9f9f9",
          borderRadius: "12px",
          border: "2px dashed #e0e0e0",
        }}>
          <div style={{ fontSize: "48px", marginBottom: "16px" }}>🎓</div>
          <p style={{ margin: 0, color: "#666", fontSize: "1.1rem", fontWeight: "500" }}>
            Aucune formation disponible pour le moment.
          </p>
          <p style={{ margin: "8px 0 0 0", color: "#999", fontSize: "0.9rem" }}>
            Les formations assignées à votre département apparaîtront ici.
          </p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          {formations.map((formation) => (
            <div
              key={formation.id}
              style={{
                padding: "24px",
                border: "1px solid #e0e0e0",
                borderRadius: "12px",
                backgroundColor: "#fff",
                boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
                transition: "all 0.3s ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.boxShadow = "0 4px 16px rgba(0,0,0,0.12)";
                e.currentTarget.style.transform = "translateY(-2px)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.boxShadow = "0 2px 8px rgba(0,0,0,0.08)";
                e.currentTarget.style.transform = "translateY(0)";
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start" }}>
                <div style={{ flex: 1 }}>
                  <h4 style={{ margin: "0 0 8px 0", color: "#f57c00", fontSize: "1.2rem" }}>
                    {formation.titre}
                  </h4>
                  {formation.description && (
                    <p style={{ margin: "0 0 12px 0", color: "#666", fontSize: "0.95rem" }}>
                      {formation.description}
                    </p>
                  )}
                  <div style={{ display: "flex", gap: "16px", fontSize: "0.85rem", color: "#999" }}>
                    <span>📦 {formation.modules?.length || 0} module(s)</span>
                    <span>📄 {formation.modules?.reduce((acc, m) => acc + (m.chapitres?.length || 0), 0) || 0} chapitre(s)</span>
                  </div>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedFormation(selectedFormation?.id === formation.id ? null : formation);
                  }}
                  style={{
                    padding: "8px 16px",
                    borderRadius: "6px",
                    border: "1px solid #f57c00",
                    backgroundColor: selectedFormation?.id === formation.id ? "#f57c00" : "#fff",
                    color: selectedFormation?.id === formation.id ? "#fff" : "#f57c00",
                    cursor: "pointer",
                    fontSize: "0.9rem",
                    fontWeight: "600",
                  }}
                >
                  {selectedFormation?.id === formation.id ? "Masquer" : "Voir le contenu"}
                </button>
              </div>

              {selectedFormation?.id === formation.id && (
                <div 
                  style={{ marginTop: "24px", paddingTop: "24px", borderTop: "2px solid #e0e0e0" }}
                  onClick={(e) => e.stopPropagation()}
                >
                  {formation.modules && formation.modules.length > 0 ? (
                    formation.modules.map((module, moduleIndex) => {
                      const moduleKey = `${formation.id}-${module.id}`;
                      const isModuleExpanded = expandedModules[moduleKey] !== false; // Par défaut ouvert
                      
                      return (
                      <div
                        key={module.id || moduleIndex}
                        style={{
                          marginBottom: "24px",
                          borderRadius: "8px",
                          border: "1px solid #e0e0e0",
                          backgroundColor: "#fff",
                          overflow: "hidden",
                          boxShadow: "0 2px 4px rgba(0,0,0,0.05)",
                        }}
                      >
                        {/* En-tête cliquable du module */}
                        <div
                          onClick={() => {
                            setExpandedModules({
                              ...expandedModules,
                              [moduleKey]: !isModuleExpanded
                            });
                          }}
                          style={{
                            padding: "16px 20px",
                            backgroundColor: "#f3e5f5",
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            transition: "background-color 0.2s ease",
                            borderBottom: isModuleExpanded ? "1px solid #e0e0e0" : "none",
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = "#e1bee7";
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = "#f3e5f5";
                          }}
                        >
                          <div style={{ display: "flex", alignItems: "center", flex: 1 }}>
                            <span style={{
                              marginRight: "12px",
                              fontSize: "1.2rem",
                              transition: "transform 0.3s ease",
                              transform: isModuleExpanded ? "rotate(90deg)" : "rotate(0deg)",
                              color: "#7b1fa2",
                            }}>
                              ▶
                            </span>
                            <h5 style={{ margin: 0, color: "#7b1fa2", fontSize: "1.1rem", fontWeight: "600" }}>
                              Module {moduleIndex + 1}: {module.titre}
                            </h5>
                          </div>
                          {module.chapitres && module.chapitres.length > 0 && (
                            <span style={{
                              marginLeft: "12px",
                              fontSize: "0.85rem",
                              color: "#666",
                              backgroundColor: "#fff",
                              padding: "4px 8px",
                              borderRadius: "12px",
                            }}>
                              {module.chapitres.length} chapitre{module.chapitres.length > 1 ? "s" : ""}
                            </span>
                          )}
                        </div>

                        {/* Contenu du module (déroulable) */}
                        {isModuleExpanded && (
                          <div style={{
                            padding: "20px",
                            backgroundColor: "#f9f9f9",
                          }}
                          onClick={(e) => e.stopPropagation()}
                          >
                        {module.chapitres && module.chapitres.length > 0 ? (
                          module.chapitres.map((chapitre, chapitreIndex) => (
                            <div
                              key={chapitre.id || chapitreIndex}
                              style={{
                                marginBottom: "20px",
                                backgroundColor: "#fff",
                                borderRadius: "8px",
                                border: "1px solid #e0e0e0",
                                overflow: "hidden",
                                boxShadow: "0 2px 4px rgba(0,0,0,0.05)",
                              }}
                            >
                              {/* En-tête du chapitre (cliquable) */}
                              <div
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleChapter(formation.id, module.id, chapitre.id);
                                }}
                                style={{
                                  padding: "16px",
                                  backgroundColor: expandedChapters[`${formation.id}-${module.id}-${chapitre.id}`] ? "#f3e5f5" : "#fff",
                                  cursor: "pointer",
                                  display: "flex",
                                  justifyContent: "space-between",
                                  alignItems: "center",
                                  transition: "background-color 0.2s ease",
                                }}
                                onMouseEnter={(e) => {
                                  if (!expandedChapters[`${formation.id}-${module.id}-${chapitre.id}`]) {
                                    e.currentTarget.style.backgroundColor = "#f9f9f9";
                                  }
                                }}
                                onMouseLeave={(e) => {
                                  if (!expandedChapters[`${formation.id}-${module.id}-${chapitre.id}`]) {
                                    e.currentTarget.style.backgroundColor = "#fff";
                                  }
                                }}
                              >
                                <div style={{ display: "flex", alignItems: "center", flex: 1 }}>
                                  <span style={{
                                    marginRight: "12px",
                                    fontSize: "1.2rem",
                                    transition: "transform 0.3s ease",
                                    transform: expandedChapters[`${formation.id}-${module.id}-${chapitre.id}`] ? "rotate(90deg)" : "rotate(0deg)",
                                  }}>
                                    ▶
                                  </span>
                                  <h6 style={{ margin: 0, color: "#6a1b9a", fontSize: "1rem", fontWeight: "600" }}>
                                    Chapitre {chapitreIndex + 1}: {chapitre.introduction}
                                  </h6>
                                </div>
                                <div style={{ display: "flex", gap: "8px" }}>
                                  {!chapitre.contenu_genere && (
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleGenerateChapterContent(formation.id, module.id, chapitre.id);
                                      }}
                                      disabled={generatingContent[`${formation.id}-${module.id}-${chapitre.id}`]}
                                      style={{
                                        padding: "6px 12px",
                                        borderRadius: "4px",
                                        border: "none",
                                        backgroundColor: generatingContent[`${formation.id}-${module.id}-${chapitre.id}`] ? "#ccc" : "#1976d2",
                                        color: "#fff",
                                        cursor: generatingContent[`${formation.id}-${module.id}-${chapitre.id}`] ? "not-allowed" : "pointer",
                                        fontSize: "0.85rem",
                                        fontWeight: "600",
                                      }}
                                    >
                                      {generatingContent[`${formation.id}-${module.id}-${chapitre.id}`] ? "⏳ Génération..." : "🤖 Générer"}
                                    </button>
                                  )}
                                </div>
                              </div>

                              {/* Contenu du chapitre (déroulable) */}
                              {expandedChapters[`${formation.id}-${module.id}-${chapitre.id}`] && (
                                <div 
                                  style={{ padding: "20px", borderTop: "1px solid #e0e0e0", backgroundColor: "#fafafa" }}
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  {/* Introduction du chapitre */}
                                  <div style={{
                                    padding: "16px",
                                    backgroundColor: "#fff",
                                    borderRadius: "8px",
                                    borderLeft: "4px solid #6a1b9a",
                                    marginBottom: "20px",
                                    boxShadow: "0 2px 4px rgba(0,0,0,0.05)",
                                  }}>
                                    <div style={{ display: "flex", alignItems: "center", marginBottom: "8px" }}>
                                      <span style={{ fontSize: "1.2rem", marginRight: "8px" }}>📖</span>
                                      <strong style={{ color: "#6a1b9a", fontSize: "0.95rem" }}>Introduction du chapitre</strong>
                                    </div>
                                    <p style={{ margin: "8px 0 0 0", color: "#555", fontSize: "0.9rem", lineHeight: "1.6" }}>
                                      {chapitre.introduction}
                                    </p>
                                  </div>

                                  {/* Liste des parties */}
                                  {chapitre.parties && chapitre.parties.length > 0 ? (
                                    <div style={{ marginBottom: "24px" }}>
                                      <div style={{ display: "flex", alignItems: "center", marginBottom: "16px" }}>
                                        <span style={{ fontSize: "1.2rem", marginRight: "8px" }}>📑</span>
                                        <h7 style={{ margin: 0, color: "#333", fontSize: "1rem", fontWeight: "600" }}>
                                          Parties du chapitre ({chapitre.parties.length})
                                        </h7>
                                      </div>
                                      
                                      <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                                        {chapitre.parties.map((partie, partieIndex) => {
                                          const partieKey = `${formation.id}-${module.id}-${chapitre.id}-${partie.id || partieIndex}`;
                                          const isPartieExpanded = expandedParties[partieKey];
                                          
                                          return (
                                            <div
                                              key={partie.id || partieIndex}
                                              style={{
                                                backgroundColor: "#fff",
                                                borderRadius: "8px",
                                                border: "1px solid #e0e0e0",
                                                overflow: "hidden",
                                                boxShadow: "0 2px 4px rgba(0,0,0,0.05)",
                                              }}
                                            >
                                              {/* En-tête de la partie (cliquable) */}
                                              <div
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  togglePartie(formation.id, module.id, chapitre.id, partie.id || partieIndex);
                                                }}
                                                style={{
                                                  padding: "14px 16px",
                                                  backgroundColor: isPartieExpanded ? "#f3e5f5" : "#fff",
                                                  cursor: "pointer",
                                                  display: "flex",
                                                  justifyContent: "space-between",
                                                  alignItems: "center",
                                                  transition: "background-color 0.2s ease",
                                                }}
                                                onMouseEnter={(e) => {
                                                  if (!isPartieExpanded) {
                                                    e.currentTarget.style.backgroundColor = "#f9f9f9";
                                                  }
                                                }}
                                                onMouseLeave={(e) => {
                                                  if (!isPartieExpanded) {
                                                    e.currentTarget.style.backgroundColor = "#fff";
                                                  }
                                                }}
                                              >
                                                <div style={{ display: "flex", alignItems: "center", flex: 1 }}>
                                                  <span style={{
                                                    marginRight: "12px",
                                                    fontSize: "1rem",
                                                    transition: "transform 0.3s ease",
                                                    transform: isPartieExpanded ? "rotate(90deg)" : "rotate(0deg)",
                                                    color: "#9c27b0",
                                                  }}>
                                                    ▶
                                                  </span>
                                                  <div style={{ flex: 1 }}>
                                                    <div style={{ fontWeight: "600", color: "#7b1fa2", fontSize: "0.95rem", marginBottom: "4px" }}>
                                                      Partie {partieIndex + 1}: {partie.titre}
                                                    </div>
                                                    {partie.contenu && !isPartieExpanded && (
                                                      <div style={{ fontSize: "0.85rem", color: "#999", fontStyle: "italic" }}>
                                                        {partie.contenu.substring(0, 80)}...
                                                      </div>
                                                    )}
                                                  </div>
                                                </div>
                                                {!partie.contenu_genere && (
                                                  <button
                                                    onClick={(e) => {
                                                      e.stopPropagation();
                                                      handleGeneratePartieContent(formation.id, module.id, chapitre.id, partie.id || partieIndex);
                                                    }}
                                                    disabled={generatingPartieContent[partieKey]}
                                                    style={{
                                                      padding: "6px 12px",
                                                      borderRadius: "4px",
                                                      border: "none",
                                                      backgroundColor: generatingPartieContent[partieKey] ? "#ccc" : "#1976d2",
                                                      color: "#fff",
                                                      cursor: generatingPartieContent[partieKey] ? "not-allowed" : "pointer",
                                                      fontSize: "0.8rem",
                                                      fontWeight: "600",
                                                      marginLeft: "12px",
                                                    }}
                                                  >
                                                    {generatingPartieContent[partieKey] ? "⏳..." : "🤖 Générer"}
                                                  </button>
                                                )}
                                              </div>

                                              {/* Contenu de la partie (déroulable) */}
                                              {isPartieExpanded && (
                                                <div style={{ padding: "16px", borderTop: "1px solid #e0e0e0", backgroundColor: "#fafafa" }}>
                                                  {/* Prompt de la partie */}
                                                  <div style={{
                                                    padding: "12px",
                                                    backgroundColor: "#fff3e0",
                                                    borderRadius: "6px",
                                                    borderLeft: "3px solid #f57c00",
                                                    marginBottom: "16px",
                                                  }}>
                                                    <div style={{ fontSize: "0.85rem", color: "#f57c00", fontWeight: "600", marginBottom: "6px" }}>
                                                      📝 Prompt pour l'IA:
                                                    </div>
                                                    <p style={{ margin: 0, fontSize: "0.9rem", color: "#666", lineHeight: "1.5" }}>
                                                      {partie.contenu || "Aucun prompt disponible"}
                                                    </p>
                                                  </div>

                                                  {/* Contenu généré de la partie */}
                                                  {partie.contenu_genere ? (
                                                    <div
                                                      style={{
                                                        padding: "16px",
                                                        backgroundColor: "#e8f5e9",
                                                        borderRadius: "8px",
                                                        borderLeft: "4px solid #4caf50",
                                                        fontSize: "0.9rem",
                                                        color: "#424242",
                                                        boxShadow: "0 2px 4px rgba(0,0,0,0.05)",
                                                      }}
                                                    >
                                                      {formatGeneratedContent(partie.contenu_genere)}
                                                    </div>
                                                  ) : (
                                                    <div style={{
                                                      padding: "16px",
                                                      backgroundColor: "#fff",
                                                      borderRadius: "6px",
                                                      border: "2px dashed #ddd",
                                                      textAlign: "center",
                                                    }}>
                                                      <div style={{ fontSize: "2rem", marginBottom: "8px" }}>📄</div>
                                                      <p style={{ margin: "0 0 12px 0", color: "#999", fontSize: "0.9rem" }}>
                                                        Le contenu de cette partie n'a pas encore été généré.
                                                      </p>
                                                      <button
                                                        onClick={() => handleGeneratePartieContent(formation.id, module.id, chapitre.id, partie.id || partieIndex)}
                                                        disabled={generatingPartieContent[partieKey]}
                                                        style={{
                                                          padding: "8px 16px",
                                                          borderRadius: "6px",
                                                          border: "none",
                                                          backgroundColor: generatingPartieContent[partieKey] ? "#ccc" : "#1976d2",
                                                          color: "#fff",
                                                          cursor: generatingPartieContent[partieKey] ? "not-allowed" : "pointer",
                                                          fontSize: "0.85rem",
                                                          fontWeight: "600",
                                                        }}
                                                      >
                                                        {generatingPartieContent[partieKey] ? "⏳ Génération en cours..." : "🤖 Générer le contenu avec l'IA"}
                                                      </button>
                                                    </div>
                                                  )}
                                                </div>
                                              )}
                                            </div>
                                          );
                                        })}
                                      </div>
                                    </div>
                                  ) : (
                                    <div style={{
                                      padding: "20px",
                                      textAlign: "center",
                                      backgroundColor: "#fff",
                                      borderRadius: "8px",
                                      border: "2px dashed #ddd",
                                      color: "#999",
                                    }}>
                                      <div style={{ fontSize: "2rem", marginBottom: "8px" }}>📄</div>
                                      <p style={{ margin: 0 }}>Aucune partie définie pour ce chapitre.</p>
                                    </div>
                                  )}

                                  {/* Suggestions de questions générées par l'IA */}
                                  <div style={{
                                    marginBottom: "24px",
                                    padding: "20px",
                                    backgroundColor: "#f0f7ff",
                                    borderRadius: "8px",
                                    border: "1px solid #1976d2",
                                    boxShadow: "0 2px 4px rgba(0,0,0,0.05)",
                                  }}>
                                    <div style={{ display: "flex", alignItems: "center", marginBottom: "16px" }}>
                                      <span style={{ fontSize: "1.5rem", marginRight: "10px" }}>💡</span>
                                      <h7 style={{ margin: 0, color: "#1976d2", fontSize: "1rem", fontWeight: "600" }}>
                                        Questions suggérées par l'IA
                                      </h7>
                                    </div>
                                    
                                    {loadingSuggestions[`${formation.id}-${module.id}-${chapitre.id}`] ? (
                                      <div style={{ padding: "16px", textAlign: "center", color: "#666" }}>
                                        ⏳ Génération des suggestions...
                                      </div>
                                    ) : questionSuggestions[`${formation.id}-${module.id}-${chapitre.id}`] && questionSuggestions[`${formation.id}-${module.id}-${chapitre.id}`].length > 0 ? (
                                      <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                                        {questionSuggestions[`${formation.id}-${module.id}-${chapitre.id}`].map((suggestion, sIdx) => (
                                          <button
                                            key={sIdx}
                                            onClick={() => handleAskChapterQuestion(formation.id, module.id, chapitre.id, suggestion)}
                                            style={{
                                              padding: "12px 16px",
                                              borderRadius: "6px",
                                              border: "1px solid #1976d2",
                                              backgroundColor: "#fff",
                                              color: "#1976d2",
                                              cursor: "pointer",
                                              fontSize: "0.9rem",
                                              textAlign: "left",
                                              transition: "all 0.2s ease",
                                              boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
                                            }}
                                            onMouseEnter={(e) => {
                                              e.currentTarget.style.backgroundColor = "#e3f2fd";
                                              e.currentTarget.style.transform = "translateX(4px)";
                                            }}
                                            onMouseLeave={(e) => {
                                              e.currentTarget.style.backgroundColor = "#fff";
                                              e.currentTarget.style.transform = "translateX(0)";
                                            }}
                                          >
                                            <div style={{ display: "flex", alignItems: "start" }}>
                                              <span style={{ marginRight: "10px", fontSize: "1.2rem" }}>❓</span>
                                              <span style={{ flex: 1 }}>{suggestion}</span>
                                              <span style={{ marginLeft: "10px", fontSize: "0.8rem", opacity: 0.7 }}>→</span>
                                            </div>
                                          </button>
                                        ))}
                                      </div>
                                    ) : (
                                      <div style={{ padding: "16px", textAlign: "center", color: "#999", fontSize: "0.9rem" }}>
                                        Aucune suggestion disponible pour le moment.
                                      </div>
                                    )}
                                  </div>

                                  {/* Formulaire pour poser une question personnalisée */}
                                  <div style={{
                                    padding: "20px",
                                    backgroundColor: "#f9f9f9",
                                    borderRadius: "8px",
                                    border: "1px solid #e0e0e0",
                                  }}>
                                    <div style={{ display: "flex", alignItems: "center", marginBottom: "16px" }}>
                                      <span style={{ fontSize: "1.5rem", marginRight: "10px" }}>💬</span>
                                      <h7 style={{ margin: 0, color: "#333", fontSize: "1rem", fontWeight: "600" }}>
                                        Poser votre propre question
                                      </h7>
                                    </div>
                                    
                                    {!showQuestionForm[`${formation.id}-${module.id}-${chapitre.id}`] ? (
                                      <button
                                        onClick={() => {
                                          const key = `${formation.id}-${module.id}-${chapitre.id}`;
                                          setShowQuestionForm({ ...showQuestionForm, [key]: true });
                                        }}
                                        style={{
                                          padding: "10px 20px",
                                          borderRadius: "6px",
                                          border: "1px solid #4caf50",
                                          backgroundColor: "#fff",
                                          color: "#4caf50",
                                          cursor: "pointer",
                                          fontSize: "0.9rem",
                                          fontWeight: "600",
                                          transition: "all 0.2s ease",
                                        }}
                                        onMouseEnter={(e) => {
                                          e.currentTarget.style.backgroundColor = "#4caf50";
                                          e.currentTarget.style.color = "#fff";
                                        }}
                                        onMouseLeave={(e) => {
                                          e.currentTarget.style.backgroundColor = "#fff";
                                          e.currentTarget.style.color = "#4caf50";
                                        }}
                                      >
                                        + Ajouter une question personnalisée
                                      </button>
                                    ) : (
                                      <div>
                                        <textarea
                                          value={chapterQuestionText[`${formation.id}-${module.id}-${chapitre.id}`] || ""}
                                          onChange={(e) => {
                                            const key = `${formation.id}-${module.id}-${chapitre.id}`;
                                            setChapterQuestionText({ ...chapterQuestionText, [key]: e.target.value });
                                          }}
                                          placeholder="Ex: Pouvez-vous expliquer plus en détail la partie sur les crédits à la consommation ?"
                                          style={{
                                            width: "100%",
                                            padding: "12px",
                                            borderRadius: "6px",
                                            border: "1px solid #ddd",
                                            minHeight: "100px",
                                            fontSize: "0.9rem",
                                            fontFamily: "inherit",
                                            resize: "vertical",
                                            marginBottom: "12px",
                                          }}
                                        />
                                        <div style={{ display: "flex", gap: "8px" }}>
                                          <button
                                            onClick={() => handleAskChapterQuestion(formation.id, module.id, chapitre.id)}
                                            disabled={!chapterQuestionText[`${formation.id}-${module.id}-${chapitre.id}`]?.trim()}
                                            style={{
                                              padding: "10px 20px",
                                              borderRadius: "6px",
                                              border: "none",
                                              backgroundColor: chapterQuestionText[`${formation.id}-${module.id}-${chapitre.id}`]?.trim() ? "#4caf50" : "#ccc",
                                              color: "#fff",
                                              cursor: chapterQuestionText[`${formation.id}-${module.id}-${chapitre.id}`]?.trim() ? "pointer" : "not-allowed",
                                              fontSize: "0.9rem",
                                              fontWeight: "600",
                                            }}
                                          >
                                            Envoyer la question
                                          </button>
                                          <button
                                            onClick={() => {
                                              const key = `${formation.id}-${module.id}-${chapitre.id}`;
                                              setShowQuestionForm({ ...showQuestionForm, [key]: false });
                                              setChapterQuestionText({ ...chapterQuestionText, [key]: "" });
                                            }}
                                            style={{
                                              padding: "10px 20px",
                                              borderRadius: "6px",
                                              border: "1px solid #999",
                                              backgroundColor: "#fff",
                                              color: "#999",
                                              cursor: "pointer",
                                              fontSize: "0.9rem",
                                            }}
                                          >
                                            Annuler
                                          </button>
                                        </div>
                                      </div>
                                    )}
                                  </div>

                                  {/* Questions posées sur ce chapitre */}
                                  {chapterQuestions[`${formation.id}-${module.id}-${chapitre.id}`] && chapterQuestions[`${formation.id}-${module.id}-${chapitre.id}`].length > 0 && (
                                    <div style={{
                                      marginTop: "24px",
                                      padding: "20px",
                                      backgroundColor: "#f5f5f5",
                                      borderRadius: "8px",
                                      border: "1px solid #e0e0e0",
                                      boxShadow: "0 2px 4px rgba(0,0,0,0.05)",
                                    }}>
                                      <div style={{ display: "flex", alignItems: "center", marginBottom: "16px" }}>
                                        <span style={{ fontSize: "1.5rem", marginRight: "10px" }}>💬</span>
                                        <h7 style={{ margin: 0, color: "#333", fontSize: "1rem", fontWeight: "600" }}>
                                          Vos questions sur ce chapitre ({chapterQuestions[`${formation.id}-${module.id}-${chapitre.id}`].length})
                                        </h7>
                                      </div>
                                      {chapterQuestions[`${formation.id}-${module.id}-${chapitre.id}`].map((q, qIdx) => (
                                        <div
                                          key={qIdx}
                                          style={{
                                            marginBottom: "16px",
                                            padding: "16px",
                                            backgroundColor: "#fff",
                                            borderRadius: "6px",
                                            border: "1px solid #e0e0e0",
                                            boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
                                          }}
                                        >
                                          <div style={{ marginBottom: "10px" }}>
                                            <strong style={{ color: "#1976d2", fontSize: "0.9rem" }}>❓ Question:</strong>
                                            <p style={{ margin: "6px 0 0 0", color: "#333", fontSize: "0.95rem", lineHeight: "1.5" }}>{q.question}</p>
                                          </div>
                                          {q.answer && (
                                            <div style={{
                                              marginTop: "12px",
                                              borderRadius: "6px",
                                              borderLeft: "3px solid #4caf50",
                                              backgroundColor: "#fff",
                                              overflow: "hidden",
                                              boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
                                            }}>
                                              {/* En-tête cliquable */}
                                              <div
                                                onClick={() => {
                                                  const answerKey = `${formation.id}-${module.id}-${chapitre.id}-${q.id}`;
                                                  setExpandedAnswers({
                                                    ...expandedAnswers,
                                                    [answerKey]: expandedAnswers[answerKey] === undefined ? false : !expandedAnswers[answerKey]
                                                  });
                                                }}
                                                style={{
                                                  padding: "10px 12px",
                                                  backgroundColor: "#e8f5e9",
                                                  cursor: "pointer",
                                                  display: "flex",
                                                  alignItems: "center",
                                                  justifyContent: "space-between",
                                                  transition: "background-color 0.2s ease",
                                                }}
                                                onMouseEnter={(e) => {
                                                  e.currentTarget.style.backgroundColor = "#c8e6c9";
                                                }}
                                                onMouseLeave={(e) => {
                                                  e.currentTarget.style.backgroundColor = "#e8f5e9";
                                                }}
                                              >
                                                <strong style={{ color: "#2e7d32", fontSize: "0.9rem" }}>💡 Réponse:</strong>
                                                <span style={{
                                                  fontSize: "0.9rem",
                                                  color: "#2e7d32",
                                                  transition: "transform 0.3s ease",
                                                  transform: expandedAnswers[`${formation.id}-${module.id}-${chapitre.id}-${q.id}`] !== false ? "rotate(180deg)" : "rotate(0deg)",
                                                }}>
                                                  ▼
                                                </span>
                                              </div>
                                              
                                              {/* Contenu de la réponse (déroulable) */}
                                              {expandedAnswers[`${formation.id}-${module.id}-${chapitre.id}-${q.id}`] !== false && (
                                                <div style={{ 
                                                  padding: "12px",
                                                  backgroundColor: "#f9f9f9",
                                                }}>
                                                  <div style={{ margin: 0, color: "#424242", fontSize: "0.9rem", lineHeight: "1.6" }}>
                                                    {formatGeneratedContent(q.answer)}
                                                  </div>
                                                </div>
                                              )}
                                            </div>
                                          )}
                                          {q.status === "pending" && (
                                            <div style={{
                                              marginTop: "12px",
                                              padding: "10px",
                                              backgroundColor: "#fff3e0",
                                              borderRadius: "6px",
                                              borderLeft: "3px solid #f57c00",
                                              color: "#f57c00",
                                              fontSize: "0.85rem",
                                              fontStyle: "italic",
                                            }}>
                                              ⏳ En attente de réponse...
                                            </div>
                                          )}
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          ))
                        ) : (
                          <p style={{ color: "#999", fontStyle: "italic" }}>Aucun chapitre dans ce module.</p>
                        )}

                        {module.questions_qcm && module.questions_qcm.length > 0 && (
                          <div style={{
                            marginTop: "20px",
                            borderRadius: "8px",
                            border: "1px solid #e0e0e0",
                            backgroundColor: "#fff",
                            overflow: "hidden",
                            boxShadow: "0 2px 4px rgba(0,0,0,0.05)",
                          }}>
                            {/* En-tête cliquable du QCM */}
                            <div
                              onClick={() => {
                                const qcmKey = `${formation.id}-${module.id}`;
                                setExpandedQcm({
                                  ...expandedQcm,
                                  [qcmKey]: expandedQcm[qcmKey] === undefined ? false : !expandedQcm[qcmKey]
                                });
                              }}
                              style={{
                                padding: "16px 20px",
                                backgroundColor: "#e3f2fd",
                                cursor: "pointer",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "space-between",
                                transition: "background-color 0.2s ease",
                                borderBottom: expandedQcm[`${formation.id}-${module.id}`] !== false ? "1px solid #e0e0e0" : "none",
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.backgroundColor = "#bbdefb";
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.backgroundColor = "#e3f2fd";
                              }}
                            >
                              <div style={{ display: "flex", alignItems: "center", flex: 1 }}>
                                <span style={{
                                  marginRight: "12px",
                                  fontSize: "1.2rem",
                                  transition: "transform 0.3s ease",
                                  transform: expandedQcm[`${formation.id}-${module.id}`] !== false ? "rotate(90deg)" : "rotate(0deg)",
                                  color: "#1976d2",
                                }}>
                                  ▶
                                </span>
                                <div style={{ flex: 1 }}>
                                  <h6 style={{ margin: "0 0 4px 0", color: "#1976d2", fontSize: "1rem", fontWeight: "600" }}>
                                    ❓ Questions QCM ({module.questions_qcm.length})
                                  </h6>
                                  {qcmStats[`${formation.id}-${module.id}`] && (
                                    <div style={{ display: "flex", gap: "16px", fontSize: "0.85rem", color: "#666" }}>
                                      <span><strong>{qcmStats[`${formation.id}-${module.id}`].answered_questions}</strong> / {qcmStats[`${formation.id}-${module.id}`].total_questions} répondues</span>
                                      <span><strong style={{ color: "#4caf50" }}>{qcmStats[`${formation.id}-${module.id}`].correct_answers}</strong> correctes</span>
                                      <span><strong style={{ color: "#1976d2" }}>{qcmStats[`${formation.id}-${module.id}`].score_percentage}%</strong> de réussite</span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                            
                            {/* Contenu du QCM (déroulable) */}
                            {expandedQcm[`${formation.id}-${module.id}`] !== false && (
                              <div style={{
                                padding: "20px",
                                backgroundColor: "#f5f5f5",
                              }}
                              onClick={(e) => e.stopPropagation()}
                              >
                                {/* Statistiques détaillées */}
                                {qcmStats[`${formation.id}-${module.id}`] && (
                                  <div style={{
                                    marginBottom: "20px",
                                    padding: "16px",
                                    backgroundColor: "#fff",
                                    borderRadius: "8px",
                                    border: "2px solid #1976d2",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "space-between",
                                  }}>
                                    <div>
                                      <h6 style={{ margin: "0 0 8px 0", color: "#1976d2", fontSize: "1.1rem", fontWeight: "600" }}>
                                        📊 Évaluation QCM
                                      </h6>
                                      <div style={{ display: "flex", gap: "20px", fontSize: "0.9rem", color: "#666" }}>
                                        <span><strong>{qcmStats[`${formation.id}-${module.id}`].answered_questions}</strong> / {qcmStats[`${formation.id}-${module.id}`].total_questions} répondues</span>
                                        <span><strong style={{ color: "#4caf50" }}>{qcmStats[`${formation.id}-${module.id}`].correct_answers}</strong> correctes</span>
                                        <span><strong style={{ color: "#1976d2" }}>{qcmStats[`${formation.id}-${module.id}`].score_percentage}%</strong> de réussite</span>
                                      </div>
                                    </div>
                                  </div>
                                )}
                              
                              {module.questions_qcm.map((q, qIndex) => {
                                const responseKey = `${formation.id}-${module.id}`;
                                const questionKey = `${formation.id}-${module.id}-${qIndex}`;
                                const userResponse = qcmResponses[responseKey]?.[qIndex];
                                const isAnswered = !!userResponse;
                                const selectedAnswer = qcmSelectedAnswers[questionKey] !== undefined 
                                  ? qcmSelectedAnswers[questionKey] 
                                  : (isAnswered ? userResponse.selected_answer : undefined);
                                
                                return (
                                  <div
                                    key={qIndex}
                                    style={{
                                      marginBottom: "20px",
                                      padding: "16px",
                                      backgroundColor: "#fff",
                                      borderRadius: "8px",
                                      border: "1px solid #e0e0e0",
                                      boxShadow: "0 2px 4px rgba(0,0,0,0.05)",
                                    }}
                                  >
                                    <div style={{ display: "flex", alignItems: "start", marginBottom: "12px" }}>
                                      <div style={{
                                        width: "28px",
                                        height: "28px",
                                        borderRadius: "50%",
                                        backgroundColor: "#1976d2",
                                        color: "#fff",
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        fontWeight: "600",
                                        fontSize: "0.9rem",
                                        marginRight: "12px",
                                        flexShrink: 0,
                                      }}>
                                        {qIndex + 1}
                                      </div>
                                      <p style={{ margin: 0, fontWeight: "600", color: "#333", fontSize: "0.95rem", flex: 1 }}>
                                        {q.question}
                                      </p>
                                    </div>
                                    
                                    {/* Options de réponse */}
                                    <div style={{ marginLeft: "40px", marginBottom: "12px" }}>
                                      {q.options && q.options.map((option, optIndex) => {
                                        const isSelected = selectedAnswer === optIndex;
                                        const isCorrect = optIndex === q.correct_answer;
                                        const isUserWrong = isAnswered && !userResponse.is_correct && isSelected;
                                        
                                        let backgroundColor = "#f5f5f5";
                                        let borderColor = "#ddd";
                                        let textColor = "#333";
                                        
                                        if (isAnswered) {
                                          if (isCorrect) {
                                            backgroundColor = "#e8f5e9";
                                            borderColor = "#4caf50";
                                            textColor = "#2e7d32";
                                          } else if (isUserWrong) {
                                            backgroundColor = "#ffebee";
                                            borderColor = "#d32f2f";
                                            textColor = "#c62828";
                                          }
                                        } else if (isSelected) {
                                          backgroundColor = "#e3f2fd";
                                          borderColor = "#1976d2";
                                          textColor = "#1976d2";
                                        }
                                        
                                        return (
                                          <div
                                            key={optIndex}
                                            onClick={() => {
                                              if (!isAnswered) {
                                                handleQcmAnswerSelect(formation.id, module.id, qIndex, optIndex);
                                              }
                                            }}
                                            style={{
                                              padding: "12px 16px",
                                              marginBottom: "8px",
                                              backgroundColor: backgroundColor,
                                              borderRadius: "6px",
                                              border: `2px solid ${borderColor}`,
                                              color: textColor,
                                              cursor: isAnswered ? "default" : "pointer",
                                              transition: "all 0.2s ease",
                                              display: "flex",
                                              alignItems: "center",
                                              position: "relative",
                                            }}
                                            onMouseEnter={(e) => {
                                              if (!isAnswered) {
                                                e.currentTarget.style.backgroundColor = "#e3f2fd";
                                                e.currentTarget.style.transform = "translateX(4px)";
                                              }
                                            }}
                                            onMouseLeave={(e) => {
                                              if (!isAnswered) {
                                                e.currentTarget.style.backgroundColor = isSelected ? "#e3f2fd" : "#f5f5f5";
                                                e.currentTarget.style.transform = "translateX(0)";
                                              }
                                            }}
                                          >
                                            <div style={{
                                              width: "24px",
                                              height: "24px",
                                              borderRadius: "50%",
                                              border: `2px solid ${borderColor}`,
                                              display: "flex",
                                              alignItems: "center",
                                              justifyContent: "center",
                                              marginRight: "12px",
                                              flexShrink: 0,
                                              backgroundColor: isSelected ? borderColor : "transparent",
                                              color: isSelected ? "#fff" : borderColor,
                                              fontWeight: "600",
                                              fontSize: "0.85rem",
                                            }}>
                                              {isSelected ? "✓" : String.fromCharCode(65 + optIndex)}
                                            </div>
                                            <span style={{ flex: 1, fontSize: "0.9rem" }}>
                                              {option}
                                            </span>
                                            {isAnswered && isCorrect && (
                                              <span style={{ marginLeft: "8px", fontSize: "1.2rem" }}>✅</span>
                                            )}
                                            {isAnswered && isUserWrong && (
                                              <span style={{ marginLeft: "8px", fontSize: "1.2rem" }}>❌</span>
                                            )}
                                          </div>
                                        );
                                      })}
                                    </div>
                                    
                                    {/* Bouton de soumission ou feedback */}
                                    {!isAnswered ? (
                                      <div style={{ marginLeft: "40px", marginTop: "12px" }}>
                                        <button
                                          onClick={() => handleQcmSubmit(formation.id, module.id, qIndex)}
                                          disabled={selectedAnswer === undefined || submittingQcm[questionKey]}
                                          style={{
                                            padding: "10px 20px",
                                            borderRadius: "6px",
                                            border: "none",
                                            backgroundColor: selectedAnswer !== undefined && !submittingQcm[questionKey] ? "#1976d2" : "#ccc",
                                            color: "#fff",
                                            cursor: selectedAnswer !== undefined && !submittingQcm[questionKey] ? "pointer" : "not-allowed",
                                            fontSize: "0.9rem",
                                            fontWeight: "600",
                                            boxShadow: selectedAnswer !== undefined && !submittingQcm[questionKey] ? "0 2px 4px rgba(0,0,0,0.2)" : "none",
                                          }}
                                        >
                                          {submittingQcm[questionKey] ? "⏳ Envoi..." : "📤 Soumettre ma réponse"}
                                        </button>
                                      </div>
                                    ) : (
                                      <div style={{
                                        marginLeft: "40px",
                                        marginTop: "12px",
                                        padding: "12px",
                                        backgroundColor: userResponse.is_correct ? "#e8f5e9" : "#ffebee",
                                        borderRadius: "6px",
                                        borderLeft: `4px solid ${userResponse.is_correct ? "#4caf50" : "#d32f2f"}`,
                                      }}>
                                        <div style={{
                                          display: "flex",
                                          alignItems: "center",
                                          marginBottom: "8px",
                                        }}>
                                          <span style={{ fontSize: "1.2rem", marginRight: "8px" }}>
                                            {userResponse.is_correct ? "✅" : "❌"}
                                          </span>
                                          <strong style={{
                                            color: userResponse.is_correct ? "#2e7d32" : "#c62828",
                                            fontSize: "0.95rem",
                                          }}>
                                            {userResponse.is_correct 
                                              ? "Bonne réponse !" 
                                              : `Réponse incorrecte. La bonne réponse est: ${String.fromCharCode(65 + userResponse.correct_answer)}`}
                                          </strong>
                                        </div>
                                        {userResponse.explication && (
                                          <div style={{
                                            marginTop: "8px",
                                            padding: "10px",
                                            backgroundColor: "#fff",
                                            borderRadius: "4px",
                                            fontSize: "0.9rem",
                                            color: "#424242",
                                            lineHeight: "1.6",
                                          }}>
                                            <strong style={{ color: "#666" }}>💡 Explication:</strong>
                                            <div style={{ marginTop: "6px" }}>
                                              {formatGeneratedContent(userResponse.explication)}
                                            </div>
                                          </div>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                      </div>
                      );
                    })
                  ) : (
                    <p style={{ color: "#999", fontStyle: "italic" }}>Aucun module dans cette formation.</p>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default FormationsTab;
