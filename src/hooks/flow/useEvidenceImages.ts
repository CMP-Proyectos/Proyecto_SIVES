import { useEffect, useRef, useState } from "react";
import { validarFotoConIA } from "../../services/GoogleAI";
import type { ActivityRecord } from "../../services/dataService";
import type { EvidenceImage } from "../../features/reportFlow/types";

type ToastType = "success" | "error" | "info";
type ShowToast = (msg: string, type: ToastType) => void;

type AiFeedback = {
  type: "warning" | "info" | "success";
  message: string;
};

const MAX_EVIDENCE_IMAGES = 5;

export function useEvidenceImages(
  showToast: ShowToast,
  selectedActivity: ActivityRecord | null
) {
  const [evidenceImages, setEvidenceImages] = useState<EvidenceImage[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [aiFeedback, setAiFeedback] = useState<AiFeedback | null>(null);
  const evidenceImagesRef = useRef<EvidenceImage[]>([]);
  const activeAnalysisIdRef = useRef(0);

  useEffect(() => {
    evidenceImagesRef.current = evidenceImages;
  }, [evidenceImages]);

  useEffect(() => {
    return () => {
      evidenceImagesRef.current.forEach((image) => URL.revokeObjectURL(image.previewUrl));
    };
  }, []);

  const analyzeImage = async (file: File) => {
    const analysisId = ++activeAnalysisIdRef.current;
    setAiFeedback(null);
    setIsAnalyzing(true);
    try {
      const res = await validarFotoConIA(file, selectedActivity?.Nombre_Actividad || "Obra");
      if (analysisId !== activeAnalysisIdRef.current) return;

      if (res.esErrorTecnico) setAiFeedback({ type: "info", message: "Offline: Validar manual." });
      else if (!res.aprobado) setAiFeedback({ type: "warning", message: `IA: ${res.mensaje}` });
      else setAiFeedback({ type: "success", message: "Validado por IA." });
    } catch {
      if (analysisId !== activeAnalysisIdRef.current) return;
      setAiFeedback({ type: "info", message: "Error IA." });
    } finally {
      if (analysisId === activeAnalysisIdRef.current) {
        setIsAnalyzing(false);
      }
    }
  };

  const handleCaptureFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const incomingFiles = Array.from(e.target.files || []);
    if (incomingFiles.length === 0) return;

    const availableSlots = MAX_EVIDENCE_IMAGES - evidenceImages.length;
    if (availableSlots <= 0) {
      showToast("Maximo 5 imagenes por registro", "info");
      e.target.value = "";
      return;
    }

    const filesToAdd = incomingFiles.slice(0, availableSlots);
    if (incomingFiles.length > filesToAdd.length) {
      showToast("Solo se agregaron hasta completar 5 imagenes", "info");
    }

    const nextImages = filesToAdd.map((file, index) => ({
      id: `${Date.now()}-${evidenceImages.length + index}`,
      file,
      previewUrl: URL.createObjectURL(file),
    }));

    setEvidenceImages((current) => [...current, ...nextImages]);
    void analyzeImage(nextImages[0].file);
    e.target.value = "";
  };

  const removeEvidenceImage = (imageId: string) => {
    setEvidenceImages((current) => {
      const target = current.find((image) => image.id === imageId);
      if (target) URL.revokeObjectURL(target.previewUrl);
      return current.filter((image) => image.id !== imageId);
    });
  };

  const resetEvidenceImages = () => {
    activeAnalysisIdRef.current += 1;
    evidenceImagesRef.current.forEach((image) => URL.revokeObjectURL(image.previewUrl));
    setEvidenceImages([]);
    setAiFeedback(null);
    setIsAnalyzing(false);
  };

  return {
    evidenceImages,
    evidenceFiles: evidenceImages.map((image) => image.file),
    evidencePreview: evidenceImages[0]?.previewUrl ?? null,
    handleCaptureFile,
    removeEvidenceImage,
    isAnalyzing,
    aiFeedback,
    resetEvidenceImages,
  };
}
