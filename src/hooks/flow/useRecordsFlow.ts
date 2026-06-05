import { useCallback, useEffect, useState } from "react";
import { fetchUserRecords } from "../../services/dataService";
import type { ConfirmModalState } from "../../features/reportFlow/types";
import { logger } from "../../lib/logger";
import {
  deleteRecordWithAssets,
  updateRecordWithOptionalImage,
} from "../../repositories/records.repository";
import type { UserRecord } from "../../types/records.types";

export function useRecordsFlow(
    sessionUserId: string | undefined,
    showToast: (msg: string, type: "success" | "error" | "info") => void,
    setConfirmModal: (modal: ConfirmModalState | null) => void,
    setIsLoading: (v: boolean) => void,
    MASTER_BUCKET: string
) {
  const [userRecords, setUserRecords] = useState<UserRecord[]>([]);
  const [selectedRecordId, setSelectedRecordId] = useState<number | null>(null);
  const [isLoadingRecords, setIsLoadingRecords] = useState(false);
  const [hasLoadedUserRecords, setHasLoadedUserRecords] = useState(false);

  const [isPhotoModalOpen, setIsPhotoModalOpen] = useState(false);
  const [editEvidenceFile, setEditEvidenceFile] = useState<File | null>(null);
  const [editComment, setEditComment] = useState("");
  const [editPreviewUrl, setEditPreviewUrl] = useState("");

  useEffect(() => {
    setUserRecords([]);
    setSelectedRecordId(null);
    setHasLoadedUserRecords(false);
  }, [sessionUserId]);

  const loadUserRecords = useCallback(async () => {
    if (!sessionUserId) return;

    setIsLoadingRecords(true);
    try {
      const data = await fetchUserRecords(sessionUserId);
      setUserRecords(data);
      setHasLoadedUserRecords(true);
    } catch (err) {
      logger.error("[useRecordsFlow] Error cargando historial", err, {
        sessionUserId,
      });
    } finally {
      setIsLoadingRecords(false);
    }
  }, [sessionUserId]);

  const requestDeleteRecord = (i: UserRecord) => {
    setConfirmModal({
      open: true,
      title: "Borrar registro",
      message: "Eliminar permanentemente?",
      onConfirm: async () => {
        setConfirmModal(null);
        setIsLoading(true);
        try {
          await deleteRecordWithAssets({
            recordId: i.id_registro,
            checkedActivityId: i.id_verificada,
            mainImagePath: i.ruta_archivo,
            bucket: i.bucket,
            masterBucket: MASTER_BUCKET,
          });

          await loadUserRecords();
          setSelectedRecordId(null);
          showToast("Eliminado", "success");
        } catch (error) {
          logger.error("[useRecordsFlow] Error eliminando registro", error, {
            recordId: i.id_registro,
            checkedActivityId: i.id_verificada,
          });
          showToast("Error al eliminar", "error");
        } finally {
          setIsLoading(false);
        }
      },
    });
  };

  const saveRecordEdits = async () => {
    const item = userRecords.find((record) => record.id_registro === selectedRecordId);
    if (!item) return;

    setIsLoading(true);
    try {
      await updateRecordWithOptionalImage({
        recordId: item.id_registro,
        comment: editComment,
        replacementFile: editEvidenceFile,
        bucket: item.bucket,
        currentImagePath: item.ruta_archivo,
        masterBucket: MASTER_BUCKET,
      });

      showToast("Actualizado", "success");
      setIsPhotoModalOpen(false);
      setEditEvidenceFile(null);
      await loadUserRecords();
    } catch (error) {
      logger.error("[useRecordsFlow] Error actualizando registro", error, {
        recordId: item.id_registro,
        hasReplacementFile: Boolean(editEvidenceFile),
      });
      showToast("Error al actualizar", "error");
    } finally {
      setIsLoading(false);
    }
  };

  const openEditModal = () => {
    const record = userRecords.find((item) => item.id_registro === selectedRecordId);
    if (record) {
      setEditComment(record.comentario ?? "");
      setEditEvidenceFile(null);
      setEditPreviewUrl(record.url_foto ?? "");
      setIsPhotoModalOpen(true);
    }
  };

  const handleCreateCSV = (records: UserRecord[]) => {
    if (!records || records.length === 0) {
      alert("No hay registros para descargar.");
      return;
    }

    const headers = [
      "ID Registro",
      "Fecha",
      "Actividad",
      "Localidad",
      "Detalle",
      "Comentario",
      "Latitud",
      "Longitud",
      "Cantidad",
    ];

    const rows = records.map((rec) => {
      return [
        rec.id_registro,
        `"${rec.fecha_subida ? new Date(rec.fecha_subida).toLocaleString("es-ES", {
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        }) : ""}"`,
        `"${rec.nombre_actividad || ""}"`,
        `"${rec.nombre_localidad || ""}"`,
        `"${rec.nombre_detalle || ""}"`,
        `"${(rec.comentario || "").replace(/"/g, "\"\"")}"`,
        rec.latitud,
        rec.longitud,
        rec.cantidad,
      ].join(";");
    });

    const csvContent = [headers.join(";"), ...rows].join("\n");
    const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `Registros_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return {
    userRecords,
    isLoadingRecords,
    hasLoadedUserRecords,
    loadUserRecords,
    selectedRecordId,
    setSelectedRecordId,
    requestDeleteRecord,
    saveRecordEdits,
    isPhotoModalOpen,
    setIsPhotoModalOpen,
    openEditModal,
    editComment,
    setEditComment,
    editPreviewUrl,
    setEditPreviewUrl,
    editEvidenceFile,
    setEditEvidenceFile,
    handleCreateCSV,
    handleEditFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files?.[0]) {
        setEditEvidenceFile(e.target.files[0]);
        setEditPreviewUrl(URL.createObjectURL(e.target.files[0]));
      }
    },
  };
}
