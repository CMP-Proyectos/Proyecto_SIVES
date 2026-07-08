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
  PrediosRecord,
} from "../../services/dataService";
import type { UserRecord } from "../../types/records.types";
import { buildCatalogHierarchySnapshot, sortByLabel } from "./catalogHierarchy";

type ToastType = "success" | "error" | "info";

type UseGalleryFlowParams = {
  projects: ProjectRecord[];
  activities: ActivityRecord[];
  userRecords: UserRecord[];
  loadUserRecords: () => Promise<void>;
  showToast: (msg: string, type: ToastType) => void;
};

export type UseGalleryFlowResult = {
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
  record : UserRecord[];
  localities: LocalityRecord[];
  substations: string[];
  structures: string[];
  groups: string[];
  activities: ActivityRecord[];
  selectedProjectName: string | null;
  selectedFrontName: string | null;
  selectedLocalityName: string | null;
  selectedActivityName: string | null;
  globalError: string | null;
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
  setRecords : (record: UserRecord[]) => void;
  clearFilters: () => void;
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

export function useGalleryFlow({
  projects,
  activities,
  userRecords,
  loadUserRecords,
  showToast,
}: UseGalleryFlowParams): UseGalleryFlowResult {
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
  const [predios, setPredios] = useState<PrediosRecord[]>([]); 
  const [details, setDetails] = useState<DetailRecord[]>([]);
  const [record, setRecords] = useState<UserRecord[]>([]);
  const [globalError, setGlobalError] = useState<string | null>(null);

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
        predios,
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

  const setSelectedProjectId = useCallback(
    (projectId: number | null) => {
      setSelectedProjectIdState(projectId);
      resetLowerFilters();
    },
    [resetLowerFilters]
  );

  const setSelectedItem = useCallback((item: string | null) => {
    setSelectedItemState(item);
    setSelectedStructureState(null);
    setSelectedFrontIdState(null);
    setSelectedLocalityIdState(null);
    setSelectedSubstationState(null);
    setSelectedGroupState(null);
    setSelectedActivityIdState(null);
    setSelectedRecordId(null);
  }, []);

  const setSelectedStructure = useCallback((structure: string | null) => {
    setSelectedStructureState(structure);
    setSelectedFrontIdState(null);
    setSelectedLocalityIdState(null);
    setSelectedSubstationState(null);
    setSelectedGroupState(null);
    setSelectedActivityIdState(null);
    setSelectedRecordId(null);
  }, []);

  const setSelectedFrontId = useCallback((frontId: number | null) => {
    setSelectedFrontIdState(frontId);
    setSelectedLocalityIdState(null);
    setSelectedSubstationState(null);
    setSelectedGroupState(null);
    setSelectedActivityIdState(null);
    setSelectedRecordId(null);
  }, []);

  const setSelectedLocalityId = useCallback((localityId: number | null) => {
    setSelectedLocalityIdState(localityId);
    setSelectedSubstationState(null);
    setSelectedGroupState(null);
    setSelectedActivityIdState(null);
    setSelectedRecordId(null);
  }, []);

  const setSelectedSubstation = useCallback((substation: string | null) => {
    setSelectedSubstationState(substation);
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
    if (!selectedProjectId) {
      setFronts([]);
      setLocalities([]);
      setDetails([]);
      return;
    }
    void loadProjectScope(selectedProjectId);
  }, [loadProjectScope, selectedProjectId]);

  useEffect(() => {
    if (selectedProjectId && !projects.some((project) => project.ID_Proyectos === selectedProjectId)) {
      setSelectedProjectIdState(null);
      clearFilters();
    }
  }, [clearFilters, projects, selectedProjectId]);

  return {
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
    record,
    localities: hierarchy.filteredLocalities,
    substations: hierarchy.filteredSubstations,
    structures: hierarchy.filteredStructures,
    groups: hierarchy.filteredGroups,
    activities: filteredActivities,
    selectedProjectName: selectedProject?.Proyecto_Nombre || null,
    selectedFrontName: selectedFront?.Nombre_Frente || null,
    selectedLocalityName: selectedLocality?.Nombre_Localidad || null,
    selectedActivityName: selectedActivity?.Nombre_Actividad || null,
    globalError,
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
    setRecords,
    clearFilters,
  };
}