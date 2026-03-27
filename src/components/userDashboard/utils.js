import React from "react";

// Fonction helper pour convertir les formules LaTeX en texte lisible
export const convertLatexToText = (text) => {
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
    return `${num.trim()} / ${den.trim()}`;
  });
  
  // Remplacer \sqrt{x} par "racine carrée de x"
  readable = readable.replace(/\\sqrt\{([^}]+)\}/g, (match, content) => {
    return `√${content.trim()}`;
  });
  
  // Remplacer \sum par "somme"
  readable = readable.replace(/\\sum/g, "somme");
  
  // Remplacer \int par "intégrale"
  readable = readable.replace(/\\int/g, "intégrale");
  
  // Remplacer \pi par "pi"
  readable = readable.replace(/\\pi/g, "π");
  
  // Remplacer \alpha, \beta, etc. par leurs équivalents
  readable = readable.replace(/\\alpha/g, "α");
  readable = readable.replace(/\\beta/g, "β");
  readable = readable.replace(/\\gamma/g, "γ");
  readable = readable.replace(/\\delta/g, "δ");
  
  // Remplacer les accolades et autres symboles LaTeX
  readable = readable.replace(/\{|\}/g, "");
  readable = readable.replace(/\\/g, "");
  
  return readable;
};

// Fonction pour convertir le texte en gras (**texte**)
const convertBoldText = (text) => {
  const textWithoutLatex = convertLatexToText(text);
  const parts = [];
  let lastIndex = 0;
  const boldRegex = /\*\*([^*]+)\*\*/g;
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
export const formatGeneratedContent = (content) => {
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
  
  return formattedElements.length > 0 ? formattedElements : null;
};

// Fonction pour formater une date
export const formatDate = (dateStr) => {
  if (!dateStr) return "";
  const date = new Date(dateStr);
  return date.toLocaleDateString("fr-FR", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

