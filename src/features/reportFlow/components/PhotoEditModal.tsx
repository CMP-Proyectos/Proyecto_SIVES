import React, { useRef } from 'react';
import { styles } from '../../../theme/styles';

interface Props {
  open: boolean;
  previewUrl: string;
  comment: string;
  onCommentChange: (val: string) => void;
  onFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onClose: () => void;
  onSave: () => void;
}

export const PhotoEditModal = ({
  open,
  previewUrl,
  comment,
  onCommentChange,
  onFileSelect,
  onClose,
  onSave,
}: Props) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!open) return null;

  return (
    <div style={styles.modalOverlay}>
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
          Cambiar Foto
        </button>

        <input
          ref={fileInputRef}
          type="file"
          onChange={onFileSelect}
          style={{ display: 'none' }}
          accept="image/*"
        />

        <label style={styles.label}>Comentario</label>
        <input
          value={comment}
          onChange={(e) => onCommentChange(e.target.value)}
          style={styles.input}
        />

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
  );
};