import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { LocateFixed, Minus, Plus } from "lucide-react";
import type { MapRecord } from "../../../services/dataService";

type Props = {
  records: MapRecord[];
  selectedRecord: MapRecord | null;
  onSelectRecord: (recordId: number) => void;
  emptyMessage: string;
};

const DEFAULT_CENTER: [number, number] = [-75.0152, -9.1899];

const OSM_RASTER_STYLE = {
  version: 8,
  sources: {
    "osm-base": {
      type: "raster",
      tiles: [
        "https://a.tile.openstreetmap.org/{z}/{x}/{y}.png",
        "https://b.tile.openstreetmap.org/{z}/{x}/{y}.png",
        "https://c.tile.openstreetmap.org/{z}/{x}/{y}.png",
      ] as string[],
      tileSize: 256,
      maxzoom: 19,
      attribution: "(c) OpenStreetMap contributors",
    },
  },
  layers: [
    {
      id: "osm-base",
      type: "raster",
      source: "osm-base",
    },
  ],
};

const buildCollection = (records: MapRecord[]) => ({
  type: "FeatureCollection" as const,
  features: records.map((record) => ({
    type: "Feature" as const,
    geometry: {
      type: "Point" as const,
      coordinates: [record.longitud, record.latitud],
    },
    properties: {
      id_registro: record.id_registro,
    },
  })),
});

const mapButtonStyle: React.CSSProperties = {
  width: "38px",
  height: "38px",
  borderRadius: "10px",
  border: "1px solid #CBD5E1",
  backgroundColor: "#FFFFFF",
  color: "#0F172A",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  cursor: "pointer",
  boxShadow: "0 6px 14px rgba(15, 23, 42, 0.12)",
};

