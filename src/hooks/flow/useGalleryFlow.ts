import { useCallback, useMemo, useState } from "react";
import type { ActivityRecord, ProjectRecord } from "../../services/dataService";
import type { UserRecord } from "../../types/records.types";
import { sortByLabel } from "./catalogHierarchy"; // Puedes mantener sortByLabel si lo necesitas o quitarlo

type ToastType = "success" | "error" | "info";

type UseGalleryFlowParams = {
  projects: ProjectRecord[];
  activities: ActivityRecord[]; // Ya no los usamos para las opciones, pero si los necesitas para otra cosa los dejas
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
  projects: { id: number; name: string }[];
  items: string[];
  fronts: { id: number | null; name: string }[];
  localities: { id: number | null; name: string }[];
  structures: string[];
  groups: string[];
  activities: { id: number | null; name: string }[];
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
  clearFilters: () => void;
};

const normalizeText = (value: string | null | undefined) => (value || "").trim().toLowerCase();

export function useGalleryFlow({
  userRecords,
  projects: rawProjects,
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
  
  const [globalError] = useState<string | null>(null);

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
  
const options = useMemo(() => {
    // 1. Definimos funciones auxiliares para saber si un registro CUMPLE con un filtro seleccionado
    const pProj = (rec: UserRecord) => !selectedProjectId || rec.id_proyecto === selectedProjectId;
    const pItem = (rec: UserRecord) => !selectedItem || rec.nombre_item === selectedItem;
    const pFront = (rec: UserRecord) => !selectedFrontId || rec.id_frente === selectedFrontId;
    const pLoc = (rec: UserRecord) => !selectedLocalityId || rec.id_localidad === selectedLocalityId;
    const pStruct = (rec: UserRecord) => !selectedStructure || rec.nombre_detalle === selectedStructure;
    const pGroup = (rec: UserRecord) => !selectedGroup || rec.nombre_grupo === selectedGroup;
    const pAct = (rec: UserRecord) => !selectedActivityId || rec.id_actividad === selectedActivityId;

    const uniqueProjects = new Map<number, string>();
    const uniqueItems = new Set<string>();
    const uniqueFronts = new Map<number | string, { id: number | null; name: string }>();
    const uniqueLocalities = new Map<number | string, { id: number | null; name: string }>();
    const uniqueStructures = new Set<string>();
    const uniqueGroups = new Set<string>();
    const uniqueActivities = new Map<number | string, { id: number | null; name: string }>();

    userRecords.forEach((rec) => {
      
      if (pItem(rec) && pFront(rec) && pLoc(rec) && pStruct(rec) && pGroup(rec) && pAct(rec)) {
        if (rec.id_proyecto) {
          const pName = rawProjects.find(p => p.ID_Proyectos === rec.id_proyecto)?.Proyecto_Nombre || rec.nombre_proyecto || "Desconocido";
          uniqueProjects.set(rec.id_proyecto, pName);
        }
      }

      if (pProj(rec) && pFront(rec) && pLoc(rec) && pStruct(rec) && pGroup(rec) && pAct(rec)) {
        if (rec.nombre_item) uniqueItems.add(rec.nombre_item);
      }

      if (pProj(rec) && pItem(rec) && pLoc(rec) && pStruct(rec) && pGroup(rec) && pAct(rec)) {
        if (rec.nombre_frente) uniqueFronts.set(rec.id_frente || rec.nombre_frente, { id: rec.id_frente ?? null, name: rec.nombre_frente });
      }

      if (pProj(rec) && pItem(rec) && pFront(rec) && pStruct(rec) && pGroup(rec) && pAct(rec)) {
        if (rec.nombre_localidad) uniqueLocalities.set(rec.id_localidad || rec.nombre_localidad, { id: rec.id_localidad ?? null, name: rec.nombre_localidad });
      }

      if (pProj(rec) && pItem(rec) && pFront(rec) && pLoc(rec) && pGroup(rec) && pAct(rec)) {
        if (rec.nombre_detalle) uniqueStructures.add(rec.nombre_detalle);
      }

      if (pProj(rec) && pItem(rec) && pFront(rec) && pLoc(rec) && pStruct(rec) && pAct(rec)) {
        if (rec.nombre_grupo) uniqueGroups.add(rec.nombre_grupo);
      }

      if (pProj(rec) && pItem(rec) && pFront(rec) && pLoc(rec) && pStruct(rec) && pGroup(rec)) {
        if (rec.nombre_actividad) uniqueActivities.set(rec.id_actividad || rec.nombre_actividad, { id: rec.id_actividad ?? null, name: rec.nombre_actividad });
      }
    });

    return {
      projects: Array.from(uniqueProjects.entries()).map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name)),
      items: Array.from(uniqueItems).sort(),
      fronts: Array.from(uniqueFronts.values()).sort((a, b) => a.name.localeCompare(b.name)),
      localities: Array.from(uniqueLocalities.values()).sort((a, b) => a.name.localeCompare(b.name)),
      structures: Array.from(uniqueStructures).sort(),
      groups: Array.from(uniqueGroups).sort(),
      activities: Array.from(uniqueActivities.values()).sort((a, b) => a.name.localeCompare(b.name)),
    };
  }, [
    userRecords, rawProjects, 
    selectedProjectId, selectedItem, selectedFrontId, selectedLocalityId, 
    selectedStructure, selectedGroup, selectedActivityId
  ]);

  const selectedProjectName = useMemo(() => 
    options.projects.find(p => p.id === selectedProjectId)?.name || null
  , [options.projects, selectedProjectId]);

  const selectedFrontName = useMemo(() => 
    options.fronts.find(f => f.id === selectedFrontId)?.name || null
  , [options.fronts, selectedFrontId]);

  const selectedLocalityName = useMemo(() => 
    options.localities.find(l => l.id === selectedLocalityId)?.name || null
  , [options.localities, selectedLocalityId]);

  const selectedActivityName = useMemo(() => 
    options.activities.find(a => a.id === selectedActivityId)?.name || null
  , [options.activities, selectedActivityId]);


  return {
    selectedProjectId,
    selectedItem,
    selectedFrontId,
    selectedLocalityId,
    selectedSubstation,
    selectedStructure,
    selectedGroup,
    selectedActivityId,
    projects: options.projects,
    items: options.items,
    fronts: options.fronts,
    localities: options.localities,
    structures: options.structures,
    groups: options.groups,
    activities: options.activities,
    
    selectedProjectName,
    selectedFrontName,
    selectedLocalityName,
    selectedActivityName,
    globalError,
    selectedRecordId,
    
    setSelectedRecordId,
    setSelectedProjectId: setSelectedProjectIdState,
    setSelectedItem: setSelectedItemState,
    setSelectedFrontId: setSelectedFrontIdState,
    setSelectedLocalityId: setSelectedLocalityIdState,
    setSelectedSubstation: setSelectedSubstationState,
    setSelectedStructure: setSelectedStructureState,
    setSelectedGroup: setSelectedGroupState,
    setSelectedActivityId: setSelectedActivityIdState,
    clearFilters,
  };
}