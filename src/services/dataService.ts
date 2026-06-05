import { supabase } from "./supabaseClient";
import { db } from "./db_local";
import type {
  CheckedActivityRow,
  CreateRegistroPayload,
  RecordImageCountRow,
  RegistroImagenPayload,
  RegistroRow,
  UserRecord,
} from "../types/records.types";

export { supabase };

export type RemoteSyncStatus = "success" | "skipped_offline" | "preserved_cache";

export type ProjectRecord = {
  ID_Proyectos: number;
  Proyecto_Nombre: string;
};

export type FrontRecord = {
  ID_Frente: number;
  ID_Proyecto: number;
  Nombre_Frente: string;
};

export type LocalityRecord = {
  ID_Localidad: number;
  ID_Frente: number;
  Nombre_Localidad: string;
};

export type DetailRecord = {
  ID_DetallesActividad: number;
  ID_Actividad: number;
  ID_Localidad: number;
  Latitud: number;
  Longitud: number;
  Nombre_Detalle: string;
  Subestacion?: string | null;
};

export type ActivityRecord = {
  ID_Actividad: number;
  Nombre_Actividad: string;
  Grupo: string | null;
  Item: string | null;
  Categoria: string | null;
};

export type MapRecordSource = "mine" | "global";

export type MapRecord = UserRecord & {
  source: MapRecordSource;
  latitud: number;
  longitud: number;
  nombre_proyecto: string | null;
  nombre_frente: string | null;
  nombre_subestacion: string | null;
};

export type JoinProjectResultStatus =
  | "joined"
  | "already_joined"
  | "invalid_code"
  | "not_authenticated";

export type JoinProjectResult = {
  status: JoinProjectResultStatus;
  projectId: number | null;
  projectName: string | null;
};

type ProjectAssignmentRecord = {
  id_proyecto: number;
};

type JoinProjectRpcRow = {
  status: JoinProjectResultStatus;
  project_id: number | null;
  project_name: string | null;
};

type GlobalMapRpcRow = Record<string, unknown>;

const IN_FILTER_CHUNK_SIZE = 200;

const MAP_REQUIRED_FIELDS_ERROR =
  "La RPC get_mapa_global no devolvio latitud/longitud o metadatos minimos esperados.";

export const isNetworkUnavailableError = (error: any) => {
  const rawMessage = String(error?.message || error?.code || error?.details || "").toLowerCase();

  return (
    rawMessage.includes("failed to fetch") ||
    rawMessage.includes("network request failed") ||
    rawMessage.includes("err_internet_disconnected") ||
    rawMessage.includes("internet_disconnected") ||
    rawMessage.includes("load failed") ||
    rawMessage.includes("networkerror") ||
    rawMessage.includes("fetch")
  );
};

export const hasSupabaseConnectivity = async (context: string) => {
  if (typeof navigator !== "undefined" && !navigator.onLine) {
    console.info("[NETWORK] Sin conectividad real; navigator reporta offline", { context });
    return false;
  }

  try {
    const { error } = await supabase.auth.getUser();
    if (error) {
      if (isNetworkUnavailableError(error)) {
        console.warn("[NETWORK] Sonda de conectividad fallo por red", { context, message: error.message });
        return false;
      }

      console.info("[NETWORK] Supabase accesible durante la sonda", {
        context,
        authError: error.message,
      });
      return true;
    }

    console.info("[NETWORK] Supabase accesible durante la sonda", { context, authenticated: true });
    return true;
  } catch (error) {
    if (isNetworkUnavailableError(error)) {
      console.warn("[NETWORK] Sonda de conectividad fallo por red", {
        context,
        message: error instanceof Error ? error.message : String(error),
      });
      return false;
    }

    console.warn("[NETWORK] Sonda de conectividad devolvio error no concluyente; se asume online", {
      context,
      error,
    });
    return true;
  }
};

