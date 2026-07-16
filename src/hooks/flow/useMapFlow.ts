import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityRecord,
  fetchGlobalMapRecords,
  getUserMapRecords,
  isNetworkUnavailableError,
  MapRecord,
  ProjectRecord,
} from "../../services/dataService";
import type { UserRecord } from "../../types/records.types";

export type MapMode = "mine" | "global";

type ToastType = "success" | "error" | "info";

type UseMapFlowParams = {
  isActive: boolean;
  isOnline: boolean;
  sessionUserId?: string;
  projects: ProjectRecord[];
  userRecords: UserRecord[];
  isLoadingUserRecords: boolean;
  loadUserRecords: () => Promise<void>;
  showToast: (msg: string, type: ToastType) => void;
};

export type UseMapFlowResult = {
  mode: MapMode;
  setMode: (mode: MapMode) => void;
  selectedProjectId: number | null;
  selectedItem: string | null;
  selectedFrontId: number | null;
  selectedLocalityId: number | null;
  selectedSubstation: string | null;
  selectedStructure: string | null;
  selectedGroup: string | null;
  selectedActivityId: number | null;
  projects: ProjectRecord[];
  items: string[];
  fronts: { id: number | null; name: string }[];
  localities: { id: number | null; name: string }[];
  substations: string[];
  structures: string[];
  groups: string[];
  activities: { id: number | null; name: string }[];
  selectedProjectName: string | null;
  selectedFrontName: string | null;
  selectedLocalityName: string | null;
  selectedActivityName: string | null;
  shouldShowSubstationFilter: boolean;
  isLoadingRecords: boolean;
  globalError: string | null;
  filteredRecords: MapRecord[];
  selectedRecord: MapRecord | null;
  selectedRecordId: number | null;
  setSelectedRecordId: (id: number | null) => void;
  setSelectedProjectId: (projectId: number | null) => void;
  setSelectedItem: (item: string | null) => void;
  setSelectedFrontId: (frontId: number | null) => void;
  setSelectedLocalityId: (localityId: number | null) => void;
  setSelectedSubstation: (substation: string | null) => void;
  setSelectedStructure: (structure: string | null) => void;
  setSelectedGroup: (group: string | null) => void;
  setSelectedActivityId: (activityId: number | null) => void;
  clearFilters: () => void;
  refreshGlobalRecords: () => Promise<void>;
};

const normalizeText = (value: string | null | undefined) => (value || "").trim().toLowerCase();

