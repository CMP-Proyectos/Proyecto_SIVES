import React from "react";
import { MapCanvas } from "../components/MapCanvas";
import { styles } from "../../../theme/styles";
import type { UseMapFlowResult } from "../../../hooks/flow/useMapFlow";
import { isPuestaTierra } from "../../../utils/activity";

type Option = {
  value: string;
  label: string;
};

type Props = {
  isOnline: boolean;
  map: UseMapFlowResult;
};

type FilterSelectProps = {
  label: string;
  value: string;
  options: Option[];
  onChange: (value: string) => void;
  placeholder: string;
  disabled?: boolean;
};

const toggleButtonStyle = (isActive: boolean): React.CSSProperties => ({
  flex: 1,
  height: "42px",
  borderRadius: "14px",
  border: isActive ? "1px solid #003366" : "1px solid rgba(15, 23, 42, 0.08)",
  backgroundColor: isActive ? "#003366" : "#FFFFFF",
  color: isActive ? "#FFFFFF" : "#334155",
  fontSize: "12px",
  fontWeight: "600",
  cursor: "pointer",
});

const FilterSelect = ({
  label,
  value,
  options,
  onChange,
  placeholder,
  disabled = false,
}: FilterSelectProps) => (
  <div>
    <label style={styles.label}>{label}</label>
    <select
      value={value}
      onChange={(event) => onChange(event.target.value)}
      disabled={disabled}
      style={{
        ...styles.selects,
        opacity: disabled ? 0.6 : 1,
        cursor: disabled ? "not-allowed" : "pointer",
      }}
    >
      <option value="">{placeholder}</option>
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  </div>
);

const buildRecordMeta = (label: string, value: string | null | undefined) => (
  <div
    key={label}
    style={{
      backgroundColor: "#F8FAFC",
      border: "1px solid #E2E8F0",
      borderRadius: "8px",
      padding: "12px",
      minWidth: 0,
    }}
  >
    <div style={{ ...styles.label, marginBottom: "4px" }}>{label}</div>
    <div style={{ ...styles.text, fontSize: "13px", overflowWrap: "anywhere" }}>{value || "---"}</div>
  </div>
);

