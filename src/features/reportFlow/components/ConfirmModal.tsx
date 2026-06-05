import React from 'react';
import { styles } from '../../../theme/styles';
import { ConfirmModalState } from '../types';

interface Props {
  modal: ConfirmModalState | null;
  onClose: () => void;
}

export const ConfirmModal = ({ modal, onClose }: Props) => {
  if (!modal?.open) return null;

  const confirmLabel = modal.confirmLabel || "Confirmar";

  return (
    <div style={styles.modalOverlay}>
        <div style={styles.modalCard}>
            <h3 style={{...styles.heading, borderBottom:'none', marginBottom: '8px'}}>{modal.title}</h3>
            <p style={{fontSize: '14px', color: '#475569', marginBottom: '20px'}}>{modal.message}</p>
            <div style={{display: 'flex', gap: '10px'}}>
                <button onClick={onClose} style={{...styles.btnSecondary, width: '100%'}}>Cancelar</button>
                <button onClick={modal.onConfirm} style={styles.btnDanger}>{confirmLabel}</button>
            </div>
        </div>
    </div>
  );
};
