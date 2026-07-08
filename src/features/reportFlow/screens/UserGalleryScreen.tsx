import React, { useMemo } from 'react';import 
{ styles } from '../../../theme/styles';
import type { UserRecord } from '../../../types/records.types';
import { useReportFlow } from "../../../hooks/useReportFlow";

interface Props {
    records: UserRecord[];
    isLoading: boolean;
    selectedRecordId: number | null;
    onSelectRecord: (id: number | null) => void;
    onDelete: (rec: UserRecord) => void;
    onEdit: () => void;
    actualizarEstado: (
        idRegistro: number, 
        tipoColumna: 'Supervisor' | 'Especialista', 
        valorActual: number | null
    ) => Promise<void>;
}

type Option = {
  value: string;
  label: string;
};

type FilterSelectProps = {
  label: string;
  value: string;
  options: Option[];
  onChange: (value: string) => void;
  placeholder: string;
  disabled?: boolean;
};

const FilterSelect = ({
  label,
  value,
  options,
  onChange,
  placeholder,
  disabled = false,
}: FilterSelectProps) => (
  <div>
    <label style={{ ...styles.label, fontSize: '11px', marginBottom: '4px', display: 'block' }}>{label}</label>
    <select
      value={value}
      onChange={(event) => onChange(event.target.value)}
      disabled={disabled}
      style={{
        ...styles.selects,
        width: '100%',
        padding: '8px 12px',
        borderRadius: '8px',
        border: '1px solid #CBD5E1',
        backgroundColor: disabled ? '#F8FAFC' : '#FFFFFF',
        color: disabled ? '#94A3B8' : '#334155',
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

export const UserGalleryScreen = ({
    records, isLoading, selectedRecordId, onSelectRecord, onDelete, onEdit, actualizarEstado
}: Props) => {

  const flow = useReportFlow();
  const isSupervisor = flow.sessionUser?.app_metadata?.es_supervisor === true;
  const isEspecialista = flow.sessionUser?.app_metadata?.es_especialista === true;
  const { gallery } = flow;
  const filteredRecords = useMemo(() => {
    if (!records) return [];
    const normalize = (text: string | null | undefined) => (text || "").trim().toLowerCase();

    return records.filter(rec => {
      const proyectoStr = rec.nombre_proyecto || (rec.bucket ? rec.bucket.replace(/_/g, ' ').toUpperCase() : null);
      if (gallery.selectedProjectName && normalize(proyectoStr) !== normalize(gallery.selectedProjectName)) return false;
      
      if (gallery.selectedItem && normalize(rec.nombre_item) !== normalize(gallery.selectedItem)) return false;

      if (gallery.selectedStructure && normalize(rec.nombre_detalle) !== normalize(gallery.selectedStructure)) return false;
      
      if (gallery.selectedFrontName && normalize(rec.nombre_frente) !== normalize(gallery.selectedFrontName)) return false;
      
      if (gallery.selectedLocalityName && normalize(rec.nombre_localidad) !== normalize(gallery.selectedLocalityName)) return false;

      if (gallery.selectedGroup && normalize(rec.nombre_grupo) !== normalize(gallery.selectedGroup)) return false;

      if (gallery.selectedActivityName && normalize(rec.nombre_actividad) !== normalize(gallery.selectedActivityName)) return false;
      
      return true;
    });
  }, [
    records, 
    gallery.selectedProjectName,
    gallery.selectedItem,
    gallery.selectedStructure, 
    gallery.selectedLocalityName,
    gallery.selectedGroup,
    gallery.selectedActivityName
  ]);

  const projectOptions = gallery.projects.map((project) => ({
    value: String(project.ID_Proyectos),
    label: project.Proyecto_Nombre,
  }));
  const itemOptions = gallery.items.map((item) => ({ value: item, label: item }));
  const frontOptions = gallery.fronts.map((front) => ({
    value: String(front.ID_Frente),
    label: front.Nombre_Frente,
  }));
  const localityOptions = gallery.localities.map((locality) => ({
    value: String(locality.ID_Localidad),
    label: locality.Nombre_Localidad,
  }));
  const structureOptions = gallery.structures.map((structure) => ({
    value: structure,
    label: structure,
  }));
  const groupOptions = gallery.groups.map((group) => ({ value: group, label: group }));
  const activityOptions = gallery.activities.map((activity) => ({
    value: String(activity.ID_Actividad),
    label: activity.Nombre_Actividad,
  }));

  const buildCombinedLabel = (...values: (string | null | undefined)[]) => {
    const filteredValues = values.map((value) => value?.trim()).filter(Boolean);
    return filteredValues.length > 0 ? filteredValues.join(" - ") : "Sin información";
  };

  const getPrimaryRecordLabel = (record: UserRecord) => buildCombinedLabel(record.nombre_grupo, record.nombre_detalle);
  const getActivityDetailLabel = (record: UserRecord) => buildCombinedLabel(record.nombre_actividad, record.nombre_detalle);
  const getVerificado = (numero: number | null) => {
    if (numero === 1) return "Verificado";
    if (numero === 0) return "No verificado";
    
    return "Sin verificar";
    };

  const handleToggleVerificacion = async (
    idRegistro: number, 
    tipo: 'Supervisor' | 'Especialista', 
    valorActual: number | null
  ) => {
    try {
      await actualizarEstado(idRegistro, tipo, valorActual);
      alert(`Estado de ${tipo} actualizado correctamente`); 
    } catch (error) {
      alert("Hubo un error al actualizar el estado");
    }
  };

  React.useEffect(() => {
    console.info("[records] UserGalleryScreen render", {
      isLoading,
      renderedCount: filteredRecords.length,
      selectedRecordId,
    });
  }, [isLoading, filteredRecords.length, selectedRecordId]);

  const renderDetail = () => {
    const rec = filteredRecords.find(r => r.id_registro === selectedRecordId);
    if (!rec) return null;

    const proyectoStr = rec.nombre_proyecto || (rec.bucket ? rec.bucket.replace(/_/g, ' ').toUpperCase() : "GENERAL");
    const primaryLabel = getPrimaryRecordLabel(rec);
    const activityDetailLabel = getActivityDetailLabel(rec);
    const imageCount = rec.total_imagenes || 0;

    return (
        <div style={styles.detailOverlay}>
            <div style={styles.detailHeader}>
                <div style={{flex: 1}}>
                    <span style={{fontSize:'11px', color:'#64748B', textTransform:'uppercase', display:'block', fontWeight:'700'}}>
                        REGISTRO SELECCIONADO
                    </span>
                    <h3 style={{margin:0, fontSize:'16px', color:'#0F172A', fontWeight:'700', lineHeight:'1.2'}}>
                        {primaryLabel}
                    </h3>
                    {rec.nombre_actividad && (
                        <div style={{ marginTop: '4px', fontSize: '12px', color: '#64748B' }}>
                            {rec.nombre_actividad}
                        </div>
                    )}
                </div>
                <button onClick={() => onSelectRecord(null)} style={styles.backArrowBtn}>
                    {"<-"}
                </button>
            </div>

            <div style={styles.detailContent}>
                <div style={{
                    backgroundColor:'#F1F5F9', border: '1px solid #E2E8F0', borderRadius:'8px',
                    marginBottom:'24px', display:'flex', justifyContent:'center', alignItems: 'center',
                    minHeight:'250px', padding: '10px', position: 'relative'
                }}>
                    {imageCount > 1 && (
                        <div style={{
                            position: 'absolute',
                            top: '12px',
                            right: '12px',
                            backgroundColor: 'rgba(15, 23, 42, 0.82)',
                            color: '#FFFFFF',
                            borderRadius: '999px',
                            padding: '4px 8px',
                            fontSize: '11px',
                            fontWeight: '700'
                        }}>
                            {imageCount}
                        </div>
                    )}
                    {rec.url_foto ? (
                        <img src={rec.url_foto} style={{maxWidth:'100%', maxHeight:'50vh', objectFit:'contain', borderRadius: '4px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)'}} alt="Evidencia" />
                    ) : (
                        <div style={{color:'#94A3B8', fontWeight:'600'}}>SIN IMAGEN DISPONIBLE</div>
                    )}
                </div>
                    <div style={{
                        ...styles.card, 
                        padding: '20px', 
                        boxShadow: 'none', 
                        border: '1px solid #E2E8F0',
                        height: 'auto',             
                        minHeight: 'min-content',   
                        display: 'flex',
                        flexDirection: 'column',
                        flexShrink: 0
                    }}>                    
                    <h4 style={{...styles.heading, fontSize: '14px', borderBottom: '1px solid #F1F5F9'}}>
                        DATOS DEL REPORTE
                    </h4>

                    <div style={{display:'grid', gap:'16px'}}>
                        <div>
                            <label style={styles.label}>PROYECTO</label>
                            <div style={styles.text}>{proyectoStr}</div>
                        </div>

                        <div>
                            <label style={styles.label}>Enlace</label>
                            <div style={styles.text}>{rec.url_foto}</div>
                        </div>

                        <div>
                            <label style={styles.label}>Dueño</label>
                            <div style={styles.text}>{rec.correo}</div>
                        </div>

                        <div>
                            <label style={styles.label}>FRENTE</label>
                            <div style={styles.text}>{rec.nombre_frente || "---"}</div>
                        </div>

                        <div>
                            <label style={styles.label}>LOCALIDAD</label>
                            <div style={styles.text}>{rec.nombre_localidad || "---"}</div>
                        </div>

                        <div>
                            <label style={styles.label}>Sección</label>
                            <div style={styles.text}>{rec.nombre_item || "---"}</div>
                        </div>

                        <div>
                            <label style={styles.label}>GRUPO</label>
                            <div style={styles.text}>{rec.nombre_grupo || "---"}</div>
                        </div>

                        <div>
                            <label style={styles.label}>ACTIVIDAD / Especialidad</label>
                            <div style={styles.text}>{activityDetailLabel}</div>
                        </div>

                        <div>
                            <label style={styles.label}>COORDENADAS</label>
                            <div style={styles.monoText}>
                                {rec.latitud ? `${rec.latitud.toFixed(6)}, ${rec.longitud?.toFixed(6)}` : "NO REGISTRADAS"}
                            </div>
                        </div>

                        <div>
                            <label style={styles.label}>OBSERVACIONES</label>
                            <div style={{
                                ...styles.text, backgroundColor: '#F8FAFC', padding: '10px',
                                borderRadius: '4px', border: '1px solid #F1F5F9',
                                color: rec.comentario ? '#334155' : '#94A3B8',
                                fontStyle: rec.comentario ? 'normal' : 'italic'
                            }}>
                                {rec.comentario || "Sin observaciones."}
                            </div>
                        </div>
                        <div>
                            <label style={styles.label}>Supervisor</label>
                            <div style={styles.text}>{getVerificado(rec.supervisor)}</div>
                            {isSupervisor && (
                                <button 
                                    onClick={() => handleToggleVerificacion(rec.id_registro, 'Supervisor', rec.supervisor)}
                                    style={{
                                        ...styles.btnSecondary,
                                        margin: 0,
                                        height: '48px',
                                        width: '100%',
                                        backgroundColor: rec.supervisor === 1 ? '#EF4444' : '#3B82F6', // Rojo si ya está verificado, Azul
                                    }}
                                >
                                    {rec.supervisor === 1 ? 'Anular Verificación' : 'Verificar como Supervisor'}
                                </button>
                            )}
                        </div>
                        <div>
                            <label style={styles.label}>Especialista</label>
                            <div style={styles.text}>{getVerificado(rec.especialista)}</div>
                            {isEspecialista && (
                                <button 
                                    onClick={() => handleToggleVerificacion(rec.id_registro, 'Especialista', rec.especialista)} 
                                    style={{
                                        ...styles.btnSecondary,
                                        margin: 0,
                                        height: '48px',
                                        width: '100%',
                                        backgroundColor: rec.especialista === 1 ? '#EF4444' : '#3B82F6', // Rojo si ya está verificado, Azul
                                    }}
                                >
                                    {rec.especialista === 1 ? 'Anular Verificación' : 'Verificar como Especialista'}
                                </button>
                            )}
                        </div>
                    </div>
                </div>
                <div style={{
                    display: 'flex',
                    gap: '16px',
                    marginTop: '24px',
                }}>
                    <button onClick={() => onDelete(rec)} style={{ ...styles.btnDanger, margin: 0, flex: 1, height: '48px' }}>
                        ELIMINAR
                    </button>
                    <button onClick={onEdit} style={{ ...styles.btnSecondary, margin: 0, flex: 1, height: '48px' }}>
                        EDITAR
                    </button>
                </div>
            </div>
        </div>
    );
  };

  return (
    <div style={styles.card}>
        <div style={{ ...styles.flexBetween, marginBottom: '16px' }}>
            <h2 style={styles.heading}>Mis Registros</h2>
            <span style={{fontSize:'12px', color:'#64748B', fontWeight:'600'}}>
                {filteredRecords?.length || 0} ITEMS 
            </span>
        </div>

        <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
            gap: "12px",
            marginBottom: "16px",
            padding: "16px",
            backgroundColor: "#F8FAFC",
            borderRadius: "12px",
            border: "1px solid #E2E8F0"
        }}>
            <FilterSelect
                label="Proyecto"
                value={gallery.selectedProjectId ? String(gallery.selectedProjectId) : ""}
                options={projectOptions}
                onChange={(value) => gallery.setSelectedProjectId(value ? Number(value) : null)}
                placeholder="Todos los proyectos"
            />
            <FilterSelect
                label="Sección"
                value={gallery.selectedItem || ""}
                options={itemOptions}
                onChange={(value) => gallery.setSelectedItem(value || null)}
                placeholder="Todas las secciones"
                disabled={!gallery.selectedProjectId}
            />
            <FilterSelect
                label="Especialidad"
                value={gallery.selectedStructure || ""}
                options={structureOptions}
                onChange={(value) => gallery.setSelectedStructure(value || null)}
                placeholder="Todas las estructuras"
                disabled={!gallery.selectedItem}
            />

            <FilterSelect
                label="Frente"
                value={gallery.selectedFrontId ? String(gallery.selectedFrontId) : ""}
                options={frontOptions}
                onChange={(value) => gallery.setSelectedFrontId(value ? Number(value) : null)}
                placeholder="Todos los frentes"
                disabled={!gallery.selectedProjectId || !gallery.selectedItem}
            />

            <FilterSelect
                label="Localidad"
                value={gallery.selectedLocalityId ? String(gallery.selectedLocalityId) : ""}
                options={localityOptions}
                onChange={(value) => gallery.setSelectedLocalityId(value ? Number(value) : null)}
                placeholder="Todas las localidades"
                disabled={!gallery.selectedFrontId}
            />

            <FilterSelect
                label="Grupo"
                value={gallery.selectedGroup || ""}
                options={groupOptions}
                onChange={(value) => gallery.setSelectedGroup(value || null)}
                placeholder="Todos los grupos"
                disabled={!gallery.selectedStructure}
            />

            <FilterSelect
                label="Actividad"
                value={gallery.selectedActivityId ? String(gallery.selectedActivityId) : ""}
                options={activityOptions}
                onChange={(value) => gallery.setSelectedActivityId(value ? Number(value) : null)}
                placeholder="Todas las actividades"
                disabled={!gallery.selectedGroup}
            />

            <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                <button 
                    type="button" 
                    onClick={gallery.clearFilters} 
                    style={{ ...styles.btnSecondary, margin: 0, width: '100%', height: '38px', fontSize: '12px' }}
                >
                    Limpiar filtros
                </button>
            </div>
        </div>

        {selectedRecordId && renderDetail()}

        <div style={styles.scrollableY}>
            {isLoading ? (
                <div style={{padding:'40px', textAlign:'center', color:'#64748B'}}>Cargando galería...</div>
            ) : records?.length === 0 ? (
                <div style={{padding:'40px', textAlign:'center', color:'#64748B', fontStyle:'italic'}}>
                    No se han encontrado registros.
                </div>
            ) : (
                <div style={styles.grid}>
                    {filteredRecords.map(rec => {
                        const primaryLabel = getPrimaryRecordLabel(rec);
                        const imageCount = rec.total_imagenes || 0;

                        return (
                        <div
                            key={rec.id_registro}
                            onClick={() => onSelectRecord(rec.id_registro)}
                            style={{ ...styles.gridItem, ...styles.galleryCard, position: 'relative' }}
                        >
                            <div style={styles.galleryThumbWrap}>
                                {imageCount > 1 && (
                                    <div style={{
                                        position: 'absolute',
                                        top: '10px',
                                        right: '10px',
                                        minWidth: '24px',
                                        height: '24px',
                                        borderRadius: '999px',
                                        backgroundColor: 'rgba(15, 23, 42, 0.82)',
                                        color: '#FFFFFF',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        padding: '0 7px',
                                        fontSize: '11px',
                                        fontWeight: '700',
                                        zIndex: 1
                                    }}>
                                        {imageCount}
                                    </div>
                                )}
                                {rec.url_foto ? (
                                    <img src={rec.url_foto} style={styles.galleryThumbImage} loading="lazy" alt="thumb" />
                                ) : (
                                    <span style={{fontSize:'24px', opacity:0.3}}>IMG</span>
                                )}
                            </div>
                            <div style={{ ...styles.galleryTextWrap, flexDirection: 'column', gap: '4px', alignItems: 'flex-start', justifyContent: 'center' }}>
                                <span style={{ ...styles.galleryText, textAlign: 'left', WebkitLineClamp: 2 }}>
                                    {primaryLabel}
                                </span>
                                {rec.nombre_actividad && (
                                    <span style={{
                                        fontSize: '10px',
                                        color: '#64748B',
                                        lineHeight: '1.35',
                                        textAlign: 'left',
                                        display: '-webkit-box',
                                        WebkitLineClamp: 2,
                                        WebkitBoxOrient: 'vertical',
                                        overflow: 'hidden',
                                        width: '100%'
                                    }}>
                                        {rec.nombre_actividad}
                                    </span>
                                )}
                            </div>
                        </div>
                        );
                    })}
                </div>
            )}
        </div>
    </div>
  );
};
