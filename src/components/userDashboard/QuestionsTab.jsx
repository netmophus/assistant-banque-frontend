import React, { useState } from "react";
import QuotaStats from "./QuotaStats";
import { formatGeneratedContent, formatDate } from "./utils";

function QuestionsTab({ 
  quotaStats, 
  questionText, 
  setQuestionText, 
  context, 
  setContext, 
  isAsking, 
  handleAskQuestion, 
  questions, 
  expandedAnswers, 
  setExpandedAnswers 
}) {
  return (
    <>
      {/* Statistiques de quota */}
      <QuotaStats quotaStats={quotaStats} />

      {/* Formulaire de question - Design moderne */}
      <div style={{ 
        marginBottom: "40px",
        background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
        borderRadius: "16px",
        padding: "32px",
        boxShadow: "0 8px 24px rgba(102, 126, 234, 0.3)",
      }}>
        <div style={{ display: "flex", alignItems: "center", marginBottom: "24px" }}>
          <div style={{
            width: "56px",
            height: "56px",
            borderRadius: "14px",
            backgroundColor: "rgba(255,255,255,0.2)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            marginRight: "16px",
            fontSize: "28px",
            backdropFilter: "blur(10px)",
            flexShrink: 0,
          }}>
            🤖
          </div>
          <div style={{ flex: 1 }}>
            <h3 style={{ margin: 0, color: "#fff", fontSize: "1.5rem", fontWeight: "bold" }}>
              Posez votre question à Fahimta AI
            </h3>
            <p style={{ margin: "4px 0 0 0", color: "rgba(255,255,255,0.9)", fontSize: "0.95rem" }}>
              Questions techniques sur la banque selon la réglementation UEMOA
            </p>
          </div>
        </div>
        
        <form
          onSubmit={handleAskQuestion}
          style={{
            backgroundColor: "#fff",
            borderRadius: "12px",
            padding: "28px",
            boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
            width: "100%",
            boxSizing: "border-box",
          }}
        >
          <div style={{ marginBottom: "24px", width: "100%" }}>
            <label style={{ 
              display: "block", 
              marginBottom: "10px", 
              fontWeight: "600",
              color: "#333",
              fontSize: "0.95rem",
              width: "100%",
            }}>
              Votre question <span style={{ color: "#d32f2f" }}>*</span>
            </label>
            <textarea
              required
              value={questionText}
              onChange={(e) => setQuestionText(e.target.value)}
              disabled={isAsking || (quotaStats && quotaStats.is_quota_exceeded)}
              style={{
                width: "100%",
                padding: "16px",
                borderRadius: "8px",
                border: "2px solid #e0e0e0",
                minHeight: "140px",
                fontSize: "1rem",
                fontFamily: "inherit",
                resize: "vertical",
                transition: "border-color 0.3s ease",
                backgroundColor: (quotaStats && quotaStats.is_quota_exceeded) ? "#f5f5f5" : "#fff",
                boxSizing: "border-box",
              }}
              onFocus={(e) => e.target.style.borderColor = "#667eea"}
              onBlur={(e) => e.target.style.borderColor = "#e0e0e0"}
              placeholder="Ex: Quelle est la réglementation UEMOA concernant les crédits à la consommation ?"
            />
          </div>
          
          <div style={{ marginBottom: "28px", width: "100%" }}>
            <label style={{ 
              display: "block", 
              marginBottom: "10px", 
              fontWeight: "600",
              color: "#333",
              fontSize: "0.95rem",
              width: "100%",
            }}>
              Contexte supplémentaire <span style={{ color: "#999", fontWeight: "normal", fontSize: "0.85rem" }}>(optionnel)</span>
            </label>
            <textarea
              value={context}
              onChange={(e) => setContext(e.target.value)}
              disabled={isAsking || (quotaStats && quotaStats.is_quota_exceeded)}
              style={{
                width: "100%",
                padding: "16px",
                borderRadius: "8px",
                border: "2px solid #e0e0e0",
                minHeight: "100px",
                fontSize: "0.95rem",
                fontFamily: "inherit",
                resize: "vertical",
                transition: "border-color 0.3s ease",
                backgroundColor: (quotaStats && quotaStats.is_quota_exceeded) ? "#f5f5f5" : "#fff",
                boxSizing: "border-box",
              }}
              onFocus={(e) => e.target.style.borderColor = "#667eea"}
              onBlur={(e) => e.target.style.borderColor = "#e0e0e0"}
              placeholder="Ajoutez des détails ou contexte si nécessaire..."
            />
          </div>
          
          <div style={{ display: "flex", justifyContent: "center", width: "100%" }}>
            <button
              type="submit"
              disabled={isAsking || (quotaStats && quotaStats.is_quota_exceeded)}
              style={{
                padding: "14px 32px",
                borderRadius: "8px",
                border: "none",
                background: (quotaStats && quotaStats.is_quota_exceeded) 
                  ? "linear-gradient(135deg, #ccc 0%, #999 100%)"
                  : "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                color: "#fff",
                cursor: (quotaStats && quotaStats.is_quota_exceeded) ? "not-allowed" : "pointer",
                fontWeight: "bold",
                fontSize: "1rem",
                opacity: (quotaStats && quotaStats.is_quota_exceeded) ? 0.6 : 1,
                boxShadow: (quotaStats && quotaStats.is_quota_exceeded) 
                  ? "none" 
                  : "0 4px 12px rgba(102, 126, 234, 0.4)",
                transition: "all 0.3s ease",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
              }}
              onMouseEnter={(e) => {
                if (!(quotaStats && quotaStats.is_quota_exceeded) && !isAsking) {
                  e.target.style.transform = "translateY(-2px)";
                  e.target.style.boxShadow = "0 6px 16px rgba(102, 126, 234, 0.5)";
                }
              }}
              onMouseLeave={(e) => {
                e.target.style.transform = "translateY(0)";
                e.target.style.boxShadow = (quotaStats && quotaStats.is_quota_exceeded) 
                  ? "none" 
                  : "0 4px 12px rgba(102, 126, 234, 0.4)";
              }}
            >
              {isAsking ? (
                <>
                  <span>⏳</span>
                  <span>Traitement en cours...</span>
                </>
              ) : (
                <>
                  <span>🚀</span>
                  <span>Poser la question</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Historique des questions - Design moderne */}
      <div>
        <div style={{ display: "flex", alignItems: "center", marginBottom: "24px" }}>
          <div style={{
            width: "40px",
            height: "40px",
            borderRadius: "10px",
            backgroundColor: "#e3f2fd",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            marginRight: "12px",
            fontSize: "20px",
          }}>
            📋
          </div>
          <h3 style={{ margin: 0, fontSize: "1.4rem", color: "#333" }}>
            Historique de mes questions
          </h3>
          {questions.length > 0 && (
            <span style={{
              marginLeft: "12px",
              padding: "4px 12px",
              backgroundColor: "#e3f2fd",
              color: "#1976d2",
              borderRadius: "12px",
              fontSize: "0.85rem",
              fontWeight: "bold",
            }}>
              {questions.length}
            </span>
          )}
        </div>
        
        {questions.length === 0 ? (
          <div style={{
            padding: "60px 24px",
            textAlign: "center",
            backgroundColor: "#f9f9f9",
            borderRadius: "12px",
            border: "2px dashed #e0e0e0",
          }}>
            <div style={{ fontSize: "48px", marginBottom: "16px" }}>💭</div>
            <p style={{ margin: 0, color: "#666", fontSize: "1.1rem", fontWeight: "500" }}>
              Aucune question posée pour le moment
            </p>
            <p style={{ margin: "8px 0 0 0", color: "#999", fontSize: "0.9rem" }}>
              Commencez à poser vos questions pour voir l'historique ici
            </p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
            {questions.map((q) => (
              <div
                key={q.id}
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
                {/* Question */}
                <div style={{
                  display: "flex",
                  alignItems: "start",
                  marginBottom: "16px",
                }}>
                  <div style={{
                    width: "36px",
                    height: "36px",
                    borderRadius: "8px",
                    backgroundColor: "#e3f2fd",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    marginRight: "12px",
                    flexShrink: 0,
                    fontSize: "18px",
                  }}>
                    ❓
                  </div>
                  <div style={{ flex: 1 }}>
                    <p style={{ 
                      margin: 0, 
                      fontWeight: "600", 
                      color: "#1976d2",
                      fontSize: "1.05rem",
                      lineHeight: "1.5",
                    }}>
                      {q.question}
                    </p>
                    <div style={{ marginTop: "8px", fontSize: "0.85rem", color: "#999" }}>
                      <span>📅</span> Posée le {formatDate(q.created_at)}
                    </div>
                  </div>
                </div>

                {/* Réponse */}
                {q.answer && (
                  <div
                    style={{
                      marginTop: "20px",
                      borderRadius: "10px",
                      borderLeft: "4px solid #4caf50",
                      backgroundColor: "#fff",
                      overflow: "hidden",
                      boxShadow: "0 2px 4px rgba(0,0,0,0.05)",
                    }}
                  >
                    {/* En-tête cliquable */}
                    <div
                      onClick={() => {
                        setExpandedAnswers({
                          ...expandedAnswers,
                          [q.id]: expandedAnswers[q.id] === undefined ? false : !expandedAnswers[q.id]
                        });
                      }}
                      style={{
                        padding: "16px 20px",
                        background: "linear-gradient(135deg, #e8f5e9 0%, #c8e6c9 100%)",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        transition: "background-color 0.2s ease",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = "linear-gradient(135deg, #c8e6c9 0%, #a5d6a7 100%)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = "linear-gradient(135deg, #e8f5e9 0%, #c8e6c9 100%)";
                      }}
                    >
                      <div style={{
                        display: "flex",
                        alignItems: "center",
                        flex: 1,
                      }}>
                        <div style={{
                          width: "32px",
                          height: "32px",
                          borderRadius: "8px",
                          backgroundColor: "#4caf50",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          marginRight: "10px",
                          fontSize: "16px",
                        }}>
                          💡
                        </div>
                        <p style={{ 
                          margin: 0, 
                          fontWeight: "bold", 
                          color: "#2e7d32",
                          fontSize: "1rem",
                        }}>
                          Réponse de Fahimta AI
                        </p>
                        {q.answered_at && (
                          <span style={{ 
                            marginLeft: "12px",
                            fontSize: "0.8rem", 
                            color: "#666",
                            fontStyle: "italic",
                          }}>
                            • Répondue le {formatDate(q.answered_at)}
                          </span>
                        )}
                      </div>
                      <span style={{
                        fontSize: "1.2rem",
                        color: "#2e7d32",
                        transition: "transform 0.3s ease",
                        transform: expandedAnswers[q.id] !== false ? "rotate(180deg)" : "rotate(0deg)",
                      }}>
                        ▼
                      </span>
                    </div>
                    
                    {/* Contenu de la réponse (déroulable) */}
                    {expandedAnswers[q.id] !== false && (
                      <div style={{ 
                        padding: "20px",
                        backgroundColor: "#f9f9f9",
                      }}>
                        <div style={{ 
                          margin: 0, 
                          color: "#424242", 
                          lineHeight: "1.6",
                          fontSize: "0.95rem",
                        }}>
                          {formatGeneratedContent(q.answer)}
                        </div>
                      </div>
                    )}
                  </div>
                )}
                
                {/* Statut en attente */}
                {q.status === "pending" && (
                  <div style={{
                    marginTop: "16px",
                    padding: "12px 16px",
                    backgroundColor: "#fff3e0",
                    borderRadius: "8px",
                    borderLeft: "4px solid #f57c00",
                    display: "flex",
                    alignItems: "center",
                  }}>
                    <span style={{ marginRight: "8px", fontSize: "1.2rem" }}>⏳</span>
                    <span style={{ color: "#f57c00", fontWeight: "500" }}>
                      En attente de réponse...
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}

export default QuestionsTab;

