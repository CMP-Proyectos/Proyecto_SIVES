import { useState } from "react";
import type { ActivityRecord } from "../../services/dataService";
import { useGpsLocation } from "./useGpsLocation";
import { useEvidenceImages } from "./useEvidenceImages";

export function useEvidenceFlow(
  showToast: (msg: string, type: "success" | "error" | "info") => void,
  selectedActivity: ActivityRecord | null,
  isOnline: boolean
) {
  const [note, setNote] = useState("");
  const [ohms, setOhms] = useState("");
  const gps = useGpsLocation(showToast);
  const images = useEvidenceImages(showToast, selectedActivity);
  void isOnline;

  const resetEvidence = () => {
    images.resetEvidenceImages();
    setNote("");
    setOhms("");
    gps.resetGpsLocation();
  };

  return {
    gpsLocation: gps.gpsLocation,
    setGpsLocation: gps.setGpsLocation,
    isFetchingGps: gps.isFetchingGps,
    handleCaptureGps: gps.handleCaptureGps,
    utmZone: gps.utmZone,
    setUtmZone: gps.setUtmZone,
    utmEast: gps.utmEast,
    setUtmEast: gps.setUtmEast,
    utmNorth: gps.utmNorth,
    setUtmNorth: gps.setUtmNorth,
    handleUpdateFromUtm: gps.handleUpdateFromUtm,
    evidenceImages: images.evidenceImages,
    evidenceFiles: images.evidenceFiles,
    evidencePreview: images.evidencePreview,
    note,
    setNote,
    ohms,
    setOhms,
    handleCaptureFile: images.handleCaptureFile,
    removeEvidenceImage: images.removeEvidenceImage,
    isAnalyzing: images.isAnalyzing,
    aiFeedback: images.aiFeedback,
    resetEvidence,
  };
}
