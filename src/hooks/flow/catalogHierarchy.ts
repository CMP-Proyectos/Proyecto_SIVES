import {
  ActivityRecord,
  DetailRecord,
  FrontRecord,
  LocalityRecord,
} from "../../services/dataService";

export type DetailWithActivity = DetailRecord & {
  activityName: string;
  activityGroup: string | null;
  activityItem: string | null;
};

type CatalogHierarchyInput = {
  fronts: FrontRecord[];
  localities: LocalityRecord[];
  details: DetailRecord[];
  activities: ActivityRecord[];
  selectedItem: string | null;
  selectedFrontId: number | null;
  selectedLocalityId: number | null;
  selectedSubstation: string | null;
  selectedStructure: string | null;
  selectedGroup: string | null;
  itemSearch?: string;
  localitySearch?: string;
  substationSearch?: string;
  detailSearch?: string;
  groupSearch?: string;
  requireSubstationSelection?: boolean;
};

export const normalizeText = (value: string) => value.trim().toLowerCase();

export const normalizeOptionalText = (value: string | null | undefined) => {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
};

export const normalizeStructureName = (value: string) => value.trim();

export const sortByLabel = (left: string, right: string) =>
  left.localeCompare(right, "es", { sensitivity: "base" });

export const uniqueStrings = (values: (string | null | undefined)[]) =>
  Array.from(new Set(values.filter((value): value is string => Boolean(value)))).sort(sortByLabel);

export const uniqueActivities = (values: (ActivityRecord | undefined)[]) => {
  const mapped = new Map<number, ActivityRecord>();

  values.forEach((activity) => {
    if (activity && !mapped.has(activity.ID_Actividad)) {
      mapped.set(activity.ID_Actividad, activity);
    }
  });

  return Array.from(mapped.values()).sort((left, right) =>
    left.Nombre_Actividad.localeCompare(right.Nombre_Actividad, "es", {
      sensitivity: "base",
    })
  );
};

export const buildCatalogHierarchySnapshot = ({
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
  itemSearch = "",
  localitySearch = "",
  substationSearch = "",
  detailSearch = "",
  groupSearch = "",
  requireSubstationSelection = true,
}: CatalogHierarchyInput) => {
  const activityMap = new Map(activities.map((activity) => [activity.ID_Actividad, activity]));
  const localityMap = new Map(localities.map((locality) => [locality.ID_Localidad, locality]));

  const scopedDetails: DetailWithActivity[] = details.map((detail) => {
    const activity = activityMap.get(detail.ID_Actividad);
    return {
      ...detail,
      Nombre_Detalle: normalizeStructureName(detail.Nombre_Detalle),
      Subestacion: normalizeOptionalText(detail.Subestacion),
      activityName: activity?.Nombre_Actividad ?? "Sin actividad",
      activityGroup: normalizeOptionalText(activity?.Grupo),
      activityItem: normalizeOptionalText(activity?.Item),
    };
  });

  const items = uniqueStrings(scopedDetails.map((detail) => detail.activityItem));
  const filteredItems = !normalizeText(itemSearch)
    ? items
    : items.filter((item) => item.toLowerCase().includes(normalizeText(itemSearch)));

  const detailsForSelectedItem = !selectedItem
    ? []
    : scopedDetails.filter((detail) => detail.activityItem === selectedItem);

  const filteredFronts = !selectedItem
    ? []
    : fronts.filter((front) => {
        return detailsForSelectedItem.some(
          (detail) => localityMap.get(detail.ID_Localidad)?.ID_Frente === front.ID_Frente
        );
      });

  const detailsForSelectedFront = !selectedFrontId
    ? []
    : detailsForSelectedItem.filter(
        (detail) => localityMap.get(detail.ID_Localidad)?.ID_Frente === selectedFrontId
      );

  const localitiesForSelection = !selectedFrontId
    ? []
    : localities.filter((locality) => {
        return (
          locality.ID_Frente === selectedFrontId &&
          detailsForSelectedFront.some((detail) => detail.ID_Localidad === locality.ID_Localidad)
        );
      });

  const filteredLocalities = !normalizeText(localitySearch)
    ? localitiesForSelection
    : localitiesForSelection.filter((locality) =>
        locality.Nombre_Localidad.toLowerCase().includes(normalizeText(localitySearch))
      );

  const detailsForCurrentLocality = !selectedLocalityId
    ? []
    : detailsForSelectedFront.filter((detail) => detail.ID_Localidad === selectedLocalityId);

  const substationsForCurrentSelection = uniqueStrings(
    detailsForCurrentLocality.map((detail) => detail.Subestacion)
  );

  const filteredSubstations = !normalizeText(substationSearch)
    ? substationsForCurrentSelection
    : substationsForCurrentSelection.filter((substation) =>
        substation.toLowerCase().includes(normalizeText(substationSearch))
      );

  const hasSubstationsForCurrentSelection = substationsForCurrentSelection.length > 0;

  let detailsAfterSubstation = detailsForCurrentLocality;
  if (hasSubstationsForCurrentSelection && selectedSubstation) {
    detailsAfterSubstation = detailsForCurrentLocality.filter(
      (detail) => detail.Subestacion === selectedSubstation
    );
  } else if (hasSubstationsForCurrentSelection && requireSubstationSelection) {
    detailsAfterSubstation = detailsForCurrentLocality.filter((detail) => Boolean(detail.Subestacion));
  }

  const structures = uniqueStrings(detailsAfterSubstation.map((detail) => detail.Nombre_Detalle));
  const filteredStructures = !normalizeText(detailSearch)
    ? structures
    : structures.filter((structure) => structure.toLowerCase().includes(normalizeText(detailSearch)));

  const detailsForCurrentStructure = !selectedStructure
    ? []
    : detailsAfterSubstation.filter((detail) => detail.Nombre_Detalle === selectedStructure);

  const groups = uniqueStrings(detailsForCurrentStructure.map((detail) => detail.activityGroup));
  const filteredGroups = !normalizeText(groupSearch)
    ? groups
    : groups.filter((group) => group.toLowerCase().includes(normalizeText(groupSearch)));

  const filteredActivities = !selectedGroup
    ? []
    : uniqueActivities(
        detailsForCurrentStructure
          .filter((detail) => detail.activityGroup === selectedGroup)
          .map((detail) => activityMap.get(detail.ID_Actividad))
      );

  const groupActivityPreviewMap: Record<string, ActivityRecord[]> = {};
  groups.forEach((group) => {
    groupActivityPreviewMap[group] = uniqueActivities(
      detailsForCurrentStructure
        .filter((detail) => detail.activityGroup === group)
        .map((detail) => activityMap.get(detail.ID_Actividad))
    );
  });

  return {
    scopedDetails,
    items,
    filteredItems,
    detailsForSelectedItem,
    filteredFronts,
    detailsForSelectedFront,
    localitiesForSelection,
    filteredLocalities,
    detailsForCurrentLocality,
    substationsForCurrentSelection,
    filteredSubstations,
    hasSubstationsForCurrentSelection,
    detailsAfterSubstation,
    structures,
    filteredStructures,
    detailsForCurrentStructure,
    groups,
    filteredGroups,
    filteredActivities,
    groupActivityPreviewMap,
  };
};

export const hasSubstationsForLocalityInScope = (
  scopedDetails: DetailWithActivity[],
  selectedItem: string | null,
  localityId: number
) => {
  if (!selectedItem) return false;

  return scopedDetails.some(
    (detail) =>
      detail.ID_Localidad === localityId &&
      detail.activityItem === selectedItem &&
      Boolean(detail.Subestacion)
  );
};