export function useMapFlow({
  isActive,
  isOnline,
  sessionUserId,
  projects,
  userRecords,
  isLoadingUserRecords,
  loadUserRecords,
  showToast,
}: UseMapFlowParams): UseMapFlowResult {
  const [mode, setMode] = useState<MapMode>("mine");
  const [selectedProjectId, setSelectedProjectIdState] = useState<number | null>(null);
  const [selectedItem, setSelectedItemState] = useState<string | null>(null);
  const [selectedFrontId, setSelectedFrontIdState] = useState<number | null>(null);
  const [selectedLocalityId, setSelectedLocalityIdState] = useState<number | null>(null);
  const [selectedSubstation, setSelectedSubstationState] = useState<string | null>(null);
  const [selectedStructure, setSelectedStructureState] = useState<string | null>(null);
  const [selectedGroup, setSelectedGroupState] = useState<string | null>(null);
  const [selectedActivityId, setSelectedActivityIdState] = useState<number | null>(null);
  const [selectedRecordId, setSelectedRecordId] = useState<number | null>(null);

  const [globalRecordsByProject, setGlobalRecordsByProject] = useState<Record<number, MapRecord[]>>({});
  const [isLoadingGlobalRecords, setIsLoadingGlobalRecords] = useState(false);
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [hasRequestedMineRecords, setHasRequestedMineRecords] = useState(false);

  const clearFilters = useCallback(() => {
    setSelectedProjectIdState(null);
    setSelectedItemState(null);
    setSelectedFrontIdState(null);
    setSelectedLocalityIdState(null);
    setSelectedSubstationState(null);
    setSelectedStructureState(null);
    setSelectedGroupState(null);
    setSelectedActivityIdState(null);
    setSelectedRecordId(null);
  }, []);

  const scopedUserRecords = useMemo(
    () =>
      userRecords.filter(
        (record) => !sessionUserId || !record.user_id || record.user_id === sessionUserId
      ),
    [sessionUserId, userRecords]
  );
  
  const personalMapRecords = useMemo(() => getUserMapRecords(scopedUserRecords), [scopedUserRecords]);
  const cachedGlobalRecords = useMemo(
    () => (selectedProjectId ? globalRecordsByProject[selectedProjectId] || [] : []),
    [globalRecordsByProject, selectedProjectId]
  );

  const baseRecords = useMemo(() => {
    return mode === "mine" ? personalMapRecords : (selectedProjectId ? cachedGlobalRecords : []);
  }, [mode, personalMapRecords, selectedProjectId, cachedGlobalRecords]);

  const options = useMemo(() => {
    const pProj = (rec: MapRecord) => !selectedProjectId || rec.id_proyecto === selectedProjectId;
    const pItem = (rec: MapRecord) => !selectedItem || normalizeText(rec.nombre_item) === normalizeText(selectedItem);
    const pFront = (rec: MapRecord) => !selectedFrontId || rec.id_frente === selectedFrontId;
    const pLoc = (rec: MapRecord) => !selectedLocalityId || rec.id_localidad === selectedLocalityId;
    const pSubst = (rec: MapRecord) => !selectedSubstation || normalizeText(rec.nombre_subestacion) === normalizeText(selectedSubstation);
    const pStruct = (rec: MapRecord) => !selectedStructure || normalizeText(rec.nombre_detalle) === normalizeText(selectedStructure);
    const pGroup = (rec: MapRecord) => !selectedGroup || normalizeText(rec.nombre_grupo) === normalizeText(selectedGroup);
    const pAct = (rec: MapRecord) => !selectedActivityId || rec.id_actividad === selectedActivityId;

    const uniqueItems = new Set<string>();
    const uniqueFronts = new Map<number | string, { id: number | null; name: string }>();
    const uniqueLocalities = new Map<number | string, { id: number | null; name: string }>();
    const uniqueSubstations = new Set<string>();
    const uniqueStructures = new Set<string>();
    const uniqueGroups = new Set<string>();
    const uniqueActivities = new Map<number | string, { id: number | null; name: string }>();

    baseRecords.forEach((rec) => {
      if (pProj(rec) && pFront(rec) && pLoc(rec) && pSubst(rec) && pStruct(rec) && pGroup(rec) && pAct(rec)) {
        if (rec.nombre_item) uniqueItems.add(rec.nombre_item);
      }
      if (pProj(rec) && pItem(rec) && pLoc(rec) && pSubst(rec) && pStruct(rec) && pGroup(rec) && pAct(rec)) {
        if (rec.nombre_frente) uniqueFronts.set(rec.id_frente || rec.nombre_frente, { id: rec.id_frente ?? null, name: rec.nombre_frente });
      }
      if (pProj(rec) && pItem(rec) && pFront(rec) && pSubst(rec) && pStruct(rec) && pGroup(rec) && pAct(rec)) {
        if (rec.nombre_localidad) uniqueLocalities.set(rec.id_localidad || rec.nombre_localidad, { id: rec.id_localidad ?? null, name: rec.nombre_localidad });
      }
      if (pProj(rec) && pItem(rec) && pFront(rec) && pLoc(rec) && pStruct(rec) && pGroup(rec) && pAct(rec)) {
        if (rec.nombre_subestacion) uniqueSubstations.add(rec.nombre_subestacion);
      }
      if (pProj(rec) && pItem(rec) && pFront(rec) && pLoc(rec) && pSubst(rec) && pGroup(rec) && pAct(rec)) {
        if (rec.nombre_detalle) uniqueStructures.add(rec.nombre_detalle);
      }
      if (pProj(rec) && pItem(rec) && pFront(rec) && pLoc(rec) && pSubst(rec) && pStruct(rec) && pAct(rec)) {
        if (rec.nombre_grupo) uniqueGroups.add(rec.nombre_grupo);
      }
      if (pProj(rec) && pItem(rec) && pFront(rec) && pLoc(rec) && pSubst(rec) && pStruct(rec) && pGroup(rec)) {
        if (rec.nombre_actividad) uniqueActivities.set(rec.id_actividad || rec.nombre_actividad, { id: rec.id_actividad ?? null, name: rec.nombre_actividad });
      }
    });

    return {
      items: Array.from(uniqueItems).sort(),
      fronts: Array.from(uniqueFronts.values()).sort((a, b) => a.name.localeCompare(b.name)),
      localities: Array.from(uniqueLocalities.values()).sort((a, b) => a.name.localeCompare(b.name)),
      substations: Array.from(uniqueSubstations).sort(),
      structures: Array.from(uniqueStructures).sort(),
      groups: Array.from(uniqueGroups).sort(),
      activities: Array.from(uniqueActivities.values()).sort((a, b) => a.name.localeCompare(b.name)),
    };
  }, [
    baseRecords, 
    selectedProjectId, selectedItem, selectedFrontId, selectedLocalityId, 
    selectedSubstation, selectedStructure, selectedGroup, selectedActivityId
  ]);

  const filteredRecords = useMemo(() => {
    return baseRecords.filter((rec) => {
      if (selectedProjectId && rec.id_proyecto !== selectedProjectId) return false;
      if (selectedItem && normalizeText(rec.nombre_item) !== normalizeText(selectedItem)) return false;
      if (selectedFrontId && rec.id_frente !== selectedFrontId) return false;
      if (selectedLocalityId && rec.id_localidad !== selectedLocalityId) return false;
      if (selectedSubstation && normalizeText(rec.nombre_subestacion) !== normalizeText(selectedSubstation)) return false;
      if (selectedStructure && normalizeText(rec.nombre_detalle) !== normalizeText(selectedStructure)) return false;
      if (selectedGroup && normalizeText(rec.nombre_grupo) !== normalizeText(selectedGroup)) return false;
      if (selectedActivityId && rec.id_actividad !== selectedActivityId) return false;
      return true;
    });
  }, [
    baseRecords, selectedProjectId, selectedItem, selectedFrontId, 
    selectedLocalityId, selectedSubstation, selectedStructure, 
    selectedGroup, selectedActivityId
  ]);

  const selectedRecord = useMemo(
    () => filteredRecords.find((record) => record.id_registro === selectedRecordId) || null,
    [filteredRecords, selectedRecordId]
  );

  const selectedProject = useMemo(
    () => projects.find((project) => project.ID_Proyectos === selectedProjectId) || null,
    [projects, selectedProjectId]
  );

  const selectedFrontName = useMemo(() => 
    options.fronts.find(f => f.id === selectedFrontId)?.name || null
  , [options.fronts, selectedFrontId]);

  const selectedLocalityName = useMemo(() => 
    options.localities.find(l => l.id === selectedLocalityId)?.name || null
  , [options.localities, selectedLocalityId]);

  const selectedActivityName = useMemo(() => 
    options.activities.find(a => a.id === selectedActivityId)?.name || null
  , [options.activities, selectedActivityId]);

  const refreshGlobalRecords = useCallback(async () => {
    if (!selectedProjectId) return;
    if (!isOnline) {
      setGlobalError("Sin conexion para consultar el mapa global.");
      return;
    }

    setIsLoadingGlobalRecords(true);
    setGlobalError(null);

    try {
      const records = await fetchGlobalMapRecords(selectedProjectId);
      setGlobalRecordsByProject((current) => ({
        ...current,
        [selectedProjectId]: records,
      }));
    } catch (error: any) {
      console.error("[MAP] Error cargando mapa global", error);
      const message =
        error?.message?.includes("get_mapa_global") || error?.message?.includes("RPC")
          ? "No se pudo consultar la RPC get_mapa_global para este proyecto."
          : isNetworkUnavailableError(error)
            ? "Sin conexion para consultar el mapa global."
            : "No se pudo cargar el mapa global.";

      setGlobalError(message);
      showToast(message, "info");
    } finally {
      setIsLoadingGlobalRecords(false);
    }
  }, [isOnline, selectedProjectId, showToast]);

  // Setters sin limpieza forzada, manteniendo la total independencia de opciones
  const setSelectedProjectId = useCallback((projectId: number | null) => setSelectedProjectIdState(projectId), []);
  const setSelectedItem = useCallback((item: string | null) => setSelectedItemState(item), []);
  const setSelectedStructure = useCallback((structure: string | null) => setSelectedStructureState(structure), []);
  const setSelectedFrontId = useCallback((frontId: number | null) => setSelectedFrontIdState(frontId), []);
  const setSelectedLocalityId = useCallback((localityId: number | null) => setSelectedLocalityIdState(localityId), []);
  const setSelectedSubstation = useCallback((substation: string | null) => setSelectedSubstationState(substation), []);
  const setSelectedGroup = useCallback((group: string | null) => setSelectedGroupState(group), []);
  const setSelectedActivityId = useCallback((activityId: number | null) => setSelectedActivityIdState(activityId), []);

  useEffect(() => {
    setHasRequestedMineRecords(false);
  }, [sessionUserId]);

  useEffect(() => {
    if (!selectedProjectId || globalRecordsByProject[selectedProjectId] || !isActive || mode !== "global") return;
    if (!isOnline) {
      setGlobalError("Sin conexion para consultar el mapa global.");
      return;
    }
    void refreshGlobalRecords();
  }, [globalRecordsByProject, isActive, isOnline, mode, refreshGlobalRecords, selectedProjectId]);

  useEffect(() => {
    if (!isActive || mode !== "mine" || !sessionUserId || hasRequestedMineRecords || isLoadingUserRecords) return;
    if (!isOnline) return;
    if (userRecords.length > 0) {
      setHasRequestedMineRecords(true);
      return;
    }
    setHasRequestedMineRecords(true);
    void loadUserRecords();
  }, [
    hasRequestedMineRecords, isActive, isLoadingUserRecords, isOnline,
    loadUserRecords, mode, sessionUserId, userRecords.length,
  ]);

  useEffect(() => {
    if (!selectedProjectId) setGlobalError(null);
  }, [selectedProjectId]);

  useEffect(() => {
    if (!selectedRecordId) return;
    if (!filteredRecords.some((record) => record.id_registro === selectedRecordId)) {
      setSelectedRecordId(null);
    }
  }, [filteredRecords, selectedRecordId]);

  useEffect(() => {
    if (selectedProjectId && !projects.some((project) => project.ID_Proyectos === selectedProjectId)) {
      setSelectedProjectIdState(null);
      clearFilters();
    }
  }, [clearFilters, projects, selectedProjectId]);

  const shouldShowSubstationFilter = Boolean(selectedLocalityId) && options.substations.length > 0;

  return {
    mode,
    setMode,
    selectedProjectId,
    selectedItem,
    selectedFrontId,
    selectedLocalityId,
    selectedSubstation,
    selectedStructure,
    selectedGroup,
    selectedActivityId,
    projects,
    items: options.items,
    fronts: options.fronts,
    localities: options.localities,
    substations: options.substations,
    structures: options.structures,
    groups: options.groups,
    activities: options.activities,
    selectedProjectName: selectedProject?.Proyecto_Nombre || null,
    selectedFrontName,
    selectedLocalityName,
    selectedActivityName,
    shouldShowSubstationFilter,
    isLoadingRecords: mode === "global" ? isLoadingGlobalRecords : isLoadingUserRecords,
    globalError,
    filteredRecords,
    selectedRecord,
    selectedRecordId,
    setSelectedRecordId,
    setSelectedProjectId,
    setSelectedItem,
    setSelectedFrontId,
    setSelectedLocalityId,
    setSelectedSubstation,
    setSelectedStructure,
    setSelectedGroup,
    setSelectedActivityId,
    clearFilters,
    refreshGlobalRecords,
  };
}