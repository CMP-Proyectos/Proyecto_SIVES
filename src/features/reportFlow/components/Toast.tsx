import React from 'react';
import { ToastState } from '../types';

export const Toast = ({ toast }: { toast: ToastState | null }) => {
  if (!toast) return null;
  
  const bg = toast.type === 'error' ? '#FEF2F2' : (toast.type === 'info' ? '#EFF6FF' : '#F0FDF4');
  const border = toast.type === 'error' ? '#EF4444' : (toast.type === 'info' ? '#3B82F6' : '#10B981');
  const color = toast.type === 'error' ? '#991B1B' : (toast.type === 'info' ? '#1E40AF' : '#166534');

  return (
    <div style={{
        position: 'fixed', bottom: '20px', left: '50%', transform: 'translateX(-50%)',
        backgroundColor: bg, border: `1px solid ${border}`, color: color,
        padding: '12px 24px', borderRadius: '4px', zIndex: 9999,
        fontWeight: '600', fontSize: '14px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
    }}>
        {toast.msg}
    </div>
  );
};
