import React, { useRef, useState, useEffect } from 'react';
import { styles, evidenceStyles as es } from '../../../theme/styles';
import { EvidenceImage } from '../types';
import { FileText, FileUp, RefreshCw, Navigation, MapPin, Camera, Image as ImageIcon, UploadCloud, AlertCircle, Trash2 } from 'lucide-react';
import {
  PrediosRecord,
  RegistroUsuariosData,
} from "../../../services/dataService";

interface Props {
  isOnline: boolean;
  mapUrl: string | null;
  displayLat: number;
  displayLng: number;
  isFetchingGps: boolean;
  onCaptureGps: () => void;
  utmZone: string; setUtmZone: (v: string) => void;
  utmEast: string; setUtmEast: (v: string) => void;
  utmNorth: string; setUtmNorth: (v: string) => void;
  onUpdateUtm: () => void;
  evidenceImages: EvidenceImage[];
  evidencePreview: string | null;
  isAnalyzing: boolean;
  aiFeedback: { type: 'warning' | 'info' | 'success', message: string } | null;
  onCaptureFile: (e: React.ChangeEvent<HTMLInputElement>) => void;
  prediosList?: PrediosRecord[];
  predio: PrediosRecord | null; setPredio: (v: PrediosRecord | null) => void;
  onRemoveImage: (imageId: string) => void;
  note: string; setNote: (v: string) => void;
  ohms: string; setOhms: (v: string) => void;
  isPatActivity: boolean;
  isSeleccion: { value: string; label: string }[] | null;
  requiereArchivo: boolean;
  isCoordenadas: boolean;
  isLoading: boolean;
  isRegistro: boolean;
  registroData?: RegistroUsuariosData;
  setRegistroData?: (data: RegistroUsuariosData) => void;
  onSave: () => void;
  previousRecord?: any;
}

type AiFeedbackType = Props['aiFeedback'] extends { type: infer Type } | null ? Type : never;

