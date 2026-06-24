import { useState, useCallback, useMemo, useEffect, useRef } from "react";
import { db } from "../../services/db_local";
import {
  getAllowedProjects,
  getFrontsByProjectIds,
  getLocalitiesByFrontIds,
  getDetailsByLocalityIds,
  getActivitiesByIds,
  getPrediosByLocalityIds,
  clearCatalogCache,
  hasSupabaseConnectivity,
  isNetworkUnavailableError,
  RemoteSyncStatus,
  ProjectRecord,
  FrontRecord,
  LocalityRecord,
  DetailRecord,
  ActivityRecord,
  PrediosRecord,
} from "../../services/dataService";
import {
  buildCatalogHierarchySnapshot,
  DetailWithActivity,
  hasSubstationsForLocalityInScope,
  sortByLabel,
} from "./catalogHierarchy";

const LAST_CATALOG_SYNC_AT_KEY = "lastCatalogSyncAt";
const CATALOG_SYNC_TTL_MS = 6 * 60 * 60 * 1000;

export type LocalCatalogSnapshot = {
  projects: ProjectRecord[];
  activities: ActivityRecord[];
};

export function useCatalogFlow(isOnline: boolean) {
  const [syncStatus, setSyncStatus] = useState("");
  const scopedSyncInFlightRef = useRef<Promise<RemoteSyncStatus> | null>(null);

  const [projects, setProjects] = useState<ProjectRecord[]>([]);
  const [fronts, setFronts] = useState<FrontRecord[]>([]);
  const [localities, setLocalities] = useState<LocalityRecord[]>([]);
  const [details, setDetails] = useState<DetailRecord[]>([]);
  const [activities, setActivities] = useState<ActivityRecord[]>([]);
  const [predios, setPredios] = useState<PrediosRecord[]>([]);

  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);
  const [selectedFrontId, setSelectedFrontId] = useState<number | null>(null);
  const [selectedLocalityId, setSelectedLocalityId] = useState<number | null>(null);
  const [selectedItem, setSelectedItem] = useState<string | null>(null);
  const [selectedSubstation, setSelectedSubstation] = useState<string | null>(null);
  const [selectedStructure, setSelectedStructure] = useState<string | null>(null);
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
  const [selectedActivity, setSelectedActivity] = useState<ActivityRecord | null>(null);
  const [selectedDetail, setSelectedDetail] = useState<DetailWithActivity | null>(null);
  const [selectedPredios, setSelectedPredios] = useState<PrediosRecord | null>(null);

  const [localitySearch, setLocalitySearch] = useState("");
  const [itemSearch, setItemSearch] = useState("");
  const [substationSearch, setSubstationSearch] = useState("");
  const [groupSearch, setGroupSearch] = useState("");
  const [detailSearch, setDetailSearch] = useState("");
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const loadInitialData = async () => {
      setProjects(await db.catalog_projects.toArray());
      setActivities(await db.catalog_activities.toArray());
    };

    void loadInitialData();
  }, []);

  const getLastCatalogSyncAt = useCallback(() => {
    try {
      if (typeof window === "undefined" || !window.localStorage) return null;
      const rawValue = window.localStorage.getItem(LAST_CATALOG_SYNC_AT_KEY);
      const timestamp = rawValue ? Number(rawValue) : NaN;
      return Number.isFinite(timestamp) && timestamp > 0 ? timestamp : null;
    } catch {
      return null;
    }
  }, []);

  const shouldRunAutomaticCatalogSync = useCallback(() => {
    const lastCatalogSyncAt = getLastCatalogSyncAt();
    if (!lastCatalogSyncAt) return true;
    return Date.now() - lastCatalogSyncAt >= CATALOG_SYNC_TTL_MS;
  }, [getLastCatalogSyncAt]);

  const markCatalogSyncSuccess = useCallback(() => {
    try {
      if (typeof window === "undefined" || !window.localStorage) return;
      window.localStorage.setItem(LAST_CATALOG_SYNC_AT_KEY, String(Date.now()));
    } catch {
      console.warn("[SYNC] No se pudo guardar lastCatalogSyncAt");
    }
  }, []);

  const performScopedSync = async (): Promise<RemoteSyncStatus> => {
    if (scopedSyncInFlightRef.current) {
      console.info("[SYNC] Reutilizando sincronizacion de catalogo en curso");
      return scopedSyncInFlightRef.current;
    }

    const runSync = async (): Promise<RemoteSyncStatus> => {
      if (!isOnline) {
        console.info("[SYNC] Sync remoto omitido; app en modo offline y cache local preservado");
        return "skipped_offline";
      }

      const hasConnectivity = await hasSupabaseConnectivity("performScopedSync");
      if (!hasConnectivity) {
        setSyncStatus("Offline cache");
        console.info("[SYNC] Sync remoto abortado por red; cache local preservado");
        return "preserved_cache";
      }

      setSyncStatus("Sincronizando...");

      try {
        console.log("[SYNC] Descargando catalogos remotos filtrados por alcance");
        const { assignedProjectIds, projects: scopedProjects } = await getAllowedProjects();
        const projectIds = scopedProjects.map((project) => project.ID_Proyectos);

        const scopedFronts = await getFrontsByProjectIds(projectIds);
        const frontIds = scopedFronts.map((front) => front.ID_Frente);

        const scopedLocalities = await getLocalitiesByFrontIds(frontIds);
        const localityIds = scopedLocalities.map((locality) => locality.ID_Localidad);

        const scopedPredios = await getPrediosByLocalityIds(localityIds);
        const scopedDetails = await getDetailsByLocalityIds(localityIds);
        const activityIds = Array.from(new Set(scopedDetails.map((detail) => detail.ID_Actividad)));

        const scopedActivities = await getActivitiesByIds(activityIds);

        console.log("[SYNC] Descarga filtrada completada", {
          assignedProjects: assignedProjectIds.length,
          visibleProjects: scopedProjects.length,
          assignedProjectIds,
          visibleProjectIds: projectIds,
          projects: scopedProjects.length,
          fronts: scopedFronts.length,
          localities: scopedLocalities.length,
          details: scopedDetails.length,
          predios: scopedPredios.length,
          activities: scopedActivities.length,
        });

        if (assignedProjectIds.length !== scopedProjects.length) {
          console.warn("[SYNC] Diferencia entre asignaciones y proyectos visibles", {
            assignedProjectIds,
            visibleProjectIds: projectIds,
          });
        }

        console.log("[SYNC] Sync remoto exitoso; reemplazando cache local con alcance valido");
        console.log("[SYNC] Reemplazando cache local por el alcance autorizado");
        await clearCatalogCache();

        await db.catalog_projects.bulkPut(scopedProjects);
        await db.catalog_fronts.bulkPut(scopedFronts);
        await db.catalog_localities.bulkPut(scopedLocalities);
        await db.catalog_details.bulkPut(scopedDetails);
        await db.catalog_predios.bulkPut(scopedPredios);
        await db.catalog_activities.bulkPut(scopedActivities);
        markCatalogSyncSuccess();

        setProjects(scopedProjects);
        setActivities(scopedActivities);
        setSyncStatus("");
        return "success";
      } catch (error) {
        if (isNetworkUnavailableError(error)) {
          console.warn("[SYNC] Sync remoto abortado por red; cache local no reemplazado", error);
          setSyncStatus("Offline cache");
          return "preserved_cache";
        }

        console.error("Sync error", error);
        setSyncStatus("Error Sync");
        throw error;
      } finally {
        scopedSyncInFlightRef.current = null;
      }
    };

    scopedSyncInFlightRef.current = runSync().finally(() => {
      scopedSyncInFlightRef.current = null;
    });
    return scopedSyncInFlightRef.current;
  };

  const loadProjectsLocal = useCallback(async (): Promise<LocalCatalogSnapshot> => {
    console.log("[SYNC] Leyendo proyectos y actividades locales");
    const [projectsLocal, activitiesLocal] = await Promise.all([
      db.catalog_projects.toArray(),
      db.catalog_activities.toArray(),
    ]);

    console.log("[SYNC] Lectura local completada", {
      projects: projectsLocal.length,
      activities: activitiesLocal.length,
    });

    setProjects(projectsLocal);
    setActivities(activitiesLocal);
    return { projects: projectsLocal, activities: activitiesLocal };
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
    const projectPredios =
      localityIds.length > 0
        ? await db.catalog_predios.where("ID_Localidad").anyOf(localityIds).toArray()
        : [];

    setFronts(projectFronts.sort((left, right) => sortByLabel(left.Nombre_Frente, right.Nombre_Frente)));
    setLocalities(projectLocalities.sort((left, right) => sortByLabel(left.Nombre_Localidad, right.Nombre_Localidad)));
    setDetails(projectDetails.sort((left, right) => sortByLabel(left.Nombre_Detalle, right.Nombre_Detalle)));
    setPredios(projectPredios.sort((left, right) => sortByLabel(left.Nombre_Padron, right.Nombre_Padron)));
  }, []);

  const hierarchy = useMemo(
    () =>
      buildCatalogHierarchySnapshot({
        fronts,
        localities,
        details,
        predios,
        activities,
        selectedItem,
        selectedFrontId,
        selectedLocalityId,
        selectedSubstation,
        selectedStructure,
        selectedGroup,
        itemSearch,
        localitySearch,
        substationSearch,
        detailSearch,
        groupSearch,
        requireSubstationSelection: true,
      }),
    [
      activities,
      detailSearch,
      details,
      predios,
      fronts,
      groupSearch,
      itemSearch,
      localitySearch,
      localities,
      selectedFrontId,
      selectedGroup,
      selectedItem,
      selectedLocalityId,
      selectedStructure,
      selectedSubstation,
      substationSearch,
    ]
  );

  const {
    scopedDetails,
    items,
    filteredItems,
    filteredFronts,
    filteredLocalities,
    substationsForCurrentSelection,
    filteredSubstations,
    hasSubstationsForCurrentSelection,
    structures,
    filteredStructures,
    detailsForCurrentStructure,
    detailsForCurrentLocality,
    prediosForCurrentLocality,
    groups,
    filteredGroups,
    filteredActivities,
    groupActivityPreviewMap,
  } = hierarchy;

  const hasSubstationsForLocality = useCallback(
    (localityId: number) => hasSubstationsForLocalityInScope(scopedDetails, selectedItem, localityId),
    [scopedDetails, selectedItem]
  );

  const selectProject = useCallback(
    async (projectId: number) => {
      setSelectedProjectId(projectId);
      setSelectedFrontId(null);
      setSelectedLocalityId(null);
      setSelectedItem(null);
      setSelectedSubstation(null);
      setSelectedStructure(null);
      setSelectedGroup(null);
      setSelectedActivity(null);
      setSelectedDetail(null);
      setSelectedPredios(null);
      setLocalitySearch("");
      setItemSearch("");
      setSubstationSearch("");
      setGroupSearch("");
      setDetailSearch("");
      setExpandedGroups({});
      await loadProjectScope(projectId);
    },
    [loadProjectScope]
  );

