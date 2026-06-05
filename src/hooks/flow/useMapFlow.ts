import { useCallback, useEffect, useMemo, useState } from "react";
import { db } from "../../services/db_local";
import {
  ActivityRecord,
  DetailRecord,
  fetchGlobalMapRecords,
  FrontRecord,
  getUserMapRecords,
  isNetworkUnavailableError,
  LocalityRecord,
  MapRecord,
  ProjectRecord,
} from "../../services/dataService";
import type { UserRecord } from "../../types/records.types";
import { buildCatalogHierarchySnapshot, sortByLabel } from "./catalogHierarchy";

export type MapMode = "mine" | "global";

type ToastType = "success" | "error" | "info";

type UseMapFlowParams = {
  isActive: boolean;
  isOnline: boolean;
  sessionUserId?: string;
  projects: ProjectRecord[];
  activities: ActivityRecord[];
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
  fronts: FrontRecord[];
  localities: LocalityRecord[];
  substations: string[];
  structures: string[];
  groups: string[];
  activities: ActivityRecord[];
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

const matchesText = (recordValue: string | null | undefined, filterValue: string | null) => {
  if (!filterValue) return true;
  return normalizeText(recordValue) === normalizeText(filterValue);
};

const matchesIdOrText = (
  recordId: number | null | undefined,
  filterId: number | null,
  recordLabel: string | null | undefined,
  filterLabel: string | null
) => {
  if (!filterId && !filterLabel) return true;
  if (filterId && recordId) return recordId === filterId;
  return matchesText(recordLabel, filterLabel);
};

export function useMapFlow({
  isActive,
  isOnline,
  sessionUserId,
  projects,
  activities,
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
  const [fronts, setFronts] = useState<FrontRecord[]>([]);
  const [localities, setLocalities] = useState<LocalityRecord[]>([]);
  const [details, setDetails] = useState<DetailRecord[]>([]);
  const [globalRecordsByProject, setGlobalRecordsByProject] = useState<Record<number, MapRecord[]>>({});
  const [isLoadingGlobalRecords, setIsLoadingGlobalRecords] = useState(false);
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [hasRequestedMineRecords, setHasRequestedMineRecords] = useState(false);

  const resetLowerFilters = useCallback(() => {
    setSelectedItemState(null);
    setSelectedFrontIdState(null);
    setSelectedLocalityIdState(null);
    setSelectedSubstationState(null);
    setSelectedStructureState(null);
    setSelectedGroupState(null);
    setSelectedActivityIdState(null);
    setSelectedRecordId(null);
  }, []);

  const clearFilters = useCallback(() => {
    setSelectedItemState(null);
    setSelectedFrontIdState(null);
    setSelectedLocalityIdState(null);
    setSelectedSubstationState(null);
    setSelectedStructureState(null);
    setSelectedGroupState(null);
    setSelectedActivityIdState(null);
    setSelectedRecordId(null);
  }, []);

  const loadProjectScope = useCallback(async (projectId: number) => {
    const projectFronts = await db.catalog_fronts.where("ID_Proyecto").equals(projectId).toArray();
    const frontIds = projectFronts.map((front) => front.ID_Frente);

    const projectLocalities =
      frontIds.length > 0
        ? await db.catalog_localities.where("ID_Frente").anyOf(frontIds).toArray()
        : [];
    const localityIds = projectLocalities.map((locality) => locality.ID_Localidad);

    const projectDetails =
      localityIds.length > 0
        ? await db.catalog_details.where("ID_Localidad").anyOf(localityIds).toArray()
        : [];

    setFronts(projectFronts.sort((left, right) => sortByLabel(left.Nombre_Frente, right.Nombre_Frente)));
    setLocalities(
      projectLocalities.sort((left, right) => sortByLabel(left.Nombre_Localidad, right.Nombre_Localidad))
    );
    setDetails(projectDetails.sort((left, right) => sortByLabel(left.Nombre_Detalle, right.Nombre_Detalle)));
  }, []);

  const selectedProject = useMemo(
    () => projects.find((project) => project.ID_Proyectos === selectedProjectId) || null,
    [projects, selectedProjectId]
  );

  const hierarchy = useMemo(
    () =>
      buildCatalogHierarchySnapshot({
        fronts,
        localities,
        details,
        activities,
        selectedItem,
        selectedFrontId,
        selectedLocalityId,
        selectedSubstation,
        selectedStructure,
        selectedGroup,
        requireSubstationSelection: false,
      }),
    [
      activities,
      details,
      fronts,
      localities,
      selectedFrontId,
      selectedGroup,
      selectedItem,
      selectedLocalityId,
      selectedStructure,
      selectedSubstation,
    ]
  );

  const filteredActivities = hierarchy.filteredActivities;
  const selectedFront = useMemo(
    () => fronts.find((front) => front.ID_Frente === selectedFrontId) || null,
    [fronts, selectedFrontId]
  );
  const selectedLocality = useMemo(
    () => localities.find((locality) => locality.ID_Localidad === selectedLocalityId) || null,
    [localities, selectedLocalityId]
  );
  const selectedActivity = useMemo(
    () => filteredActivities.find((activity) => activity.ID_Actividad === selectedActivityId) || null,
    [filteredActivities, selectedActivityId]
  );

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

  const filteredRecords = useMemo(() => {
    const baseRecords =
      mode === "mine"
        ? personalMapRecords
        : selectedProjectId
          ? cachedGlobalRecords
          : [];

    return baseRecords.filter((record) => {
      if (
        !matchesIdOrText(
          record.id_proyecto,
          selectedProjectId,
          record.nombre_proyecto || null,
          selectedProject?.Proyecto_Nombre || null
        )
      ) {
        return false;
      }

      if (!matchesText(record.nombre_item || null, selectedItem)) return false;
      if (
        !matchesIdOrText(
          record.id_frente,
          selectedFrontId,
          record.nombre_frente || null,
          selectedFront?.Nombre_Frente || null
        )
      ) {
        return false;
      }

      if (
        !matchesIdOrText(
          record.id_localidad,
          selectedLocalityId,
          record.nombre_localidad,
          selectedLocality?.Nombre_Localidad || null
        )
      ) {
        return false;
      }

      if (!matchesText(record.nombre_subestacion || null, selectedSubstation)) return false;
      if (!matchesText(record.nombre_detalle, selectedStructure)) return false;
      if (!matchesText(record.nombre_grupo || null, selectedGroup)) return false;

      if (
        !matchesIdOrText(
          record.id_actividad,
          selectedActivityId,
          record.nombre_actividad,
          selectedActivity?.Nombre_Actividad || null
        )
      ) {
        return false;
      }

      return true;
    });
  }, [
    cachedGlobalRecords,
    mode,
    personalMapRecords,
    selectedActivity,
    selectedActivityId,
    selectedFront,
    selectedFrontId,
    selectedGroup,
    selectedItem,
    selectedLocality,
    selectedLocalityId,
    selectedProject,
    selectedProjectId,
    selectedStructure,
    selectedSubstation,
  ]);

  const selectedRecord = useMemo(
    () => filteredRecords.find((record) => record.id_registro === selectedRecordId) || null,
    [filteredRecords, selectedRecordId]
  );

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

  const setSelectedProjectId = useCallback(
    (projectId: number | null) => {
      setSelectedProjectIdState(projectId);
      resetLowerFilters();
    },
    [resetLowerFilters]
  );

  const setSelectedItem = useCallback((item: string | null) => {
    setSelectedItemState(item);
    setSelectedFrontIdState(null);
    setSelectedLocalityIdState(null);
    setSelectedSubstationState(null);
    setSelectedStructureState(null);
    setSelectedGroupState(null);
    setSelectedActivityIdState(null);
    setSelectedRecordId(null);
  }, []);

  const setSelectedFrontId = useCallback((frontId: number | null) => {
    setSelectedFrontIdState(frontId);
    setSelectedLocalityIdState(null);
    setSelectedSubstationState(null);
    setSelectedStructureState(null);
    setSelectedGroupState(null);
    setSelectedActivityIdState(null);
    setSelectedRecordId(null);
  }, []);

  const setSelectedLocalityId = useCallback((localityId: number | null) => {
    setSelectedLocalityIdState(localityId);
    setSelectedSubstationState(null);
    setSelectedStructureState(null);
    setSelectedGroupState(null);
    setSelectedActivityIdState(null);
    setSelectedRecordId(null);
  }, []);

  const setSelectedSubstation = useCallback((substation: string | null) => {
    setSelectedSubstationState(substation);
    setSelectedStructureState(null);
    setSelectedGroupState(null);
    setSelectedActivityIdState(null);
    setSelectedRecordId(null);
  }, []);

  const setSelectedStructure = useCallback((structure: string | null) => {
    setSelectedStructureState(structure);
    setSelectedGroupState(null);
    setSelectedActivityIdState(null);
    setSelectedRecordId(null);
  }, []);

  const setSelectedGroup = useCallback((group: string | null) => {
    setSelectedGroupState(group);
    setSelectedActivityIdState(null);
    setSelectedRecordId(null);
  }, []);

  const setSelectedActivityId = useCallback((activityId: number | null) => {
    setSelectedActivityIdState(activityId);
    setSelectedRecordId(null);
  }, []);

  useEffect(() => {
    setHasRequestedMineRecords(false);
  }, [sessionUserId]);

  useEffect(() => {
    if (!selectedProjectId || !isActive) {
      setFronts([]);
      setLocalities([]);
      setDetails([]);
      return;
    }

    void loadProjectScope(selectedProjectId);
  }, [isActive, loadProjectScope, selectedProjectId]);

  useEffect(() => {
    if (!selectedProjectId || globalRecordsByProject[selectedProjectId] || !isActive || mode !== "global") {
      return;
    }

    if (!isOnline) {
      setGlobalError("Sin conexion para consultar el mapa global.");
      return;
    }

    void refreshGlobalRecords();
  }, [globalRecordsByProject, isActive, isOnline, mode, refreshGlobalRecords, selectedProjectId]);

  useEffect(() => {
    if (!isActive || mode !== "mine" || !sessionUserId || hasRequestedMineRecords || isLoadingUserRecords) {
      return;
    }

    if (!isOnline) return;

    if (userRecords.length > 0) {
      setHasRequestedMineRecords(true);
      return;
    }

    setHasRequestedMineRecords(true);
    void loadUserRecords();
  }, [
    hasRequestedMineRecords,
    isActive,
    isLoadingUserRecords,
    isOnline,
    loadUserRecords,
    mode,
    sessionUserId,
    userRecords.length,
  ]);

  useEffect(() => {
    if (!selectedProjectId) {
      setGlobalError(null);
    }
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

  const shouldShowSubstationFilter =
    Boolean(selectedLocalityId) && hierarchy.hasSubstationsForCurrentSelection;

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
    items: hierarchy.items,
    fronts: hierarchy.filteredFronts,
    localities: hierarchy.filteredLocalities,
    substations: hierarchy.filteredSubstations,
    structures: hierarchy.filteredStructures,
    groups: hierarchy.filteredGroups,
    activities: filteredActivities,
    selectedProjectName: selectedProject?.Proyecto_Nombre || null,
    selectedFrontName: selectedFront?.Nombre_Frente || null,
    selectedLocalityName: selectedLocality?.Nombre_Localidad || null,
    selectedActivityName: selectedActivity?.Nombre_Actividad || null,
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