const fetchCatalog = async <T>(
  table: string,
  columns: string,
  orderBy: string,
  queryBuilder?: (query: any) => any
) => {
  let allData: T[] = [];
  let from = 0;
  const step = 1000;
  let moreData = true;

  while (moreData) {
    let query = supabase.from(table).select(columns).order(orderBy, { ascending: true });

    if (queryBuilder) {
      query = queryBuilder(query);
    }

    const { data, error } = await query.range(from, from + step - 1);

    if (error) throw error;

    if (data && data.length > 0) {
      allData = [...allData, ...(data as T[])];
      from += step;
      moreData = data.length === step;
    } else {
      moreData = false;
    }
  }

  console.log(`Descarga completa de ${table}: ${allData.length} registros.`);
  return allData;
};

const uniqueNumbers = (values: number[]) => Array.from(new Set(values.filter((value) => Number.isFinite(value))));

const chunkArray = <T>(values: T[], size: number) => {
  const chunks: T[][] = [];
  for (let index = 0; index < values.length; index += size) {
    chunks.push(values.slice(index, index + size));
  }
  return chunks;
};

const fetchCatalogByIds = async <T>(
  table: string,
  columns: string,
  orderBy: string,
  column: string,
  ids: number[]
) => {
  const uniqueIds = uniqueNumbers(ids);
  if (uniqueIds.length === 0) return [] as T[];

  const chunks = chunkArray(uniqueIds, IN_FILTER_CHUNK_SIZE);
  const rows = await Promise.all(
    chunks.map((chunk) =>
      fetchCatalog<T>(table, columns, orderBy, (query) => query.in(column, chunk))
    )
  );

  return rows.flat();
};

const normalizeLookupKey = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");

const getValueByAliases = (row: GlobalMapRpcRow, aliases: string[]) => {
  const directMatch = aliases.find((alias) => row[alias] !== undefined && row[alias] !== null);
  if (directMatch) return row[directMatch];

  const normalizedEntries = Object.entries(row).map(([key, value]) => [normalizeLookupKey(key), value] as const);
  const normalizedMap = new Map(normalizedEntries);

  for (const alias of aliases) {
    const value = normalizedMap.get(normalizeLookupKey(alias));
    if (value !== undefined && value !== null) {
      return value;
    }
  }

  return null;
};