const selectItem = useCallback((item: string) => {
    setSelectedItem(item);
    setSelectedStructure(null);
    setSelectedFrontId(null);
    setSelectedLocalityId(null);
    setSelectedSubstation(null);
    setSelectedGroup(null);
    setSelectedActivity(null);
    setSelectedDetail(null);
    setSelectedPredios(null);
  }, []);

const selectStructure = useCallback((structure: string) => {
    setSelectedStructure(structure);
    setSelectedFrontId(null);
    setSelectedLocalityId(null);
    setSelectedSubstation(null);
    setSelectedGroup(null);
    setSelectedActivity(null);
    setSelectedDetail(null);
    setSelectedPredios(null);
  }, []);

const selectFront = useCallback((frontId: number) => {
    setSelectedFrontId(frontId);
    setSelectedLocalityId(null);
    setSelectedSubstation(null);
    setSelectedGroup(null);
    setSelectedActivity(null);
    setSelectedDetail(null);
    setSelectedPredios(null);
  }, []);

const selectLocality = useCallback((localityId: number) => {
    setSelectedLocalityId(localityId);
    setSelectedSubstation(null);
    setSelectedGroup(null);
    setSelectedActivity(null);
    setSelectedDetail(null);
    setSelectedPredios(null);
    setSubstationSearch("");
    setGroupSearch("");
    setDetailSearch("");
    setExpandedGroups({});
  }, []);

