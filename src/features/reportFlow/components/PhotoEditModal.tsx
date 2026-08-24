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
}: Props) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

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