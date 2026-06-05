import { logger } from "../lib/logger";
import { supabase } from "../services/supabaseClient";
import type {
  DeleteRecordParams,
  RecordImageRow,
  RecordUpdatePayload,
  UpdateRecordWithImageParams,
  UploadedRecordImage,
} from "../types/records.types";

export async function getRecordImagePaths(recordId: number): Promise<string[]> {
  const { data, error } = await supabase
    .from("Registro_Imagenes")
    .select("Ruta_Archivo")
    .eq("ID_Registro", recordId);

  if (error) throw error;

  return ((data || []) as RecordImageRow[])
    .map((image) => image.Ruta_Archivo?.trim())
    .filter((path): path is string => Boolean(path));
}

export async function removeBucketFiles(bucket: string, filePaths: string[]): Promise<void> {
  const cleanedPaths = filePaths
    .map((path) => path.trim())
    .filter((path) => path.length > 0);

  if (!bucket || cleanedPaths.length === 0) return;

  const { error } = await supabase.storage.from(bucket).remove(cleanedPaths);
  if (error) throw error;
}

export async function updateRecordInfo(recordId: number, updates: RecordUpdatePayload): Promise<void> {
  const { error } = await supabase
    .from("Registros")
    .update(updates)
    .eq("ID_Registros", recordId);

  if (error) throw error;
}

export async function updateRecordImageRelations(
  recordId: number,
  image: UploadedRecordImage
): Promise<void> {
  await supabase
    .from("Registro_Imagenes")
    .update({
      URL_Archivo: image.publicUrl,
      Ruta_Archivo: image.path,
      Nombre_Archivo: image.fileName,
      Bucket: image.bucket,
    })
    .eq("ID_Registro", recordId)
    .eq("Es_Principal", true);
}

export async function uploadReplacementRecordImage(params: {
  bucket: string;
  currentImagePath?: string | null;
  replacementFile: File;
  masterBucket: string;
}): Promise<UploadedRecordImage> {
  const bucketToUse = params.bucket || params.masterBucket;
  const folder = params.currentImagePath?.includes("/")
    ? params.currentImagePath.split("/").slice(0, -1).join("/")
    : "general";
  const fileName = `edit_${Date.now()}.jpg`;

  const { data, error } = await supabase.storage
    .from(bucketToUse)
    .upload(`${folder}/${fileName}`, params.replacementFile);

  if (error) throw error;

  const { data: publicUrl } = supabase.storage.from(bucketToUse).getPublicUrl(data.path);

  return {
    publicUrl: publicUrl.publicUrl,
    path: data.path,
    fileName,
    bucket: bucketToUse,
  };
}

async function deleteRecordFallback(recordId: number, checkedActivityId?: number | null): Promise<void> {
  const { error: childDeleteError } = await supabase
    .from("Registro_Imagenes")
    .delete()
    .eq("ID_Registro", recordId);
  if (childDeleteError) throw childDeleteError;

  const { error: registroDeleteError } = await supabase
    .from("Registros")
    .delete()
    .eq("ID_Registros", recordId);
  if (registroDeleteError) throw registroDeleteError;

  if (checkedActivityId) {
    const { error: checkedDeleteError } = await supabase
      .from("Actividad_Verificada")
      .delete()
      .eq("ID_Verificada", checkedActivityId);
    if (checkedDeleteError) throw checkedDeleteError;
  }
}

export async function deleteRecordWithAssets(params: DeleteRecordParams): Promise<void> {
  const filesToDelete = new Set<string>();
  const bucketToUse = params.bucket || params.masterBucket;

  if (params.mainImagePath) {
    filesToDelete.add(params.mainImagePath);
  }

  try {
    const childImagePaths = await getRecordImagePaths(params.recordId);
    childImagePaths.forEach((path) => filesToDelete.add(path));
  } catch (error) {
    logger.warn("[records.repository] No se pudieron consultar rutas hijas antes de eliminar", {
      recordId: params.recordId,
      error,
    });
    // Mantiene el comportamiento actual: si falla la consulta de hijas, igual se intenta eliminar el registro.
  }

  if (bucketToUse && filesToDelete.size > 0) {
    try {
      await removeBucketFiles(bucketToUse, Array.from(filesToDelete));
    } catch (error) {
      logger.warn("[records.repository] No se pudieron eliminar archivos del bucket", {
        recordId: params.recordId,
        bucket: bucketToUse,
        filesToDelete: Array.from(filesToDelete),
        error,
      });
      // Mantiene el comportamiento actual: fallas de storage no interrumpen el borrado del registro.
    }
  }

  const { error: rpcError } = await supabase.rpc("eliminar_evidencia_completa", {
    p_id_registro: params.recordId,
  });

  if (rpcError) {
    logger.warn("[records.repository] RPC eliminar_evidencia_completa fallo; se usa fallback manual", {
      recordId: params.recordId,
      checkedActivityId: params.checkedActivityId,
      rpcError,
    });
    await deleteRecordFallback(params.recordId, params.checkedActivityId);
  }
}

export async function updateRecordWithOptionalImage(
  params: UpdateRecordWithImageParams
): Promise<void> {
  const updates: RecordUpdatePayload = { Comentario: params.comment };

  if (params.replacementFile && params.bucket) {
    const uploadedImage = await uploadReplacementRecordImage({
      bucket: params.bucket,
      currentImagePath: params.currentImagePath,
      replacementFile: params.replacementFile,
      masterBucket: params.masterBucket,
    });

    updates.URL_Archivo = uploadedImage.publicUrl;
    updates.Ruta_Archivo = uploadedImage.path;
    updates.Nombre_Archivo = uploadedImage.fileName;

    if (params.currentImagePath) {
      await supabase.storage.from(uploadedImage.bucket).remove([params.currentImagePath]);
    }

    await updateRecordImageRelations(params.recordId, uploadedImage);
  }

  await updateRecordInfo(params.recordId, updates);
}