const selectSubstation = useCallback((substation: string) => {
    setSelectedSubstation(substation);
    setSelectedGroup(null);
    setSelectedActivity(null);
    setSelectedDetail(null);
    setSelectedPredios(null);
    setGroupSearch("");
    setDetailSearch("");
    setExpandedGroups({});
  }, []);

const selectGroup = useCallback((group: string) => {
    setSelectedGroup(group);
    setSelectedActivity(null);
    setSelectedDetail(null);
    setSelectedPredios(null);
    setExpandedGroups({});
  }, []);

  const selectActivity = useCallback(
    (activityId: number) => {
      const activity = filteredActivities.find((candidate) => candidate.ID_Actividad === activityId);
      const detail = detailsForCurrentLocality
        .filter((candidate) => candidate.ID_Actividad === activityId)
        .sort((left, right) => left.ID_DetallesActividad - right.ID_DetallesActividad)[0];

      if (!activity || !detail) {
        return null;
      }

      setSelectedActivity(activity);
      setSelectedDetail(detail);
      return { activity, detail };
    },
    [detailsForCurrentLocality, filteredActivities]
  );

  const toggleGroupExpanded = useCallback((group: string) => {
    setExpandedGroups((current) => ({
      ...current,
      [group]: !current[group],
    }));
  }, []);

  const resetSelection = () => {
    setSelectedProjectId(null);
    setSelectedFrontId(null);
    setSelectedLocalityId(null);
    setSelectedItem(null);
    setSelectedSubstation(null);
    setSelectedStructure(null);
    setSelectedGroup(null);
    setSelectedActivity(null);
    setSelectedDetail(null);
    setLocalitySearch("");
    setItemSearch("");
    setSubstationSearch("");
    setGroupSearch("");
    setDetailSearch("");
    setExpandedGroups({});
    setFronts([]);
    setLocalities([]);
    setDetails([]);
    setPredios([]);
  };

  return {
    syncStatus,
    projects,
    fronts,
    localities,
    activities,
    items,
    filteredItems,
    filteredFronts,
    filteredLocalities,
    substationsForCurrentSelection,
    filteredSubstations,
    hasSubstationsForCurrentSelection,
    structures,
    filteredStructures,
    detailsForCurrentLocality,
    predios,
    prediosForCurrentLocality,
    groups,
    filteredGroups,
    filteredActivities,
    selectedProjectId,
    selectedFrontId,
    selectedLocalityId,
    selectedItem,
    selectedSubstation,
    selectedStructure,
    selectedGroup,
    selectedActivity,
    selectedDetail,
    selectedPredios,
    setSelectedPredios,
    localitySearch,
    setLocalitySearch,
    itemSearch,
    setItemSearch,
    substationSearch,
    setSubstationSearch,
    groupSearch,
    setGroupSearch,
    detailSearch,
    setDetailSearch,
    expandedGroups,
    groupActivityPreviewMap,
    selectProject,
    selectItem,
    selectFront,
    selectLocality,
    selectSubstation,
    selectStructure,
    selectGroup,
    selectActivity,
    toggleGroupExpanded,
    hasSubstationsForLocality,
    performScopedSync,
    loadProjectsLocal,
    shouldRunAutomaticCatalogSync,
    resetSelection,
  };
}
