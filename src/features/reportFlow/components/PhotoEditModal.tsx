import React, { useRef } from 'react';
import { styles } from '../../../theme/styles';
import { isCuadroTexto, isEncuesta, getOpcionesSeleccion } from "../../../utils/activity";

interface Props {
  open: boolean;
  previewUrl: string;
  comment: string;
  latitud : number | null;
  longitud : number | null;
  Actividad: string;
  Grupo: string;
  especificacion: string;
  onLatitudChange: (val: number | null) => void;
  onLongitudChange: (val: number | null) => void;
  onEspecificacionChange: (val: string) =>void;
  onCommentChange: (val: string) => void;
  onFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onClose: () => void;
  onSave: () => void;
  isMultiFile?: boolean;
  additionalPreviewUrls?: string[];
  existingSecondaryUrls?: string[];
  onAdditionalFilesSelect?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRemoveAdditionalFile?: (index: number) => void;
}

export const PhotoEditModal = ({
  open,
  previewUrl,
  comment,
  latitud,
  longitud,
  Actividad,
  Grupo,
  especificacion,
  onLatitudChange,
  onLongitudChange,
  onEspecificacionChange,
  onCommentChange,
  onFileSelect,
  onClose,
  onSave,
  isMultiFile = false,
  additionalPreviewUrls = [],
  existingSecondaryUrls = [],
  onAdditionalFilesSelect,
  onRemoveAdditionalFile,
}: Props) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const additionalFileInputRef = useRef<HTMLInputElement>(null);

  const isPatActivity = isCuadroTexto({ Nombre_Actividad: Actividad, Grupo });
  const isEncuestaActivity = isEncuesta({ Nombre_Actividad: Actividad, Grupo });
  const isSeleccion = getOpcionesSeleccion({ Nombre_Actividad: Actividad, Grupo });

  if (!open) return null;

  return (

    <div style={styles.modalOverlay}>
      <div 
        style={{ 
          ...styles.modalCard, 
          maxHeight: '90vh', 
          overflowY: 'auto'
        }}
      >
      <div style={styles.modalCard}>
        <h3 style={styles.heading}>Editar Registro</h3>

        {previewUrl && (
          <img
            src={previewUrl}
            style={{
              width: '100%',
              borderRadius: '4px',
              marginBottom: '12px',
              border: '1px solid #CBD5E1',
            }}
            alt="Preview"
          />
        )}

        <button
          onClick={() => fileInputRef.current?.click()}
          style={{ ...styles.btnSecondary, width: '100%', marginBottom: '16px' }}
        >
          Cambiar Archivo / Foto
        </button>

        <input
          ref={fileInputRef}
          type="file"
          onChange={onFileSelect}
          style={{ display: 'none' }}
          accept="*/*"
        />

        {isMultiFile && (
          <div style={{
            marginBottom: '16px',
            padding: '12px',
            backgroundColor: '#F8FAFC',
            borderRadius: '8px',
            border: '1px solid #E2E8F0',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <label style={{ ...styles.label, margin: 0, fontWeight: '700', fontSize: '12px' }}>
                Archivos Adicionales
              </label>
              <span style={{ fontSize: '11px', color: '#64748B', fontWeight: '600' }}>
                {existingSecondaryUrls.length + additionalPreviewUrls.length + 1} de 4 archivos
              </span>
            </div>

            {existingSecondaryUrls.length > 0 && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', marginBottom: '10px' }}>
                {existingSecondaryUrls.map((url, idx) => (
                  <div key={`existing-${idx}`} style={{ position: 'relative' }}>
                    <img
                      src={url}
                      alt={`Secundaria ${idx + 1}`}
                      style={{
                        width: '100%',
                        height: '80px',
                        objectFit: 'cover',
                        borderRadius: '4px',
                        border: '1px solid #CBD5E1',
                      }}
                    />
                    <span style={{
                      position: 'absolute',
                      bottom: '4px',
                      left: '4px',
                      backgroundColor: 'rgba(15, 23, 42, 0.75)',
                      color: '#FFFFFF',
                      fontSize: '9px',
                      fontWeight: '700',
                      padding: '2px 6px',
                      borderRadius: '4px',
                    }}>
                      Existente
                    </span>
                  </div>
                ))}
              </div>
            )}

            {additionalPreviewUrls.length > 0 && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', marginBottom: '10px' }}>
                {additionalPreviewUrls.map((url, idx) => (
                  <div key={`new-${idx}`} style={{ position: 'relative' }}>
                    <img
                      src={url}
                      alt={`Nuevo ${idx + 1}`}
                      style={{
                        width: '100%',
                        height: '80px',
                        objectFit: 'cover',
                        borderRadius: '4px',
                        border: '2px solid #3B82F6',
                      }}
                    />
                    <button
                      onClick={() => onRemoveAdditionalFile?.(idx)}
                      style={{
                        position: 'absolute',
                        top: '-6px',
                        right: '-6px',
                        width: '22px',
                        height: '22px',
                        borderRadius: '50%',
                        backgroundColor: '#EF4444',
                        color: '#FFFFFF',
                        border: 'none',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '12px',
                        fontWeight: '700',
                        lineHeight: 1,
                        padding: 0,
                      }}
                    >
                      ×
                    </button>
                    <span style={{
                      position: 'absolute',
                      bottom: '4px',
                      left: '4px',
                      backgroundColor: 'rgba(59, 130, 246, 0.85)',
                      color: '#FFFFFF',
                      fontSize: '9px',
                      fontWeight: '700',
                      padding: '2px 6px',
                      borderRadius: '4px',
                    }}>
                      Nuevo
                    </span>
                  </div>
                ))}
              </div>
            )}

            {(existingSecondaryUrls.length + additionalPreviewUrls.length) < 3 && (
              <button
                onClick={() => additionalFileInputRef.current?.click()}
                style={{
                  ...styles.btnSecondary,
                  width: '100%',
                  margin: 0,
                  fontSize: '12px',
                  height: '36px',
                }}
              >
                + Agregar Archivo
              </button>
            )}

            <input
              ref={additionalFileInputRef}
              type="file"
              multiple
              onChange={onAdditionalFilesSelect}
              style={{ display: 'none' }}
              accept="*/*"
            />
          </div>
        )}

        <label style={styles.label}>Comentario</label>
        <input
          value={comment}
          onChange={(e) => onCommentChange(e.target.value)}
          style={styles.input}
        />

        <label style={styles.label}>Latitud</label>
        <input
          type="number"
          step="any"
          value={latitud ?? ""}
          onChange={(e) => {
            const valor = e.target.value;
            onLatitudChange?.(valor === "" ? null : parseFloat(valor));
          }}
          style={styles.input}
        />

        <label style={styles.label}>Longitud</label>
        <input
          type="number"
          step="any"
          value={longitud ?? ""}
          onChange={(e) => {
            const valor = e.target.value;
            onLongitudChange?.(valor === "" ? null : parseFloat(valor));
          }}
          style={styles.input}
        />

          {isPatActivity && (
            <div style={{ marginTop: "14px" }}>
              <label style={styles.label}>Resistividad</label>           
              <input
                type="number"
                inputMode="decimal"
                step="any"
                min="0"
                value={especificacion}
                onChange={(event) => onEspecificacionChange(event.target.value)}
                placeholder="Ingrese la resistividad"
                style={styles.input}
              />
            </div>
          )}

          {isEncuestaActivity && (
            <div style={{ marginTop: "14px" }}>
              <label style={styles.label}>Documento de Identidad (DNI) / Encuestado</label>           
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={8}
                value={especificacion}
                onChange={(event) => {
                  const valor = event.target.value.replace(/\D/g, '').slice(0, 8);
                  onEspecificacionChange(valor);
                }}
                placeholder="Ej: 02345676 (8 dígitos)"
                style={styles.input}
              />
            </div>
          )}

          {isSeleccion && Array.isArray(isSeleccion) && (
            <div style={{ marginTop: "14px" }}>
              <select
                value={especificacion}
                onChange={(e) => onEspecificacionChange(e.target.value)}
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

        <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
          <button onClick={onClose} style={{ ...styles.btnSecondary, width: '50%' }}>
            Cancelar
          </button>
          <button onClick={onSave} style={{ ...styles.btnPrimary, width: '50%', marginTop: 0 }}>
            Guardar
          </button>
        </div>
      </div>
      </div>
    </div>
  );
};