export const MapCanvas = ({ records, selectedRecord, onSelectRecord, emptyMessage }: Props) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<any>(null);
  const lastFitSignatureRef = useRef("");
  const onSelectRecordRef = useRef(onSelectRecord);
  const [isReady, setIsReady] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);
  const [tileError, setTileError] = useState<string | null>(null);

  const recordsGeoJson = useMemo(() => buildCollection(records), [records]);
  const selectedGeoJson = useMemo(
    () => buildCollection(selectedRecord ? [selectedRecord] : []),
    [selectedRecord]
  );

  useEffect(() => {
    onSelectRecordRef.current = onSelectRecord;
  }, [onSelectRecord]);

  const fitMapToRecords = useCallback((targetRecords: MapRecord[]) => {
    const map = mapRef.current;
    if (!map || targetRecords.length === 0) return;

    if (targetRecords.length === 1) {
      map.flyTo({
        center: [targetRecords[0].longitud, targetRecords[0].latitud],
        zoom: 14,
        essential: true,
      });
      return;
    }

    const lats = targetRecords.map((record) => record.latitud);
    const lngs = targetRecords.map((record) => record.longitud);
    map.fitBounds(
      [
        [Math.min(...lngs), Math.min(...lats)],
        [Math.max(...lngs), Math.max(...lats)],
      ],
      {
        padding: 48,
        maxZoom: 14,
        duration: 500,
      }
    );
  }, []);

  useEffect(() => {
    let cancelled = false;

    const initializeMap = async () => {
      if (!containerRef.current || typeof window === "undefined") return;

      try {
        const maplibre = (await import("maplibre-gl")).default;
        if (cancelled || !containerRef.current) return;

        const map = new maplibre.Map({
          container: containerRef.current,
          style: OSM_RASTER_STYLE as any,
          center: DEFAULT_CENTER,
          zoom: 5,
          attributionControl: false,
        });

        mapRef.current = map;
        map.dragRotate.disable();
        map.touchZoomRotate.disableRotation();

        map.on("load", () => {
          if (cancelled) return;

          map.addSource("report-records", {
            type: "geojson",
            data: buildCollection([]),
          });

          map.addSource("selected-record", {
            type: "geojson",
            data: buildCollection([]),
          });

          map.addLayer({
            id: "report-records-layer",
            type: "circle",
            source: "report-records",
            paint: {
              "circle-radius": 6,
              "circle-color": "#FF6600",
              "circle-stroke-color": "#FFFFFF",
              "circle-stroke-width": 2,
              "circle-opacity": 0.95,
            },
          });

          map.addLayer({
            id: "selected-record-layer",
            type: "circle",
            source: "selected-record",
            paint: {
              "circle-radius": 9,
              "circle-color": "#003366",
              "circle-stroke-color": "#FFFFFF",
              "circle-stroke-width": 3,
            },
          });

          map.on("click", "report-records-layer", (event: any) => {
            const recordId = Number(event?.features?.[0]?.properties?.id_registro);
            if (Number.isFinite(recordId)) {
              onSelectRecordRef.current(recordId);
            }
          });

          map.on("mouseenter", "report-records-layer", () => {
            map.getCanvas().style.cursor = "pointer";
          });

          map.on("mouseleave", "report-records-layer", () => {
            map.getCanvas().style.cursor = "";
          });

          setIsReady(true);
          setMapError(null);
          setTileError(null);
        });

        map.on("error", (event: any) => {
          if (event?.sourceId === "osm-base" || event?.tile?.source === "osm-base") {
            setTileError("El fondo base no pudo cargarse en este momento.");
          }
        });
      } catch (error) {
        console.error("[MAP] No se pudo iniciar MapLibre", error);
        if (!cancelled) {
          setMapError("No se pudo iniciar el visor de mapa.");
        }
      }
    };

    void initializeMap();

    return () => {
      cancelled = true;
      setIsReady(false);

      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !isReady) return;

    const recordsSource = map.getSource("report-records");
    const selectedSource = map.getSource("selected-record");
    if (!recordsSource || !selectedSource) return;

    recordsSource.setData(recordsGeoJson);
    selectedSource.setData(selectedGeoJson);

    const signature = records.map((record) => record.id_registro).join(",");
    if (signature !== lastFitSignatureRef.current) {
      lastFitSignatureRef.current = signature;
      fitMapToRecords(records);
    }
  }, [fitMapToRecords, isReady, records, recordsGeoJson, selectedGeoJson]);

  useEffect(() => {
    if (!selectedRecord) return;
    fitMapToRecords([selectedRecord]);
  }, [fitMapToRecords, selectedRecord]);

  return (
    <div style={{ position: "relative", width: "100%", height: "100%", overflow: "hidden" }}>
      <style>{`
        .maplibre-host,
        .maplibre-host .maplibregl-canvas-container,
        .maplibre-host canvas {
          width: 100%;
          height: 100%;
        }
      `}</style>

      <div
        ref={containerRef}
        className="maplibre-host"
        style={{ position: "absolute", inset: 0, backgroundColor: "#E2E8F0" }}
      />

      <div
        style={{
          position: "absolute",
          top: "12px",
          right: "12px",
          display: "flex",
          flexDirection: "column",
          gap: "8px",
          zIndex: 3,
        }}
      >
        <button type="button" onClick={() => mapRef.current?.zoomIn()} style={mapButtonStyle}>
          <Plus size={18} />
        </button>
        <button type="button" onClick={() => mapRef.current?.zoomOut()} style={mapButtonStyle}>
          <Minus size={18} />
        </button>
        <button type="button" onClick={() => fitMapToRecords(records)} style={mapButtonStyle}>
          <LocateFixed size={18} />
        </button>
      </div>

      {(mapError || records.length === 0) && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "24px",
            textAlign: "center",
            color: "#475569",
            backgroundColor: mapError ? "#F8FAFC" : "transparent",
            zIndex: 2,
            pointerEvents: "none",
          }}
        >
          <div
            style={{
              maxWidth: "320px",
              backgroundColor: "rgba(255,255,255,0.92)",
              border: "1px solid #E2E8F0",
              borderRadius: "12px",
              padding: "16px",
              boxShadow: "0 8px 24px rgba(15, 23, 42, 0.08)",
            }}
          >
            <div style={{ fontSize: "13px", fontWeight: "700", color: "#0F172A", marginBottom: "6px" }}>
              {mapError ? "Visor no disponible" : "Sin marcadores para mostrar"}
            </div>
            <div style={{ fontSize: "12px", lineHeight: 1.5 }}>
              {mapError || emptyMessage}
            </div>
          </div>
        </div>
      )}

      {tileError && !mapError && (
        <div
          style={{
            position: "absolute",
            left: "12px",
            right: "12px",
            top: "12px",
            zIndex: 2,
            backgroundColor: "rgba(255,255,255,0.94)",
            border: "1px solid #E2E8F0",
            borderRadius: "10px",
            padding: "10px 12px",
            fontSize: "12px",
            color: "#475569",
            boxShadow: "0 8px 24px rgba(15, 23, 42, 0.08)",
          }}
        >
          {tileError}
        </div>
      )}

      <div
        style={{
          position: "absolute",
          left: "12px",
          bottom: "12px",
          zIndex: 2,
          backgroundColor: "rgba(255,255,255,0.94)",
          border: "1px solid #E2E8F0",
          borderRadius: "999px",
          padding: "6px 10px",
          fontSize: "11px",
          color: "#475569",
          boxShadow: "0 8px 24px rgba(15, 23, 42, 0.08)",
        }}
      >
        (c) OpenStreetMap contributors
      </div>
    </div>
  );
};
