import { logger } from "../lib/logger";
import { db, type PendingRecord } from "./db_local";
import { saveReportOnline } from "../repositories/reports.repository";

type PendingEvidenceFileInput = {
  file: Blob;
  fileName: string;
  path: string;
  fileType?: string;
};

export type CreatePendingReportPayloadParams = {
  timestamp: number;
  bucketName: string;
  evidenceFiles: PendingEvidenceFileInput[];
  userId: string;
  detailId: number;
  lat: number;
  lng: number;
  comment: string;
  ohms?: number | null;
};

export type SyncPendingReportsResult = {
  syncedCount: number;
  failedCount: number;
};

type PendingUploadFile = {
  blob: Blob;
  fileName: string;
  fullPath: string;
  fileType: string;
};

const DEFAULT_IMAGE_TYPE = "image/jpeg";

const resolvePendingUploadFiles = (pendingRecord: PendingRecord): PendingUploadFile[] => {
  if (pendingRecord.evidenceBlobs && pendingRecord.evidenceBlobs.length > 0) {
    return pendingRecord.evidenceBlobs.map((blob, index) => ({
      blob,
      fileName: pendingRecord.meta.fileNames?.[index] || `offline_${pendingRecord.timestamp}_${index + 1}.jpg`,
      fullPath:
        pendingRecord.meta.fullPaths?.[index] ||
        pendingRecord.meta.fullPath ||
        `pendiente/${pendingRecord.timestamp}_${index + 1}.jpg`,
      fileType: pendingRecord.fileTypes?.[index] || DEFAULT_IMAGE_TYPE,
    }));
  }

  if (pendingRecord.evidenceBlob && pendingRecord.meta.fileName && pendingRecord.meta.fullPath) {
    return [
      {
        blob: pendingRecord.evidenceBlob,
        fileName: pendingRecord.meta.fileName,
        fullPath: pendingRecord.meta.fullPath,
        fileType: pendingRecord.fileType || DEFAULT_IMAGE_TYPE,
      },
    ];
  }

  return [];
};

const syncPendingReport = async (
  pendingRecord: PendingRecord,
  bucketNameOverride?: string
): Promise<void> => {
  const targetBucket = bucketNameOverride || pendingRecord.meta.bucketName;
  const offlineFiles = resolvePendingUploadFiles(pendingRecord);

  if (offlineFiles.length === 0) {
    throw new Error("Registro offline sin imagenes");
  }

  await saveReportOnline({
    bucket: targetBucket,
    detailId: pendingRecord.meta.detailId,
    lat: pendingRecord.meta.lat,
    lng: pendingRecord.meta.lng,
    userId: pendingRecord.meta.userId,
    comment: pendingRecord.meta.comment,
    ohms: pendingRecord.meta.ohms ?? null,
    evidenceFiles: offlineFiles.map((image, index) => ({
      file: image.blob,
      order: index + 1,
      fileName: image.fileName,
      path: image.fullPath,
      fileType: image.fileType,
    })),
  });

  if (pendingRecord.id) {
    await removePendingReport(pendingRecord.id);
  }
};

export const createPendingReportPayload = (
  params: CreatePendingReportPayloadParams
): PendingRecord => ({
  timestamp: params.timestamp,
  evidenceBlobs: params.evidenceFiles.map((image) => image.file),
  fileTypes: params.evidenceFiles.map((image) => image.fileType || DEFAULT_IMAGE_TYPE),
  meta: {
    bucketName: params.bucketName,
    fullPaths: params.evidenceFiles.map((image) => image.path),
    fileNames: params.evidenceFiles.map((image) => image.fileName),
    fullPath: params.evidenceFiles[0]?.path,
    fileName: params.evidenceFiles[0]?.fileName,
    userId: params.userId,
    detailId: params.detailId,
    lat: params.lat,
    lng: params.lng,
    comment: params.comment,
    ohms: params.ohms ?? null,
  },
});

export const savePendingReport = async (pendingRecord: PendingRecord) => {
  return db.pendingUploads.add(pendingRecord);
};

export const getPendingReports = async (): Promise<PendingRecord[]> => {
  return db.pendingUploads.toArray();
};

export const removePendingReport = async (pendingReportId: number) => {
  await db.pendingUploads.delete(pendingReportId);
};

export const syncPendingReports = async (
  pendingReports: PendingRecord[],
  bucketNameOverride?: string
): Promise<SyncPendingReportsResult> => {
  let syncedCount = 0;
  let failedCount = 0;

  for (const pendingReport of pendingReports) {
    try {
      await syncPendingReport(pendingReport, bucketNameOverride);
      syncedCount += 1;
    } catch (error) {
      failedCount += 1;
      logger.error("Error sincronizando reporte pendiente", error, {
        module: "offlineSyncService",
        pendingId: pendingReport.id,
        timestamp: pendingReport.timestamp,
        detailId: pendingReport.meta.detailId,
      });
    }
  }

  return {
    syncedCount,
    failedCount,
  };
};
