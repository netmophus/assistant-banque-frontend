// src/UserDashboardPage.jsx
import React, { useEffect, useState } from "react";
import api from "./api";
import QuestionsTab from "./components/userDashboard/QuestionsTab";
import FormationsTab from "./components/userDashboard/FormationsTab";
import DashboardTab from "./components/userDashboard/DashboardTab";
import RessourcesTab from "./components/userDashboard/RessourcesTab";
import ConsommablesTab from "./components/stock/ConsommablesTab";

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
  const [successModal, setSuccessModal] = useState({ show: false, message: "" });
  const [ressources, setRessources] = useState([]);

  useEffect(() => {
    fetchUser();
    fetchQuotaStats();
    fetchQuestions();
    fetchFormations();
    fetchRessources();
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

  const fetchRessources = async () => {
    try {
      const response = await api.get("/ressources/user/my-ressources");
      setRessources(response.data || []);
    } catch (err) {
      console.error("Erreur lors de la récupération des ressources:", err);
      setRessources([]);
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
      
      // Afficher la modale de succès
      setSuccessModal({ show: true, message: "✅ Contenu généré avec succès !" });
      // Fermer automatiquement après 3 secondes
      setTimeout(() => {
        setSuccessModal({ show: false, message: "" });
      }, 3000);
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
    
    // Toggle: ouvrir si fermé, fermer si ouvert
    const newExpandedState = !isExpanded;
    setExpandedChapters({
      ...expandedChapters,
      [key]: newExpandedState
    });
    
    // Charger les suggestions seulement si on ouvre le chapitre pour la première fois
    if (newExpandedState && !questionSuggestions[key]) {
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
      
      // Afficher la modale de succès
      setSuccessModal({ show: true, message: "✅ Contenu de la partie généré avec succès !" });
      // Fermer automatiquement après 3 secondes
      setTimeout(() => {
        setSuccessModal({ show: false, message: "" });
      }, 3000);
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
          <button
            onClick={() => setActiveTab("consommables")}
            style={{
              padding: "12px 24px",
              border: "none",
              backgroundColor: activeTab === "consommables" ? "#fff3e0" : "transparent",
              borderBottom: activeTab === "consommables" ? "2px solid #ff9800" : "none",
              cursor: "pointer",
              fontSize: "1rem",
              fontWeight: activeTab === "consommables" ? "bold" : "normal",
              color: activeTab === "consommables" ? "#ff9800" : "#555",
            }}
          >
            📦 Consommables
          </button>
        </div>

        {/* Contenu des onglets */}
        {activeTab === "questions" && (
          <QuestionsTab
            quotaStats={quotaStats}
            questionText={questionText}
            setQuestionText={setQuestionText}
            context={context}
            setContext={setContext}
            isAsking={isAsking}
            handleAskQuestion={handleAskQuestion}
            questions={questions}
            expandedAnswers={expandedAnswers}
            setExpandedAnswers={setExpandedAnswers}
          />
        )}

        {/* Ancien code des questions - à supprimer après vérification */}
        {false && activeTab === "questions_old" && (
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
          <FormationsTab
            formations={formations}
            selectedFormation={selectedFormation}
            setSelectedFormation={setSelectedFormation}
            expandedModules={expandedModules}
            setExpandedModules={setExpandedModules}
            expandedChapters={expandedChapters}
            expandedParties={expandedParties}
            setExpandedParties={setExpandedParties}
            generatingContent={generatingContent}
            generatingPartieContent={generatingPartieContent}
            chapterQuestions={chapterQuestions}
            showQuestionForm={showQuestionForm}
            setShowQuestionForm={setShowQuestionForm}
            chapterQuestionText={chapterQuestionText}
            setChapterQuestionText={setChapterQuestionText}
            questionSuggestions={questionSuggestions}
            loadingSuggestions={loadingSuggestions}
            expandedAnswers={expandedAnswers}
            setExpandedAnswers={setExpandedAnswers}
            qcmSelectedAnswers={qcmSelectedAnswers}
            qcmResponses={qcmResponses}
            qcmStats={qcmStats}
            submittingQcm={submittingQcm}
            expandedQcm={expandedQcm}
            setExpandedQcm={setExpandedQcm}
            toggleChapter={toggleChapter}
            togglePartie={togglePartie}
            handleGenerateChapterContent={handleGenerateChapterContent}
            handleGeneratePartieContent={handleGeneratePartieContent}
            handleAskChapterQuestion={handleAskChapterQuestion}
            handleQcmAnswerSelect={handleQcmAnswerSelect}
            handleQcmSubmit={handleQcmSubmit}
          />
        )}

        {/* Code des formations migré dans FormationsTab.jsx */}

        {activeTab === "ressources" && (
          <RessourcesTab
            ressources={ressources}
            user={user}
          />
        )}

        {activeTab === "consommables" && (
          <ConsommablesTab />
        )}

        {activeTab === "dashboard" && (
          <DashboardTab user={user} quotaStats={quotaStats} />
        )}
      </div>

      {/* Modale de succès */}
      {successModal.show && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0, 0, 0, 0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 10000,
            animation: "fadeIn 0.3s ease-in",
          }}
          onClick={() => setSuccessModal({ show: false, message: "" })}
        >
          <div
            style={{
              backgroundColor: "#fff",
              borderRadius: "16px",
              padding: "32px",
              maxWidth: "500px",
              width: "90%",
              boxShadow: "0 8px 32px rgba(0, 0, 0, 0.2)",
              animation: "slideUp 0.3s ease-out",
              position: "relative",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Bouton de fermeture */}
            <button
              onClick={() => setSuccessModal({ show: false, message: "" })}
              style={{
                position: "absolute",
                top: "12px",
                right: "12px",
                background: "none",
                border: "none",
                fontSize: "24px",
                cursor: "pointer",
                color: "#999",
                width: "32px",
                height: "32px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                borderRadius: "50%",
                transition: "all 0.2s ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = "#f5f5f5";
                e.currentTarget.style.color = "#333";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = "transparent";
                e.currentTarget.style.color = "#999";
              }}
            >
              ×
            </button>

            {/* Icône de succès */}
            <div
              style={{
                width: "80px",
                height: "80px",
                borderRadius: "50%",
                backgroundColor: "#e8f5e9",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 24px",
                animation: "scaleIn 0.3s ease-out 0.1s both",
              }}
            >
              <span style={{ fontSize: "48px" }}>✅</span>
            </div>

            {/* Message */}
            <h3
              style={{
                margin: "0 0 16px 0",
                fontSize: "1.5rem",
                color: "#2e7d32",
                textAlign: "center",
                fontWeight: "600",
              }}
            >
              Succès !
            </h3>
            <p
              style={{
                margin: 0,
                fontSize: "1.1rem",
                color: "#666",
                textAlign: "center",
                lineHeight: "1.6",
              }}
            >
              {successModal.message}
            </p>

            {/* Barre de progression animée */}
            <div
              style={{
                marginTop: "24px",
                height: "4px",
                backgroundColor: "#e0e0e0",
                borderRadius: "2px",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  height: "100%",
                  backgroundColor: "#4caf50",
                  borderRadius: "2px",
                  animation: "progressBar 3s linear",
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Styles CSS pour les animations */}
      <style>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
        
        @keyframes slideUp {
          from {
            transform: translateY(30px);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }
        
        @keyframes scaleIn {
          from {
            transform: scale(0);
            opacity: 0;
          }
          to {
            transform: scale(1);
            opacity: 1;
          }
        }
        
        @keyframes progressBar {
          from {
            width: 100%;
          }
          to {
            width: 0%;
          }
        }
      `}</style>
    </div>
  );
}

export default UserDashboardPage;

