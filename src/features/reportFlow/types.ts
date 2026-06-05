// src/features/reportFlow/types.ts

export type { UserRecord } from "../../types/records.types";

// Estados de navegación
export type Step =
    | "auth"
    | "project"
    | "substation"
    | "front"
    | "locality"
    | "item"
    | "group"
    | "activity"
    | "detail"
    | "confirm"
    | "map"
    | "form"
    | "profile"
    | "user_records"
    | "files";

export interface EvidenceImage {
    id: string;
    file: File;
    previewUrl: string;
}

// Estructura para las propiedades/atributos dinámicos
export interface ActivitiesTypes { 
    Tipo_Actividad: string; 
    ID_Propiedad: number; 
    Propiedad: string; 
}

// Estados para componentes UI
export interface ToastState {
    msg: string;
    type: 'success' | 'error' | 'info';
}

export interface ConfirmModalState {
    open: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    confirmLabel?: string;
}
