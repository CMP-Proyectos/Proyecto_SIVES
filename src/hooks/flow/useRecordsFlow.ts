import { useCallback, useEffect, useState } from "react";
import { fetchUserRecords } from "../../services/dataService";
import type { ConfirmModalState } from "../../features/reportFlow/types";
import { logger } from "../../lib/logger";
import {
  deleteRecordWithAssets,
  fetchSecondaryImages,
  getMaxImageOrder,
  updateRecordWithOptionalImage,
  uploadAndInsertAdditionalImages,
} from "../../repositories/records.repository";
import type { SecondaryImageInfo, UserRecord } from "../../types/records.types";
import { isRegistroUsuarios } from "../../utils/activity";

export function useRecordsFlow(
    sessionUserId: string | undefined,
    showToast: (msg: string, type: "success" | "error" | "info") => void,
    setConfirmModal: (modal: ConfirmModalState | null) => void,
    setIsLoading: (v: boolean) => void,
    MASTER_BUCKET: string,
    esEspecialista: boolean | undefined,
    esSupervisor: boolean | undefined,
    esVisualizador: boolean | undefined
) {
  const [userRecords, setUserRecords] = useState<UserRecord[]>([]);
  const [selectedRecordId, setSelectedRecordId] = useState<number | null>(null);
  const [isLoadingRecords, setIsLoadingRecords] = useState(false);
  const [hasLoadedUserRecords, setHasLoadedUserRecords] = useState(false);

  const [isPhotoModalOpen, setIsPhotoModalOpen] = useState(false);
  const [editEvidenceFile, setEditEvidenceFile] = useState<File | null>(null);
  const [Actividad, setActividad] = useState("");
  const [Grupo, setGrupo] = useState("");
  const [editComment, setEditComment] = useState("");
  const [editLatitud, setEditLatitud] = useState<number | null>(null);
  const [editLongitud, setEditLongitud] = useState<number | null>(null);
  const [editEspecificacion, setEditEspecificacion] = useState("");
  const [editPreviewUrl, setEditPreviewUrl] = useState("");
  const [editAdditionalFiles, setEditAdditionalFiles] = useState<File[]>([]);
  const [editAdditionalPreviewUrls, setEditAdditionalPreviewUrls] = useState<string[]>([]);
  const [editExistingSecondaryImages, setEditExistingSecondaryImages] = useState<SecondaryImageInfo[]>([]);
  const [editIsMultiFile, setEditIsMultiFile] = useState(false);

  useEffect(() => {
    setUserRecords([]);
    setSelectedRecordId(null);
    setHasLoadedUserRecords(false);
  }, [sessionUserId]);

  const loadUserRecords = useCallback(async () => {
    if (!sessionUserId) return;

    setIsLoadingRecords(true);
    try {
      const data = await fetchUserRecords(sessionUserId, esEspecialista, esSupervisor, esVisualizador);
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
        latitud: editLatitud,
        longitud: editLongitud,
        ohms: editEspecificacion,
        replacementFile: editEvidenceFile,
        bucket: item.bucket,
        currentImagePath: item.ruta_archivo,
        masterBucket: MASTER_BUCKET,
      });

      if (editAdditionalFiles.length > 0 && item.bucket) {
        const maxOrder = await getMaxImageOrder(item.id_registro);
        await uploadAndInsertAdditionalImages({
          recordId: item.id_registro,
          files: editAdditionalFiles,
          bucket: item.bucket,
          currentImagePath: item.ruta_archivo,
          masterBucket: MASTER_BUCKET,
          startOrder: maxOrder + 1,
        });
      }

      showToast("Actualizado", "success");
      setIsPhotoModalOpen(false);
      setEditEvidenceFile(null);
      setEditAdditionalFiles([]);
      setEditAdditionalPreviewUrls([]);
      setEditExistingSecondaryImages([]);
      await loadUserRecords();
    } catch (error) {
      logger.error("[useRecordsFlow] Error actualizando registro", error, {
        recordId: item.id_registro,
        hasReplacementFile: Boolean(editEvidenceFile),
        additionalFilesCount: editAdditionalFiles.length,
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
      setEditLatitud(record.latitud ?? null);
      setEditLongitud(record.longitud ?? null);
      setActividad(record.nombre_actividad);
      setGrupo(record.nombre_grupo ?? "");
      setEditEspecificacion(record.ohms?.toString() ?? "");

      setEditAdditionalFiles([]);
      setEditAdditionalPreviewUrls([]);
      setEditExistingSecondaryImages([]);

      const isMulti = isRegistroUsuarios({
        Nombre_Actividad: record.nombre_actividad,
        Grupo: record.nombre_grupo,
      });
      setEditIsMultiFile(isMulti);

      if (isMulti) {
        fetchSecondaryImages(record.id_registro)
          .then((images) => setEditExistingSecondaryImages(images))
          .catch((err) =>
            logger.warn("[useRecordsFlow] Error cargando imágenes secundarias", { err })
          );
      }
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
      "Supervisor",
      "Especialista",
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
        rec.supervisor,
        rec.especialista,
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
    Actividad,
    Grupo,
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
    editLatitud,
    editLongitud,
    editEspecificacion,
    setEditLatitud,
    setEditLongitud,
    setEditEspecificacion,
    setEditComment,
    editPreviewUrl,
    setEditPreviewUrl,
    editEvidenceFile,
    setEditEvidenceFile,
    handleCreateCSV,
    editIsMultiFile,
    editAdditionalPreviewUrls,
    editExistingSecondaryUrls: editExistingSecondaryImages.map((img) => img.url),
    handleEditFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files?.[0]) {
        setEditEvidenceFile(e.target.files[0]);
        setEditPreviewUrl(URL.createObjectURL(e.target.files[0]));
      }
    },
    handleEditAdditionalFiles: (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (!files || files.length === 0) return;

      const currentTotal = editExistingSecondaryImages.length + editAdditionalFiles.length;
      const maxNew = 3 - currentTotal; // max 3 secundarias (4 total contando la principal)
      if (maxNew <= 0) return;

      const newFiles = Array.from(files).slice(0, maxNew);
      const newUrls = newFiles.map((f) => URL.createObjectURL(f));

      setEditAdditionalFiles((prev) => [...prev, ...newFiles]);
      setEditAdditionalPreviewUrls((prev) => [...prev, ...newUrls]);
    },
    handleRemoveAdditionalFile: (index: number) => {
      setEditAdditionalPreviewUrls((prev) => {
        const url = prev[index];
        if (url) URL.revokeObjectURL(url);
        return prev.filter((_, i) => i !== index);
      });
      setEditAdditionalFiles((prev) => prev.filter((_, i) => i !== index));
    },
  };
}
