import React from 'react';
import { styles } from '../../../theme/styles';

export interface SelectableItem {
    id: number;
    label: string;
    code?: string;
}

interface Props {
    title: string;
    items: SelectableItem[];
    onSelect: (id: number) => void;
    isLoading?: boolean;
    emptyState?: React.ReactNode;
}

export const SelectionScreen = ({ title, items, onSelect, isLoading, emptyState }: Props) => {
    return (
        <div style={styles.section}>
            <div style={styles.sectionHeader}>
                <h2 style={styles.heading}>{title}</h2>
                <span style={{ fontSize: '12px', color: '#667085', fontWeight: 500 }}>{items?.length || 0} items</span>
            </div>

            {isLoading ? (
                <div style={{ padding: '40px', textAlign: 'center', color: '#667085' }}>
                    Cargando datos...
                </div>
            ) : (
                <div style={styles.scrollableY}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {items && items.length > 0 ? (
                            items.map(item => (
                                <div
                                    key={item.id}
                                    onClick={() => onSelect(item.id)}
                                    style={{
                                        ...styles.listItem,
                                        gap: '14px'
                                    }}
                                >
                                    <div style={{ flex: 1, paddingRight: '12px' }}>
                                        <div style={{ fontSize: '14px', fontWeight: 600, color: '#172033', lineHeight: '1.45' }}>
                                            {item.label}
                                        </div>
                                    </div>

                                    {item.code && (
                                        <div style={{
                                            backgroundColor: '#F6F8FB',
                                            padding: '4px 10px',
                                            borderRadius: '999px',
                                            border: '1px solid rgba(15, 23, 42, 0.08)',
                                            display: 'flex',
                                            alignItems: 'center',
                                            flexShrink: 0
                                        }}>
                                            <span style={{
                                                fontSize: '11px',
                                                fontWeight: 600,
                                                color: '#003366',
                                                fontFamily: 'monospace'
                                            }}>
                                                {item.code}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            ))
                        ) : (
                            <div style={{ padding: '30px', textAlign: 'center', border: '1px dashed rgba(15, 23, 42, 0.12)', borderRadius: '18px', color: '#667085' }}>
                                {emptyState ?? 'No hay registros disponibles.'}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};
