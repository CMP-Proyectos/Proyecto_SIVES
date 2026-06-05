import { useState } from "react";
import proj4 from "proj4";
import { WGS84, utmZones } from "../../features/reportFlow/constants/geo";

type ToastType = "success" | "error" | "info";
type ShowToast = (msg: string, type: ToastType) => void;

export type GpsLocation = {
  latitude: number;
  longitude: number;
};

export function useGpsLocation(showToast: ShowToast) {
  const [gpsLocation, setGpsLocation] = useState<GpsLocation | null>(null);
  const [isFetchingGps, setIsFetchingGps] = useState(false);
  const [utmZone, setUtmZone] = useState("19");
  const [utmEast, setUtmEast] = useState("");
  const [utmNorth, setUtmNorth] = useState("");

  const handleCaptureGps = () => {
    if (!navigator.geolocation) return showToast("Sin soporte GPS", "error");
    setIsFetchingGps(true);
    navigator.geolocation.getCurrentPosition(
      (p) => {
        setGpsLocation({ latitude: p.coords.latitude, longitude: p.coords.longitude });
        setIsFetchingGps(false);
        showToast("GPS OK", "success");
      },
      (e) => {
        showToast(`Error GPS: ${e.message}`, "error");
        setIsFetchingGps(false);
      },
      { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 }
    );
  };

  const handleUpdateFromUtm = () => {
    if (!utmEast || !utmNorth) return showToast("Faltan datos UTM", "info");
    try {
      const [lng, lat] = proj4(utmZones[utmZone as keyof typeof utmZones], WGS84, [
        Number(utmEast),
        Number(utmNorth),
      ]);
      setGpsLocation({ latitude: lat, longitude: lng });
      showToast("UTM OK", "success");
    } catch {
      showToast("UTM invalida", "error");
    }
  };

  const resetGpsLocation = () => {
    setGpsLocation(null);
    setUtmEast("");
    setUtmNorth("");
  };

  return {
    gpsLocation,
    setGpsLocation,
    isFetchingGps,
    handleCaptureGps,
    utmZone,
    setUtmZone,
    utmEast,
    setUtmEast,
    utmNorth,
    setUtmNorth,
    handleUpdateFromUtm,
    resetGpsLocation,
  };
}