const toNullableNumber = (value: unknown) => {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const toNullableString = (value: unknown) => {
  if (value === null || value === undefined) return null;
  const text = String(value).trim();
  return text ? text : null;
};

export const isValidCoordinate = (lat: number | null | undefined, lng: number | null | undefined) =>
  typeof lat === "number" &&
  typeof lng === "number" &&
  Number.isFinite(lat) &&
  Number.isFinite(lng) &&
  Math.abs(lat) <= 90 &&
  Math.abs(lng) <= 180;

export const getAssignedProjectIds = async (userId?: string) => {
  const resolvedUserId = userId ?? (await supabase.auth.getUser()).data.user?.id;
  if (!resolvedUserId) return [];

  const { data, error } = await supabase
    .from("Usuarios_Proyectos")
    .select("id_proyecto")
    .eq("user_id", resolvedUserId);

  if (error) throw error;

  return uniqueNumbers(((data || []) as ProjectAssignmentRecord[]).map((row) => row.id_proyecto));
};

export const getProjectsByIds = (projectIds: number[]) =>
  fetchCatalogByIds<ProjectRecord>(
    "Proyectos",
    "ID_Proyectos, Proyecto_Nombre",
    "Proyecto_Nombre",
    "ID_Proyectos",
    projectIds
  );

export const getAllowedProjects = async (userId?: string) => {
  const assignedProjectIds = await getAssignedProjectIds(userId);
  const projects = await getProjectsByIds(assignedProjectIds);
  return { assignedProjectIds, projects };
};

export const joinProjectWithCode = async (code: string): Promise<JoinProjectResult> => {
  const normalizedCode = code.trim();
  const { data, error } = await supabase.rpc("join_project_by_code", { p_code: normalizedCode });

  if (error) throw error;

  const row = (Array.isArray(data) ? data[0] : data) as JoinProjectRpcRow | null | undefined;

  return {
    status: row?.status ?? "invalid_code",
    projectId: row?.project_id ?? null,
    projectName: row?.project_name ?? null,
  };
};

export const getFrontsByProjectIds = (projectIds: number[]) => {
  return fetchCatalogByIds<FrontRecord>(
    "Frentes",
    "ID_Frente, ID_Proyecto, Nombre_Frente",
    "Nombre_Frente",
    "ID_Proyecto",
    projectIds
  );
};

export const getLocalitiesByFrontIds = (frontIds: number[]) => {
  return fetchCatalogByIds<LocalityRecord>(
    "Localidades",
    "ID_Localidad, ID_Frente, Nombre_Localidad",
    "Nombre_Localidad",
    "ID_Frente",
    frontIds
  );
};

export const getDetailsByLocalityIds = (localityIds: number[]) => {
  return fetchCatalogByIds<DetailRecord>(
    "Detalles Actividad",
    "ID_DetallesActividad, ID_Actividad, ID_Localidad, Latitud, Longitud, Nombre_Detalle, Subestacion",
    "Nombre_Detalle",
    "ID_Localidad",
    localityIds
  );
};

export const getActivitiesByIds = (activityIds: number[]) => {
  return fetchCatalogByIds<ActivityRecord>(
    "Actividades",
    "ID_Actividad, Nombre_Actividad, Grupo, Item, Categoria",
    "Nombre_Actividad",
    "ID_Actividad",
    activityIds
  );
};

export const clearCatalogCache = async () => {
  await db.catalog_projects.clear();
  await db.catalog_fronts.clear();
  await db.catalog_localities.clear();
  await db.catalog_details.clear();
  await db.catalog_activities.clear();
  await db.history_cache.clear();
  await db.activity_properties_cache.clear();
};

export const clearAllLocalData = async () => {
  await db.pendingUploads.clear();
  await db.catalog_projects.clear();
  await db.catalog_fronts.clear();
  await db.catalog_localities.clear();
  await db.catalog_details.clear();
  await db.catalog_activities.clear();
  await db.history_cache.clear();
  await db.activity_properties_cache.clear();
};

export const uploadEvidence = async (bucket: string, path: string, file: Blob, type: string) => {
  const { data, error } = await supabase.storage.from(bucket).upload(path, file, {
    contentType: type,
    upsert: true,
  });
  if (error) throw error;

  const { data: publicUrl } = supabase.storage.from(bucket).getPublicUrl(data.path);
  return publicUrl.publicUrl;
};

export const createCheckedActivity = async (payload: {
  ID_DetallesActividad: number;
  Latitud: number;
  Longitud: number;
  Cantidad?: number;
}) => {
  const { data: checked, error: insertError } = await supabase
    .from("Actividad_Verificada")
    .insert([{ ...payload, Cantidad: payload.Cantidad ?? 0 }])
    .select("ID_Verificada")
    .single();

  if (insertError) throw insertError;
  const { data: validacion } = await supabase.rpc("check_metrado_status", { p_detalle_id: payload.ID_DetallesActividad });

  return {
    ...checked,
    excedido: validacion?.excedido || false,
    acumulado: validacion?.total || 0,
  };
};

export const createRegistro = async (payload: CreateRegistroPayload) => {
  const { data, error } = await supabase.from("Registros").insert(payload).select();
  if (error) throw error;
  return { data, error };
};

export const createRegistroImagenes = async (payload: RegistroImagenPayload[]) => {
  const { data, error } = await supabase.from("Registro_Imagenes").insert(payload).select();
  if (error) throw error;
  return { data, error };
};

export const fetchUserRecords = async (userId: string): Promise<UserRecord[]> => {
  if (!userId) return [];

  const { data: registros, error: registrosError } = await supabase
    .from("Registros")
    .select("ID_Registros, Fecha_Subida, URL_Archivo, Comentario, Ruta_Archivo, Bucket, ID_Verificada, user_id, id_proyecto, Ohms")
    .eq("user_id", userId)
    .order("Fecha_Subida", { ascending: false });

  if (registrosError) throw registrosError;

  const registroRows = (registros || []) as RegistroRow[];
  if (registroRows.length === 0) return [];

  const verificadaIds = registroRows
    .map((record) => record.ID_Verificada)
    .filter((value): value is number => typeof value === "number");

  const checkedById = new Map<number, CheckedActivityRow>();
  if (verificadaIds.length > 0) {
    const { data: checkedRows, error: checkedError } = await supabase
      .from("Actividad_Verificada")
      .select("ID_Verificada, ID_DetallesActividad, Latitud, Longitud, Cantidad")
      .in("ID_Verificada", verificadaIds);

    if (checkedError) throw checkedError;

    for (const row of (checkedRows || []) as CheckedActivityRow[]) {
      checkedById.set(row.ID_Verificada, row);
    }
  }

  const recordIds = registroRows.map((record) => record.ID_Registros);
  const imageCountByRecordId = new Map<number, number>();
  if (recordIds.length > 0) {
    const { data: imageRows, error: imageError } = await supabase
      .from("Registro_Imagenes")
      .select("ID_Registro")
      .in("ID_Registro", recordIds);

    if (imageError) throw imageError;

    for (const row of (imageRows || []) as RecordImageCountRow[]) {
      const recordId = row.ID_Registro;
      if (!recordId) continue;
      imageCountByRecordId.set(recordId, (imageCountByRecordId.get(recordId) || 0) + 1);
    }
  }

  const [details, localities, fronts, projects, activities] = await Promise.all([
    db.catalog_details.toArray(),
    db.catalog_localities.toArray(),
    db.catalog_fronts.toArray(),
    db.catalog_projects.toArray(),
    db.catalog_activities.toArray(),
  ]);

  const detailById = new Map(details.map((detail) => [detail.ID_DetallesActividad, detail]));
  const localityById = new Map(localities.map((locality) => [locality.ID_Localidad, locality]));
  const frontById = new Map(fronts.map((front) => [front.ID_Frente, front]));
  const projectById = new Map(projects.map((project) => [project.ID_Proyectos, project]));
  const activityById = new Map(activities.map((activity) => [activity.ID_Actividad, activity]));

  const mappedRecords = registroRows.map((record) => {
    const checked = record.ID_Verificada ? checkedById.get(record.ID_Verificada) : undefined;
    const detail = checked?.ID_DetallesActividad ? detailById.get(checked.ID_DetallesActividad) : undefined;
    const locality = detail ? localityById.get(detail.ID_Localidad) : undefined;
    const front = locality ? frontById.get(locality.ID_Frente) : undefined;
    const project = front ? projectById.get(front.ID_Proyecto) : undefined;
    const activity = detail ? activityById.get(detail.ID_Actividad) : undefined;

    return {
      id_registro: record.ID_Registros,
      id_verificada: record.ID_Verificada,
      user_id: record.user_id,
      fecha_subida: record.Fecha_Subida,
      url_foto: record.URL_Archivo,
      nombre_actividad: activity?.Nombre_Actividad || "Actividad sin catalogo",
      nombre_localidad: locality?.Nombre_Localidad || "",
      nombre_detalle: detail?.Nombre_Detalle || "",
      nombre_grupo: activity?.Grupo || null,
      nombre_item: activity?.Item || null,
      nombre_subestacion: detail?.Subestacion || null,
      comentario: record.Comentario,
      ruta_archivo: record.Ruta_Archivo,
      bucket: record.Bucket,
      latitud: checked?.Latitud ?? detail?.Latitud ?? null,
      longitud: checked?.Longitud ?? detail?.Longitud ?? null,
      id_proyecto: record.id_proyecto ?? front?.ID_Proyecto ?? null,
      id_frente: front?.ID_Frente ?? null,
      id_localidad: locality?.ID_Localidad ?? null,
      id_detalle: detail?.ID_DetallesActividad ?? null,
      id_actividad: activity?.ID_Actividad ?? null,
      nombre_proyecto: project?.Proyecto_Nombre,
      nombre_frente: front?.Nombre_Frente,
      total_imagenes: imageCountByRecordId.get(record.ID_Registros) || (record.URL_Archivo ? 1 : 0),
      cantidad: checked?.Cantidad ?? 0,
      ohms: record.Ohms ?? null,
    };
  });

  console.info("[records] fetchUserRecords", {
    userId,
    registrosCount: registroRows.length,
    mappedCount: mappedRecords.length,
  });

  return mappedRecords;
};

export const getUserMapRecords = (records: UserRecord[]): MapRecord[] => {
  return records
    .filter((record) => isValidCoordinate(record.latitud, record.longitud))
    .map((record) => ({
      ...record,
      latitud: record.latitud as number,
      longitud: record.longitud as number,
      nombre_proyecto: record.nombre_proyecto || null,
      nombre_frente: record.nombre_frente || null,
      nombre_subestacion: record.nombre_subestacion || null,
      source: "mine" as const,
    }));
};

const normalizeGlobalMapRow = (row: GlobalMapRpcRow): MapRecord | null => {
  const latitud = toNullableNumber(getValueByAliases(row, ["latitud", "latitude"]));
  const longitud = toNullableNumber(getValueByAliases(row, ["longitud", "longitude", "lng", "lon"]));

  if (!isValidCoordinate(latitud, longitud)) {
    return null;
  }

  const idRegistro = toNullableNumber(
    getValueByAliases(row, ["id_registro", "ID_Registros", "ID_Registro", "registro_id"])
  );
  const fechaSubida = toNullableString(
    getValueByAliases(row, ["fecha_subida", "Fecha_Subida", "created_at", "fecha"])
  );
  const idProyecto = toNullableNumber(
    getValueByAliases(row, ["id_proyecto", "ID_Proyecto", "ID_Proyectos", "proyecto_id"])
  );
  const nombreProyecto = toNullableString(
    getValueByAliases(row, ["nombre_proyecto", "Proyecto_Nombre", "proyecto_nombre"])
  );
  const idFrente = toNullableNumber(getValueByAliases(row, ["id_frente", "ID_Frente", "frente_id"]));
  const nombreFrente = toNullableString(
    getValueByAliases(row, ["nombre_frente", "Nombre_Frente", "frente_nombre"])
  );
  const idLocalidad = toNullableNumber(
    getValueByAliases(row, ["id_localidad", "ID_Localidad", "localidad_id"])
  );
  const nombreLocalidad = toNullableString(
    getValueByAliases(row, ["nombre_localidad", "Nombre_Localidad", "localidad_nombre"])
  );
  const idDetalle = toNullableNumber(
    getValueByAliases(row, ["id_detalle", "ID_DetallesActividad", "id_detallesactividad", "detalle_id"])
  );
  const nombreDetalle = toNullableString(
    getValueByAliases(row, ["nombre_detalle", "Nombre_Detalle", "detalle_nombre", "estructura"])
  );
  const idActividad = toNullableNumber(
    getValueByAliases(row, ["id_actividad", "ID_Actividad", "actividad_id"])
  );
  const nombreActividad = toNullableString(
    getValueByAliases(row, ["nombre_actividad", "Nombre_Actividad", "actividad_nombre"])
  );
  const nombreGrupo = toNullableString(getValueByAliases(row, ["nombre_grupo", "grupo", "Grupo"]));
  const nombreItem = toNullableString(getValueByAliases(row, ["nombre_item", "item", "Item", "seccion"]));
  const nombreSubestacion = toNullableString(
    getValueByAliases(row, ["nombre_subestacion", "subestacion", "Subestacion"])
  );
  const ohms = toNullableNumber(getValueByAliases(row, ["ohms", "Ohms", "OHMS"]));

  if (!idRegistro || !fechaSubida || !nombreLocalidad || !nombreDetalle || !nombreActividad) {
    return null;
  }

  return {
    id_registro: idRegistro,
    id_verificada: toNullableNumber(
      getValueByAliases(row, ["id_verificada", "ID_Verificada", "verificada_id"])
    ),
    user_id: toNullableString(getValueByAliases(row, ["user_id", "usuario_id"])),
    fecha_subida: fechaSubida,
    url_foto: toNullableString(
      getValueByAliases(row, ["url_foto", "URL_Archivo", "url_archivo", "foto_url"])
    ),
    nombre_actividad: nombreActividad as string,
    nombre_localidad: nombreLocalidad as string,
    nombre_detalle: nombreDetalle as string,
    nombre_grupo: nombreGrupo,
    nombre_item: nombreItem,
    nombre_subestacion: nombreSubestacion,
    comentario: toNullableString(getValueByAliases(row, ["comentario", "Comentario", "observacion"])),
    ruta_archivo: toNullableString(
      getValueByAliases(row, ["ruta_archivo", "Ruta_Archivo", "path_archivo"])
    ),
    bucket: toNullableString(getValueByAliases(row, ["bucket", "Bucket"])),
    latitud: latitud as number,
    longitud: longitud as number,
    id_proyecto: idProyecto,
    id_frente: idFrente,
    id_localidad: idLocalidad,
    id_detalle: idDetalle,
    id_actividad: idActividad,
    nombre_proyecto: nombreProyecto,
    nombre_frente: nombreFrente,
    total_imagenes: toNullableNumber(
      getValueByAliases(row, ["total_imagenes", "imagenes", "cantidad_imagenes"])
    ) || 0,
    cantidad: toNullableNumber(getValueByAliases(row, ["cantidad", "Cantidad"])) || 0,
    ohms,
    source: "global",
  };
};

export const fetchGlobalMapRecords = async (projectId: number): Promise<MapRecord[]> => {
  const { data, error } = await supabase.rpc("get_mapa_global", {
    p_id_proyecto: projectId,
  });

  if (error) throw error;
  if (!Array.isArray(data)) return [];

  const normalizedRecords = data
    .map((row) => normalizeGlobalMapRow((row || {}) as GlobalMapRpcRow))
    .filter((record): record is MapRecord => Boolean(record));

  if (data.length > 0 && normalizedRecords.length === 0) {
    throw new Error(MAP_REQUIRED_FIELDS_ERROR);
  }

  return normalizedRecords;
};

export const getActivityProperties = async () => [];

export const syncHistoryToLocal = async (userId: string) => {
  try {
    if (!userId) return;
    if (!(await hasSupabaseConnectivity("syncHistoryToLocal"))) {
      console.info("[SYNC] Historial remoto omitido por falta de conectividad; cache local preservado", {
        userId,
      });
      return;
    }

    const allowedDetailIds = new Set((await db.catalog_details.toArray()).map((detail) => detail.ID_DetallesActividad));

    const { data, error } = await supabase
      .from("Registros")
      .select(`
        ID_Registros,
        Fecha_Subida,
        URL_Archivo,
        Comentario,
        user_id,
        Actividad_Verificada!inner ( ID_DetallesActividad )
      `)
      .eq("user_id", userId)
      .order("Fecha_Subida", { ascending: false })
      .limit(500);

    if (error) throw error;

    await db.history_cache.clear();

    if (data && data.length > 0) {
      const recordsToCache = data
        .map((record: any) => ({
          id_registro: record.ID_Registros,
          id_detalle: record.Actividad_Verificada ? record.Actividad_Verificada.ID_DetallesActividad : 0,
          fecha_subida: record.Fecha_Subida,
          url_archivo: record.URL_Archivo,
          comentario: record.Comentario || "",
          cantidad: record.Cantidad || 0,
        }))
        .filter((record) => record.id_detalle !== 0 && allowedDetailIds.has(record.id_detalle));

      if (recordsToCache.length > 0) {
        await db.history_cache.bulkPut(recordsToCache);
      }
      console.log(`[SYNC] ${recordsToCache.length} registros historicos cacheados.`);
      return;
    }

    console.info("[SYNC] Historial remoto consultado sin registros; cache local reemplazado por resultado valido", {
      userId,
    });
  } catch (err) {
    console.error("Error sincronizando historial:", err);
  }
};

export const fetchHistoryForDetail = async (detailId: number) => {
  try {
    if (navigator.onLine) {
      console.log("Buscando historial online para:", detailId);
      const { data, error } = await supabase
        .from("Registros")
        .select(`
          *,
          Actividad_Verificada!inner (
            ID_DetallesActividad
          )
        `)
        .eq("Actividad_Verificada.ID_DetallesActividad", detailId)
        .order("Fecha_Subida", { ascending: false });

      if (!error && data) {
        return data;
      }
    }
  } catch {
    console.warn("Fallo red buscando historial, intentando local...");
  }

  try {
    const localRecords = await db.history_cache.where("id_detalle").equals(detailId).reverse().toArray();

    if (localRecords.length > 0) {
      console.log("Historial completo recuperado de Dexie");
      return localRecords.map((record) => ({
        ID_Registros: record.id_registro,
        Fecha_Subida: record.fecha_subida,
        URL_Archivo: record.url_archivo,
        Comentario: record.comentario,
        Actividad_Verificada: { ID_DetallesActividad: record.id_detalle },
      }));
    }
  } catch (err) {
    console.error("Error buscando en cache local:", err);
  }

  return [];
};
