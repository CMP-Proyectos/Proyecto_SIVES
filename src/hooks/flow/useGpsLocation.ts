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

  const convertUtmToLatLng = (east: string, north: string, zone: string): GpsLocation | null => {
    if (!east || !north) return null;
    try {
      const [lng, lat] = proj4(utmZones[zone as keyof typeof utmZones], WGS84, [
        Number(east),
        Number(north),
      ]);
      if (isNaN(lat) || isNaN(lng)) return null;
      return { latitude: lat, longitude: lng };
    } catch {
      return null;
    }
  };

  const handleUpdateFromUtm = () => {
    if (!utmEast || !utmNorth) return showToast("Faltan datos UTM", "info");
    const result = convertUtmToLatLng(utmEast, utmNorth, utmZone);
    if (result) {
      setGpsLocation(result);
      showToast("UTM OK", "success");
    } else {
      showToast("UTM invalida", "error");
    }
  };

  const tryConvertUtm = (): GpsLocation | null => {
    const result = convertUtmToLatLng(utmEast, utmNorth, utmZone);
    if (result) {
      setGpsLocation(result);
    }
    return result;
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
    tryConvertUtm,
    resetGpsLocation,
  };
}
