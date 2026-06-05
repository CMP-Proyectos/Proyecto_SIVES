import { logger } from "../lib/logger";
import {
  createCheckedActivity,
  createRegistro,
  createRegistroImagenes,
  uploadEvidence,
} from "../services/dataService";

export type ReportEvidenceInput = {
  file: Blob;
  order: number;
  fileName: string;
  path: string;
  fileType: string;
};

export type SaveReportOnlineParams = {
  bucket: string;
  detailId: number;
  lat: number;
  lng: number;
  userId: string;
  comment: string;
  ohms?: number | null;
  evidenceFiles: ReportEvidenceInput[];
};

export type SaveReportOnlineResult = {
  checkedActivityId: number;
  exceeded: boolean;
  accumulated: number;
  recordId: number | null;
};

type UploadedReportImage = {
  Orden: number;
  Nombre_Archivo: string;
  URL_Archivo: string;
  Ruta_Archivo: string;
  Bucket: string;
  Es_Principal: boolean;
};

const uploadReportEvidenceFiles = async (
  bucket: string,
  evidenceFiles: ReportEvidenceInput[]
): Promise<UploadedReportImage[]> => {
  const uploadedImages: UploadedReportImage[] = [];

  for (const image of evidenceFiles) {
    const publicUrl = await uploadEvidence(bucket, image.path, image.file, image.fileType);
    uploadedImages.push({
      Orden: image.order,
      Nombre_Archivo: image.fileName,
      URL_Archivo: publicUrl,
      Ruta_Archivo: image.path,
      Bucket: bucket,
      Es_Principal: image.order === 1,
    });
  }

  return uploadedImages;
};

const insertReportRecord = async (params: {
  bucket: string;
  userId: string;
  checkedActivityId: number;
  comment: string;
  ohms?: number | null;
  mainImage: UploadedReportImage;
}) => {
  return createRegistro({
    Nombre_Archivo: params.mainImage.Nombre_Archivo,
    URL_Archivo: params.mainImage.URL_Archivo,
    user_id: params.userId,
    ID_Verificada: params.checkedActivityId,
    Comentario: params.comment,
    Ruta_Archivo: params.mainImage.Ruta_Archivo,
    Bucket: params.bucket,
    Ohms: params.ohms ?? null,
  });
};

const insertReportImages = async (recordId: number, uploadedImages: UploadedReportImage[]) => {
  return createRegistroImagenes(
    uploadedImages.map((image) => ({
      ID_Registro: recordId,
      ...image,
    }))
  );
};

export const saveReportOnline = async (
  params: SaveReportOnlineParams
): Promise<SaveReportOnlineResult> => {
  try {
    const checkedActivity = await createCheckedActivity({
      ID_DetallesActividad: params.detailId,
      Latitud: params.lat,
      Longitud: params.lng,
      Cantidad: 0,
    });

    const uploadedImages = await uploadReportEvidenceFiles(params.bucket, params.evidenceFiles);
    const mainImage = uploadedImages[0];

    const recordResponse = await insertReportRecord({
      bucket: params.bucket,
      userId: params.userId,
      checkedActivityId: checkedActivity.ID_Verificada,
      comment: params.comment,
      ohms: params.ohms ?? null,
      mainImage,
    });

    const recordId = recordResponse.data?.[0]?.ID_Registros ?? null;
    if (recordId) {
      await insertReportImages(recordId, uploadedImages);
    }

    return {
      checkedActivityId: checkedActivity.ID_Verificada,
      exceeded: checkedActivity.excedido,
      accumulated: checkedActivity.acumulado,
      recordId,
    };
  } catch (error) {
    logger.error("Error guardando reporte online", error, {
      module: "reports.repository",
      operation: "saveReportOnline",
      bucket: params.bucket,
      detailId: params.detailId,
      evidenceCount: params.evidenceFiles.length,
    });
    throw error;
  }
};
