import React, { useState } from "react";
import api from "../../api";

function RessourcesTab({
  ressources,
  user,
}) {
  const [expandedRessources, setExpandedRessources] = useState({});
  const [downloadingRessource, setDownloadingRessource] = useState({});

  const toggleRessource = (ressourceId) => {
    setExpandedRessources({
      ...expandedRessources,
      [ressourceId]: !expandedRessources[ressourceId],
    });
  };

  const handleDownloadRessource = async (ressource) => {
    const ressourceId = ressource.id;
    setDownloadingRessource({ ...downloadingRessource, [ressourceId]: true });
    
    try {
      const response = await api.get(`/ressources/${ressourceId}/download`, {
        responseType: "blob",
      });
      
      // Créer un lien de téléchargement
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", ressource.filename || ressource.file_name || `ressource_${ressourceId}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      alert("Erreur lors du téléchargement: " + (err.response?.data?.detail || err.message));
    } finally {
      setDownloadingRessource({ ...downloadingRessource, [ressourceId]: false });
    }
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return "";
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + " KB";
    return (bytes / 1024 / 1024).toFixed(2) + " MB";
  };

  const getFileIcon = (filename) => {
    if (!filename) return "📄";
    const ext = filename.split(".").pop()?.toLowerCase();
    if (["pdf"].includes(ext)) return "📕";
    if (["doc", "docx"].includes(ext)) return "📘";
    if (["xls", "xlsx"].includes(ext)) return "📗";
    if (["txt", "rtf"].includes(ext)) return "📄";
    return "📎";
  };

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", marginBottom: "24px" }}>
        <div style={{
          width: "40px",
          height: "40px",
          borderRadius: "10px",
          backgroundColor: "#e1f5fe",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          marginRight: "12px",
          fontSize: "20px",
        }}>
          📋
        </div>
        <h3 style={{ margin: 0, fontSize: "1.4rem", color: "#333" }}>
          Mes ressources
        </h3>
        {ressources.length > 0 && (
          <span style={{
            marginLeft: "12px",
            padding: "4px 12px",
            backgroundColor: "#e1f5fe",
            color: "#0288d1",
            borderRadius: "12px",
            fontSize: "0.85rem",
            fontWeight: "bold",
          }}>
            {ressources.length}
          </span>
        )}
      </div>

      {ressources.length === 0 ? (
        <div style={{
          padding: "60px 24px",
          textAlign: "center",
          backgroundColor: "#f9f9f9",
          borderRadius: "12px",
          border: "2px dashed #e0e0e0",
        }}>
          <div style={{ fontSize: "48px", marginBottom: "16px" }}>📋</div>
          <p style={{ margin: 0, color: "#666", fontSize: "1.1rem", fontWeight: "500" }}>
            Aucune ressource disponible pour le moment.
          </p>
          <p style={{ margin: "8px 0 0 0", color: "#999", fontSize: "0.9rem" }}>
            Les ressources assignées à votre département apparaîtront ici.
          </p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          {ressources.map((ressource) => {
            const isExpanded = expandedRessources[ressource.id];
            const isDownloading = downloadingRessource[ressource.id];
            
            return (
              <div
                key={ressource.id}
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
                    <div style={{ display: "flex", alignItems: "center", marginBottom: "8px" }}>
                      <span style={{ fontSize: "1.5rem", marginRight: "12px" }}>
                        {getFileIcon(ressource.filename || ressource.file_name)}
                      </span>
                      <h4 style={{ margin: 0, color: "#0288d1", fontSize: "1.2rem" }}>
                        {ressource.titre}
                      </h4>
                    </div>
                    {ressource.description && (
                      <p style={{ margin: "0 0 12px 0", color: "#666", fontSize: "0.95rem" }}>
                        {ressource.description}
                      </p>
                    )}
                    <div style={{ display: "flex", gap: "16px", fontSize: "0.85rem", color: "#999" }}>
                      {ressource.filename || ressource.file_name && (
                        <span>📄 {ressource.filename || ressource.file_name}</span>
                      )}
                      {ressource.file_size && (
                        <span>💾 {formatFileSize(ressource.file_size)}</span>
                      )}
                      {ressource.created_at && (
                        <span>📅 Ajoutée le {new Date(ressource.created_at).toLocaleDateString("fr-FR")}</span>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => handleDownloadRessource(ressource)}
                    disabled={isDownloading}
                    style={{
                      padding: "10px 20px",
                      borderRadius: "6px",
                      border: "none",
                      backgroundColor: isDownloading ? "#ccc" : "#0288d1",
                      color: "#fff",
                      cursor: isDownloading ? "not-allowed" : "pointer",
                      fontSize: "0.9rem",
                      fontWeight: "600",
                      transition: "all 0.2s ease",
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                    }}
                    onMouseEnter={(e) => {
                      if (!isDownloading) {
                        e.currentTarget.style.backgroundColor = "#0277bd";
                        e.currentTarget.style.transform = "scale(1.05)";
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isDownloading) {
                        e.currentTarget.style.backgroundColor = "#0288d1";
                        e.currentTarget.style.transform = "scale(1)";
                      }
                    }}
                  >
                    {isDownloading ? (
                      <>
                        <span>⏳</span>
                        <span>Téléchargement...</span>
                      </>
                    ) : (
                      <>
                        <span>⬇️</span>
                        <span>Télécharger</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Informations supplémentaires (déroulable) */}
                {(ressource.description || ressource.created_at) && (
                  <>
                    <div
                      onClick={() => toggleRessource(ressource.id)}
                      style={{
                        marginTop: "16px",
                        padding: "12px",
                        backgroundColor: "#f5f5f5",
                        borderRadius: "6px",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                      }}
                    >
                      <span style={{ fontSize: "0.9rem", color: "#666", fontWeight: "600" }}>
                        ℹ️ Plus d'informations
                      </span>
                      <span style={{
                        fontSize: "1.2rem",
                        transition: "transform 0.3s ease",
                        transform: isExpanded ? "rotate(90deg)" : "rotate(0deg)",
                      }}>
                        ▶
                      </span>
                    </div>

                    {isExpanded && (
                      <div style={{
                        marginTop: "12px",
                        padding: "16px",
                        backgroundColor: "#fafafa",
                        borderRadius: "6px",
                        border: "1px solid #e0e0e0",
                      }}>
                        {ressource.description && (
                          <div style={{ marginBottom: "12px" }}>
                            <strong style={{ color: "#333", fontSize: "0.9rem" }}>Description :</strong>
                            <p style={{ margin: "8px 0 0 0", color: "#666", fontSize: "0.9rem", lineHeight: "1.6" }}>
                              {ressource.description}
                            </p>
                          </div>
                        )}
                        <div style={{ display: "flex", flexDirection: "column", gap: "8px", fontSize: "0.85rem", color: "#999" }}>
                          {ressource.created_at && (
                            <div>
                              <strong>Date d'ajout :</strong> {new Date(ressource.created_at).toLocaleString("fr-FR")}
                            </div>
                          )}
                          {ressource.file_size && (
                            <div>
                              <strong>Taille du fichier :</strong> {formatFileSize(ressource.file_size)}
                            </div>
                          )}
                          {ressource.filename || ressource.file_name && (
                            <div>
                              <strong>Nom du fichier :</strong> {ressource.filename || ressource.file_name}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default RessourcesTab;
