import React from 'react';
import { styles } from '../../../theme/styles';
import type { UserRecord } from '../../../types/records.types';

interface Props {
  records: UserRecord[];
  isLoading: boolean;
  selectedRecordId: number | null;
  onSelectRecord: (id: number | null) => void;
  onDelete: (rec: UserRecord) => void;
  onEdit: () => void;
}

export const UserGalleryScreen = ({
    records, isLoading, selectedRecordId, onSelectRecord, onDelete, onEdit
}: Props) => {
  const buildCombinedLabel = (...values: (string | null | undefined)[]) => {
    const filteredValues = values.map((value) => value?.trim()).filter(Boolean);
    return filteredValues.length > 0 ? filteredValues.join(" - ") : "Sin información";
  };

  const getPrimaryRecordLabel = (record: UserRecord) => buildCombinedLabel(record.nombre_grupo, record.nombre_detalle);
  const getActivityDetailLabel = (record: UserRecord) => buildCombinedLabel(record.nombre_actividad, record.nombre_detalle);

  React.useEffect(() => {
    console.info("[records] UserGalleryScreen render", {
      isLoading,
      renderedCount: records.length,
      selectedRecordId,
    });
  }, [isLoading, records.length, selectedRecordId]);

  const renderDetail = () => {
    const rec = records.find(r => r.id_registro === selectedRecordId);
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

                <div style={{...styles.card, padding: '20px', boxShadow: 'none', border: '1px solid #E2E8F0'}}>
                    <h4 style={{...styles.heading, fontSize: '14px', borderBottom: '1px solid #F1F5F9'}}>
                        DATOS DEL REPORTE
                    </h4>

                    <div style={{display:'grid', gap:'16px'}}>
                        <div>
                            <label style={styles.label}>PROYECTO</label>
                            <div style={styles.text}>{proyectoStr}</div>
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
                            <label style={styles.label}>ÍTEM</label>
                            <div style={styles.text}>{rec.nombre_item || "---"}</div>
                        </div>

                        <div>
                            <label style={styles.label}>GRUPO</label>
                            <div style={styles.text}>{rec.nombre_grupo || "---"}</div>
                        </div>

                        <div>
                            <label style={styles.label}>ACTIVIDAD / DETALLE</label>
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
                    </div>
                </div>

                <div style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: '16px',
                    ...styles.scrollSafeBottom,
                    marginTop: '20px'
                }}>
                    <button
                        onClick={() => onDelete(rec)}
                        style={{
                            ...styles.btnDanger,
                            margin: 0,
                            height: '48px',
                            width: '100%'
                        }}
                    >
                        ELIMINAR
                    </button>
                    <button
                        onClick={onEdit}
                        style={{
                            ...styles.btnSecondary,
                            margin: 0,
                            height: '48px',
                            width: '100%'
                        }}
                    >
                        EDITAR
                    </button>
                </div>
            </div>
        </div>
    );
  };

  return (
    <div style={styles.card}>
        <div style={styles.flexBetween}>
            <h2 style={styles.heading}>Mis Registros</h2>
            <span style={{fontSize:'12px', color:'#64748B', fontWeight:'600'}}>{records?.length || 0} ITEMS</span>
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
                    {records.map(rec => {
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
