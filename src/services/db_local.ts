import DexieBase, { type Table } from 'dexie';
// Asegúrate de importar las interfaces correctas desde tu dataService
import { ProjectRecord, FrontRecord, LocalityRecord, DetailRecord, ActivityRecord } from './dataService';

// Interfaz para el caché de historial (la usaremos luego para "Evidencia Previa")
export interface CachedRecord {
  id_registro: number;
  id_detalle: number;
  fecha_subida: string;
  url_archivo: string;
  comentario: string;
  cantidad: number;
}

// Interfaz para registros pendientes de subida (offline)
export interface PendingRecord {
  id?: number;
  timestamp: number;
  evidenceBlob?: Blob;
  fileType?: string;
  evidenceBlobs?: Blob[];
  fileTypes?: string[];
  meta: {
    bucketName: string;
    fullPath?: string;
    fileName?: string;
    fullPaths?: string[];
    fileNames?: string[];
    userId: string;
    detailId: number;
    lat: number;
    lng: number;
    comment: string;
    ohms?: number | null;
  };
}

// Interfaz para caché de propiedades de actividades
export interface CachedActivityProperty {
  id?: number; // Auto-increment primary key
  ID_Actividad: number;
  ID_Propiedad: number;
  Tipo_Actividad: string;
  Propiedad: string;
}

class MyDatabase extends DexieBase {
  // 1. Definimos las propiedades de la clase para que TypeScript las reconozca
  pendingUploads!: Table<PendingRecord>; 
  catalog_projects!: Table<ProjectRecord>;
  catalog_fronts!: Table<FrontRecord>;
  catalog_localities!: Table<LocalityRecord>;
  catalog_details!: Table<DetailRecord>;
  catalog_activities!: Table<ActivityRecord>; // <--- Esta faltaba y es clave
  history_cache!: Table<CachedRecord>;
  activity_properties_cache!: Table<CachedActivityProperty>;

  constructor() {
    super('ReportFlowDB');
    
    // 2. Definimos el esquema (Nombres de tablas y sus índices)
    // NOTA: Si cambias esto, a veces es necesario borrar la BD en el navegador para que se regenere
    this.version(4).stores({
      pendingUploads: '++id, timestamp, meta.userId',
      
      // Catálogos (Nombres deben coincidir con las propiedades de arriba)
      catalog_projects: 'ID_Proyectos, Proyecto_Nombre',
      catalog_fronts: 'ID_Frente, ID_Proyecto',
      catalog_localities: 'ID_Localidad, ID_Frente',
      catalog_details: 'ID_DetallesActividad, ID_Localidad',
      catalog_activities: 'ID_Actividad',
      
      // Caché
      history_cache: 'id_registro, id_detalle, fecha_subida',
      activity_properties_cache: '++id, ID_Actividad, ID_Propiedad'
    });
  }
}

export const db = new MyDatabase();