export const MapScreen = ({ isOnline, map }: Props) => {
  const mapCardStyle: React.CSSProperties = {
    ...styles.panel,
    maxHeight: "none",
    overflow: "visible",
    minHeight: 0,
  };

  const mapDetailCardStyle: React.CSSProperties = {
    ...styles.section,
    marginBottom: 0,
    gap: "14px",
  };

  const selectedRecordCardStyle: React.CSSProperties = {
    border: "1px solid #E2E8F0",
    borderRadius: "22px",
    backgroundColor: "#FFFFFF",
    padding: "16px",
    boxSizing: "border-box",
    width: "100%",
    minWidth: 0,
  };

  const selectedRecordGridStyle: React.CSSProperties = {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
    gap: "16px",
    alignItems: "start",
    minWidth: 0,
  };

  const selectedRecordImageCardStyle: React.CSSProperties = {
    borderRadius: "12px",
    overflow: "hidden",
    backgroundColor: "#F8FAFC",
    border: "1px solid #E2E8F0",
    minHeight: "220px",
    maxHeight: "360px",
    aspectRatio: "4 / 3",
    minWidth: 0,
  };

  const selectedRecordImageStyle: React.CSSProperties = {
    width: "100%",
    height: "100%",
    objectFit: "cover",
    display: "block",
  };

  const selectedRecordContentStyle: React.CSSProperties = {
    display: "grid",
    gap: "12px",
    minWidth: 0,
    alignContent: "start",
  };

  const selectedRecordMetaGridStyle: React.CSSProperties = {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
    gap: "12px",
    minWidth: 0,
  };

  const projectOptions = map.projects.map((project) => ({
    value: String(project.ID_Proyectos),
    label: project.Proyecto_Nombre,
  }));
  const itemOptions = map.items.map((item) => ({ value: item, label: item }));
  const frontOptions = map.fronts.map((front) => ({
    value: String(front.ID_Frente),
    label: front.Nombre_Frente,
  }));
  const localityOptions = map.localities.map((locality) => ({
    value: String(locality.ID_Localidad),
    label: locality.Nombre_Localidad,
  }));
  const substationOptions = map.substations.map((substation) => ({
    value: substation,
    label: substation,
  }));
  const structureOptions = map.structures.map((structure) => ({
    value: structure,
    label: structure,
  }));
  const groupOptions = map.groups.map((group) => ({ value: group, label: group }));
  const activityOptions = map.activities.map((activity) => ({
    value: String(activity.ID_Actividad),
    label: activity.Nombre_Actividad,
  }));
  const selectedRecordIsPat = isPuestaTierra({
    Grupo: map.selectedRecord?.nombre_grupo,
    Nombre_Actividad: map.selectedRecord?.nombre_actividad,
  });
  const shouldShowOhms = selectedRecordIsPat && map.selectedRecord?.ohms != null;

  const emptyMessage =
    map.mode === "global" && !map.selectedProjectId
      ? "Seleccione un proyecto para consultar el mapa global."
      : map.isLoadingRecords
        ? "Cargando registros georreferenciados..."
        : map.mode === "global" && map.globalError
          ? map.globalError
          : "No se encontraron registros con coordenadas para los filtros actuales.";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      <div style={mapCardStyle}>
        <div style={{ ...styles.flexBetween, gap: "12px", marginBottom: "16px", flexWrap: "wrap" }}>
          <div>
            <h2 style={{ ...styles.heading, marginBottom: "6px", borderBottom: "none", paddingBottom: 0 }}>
              Mapa de registros
            </h2>
            <div style={{ fontSize: "12px", color: "#64748B", lineHeight: 1.5 }}>
              {map.filteredRecords.length} registros con coordenadas visibles
            </div>
          </div>

          <div style={{ display: "flex", gap: "8px", width: "100%", maxWidth: "320px", backgroundColor: "#EEF2F7", borderRadius: "18px", padding: "4px" }}>
            <button type="button" onClick={() => map.setMode("mine")} style={toggleButtonStyle(map.mode === "mine")}>
              Mi mapa
            </button>
            <button
              type="button"
              onClick={() => map.setMode("global")}
              style={toggleButtonStyle(map.mode === "global")}
            >
              Mapa global
            </button>
          </div>
        </div>

        {!isOnline && (
          <div
            style={{
              marginBottom: "16px",
              backgroundColor: "#F8FAFC",
              border: "1px solid #CBD5E1",
              borderRadius: "10px",
              padding: "12px 14px",
              fontSize: "12px",
              color: "#475569",
              lineHeight: 1.5,
            }}
          >
            Sin conexion. El resto de la app sigue operativo, pero el fondo base puede no cargar y el modo global
            depende de conexion o de datos ya consultados en esta sesion.
          </div>
        )}

        {map.mode === "global" && map.globalError && (
          <div
            style={{
              marginBottom: "16px",
              backgroundColor: "#FFF7ED",
              border: "1px solid #FED7AA",
              borderRadius: "10px",
              padding: "12px 14px",
              fontSize: "12px",
              color: "#9A3412",
              lineHeight: 1.5,
            }}
          >
            {map.globalError}
          </div>
        )}

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
            gap: "12px",
            marginBottom: "16px",
          }}
        >
          <FilterSelect
            label="Proyecto"
            value={map.selectedProjectId ? String(map.selectedProjectId) : ""}
            options={projectOptions}
            onChange={(value) => map.setSelectedProjectId(value ? Number(value) : null)}
            placeholder={map.mode === "global" ? "Seleccione proyecto" : "Todos los proyectos"}
          />

          <FilterSelect
            label="Seccion"
            value={map.selectedItem || ""}
            options={itemOptions}
            onChange={(value) => map.setSelectedItem(value || null)}
            placeholder="Todas las secciones"
            disabled={!map.selectedProjectId}
          />

          <FilterSelect
            label="Frente"
            value={map.selectedFrontId ? String(map.selectedFrontId) : ""}
            options={frontOptions}
            onChange={(value) => map.setSelectedFrontId(value ? Number(value) : null)}
            placeholder="Todos los frentes"
            disabled={!map.selectedProjectId || !map.selectedItem}
          />

          <FilterSelect
            label="Localidad"
            value={map.selectedLocalityId ? String(map.selectedLocalityId) : ""}
            options={localityOptions}
            onChange={(value) => map.setSelectedLocalityId(value ? Number(value) : null)}
            placeholder="Todas las localidades"
            disabled={!map.selectedFrontId}
          />

          {map.shouldShowSubstationFilter && (
            <FilterSelect
              label="Subestacion"
              value={map.selectedSubstation || ""}
              options={substationOptions}
              onChange={(value) => map.setSelectedSubstation(value || null)}
              placeholder="Todas las subestaciones"
            />
          )}

          <FilterSelect
            label="Estructura"
            value={map.selectedStructure || ""}
            options={structureOptions}
            onChange={(value) => map.setSelectedStructure(value || null)}
            placeholder="Todas las estructuras"
            disabled={!map.selectedLocalityId}
          />

          <FilterSelect
            label="Grupo"
            value={map.selectedGroup || ""}
            options={groupOptions}
            onChange={(value) => map.setSelectedGroup(value || null)}
            placeholder="Todos los grupos"
            disabled={!map.selectedStructure}
          />

          <FilterSelect
            label="Actividad"
            value={map.selectedActivityId ? String(map.selectedActivityId) : ""}
            options={activityOptions}
            onChange={(value) => map.setSelectedActivityId(value ? Number(value) : null)}
            placeholder="Todas las actividades"
            disabled={!map.selectedGroup}
          />
        </div>

        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
          <button type="button" onClick={map.clearFilters} style={{ ...styles.btnSecondary, width: "auto", margin: 0 }}>
            Limpiar filtros
          </button>

          {map.mode === "global" && map.selectedProjectId && (
            <button
              type="button"
              onClick={() => void map.refreshGlobalRecords()}
              style={{ ...styles.btnSecondary, width: "auto", margin: 0 }}
            >
              Recargar mapa global
            </button>
          )}
        </div>
      </div>

      <div style={mapDetailCardStyle}>
        <div style={{ ...styles.flexBetween, flexWrap: "wrap", gap: "10px" }}>
          <div>
            <div style={{ fontSize: "13px", fontWeight: "700", color: "#0F172A" }}>
              {map.mode === "mine" ? "Registros del usuario autenticado" : "Registros visibles del proyecto"}
            </div>
            <div style={{ fontSize: "12px", color: "#64748B", marginTop: "4px" }}>
              Zoom, paneo y seleccion de marcadores habilitados.
            </div>
          </div>

          <div
            style={{
              fontSize: "11px",
              fontWeight: "700",
              color: "#003366",
              backgroundColor: "#EFF6FF",
              border: "1px solid #BFDBFE",
              borderRadius: "999px",
              padding: "6px 10px",
              textTransform: "uppercase",
            }}
          >
            {map.mode === "mine" ? "Personal" : "Global"}
          </div>
        </div>

        <div
          style={{
            position: "relative",
            height: "52vh",
            minHeight: "360px",
            borderRadius: "12px",
            overflow: "hidden",
            border: "1px solid #CBD5E1",
            backgroundColor: "#E2E8F0",
          }}
        >
          <MapCanvas
            records={map.filteredRecords}
            selectedRecord={map.selectedRecord}
            onSelectRecord={(recordId) => map.setSelectedRecordId(recordId)}
            emptyMessage={emptyMessage}
          />
        </div>

        {map.selectedRecord && (
          <div style={selectedRecordCardStyle}>
            <div style={{ ...styles.flexBetween, gap: "12px", alignItems: "flex-start", marginBottom: "16px" }}>
              <div>
                <div style={{ ...styles.label, marginBottom: "4px" }}>Registro seleccionado</div>
                <div style={{ fontSize: "16px", fontWeight: "700", color: "#0F172A" }}>
                  {map.selectedRecord.nombre_actividad}
                </div>
                <div style={{ fontSize: "12px", color: "#64748B", marginTop: "4px" }}>
                  {new Date(map.selectedRecord.fecha_subida).toLocaleString()}
                </div>
              </div>

              <button
                type="button"
                onClick={() => map.setSelectedRecordId(null)}
                style={{ ...styles.btnSecondary, width: "auto", margin: 0, height: "40px" }}
              >
                Cerrar detalle
              </button>
            </div>

            <div style={selectedRecordGridStyle}>
              <div style={selectedRecordImageCardStyle}>
                {map.selectedRecord.url_foto ? (
                  <img
                    src={map.selectedRecord.url_foto}
                    alt="Evidencia del registro"
                    style={selectedRecordImageStyle}
                  />
                ) : (
                  <div
                    style={{
                      width: "100%",
                      height: "100%",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "12px",
                      color: "#94A3B8",
                      fontWeight: "700",
                    }}
                  >
                    SIN IMAGEN
                  </div>
                )}
              </div>

              <div style={selectedRecordContentStyle}>
                <div
                  style={{
                    backgroundColor: "#F8FAFC",
                    border: "1px solid #E2E8F0",
                    borderRadius: "8px",
                    padding: "12px",
                    minWidth: 0,
                  }}
                >
                  <div style={styles.label}>Comentario</div>
                  <div
                    style={{
                      ...styles.text,
                      fontSize: "13px",
                      color: map.selectedRecord.comentario ? "#334155" : "#94A3B8",
                      overflowWrap: "anywhere",
                    }}
                  >
                    {map.selectedRecord.comentario || "Sin observaciones registradas."}
                  </div>
                </div>

                <div style={selectedRecordMetaGridStyle}>
                  {shouldShowOhms && (
                    <div
                      style={{
                        backgroundColor: "#ECFDF5",
                        border: "1px solid #A7F3D0",
                        borderRadius: "8px",
                        padding: "12px",
                        minWidth: 0,
                      }}
                    >
                      <div style={{ ...styles.label, marginBottom: "4px", color: "#047857" }}>Medición PAT</div>
                      <div style={{ fontSize: "20px", fontWeight: "800", color: "#065F46" }}>
                        {map.selectedRecord.ohms} Ω
                      </div>
                    </div>
                  )}
                  {buildRecordMeta("Proyecto", map.selectedRecord.nombre_proyecto)}
                  {buildRecordMeta("Seccion", map.selectedRecord.nombre_item)}
                  {buildRecordMeta("Frente", map.selectedRecord.nombre_frente)}
                  {buildRecordMeta("Localidad", map.selectedRecord.nombre_localidad)}
                  {buildRecordMeta("Subestacion", map.selectedRecord.nombre_subestacion)}
                  {buildRecordMeta("Estructura", map.selectedRecord.nombre_detalle)}
                  {buildRecordMeta("Grupo", map.selectedRecord.nombre_grupo)}
                  {buildRecordMeta("Actividad", map.selectedRecord.nombre_actividad)}
                  {buildRecordMeta(
                    "Coordenadas",
                    `${map.selectedRecord.latitud.toFixed(6)}, ${map.selectedRecord.longitud.toFixed(6)}`
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
