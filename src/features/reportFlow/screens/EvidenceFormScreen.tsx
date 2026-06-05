import React, { useRef, useState } from 'react';
import { styles, evidenceStyles as es } from '../../../theme/styles';
import { EvidenceImage } from '../types';
import { RefreshCw, Navigation, MapPin, Camera, Image as ImageIcon, UploadCloud, AlertCircle, Trash2 } from 'lucide-react';

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
  onRemoveImage: (imageId: string) => void;
  note: string; setNote: (v: string) => void;
  ohms: string; setOhms: (v: string) => void;
  isPatActivity: boolean;
  isLoading: boolean;
  onSave: () => void;
  previousRecord?: any;
}

type AiFeedbackType = Props['aiFeedback'] extends { type: infer Type } | null ? Type : never;

export const EvidenceFormScreen = ({
  isOnline, mapUrl, displayLat, displayLng,
  isFetchingGps, onCaptureGps,
  utmZone, setUtmZone, utmEast, setUtmEast, utmNorth, setUtmNorth, onUpdateUtm,
  evidenceImages, evidencePreview, isAnalyzing, aiFeedback, onCaptureFile, onRemoveImage,
  note, setNote, ohms, setOhms, isPatActivity,
  isLoading, onSave,
  previousRecord
}: Props) => {
  const cameraInputRef = useRef<HTMLInputElement | null>(null);
  const galleryInputRef = useRef<HTMLInputElement | null>(null);
  const [geoMode, setGeoMode] = useState<'gps' | 'utm'>('gps');
  const formCardStyle = {
    ...styles.card,
    maxHeight: 'none' as const,
    overflow: 'visible' as const,
    flex: '0 0 auto',
    boxShadow: 'none'
  };

  const ensureFieldVisibility = (event: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const target = event.currentTarget;
    window.setTimeout(() => {
      target.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 150);
  };

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

        <div style={formCardStyle}>
        <div style={{ ...styles.flexBetween, ...styles.mb16 }}>
          <h3 style={es.headerClean}>1. Ubicacion Geodesica</h3>
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

        <div style={formCardStyle}>
          <h3 style={styles.subheading}>2. Evidencia de Campo</h3>

          <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" onChange={onCaptureFile} style={{ display: 'none' }} />
          <input ref={galleryInputRef} type="file" accept="image/*" multiple onChange={onCaptureFile} style={{ display: 'none' }} />

          {!evidencePreview ? (
            <div style={es.uploadRow}>
              <button onClick={() => cameraInputRef.current?.click()} style={getCameraBtnStyle()}>
                <Camera size={32} style={{ marginBottom: '8px' }} />
                <span style={{ fontSize: '12px', fontWeight: '700' }}>CAMARA</span>
              </button>

              <button onClick={() => galleryInputRef.current?.click()} style={es.uploadBtnLarge}>
                <ImageIcon size={32} style={{ marginBottom: '8px' }} />
                <span style={{ fontSize: '12px', fontWeight: '700' }}>GALERIA</span>
              </button>
            </div>
          ) : (
            <div style={{ marginBottom: '16px' }}>
              <div style={es.previewContainer}>
                <img src={evidencePreview} style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} alt="Evidencia" />
              </div>
              <div style={es.helperText}>
                Idealmente usa 3 imagenes utiles y complementarias. Evita fotos redundantes. Maximo 5 por registro.
              </div>
              <div style={es.imageCounter}>{evidenceImages.length} / 5 imagenes</div>
              <div style={es.thumbnailGrid}>
                {evidenceImages.map((image, index) => (
                  <div key={image.id} style={es.thumbnailCard}>
                    <img src={image.previewUrl} style={es.thumbnailImage} alt={`Evidencia ${index + 1}`} />
                    <div style={es.thumbnailMeta}>
                      <span>{index === 0 ? 'Principal' : `Imagen ${index + 1}`}</span>
                      <button type="button" onClick={() => onRemoveImage(image.id)} style={es.thumbnailDeleteBtn}>
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              <div style={es.actionsRow}>
                <button onClick={() => cameraInputRef.current?.click()} style={es.btnSmall} disabled={evidenceImages.length >= 5}>
                  <Camera size={14} /> AGREGAR CAMARA
                </button>
                <button onClick={() => galleryInputRef.current?.click()} style={es.btnSmall} disabled={evidenceImages.length >= 5}>
                  <UploadCloud size={14} /> AGREGAR GALERIA
                </button>
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
            placeholder={`ejemplo:
- poste CAC 8/300 con fisura longitudinal
- vano 36 m. con flecha excedida
- suelo arenoso inestable, requiere encofrado para cimentacion`}
          />

          {isPatActivity && (
            <div style={{ marginTop: "14px" }}>
              <label style={styles.label}>Ohms (Ω)</label>
              <input
                type="number"
                inputMode="decimal"
                step="any"
                min="0"
                value={ohms}
                onChange={(event) => setOhms(event.target.value)}
                onFocus={ensureFieldVisibility}
                placeholder="Ingrese medición en ohms"
                style={styles.input}
              />
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
