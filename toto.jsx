// src/UserDashboardPage.jsx
import React, { useEffect, useState } from "react";
import api from "./api";

function UserDashboardPage({ onLogout }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("questions");
  const [quotaStats, setQuotaStats] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [questionText, setQuestionText] = useState("");
  const [context, setContext] = useState("");
  const [isAsking, setIsAsking] = useState(false);
  const [formations, setFormations] = useState([]);
  const [selectedFormation, setSelectedFormation] = useState(null);
  const [generatingContent, setGeneratingContent] = useState({});
  const [chapterQuestions, setChapterQuestions] = useState({});
  const [showQuestionForm, setShowQuestionForm] = useState({});
  const [chapterQuestionText, setChapterQuestionText] = useState({});
  const [currentQuestionContext, setCurrentQuestionContext] = useState(null);
  const [expandedChapters, setExpandedChapters] = useState({});
  const [expandedParties, setExpandedParties] = useState({});
  const [questionSuggestions, setQuestionSuggestions] = useState({});
  const [loadingSuggestions, setLoadingSuggestions] = useState({});
  const [generatingPartieContent, setGeneratingPartieContent] = useState({});
  const [expandedAnswers, setExpandedAnswers] = useState({});
  const [qcmSelectedAnswers, setQcmSelectedAnswers] = useState({});
  const [qcmResponses, setQcmResponses] = useState({});
  const [qcmStats, setQcmStats] = useState({});
  const [submittingQcm, setSubmittingQcm] = useState({});
  const [expandedQcm, setExpandedQcm] = useState({});
  const [expandedModules, setExpandedModules] = useState({});

  useEffect(() => {
    fetchUser();
    fetchQuotaStats();
    fetchQuestions();
    fetchFormations();
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

  const fetchQuotaStats = async () => {
    try {
      const response = await api.get("/questions/quota");
      setQuotaStats(response.data);
    } catch (err) {
      console.error("Erreur lors de la récupération du quota:", err);
    }
  };

  const fetchQuestions = async () => {
    try {
      const response = await api.get("/questions/my-questions");
      setQuestions(response.data);
    } catch (err) {
      console.error("Erreur lors de la récupération des questions:", err);
    }
  };

  const fetchFormations = async () => {
    try {
      const response = await api.get("/formations/user/my-formations");
      setFormations(response.data);
      
      // Charger les réponses QCM pour chaque module
      for (const formation of response.data) {
        if (formation.modules) {
          for (const module of formation.modules) {
            if (module.questions_qcm && module.questions_qcm.length > 0) {
              await fetchQcmResponses(formation.id, module.id);
              await fetchQcmStats(formation.id, module.id);
            }
          }
        }
      }
    } catch (err) {
      console.error("Erreur lors de la récupération des formations:", err);
    }
  };

  const fetchQcmResponses = async (formationId, moduleId) => {
    try {
      const response = await api.get(`/qcm/responses/${formationId}/${moduleId}`);
      const key = `${formationId}-${moduleId}`;
      const responsesMap = {};
      const selectedAnswersMap = {};
      
      response.data.forEach(r => {
        responsesMap[r.question_index] = r;
        // Initialiser les sélections avec les réponses existantes
        const questionKey = `${formationId}-${moduleId}-${r.question_index}`;
        selectedAnswersMap[questionKey] = r.selected_answer;
      });
      
      setQcmResponses({
        ...qcmResponses,
        [key]: responsesMap
      });
      
      // Mettre à jour les sélections avec les réponses existantes
      setQcmSelectedAnswers({
        ...qcmSelectedAnswers,
        ...selectedAnswersMap
      });
    } catch (err) {
      console.error("Erreur lors de la récupération des réponses QCM:", err);
    }
  };

  const fetchQcmStats = async (formationId, moduleId) => {
    try {
      const response = await api.get(`/qcm/stats/${formationId}/${moduleId}`);
      const key = `${formationId}-${moduleId}`;
      setQcmStats({
        ...qcmStats,
        [key]: response.data
      });
    } catch (err) {
      console.error("Erreur lors de la récupération des stats QCM:", err);
    }
  };

  const handleQcmAnswerSelect = (formationId, moduleId, questionIndex, answerIndex) => {
    const key = `${formationId}-${moduleId}-${questionIndex}`;
    setQcmSelectedAnswers({
      ...qcmSelectedAnswers,
      [key]: answerIndex
    });
  };

  const handleQcmSubmit = async (formationId, moduleId, questionIndex) => {
    const key = `${formationId}-${moduleId}-${questionIndex}`;
    const selectedAnswer = qcmSelectedAnswers[key];
    
    if (selectedAnswer === undefined) {
      alert("Veuillez sélectionner une réponse avant de soumettre.");
      return;
    }
    
    setSubmittingQcm({ ...submittingQcm, [key]: true });
    
    try {
      const response = await api.post("/qcm/submit", {
        formation_id: formationId,
        module_id: moduleId,
        question_index: questionIndex,
        selected_answer: selectedAnswer
      });
      
      // Mettre à jour les réponses
      const responsesKey = `${formationId}-${moduleId}`;
      setQcmResponses({
        ...qcmResponses,
        [responsesKey]: {
          ...(qcmResponses[responsesKey] || {}),
          [questionIndex]: response.data
        }
      });
      
      // Mettre à jour la sélection pour refléter la réponse soumise
      setQcmSelectedAnswers({
        ...qcmSelectedAnswers,
        [key]: selectedAnswer
      });
      
      // Rafraîchir les stats
      await fetchQcmStats(formationId, moduleId);
      
      // Afficher un message de feedback
      if (response.data.is_correct) {
        alert("✅ Excellente réponse ! Consultez l'explication ci-dessous pour en savoir plus.");
      } else {
        alert("❌ Réponse incorrecte. Consultez l'explication ci-dessous pour comprendre la bonne réponse.");
      }
    } catch (err) {
      alert("Erreur: " + (err.response?.data?.detail || err.message));
    } finally {
      setSubmittingQcm({ ...submittingQcm, [key]: false });
    }
  };

  const handleGenerateChapterContent = async (formationId, moduleId, chapitreId) => {
    const key = `${formationId}-${moduleId}-${chapitreId}`;
    setGeneratingContent({ ...generatingContent, [key]: true });
    
    try {
      const response = await api.post(
        `/formations/${formationId}/modules/${moduleId}/chapitres/${chapitreId}/generate-content-user`
      );
      
      // Mettre à jour le contenu dans la formation locale
      setFormations(formations.map(formation => {
        if (formation.id === formationId) {
          const updatedModules = formation.modules.map(module => {
            if (module.id === moduleId) {
              const updatedChapitres = module.chapitres.map(chapitre => {
                if (chapitre.id === chapitreId) {
                  return { ...chapitre, contenu_genere: response.data.contenu_genere };
                }
                return chapitre;
              });
              return { ...module, chapitres: updatedChapitres };
            }
            return module;
          });
          return { ...formation, modules: updatedModules };
        }
        return formation;
      }));
      
      alert("✅ Contenu généré avec succès !");
    } catch (err) {
      alert("Erreur: " + (err.response?.data?.detail || err.message));
    } finally {
      setGeneratingContent({ ...generatingContent, [key]: false });
    }
  };

  const handleAskChapterQuestion = async (formationId, moduleId, chapitreId, questionTextToUse = null) => {
    const key = `${formationId}-${moduleId}-${chapitreId}`;
    const questionTextValue = questionTextToUse || chapterQuestionText[key] || "";
    
    if (!questionTextValue.trim()) {
      alert("Veuillez saisir votre question.");
      return;
    }

    try {
      const response = await api.post(
        `/formations/${formationId}/modules/${moduleId}/chapitres/${chapitreId}/ask-question`,
        { question: questionTextValue }
      );
      
      // Ajouter la question à la liste des questions du chapitre
      setChapterQuestions({
        ...chapterQuestions,
        [key]: [...(chapterQuestions[key] || []), response.data]
      });
      
      setChapterQuestionText({ ...chapterQuestionText, [key]: "" });
      setShowQuestionForm({ ...showQuestionForm, [key]: false });
      setCurrentQuestionContext(null);
      
      // Rafraîchir les stats de quota
      fetchQuotaStats();
      
      alert("✅ Question posée avec succès ! La réponse apparaîtra ci-dessous.");
    } catch (err) {
      alert("Erreur: " + (err.response?.data?.detail || err.message));
    }
  };

  // Fonction helper pour convertir les formules LaTeX en texte lisible
  const convertLatexToText = (text) => {
    // Convertir les formules LaTeX en texte lisible
    let converted = text;
    
    // Remplacer les formules en bloc \[ ... \]
    converted = converted.replace(/\\\[([\s\S]*?)\\\]/g, (match, formula) => {
      return convertLatexFormula(formula.trim());
    });
    
    // Remplacer les formules inline \( ... \)
    converted = converted.replace(/\\\(([\s\S]*?)\\\)/g, (match, formula) => {
      return convertLatexFormula(formula.trim());
    });
    
    // Remplacer les formules avec $$ ... $$
    converted = converted.replace(/\$\$([\s\S]*?)\$\$/g, (match, formula) => {
      return convertLatexFormula(formula.trim());
    });
    
    // Remplacer les formules avec $ ... $
    converted = converted.replace(/\$([^\$]+)\$/g, (match, formula) => {
      return convertLatexFormula(formula.trim());
    });
    
    return converted;
  };

  // Fonction helper pour convertir une formule LaTeX en texte lisible
  const convertLatexFormula = (formula) => {
    let readable = formula;
    
    // Remplacer \frac{a}{b} par "a / b" ou "a divisé par b"
    readable = readable.replace(/\\frac\{([^}]+)\}\{([^}]+)\}/g, (match, num, den) => {
      const numerator = convertLatexFormula(num);
      const denominator = convertLatexFormula(den);
      return `(${numerator}) / (${denominator})`;
    });
    
    // Remplacer \text{...} par le texte sans les balises
    readable = readable.replace(/\\text\{([^}]+)\}/g, '$1');
    
    // Remplacer \sqrt{...} par "racine carrée de ..."
    readable = readable.replace(/\\sqrt\{([^}]+)\}/g, (match, content) => {
      return `√(${convertLatexFormula(content)})`;
    });
    
    // Remplacer \sum par "somme"
    readable = readable.replace(/\\sum/g, 'somme');
    
    // Remplacer \prod par "produit"
    readable = readable.replace(/\\prod/g, 'produit');
    
    // Remplacer \int par "intégrale"
    readable = readable.replace(/\\int/g, 'intégrale');
    
    // Remplacer les espaces LaTeX
    readable = readable.replace(/\\,/g, ' ');
    readable = readable.replace(/\\;/g, ' ');
    readable = readable.replace(/\\quad/g, ' ');
    readable = readable.replace(/\\qquad/g, ' ');
    
    // Remplacer les accolades vides
    readable = readable.replace(/\{|\}/g, '');
    
    // Nettoyer les espaces multiples
    readable = readable.replace(/\s+/g, ' ').trim();
    
    return readable;
  };

  // Fonction helper pour convertir **texte** en JSX avec gras
  const convertBoldText = (text) => {
    // D'abord convertir les formules LaTeX
    const textWithoutLatex = convertLatexToText(text);
    
    const parts = [];
    let lastIndex = 0;
    const boldRegex = /\*\*(.+?)\*\*/g;
    let match;
    
    while ((match = boldRegex.exec(textWithoutLatex)) !== null) {
      if (match.index > lastIndex) {
        parts.push(textWithoutLatex.substring(lastIndex, match.index));
      }
      parts.push(
        <strong key={`bold-${match.index}`} style={{ fontWeight: "600" }}>
          {match[1]}
        </strong>
      );
      lastIndex = match.index + match[0].length;
    }
    
    if (lastIndex < textWithoutLatex.length) {
      parts.push(textWithoutLatex.substring(lastIndex));
    }
    
    return parts.length > 0 ? parts : [textWithoutLatex];
  };

  // Fonction pour formater le contenu généré (convertir Markdown en JSX)
  const formatGeneratedContent = (content) => {
    if (!content) return null;
    
    // Diviser le contenu en lignes
    const lines = content.split('\n');
    const formattedElements = [];
    let currentList = [];
    
    lines.forEach((line, index) => {
      // Détecter les titres Markdown (## Titre, ### Titre, etc.)
      const titleMatch = line.match(/^#{1,6}\s+(.+)$/);
      if (titleMatch) {
        // Fermer la liste en cours si elle existe
        if (currentList.length > 0) {
          formattedElements.push(
            <ul key={`list-${index}`} style={{ marginLeft: "20px", marginBottom: "12px", paddingLeft: "20px" }}>
              {currentList.map((item, idx) => (
                <li key={idx} style={{ marginBottom: "4px", lineHeight: "1.6" }}>{item}</li>
              ))}
            </ul>
          );
          currentList = [];
        }
        // Ajouter le titre en gras (sans les ##)
        formattedElements.push(
          <div key={`title-${index}`} style={{ 
            fontWeight: "600", 
            fontSize: "1.1em", 
            marginTop: index > 0 ? "16px" : "0", 
            marginBottom: "8px", 
            color: "#333" 
          }}>
            {titleMatch[1]}
          </div>
        );
        return;
      }
      
      // Détecter les listes avec - ou * (mais pas les ** pour le gras)
      const listMatch = line.match(/^[\-\*]\s+(.+)$/);
      if (listMatch && !line.match(/^\*\*/)) {
        currentList.push(convertBoldText(listMatch[1]));
        return;
      }
      
      // Détecter les numéros de liste (1. 2. etc.)
      const numberedMatch = line.match(/^\d+\.\s+(.+)$/);
      if (numberedMatch) {
        currentList.push(convertBoldText(numberedMatch[1]));
        return;
      }
      
      // Fermer la liste en cours si on rencontre une ligne vide ou du texte normal
      if (currentList.length > 0 && line.trim() === "") {
        formattedElements.push(
          <ul key={`list-${index}`} style={{ marginLeft: "20px", marginBottom: "12px", paddingLeft: "20px" }}>
            {currentList.map((item, idx) => (
              <li key={idx} style={{ marginBottom: "4px", lineHeight: "1.6" }}>{item}</li>
            ))}
          </ul>
        );
        currentList = [];
      }
      
      // Ajouter le texte normal (avec conversion des **texte** en gras)
      if (line.trim() !== "") {
        const content = convertBoldText(line);
        formattedElements.push(
          <div key={`text-${index}`} style={{ marginBottom: "8px", lineHeight: "1.7" }}>
            {content}
          </div>
        );
      } else {
        formattedElements.push(<br key={`br-${index}`} />);
      }
    });
    
    // Fermer la liste en cours si elle existe à la fin
    if (currentList.length > 0) {
      formattedElements.push(
        <ul key={`list-end`} style={{ marginLeft: "20px", marginBottom: "12px", paddingLeft: "20px" }}>
          {currentList.map((item, idx) => (
            <li key={idx} style={{ marginBottom: "4px", lineHeight: "1.6" }}>{item}</li>
          ))}
        </ul>
      );
    }
    
    return formattedElements;
  };

  const toggleChapter = async (formationId, moduleId, chapitreId) => {
    const key = `${formationId}-${moduleId}-${chapitreId}`;
    const isExpanded = expandedChapters[key];
    
    // Si le chapitre est déjà ouvert, ne rien faire (ne pas le fermer)
    if (isExpanded) {
      return;
    }
    
    // Ouvrir le chapitre
    setExpandedChapters({
      ...expandedChapters,
      [key]: true
    });
    
    // Charger les suggestions si on ouvre le chapitre pour la première fois
    if (!questionSuggestions[key]) {
      setLoadingSuggestions({ ...loadingSuggestions, [key]: true });
      try {
        const response = await api.get(
          `/formations/${formationId}/modules/${moduleId}/chapitres/${chapitreId}/question-suggestions`
        );
        setQuestionSuggestions({
          ...questionSuggestions,
          [key]: response.data.suggestions || []
        });
      } catch (err) {
        console.error("Erreur lors du chargement des suggestions:", err);
      } finally {
        setLoadingSuggestions({ ...loadingSuggestions, [key]: false });
      }
    }
  };

  const togglePartie = (formationId, moduleId, chapitreId, partieId) => {
    const key = `${formationId}-${moduleId}-${chapitreId}-${partieId}`;
    setExpandedParties({
      ...expandedParties,
      [key]: !expandedParties[key]
    });
  };

  const handleGeneratePartieContent = async (formationId, moduleId, chapitreId, partieId) => {
    const key = `${formationId}-${moduleId}-${chapitreId}-${partieId}`;
    setGeneratingPartieContent({ ...generatingPartieContent, [key]: true });
    
    try {
      const response = await api.post(
        `/formations/${formationId}/modules/${moduleId}/chapitres/${chapitreId}/parties/${partieId}/generate-content-user`
      );
      
      // Mettre à jour le contenu dans la formation locale
      setFormations(formations.map(formation => {
        if (formation.id === formationId) {
          const updatedModules = formation.modules.map(module => {
            if (module.id === moduleId) {
              const updatedChapitres = module.chapitres.map(chapitre => {
                if (chapitre.id === chapitreId) {
                  const updatedParties = chapitre.parties.map((partie, idx) => {
                    // Comparer par ID si disponible, sinon par index
                    const partieMatch = partie.id ? (partie.id === partieId) : (idx === parseInt(partieId));
                    if (partieMatch) {
                      return { ...partie, contenu_genere: response.data.contenu_genere };
                    }
                    return partie;
                  });
                  return { ...chapitre, parties: updatedParties };
                }
                return chapitre;
              });
              return { ...module, chapitres: updatedChapitres };
            }
            return module;
          });
          return { ...formation, modules: updatedModules };
        }
        return formation;
      }));
      
      // Ouvrir automatiquement la partie pour voir le contenu généré
      setExpandedParties({
        ...expandedParties,
        [key]: true
      });
      
      alert("✅ Contenu de la partie généré avec succès !");
    } catch (err) {
      alert("Erreur: " + (err.response?.data?.detail || err.message));
    } finally {
      setGeneratingPartieContent({ ...generatingPartieContent, [key]: false });
    }
  };

  const handleAskQuestion = async (e) => {
    e.preventDefault();
    if (!questionText.trim()) {
      alert("Veuillez saisir une question.");
      return;
    }

    if (quotaStats && quotaStats.is_quota_exceeded) {
      alert("Vous avez atteint votre quota mensuel de 60 questions.");
      return;
    }

    setIsAsking(true);
    try {
      const response = await api.post("/questions", {
        question: questionText,
        context: context || null,
      });
      
      // Ajouter la nouvelle question en haut de la liste
      setQuestions([response.data, ...questions]);
      setQuestionText("");
      setContext("");
      
      // Rafraîchir les stats de quota
      fetchQuotaStats();
      
      alert("Question posée avec succès !");
    } catch (err) {
      alert("Erreur: " + (err.response?.data?.detail || err.message));
    } finally {
      setIsAsking(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("access_token");
    if (onLogout) {
      onLogout();
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "N/A";
    const date = new Date(dateStr);
    return date.toLocaleString("fr-FR");
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
          maxWidth: "1200px",
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
            <h2 style={{ margin: 0 }}>💬 Assistant IA Banque</h2>
            {user && (
              <p style={{ margin: "4px 0 0 0", color: "#666" }}>
                {user.full_name} ({user.email})
              </p>
            )}
            {user && (
              <p style={{ margin: "4px 0 0 0", color: "#666", fontSize: "0.9rem" }}>
                {user.organization_name && `Organisation: ${user.organization_name}`}
                {user.department_name && ` • Département: ${user.department_name}`}
                {user.service_name && ` • Service: ${user.service_name}`}
              </p>
            )}
          </div>
          <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
            <button
              type="button"
              onClick={() => setActiveTab("dashboard")}
              style={{
                padding: "8px 16px",
                borderRadius: "4px",
                border: "1px solid #1976d2",
                backgroundColor: activeTab === "dashboard" ? "#1976d2" : "#fff",
                color: activeTab === "dashboard" ? "#fff" : "#1976d2",
                cursor: "pointer",
                fontWeight: "bold",
              }}
            >
              📊 Tableau de bord
            </button>
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
        <div style={{ display: "flex", marginBottom: "24px", borderBottom: "1px solid #e0e0e0" }}>
          <button
            onClick={() => setActiveTab("questions")}
            style={{
              padding: "12px 24px",
              border: "none",
              backgroundColor: activeTab === "questions" ? "#e3f2fd" : "transparent",
              borderBottom: activeTab === "questions" ? "2px solid #1976d2" : "none",
              cursor: "pointer",
              fontSize: "1rem",
              fontWeight: activeTab === "questions" ? "bold" : "normal",
              color: activeTab === "questions" ? "#1976d2" : "#555",
            }}
          >
            💬 Mes Questions à Fahimta AI
          </button>
          <button
            onClick={() => setActiveTab("formations")}
            style={{
              padding: "12px 24px",
              border: "none",
              backgroundColor: activeTab === "formations" ? "#fff3e0" : "transparent",
              borderBottom: activeTab === "formations" ? "2px solid #f57c00" : "none",
              cursor: "pointer",
              fontSize: "1rem",
              fontWeight: activeTab === "formations" ? "bold" : "normal",
              color: activeTab === "formations" ? "#f57c00" : "#555",
            }}
          >
            📚 Mes formations
          </button>
          <button
            onClick={() => setActiveTab("ressources")}
            style={{
              padding: "12px 24px",
              border: "none",
              backgroundColor: activeTab === "ressources" ? "#e8f5e9" : "transparent",
              borderBottom: activeTab === "ressources" ? "2px solid #388e3c" : "none",
              cursor: "pointer",
              fontSize: "1rem",
              fontWeight: activeTab === "ressources" ? "bold" : "normal",
              color: activeTab === "ressources" ? "#388e3c" : "#555",
            }}
          >
            📁 Mes ressources
          </button>
        </div>

        {/* Contenu des onglets */}
        {activeTab === "questions" && (
          <>
            {/* Statistiques de quota - Design moderne */}
            {quotaStats && (
              <div
                style={{
                  marginBottom: "32px",
                  padding: "24px",
                  background: quotaStats.is_quota_exceeded 
                    ? "linear-gradient(135deg, #ffebee 0%, #ffcdd2 100%)" 
                    : "linear-gradient(135deg, #e8f5e9 0%, #c8e6c9 100%)",
                  borderRadius: "12px",
                  border: `2px solid ${quotaStats.is_quota_exceeded ? "#d32f2f" : "#4caf50"}`,
                  boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", marginBottom: "20px" }}>
                  <div
                    style={{
                      width: "48px",
                      height: "48px",
                      borderRadius: "12px",
                      backgroundColor: quotaStats.is_quota_exceeded ? "#d32f2f" : "#4caf50",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      marginRight: "16px",
                      fontSize: "24px",
                    }}
                  >
                    {quotaStats.is_quota_exceeded ? "⚠️" : "📊"}
                  </div>
                  <div>
                    <h3 style={{ margin: 0, color: quotaStats.is_quota_exceeded ? "#d32f2f" : "#2e7d32", fontSize: "1.3rem" }}>
                      Quota mensuel de questions
                    </h3>
                    <p style={{ margin: "4px 0 0 0", color: "#666", fontSize: "0.9rem" }}>
                      Mois de {quotaStats.current_month}
                    </p>
                  </div>
                </div>
                
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "16px", marginBottom: "16px" }}>
                  <div style={{ 
                    padding: "16px", 
                    backgroundColor: "rgba(255,255,255,0.7)", 
                    borderRadius: "8px",
                    textAlign: "center"
                  }}>
                    <div style={{ fontSize: "2rem", fontWeight: "bold", color: "#1976d2", marginBottom: "4px" }}>
                      {quotaStats.questions_asked}
                    </div>
                    <div style={{ fontSize: "0.85rem", color: "#666" }}>Questions posées</div>
                  </div>
                  <div style={{ 
                    padding: "16px", 
                    backgroundColor: "rgba(255,255,255,0.7)", 
                    borderRadius: "8px",
                    textAlign: "center"
                  }}>
                    <div style={{ fontSize: "2rem", fontWeight: "bold", color: "#666", marginBottom: "4px" }}>
                      {quotaStats.quota_limit}
                    </div>
                    <div style={{ fontSize: "0.85rem", color: "#666" }}>Limite mensuelle</div>
                  </div>
                  <div style={{ 
                    padding: "16px", 
                    backgroundColor: "rgba(255,255,255,0.7)", 
                    borderRadius: "8px",
                    textAlign: "center"
                  }}>
                    <div style={{ 
                      fontSize: "2rem", 
                      fontWeight: "bold", 
                      color: quotaStats.remaining_quota > 0 ? "#2e7d32" : "#d32f2f", 
                      marginBottom: "4px" 
                    }}>
                      {quotaStats.remaining_quota}
                    </div>
                    <div style={{ fontSize: "0.85rem", color: "#666" }}>Restantes</div>
                  </div>
                </div>

                {/* Barre de progression */}
                <div style={{ marginTop: "20px" }}>
                  <div style={{ 
                    width: "100%", 
                    height: "12px", 
                    backgroundColor: "rgba(255,255,255,0.5)", 
                    borderRadius: "6px",
                    overflow: "hidden"
                  }}>
                    <div
                      style={{
                        width: `${Math.min(100, (quotaStats.questions_asked / quotaStats.quota_limit) * 100)}%`,
                        height: "100%",
                        background: quotaStats.is_quota_exceeded 
                          ? "linear-gradient(90deg, #d32f2f 0%, #f44336 100%)"
                          : "linear-gradient(90deg, #4caf50 0%, #66bb6a 100%)",
                        borderRadius: "6px",
                        transition: "width 0.3s ease",
                      }}
                    />
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginTop: "8px", fontSize: "0.85rem", color: "#666" }}>
                    <span>0</span>
                    <span>{quotaStats.quota_limit}</span>
                  </div>
                </div>

                {quotaStats.is_quota_exceeded && (
                  <div style={{
                    marginTop: "20px",
                    padding: "12px 16px",
                    backgroundColor: "#fff",
                    borderRadius: "8px",
                    border: "1px solid #d32f2f",
                  }}>
                    <p style={{ margin: 0, color: "#d32f2f", fontWeight: "bold", display: "flex", alignItems: "center" }}>
                      <span style={{ marginRight: "8px", fontSize: "1.2rem" }}>⚠️</span>
                      Vous avez atteint votre quota mensuel. Vous pourrez poser de nouvelles questions le mois prochain.
                    </p>
                  </div>
                )}
              </div>
            )}

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
        )}

        {activeTab === "formations" && (
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
                                            const isUserCorrect = isAnswered && userResponse.is_correct && isSelected;
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
        )}

        {activeTab === "ressources" && (
          <div>
            <h3>📁 Mes ressources</h3>
            <div style={{ marginTop: "24px" }}>
              <p style={{ color: "#666", marginBottom: "16px" }}>
                Accédez aux ressources de votre département et service.
              </p>
              
              <div style={{ padding: "24px", textAlign: "center", backgroundColor: "#f9f9f9", borderRadius: "4px" }}>
                <p style={{ color: "#999", fontSize: "1.1rem" }}>
                  Aucune ressource disponible pour le moment.
                </p>
                <p style={{ color: "#666", marginTop: "8px", fontSize: "0.9rem" }}>
                  Les ressources seront bientôt disponibles.
                </p>
              </div>
            </div>
          </div>
        )}

        {activeTab === "dashboard" && (
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
        )}
      </div>
    </div>
  );
}

export default UserDashboardPage;

