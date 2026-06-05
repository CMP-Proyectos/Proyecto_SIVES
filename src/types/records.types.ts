export interface UserRecord {
  id_registro: number;
  id_verificada?: number | null;
  user_id?: string | null;
  fecha_subida: string;
  url_foto: string | null;
  nombre_actividad: string;
  nombre_localidad: string;
  nombre_detalle: string;
  nombre_grupo?: string | null;
  nombre_item?: string | null;
  nombre_subestacion?: string | null;
  comentario: string | null;
  ruta_archivo: string | null;
  bucket: string | null;
  latitud: number | null;
  longitud: number | null;
  id_proyecto?: number | null;
  id_frente?: number | null;
  id_localidad?: number | null;
  id_detalle?: number | null;
  id_actividad?: number | null;
  nombre_proyecto?: string | null;
  nombre_frente?: string | null;
  total_imagenes?: number;
  cantidad: number;
  ohms?: number | null;
}

export type CreateRegistroPayload = {
  Nombre_Archivo: string;
  URL_Archivo: string;
  user_id: string;
  ID_Verificada?: number | null;
  Comentario: string | null;
  Ruta_Archivo: string;
  Bucket: string;
  Ohms?: number | null;
};

export type RegistroImagenPayload = {
  ID_Registro: number;
  Orden: number;
  Nombre_Archivo: string;
  URL_Archivo: string;
  Ruta_Archivo: string;
  Bucket: string;
  Es_Principal: boolean;
};

export type RegistroRow = {
  ID_Registros: number;
  Fecha_Subida: string;
  URL_Archivo: string | null;
  Comentario: string | null;
  Ruta_Archivo: string | null;
  Bucket: string | null;
  ID_Verificada: number | null;
  user_id: string | null;
  id_proyecto: number | null;
  Ohms: number | null;
};

export type CheckedActivityRow = {
  ID_Verificada: number;
  ID_DetallesActividad: number | null;
  Latitud: number | null;
  Longitud: number | null;
  Cantidad: number | null;
};

export type RecordImageRow = {
  Ruta_Archivo?: string | null;
};

export type RecordImageCountRow = {
  ID_Registro: number | null;
};

export type RecordUpdatePayload = {
  Comentario: string;
  URL_Archivo?: string;
  Ruta_Archivo?: string;
  Nombre_Archivo?: string;
};

export type DeleteRecordParams = {
  recordId: number;
  checkedActivityId?: number | null;
  mainImagePath?: string | null;
  bucket?: string | null;
  masterBucket: string;
};

export type UpdateRecordWithImageParams = {
  recordId: number;
  comment: string;
  replacementFile?: File | null;
  bucket?: string | null;
  currentImagePath?: string | null;
  masterBucket: string;
};

export type UploadedRecordImage = {
  publicUrl: string;
  path: string;
  fileName: string;
  bucket: string;
};
