import React, { useState, useEffect } from "react";
import { styles } from "../../../theme/styles";
import { fetchHistoryForDetail, ActivityRecord } from "../../../services/dataService";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { DetailWithActivity } from "../../../hooks/flow/catalogHierarchy";

interface Props {
  selectedProjectName: string | null;
  selectedItem: string | null;
  selectedFrontName: string | null;
  selectedLocalityName: string | null;
  selectedSubstation: string | null;
  selectedStructureName: string | null;
  selectedGroup: string | null;
  selectedActivity: ActivityRecord | null;
  selectedDetail: DetailWithActivity | null;
  onContinue: () => void;
}

export const ActivityConfirmationScreen: React.FC<Props> = ({
  selectedProjectName,
  selectedItem,
  selectedFrontName,
  selectedLocalityName,
  selectedSubstation,
  selectedStructureName,
  selectedGroup,
  selectedActivity,
  selectedDetail,
  onContinue,
}) => {
  const [evidenceHistory, setEvidenceHistory] = useState<any[]>([]);
  const [loadingEvidence, setLoadingEvidence] = useState(false);
  const [showEvidencePreview, setShowEvidencePreview] = useState(false);
  const [selectedEvidenceToView, setSelectedEvidenceToView] = useState<any>(null);

  useEffect(() => {
    if (selectedDetail?.ID_DetallesActividad) {
      setLoadingEvidence(true);
      setEvidenceHistory([]);
      setShowEvidencePreview(false);

      fetchHistoryForDetail(selectedDetail.ID_DetallesActividad)
        .then((records) => {
          setEvidenceHistory(records || []);
        })
        .catch((error) => console.error("Error cargando historial:", error))
        .finally(() => setLoadingEvidence(false));
    }
  }, [selectedDetail]);

  const selectionRows = [
    { key: "Proyecto", value: selectedProjectName },
    { key: "Especialidad", value: selectedItem },
    { key: "Frente", value: selectedFrontName },
    { key: "Localidad", value: selectedLocalityName },
    ...(selectedSubstation ? [{ key: "Subestacion", value: selectedSubstation }] : []),
    { key: "Estructura", value: selectedStructureName || selectedDetail?.Nombre_Detalle || null },
    { key: "Grupo", value: selectedGroup },
    { key: "Actividad", value: selectedActivity?.Nombre_Actividad || null },
  ];

  return (
    <div
      style={{
        ...styles.card,
        display: "flex",
        flexDirection: "column",
        height: "100%",
        overflow: "hidden",
      }}
    >
      <h2 style={{ ...styles.heading, flexShrink: 0 }}>CONFIRMAR SELECCION</h2>

      <div style={{ flex: 1, overflowY: "auto", minHeight: 0, paddingRight: "4px", ...styles.scrollSafeBottom }}>
        <div
          style={{
            padding: "20px",
            backgroundColor: "#F8FAFC",
            border: "1px solid #E2E8F0",
            marginBottom: "20px",
            borderRadius: "8px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "16px" }}>
            <div style={{ backgroundColor: "#DBEAFE", padding: "10px", borderRadius: "50%" }}>
              <MaterialCommunityIcons name="lightning-bolt" size={24} color="#2563EB" />
            </div>
            <div>
              <label style={{ ...styles.label, marginBottom: "2px" }}>CADENA SELECCIONADA</label>
              <p style={{ fontSize: "15px", fontWeight: "700", color: "#1E293B", margin: 0, lineHeight: 1.2 }}>
                {selectedStructureName || selectedDetail?.Nombre_Detalle || "Sin estructura seleccionada"}
              </p>
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {selectionRows.map((row) => (
              <div
                key={row.key}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: "12px",
                  padding: "10px 12px",
                  borderRadius: "8px",
                  backgroundColor: "#FFFFFF",
                  border: "1px solid #E2E8F0",
                }}
              >
                <span style={{ fontSize: "12px", fontWeight: "700", color: "#475569", textTransform: "uppercase" }}>
                  {row.key}
                </span>
                <span style={{ fontSize: "13px", color: "#1E293B", textAlign: "right" }}>{row.value || "No definido"}</span>
              </div>
            ))}
          </div>
        </div>

        <div
          style={{
            marginBottom: "20px",
            border: "1px solid #E2E8F0",
            borderRadius: "12px",
            backgroundColor: "#fff",
            boxShadow: "0 2px 5px rgba(0,0,0,0.03)",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              padding: "12px 16px",
              backgroundColor: "#fff",
              borderBottom: "1px solid #F1F5F9",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <Ionicons name="time-outline" size={16} color="#64748B" />
              <span
                style={{
                  fontSize: "12px",
                  fontWeight: "600",
                  color: "#475569",
                  textTransform: "uppercase",
                  letterSpacing: "0.5px",
                }}
              >
                Historial de la estructura
              </span>
            </div>
            {evidenceHistory.length > 0 && (
              <span
                style={{
                  fontSize: "10px",
                  backgroundColor: "#F1F5F9",
                  color: "#64748B",
                  padding: "2px 8px",
                  borderRadius: "12px",
                  fontWeight: "600",
                  border: "1px solid #E2E8F0",
                }}
              >
                {evidenceHistory.length}
              </span>
            )}
          </div>

          <div style={{ padding: "0" }}>
            {loadingEvidence ? (
              <div style={{ padding: "20px", textAlign: "center", fontSize: "12px", color: "#94A3B8" }}>
                <Ionicons name="sync" size={16} className="spin" style={{ marginBottom: 4 }} />
                <div>Cargando registros...</div>
              </div>
            ) : evidenceHistory.length > 0 ? (
              <div>
                <div
                  onClick={() => setShowEvidencePreview(!showEvidencePreview)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "12px 16px",
                    cursor: "pointer",
                    backgroundColor: showEvidencePreview ? "#F8FAFC" : "#fff",
                    transition: "background 0.2s",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <div
                      style={{
                        width: "32px",
                        height: "32px",
                        borderRadius: "6px",
                        backgroundColor: "#F1F5F9",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Ionicons name="images-outline" size={18} color="#64748B" />
                    </div>
                    <div>
                      <div style={{ fontSize: "13px", fontWeight: "600", color: "#1E293B" }}>
                        {showEvidencePreview ? "Ocultar evidencias" : "Ver evidencias previas"}
                      </div>
                      <div style={{ fontSize: "11px", color: "#94A3B8" }}>
                        Ultimo registro: {new Date(evidenceHistory[0].Fecha_Subida).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                  <Ionicons name={showEvidencePreview ? "chevron-up" : "chevron-down"} size={20} color="#94A3B8" />
                </div>

                {showEvidencePreview && (
                  <div style={{ borderTop: "1px solid #E2E8F0", maxHeight: "300px", overflowY: "auto" }}>
                    {evidenceHistory.map((item, index) => (
                      <div
                        key={item.ID_Registros || index}
                        onClick={() => setSelectedEvidenceToView(item)}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          padding: "10px 16px",
                          borderBottom: index !== evidenceHistory.length - 1 ? "1px solid #F8FAFC" : "none",
                          cursor: "pointer",
                          transition: "background 0.2s",
                        }}
                        onMouseEnter={(event) => {
                          event.currentTarget.style.backgroundColor = "#F8FAFC";
                        }}
                        onMouseLeave={(event) => {
                          event.currentTarget.style.backgroundColor = "transparent";
                        }}
                      >
                        <img
                          src={item.URL_Archivo}
                          alt="Thumb"
                          style={{
                            width: "48px",
                            height: "48px",
                            borderRadius: "8px",
                            objectFit: "cover",
                            border: "1px solid #E2E8F0",
                            marginRight: "12px",
                          }}
                          onError={(event) => {
                            (event.target as HTMLImageElement).src = "https://placehold.co/100?text=IMG";
                          }}
                        />
                        <div style={{ flex: 1 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "2px" }}>
                            <span style={{ fontSize: "12px", fontWeight: "600", color: "#334155" }}>
                              {new Date(item.Fecha_Subida).toLocaleDateString()}
                            </span>
                            <span style={{ fontSize: "11px", color: "#94A3B8" }}>
                              {new Date(item.Fecha_Subida).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                            </span>
                          </div>
                          <div
                            style={{
                              fontSize: "11px",
                              color: "#64748B",
                              display: "-webkit-box",
                              WebkitLineClamp: 1,
                              WebkitBoxOrient: "vertical",
                              overflow: "hidden",
                            }}
                          >
                            {item.Comentario || "Sin notas"}
                          </div>
                        </div>
                        <Ionicons name="eye-outline" size={18} color="#CBD5E1" />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div style={{ padding: "20px", display: "flex", flexDirection: "column", alignItems: "center", gap: "8px", color: "#94A3B8" }}>
                <MaterialCommunityIcons name="image-off-outline" size={32} color="#E2E8F0" />
                <span style={{ fontSize: "12px", fontStyle: "italic" }}>Sin registros previos.</span>
              </div>
            )}
          </div>
        </div>
      </div>

      <div style={{ marginTop: "auto", flexShrink: 0, paddingTop: "10px" }}>
        <button
          onClick={onContinue}
          style={{
            ...styles.btnPrimary,
            height: "56px",
            width: "100%",
            borderRadius: "12px",
            fontSize: "14px",
            fontWeight: "700",
            letterSpacing: "0.5px",
            boxShadow: "0 4px 6px -1px rgba(37, 99, 235, 0.2)",
          }}
        >
          COMENZAR REPORTE
        </button>
      </div>

      {selectedEvidenceToView && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0,0,0,0.95)",
            zIndex: 9999,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            animation: "fadeIn 0.2s",
          }}
          onClick={() => setSelectedEvidenceToView(null)}
        >
          <div style={{ position: "absolute", top: "20px", right: "20px", cursor: "pointer", padding: "10px" }}>
            <Ionicons name="close-circle" size={36} color="white" />
          </div>
          <img
            src={selectedEvidenceToView.URL_Archivo}
            style={{
              maxWidth: "100%",
              maxHeight: "70vh",
              borderRadius: "4px",
              objectFit: "contain",
              boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.5)",
            }}
            onClick={(event) => event.stopPropagation()}
            alt="Estructura"
          />
          <div
            style={{
              marginTop: "20px",
              backgroundColor: "#1E293B",
              padding: "20px",
              borderRadius: "12px",
              maxWidth: "90%",
              width: "400px",
              border: "1px solid #334155",
              boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.3)",
            }}
            onClick={(event) => event.stopPropagation()}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
              <Ionicons name="calendar-outline" size={14} color="#94A3B8" />
              <span style={{ fontSize: "12px", color: "#CBD5E1" }}>
                {new Date(selectedEvidenceToView.Fecha_Subida).toLocaleString()}
              </span>
            </div>
            <div style={{ borderTop: "1px solid #334155", paddingTop: "10px" }}>
              <p style={{ fontSize: "14px", color: "#F1F5F9", lineHeight: 1.5, margin: 0 }}>
                {selectedEvidenceToView.Comentario || (
                  <span style={{ color: "#64748B", fontStyle: "italic" }}>Sin comentarios adicionales.</span>
                )}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
