import React from "react";

function QuotaStats({ quotaStats }) {
  if (!quotaStats) return null;

  return (
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
  );
}

export default QuotaStats;