export const EvidenceFormScreen = ({
  isOnline, mapUrl, displayLat, displayLng,
  isFetchingGps, onCaptureGps,
  utmZone, setUtmZone, utmEast, setUtmEast, utmNorth, setUtmNorth, onUpdateUtm,
  evidenceImages, evidencePreview, isAnalyzing, aiFeedback, onCaptureFile, onRemoveImage,
  predio, setPredio, prediosList = [], registroData, setRegistroData, note, setNote, ohms, setOhms, isPatActivity, isSeleccion, requiereArchivo,isCoordenadas, isRegistro,
  isLoading, onSave,
  previousRecord
}: Props) => {
  const cameraInputRef = useRef<HTMLInputElement | null>(null);
  const galleryInputRef = useRef<HTMLInputElement | null>(null);
  const [geoMode, setGeoMode] = useState<'gps' | 'utm'>('gps');
  
  const [localRegistro, setLocalRegistro] = useState<RegistroUsuariosData>({
    tipoUsuario: '',
    dni: '',
    nombre: '',
    tipoPredio: ''
  });
  const activeRegistro = registroData || localRegistro;
  const updateRegistro = (key: keyof RegistroUsuariosData, value: string) => {
    const updated = { ...activeRegistro, [key]: value };
    if (setRegistroData) setRegistroData(updated);
    else setLocalRegistro(updated);
  };


  useEffect(() => {
    if (predio && activeRegistro.tipoUsuario === 'dni') {
      // Actualizamos ambos valores de un solo golpe para evitar que 
      // React sobrescriba el estado en la misma renderización
      const updatedState = {
        ...activeRegistro,
        nombre: predio.Nombre_Padron || '',
        dni: predio.DNI_Padron || ''
      };
        
      if (setRegistroData) {
        setRegistroData(updatedState);
      } else {
        setLocalRegistro(updatedState);
      }
    }
  }, [predio]);
  
  const formCardStyle = {
    ...styles.card,
    maxHeight: 'none' as const,
    overflow: 'visible' as const,
    flex: '0 0 auto',
    boxShadow: 'none'
  };

  const ensureFieldVisibility = (event: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const target = event.currentTarget;
    window.setTimeout(() => {
      target.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 150);
  };

  const fileInputRef = useRef<HTMLInputElement>(null);

  const getToggleStyle = (mode: 'gps' | 'utm') => ({
    ...es.toggleBtn,
    ...(geoMode === mode ? es.toggleBtnActive : {})
  });

  const getBadgeStyle = () => ({
    ...es.badgeBase,
    ...(isOnline ? es.badgeOnline : es.badgeOffline)
  });

  const getCameraBtnStyle = () => ({
    ...es.uploadBtnLarge,
    ...es.uploadBtnLargeActive
  });

  const getAiStatusLabel = (type?: AiFeedbackType) => {
    if (type === 'warning') return 'REVIEW_REQUIRED';
    if (type === 'info') return 'MANUAL_REVIEW';
    return 'APPROVED';
  };

  const getAiStatusColor = (type?: AiFeedbackType) => {
    if (type === 'warning') return '#EF4444';
    if (type === 'info') return '#F59E0B';
    return '#10B981';
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', ...styles.scrollSafeBottom }}>
        {previousRecord && (
        <div style={{
          ...formCardStyle,
          backgroundColor: '#FFFFFF',
          borderLeft: '5px solid #F59E0B',
          padding: '16px',
          marginBottom: '16px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
            <AlertCircle size={18} color="#92400E" />
            <span style={{ fontSize: '11px', fontWeight: '800', color: '#92400E', textTransform: 'uppercase' }}>
              Registro previo encontrado en este sector
            </span>
          </div>

          <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
            <img
              src={previousRecord.URL_Archivo}
              style={{
                width: '85px',
                height: '85px',
                borderRadius: '6px',
                objectFit: 'cover',
                border: '1px solid #E2E8F0',
                backgroundColor: '#F1F5F9'
              }}
              alt="Evidencia anterior"
            />

            <div style={{ flex: 1 }}>
              <label style={{ ...styles.label, fontSize: '10px', color: '#64748B', marginBottom: '4px' }}>
                COMENTARIO ANTERIOR
              </label>
              <p style={{ fontSize: '13px', color: '#1E293B', fontWeight: '600', margin: 0, fontStyle: 'italic' }}>
                {previousRecord.comentario || 'Sin comentario registrado'}
              </p>
              <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px solid #F1F5F9' }}>
                <p style={{ fontSize: '10px', color: '#94A3B8', margin: 0 }}>
                  Registrado el: {new Date(previousRecord.fecha_subida).toLocaleDateString()}
                </p>
              </div>
            </div>
          </div>
        </div>
        )}

        {isCoordenadas &&(
          <div style={formCardStyle}>
            <div style={{ ...styles.flexBetween, ...styles.mb16 }}>
              <h3 style={es.headerClean}>Ubicacion Geodesica</h3>
              <span style={getBadgeStyle()}>
                {isOnline ? 'ONLINE' : 'OFFLINE'}
              </span>
          </div>

          <div style={es.toggleContainer}>
            <button onClick={() => setGeoMode('gps')} style={getToggleStyle('gps')}>GPS AUTO</button>
            <button onClick={() => setGeoMode('utm')} style={getToggleStyle('utm')}>UTM MANUAL</button>
          </div>

          <div style={es.mapContainer}>
            {isOnline && mapUrl ? (
              <iframe title="Mapa" src={mapUrl} style={es.mapIframe} loading="lazy" />
            ) : (
              <div style={es.mapPlaceholder}>
                <MapPin size={24} />
                <span style={{ fontSize: '11px', fontWeight: '600', marginTop: '4px' }}>SIN REFERENCIA VISUAL</span>
              </div>
            )}
          </div>

          {geoMode === 'gps' && (
            <>
              <div style={es.grid2}>
                <div>
                  <label style={styles.label}>Latitud</label>
                  <div style={es.inputReadOnly}>{displayLat.toFixed(6)}</div>
                </div>
                <div>
                  <label style={styles.label}>Longitud</label>
                  <div style={es.inputReadOnly}>{displayLng.toFixed(6)}</div>
                </div>
              </div>
              <button onClick={onCaptureGps} disabled={isFetchingGps} style={styles.btnSecondary}>
                {isFetchingGps ? <RefreshCw className="spin" size={16} /> : <Navigation size={16} />}
                <span style={{ marginLeft: '8px' }}>{isFetchingGps ? "TRIANGULANDO..." : "ACTUALIZAR POSICION"}</span>
              </button>
            </>
          )}

          {geoMode === 'utm' && (
            <div style={es.utmRow}>
              <div style={{ width: 'auto', minWidth: '100px', marginRight: '10px' }}>
                <label style={styles.label}>ZONA</label>
                <select value={utmZone} onChange={(e) => setUtmZone(e.target.value)} style={styles.selects}>
                  <option value="17">Zona 17S</option><option value="18">Zona 18S</option><option value="19">Zona 19S</option>
                </select>
              </div>
              <div style={{ flex: 1 }}>
                <label style={styles.label}>ESTE (X)</label>
                <input type="number" value={utmEast} onChange={e => setUtmEast(e.target.value)} onFocus={ensureFieldVisibility} placeholder="Ej: 280500" style={es.inputNoMargin} />
              </div>
              <div style={{ flex: 1 }}>
                <label style={styles.label}>NORTE (Y)</label>
                <input type="number" value={utmNorth} onChange={e => setUtmNorth(e.target.value)} onFocus={ensureFieldVisibility} placeholder="Ej: 8665000" style={es.inputNoMargin} />
              </div>
              <button onClick={onUpdateUtm} style={es.btnSquare}>
                <RefreshCw size={18} />
              </button>
            </div>
          )}
          </div>
        )}

        {isRegistro && (
          <div style={{ ...formCardStyle, backgroundColor: '#F8FAFC', border: '1px solid #CBD5E1' }}>
            <h3 style={{ ...styles.subheading, color: '#1E293B', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <FileText size={18} /> Detalles de Padrón / Usuario
            </h3>

            {/* a. Usuario */}
            <div style={{ marginBottom: '14px' }}>
              <label style={styles.label}>a. Tipo de Usuario</label>
              <select
                value={activeRegistro.tipoUsuario}
                onChange={(e) => {
                  updateRegistro('tipoUsuario', e.target.value);
                  if (e.target.value !== 'dni') setPredio(null);
                }}
                style={styles.selects}
              >
                <option value="" disabled>Seleccione origen...</option>
                <option value="dni">DNI de base de datos</option>
                <option value="carga_especial">Carga especial</option>
                <option value="nuevo">Usuario nuevo</option>
              </select>
            </div>

            {/* Selector de DNI de Base de Datos */}
            {activeRegistro.tipoUsuario === 'dni' && (
              <div style={{ marginBottom: '14px', paddingLeft: '12px', borderLeft: '3px solid #3B82F6' }}>
                <label style={styles.label}>Seleccionar Persona (DNI)</label>
                <select
                  value={predio?.ID_Padron || ''}
                  onChange={(e) => {
                    const selected = prediosList.find(p => p.ID_Padron === Number(e.target.value));
                    setPredio(selected || null);
                  }}
                  style={styles.selects}
                >
                  <option value="">Buscar en padrón de localidad...</option>
                  {prediosList.map(p => (
                    <option key={p.ID_Padron} value={p.ID_Padron}>
                      {p.DNI_Padron} - {p.Nombre_Padron}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div style={{ marginBottom: '14px' }}>
              <label style={styles.label}>Documento de Identidad (DNI)</label>
              <input
                type="text"
                value={activeRegistro.dni}
                onChange={(e) => updateRegistro('dni', e.target.value)}
                onFocus={ensureFieldVisibility}
                placeholder="Ingrese o modifique el DNI"
                style={styles.input}
              />
            </div>

            {/* b. Nombre */}
            <div style={{ marginBottom: '14px' }}>
              <label style={styles.label}>b. Nombre Completo</label>
              <input
                type="text"
                value={activeRegistro.nombre}
                onChange={(e) => updateRegistro('nombre', e.target.value)}
                onFocus={ensureFieldVisibility}
                placeholder="Ingrese el nombre (Editable)"
                style={styles.input}
              />
            </div>

            {/* c. Tipo de predio */}
            <div style={{ marginBottom: '14px' }}>
              <label style={styles.label}>c. Tipo de Predio</label>
              <select
                value={activeRegistro.tipoPredio}
                onChange={(e) => updateRegistro('tipoPredio', e.target.value)}
                style={styles.selects}
              >
                <option value="" disabled>Seleccionar de cargas especiales...</option>
                <option value="VI">Vivienda</option>
                <option value="VD">No Vivienda</option>
              </select>
            </div>
          </div>
        )}

        <div style={formCardStyle}>
          <h3 style={styles.subheading}>Evidencia de Campo</h3>

          <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" onChange={onCaptureFile} style={{ display: 'none' }} />
          <input ref={galleryInputRef} type="file" accept="image/*" multiple onChange={onCaptureFile} style={{ display: 'none' }} />
          <input ref={fileInputRef} type="file" accept=".pdf,.xls,.xlsx,.tif,.tiff,.zip" multiple={isRegistro} onChange={onCaptureFile} style={{ display: "none" }} />

          {isRegistro && !evidencePreview && (
            <div style={{ backgroundColor: '#F0F9FF', padding: '12px', borderRadius: '6px', marginBottom: '16px', border: '1px dashed #BAE6FD' }}>
              <span style={{ fontSize: '11px', fontWeight: '800', color: '#0369A1', display: 'block', marginBottom: '6px' }}>
                ARCHIVOS/FOTOS REQUERIDOS (Subir {evidenceImages.length}/5)
              </span>
              <ul style={{ fontSize: '12px', color: '#0C4A6E', margin: 0, paddingLeft: '20px', lineHeight: '1.5' }}>
                <li>1. Foto del predio</li>
                <li>2. Foto de DNI (Anverso)</li>
                <li>3. Foto de DNI (Reverso)</li>
                <li>4. Encuesta (PDF o Foto)</li>
                <li>5. Constancia (PDF o Foto)</li>
              </ul>
            </div>
          )}

          {!evidencePreview ? (
            isRegistro ? (
              <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
                <button type="button" onClick={() => cameraInputRef.current?.click()} style={{ ...getCameraBtnStyle(), flex: 1, padding: '12px 4px' }}>
                  <Camera size={24} style={{ marginBottom: '4px' }} />
                  <span style={{ fontSize: '10px', fontWeight: '700' }}>CÁMARA</span>
                </button>
                <button type="button" onClick={() => galleryInputRef.current?.click()} style={{ ...es.uploadBtnLarge, flex: 1, padding: '12px 4px' }}>
                  <ImageIcon size={24} style={{ marginBottom: '4px' }} />
                  <span style={{ fontSize: '10px', fontWeight: '700' }}>GALERÍA</span>
                </button>
                <button type="button" onClick={() => fileInputRef.current?.click()} style={{ ...es.uploadBtnLarge, flex: 1, padding: '12px 4px' }}>
                  <FileUp size={24} style={{ marginBottom: '4px' }} />
                  <span style={{ fontSize: '10px', fontWeight: '700' }}>ARCHIVO</span>
                </button>
              </div>
            ) : requiereArchivo ? (
              <div style={es.uploadRow}>
                <button type="button" onClick={() => fileInputRef.current?.click()} style={es.uploadBtnLarge}>
                  <FileUp size={32} style={{ marginBottom: '8px' }} />
                  <span style={{ fontSize: '12px', fontWeight: '700' }}>SUBIR ARCHIVO</span>
                </button>
              </div>
            ) : (
              <div style={es.uploadRow}>
                <button onClick={() => cameraInputRef.current?.click()} style={getCameraBtnStyle()}>
                  <Camera size={32} style={{ marginBottom: '8px' }} />
                  <span style={{ fontSize: '12px', fontWeight: '700' }}>CÁMARA</span>
                </button>

                <button onClick={() => galleryInputRef.current?.click()} style={es.uploadBtnLarge}>
                  <ImageIcon size={32} style={{ marginBottom: '8px' }} />
                  <span style={{ fontSize: '12px', fontWeight: '700' }}>GALERÍA</span>
                </button>
              </div>
            )
          ) : (
            // VISTA PREVIA Y MANEJO DE MÚLTIPLES ARCHIVOS
            <div style={{ marginBottom: '16px' }}>
                <div style={es.previewContainer}>
                  {(() => {
                    const currentImgObj = evidenceImages.find(img => img.previewUrl === evidencePreview);
                    const isImage = currentImgObj?.file.type.startsWith('image/');
                    return isImage ? (
                      <img src={evidencePreview} style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} alt="Evidencia" />
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#64748B' }}>
                        <FileText size={64} style={{ marginBottom: '16px' }} />
                        <span style={{ fontSize: '14px', fontWeight: '600', textAlign: 'center', padding: '0 16px' }}>
                          {currentImgObj?.file.name || 'Documento adjunto'}
                        </span>
                      </div>
                    );
                  })()}
                </div>
                
                <div style={es.helperText}>
                  {isRegistro ? "Sube los 5 archivos requeridos en la lista." : (requiereArchivo ? "Sube los documentos requeridos." : "Sube las imágenes")}
                </div>
                
                <div style={es.imageCounter}>{evidenceImages.length} / 5 {requiereArchivo || isRegistro ? 'archivos' : 'imágenes'}</div>
                
                <div style={es.thumbnailGrid}>
                  {evidenceImages.map((image, index) => {
                    const isThumbImage = image.file.type.startsWith('image/');
                    return (
                      <div key={image.id} style={es.thumbnailCard}>
                        {isThumbImage ? (
                          <img src={image.previewUrl} style={es.thumbnailImage} alt={`Evidencia ${index + 1}`} />
                        ) : (
                          <div style={{ ...es.thumbnailImage, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#F1F5F9', color: '#94A3B8' }}>
                            <FileText size={24} />
                          </div>
                        )}
                        <div style={es.thumbnailMeta}>
                          <span>{index === 0 ? 'Principal' : `Anexo ${index + 1}`}</span>
                          <button type="button" onClick={() => onRemoveImage(image.id)} style={es.thumbnailDeleteBtn}>
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div style={es.actionsRow}>
                  {isRegistro ? (
                    <div style={{ display: 'flex', gap: '8px', width: '100%' }}>
                      <button type="button" onClick={() => cameraInputRef.current?.click()} style={{...es.btnSmall, flex: 1, padding: '8px 2px'}} disabled={evidenceImages.length >= 5}>
                        <Camera size={14} /> CÁMARA
                      </button>
                      <button type="button" onClick={() => galleryInputRef.current?.click()} style={{...es.btnSmall, flex: 1, padding: '8px 2px'}} disabled={evidenceImages.length >= 5}>
                        <ImageIcon size={14} /> GALERÍA
                      </button>
                      <button type="button" onClick={() => fileInputRef.current?.click()} style={{...es.btnSmall, flex: 1, padding: '8px 2px'}} disabled={evidenceImages.length >= 5}>
                        <FileUp size={14} /> ARCHIVO
                      </button>
                    </div>
                  ) : requiereArchivo ? (
                    <button type="button" onClick={() => fileInputRef.current?.click()} style={{...es.btnSmall, width: '100%'}} disabled={evidenceImages.length >= 5}>
                      <FileUp size={14} /> AGREGAR OTRO ARCHIVO
                    </button>
                  ) : (
                    <>
                      <button type="button" onClick={() => cameraInputRef.current?.click()} style={es.btnSmall} disabled={evidenceImages.length >= 5}>
                        <Camera size={14} /> AGREGAR CÁMARA
                      </button>
                      <button type="button" onClick={() => galleryInputRef.current?.click()} style={es.btnSmall} disabled={evidenceImages.length >= 5}>
                        <ImageIcon size={14} /> AGREGAR GALERÍA
                      </button>
                    </>
                  )}
                </div>
              </div>
            )}

          {(isAnalyzing || aiFeedback) && (
            <div style={{ ...es.console, borderLeft: `4px solid ${getAiStatusColor(aiFeedback?.type)}` }}>
              {isAnalyzing && <div>&gt; SYSTEM: VALIDANDO IMAGEN...</div>}
              {aiFeedback && (
                <>
                  <div>&gt; STATUS: {getAiStatusLabel(aiFeedback.type)}</div>
                  <div style={{ color: '#E2E8F0' }}>&gt; MSG: {aiFeedback.message}</div>
                </>
              )}
            </div>
          )}

          <label style={styles.label}>Observaciones Tecnicas</label>
          <textarea
            value={note}
            onChange={e => setNote(e.target.value)}
            onFocus={ensureFieldVisibility}
            style={{
              ...styles.input,
              height: '140px',
              minHeight: '140px',
              maxHeight: '160px',
              overflowY: 'auto',
              fontFamily: 'inherit',
              resize: 'vertical'
            }}
            placeholder={`...`}
          />

          {isPatActivity && (
            <div style={{ marginTop: "14px" }}>
              <label style={styles.label}>Resistividad</label>           
              <input
                type="number"
                inputMode="decimal"
                step="any"
                min="0"
                value={ohms}
                onChange={(event) => setOhms(event.target.value)}
                onFocus={ensureFieldVisibility}
                placeholder="Ingrese la resistividad"
                style={styles.input}
              />
            </div>
          )}

          {isSeleccion && Array.isArray(isSeleccion) && (
            <div style={{ marginTop: "14px" }}>
              <label style={styles.label}>Indique si tiene servidumbre</label>
              <select
                value={ohms}
                onChange={(event) => setOhms(event.target.value)}
                onFocus={ensureFieldVisibility}
                style={styles.input}
              >
                <option value="" disabled>
                  Seleccione una opción
                </option>
                
                {isSeleccion.map((opcion) => (
                  <option key={opcion.value} value={opcion.value}>
                    {opcion.label}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div style={{ marginTop: '8px', paddingBottom: '8px' }}>
            <button
              onClick={onSave}
              disabled={isLoading || evidenceImages.length === 0}
              style={{
                ...styles.btnPrimary,
                marginTop: 0,
                opacity: (isLoading || evidenceImages.length === 0) ? 0.6 : 1,
                cursor: (isLoading || evidenceImages.length === 0) ? 'not-allowed' : 'pointer'
              }}
            >
              {isLoading ? "GUARDANDO..." : "GUARDAR Y FINALIZAR"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
